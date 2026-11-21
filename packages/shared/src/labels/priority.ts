import type { PriorityLevel } from "../contracts/review.js";
import type { StatusLabel } from "./types.js";

export type { PriorityLevel };

/**
 * CD-235 and CR-9 (`ReviewTask.priorityLevel`, delivered). Thresholds belong to the server rules;
 * the client never turns the stored integer into a band. Standard tasks show no mark.
 */
export const priorityLevelLabels: Record<PriorityLevel, StatusLabel | null> = {
  high: { label: "High priority", tone: "warning", form: "tag" },
  standard: null,
};

/** Shown until `priorityLevel` exists (accurate to `orderBy priority desc, createdAt asc`). */
export const PRIORITY_SORT_LINE = "Sorted by priority, then oldest first";

/** The fixed line above the review queue (DR-002 L). */
export const PRIORITY_ORDER_LINE =
  "Order: rule priority, then oldest. Set by clinic rules, not a measure of medical risk.";
