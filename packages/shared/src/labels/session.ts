import type { ExerciseSessionStatus } from "../contracts/sessions.js";
import type { StatusLabel } from "./types.js";

/** CD-240, same words in both apps. Stopped for discomfort is a clinical signal, so it is a chip. */
export const sessionStatusLabels: Record<ExerciseSessionStatus, StatusLabel> = {
  in_progress: { label: "In progress", tone: "neutral", form: "text" },
  paused: { label: "Paused", tone: "neutral", form: "text" },
  completed: { label: "Completed", tone: "neutral", form: "text" },
  abandoned: { label: "Not finished", tone: "neutral", form: "text" },
  stopped_discomfort: { label: "Stopped for discomfort", tone: "warning", form: "chip" },
};

export function sessionStatusLabel(status: ExerciseSessionStatus): string {
  return sessionStatusLabels[status].label;
}

/** `SessionActivityStatus`: pending, completed, skipped. Patient list words stay as they were. */
export type SessionActivityStatusValue = "pending" | "completed" | "skipped";

export const sessionActivityStatusLabels: Record<
  SessionActivityStatusValue,
  { patient: string; staff: string }
> = {
  pending: { patient: "Up next", staff: "Not started" },
  completed: { patient: "Done", staff: "Completed" },
  skipped: { patient: "Skipped", staff: "Skipped" },
};

/** The activity being worked on now (patient session list). */
export const SESSION_ACTIVITY_CURRENT_LABEL = "Now";
