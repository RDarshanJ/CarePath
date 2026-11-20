/**
 * Seeded AI generations (WP 5.2). Every seeded draft is the real output of the deterministic demo
 * provider (`@carepath/ai`) run on the same records the seed writes, so the API reads it back,
 * resolves its references and shows it exactly like a draft generated through the API. The
 * stored JSON follows `apps/api/src/modules/ai/review-state.ts` (schema names repeated below).
 * Nothing here claims a model call: provider "deterministic", zero tokens, zero cost.
 */
import {
  DETERMINISTIC_PROVIDER_LABEL,
  NoteDraftInput,
  ProgressSummaryInput,
  ZERO_COST_LABEL,
  draftProgressSummary,
  draftSoapNote,
  getPrompt,
  listStatements,
  parseTranscriptText,
  sourceRecords,
  type GenerationKind,
  type ProgressSummaryOutput,
  type SoapNoteDraftOutput,
  type SourceRecord,
} from "@carepath/ai";
import { MIN, iso, type Ctx, type PatientInfo } from "./ctx.js";

const INPUT_SCHEMA = "carepath.ai.generation-input.v1";
const OUTPUT_SCHEMA = "carepath.ai.generation-output.v1";
const DECISION_SCHEMA = "carepath.ai.review-decision.v1";
const STATE_SCHEMA = "carepath.ai.review-state.v1";
const DAY = 86_400_000;

/** Statements whose refs do not resolve against the input records (in-memory reference rule). */
function unsupportedCount(
  kind: GenerationKind,
  output: ProgressSummaryOutput | SoapNoteDraftOutput,
  records: SourceRecord[],
): number {
  const byKey = new Map(records.map((r) => [`${r.type}:${r.id}`, r]));
  return listStatements(kind, output).filter(({ statement }) => {
    if (statement.sourceRefs.length === 0) return true;
    return statement.sourceRefs.some((ref) => {
      const v = byKey.get(`${ref.type}:${ref.id}`)?.fields[ref.field];
      return v === undefined || v === null || v === "";
    });
  }).length;
}

function generationRow(
  ctx: Ctx,
  p: PatientInfo,
  requestedByUserId: string,
  id: string,
  kind: GenerationKind,
  request: Record<string, string | number>,
  output: ProgressSummaryOutput | SoapNoteDraftOutput,
  records: SourceRecord[],
  atMs: number,
) {
  return {
    id,
    organizationId: p.org.id,
    patientId: p.id,
    kind,
    provider: "deterministic",
    providerLabel: DETERMINISTIC_PROVIDER_LABEL,
    model: null,
    promptKey: kind,
    promptVersion: getPrompt(kind).version,
    status: "succeeded" as const,
    input: {
      schema: INPUT_SCHEMA,
      request,
      inputRefs: records.flatMap((r) =>
        Object.keys(r.fields).map((field) => ({ type: r.type, id: r.id, field })),
      ),
      run: {
        calls: [
          {
            attempt: 1,
            outcome: "succeeded",
            latencyMs: 0,
            inputTokens: 0,
            outputTokens: 0,
            costMicroUsd: 0,
            costLabel: ZERO_COST_LABEL,
            backoffMs: null,
          },
        ],
        costLabel: ZERO_COST_LABEL,
        redaction: { applied: false, tokenCount: 0, counts: {} },
        errorCode: null,
      },
    },
    output: { schema: OUTPUT_SCHEMA, draft: output, verification: null },
    error: null,
    inputTokens: 0,
    outputTokens: 0,
    costMicroUsd: 0,
    latencyMs: 0,
    unsupportedStatementCount: unsupportedCount(kind, output, records),
    requestedByUserId,
    previousGenerationId: null,
    createdAt: iso(atMs),
    completedAt: iso(atMs),
  };
}

/** A decision row that approves the draft as generated (no edits), in the API's format. */
export function approvalRow(
  ctx: Ctx,
  p: PatientInfo,
  generationId: string,
  reviewerUserId: string,
  draft: ProgressSummaryOutput | SoapNoteDraftOutput,
  noteId: string | null,
  atMs: number,
) {
  return {
    id: ctx.id("ai-review", generationId),
    organizationId: p.org.id,
    generationId,
    reviewerUserId,
    decision: "approved" as const,
    editedOutput: {
      schema: DECISION_SCHEMA,
      revisionId: null,
      state: {
        schema: STATE_SCHEMA,
        statements: {},
        acknowledgedMissing: draft.missingInformation.map((m) => m.item),
        // The approval gate asks for evidence opened on reported changes; the seeded review did.
        evidenceOpened: (
          ("reportedChanges" in draft ? draft.reportedChanges : []) as {
            id: string;
            sourceRefs: { type: string; id: string }[];
          }[]
        )
          .filter((st) => st.sourceRefs.length > 0)
          .map((st) => ({
            statementId: st.id,
            type: st.sourceRefs[0]!.type,
            id: st.sourceRefs[0]!.id,
            at: iso(atMs - MIN),
          })),
        change: "edit",
      },
      final: draft,
      noteId,
    },
    reason: null,
    createdAt: iso(atMs),
  };
}

