import { z } from "zod";
import { MissingInfoItem, SoapSection } from "../evals/schema.js";

export { MissingInfoItem, SoapSection };

/**
 * Evidence model (ADR-6). Every generated statement carries `sourceRefs`; the verifier resolves
 * each one inside the same patient and organization.
 */
export const SourceRefType = z.enum([
  "check_in",
  "exercise_session",
  "session_activity",
  "message",
  "appointment",
  "care_plan_version",
  "encounter",
  "observation",
]);
export type SourceRefType = z.infer<typeof SourceRefType>;

/**
 * `field` names the column the statement relies on (`painScore`, `body`, `status`). For an
 * encounter transcript it names one turn: `transcript.turn.<n>` (1-based).
 */
export const SourceRef = z.strictObject({
  type: SourceRefType,
  id: z.string().min(1).max(64),
  field: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)*$/),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const TRANSCRIPT_TURN_FIELD = /^transcript\.turn\.([1-9][0-9]*)$/;
export const transcriptTurnField = (turn: number) => `transcript.turn.${turn}`;

export const Statement = z.strictObject({
  /** Stable within one output: `s1`, `s2`, ... */
  id: z.string().regex(/^s\d+$/),
  text: z.string().trim().min(1).max(600),
  sourceRefs: z.array(SourceRef).max(12),
});
export type Statement = z.infer<typeof Statement>;

/** Source text that looked like an instruction to the model. It was treated as data. */
export const DataNotice = z.strictObject({
  code: z.literal("instruction_like_source_text"),
  sourceRefs: z.array(SourceRef).min(1).max(12),
});
export type DataNotice = z.infer<typeof DataNotice>;

// ---------------------------------------------------------------------------------------------
// (a) Clinician progress summary (PRD section 11, BRIEF section 6)
// ---------------------------------------------------------------------------------------------

export const SummaryMissingItem = z.enum([
  "no_check_ins_in_window",
  "no_sessions_in_window",
  "no_current_care_plan",
  "no_upcoming_appointment",
  "no_patient_messages_in_window",
  "check_in_difficulty_not_reported",
]);
export type SummaryMissingItem = z.infer<typeof SummaryMissingItem>;

export const SummaryMissingInformation = z.strictObject({
  item: SummaryMissingItem,
  label: z.string().trim().min(1).max(200),
});

const progressSummarySections = {
  reportedChanges: z.array(Statement).max(12),
  engagementObservations: z.array(Statement).max(12),
  missingInformation: z.array(SummaryMissingInformation).max(SummaryMissingItem.options.length),
  itemsForReview: z.array(Statement).max(12),
  notices: z.array(DataNotice).max(12),
};

/**
 * Current schema (prompt `progress_summary@1.1.0`). `summary` may be empty: a window with no
 * sessions, no check-ins and no published plan has nothing to summarise, and the gaps are listed in
 * `missingInformation` instead (checkpoint C3, A1). The approval gate refuses an output with no
 * statements at all (`empty_output`), so such a draft can only be rejected.
 */
export const ProgressSummaryOutput = z.strictObject({
  summary: z.array(Statement).max(4),
  ...progressSummarySections,
});

/**
 * The schema `progress_summary@1.0.0` was written against (`summary` needs one statement). Kept
 * only so that version's prompt text, and so its pinned fingerprint, stays exactly as registered.
 */
export const ProgressSummaryOutputV1_0 = z.strictObject({
  summary: z.array(Statement).min(1).max(4),
  ...progressSummarySections,
});
export type ProgressSummaryOutput = z.infer<typeof ProgressSummaryOutput>;

// ---------------------------------------------------------------------------------------------
// (b) SOAP note draft from a synthetic encounter transcript
// ---------------------------------------------------------------------------------------------

export const NoteMissingInformation = z.strictObject({
  section: SoapSection,
  item: MissingInfoItem,
  label: z.string().trim().min(1).max(200),
});
export type NoteMissingInformation = z.infer<typeof NoteMissingInformation>;

export const SoapNoteDraftOutput = z.strictObject({
  subjective: z.array(Statement).max(20),
  objective: z.array(Statement).max(20),
  assessment: z.array(Statement).max(20),
  plan: z.array(Statement).max(20),
  missingInformation: z.array(NoteMissingInformation).max(MissingInfoItem.options.length),
  notices: z.array(DataNotice).max(12),
});
export type SoapNoteDraftOutput = z.infer<typeof SoapNoteDraftOutput>;

export const GENERATION_KINDS = ["progress_summary", "note_draft"] as const;
export type GenerationKind = (typeof GENERATION_KINDS)[number];

export type OutputFor<K extends GenerationKind> = K extends "progress_summary"
  ? ProgressSummaryOutput
  : SoapNoteDraftOutput;

export const OUTPUT_SCHEMAS = {
  progress_summary: ProgressSummaryOutput,
  note_draft: SoapNoteDraftOutput,
} as const;

/** Every statement of an output, in display order, with the section it belongs to. */
export function listStatements(
  kind: GenerationKind,
  output: ProgressSummaryOutput | SoapNoteDraftOutput,
): { section: string; statement: Statement }[] {
  const sections =
    kind === "progress_summary"
      ? (["summary", "reportedChanges", "engagementObservations", "itemsForReview"] as const)
      : (["subjective", "objective", "assessment", "plan"] as const);
  const out: { section: string; statement: Statement }[] = [];
  const record = output as unknown as Record<string, Statement[]>;
  for (const section of sections) {
    for (const statement of record[section] ?? []) out.push({ section, statement });
  }
  return out;
}

/**
 * Statement ids must be unique within an output. Checked after the schema, so a provider that
 * repeats ids gets the same "invalid output" treatment as one that breaks the schema.
 */
export function duplicateStatementIds(
  kind: GenerationKind,
  output: ProgressSummaryOutput | SoapNoteDraftOutput,
) {
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const { statement } of listStatements(kind, output)) {
    if (seen.has(statement.id)) dup.push(statement.id);
    seen.add(statement.id);
  }
  return dup;
}
