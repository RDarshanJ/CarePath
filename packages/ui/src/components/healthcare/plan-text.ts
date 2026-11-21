import { doseFieldLabels, plural } from "@carepath/shared";
import type { CarePlanDiff } from "@carepath/shared/contracts";

/*
 * Plan wording (CD-302, CD-304, CD-305). Field keys from the API diff never reach the screen: each
 * has words for both audiences, and an unknown key reads as a generic phrase, not the raw key.
 */

export type PlanAudience = "staff" | "patient";

/** Every key `diffFromPrevious.changed[].fields` can hold (apps/api care-plans serializer). */
export const PLAN_DIFF_FIELD_KEYS = [
  "sets",
  "reps",
  "holdSeconds",
  "durationSeconds",
  "restSeconds",
  "daysOfWeek",
  "timesPerDay",
  "instructions",
] as const;
export type PlanDiffFieldKey = (typeof PLAN_DIFF_FIELD_KEYS)[number];

export const planDiffFieldWords: Record<PlanAudience, Record<PlanDiffFieldKey, string>> = {
  patient: {
    ...doseFieldLabels,
    daysOfWeek: "days",
    timesPerDay: "times per day",
    instructions: "your therapist's note",
  },
  staff: {
    ...doseFieldLabels,
    daysOfWeek: "days",
    timesPerDay: "times per day",
    instructions: "note to the patient",
  },
};

const OTHER_FIELD = "other prescription details";

export function diffFieldText(field: string, audience: PlanAudience): string {
  return (planDiffFieldWords[audience] as Record<string, string>)[field] ?? OTHER_FIELD;
}

/** Staff only: the API compares exercises, so an empty list is not "nothing changed" (CD-304). */
export const PLAN_DIFF_SCOPE =
  "Only exercises are compared. Changes to the plan title, instructions or goals are not listed here.";

export interface DiffCounts {
  added: number;
  removed: number;
  changed: number;
}

export function diffCounts(diff: CarePlanDiff | null | undefined): DiffCounts {
  return {
    added: diff?.added.length ?? 0,
    removed: diff?.removed.length ?? 0,
    changed: diff?.changed.length ?? 0,
  };
}

/** "1 added, 2 changed"; "no exercise changes" when all are zero. */
export function diffCountsText(c: DiffCounts): string {
  const parts = [
    c.added ? `${c.added} added` : null,
    c.removed ? `${c.removed} removed` : null,
    c.changed ? `${c.changed} changed` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "no exercise changes";
}

/** Move control names and the live message (CD-302). Positions are 1-based in words. */
export function moveButtonLabel(name: string, dir: "up" | "down", position: number, total: number) {
  return `Move ${name} ${dir}, now position ${position} of ${total}`;
}
export function moveAnnouncement(name: string, position: number, total: number): string {
  return `${name} moved to position ${position} of ${total}`;
}
export function positionText(position: number, total: number): string {
  return `Position ${position} of ${total}`;
}

/**
 * The plan state words (CD-305, DR-002 K): Draft; Published, version N; Draft differs from version N;
 * Earlier version. Patients see "Current plan, version N" and "Earlier version" only.
 */
export type PlanStateKind = "none" | "draft" | "published" | "draft_differs" | "earlier";

export function planStateKind(input: {
  currentVersion: number | null;
  hasDraft: boolean;
  viewingVersion?: number | null;
}): PlanStateKind {
  if (input.viewingVersion != null && input.viewingVersion !== input.currentVersion)
    return "earlier";
  if (input.currentVersion == null) return input.hasDraft ? "draft" : "none";
  return input.hasDraft ? "draft_differs" : "published";
}

export function planStateTag(
  kind: PlanStateKind,
  audience: PlanAudience,
  version: number | null,
): string | null {
  if (audience === "patient") {
    if (kind === "earlier") return "Earlier version";
    return version != null ? `Current plan, version ${version}` : null;
  }
  switch (kind) {
    case "none":
      return null;
    case "draft":
      return "Draft";
    case "published":
      return `Published, version ${version}`;
    case "draft_differs":
      return `Draft differs from version ${version}`;
    case "earlier":
      return "Earlier version";
  }
}

/** Plural helper re-exported for the plan components. */
export const exercisesText = (n: number) => plural(n, "exercise");