/** The SOAP note draft of a seeded encounter, from its synthetic transcript. */
export function seedNoteDraft(
  ctx: Ctx,
  p: PatientInfo,
  therapistUserId: string,
  encounter: { id: string; type: "initial_evaluation" | "follow_up" | "video_follow_up" },
  transcriptText: string,
  atMs: number,
) {
  const input = NoteDraftInput.parse({
    scope: { organizationId: p.org.id, patientId: p.id },
    encounter: { id: encounter.id, type: encounter.type, bodyRegion: null },
    transcript: parseTranscriptText(transcriptText).slice(0, 400),
  });
  const draft = draftSoapNote(input);
  const id = ctx.id("ai-generation", `${encounter.id}/draft`);
  const row = generationRow(
    ctx,
    p,
    therapistUserId,
    id,
    "note_draft",
    { kind: "encounter", encounterId: encounter.id },
    draft,
    sourceRecords("note_draft", input),
    atMs,
  );
  const join = (l: { text: string }[]) => l.map((s) => s.text).join("\n");
  return {
    id,
    row,
    draft,
    soap: {
      subjective: join(draft.subjective),
      objective: join(draft.objective),
      assessment: join(draft.assessment),
      plan: join(draft.plan),
    },
  };
}

/**
 * Progress summaries for a few active patients with AI consent, over the 14 days before the
 * anchor, built from the seeded rows exactly as the API assembles them. Runs after messages.
 * Half stay unreviewed (the overview's "AI drafts awaiting review"), the rest are approved.
 */
