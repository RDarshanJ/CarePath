import type { Db } from "../../core/db/repo.js";
import { inTransaction } from "../../core/db/repo.js";
import { findClinic } from "../clinic/repo.js";
import { claimReminder, dueReminders, insertReminderNotification } from "./repo.js";

/** Job queue owned by the scheduling module (ADR-4 Postgres jobs). */
export const APPOINTMENT_REMINDERS_QUEUE = "scheduling.appointment_reminders";

/** How far ahead a reminder goes out (C2 section 5: one reminder, 24 hours before a visit). */
export const REMINDER_LEAD_MS = 24 * 3_600_000;

export interface SystemScope {
  orgId: string;
}

const visitNames = {
  initial_evaluation: "first visit",
  follow_up: "follow-up visit",
  video_follow_up: "video follow-up",
} as const;

/** "Friday, November 20 at 9:00 AM (America/Phoenix)": the clinic zone, named. */
export function visitTimeText(at: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
  return `${day} at ${time} (${timeZone})`;
}

/**
 * In-app reminders for booked visits starting within the next 24 hours (REQ-TOD-04). Runs with a
 * system scope built from job.organizationId and reads and writes that organization only. Each
 * reminder is claimed by setting Appointment.reminderSentAt in the same transaction as the
 * notification insert, so a rerun or a second worker never writes it twice. Returns how many
 * notifications were written.
 */
export async function sendAppointmentReminders(
  db: Db,
  scope: SystemScope,
  now: Date,
): Promise<number> {
  const clinic = await findClinic(db, scope);
  const due = await dueReminders(db, scope, now, new Date(now.getTime() + REMINDER_LEAD_MS));
  let sent = 0;
  for (const r of due) {
    const wrote = await inTransaction(db, async (tx) => {
      if (!(await claimReminder(tx, scope, r.id, now))) return false;
      await insertReminderNotification(tx, scope, {
        userId: r.patientUserId,
        appointmentId: r.id,
        title: "Visit coming up",
        body: `Your ${visitNames[r.type]} with ${r.practitioner.name} is on ${visitTimeText(
          r.startsAt,
          clinic.timezone,
        )}.`,
        at: now,
      });
      return true;
    });
    if (wrote) sent += 1;
  }
  return sent;
}
