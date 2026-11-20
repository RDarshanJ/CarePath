import type { StatusLabel } from "./types.js";

/** One name for the feature on staff screens, and one in patient consent (CD-236). */
export const AI_GENERATED_NAME = "AI-generated";
export const AI_CONSENT_NAME = "AI-assisted drafting";

/** Database `AIGenerationStatus` and `AIReviewDecision`. */
export type AIGenerationStatusValue = "pending" | "succeeded" | "failed";
export type AIReviewDecisionValue = "approved" | "approved_with_edits" | "rejected";

/** The six states an AI draft shows (CD-236), derived from the two enums. */
export type AIDraftState =
  "pending" | "unreviewed" | "approved" | "approved_with_edits" | "rejected" | "failed";

export interface AIDraftStateLabel extends StatusLabel {
  /** Visible sentence beside the label, when the state has one. */
  explanation: string | null;
}

/** No confidence figure and no sparkle: provenance says AI in words. */
export const aiDraftStateLabels: Record<AIDraftState, AIDraftStateLabel> = {
  pending: {
    label: "Generating draft",
    tone: "info",
    form: "text",
    explanation: "This can take a minute. You can keep working.",
  },
  unreviewed: {
    label: "Draft, AI-generated, not reviewed",
    tone: "neutral",
    form: "text",
    explanation: null,
  },
  approved: {
    label: "AI-generated, reviewed and approved",
    tone: "success",
    form: "text",
    explanation: null,
  },
  approved_with_edits: {
    label: "AI-generated, edited and approved",
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
