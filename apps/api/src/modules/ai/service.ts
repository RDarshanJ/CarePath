import type { FastifyReply, FastifyRequest } from "fastify";
import type { AIError } from "@carepath/ai";
import {
  createInMemoryResolver,
  generate,
  isAIError,
  parseTranscriptText,
  type EvidenceResolver,
  type GenerationKind,
  type GenerationRecord,
  type LLMProvider,
  type NoteDraftInput,
  type ProgressSummaryInput,
  type RateLimitHook,
} from "@carepath/ai";
import { requireCtx, type RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError } from "../../core/errors.js";
import {
  aiConsentStatus,
  findEncounter,
  insertGeneration,
  latestGenerationTime,
  loadSources,
  patientIdentifiers,
  progressRecords,
  encounterType,
} from "./repo.js";
import { INPUT_SCHEMA, OUTPUT_SCHEMA, type GenerationRequest } from "./review-state.js";

const DAY = 86_400_000;

/** Everything the AI routes share, built once per app. */
export interface AiRuntime {
  provider: LLMProvider;
  rateLimit: RateLimitHook;
  timeoutMs: number;
  maxRetries: number;
  backoffMs: number;
}

/**
 * EvidenceResolver over the database (ADR-6). Records are loaded by type and id inside the
 * organization through the repository; scope and field checks are exactly the reference
 * behaviour of `createInMemoryResolver` in @carepath/ai, applied to the loaded records: a ref
 * resolves only when its record belongs to the same organization and patient and the cited
 * field holds a value. Records of other organizations are never loaded (`not_found`).
 */
export function createSqlResolver(db: DbClient, ctx: Pick<RequestCtx, "orgId">): EvidenceResolver {
  return {
    async resolve(refs, scope) {
      if (scope.organizationId !== ctx.orgId)
        return refs.map((ref) => ({ ref, status: "not_found" }));
      const loaded = await loadSources(db, ctx, refs);
      return createInMemoryResolver([...loaded.values()]).resolve(refs, scope);
    },
  };
}

type Built =
  | { kind: "progress_summary"; input: ProgressSummaryInput }
  | { kind: "note_draft"; input: NoteDraftInput };

/** Assembles the generation input for a request from the patient's records. */
export async function buildInput(
  db: DbClient,
  ctx: RequestCtx,
  patientId: string,
  req: GenerationRequest,
): Promise<Built> {
  const scope = { organizationId: ctx.orgId, patientId };
  const identifiers = await patientIdentifiers(db, ctx, patientId);
  if (req.kind === "encounter") {
    const e = await findEncounter(db, ctx, patientId, req.encounterId);
    if (!e) throw new AppError("not_found");
    const transcript = parseTranscriptText(e.transcript ?? "").slice(0, 400);
    if (transcript.length === 0) throw new AppError("encounter_no_transcript");
    return {
      kind: "note_draft",
      input: {
        scope,
        encounter: { id: e.id, type: encounterType(e.typeCode), bodyRegion: null },
        transcript,
        identifiers,
      },
    };
  }
  const r = await progressRecords(db, ctx, patientId, new Date(req.from), new Date(req.to));
  return {
    kind: "progress_summary",
    input: {
      scope,
      window: { from: req.from, to: req.to },
      carePlan: r.carePlan
        ? {
            versionId: r.carePlan.id,
            versionNumber: r.carePlan.versionNumber,
            title: r.carePlan.title,
            publishedAt: r.carePlan.publishedAt.toISOString(),
            exerciseCount: r.carePlan._count.assignments,
          }
        : null,
      sessions: r.sessions.map((s) => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
        activities: s.activities.map((a) => ({
          id: a.id,
          status: a.status,
          exerciseName: a.assignment.exercise.name,
          discomfortReported: a.discomfortReported,
          discomfortLevel: a.discomfortLevel,
          skipReason: a.skipReason,
        })),
      })),
      checkIns: r.checkIns.map((c) => ({
        id: c.id,
        painScore: c.painScore,
        difficulty: c.difficulty,
        notes: c.notes,
        submittedAt: c.submittedAt.toISOString(),
      })),
      messages: r.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
      appointments: r.appointments.map((a) => ({
        id: a.id,
        type: a.type,
        status: a.status,
        startsAt: a.startsAt.toISOString(),
      })),
      identifiers,
    },
  };
}

export function progressRequest(now: Date, windowDays: number): GenerationRequest {
  return {
    kind: "progress_window",
    windowDays,
    from: new Date(now.getTime() - windowDays * DAY).toISOString(),
    to: now.toISOString(),
  };
}

const PRE_CALL_FAILURES = new Set(["invalid_input", "redaction_failed", "not_configured"]);

/**
 * Runs one generation inline and stores it. Order: consent (refusal audited, nothing stored),
 * input assembly, the @carepath/ai pipeline (rate limit, redaction, per-attempt timeout, two
 * retries with backoff, schema check, evidence check), then one transaction that inserts the
 * complete AIGeneration row and its `ai.generate` event. A failed generation is stored as
 * `failed` with no output and answered as 502 `ai_generation_failed` with a Location header,
 * never as a success.
 *
 * Inline rather than a job (WP 5.2 decision): the deterministic provider answers in
 * milliseconds; the job runner would add polling, a pending state and a worker dependency for
 * no benefit in the demo. Worst case with an external provider is three attempts of
 * AI_TIMEOUT_MS plus 1.5 s backoff (about 62 s at the 20 s default).
 */
