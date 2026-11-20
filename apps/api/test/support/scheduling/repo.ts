/**
 * Scheduling fixtures for the WP 4.1 tests, written straight to Postgres (a repo.ts file, so it
 * may use the Prisma client).
 */
import { randomUUID } from "node:crypto";
import type { Db } from "../../../src/core/db/repo.js";
import type { OrgFixture } from "../repo.js";

const H = 3_600_000;

export type SlotType = "initial_evaluation" | "follow_up" | "video_follow_up";

/** One open slot per start time, each `minutes` long. */
export async function createSlots(
  db: Db,
  orgId: string,
  practitionerId: string,
  starts: Date[],
  options: { minutes?: number; types?: SlotType[]; status?: "open" | "blocked" } = {},
): Promise<string[]> {
  const ids: string[] = [];
  for (const startsAt of starts) {
    const row = await db.availabilitySlot.create({
      data: {
        organizationId: orgId,
        practitionerId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + (options.minutes ?? 60) * 60_000),
        status: options.status ?? "open",
        appointmentTypes: options.types ?? ["initial_evaluation", "follow_up", "video_follow_up"],
      },
      select: { id: true },
    });
    ids.push(row.id);
  }
  return ids;
}

let hourCursor = 0;
/**
 * A distinct whole hour well in the future, so slots made by different tests never overlap for
 * one practitioner (the slot exclusion constraint).
 */
export function freshHour(base: Date, daysAhead = 2): Date {
  hourCursor += 1;
  return new Date(
    Math.floor(base.getTime() / H) * H +
      daysAhead * 24 * H +
      hourCursor * H +
      Math.floor(Math.random() * 2000) * 24 * H,
  );
}

/** N patients without logins in the organization; a coordinator books for them. */
export async function extraPatients(db: Db, org: OrgFixture, n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = await db.patient.create({
      data: {
        organizationId: org.orgId,
        mrn: `MRN-c-${randomUUID().slice(0, 8)}`,
        givenName: "Parallel",
        familyName: `Synthetic ${i + 1}`,
        birthDate: new Date("1980-01-01"),
      },
      select: { id: true },
    });
    ids.push(p.id);
  }
  return ids;
}

export async function slotRow(db: Db, id: string) {
  return db.availabilitySlot.findUniqueOrThrow({ where: { id } });
}

export async function appointmentRow(db: Db, id: string) {
  return db.appointment.findUniqueOrThrow({ where: { id } });
}

export async function appointmentsForSlot(db: Db, slotId: string) {
  return db.appointment.findMany({ where: { slotId }, orderBy: { createdAt: "asc" } });
}

export async function notificationsFor(db: Db, userId: string, type: "appointment_reminder") {
  return db.notification.findMany({ where: { userId, type }, orderBy: { createdAt: "asc" } });
}

export async function setReminderSent(db: Db, appointmentId: string, at: Date | null) {
  await db.appointment.update({ where: { id: appointmentId }, data: { reminderSentAt: at } });
}

export async function setOrgTimezone(db: Db, orgId: string, timezone: string) {
  await db.organization.update({ where: { id: orgId }, data: { timezone } });
}
