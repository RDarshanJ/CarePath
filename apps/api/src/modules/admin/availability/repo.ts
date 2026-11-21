import type { Prisma } from "@carepath/db/client";
import type {
  AppointmentStatus,
  AppointmentType,
  AvailabilitySlot,
} from "@carepath/shared/contracts";
import type { RequestCtx } from "../../../core/context.js";
import type { DbClient, DbTx } from "../../../core/db/repo.js";
import { cancelledStatuses } from "../../scheduling/repo.js";

/**
 * Availability reads and writes for staff (WP 6.1, CR-14). Every query filters on the
 * organization. Booking-path locking lives in scheduling/repo.ts (lockSlots); the write routes
 * take that lock first so a booking and a removal of one time queue on the same row.
 */
type Scope = Pick<RequestCtx, "orgId">;

const slotSelect = {
  id: true,
  practitionerId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  appointmentTypes: true,
  appointments: {
    where: { status: { notIn: [...cancelledStatuses] as AppointmentStatus[] } },
    take: 1,
    select: {
      id: true,
      status: true,
      patient: { select: { id: true, givenName: true, familyName: true } },
    },
  },
} satisfies Prisma.AvailabilitySlotSelect;

type SlotRow = Prisma.AvailabilitySlotGetPayload<{ select: typeof slotSelect }>;

export function toAvailabilitySlot(row: SlotRow, now: Date): AvailabilitySlot {
  const a = row.appointments[0];
  return {
    id: row.id,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    minutes: Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000),
    status: row.status,
    appointmentTypes: row.appointmentTypes,
    past: row.startsAt <= now,
    appointment: a
      ? {
          id: a.id,
          status: a.status,
          patient: { id: a.patient.id, name: `${a.patient.givenName} ${a.patient.familyName}` },
        }
      : null,
  };
}

/** The slot's practitioner when the slot is in the caller's organization, else null. */
export async function findSlotOwner(
  db: DbClient,
  scope: Scope,
  slotId: string,
): Promise<{ practitionerId: string } | null> {
  return db.availabilitySlot.findFirst({
    where: { id: slotId, organizationId: scope.orgId },
    select: { practitionerId: true },
  });
}

export async function listSlots(
  db: DbClient,
  scope: Scope,
  practitionerId: string,
  window: { from: Date; to: Date },
  now: Date,
): Promise<AvailabilitySlot[]> {
  const rows = await db.availabilitySlot.findMany({
    where: {
      organizationId: scope.orgId,
      practitionerId,
      startsAt: { gte: window.from, lt: window.to },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: slotSelect,
  });
  return rows.map((r) => toAvailabilitySlot(r, now));
}

export async function findSlot(
  db: DbClient,
  scope: Scope,
  slotId: string,
  now: Date,
): Promise<AvailabilitySlot | null> {
  const row = await db.availabilitySlot.findFirst({
    where: { id: slotId, organizationId: scope.orgId },
    select: slotSelect,
  });
  return row ? toAvailabilitySlot(row, now) : null;
}

/** Inserts the slots in one statement; an overlap violates the exclusion constraint and inserts none. */
export async function insertSlots(
  tx: DbTx,
  scope: Scope,
  input: {
    practitionerId: string;
    times: { startsAt: Date; endsAt: Date }[];
    appointmentTypes: AppointmentType[];
    status: "open" | "blocked";
  },
): Promise<string[]> {
  const created = await tx.availabilitySlot.createManyAndReturn({
    data: input.times.map((t) => ({
      organizationId: scope.orgId,
      practitionerId: input.practitionerId,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      status: input.status,
      appointmentTypes: input.appointmentTypes,
    })),
    select: { id: true },
  });
  return created.map((c) => c.id);
}

/** Open to blocked or blocked to open; the database checks the transition. */
export async function setBlocked(
  tx: DbTx,
  scope: Scope,
  slotId: string,
  blocked: boolean,
): Promise<void> {
  const res = await tx.availabilitySlot.updateMany({
    where: { id: slotId, organizationId: scope.orgId },
    data: { status: blocked ? "blocked" : "open" },
  });
  if (res.count !== 1) throw new Error("slot vanished inside its transaction");
}

/** True when any appointment, cancelled ones included, references the slot. */
export async function slotHasHistory(tx: DbTx, scope: Scope, slotId: string): Promise<boolean> {
  const n = await tx.appointment.count({ where: { organizationId: scope.orgId, slotId } });
  return n > 0;
}

export async function deleteSlot(tx: DbTx, scope: Scope, slotId: string): Promise<void> {
  const res = await tx.availabilitySlot.deleteMany({
    where: { id: slotId, organizationId: scope.orgId },
  });
  if (res.count !== 1) throw new Error("slot vanished inside its transaction");
}