export async function runGeneration(
  request: FastifyRequest,
  reply: FastifyReply,
  runtime: AiRuntime,
  args: { patientId: string; req: GenerationRequest; previousGenerationId: string | null },
): Promise<string> {
  const ctx = requireCtx(request.ctx);
  const { db, now, audit } = request.server.deps;
  const { patientId, req } = args;
  const kind: GenerationKind = req.kind === "encounter" ? "note_draft" : "progress_summary";

  if ((await aiConsentStatus(db, ctx, patientId)) !== "active") {
    await audit.fromRequest(request, {
      eventName: "ai.refused",
      action: "C",
      outcome: "minor_failure",
      resourceType: "Patient",
      resourceId: patientId,
      patientId,
      purposeOfUse: "treatment",
      detailCode: "consent_required",
      metadata: { kind },
    });
    throw new AppError("ai_consent_required");
  }

  const built = await buildInput(db, ctx, patientId, req);
  let record: GenerationRecord<GenerationKind>;
  try {
    record = await generate({
      kind: built.kind,
      input: built.input,
      provider: runtime.provider,
      consent: { aiAssistedFeatures: "active" },
      requester: { organizationId: ctx.orgId, userId: ctx.userId },
      rateLimit: runtime.rateLimit,
      timeoutMs: runtime.timeoutMs,
      maxRetries: runtime.maxRetries,
      backoffMs: runtime.backoffMs,
      resolver: createSqlResolver(db, ctx),
    });
  } catch (err) {
    if (isAIError(err) && err.code === "rate_limited") {
      await audit.fromRequest(request, {
        eventName: "ai.refused",
        action: "C",
        outcome: "minor_failure",
        resourceType: "Patient",
        resourceId: patientId,
        patientId,
        purposeOfUse: "treatment",
        detailCode: "rate_limited",
        metadata: { kind },
      });
      reply.header(
        "retry-after",
        String(Math.max(1, Math.ceil((err.retryAfterMs ?? 1000) / 1000))),
      );
      throw new AppError("rate_limited");
    }
    if (isAIError(err) && PRE_CALL_FAILURES.has(err.code)) {
      record = preCallFailure(kind, runtime.provider, err);
    } else {
      throw err;
    }
  }

  const at = await latestGenerationTime(db, ctx, patientId, now());
  const failed = record.status === "failed";
  const id = await withTx(request, async ({ tx, audit: auditTx }) => {
    const genId = await insertGeneration(tx, ctx, {
      patientId,
      kind: record.kind,
      provider: record.provider,
      providerLabel: record.providerLabel,
      model: record.model,
      promptKey: record.promptKey,
      promptVersion: record.promptVersion,
      status: record.status,
      input: {
        schema: INPUT_SCHEMA,
        request: req,
        inputRefs: record.inputRefs,
        run: {
          calls: record.calls,
          costLabel: record.costLabel,
          redaction: record.redaction,
          errorCode: record.error?.code ?? null,
        },
      } as never,
      output: failed
        ? null
        : ({
            schema: OUTPUT_SCHEMA,
            draft: record.output,
            verification: record.verification,
          } as never),
      error: failed ? (record.error?.message ?? "Generation failed.") : null,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      costMicroUsd: record.costMicroUsd,
      latencyMs: Math.max(0, Math.round(record.latencyMs)),
      unsupportedStatementCount: record.unsupportedStatementCount,
      previousGenerationId: args.previousGenerationId,
      createdAt: at,
      completedAt: at,
    });
    await auditTx({
      eventName: "ai.generate",
      action: "C",
      outcome: failed ? "minor_failure" : "success",
      resourceType: "AIGeneration",
      resourceId: genId,
      patientId,
      purposeOfUse: "treatment",
      detailCode: failed ? (record.error?.code ?? "failed") : null,
      metadata: {
        kind: record.kind,
        provider: record.provider,
        promptVersion: record.promptVersion,
        status: record.status,
        attempts: record.calls.length,
        unsupported: record.unsupportedStatementCount ?? -1,
        ...(args.previousGenerationId ? { previousGenerationId: args.previousGenerationId } : {}),
      },
    });
    return genId;
  });

  if (failed) {
    reply.header("location", `/patients/${patientId}/ai/generations/${id}`);
    throw new AppError("ai_generation_failed", [
      {
        path: "generationId",
        issue: id,
        message: "The failed generation is stored with status failed; read it for the reason.",
      },
    ]);
  }
  return id;
}

function preCallFailure(
  kind: GenerationKind,
  provider: LLMProvider,
  err: AIError,
): GenerationRecord<GenerationKind> {
  return {
    kind,
    status: "failed",
    provider: provider.id,
    providerLabel: provider.label,
    model: provider.model,
    promptKey: kind,
    promptVersion: "unknown",
    inputRefs: [],
    output: null,
    error: { code: err.code, message: err.message },
    calls: [],
    inputTokens: null,
    outputTokens: null,
    costMicroUsd: null,
    costLabel: "No provider call was made",
    latencyMs: 0,
    redaction: { applied: false, tokenCount: 0, counts: {} },
    verification: null,
    unsupportedStatementCount: null,
  };
}
