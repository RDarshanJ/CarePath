import type { AppointmentStatus, AppointmentType } from "../contracts/scheduling.js";
import type { Audience, StatusTone } from "./types.js";

/**
 * CD-233. `tone` is null where the status shows as plain text (completed) or not at all in an
 * upcoming list (booked): a tag that is the same on every row says nothing. The perspective pair
 * (by the patient / by you, Did not attend / You did not attend) is the only allowed difference
 * between audiences.
 */
export const appointmentStatusLabels: Record<
  AppointmentStatus,
  { staff: string; patient: string; tone: StatusTone | null }
> = {
  requested: { staff: "Requested", patient: "Requested", tone: "info" },
  booked: { staff: "Booked", patient: "Booked", tone: null },
  checked_in: { staff: "Checked in", patient: "Checked in", tone: "info" },
  in_progress: { staff: "In progress", patient: "In progress", tone: "info" },
  completed: { staff: "Completed", patient: "Completed", tone: null },
  cancelled_by_patient: {
    staff: "Cancelled by the patient",
    patient: "Cancelled by you",
    tone: "warning",
  },
  cancelled_by_clinic: {
    staff: "Cancelled by the clinic",
    patient: "Cancelled by the clinic",
    tone: "warning",
  },
  no_show: { staff: "Did not attend", patient: "You did not attend", tone: "warning" },
};

export function appointmentStatusLabel(status: AppointmentStatus, audience: Audience): string {
  return appointmentStatusLabels[status][audience];
}

/** Visit types read the same in every app. */
export const appointmentTypeLabels: Record<AppointmentType, string> = {
  initial_evaluation: "Initial evaluation",
  follow_up: "Follow-up visit",
  video_follow_up: "Video follow-up",
};

export const isCancelledAppointment = (s: AppointmentStatus): boolean =>
  s === "cancelled_by_patient" || s === "cancelled_by_clinic";
