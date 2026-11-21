import type { StatusLabel } from "./types.js";

/**
 * One name for generated output on staff screens, and one for the feature in patient consent
 * (CD-236, amended by checkpoint C3 section 3.1: the demonstrated output is rule-based, so the
 * name on screen does not say AI; `AI_CONSENT_NAME` names the feature a clinic could configure).
 */
export const AI_GENERATED_NAME = "Generated draft";
export const AI_CONSENT_NAME = "AI-assisted drafting";

/** Database `AIGenerationStatus` and `AIReviewDecision`. */
export type AIGenerationStatusValue = "pending" | "succeeded" | "failed";
/** `revised` (WP 5.2) is a clinician edit, not a decision: the draft is still not reviewed. */
export type AIReviewDecisionValue = "approved" | "approved_with_edits" | "rejected" | "revised";

/** The six states an AI draft shows (CD-236), derived from the two enums. */
export type AIDraftState =
  "pending" | "unreviewed" | "approved" | "approved_with_edits" | "rejected" | "failed";

export interface AIDraftStateLabel extends StatusLabel {
  /** Visible sentence beside the label, when the state has one. */
  explanation: string | null;
}

/**
 * No confidence figure and no sparkle. Provenance is said in words: the state label, the
 * provider label as received, and `DEMO_PROVIDER_NOTICE` when `provider.isDemo` (C3 3.1).
 */
export const aiDraftStateLabels: Record<AIDraftState, AIDraftStateLabel> = {
  pending: {
    label: "Generating draft",
    tone: "info",
    form: "text",
    explanation: "This can take a minute. You can keep working.",
  },
  unreviewed: {
    label: "Draft, generated, not reviewed",
    tone: "neutral",
    form: "text",
    explanation: null,
  },
  approved: {
    label: "Generated, reviewed and approved",
    tone: "success",
    form: "text",
    explanation: null,
  },
  approved_with_edits: {
    label: "Generated, edited and approved",
    tone: "success",
    form: "text",
    explanation: null,
  },
  rejected: {
    label: "Draft rejected, not used",
    tone: "neutral",
    form: "text",
    explanation: null,
  },
  failed: {
    label: "Could not generate a draft",
    tone: "error",
    form: "text",
    explanation: "Nothing in the record was changed.",
  },
};

export const aiGenerationStatusStates: Record<AIGenerationStatusValue, AIDraftState> = {
  pending: "pending",
  succeeded: "unreviewed",
  failed: "failed",
};

export const aiReviewDecisionStates: Record<AIReviewDecisionValue, AIDraftState> = {
  approved: "approved",
  approved_with_edits: "approved_with_edits",
  rejected: "rejected",
  revised: "unreviewed",
};

export function aiDraftState(
  generation: AIGenerationStatusValue,
  decision: AIReviewDecisionValue | null,
): AIDraftState {
  if (generation === "succeeded" && decision) return aiReviewDecisionStates[decision];
  return aiGenerationStatusStates[generation];
}

/** Count line when `unsupportedStatementCount` is above zero. */
export function unsupportedStatementsText(count: number): string {
  return count === 1 ? "1 statement has no source" : `${count} statements have no source`;
}