export function buildAiSummaries(ctx: Ctx): void {
  const { t, profile } = ctx;
  const rng = ctx.rng.fork("ai-summaries");
  const eligible = ctx.patients.filter(
    (p) => p.status === "active" && p.aiConsent && p.therapist && p.checkIns.length >= 3,
  );
  const wanted = Math.max(2, Math.round(profile.encounters / 2));
  // patient.demo first, so therapist.demo has a summary awaiting review (Scenario F).
  const demo = eligible.filter((p) => p.persona === "demo");
  const picks = [...demo, ...rng.shuffle(eligible.filter((p) => p.persona !== "demo"))].slice(
    0,
    wanted,
  );

  const exerciseName = new Map(t.Exercise.map((e) => [e.id, e.name]));
  const assignmentExercise = new Map(t.ExerciseAssignment.map((a) => [a.id, a.exerciseId]));
  const versionsById = new Map(t.CarePlanVersion.map((v) => [v.id, v]));
  const assignmentsPerVersion = new Map<string, number>();
  for (const a of t.ExerciseAssignment)
    assignmentsPerVersion.set(
      a.carePlanVersionId,
      (assignmentsPerVersion.get(a.carePlanVersionId) ?? 0) + 1,
    );
  const roleOf = new Map(
    t.OrganizationMembership.map((m) => [`${m.organizationId}:${m.userId}`, m.roleKey]),
  );
  const conversationPatient = new Map(t.Conversation.map((c) => [c.id, c.patientId]));

  picks.forEach((p, i) => {
    const th = p.therapist!;
    const toMs = ctx.anchorMs - (i + 1) * 5 * 3_600_000;
    const fromMs = toMs - 14 * DAY;
    const inWindow = (s: string) => {
      const ms = Date.parse(s);
      return ms >= fromMs && ms <= toMs;
    };
    const current = [...p.versions].reverse().find((v) => v.publishedAtMs <= toMs);
    const versionRow = current ? versionsById.get(current.id) : undefined;
    const sessions = t.ExerciseSession.filter((s) => s.patientId === p.id && inWindow(s.startedAt))
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
      .slice(0, 60);
    const input = ProgressSummaryInput.parse({
      scope: { organizationId: p.org.id, patientId: p.id },
      window: { from: iso(fromMs), to: iso(toMs) },
      carePlan: versionRow
        ? {
            versionId: versionRow.id,
            versionNumber: versionRow.versionNumber,
            title: versionRow.title,
            publishedAt: versionRow.publishedAt,
            exerciseCount: assignmentsPerVersion.get(versionRow.id) ?? 0,
          }
        : null,
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        activities: t.SessionActivity.filter((a) => a.sessionId === s.id)
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((a) => ({
            id: a.id,
            status: a.status,
            exerciseName: exerciseName.get(assignmentExercise.get(a.assignmentId) ?? "") ?? "",
            discomfortReported: a.discomfortReported,
            discomfortLevel: a.discomfortLevel,
            skipReason: a.skipReason,
          })),
      })),
      checkIns: t.PatientCheckIn.filter((c) => c.patientId === p.id && inWindow(c.submittedAt))
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id))
        .slice(0, 60)
        .map((c) => ({
          id: c.id,
          painScore: c.painScore,
          difficulty: c.difficulty,
          notes: c.notes,
          submittedAt: c.submittedAt,
        })),
      messages: t.Message.filter(
        (m) =>
          m.status === "sent" &&
          conversationPatient.get(m.conversationId) === p.id &&
          inWindow(m.createdAt),
      )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .slice(0, 60)
        .map((m) => {
          const role = roleOf.get(`${p.org.id}:${m.senderUserId}`);
          return {
            id: m.id,
            senderRole:
              role === "patient"
                ? "patient"
                : role === "physical_therapist"
                  ? "clinician"
                  : "coordinator",
            body: m.body,
            createdAt: m.createdAt,
          };
        }),
      appointments: t.Appointment.filter(
        (a) => a.patientId === p.id && Date.parse(a.startsAt) >= fromMs,
      )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id))
        .slice(0, 30)
        .map((a) => ({ id: a.id, type: a.type, status: a.status, startsAt: a.startsAt })),
    });
    const draft = draftProgressSummary(input);
    const id = ctx.id("ai-generation", `${p.id}/summary`);
    const at = toMs + 1000;
    // The first patient's summary follows a failed attempt, as the AI_PROBE=fail test hook
    // produces it (labelled as a test probe, three invalid outputs, no draft stored), so the
    // failed state and regeneration lineage exist in the demo data.
    let previousGenerationId: string | null = null;
    if (i === 0) {
      previousGenerationId = ctx.id("ai-generation", `${p.id}/summary-failed`);
      t.AIGeneration.push(
        failedProbeRow(p, th.userId, previousGenerationId, fromMs, toMs, at - 10 * MIN),
      );
    }
    t.AIGeneration.push({
      ...generationRow(
        ctx,
        p,
        th.userId,
        id,
        "progress_summary",
        { kind: "progress_window", windowDays: 14, from: iso(fromMs), to: iso(toMs) },
        draft,
        sourceRecords("progress_summary", input),
        at,
      ),
      previousGenerationId,
    });
    if (i % 2 === 1)
      t.AIReview.push(approvalRow(ctx, p, id, th.userId, draft, null, at + 20 * MIN));
  });
}

function failedProbeRow(
  p: PatientInfo,
  requestedByUserId: string,
  id: string,
  fromMs: number,
  toMs: number,
  atMs: number,
) {
  const call = (attempt: number) => ({
    attempt,
    outcome: "invalid_output",
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    costMicroUsd: 0,
    costLabel: "No model call: test probe, zero cost",
    backoffMs: attempt < 3 ? 500 * 2 ** (attempt - 1) : null,
  });
  return {
    id,
    organizationId: p.org.id,
    patientId: p.id,
    kind: "progress_summary" as const,
    provider: "deterministic-probe",
    providerLabel: `${DETERMINISTIC_PROVIDER_LABEL} (test probe: invalid output)`,
    model: null,
    promptKey: "progress_summary",
    promptVersion: getPrompt("progress_summary").version,
    status: "failed" as const,
    input: {
      schema: INPUT_SCHEMA,
      request: { kind: "progress_window", windowDays: 14, from: iso(fromMs), to: iso(toMs) },
      inputRefs: [],
      run: {
        calls: [call(1), call(2), call(3)],
        costLabel: "No model call: test probe, zero cost",
        redaction: { applied: false, tokenCount: 0, counts: {} },
        errorCode: "invalid_output",
      },
    },
    output: null,
    error: "Output failed the progress_summary schema at root.",
    inputTokens: 0,
    outputTokens: 0,
    costMicroUsd: 0,
    latencyMs: 1500,
    unsupportedStatementCount: null,
    requestedByUserId,
    previousGenerationId: null,
    createdAt: iso(atMs),
    completedAt: iso(atMs),
  };
}
