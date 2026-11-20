"use client";

import {
  appointmentStatusLabel,
  appointmentTypeLabels,
  isCancelledAppointment,
} from "@carepath/shared";
import {
  appointmentStatuses,
  type Appointment,
  type AppointmentStatus,
  type AppointmentType,
} from "@carepath/shared/contracts";
import { Icon, Tag } from "@carepath/ui";

/** Words for every appointment type and status (shared maps, CD-233). The API enum never reaches the screen. */
export const appointmentTypeText: Record<AppointmentType, string> = appointmentTypeLabels;

export const appointmentStatusText = Object.fromEntries(
  appointmentStatuses.map((s) => [s, appointmentStatusLabel(s, "staff")]),
) as Record<AppointmentStatus, string>;

export const isCancelled = isCancelledAppointment;

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
