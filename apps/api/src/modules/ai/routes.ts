import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  createFixedWindowRateLimit,
  parseTranscriptText,
  type GenerationKind,
  type LLMProvider,
  type SoapNoteDraftOutput,
} from "@carepath/ai";
import {
  aiGenerationIdParamsSchema,
  aiGenerationListQuerySchema,
  aiGenerationPageSchema,
  aiGenerationSchema,
  aiSourceParamsSchema,
  aiSourceRecordSchema,
  approveAiGenerationSchema,
  createAiRevisionSchema,
  emptyBodySchema,
  patientIdParamsSchema,
  recordEvidenceOpenSchema,
  rejectAiGenerationSchema,
  requestNoteDraftSchema,
  requestProgressSummarySchema,
  type AiGeneration,
  type AiGenerationPage,
  type AiSourceRecord,
} from "@carepath/shared/contracts";
import { requireCtx, type RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import {
  denyOutOfScope,
  recordPhiRead,
  requirePatientRead,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import {
  SOURCE_RESOURCE,
  aiConsentStatus,
  createDraftNoteFromGeneration,
  encounterTranscript,
  findEncounter,
  findGeneration,
  insertReview,
  listGenerations,
  listReviews,
  loadSources,
  lockGeneration,
  nextReviewTime,
  noteFromGeneration,
  reviewFacts,
  type GenerationRow,
} from "./repo.js";
import { createAiProvider } from "./provider.js";
import {
  ChangeError,
  DECISION_SCHEMA,
  addEvidenceOpen,
  applyChanges,
  approvalBlockers,
  decisionFor,
  emptyState,
  finalOutput,
  parseDraft,
  parseInputJson,
  parseState,
  soapText,
  statementViews,
} from "./review-state.js";
import { createSqlResolver, progressRequest, runGeneration, type AiRuntime } from "./service.js";
import { toGenerationView, toSummary } from "./view.js";
import { verifyOutput } from "@carepath/ai";

export interface AiRoutesOptions {
  /** Tests inject a provider; otherwise it comes from configuration (deterministic by default). */
  provider?: LLMProvider;
}

const generationResponses = errorResponses(400, 401, 403, 404, 409, 429);

/** Fixed detail text per approval blocker (no patient data). */
const BLOCKER_MESSAGES = {
  unsupported_unresolved: "Edit, remove or acknowledge each statement without a supporting record.",
  missing_unacknowledged: "Acknowledge each missing-information item.",
  evidence_not_opened: "Open the evidence for each reported change.",
  empty_output: "Nothing would be left to approve.",
  consent_withdrawn: "The patient's AI consent is no longer active.",
} as const;

/**
 * AI-supported progress review and SOAP note drafts (WP 5.2, Scenario F). Generation needs the
 * `ai.generate` permission, a clinician on the patient's care team, and the patient's active
 * `ai_assisted_features` consent. Review actions need `ai.review` and the care team. Reads need
 * `clinical.read`; every read of a generation or source record is audited as `phi.read`.
 */
export const aiRoutes: FastifyPluginAsyncZod<AiRoutesOptions> = async (app, opts) => {
  const { db, config, now } = app.deps;
  const runtime: AiRuntime = {
    provider: opts.provider ?? createAiProvider(config.ai),
    rateLimit: createFixedWindowRateLimit({
      limit: config.ai.generationsPerMinute,
      windowMs: 60_000,
    }),
    timeoutMs: config.ai.timeoutMs,
    maxRetries: config.ai.maxRetries,
    backoffMs: config.ai.backoffMs,
  };
  const rateLimit = { max: config.ai.routesPerMinute, timeWindow: 60_000 };

  async function requireGeneration(
    request: FastifyRequest,
    patientId: string,
    generationId: string,
  ): Promise<GenerationRow> {
    const ctx = requireCtx(request.ctx);
    const g = await findGeneration(db, ctx, patientId, generationId);
    if (!g) return denyOutOfScope(request, "AIGeneration", generationId, patientId);
    return g;
  }

  async function view(client: DbClient, ctx: RequestCtx, g: GenerationRow): Promise<AiGeneration> {
    const reviews = await listReviews(client, ctx, g.id);
    const req = parseInputJson(g.input).request;
    const encounter =
      req?.kind === "encounter"
        ? await findEncounter(client, ctx, g.patientId, req.encounterId)
        : null;
    return toGenerationView(g, reviews, createSqlResolver(client, ctx), {
      orgId: ctx.orgId,
      encounterStartedAt: encounter?.startedAt ?? null,
      noteId: await noteFromGeneration(client, ctx, g.id),
      consentActive: (await aiConsentStatus(client, ctx, g.patientId)) === "active",
    });
  }

  async function reload(ctx: RequestCtx, patientId: string, id: string) {
    return view(db, ctx, (await findGeneration(db, ctx, patientId, id))!);
  }

  // ---- list ---------------------------------------------------------------------------------

  app.get(
    "/patients/:patientId/ai/generations",
    {
      config: { access: { permission: "clinical.read" }, rateLimit },
      schema: {
        operationId: "listAiGenerations",
        tags: ["ai"],
        summary:
          "AI generations of a patient, newest first, failed ones included, with review state.",
        params: patientIdParamsSchema,
        querystring: aiGenerationListQuerySchema,
        response: { 200: aiGenerationPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<AiGenerationPage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const rows = await listGenerations(
        db,
        ctx,
        patientId,
        request.query.kind,
        offset,
        request.query.limit + 1,
      );
      const page = pageFrom(rows, offset, request.query.limit);
      const facts = await reviewFacts(
        db,
        ctx,
        page.items.map((g) => g.id),
      );
      await recordPhiRead(request, patientId, "AIGeneration", patientId);
      return {
        items: page.items.map((g) => toSummary(g, facts.get(g.id)!)),
        nextCursor: page.nextCursor,
      };
    },
  );

  // ---- generate -----------------------------------------------------------------------------

  app.post(
    "/patients/:patientId/ai/summaries",
    {
      config: { access: { permission: "ai.generate" }, rateLimit },
      schema: {
        operationId: "requestAiProgressSummary",
        tags: ["ai"],
        summary:
          "Generate a clinician progress summary over the last windowDays. Refused (409 ai_consent_required, audited) without the patient's AI consent. A failed generation is stored and answered 502 ai_generation_failed with a Location header.",
        params: patientIdParamsSchema,
        body: requestProgressSummarySchema,
        response: { 201: aiGenerationSchema, ...errorResponses(400, 401, 403, 404, 409, 429, 502) },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const id = await runGeneration(request, reply, runtime, {
        patientId,
        req: progressRequest(now(), request.body.windowDays),
        previousGenerationId: null,
      });
      return reply.code(201).send(await reload(ctx, patientId, id));
    },
  );

  app.post(
    "/patients/:patientId/ai/note-drafts",
    {
      config: { access: { permission: "ai.generate" }, rateLimit },
      schema: {
        operationId: "requestAiNoteDraft",
        tags: ["ai"],
        summary:
          "Generate a SOAP note draft from a visit's synthetic transcript. Approval later creates a draft note; nothing is signed or added to the record here.",
        params: patientIdParamsSchema,
        body: requestNoteDraftSchema,
        response: { 201: aiGenerationSchema, ...errorResponses(400, 401, 403, 404, 409, 429, 502) },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const { encounterId } = request.body;
      if (!(await findEncounter(db, ctx, patientId, encounterId)))
        await denyOutOfScope(request, "Encounter", encounterId, patientId);
      const id = await runGeneration(request, reply, runtime, {
        patientId,
        req: { kind: "encounter", encounterId },
        previousGenerationId: null,
      });
      return reply.code(201).send(await reload(ctx, patientId, id));
    },
  );

  // ---- read ---------------------------------------------------------------------------------

  app.get(
    "/patients/:patientId/ai/generations/:generationId",
    {
      config: { access: { permission: "clinical.read" }, rateLimit },
      schema: {
        operationId: "getAiGeneration",
        tags: ["ai"],
        summary:
          "One generation with statements, each source reference resolved now inside this patient and organization, missing information, revisions, decision and approval blockers.",
        params: aiGenerationIdParamsSchema,
        response: { 200: aiGenerationSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<AiGeneration> => {
      const { patientId, generationId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const g = await requireGeneration(request, patientId, generationId);
      await recordPhiRead(request, patientId, "AIGeneration", g.id);
      return view(db, ctx, g);
    },
  );

  app.get(
    "/patients/:patientId/ai/sources/:sourceType/:sourceId",
    {
      config: { access: { permission: "clinical.read" }, rateLimit },
      schema: {
        operationId: "getAiSourceRecord",
        tags: ["ai"],
        summary:
          "The record behind an evidence reference, only when it belongs to this patient (otherwise 404 and a security event). Audited as phi.read.",
        params: aiSourceParamsSchema,
        response: { 200: aiSourceRecordSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<AiSourceRecord> => {
      const { patientId, sourceType, sourceId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const rec = (await loadSources(db, ctx, [{ type: sourceType, id: sourceId }])).get(
        `${sourceType}:${sourceId}`,
      );
      if (!rec || rec.patientId !== patientId)
        return denyOutOfScope(request, SOURCE_RESOURCE[sourceType], sourceId, patientId);
      await recordPhiRead(request, patientId, SOURCE_RESOURCE[sourceType], sourceId);
      const transcript =
        sourceType === "encounter"
          ? parseTranscriptText((await encounterTranscript(db, ctx, patientId, sourceId)) ?? "")
          : [];
      return {
        type: sourceType,
        id: sourceId,
        patientId,
        occurredAt: rec.occurredAt,
        fields: Object.entries(rec.fields).map(([field, value]) => ({ field, value })),
        transcript,
        syntheticTranscript: sourceType === "encounter",
      };
    },
  );

  // ---- review -------------------------------------------------------------------------------

  /** Shared preamble of review writes: scope, care team, generation, not failed. */
  async function reviewable(request: FastifyRequest, patientId: string, generationId: string) {
    const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
    const g = await requireGeneration(request, patientId, generationId);
    if (g.status !== "succeeded") throw new AppError("ai_not_reviewable");
    const draft = parseDraft(g.kind as GenerationKind, g.output);
    if (!draft) throw new AppError("ai_not_reviewable");
    return { ctx, g, draft };
  }

  app.post(
    "/patients/:patientId/ai/generations/:generationId/revisions",
    {
      config: { access: { permission: "ai.review" }, rateLimit },
      schema: {
        operationId: "reviseAiGeneration",
        tags: ["ai"],
        summary:
          "Record an edit: change, remove, acknowledge (keep with a note) or restore statements, or acknowledge missing information. Appends a revision; earlier revisions and the generated text are kept.",
        params: aiGenerationIdParamsSchema,
        body: createAiRevisionSchema,
        response: { 200: aiGenerationSchema, ...generationResponses },
      },
    },
    async (request): Promise<AiGeneration> => {
      const { patientId, generationId } = request.params;
      const { ctx, g, draft } = await reviewable(request, patientId, generationId);
      await withTx(request, async ({ tx, audit }) => {
        await lockGeneration(tx, ctx, g.id);
        const reviews = await listReviews(tx, ctx, g.id);
        if (reviews.some((r) => r.decision !== "revised")) throw new AppError("ai_already_decided");
        const revisions = reviews.filter((r) => r.decision === "revised");
        const current = revisions[revisions.length - 1] ?? null;
        if ((current?.id ?? null) !== request.body.baseRevisionId)
          throw new AppError("revision_stale");
        let next;
        try {
          next = applyChanges(
            g.kind as GenerationKind,
            draft,
            current ? parseState(current.editedOutput) : emptyState(),
            request.body.changes,
          );
        } catch (err) {
          if (err instanceof ChangeError)
            throw new AppError("validation_error", [
              { path: err.path, issue: err.issue, message: "No such item in this draft." },
            ]);
          throw err;
        }
        const reviewId = await insertReview(tx, ctx, {
          generationId: g.id,
          decision: "revised",
          editedOutput: next as never,
          reason: null,
          createdAt: await nextReviewTime(tx, ctx, g.id, now()),
        });
        await audit({
          eventName: "ai.review",
          action: "C",
          outcome: "success",
          resourceType: "AIGeneration",
          resourceId: g.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "revised",
          metadata: { reviewId, changes: request.body.changes.length, kind: g.kind },
        });
      });
      return reload(ctx, patientId, g.id);
    },
  );

  app.post(
    "/patients/:patientId/ai/generations/:generationId/evidence-opens",
    {
      config: { access: { permission: "ai.review" }, rateLimit },
      schema: {
        operationId: "recordAiEvidenceOpen",
        tags: ["ai"],
        summary:
          "Record that the reviewer opened a source cited by a statement (CR-7). Appends a revision carrying the current state forward; no base revision is needed. Read the record itself with the sources route.",
        params: aiGenerationIdParamsSchema,
        body: recordEvidenceOpenSchema,
        response: { 200: aiGenerationSchema, ...generationResponses },
      },
    },
    async (request): Promise<AiGeneration> => {
      const { patientId, generationId } = request.params;
      const { ctx, g, draft } = await reviewable(request, patientId, generationId);
      const { statementId, sourceType, sourceId } = request.body;
      await withTx(request, async ({ tx, audit }) => {
        await lockGeneration(tx, ctx, g.id);
        const reviews = await listReviews(tx, ctx, g.id);
        if (reviews.some((r) => r.decision !== "revised")) throw new AppError("ai_already_decided");
        const current = reviews[reviews.length - 1] ?? null;
        const at = await nextReviewTime(tx, ctx, g.id, now());
        let next;
        try {
          next = addEvidenceOpen(
            g.kind as GenerationKind,
            draft,
            current ? parseState(current.editedOutput) : emptyState(),
            { statementId, type: sourceType, id: sourceId },
            at,
          );
        } catch (err) {
          if (err instanceof ChangeError)
            throw new AppError("validation_error", [
              { path: err.path, issue: err.issue, message: "The statement does not cite it." },
            ]);
          throw err;
        }
        const reviewId = await insertReview(tx, ctx, {
          generationId: g.id,
          decision: "revised",
          editedOutput: next as never,
          reason: null,
          createdAt: at,
        });
        await audit({
          eventName: "ai.review",
          action: "C",
          outcome: "success",
          resourceType: "AIGeneration",
          resourceId: g.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "evidence_opened",
          metadata: { reviewId, statementId, sourceType, sourceId },
        });
      });
      return reload(ctx, patientId, g.id);
    },
  );

  app.post(
    "/patients/:patientId/ai/generations/:generationId/approve",
    {
      config: { access: { permission: "ai.review" }, rateLimit },
      schema: {
        operationId: "approveAiGeneration",
        tags: ["ai"],
        summary:
          "The one decision: approve the draft as revised. Refused (409 ai_approval_blocked) while unsupported statements are unresolved. For a note draft, creates a draft ClinicalNote authored by the approving clinician; it is not signed.",
        params: aiGenerationIdParamsSchema,
        body: approveAiGenerationSchema,
        response: { 200: aiGenerationSchema, ...generationResponses },
      },
    },
    async (request): Promise<AiGeneration> => {
      const { patientId, generationId } = request.params;
      const { ctx, g, draft } = await reviewable(request, patientId, generationId);
      const kind = g.kind as GenerationKind;
      if (kind === "note_draft" && !ctx.practitionerId) throw new AppError("forbidden");
      // CR-7: an undecided draft cannot be approved once the patient's AI consent is withdrawn.
      if ((await aiConsentStatus(db, ctx, patientId)) !== "active") {
        await request.server.deps.audit.fromRequest(request, {
          eventName: "ai.refused",
          action: "C",
          outcome: "minor_failure",
          resourceType: "AIGeneration",
          resourceId: g.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "consent_withdrawn",
          metadata: { kind },
        });
        throw new AppError("ai_consent_withdrawn");
      }
      await withTx(request, async ({ tx, audit }) => {
        await lockGeneration(tx, ctx, g.id);
        const reviews = await listReviews(tx, ctx, g.id);
        if (reviews.some((r) => r.decision !== "revised")) throw new AppError("ai_already_decided");
        const revisions = reviews.filter((r) => r.decision === "revised");
        const current = revisions[revisions.length - 1] ?? null;
        if ((current?.id ?? null) !== request.body.revisionId) throw new AppError("revision_stale");
        const state = current ? parseState(current.editedOutput) : emptyState();
        const verification = await verifyOutput(kind, draft, createSqlResolver(tx, ctx), {
          organizationId: ctx.orgId,
          patientId,
        });
        const views = statementViews(kind, draft, state, verification);
        const blockers = approvalBlockers(kind, draft, state, views, true);
        if (blockers.length)
          throw new AppError(
            "ai_approval_blocked",
            blockers.map((b) => ({
              path: b.statementIds.length
                ? `statements.${b.statementIds.join(",")}`
                : b.items.length
                  ? `missingInformation.${b.items.join(",")}`
                  : "",
              issue: b.code,
              message: BLOCKER_MESSAGES[b.code],
            })),
          );
        const decision = decisionFor(state);
        const final = finalOutput(kind, draft, state);
        const at = await nextReviewTime(tx, ctx, g.id, now());
        let noteId: string | null = null;
        if (kind === "note_draft") {
          const req = parseInputJson(g.input).request;
          const encounter =
            req?.kind === "encounter"
              ? await findEncounter(tx, ctx, patientId, req.encounterId)
              : null;
          if (!encounter) throw new AppError("ai_not_reviewable");
          noteId = await createDraftNoteFromGeneration(tx, ctx, {
            patientId,
            encounterId: encounter.id,
            authorPractitionerId: ctx.practitionerId!,
            noteType:
              encounter.typeCode === "PT-INIT-EVAL" ? "initial_evaluation" : "progress_note",
            generationId: g.id,
            soap: soapText(final as SoapNoteDraftOutput),
            at,
          });
        }
        const reviewId = await insertReview(tx, ctx, {
          generationId: g.id,
          decision,
          editedOutput: {
            schema: DECISION_SCHEMA,
            revisionId: current?.id ?? null,
            state,
            final,
            noteId,
          } as never,
          reason: null,
          createdAt: at,
        });
        await audit({
          eventName: "ai.review",
          action: "C",
          outcome: "success",
          resourceType: "AIGeneration",
          resourceId: g.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: decision,
          metadata: { reviewId, kind, ...(noteId ? { noteId } : {}) },
        });
      });
      return reload(ctx, patientId, g.id);
    },
  );

  app.post(
    "/patients/:patientId/ai/generations/:generationId/reject",
    {
      config: { access: { permission: "ai.review" }, rateLimit },
      schema: {
        operationId: "rejectAiGeneration",
        tags: ["ai"],
        summary: "The one decision: reject the draft with a reason. Nothing reaches the record.",
        params: aiGenerationIdParamsSchema,
        body: rejectAiGenerationSchema,
        response: { 200: aiGenerationSchema, ...generationResponses },
      },
    },
    async (request): Promise<AiGeneration> => {
      const { patientId, generationId } = request.params;
      const { ctx, g } = await reviewable(request, patientId, generationId);
      await withTx(request, async ({ tx, audit }) => {
        await lockGeneration(tx, ctx, g.id);
        const reviews = await listReviews(tx, ctx, g.id);
        if (reviews.some((r) => r.decision !== "revised")) throw new AppError("ai_already_decided");
        const reviewId = await insertReview(tx, ctx, {
          generationId: g.id,
          decision: "rejected",
          editedOutput: null,
          reason: request.body.reason,
          createdAt: await nextReviewTime(tx, ctx, g.id, now()),
        });
        await audit({
          eventName: "ai.review",
          action: "C",
          outcome: "success",
          resourceType: "AIGeneration",
          resourceId: g.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "rejected",
          metadata: { reviewId, kind: g.kind },
        });
      });
      return reload(ctx, patientId, g.id);
    },
  );

  app.post(
    "/patients/:patientId/ai/generations/:generationId/regenerate",
    {
      config: { access: { permission: "ai.generate" }, rateLimit },
      schema: {
        operationId: "regenerateAiGeneration",
        tags: ["ai"],
        summary:
          "A new generation for the same request (summaries cover the same number of days up to now), linked to this one by previousGenerationId. This one and its review history are kept. Refused once this one is approved.",
        params: aiGenerationIdParamsSchema,
        body: emptyBodySchema,
        response: { 201: aiGenerationSchema, ...errorResponses(400, 401, 403, 404, 409, 429, 502) },
      },
    },
    async (request, reply) => {
      const { patientId, generationId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const g = await requireGeneration(request, patientId, generationId);
      const facts = (await reviewFacts(db, ctx, [g.id])).get(g.id)!;
      if (facts.decision === "approved" || facts.decision === "approved_with_edits")
        throw new AppError("ai_already_decided");
      const prior = parseInputJson(g.input).request;
      const req =
        prior?.kind === "encounter"
          ? prior
          : progressRequest(now(), prior?.kind === "progress_window" ? prior.windowDays : 14);
      if (g.kind === "note_draft" && prior?.kind !== "encounter")
        throw new AppError("ai_not_reviewable");
      if (req.kind === "encounter" && !(await findEncounter(db, ctx, patientId, req.encounterId)))
        await denyOutOfScope(request, "Encounter", req.encounterId, patientId);
      const id = await runGeneration(request, reply, runtime, {
        patientId,
        req,
        previousGenerationId: g.id,
      });
      return reply.code(201).send(await reload(ctx, patientId, id));
    },
  );
};
