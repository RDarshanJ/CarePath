import type { Prisma } from "@carepath/db/client";
import { initialStatus } from "@carepath/db";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  NextAppointment,
  OpenSlot,
  PersonRef,
} from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient, DbTx } from "../../core/db/repo.js";
import { practitionerRef, userRef } from "../../core/people.js";
import { localDate } from "../../core/time.js";

/**
 * Slots and appointments (WP 4.1, checkpoint C2 section 2). Every query filters on the
 * organization; appointment reads under a patient also filter on that patient. Booking-path
 * functions take the transaction client and lock rows with SELECT ... FOR UPDATE in a fixed
 * order: slots (by id) before the appointment.
 */
type Scope = Pick<RequestCtx, "orgId">;

/** Statuses that hold a slot and a time (the exclusion constraints' WHERE clause). */
export const cancelledStatuses = ["cancelled_by_patient", "cancelled_by_clinic"] as const;
/** Statuses a booking can be cancelled or rescheduled from. */
export const cancellableStatuses: readonly AppointmentStatus[] = ["requested", "booked"];
/** Statuses Today and the reminder job treat as a coming visit. */
const liveStatuses: AppointmentStatus[] = ["booked", "checked_in"];

// ---------------------------------------------------------------------------
// Practitioners and slots
// ---------------------------------------------------------------------------

const practitionerSelect = {
  id: true,
  userId: true,
  givenName: true,
  familyName: true,
  credentials: true,
} as const;

export async function findPractitionerRef(
  db: DbClient,
  ctx: Scope,
  practitionerId: string,
): Promise<PersonRef | null> {
  const row = await db.practitioner.findFirst({
    where: { id: practitionerId, organizationId: ctx.orgId },
    select: practitionerSelect,
  });
  return row ? practitionerRef(row) : null;
}

/** Open slots of one practitioner starting in [from, to) and after `after`, by start time. */
export async function listOpenSlots(
  db: DbClient,
  ctx: Scope,
  practitionerId: string,
  window: { from: Date; to: Date; after: Date; type?: AppointmentType },
): Promise<OpenSlot[]> {
  const rows = await db.availabilitySlot.findMany({
    where: {
      organizationId: ctx.orgId,
      practitionerId,
      status: "open",
      startsAt: { gte: window.from, lt: window.to, gt: window.after },
      ...(window.type ? { appointmentTypes: { has: window.type } } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: { id: true, startsAt: true, endsAt: true, appointmentTypes: true },
  });
  return rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    appointmentTypes: r.appointmentTypes,
  }));
}

export interface LockedSlot {
  id: string;
  practitionerId: string;
  practitionerUserId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: "open" | "booked" | "blocked";
  appointmentTypes: AppointmentType[];
}

/**
 * Locks slots of the organization with SELECT ... FOR UPDATE, in id order so two transactions
 * that lock the same pair never deadlock. Concurrent bookings of one slot queue here; each sees
 * the status the previous one committed (C2 section 2). Unknown ids are simply absent.
 */
export async function lockSlots(
  tx: DbTx,
  ctx: Scope,
  slotIds: string[],
): Promise<Map<string, LockedSlot>> {
  const ids = [...new Set(slotIds)].sort();
  const out = new Map<string, LockedSlot>();
  for (const id of ids) {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        practitionerId: string;
        startsAt: Date;
        endsAt: Date;
        status: string;
        appointmentTypes: string[];
      }>
    >`SELECT id::text AS id, "practitionerId"::text AS "practitionerId", "startsAt", "endsAt",
             status::text AS status, "appointmentTypes"::text[] AS "appointmentTypes"
        FROM "AvailabilitySlot"
       WHERE id = ${id}::uuid AND "organizationId" = ${ctx.orgId}::uuid
       FOR UPDATE`;
    const r = rows[0];
    if (!r) continue;
    const pr = await tx.practitioner.findFirst({
      where: { id: r.practitionerId, organizationId: ctx.orgId },
      select: { userId: true },
    });
    out.set(id, {
      id: r.id,
      practitionerId: r.practitionerId,
      practitionerUserId: pr?.userId ?? null,
      startsAt: new Date(r.startsAt),
      endsAt: new Date(r.endsAt),
      status: r.status as LockedSlot["status"],
      appointmentTypes: r.appointmentTypes as AppointmentType[],
    });
  }
  return out;
}

