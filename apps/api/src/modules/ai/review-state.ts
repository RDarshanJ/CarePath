/**
 * Stored JSON shapes of the AI module and the pure review logic (WP 5.2).
 *
 * `AIGeneration.input`  : GenerationInputJson  (request, input references, run record)
 * `AIGeneration.output` : GenerationOutputJson (validated draft, verification at generation)
 * `AIReview.editedOutput`
 *   - decision `revised`            : ReviewStateJson (the whole working state after that edit)
 *   - `approved`/`approved_with_edits`: DecisionJson (state approved plus the final output)
 *   - `rejected`                    : null (the reason is in `AIReview.reason`)
 *
 * A revision stores the full state, not a diff, so the latest revision alone says what the
 * clinician has done; earlier revisions stay as history. The generated draft is never changed.
 */
import { z } from "zod";
import {
  OUTPUT_SCHEMAS,
  listStatements,
  verifyOutput,
  type AllowedRecord,
  type AllowListReason,
  type EvidenceResolver,
  type GenerationKind,
  type ProgressSummaryOutput,
  type SoapNoteDraftOutput,
  type SourceRef,
  type StatementVerdict,
  type UnsupportedReason,
  type VerificationResult,
} from "@carepath/ai";
import type { AiRevisionChange } from "@carepath/shared/contracts";

export type DraftOutput = ProgressSummaryOutput | SoapNoteDraftOutput;

// ---------------------------------------------------------------------------------------------
// Generation JSON
// ---------------------------------------------------------------------------------------------

export const INPUT_SCHEMA = "carepath.ai.generation-input.v1";
export const OUTPUT_SCHEMA = "carepath.ai.generation-output.v1";
export const STATE_SCHEMA = "carepath.ai.review-state.v1";
export const DECISION_SCHEMA = "carepath.ai.review-decision.v1";

export type GenerationRequest =
  | { kind: "progress_window"; windowDays: number; from: string; to: string }
  | { kind: "encounter"; encounterId: string };

const requestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("progress_window"),
    windowDays: z.number(),
    from: z.string(),
    to: z.string(),
  }),
  z.object({ kind: z.literal("encounter"), encounterId: z.string() }),
]);

const callSchema = z.object({
  attempt: z.number(),
  outcome: z.string(),
  latencyMs: z.number(),
});

/** One record (and field) the prompt was built from, as the pipeline stored it. */
const inputRefSchema = z.object({ type: z.string(), id: z.string(), field: z.string() });

const inputJsonSchema = z.object({
  schema: z.literal(INPUT_SCHEMA),
  request: requestSchema,
  /** Absent on rows written before the pipeline stored it; then the allow list is not applied. */
  inputRefs: z.array(inputRefSchema).optional(),
  run: z.object({
    calls: z.array(callSchema),
    costLabel: z.string(),
    errorCode: z.string().nullable(),
  }),
});

export interface ParsedInput {
  request: GenerationRequest | null;
  /** The records the generation was given; null for an older row that did not store them. */
  inputRefs: AllowedRecord[] | null;
  attempts: number;
  costLabel: string;
  errorCode: string | null;
}

/** Reads `AIGeneration.input`; rows written before WP 5.2 (older seed format) read as unknown. */
export function parseInputJson(value: unknown): ParsedInput {
  const p = inputJsonSchema.safeParse(value);
  if (!p.success)
    return {
      request: null,
      inputRefs: null,
      attempts: 0,
      costLabel: "Not recorded",
      errorCode: null,
    };
  return {
    request: p.data.request as GenerationRequest,
    inputRefs: p.data.inputRefs
      ? p.data.inputRefs.map((r) => ({ type: r.type as AllowedRecord["type"], id: r.id }))
      : null,
    attempts: p.data.run.calls.length,
    costLabel: p.data.run.costLabel,
    errorCode: p.data.run.errorCode,
  };
}

/** The validated draft, or null when the stored output does not match the kind's schema. */
export function parseDraft(kind: GenerationKind, value: unknown): DraftOutput | null {
  const draft =
    typeof value === "object" && value !== null && "draft" in value
      ? (value as { draft: unknown }).draft
      : undefined;
  const p = OUTPUT_SCHEMAS[kind].safeParse(draft);
  return p.success ? p.data : null;
}

// ---------------------------------------------------------------------------------------------
// Review state
// ---------------------------------------------------------------------------------------------

const entrySchema = z.discriminatedUnion("resolution", [
  z.object({ resolution: z.literal("edited"), text: z.string() }),
  z.object({ resolution: z.literal("removed") }),
  z.object({ resolution: z.literal("acknowledged"), note: z.string() }),
]);
export type StatementEntry = z.infer<typeof entrySchema>;

