"use client";

import type { Appointment, AppointmentStatus, AppointmentType } from "@carepath/shared/contracts";
import { Icon, Tag } from "@carepath/ui";

/** Words for every appointment type and status. The API enum never reaches the screen. */
export const appointmentTypeText: Record<AppointmentType, string> = {
  initial_evaluation: "Initial evaluation",
  follow_up: "Follow-up visit",
  video_follow_up: "Video follow-up",
};

export const appointmentStatusText: Record<AppointmentStatus, string> = {
  requested: "Requested",
  booked: "Booked",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled_by_patient: "Cancelled by the patient",
  cancelled_by_clinic: "Cancelled by the clinic",
  no_show: "Did not attend",
};

export const isCancelled = (s: AppointmentStatus) =>
  s === "cancelled_by_patient" || s === "cancelled_by_clinic";

/** The visit type, with an icon for video so the difference is not colour or position alone. */
export function VisitType({ type }: { type: AppointmentType }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {type === "video_follow_up" ? (
        <Icon name="link" size={14} className="text-ink-muted" />
      ) : null}
      {appointmentTypeText[type]}
    </span>
  );
}

/**
 * Status is administrative, so it is an outlined tag, and a plain "Booked" visit shows none: a tag
 * that is the same on every row says nothing.
 */
export function AppointmentStatusTag({ appointment }: { appointment: Appointment }) {
  const s = appointment.status;
  if (s === "booked") return null;
  const tone =
    isCancelled(s) || s === "no_show" ? "warning" : s === "completed" ? "success" : "info";
  return <Tag tone={tone}>{appointmentStatusText[s]}</Tag>;
}
