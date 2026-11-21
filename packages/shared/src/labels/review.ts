import type { ReviewTaskEventKind, ReviewTaskStatus } from "../contracts/review.js";
import type { StatusLabel } from "./types.js";

/**
 * CD-234. Task status is administrative workflow, so it is a Tag everywhere and "Open" is plain
 * text. The check-in review below is a different concept and stays a chip.
 */
export const reviewTaskStatusLabels: Record<ReviewTaskStatus, StatusLabel> = {
  open: { label: "Open", tone: "neutral", form: "text" },
  in_review: { label: "In review", tone: "info", form: "tag" },
  resolved: { label: "Resolved", tone: "success", form: "tag" },
  dismissed: { label: "Dismissed", tone: "neutral", form: "tag" },
};

export function reviewTaskStatusLabel(status: ReviewTaskStatus): string {
  return reviewTaskStatusLabels[status].label;
}

/** Clinical review of a patient check-in (`reviewedAt`). */
export const checkInReviewLabels = {
  reviewed: { label: "Reviewed", tone: "success", form: "chip" },
  notReviewed: { label: "Not yet reviewed", tone: "warning", form: "chip" },
} as const satisfies Record<string, StatusLabel>;

export function checkInReviewLabel(reviewedAt: string | null): string {
  return reviewedAt ? checkInReviewLabels.reviewed.label : checkInReviewLabels.notReviewed.label;
}

/** CR-11. One line per history entry in the task detail; the actor and time are shown beside it. */
export const reviewTaskEventLabels: Record<ReviewTaskEventKind, string> = {
  assigned: "Assigned",
  unassigned: "Unassigned",
  reviewed: "Check-in reviewed",
  resolved: "Resolved",
  dismissed: "Dismissed",
};