/** Slot status change; the database checks it against StatusTransition. */
export async function setSlotStatus(
  tx: DbTx,
  ctx: Scope,
  slotId: string,
  status: "open" | "booked",
): Promise<void> {
  const res = await tx.availabilitySlot.updateMany({
    where: { id: slotId, organizationId: ctx.orgId },
    data: { status },
  });
  if (res.count !== 1) throw new Error("slot vanished inside its transaction");
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

export async function insertAppointment(
  tx: DbTx,
  ctx: Scope,
  input: {
    patientId: string;
    slot: LockedSlot;
    type: AppointmentType;
    reason: string | null;
    timezone: string;
    bookedByUserId: string;
    rescheduledFromId: string | null;
  },
): Promise<string> {
  const row = await tx.appointment.create({
    data: {
      organizationId: ctx.orgId,
      patientId: input.patientId,
      practitionerId: input.slot.practitionerId,
      slotId: input.slot.id,
      type: input.type,
      status: initialStatus.Appointment,
      startsAt: input.slot.startsAt,
      endsAt: input.slot.endsAt,
      bookedTimezone: input.timezone,
      reason: input.reason,
      bookedByUserId: input.bookedByUserId,
      rescheduledFromId: input.rescheduledFromId,
    },
    select: { id: true },
  });
  return row.id;
}

export interface LockedAppointment {
  id: string;
  slotId: string | null;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string | null;
  startsAt: Date;
}

/** The appointment's slot id, read without a lock (it never changes after insert). */
export async function appointmentSlotId(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  appointmentId: string,
): Promise<string | null> {
  const row = await db.appointment.findFirst({
    where: { id: appointmentId, organizationId: ctx.orgId, patientId },
    select: { slotId: true },
  });
  return row?.slotId ?? null;
}

export async function lockAppointment(
  tx: DbTx,
  ctx: Scope,
  patientId: string,
  appointmentId: string,
): Promise<LockedAppointment | null> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      slotId: string | null;
      status: string;
      type: string;
      reason: string | null;
      startsAt: Date;
    }>
  >`SELECT id::text AS id, "slotId"::text AS "slotId", status::text AS status, type::text AS type,
           reason, "startsAt"
      FROM "Appointment"
     WHERE id = ${appointmentId}::uuid AND "organizationId" = ${ctx.orgId}::uuid
       AND "patientId" = ${patientId}::uuid
     FOR UPDATE`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slotId: r.slotId,
    status: r.status as AppointmentStatus,
    type: r.type as AppointmentType,
    reason: r.reason,
    startsAt: new Date(r.startsAt),
  };
}

export async function markCancelled(
  tx: DbTx,
  ctx: Scope,
  appointmentId: string,
  input: {
    status: (typeof cancelledStatuses)[number];
    at: Date;
    reason: string | null;
    byUserId: string;
  },
): Promise<void> {
  const res = await tx.appointment.updateMany({
    where: { id: appointmentId, organizationId: ctx.orgId },
    data: {
      status: input.status,
      cancelledAt: input.at,
      cancellationReason: input.reason,
      cancelledByUserId: input.byUserId,
    },
  });
  if (res.count !== 1) throw new Error("appointment vanished inside its transaction");
}

const memberUser = {
  select: {
    user: { select: { id: true, displayName: true, practitioner: { select: { id: true } } } },
  },
} as const;

const appointmentSelect = {
  id: true,
  slotId: true,
  type: true,
  status: true,
  startsAt: true,
  endsAt: true,
  reason: true,
  createdAt: true,
  cancelledAt: true,
  cancellationReason: true,
  rescheduledFromId: true,
  patient: { select: { id: true, givenName: true, familyName: true } },
  practitioner: { select: practitionerSelect },
  bookedBy: memberUser,
  cancelledBy: memberUser,
  rescheduledTo: { select: { id: true } },
} as const;

type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof appointmentSelect }>;

/** The one appointment serializer: the patient list and the clinician day read the same rows. */
export function toAppointment(row: AppointmentRow, timezone: string): Appointment {
  return {
    id: row.id,
    patient: { id: row.patient.id, name: `${row.patient.givenName} ${row.patient.familyName}` },
    practitioner: practitionerRef(row.practitioner),
    slotId: row.slotId,
    type: row.type,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    date: localDate(row.startsAt, timezone),
    timezone,
    reason: row.reason,
    bookedBy: userRef(row.bookedBy?.user ?? null),
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    cancellationReason: row.cancellationReason,
    cancelledBy: userRef(row.cancelledBy?.user ?? null),
    rescheduledFromId: row.rescheduledFromId,
    rescheduledToId: row.rescheduledTo?.id ?? null,
  };
}