const evidenceOpenSchema = z.object({
  statementId: z.string(),
  type: z.string(),
  id: z.string(),
  at: z.string(),
});

const stateSchema = z.object({
  schema: z.literal(STATE_SCHEMA),
  statements: z.record(z.string(), entrySchema),
  acknowledgedMissing: z.array(z.string()).default([]),
  /** Evidence opened by a reviewer, per statement and cited record (CR-7). */
  evidenceOpened: z.array(evidenceOpenSchema).default([]),
  /** What the revision that stored this state recorded. */
  change: z.enum(["edit", "evidence_opened"]).default("edit"),
});
export type ReviewState = z.infer<typeof stateSchema>;

export const emptyState = (): ReviewState => ({
  schema: STATE_SCHEMA,
  statements: {},
  acknowledgedMissing: [],
  evidenceOpened: [],
  change: "edit",
});

export function parseState(value: unknown): ReviewState {
  const direct = stateSchema.safeParse(value);
  if (direct.success) return direct.data;
  // A decision row carries the state it approved.
  if (typeof value === "object" && value !== null && "state" in value) {
    const nested = stateSchema.safeParse((value as { state: unknown }).state);
    if (nested.success) return nested.data;
  }
  return emptyState();
}

export class ChangeError extends Error {
  constructor(
    readonly path: string,
    readonly issue: string,
  ) {
    super(issue);
  }
}

/** Applies changes in order to a copy of `state`. Unknown statements or items throw ChangeError. */
export function applyChanges(
  kind: GenerationKind,
  draft: DraftOutput,
  state: ReviewState,
  changes: AiRevisionChange[],
): ReviewState {
  const ids = new Set(listStatements(kind, draft).map((s) => s.statement.id));
  const items = new Set<string>(draft.missingInformation.map((m) => m.item));
  const next: ReviewState = {
    schema: STATE_SCHEMA,
    statements: { ...state.statements },
    acknowledgedMissing: [...state.acknowledgedMissing],
    evidenceOpened: [...state.evidenceOpened],
    change: "edit",
  };
  changes.forEach((c, i) => {
    if (c.action === "acknowledge_missing") {
      if (!items.has(c.item)) throw new ChangeError(`body.changes.${i}.item`, "unknown_item");
      if (!next.acknowledgedMissing.includes(c.item)) next.acknowledgedMissing.push(c.item);
      return;
    }
    if (!ids.has(c.statementId))
      throw new ChangeError(`body.changes.${i}.statementId`, "unknown_statement");
    switch (c.action) {
      case "edit":
        next.statements[c.statementId] = { resolution: "edited", text: c.text };
        break;
      case "remove":
        next.statements[c.statementId] = { resolution: "removed" };
        break;
      case "acknowledge":
        next.statements[c.statementId] = { resolution: "acknowledged", note: c.note };
        break;
      case "restore":
        delete next.statements[c.statementId];
        break;
    }
  });
  return next;
}

/** Records that a reviewer opened one source cited by a statement. Throws for a ref it does not cite. */
export function addEvidenceOpen(
  kind: GenerationKind,
  draft: DraftOutput,
  state: ReviewState,
  open: { statementId: string; type: string; id: string },
  at: Date,
): ReviewState {
  const statement = listStatements(kind, draft).find((s) => s.statement.id === open.statementId);
  if (!statement) throw new ChangeError("body.statementId", "unknown_statement");
  if (!statement.statement.sourceRefs.some((r) => r.type === open.type && r.id === open.id))
    throw new ChangeError("body.sourceId", "not_cited_by_statement");
  return {
    ...state,
    statements: { ...state.statements },
    acknowledgedMissing: [...state.acknowledgedMissing],
    evidenceOpened: [...state.evidenceOpened, { ...open, at: at.toISOString() }],
    change: "evidence_opened",
  };
}

export type Verification = VerificationResult<UnsupportedReason | AllowListReason>;

/**
 * Verifies a stored draft as it is read or approved (checkpoint C3, B8): against the records
 * that exist now in scope and, when the row stored them, against the records the generation was
 * given (`not_in_input`). An older row without `inputRefs` verifies as before.
 */
export function verifyStored(
  kind: GenerationKind,
  draft: DraftOutput,
  resolver: EvidenceResolver,
  scope: { organizationId: string; patientId: string },
  inputRefs: readonly AllowedRecord[] | null,
): Promise<Verification> {
  return inputRefs
    ? verifyOutput(kind, draft, resolver, scope, { allowedRecords: inputRefs })
    : verifyOutput(kind, draft, resolver, scope);
}

