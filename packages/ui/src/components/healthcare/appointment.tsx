"use client";

import type { ReactNode } from "react";
import {
  appointmentStatusLabels,
  appointmentTypeLabels,
  formatDateTime,
  formatDayShort,
  formatTimeRange,
  formatVisitTime,
  isCancelledAppointment,
  zoneNameGeneric,
  type Audience,
} from "@carepath/shared";
import type { Appointment } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Link } from "../primitives/link";
import { Tag } from "../primitives/status";
import { NOT_RECORDED } from "./identity-text";

/*
 * One visit, read the same way everywhere (CD-317): time range with the clinic zone named (CD-314,
 * the viewer's own time added for a video visit), visit type, the other person, one status form and
 * the shared words (CD-233). The reason is for the care team only and never in patient lists.
 */

/** "Thu, Nov 19" or "Today, Thu, Nov 19". */
export function appointmentDayText(
  a: Pick<Appointment, "startsAt" | "timezone" | "date">,
  today?: string,
) {
  const day = formatDayShort(a.startsAt, a.timezone);
  return today && a.date === today ? `Today, ${day}` : day;
}

/** "9:00 to 9:45 AM MT" for staff, "9:00 to 9:45 AM Mountain Time" for patients. */
export function appointmentTimeText(
  a: Pick<Appointment, "startsAt" | "endsAt" | "timezone">,
  audience: Audience,
): string {
  const zone = zoneNameGeneric(a.timezone, a.startsAt, audience === "patient" ? "long" : "short");
  return `${formatTimeRange(a.startsAt, a.endsAt, a.timezone)} ${zone}`;
}

/** Action names carry the date (CD-317): "Cancel visit on Fri, Nov 20". */
export function appointmentActionLabel(
  verb: string,
  a: Pick<Appointment, "startsAt" | "timezone">,
) {
  return `${verb} visit on ${formatDayShort(a.startsAt, a.timezone)}`;
}

export interface AppointmentRecordProps {
  appointment: Appointment;
  audience: Audience;
  /** `row` for lists and tables, `summary` for a detail view. */
  layout?: "row" | "summary";
  /** Clinic-zone day, for the "Today" word. */
  today?: string;
  /** The viewer's browser zone, used only for a video visit (CD-314). */
  viewerZone?: string | null;
  /** Staff: where the patient name links (the record). */
  patientHref?: string;
  /** Staff: shows a muted Born line under the patient name when given (CD-204). */
  patientBornText?: string;
  /** A rescheduled visit links to its replacement ("Moved to Fri, Nov 27, 9:00 AM"). */
  replacement?: { href: string; startsAt: string } | null;
  /** Real controls only (Reschedule, Cancel, Open record); their names carry the date. */
  actions?: ReactNode;
  className?: string;
}

export function AppointmentRecord({
  appointment: a,
  audience,
  layout = "row",
  today,
  viewerZone,
  patientHref,
  patientBornText,
  replacement,
  actions,
  className,
}: AppointmentRecordProps) {
  const status = appointmentStatusLabels[a.status];
  const statusText = status[audience];
  const cancelled = isCancelledAppointment(a.status);
  const staff = audience === "staff";
  const video = a.type === "video_follow_up";
  const viewer = formatVisitTime(a.startsAt, {
    clinicZone: a.timezone,
    viewerZone,
    isVideo: video,
    audience: audience === "patient" ? "patient" : "staff",
  }).viewer;
  const therapist = a.practitioner.name.trim()
    ? `With ${a.practitioner.name.trim()}`
    : `Therapist ${NOT_RECORDED.toLowerCase()}`;
  const statusNode = status.tone ? (
    <Tag tone={status.tone}>{statusText}</Tag>
  ) : (
    <span className="text-small text-ink-muted">{statusText}</span>
  );
  const who = staff ? (
    <span className="flex min-w-0 flex-col">
      {patientHref ? (
        <Link href={patientHref} className="font-medium break-words">
          {a.patient.name}
        </Link>
      ) : (
        <span className="font-medium break-words text-ink">{a.patient.name}</span>
      )}
      {patientBornText ? (
        <span className="text-small text-ink-muted">{patientBornText}</span>
      ) : null}
      <span className="text-small text-ink-muted">{therapist}</span>
    </span>
  ) : (
    <span className="text-small text-ink">{therapist}</span>
  );
  const moved =
    replacement && a.rescheduledToId ? (
      <p className="text-small text-ink">
        <Link href={replacement.href}>
          Moved to {formatDayShort(replacement.startsAt, a.timezone)},{" "}
          {
            formatVisitTime(replacement.startsAt, {
              clinicZone: a.timezone,
              audience: audience === "patient" ? "patient" : "staff",
            }).clinic
          }
        </Link>
      </p>
    ) : null;
  const cancelLine =
    staff && cancelled && (a.cancellationReason || a.cancelledAt) ? (
      <p className="text-small text-ink-muted">
        {a.cancelledAt ? `Cancelled ${formatDateTime(a.cancelledAt, a.timezone)}` : "Cancelled"}
        {a.cancelledBy ? ` by ${a.cancelledBy.name}` : ""}
        {a.cancellationReason ? `. Reason: ${a.cancellationReason}` : ""}
      </p>
    ) : null;
  const reason =
    staff && a.reason ? (
      <p className="max-w-measure text-small break-words text-ink">
        <span className="text-ink-muted">Reason for visit: </span>
        {a.reason}
      </p>
    ) : null;

  if (layout === "summary") {
    return (
      <div data-appointment={a.status} className={cx("flex flex-col gap-3", className)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={cx("text-h4 font-h4", cancelled ? "text-ink-muted" : "text-ink")}>
            {appointmentDayText(a, today)}
          </p>
          {statusNode}
        </div>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-caption text-ink-muted">Time</dt>
            <dd className="text-body text-ink">
              {appointmentTimeText(a, audience)}
              {viewer ? (
                <span className="block text-small text-ink-muted">{viewer} for you</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">Visit</dt>
            <dd className="text-body text-ink">{appointmentTypeLabels[a.type]}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">
              {staff ? "Patient and therapist" : "Therapist"}
            </dt>
            <dd className="text-body text-ink">{who}</dd>
          </div>
        </dl>
        {reason}
        {cancelLine}
        {moved}
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    );
  }

  return (
    <div
      data-appointment={a.status}
      className={cx("flex flex-col gap-2 py-2 sm:flex-row sm:items-start sm:gap-4", className)}
    >
      <div className="flex min-w-44 flex-col">
        <span className={cx("text-label font-medium", cancelled ? "text-ink-muted" : "text-ink")}>
          {appointmentDayText(a, today)}
        </span>
        <span className={cx("text-small tabular-nums", cancelled ? "text-ink-muted" : "text-ink")}>
          {appointmentTimeText(a, audience)}
        </span>
        {viewer ? <span className="text-small text-ink-muted">{viewer} for you</span> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-label font-medium text-ink">{appointmentTypeLabels[a.type]}</span>
          {statusNode}
        </div>
        {who}
        {reason}
        {cancelLine}
        {moved}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
