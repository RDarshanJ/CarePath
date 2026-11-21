import {
  AI_CONSENT_NAME,
  AI_GENERATED_NAME,
  formatDateTime,
  formatCalendarDay,
  localDayOf,
  plural,
  tzAbbreviation,
} from "@carepath/shared";
import type { AiGeneration, AiSourceType, AiStatement } from "@carepath/shared/contracts";

/*
 * Generated-content wording (CD-236, CD-404 to CD-407, DR-002 M as amended by checkpoint C3 3.1).
 * No label says "AI" for the output; "opened", never "checked"; "supported" always means "the cited
 * record exists for this patient". No confidence figure anywhere.
 */

export type AiBlocker = AiGeneration["approval"]["blockers"][number];
export type AiProvider = Pick<AiGeneration["provider"], "label" | "isDemo">;

/** Shown when a generation has no stored provider name: a defect, never hidden (CD-404). */
export const PROVIDER_NOT_RECORDED = "Provider not recorded";

export const sourceTypeWords: Record<AiSourceType, string> = {
  check_in: "Patient check-in",
  exercise_session: "Session",
  session_activity: "Session exercise",
  message: "Message",
  appointment: "Appointment",
  care_plan_version: "Plan version",
  encounter: "Visit transcript",
  observation: "Observation",
};

/** "Open evidence 2: patient check-in, Nov 14" (CD-400 accessible name). */
export function evidenceRefLabel(
  n: number,
  type: AiSourceType,
  occurredAt?: string | null,
  tz?: string,
): string {
  const day = occurredAt && tz ? `, ${formatCalendarDay(localDayOf(occurredAt, tz))}` : "";
  return `Open evidence ${n}: ${sourceTypeWords[type].toLowerCase()}${day}`;
}

/** "12:14 PM MST, Nov 19": date, time and zone abbreviation in the clinic zone. */
function stamp(iso: string, tz: string): string {
  return `${formatDateTime(iso, tz)} ${tzAbbreviation(iso, tz)}`;
}

export interface ProvenanceInput {
  provider: AiProvider | null;
  /** Records the draft was built from. */
  recordCount: number;
  /** Window of the input, instants. Null for a transcript draft. */
  from?: string | null;
  to?: string | null;
  generatedAt: string;
  timezone: string;
}

/**
 * "Generated draft. Provider: Demo provider, rule-based. Based on 9 records from Nov 5 to Nov 19.
 * Generated Nov 19, 9:02 AM MST." (CD-404, C3: provider label as received, no "AI" in front).
 */
export function provenanceText(p: ProvenanceInput): string {
  const provider = p.provider?.label.trim() ? p.provider.label : PROVIDER_NOT_RECORDED;
  const window =
    p.from && p.to
      ? ` from ${formatCalendarDay(localDayOf(p.from, p.timezone))} to ${formatCalendarDay(localDayOf(p.to, p.timezone))}`
      : "";
  return `${AI_GENERATED_NAME}. Provider: ${provider}. Based on ${plural(p.recordCount, "record")}${window}. Generated ${stamp(p.generatedAt, p.timezone)}.`;
}

export function editedByText(name: string, at: string, tz: string): string {
  return `Edited by ${name}, ${stamp(at, tz)}.`;
}
export function reviewedByText(name: string, at: string, tz: string, edited: boolean): string {
  return `${edited ? "Edited, reviewed and approved" : "Reviewed and approved"} by ${name}, ${stamp(at, tz)}.`;
}

/** Statement support in words (CD-405, DR-002 M(d), C3). */
export type StatementSupportKind = "supported" | "unsupported" | "edited" | "removed" | "kept";

export function statementSupportKind(
  s: Pick<AiStatement, "support" | "resolution">,
): StatementSupportKind {
  if (s.resolution === "edited") return "edited";
  if (s.resolution === "removed") return "removed";
  if (s.resolution === "acknowledged") return "kept";
  return s.support === "supported" ? "supported" : "unsupported";
}

export const statementSupportWords: Record<StatementSupportKind, string> = {
  supported: "Supported: the cited record exists for this patient",
  unsupported: "No supporting record found",
  edited: "Edited, not re-checked",
  removed: "Removed from the approved text",
  kept: "Kept without a supporting record",
};

/** Review summary above the sections: counts only, no score. */
export function reviewSummaryText(
  v: { statementCount: number; supportedCount: number; unsupportedCount: number },
  missing: number,
): string {
  const missingPart = missing > 0 ? ` ${plural(missing, "item")} of missing information.` : "";
  return `${plural(v.statementCount, "statement")}: ${v.supportedCount} supported, ${v.unsupportedCount} with no supporting record.${missingPart}`;
}

/** "1 statement has no supporting record", the words the statement chip uses. */
export function supportCountText(n: number): string {
  return n === 1
    ? "1 statement has no supporting record"
    : `${n} statements have no supporting record`;
}

/** One phrase per approval blocker (CD-407). Rejecting is always available. */
export function blockerPhrase(b: AiBlocker): string {
  switch (b.code) {
    case "unsupported_unresolved":
      return supportCountText(b.statementIds.length || 1);
    case "missing_unacknowledged":
      return b.items.length > 1
        ? `${b.items.length} items of missing information are not acknowledged`
        : "missing information is not acknowledged";
    case "evidence_not_opened":
      return b.statementIds.length === 1
        ? "evidence has not been opened for 1 reported change"
        : `evidence has not been opened for ${b.statementIds.length} reported changes`;
    case "empty_output":
      return "nothing would be left to approve";
    case "consent_withdrawn":
      return `the patient no longer allows ${AI_CONSENT_NAME}`;
  }
}

/** "Approve is unavailable: 2 statements have no source, and missing information is not acknowledged." */
export function approvalUnavailableText(blockers: AiBlocker[]): string {
  const phrases = blockers.map(blockerPhrase);
  if (phrases.length === 0) return "";
  const joined =
    phrases.length === 1
      ? phrases[0]
      : `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
  return `Approve is unavailable: ${joined}.`;
}

/** The decision labels (CD-407). Only one approve label is ever shown. */
export const DECISION_LABELS = {
  approve: "Approve draft",
  approveWithEdits: "Approve draft with edits",
  reject: "Reject draft",
} as const;

/** The one line that says approval is not a signature (CD-406, M rule 4). */
export const APPROVED_NOT_SIGNED = "Approved. Not yet part of a signed note.";