export interface StatementView {
  id: string;
  section: string;
  text: string;
  originalText: string;
  resolution: "unchanged" | "edited" | "removed" | "acknowledged";
  note: string | null;
  verdict: StatementVerdict<UnsupportedReason | AllowListReason>;
  needsResolution: boolean;
  evidenceOpened: boolean;
  sourceRefs: SourceRef[];
}

/** Statements with the clinician's state and the verifier's verdict, in generated order. */
export function statementViews(
  kind: GenerationKind,
  draft: DraftOutput,
  state: ReviewState,
  verification: Verification,
): StatementView[] {
  const verdicts = new Map(verification.statements.map((v) => [v.statementId, v]));
  return listStatements(kind, draft).map(({ section, statement }) => {
    const entry = state.statements[statement.id];
    const verdict = verdicts.get(statement.id)!;
    return {
      id: statement.id,
      section,
      text: entry?.resolution === "edited" ? entry.text : statement.text,
      originalText: statement.text,
      resolution: entry?.resolution ?? "unchanged",
      note: entry?.resolution === "acknowledged" ? entry.note : null,
      verdict,
      needsResolution: verdict.status === "unsupported" && !entry,
      evidenceOpened: state.evidenceOpened.some((e) => e.statementId === statement.id),
      sourceRefs: statement.sourceRefs,
    };
  });
}

export interface Blocker {
  code:
    | "unsupported_unresolved"
    | "missing_unacknowledged"
    | "evidence_not_opened"
    | "empty_output"
    | "consent_withdrawn";
  statementIds: string[];
  items: string[];
}

/**
 * The approval gate (design CD-407 option A, DR-002 M). Demo rules pending clinical governance
 * review: every unsupported statement edited, removed or acknowledged; every missing-information
 * item acknowledged; for progress summaries, evidence opened for each reported-change statement
 * still in the output; something left to approve; and the patient's AI consent still active.
 */
export function approvalBlockers(
  kind: GenerationKind,
  draft: DraftOutput,
  state: ReviewState,
  views: StatementView[],
  consentActive: boolean,
): Blocker[] {
  const blockers: Blocker[] = [];
  const block = (code: Blocker["code"], statementIds: string[] = [], items: string[] = []) =>
    blockers.push({ code, statementIds, items });
  const unresolved = views.filter((v) => v.needsResolution).map((v) => v.id);
  if (unresolved.length) block("unsupported_unresolved", unresolved);
  const missing = draft.missingInformation
    .map((m) => m.item as string)
    .filter((item) => !state.acknowledgedMissing.includes(item));
  if (missing.length) block("missing_unacknowledged", [], missing);
  if (kind === "progress_summary") {
    const unopened = views
      .filter((v) => v.section === "reportedChanges" && v.resolution !== "removed")
      .filter((v) => v.sourceRefs.length > 0 && !v.evidenceOpened)
      .map((v) => v.id);
    if (unopened.length) block("evidence_not_opened", unopened);
  }
  if (views.length === 0 || views.every((v) => v.resolution === "removed")) block("empty_output");
  if (!consentActive) block("consent_withdrawn");
  return blockers;
}

/** The output as approved: edited text in place, removed statements left out. */
export function finalOutput(kind: GenerationKind, draft: DraftOutput, state: ReviewState) {
  const apply = (list: { id: string; text: string; sourceRefs: SourceRef[] }[]) =>
    list
      .filter((s) => state.statements[s.id]?.resolution !== "removed")
      .map((s) => {
        const e = state.statements[s.id];
        return e?.resolution === "edited" ? { ...s, text: e.text } : s;
      });
  if (kind === "note_draft") {
    const d = draft as SoapNoteDraftOutput;
    return {
      ...d,
      subjective: apply(d.subjective),
      objective: apply(d.objective),
      assessment: apply(d.assessment),
      plan: apply(d.plan),
    };
  }
  const d = draft as ProgressSummaryOutput;
  return {
    ...d,
    summary: apply(d.summary),
    reportedChanges: apply(d.reportedChanges),
    engagementObservations: apply(d.engagementObservations),
    itemsForReview: apply(d.itemsForReview),
  };
}

/** SOAP text per section for a note version: one statement per line. */
export function soapText(final: SoapNoteDraftOutput) {
  const join = (l: { text: string }[]) => l.map((s) => s.text).join("\n");
  return {
    subjective: join(final.subjective),
    objective: join(final.objective),
    assessment: join(final.assessment),
    plan: join(final.plan),
  };
}

/** approved_with_edits when any statement text changed or was removed. */
export function decisionFor(state: ReviewState): "approved" | "approved_with_edits" {
  return Object.values(state.statements).some(
    (e) => e.resolution === "edited" || e.resolution === "removed",
  )
    ? "approved_with_edits"
    : "approved";
}