export async function findAppointment(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  appointmentId: string,
  timezone: string,
): Promise<Appointment | null> {
  const row = await db.appointment.findFirst({
    where: { id: appointmentId, organizationId: ctx.orgId, patientId },
    select: appointmentSelect,
  });
  return row ? toAppointment(row, timezone) : null;
}

/** Upcoming: live and not ended, soonest first. Past: ended or cancelled, newest first. */
export async function listPatientAppointments(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  input: { when: "upcoming" | "past"; now: Date; offset: number; take: number; timezone: string },
): Promise<Appointment[]> {
  const notCancelled = { status: { notIn: [...cancelledStatuses] } };
  const where: Prisma.AppointmentWhereInput =
    input.when === "upcoming"
      ? { ...notCancelled, endsAt: { gt: input.now } }
      : {
          OR: [{ status: { in: [...cancelledStatuses] } }, { endsAt: { lte: input.now } }],
        };
  const dir = input.when === "upcoming" ? "asc" : "desc";
  const rows = await db.appointment.findMany({
    where: { organizationId: ctx.orgId, patientId, ...where },
    orderBy: [{ startsAt: dir }, { id: dir }],
    skip: input.offset,
    take: input.take,
    select: appointmentSelect,
  });
  return rows.map((r) => toAppointment(r, input.timezone));
}

/** One practitioner's appointments starting in [from, to), every status, by start time. */
export async function listDayAppointments(
  db: DbClient,
  ctx: Scope,
  practitionerId: string,
  window: { from: Date; to: Date; timezone: string },
): Promise<Appointment[]> {
  const rows = await db.appointment.findMany({
    where: {
      organizationId: ctx.orgId,
      practitionerId,
      startsAt: { gte: window.from, lt: window.to },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: appointmentSelect,
  });
  return rows.map((r) => toAppointment(r, window.timezone));
}

/** The next booked or checked-in visit that has not ended. */
export async function findNextAppointment(
  db: DbClient,
  ctx: Scope,
  patientId: string,
  now: Date,
  timezone: string,
): Promise<NextAppointment | null> {
  const row = await db.appointment.findFirst({
    where: {
      organizationId: ctx.orgId,
      patientId,
      status: { in: liveStatuses },
      endsAt: { gt: now },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      type: true,
      status: true,
      startsAt: true,
      endsAt: true,
      practitioner: { select: practitionerSelect },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    practitioner: practitionerRef(row.practitioner),
    type: row.type,
    status: row.status,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    date: localDate(row.startsAt, timezone),
  };
}

// ---------------------------------------------------------------------------
// Reminder job (system scope from job.organizationId)
// ---------------------------------------------------------------------------

export interface DueReminder {
  id: string;
  patientUserId: string;
  startsAt: Date;
  type: AppointmentType;
  practitioner: PersonRef;
}

/** Booked visits starting in (now, until] whose patient has a login and no reminder yet. */
export async function dueReminders(
  db: DbClient,
  scope: Scope,
  now: Date,
  until: Date,
): Promise<DueReminder[]> {
  const rows = await db.appointment.findMany({
    where: {
      organizationId: scope.orgId,
      status: "booked",
      reminderSentAt: null,
      startsAt: { gt: now, lte: until },
      patient: { userId: { not: null } },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      startsAt: true,
      type: true,
      patient: { select: { userId: true } },
      practitioner: { select: practitionerSelect },
    },
  });
  return rows.flatMap((r) =>
    r.patient.userId
      ? [
          {
            id: r.id,
            patientUserId: r.patient.userId,
            startsAt: r.startsAt,
            type: r.type,
            practitioner: practitionerRef(r.practitioner),
          },
        ]
      : [],
  );
}

/**
 * Claims one reminder: sets reminderSentAt only if it is still empty and the visit is still
 * booked. Returns false when another run got there first, so the notification is written once.
 */
export async function claimReminder(
  tx: DbTx,
  scope: Scope,
  appointmentId: string,
  at: Date,
): Promise<boolean> {
  const res = await tx.appointment.updateMany({
    where: {
      id: appointmentId,
      organizationId: scope.orgId,
      status: "booked",
      reminderSentAt: null,
    },
    data: { reminderSentAt: at },
  });
  return res.count === 1;
}

export async function insertReminderNotification(
  tx: DbTx,
  scope: Scope,
  input: { userId: string; appointmentId: string; title: string; body: string; at: Date },
): Promise<void> {
  await tx.notification.create({
    data: {
      organizationId: scope.orgId,
      userId: input.userId,
      type: "appointment_reminder",
      title: input.title,
      body: input.body,
      linkPath: "/appointments",
      sourceType: "Appointment",
      sourceId: input.appointmentId,
      createdAt: input.at,
    },
  });
}
