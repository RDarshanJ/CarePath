import type { PlanStage } from "../contracts/patients.js";
import type { StatusLabel } from "./types.js";

/** Stage words for the directory filter and plain-text cells (CD-232). */
export const planStageLabels: Record<PlanStage, string> = {
  none: "No plan",
  draft: "Draft only",
  published: "Published",
};

/** "Version 3 published", "Version 3, draft changes", "Draft only", "No plan". */
export function planStageText(stage: PlanStage, version: number | null): string {
  if (stage === "none") return planStageLabels.none;
  if (stage === "draft")
    return version ? `Version ${version}, draft changes` : planStageLabels.draft;
  return version ? `Version ${version} published` : planStageLabels.published;
}

/** Database `CarePlanStatus`. Only draft and active reach a screen today; the rest are proposals. */
export type CarePlanStatusValue =
  "draft" | "active" | "on_hold" | "revoked" | "completed" | "entered_in_error";

export const carePlanStatusLabels: Record<CarePlanStatusValue, StatusLabel> = {
  draft: { label: "Draft", tone: "neutral", form: "tag" },
  active: { label: "Published", tone: "success", form: "tag" },
  on_hold: { label: "On hold", tone: "neutral", form: "tag" },
  revoked: { label: "Revoked", tone: "neutral", form: "tag" },
  completed: { label: "Completed", tone: "neutral", form: "tag" },
  entered_in_error: { label: "Entered in error", tone: "warning", form: "tag" },
};

/** The version slot always renders a Tag, with one word for the version the patient sees. */
export type VersionMarker = "current" | "earlier" | "preview";

export const versionMarkerLabels: Record<VersionMarker, StatusLabel> = {
  current: { label: "Current", tone: "success", form: "tag" },
  earlier: { label: "Earlier version", tone: "neutral", form: "tag" },
  preview: { label: "Preview, not published", tone: "info", form: "tag" },
};

/** Plain-text contexts: "Version 3, current" (never "(current)"). */
export function versionText(number: number, isCurrent: boolean): string {
  return isCurrent ? `Version ${number}, current` : `Version ${number}`;
}
