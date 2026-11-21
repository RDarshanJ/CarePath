import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  appointmentBookSchema,
  appointmentCancelSchema,
  appointmentIdParamsSchema,
  appointmentRescheduleSchema,
  appointmentSchema,
  idempotencyHeadersSchema,
  patientIdParamsSchema,
  type Appointment,
  type AppointmentType,
} from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbTx, TxOptions } from "../../core/db/repo.js";
import { withIdempotencyKey } from "../../core/idempotency/index.js";
import { withTx, type TxScope } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { requireChild, requirePatientWrite } from "../../core/scope/patient-scope.js";
import { isOnCareTeam } from "../../core/scope/repo.js";
import { findClinic } from "../clinic/repo.js";
import {
  appointmentSlotId,
  cancellableStatuses,
  findAppointment,
  insertAppointment,
  lockAppointment,
  lockSlots,
  markCancelled,
  setSlotStatus,
  type LockedAppointment,
  type LockedSlot,
} from "./repo.js";

/**
 * Booking, cancellation and reschedule (WP 4.1, checkpoint C2 section 2).
 *
 * - Book: one transaction. SELECT ... FOR UPDATE on the slot, slot open -> booked, insert the
 *   appointment in initialStatus.Appointment, audit `appointment.book`. Concurrent requests for
 *   one slot queue on the row lock; every one after the first sees `booked` and answers 409
 *   `booking_conflict`. The exclusion constraints and the one-live-appointment-per-slot index
 *   stay the last line of defence and map to the same 409.
 * - Cancel: appointment -> cancelled_by_patient (patient) or cancelled_by_clinic (staff), slot
 *   back to open, audit `appointment.cancel`, all in one transaction.
 * - Reschedule: cancel plus book in one transaction with rescheduledFromId. If the new booking
 *   fails, the transaction rolls back and the original booking is unchanged (AC-E7).
 *
 * Patients book only with a therapist on their active care team; coordinators
 * (`appointment.manage`) book for anyone in the organization. Lock order: slots by id, then the
 * appointment.
 */

/** 50 parallel bookings of one slot queue on one row; give the queue room (gate, AC-E1). */
const BOOKING_TX: TxOptions = { maxWait: 15_000, timeout: 20_000 };

function slotError(path: string, issue: string, message: string): AppError {
  return new AppError("validation_error", [{ path, issue, message }]);
}

async function bookInto(
  scope: TxScope,
  ctx: RequestCtx,
  input: {
    patientId: string;
    slot: LockedSlot | undefined;
    type: AppointmentType;
    reason: string | null;
    timezone: string;
    at: Date;
    rescheduledFromId: string | null;
    typePath: string;
  },
): Promise<string> {
  const { tx } = scope;
  const { slot } = input;
  if (!slot) throw slotError("body.slotId", "unknown_slot", "Not a slot of this clinic.");
  if (ctx.role === "patient") {
    const allowed =
      slot.practitionerUserId !== null &&
      (await isOnCareTeam(
        tx,
        { orgId: ctx.orgId, userId: slot.practitionerUserId },
        input.patientId,
      ));
    if (!allowed) {
      throw slotError(
        "body.slotId",
        "not_care_team_practitioner",
        "Book with a therapist on your care team.",
      );
    }
  }
  if (slot.status === "booked") throw new AppError("booking_conflict");
  if (slot.status !== "open" || slot.startsAt <= input.at) throw new AppError("slot_unavailable");
  if (!slot.appointmentTypes.includes(input.type)) {
    throw slotError(
      input.typePath,
      "type_not_offered",
      "This time is not offered for that visit type.",
    );
  }
  await setSlotStatus(tx, ctx, slot.id, "booked");
  const id = await insertAppointment(tx, ctx, {
    patientId: input.patientId,
    slot,
    type: input.type,
    reason: input.reason,
    timezone: input.timezone,
    bookedByUserId: ctx.userId,
    rescheduledFromId: input.rescheduledFromId,
  });
  await scope.audit({
    eventName: "appointment.book",
    action: "C",
    outcome: "success",
    resourceType: "Appointment",
    resourceId: id,
    patientId: input.patientId,
    metadata: {
      slotId: slot.id,
      ...(input.rescheduledFromId ? { rescheduledFromId: input.rescheduledFromId } : {}),
    },
  });
  return id;
}

async function cancelLocked(
  scope: TxScope,
  ctx: RequestCtx,
  input: {
    patientId: string;
    appt: LockedAppointment | null;
    slot: LockedSlot | undefined;
    reason: string | null;
    at: Date;
    rescheduled: boolean;
  },
): Promise<void> {
  const { appt } = input;
  if (!appt) throw new AppError("not_found");
  // Only a coming booking can be cancelled; one that started, ended or was cancelled cannot.
  if (!cancellableStatuses.includes(appt.status) || appt.startsAt <= input.at) {
    throw new AppError("invalid_transition");
  }
  await markCancelled(scope.tx, ctx, appt.id, {
    status: ctx.role === "patient" ? "cancelled_by_patient" : "cancelled_by_clinic",
    at: input.at,
    reason: input.reason,
    byUserId: ctx.userId,
  });
  if (input.slot && input.slot.status === "booked") {
    await setSlotStatus(scope.tx, ctx, input.slot.id, "open");
  }
  await scope.audit({
    eventName: "appointment.cancel",
    action: "U",
    outcome: "success",
    resourceType: "Appointment",
    resourceId: appt.id,
    patientId: input.patientId,
    metadata: { rescheduled: input.rescheduled },
  });
}

async function reread(
  tx: DbTx,
  ctx: RequestCtx,
  patientId: string,
  id: string,
  timezone: string,
): Promise<Appointment> {
  const row = await findAppointment(tx, ctx, patientId, id, timezone);
  if (!row) throw new Error("appointment vanished inside its transaction");
  return row;
}

export const schedulingWriteRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;
  const access = { permission: ["appointment.manage_own", "appointment.manage"] as const };

  app.post(
    "/patients/:patientId/appointments",
    {
      config: { access },
      schema: {
        operationId: "bookAppointment",
        tags: ["scheduling"],
        summary:
          "Book an open slot. 409 booking_conflict when the slot was just taken or the patient is busy then.",
        params: patientIdParamsSchema,
        headers: idempotencyHeadersSchema,
        body: appointmentBookSchema,
        response: { 201: appointmentSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      const { slotId, type, reason } = request.body;
      const clinic = await findClinic(db, ctx);
      const key = request.headers["idempotency-key"];
      const result = await withTx(
        request,
        async (scope) => {
          const at = now();
          const book = async () => {
            const slots = await lockSlots(scope.tx, ctx, [slotId]);
            const id = await bookInto(scope, ctx, {
              patientId,
              slot: slots.get(slotId),
              type,
              reason: reason ?? null,
              timezone: clinic.timezone,
              at,
              rescheduledFromId: null,
              typePath: "body.type",
            });
            return reread(scope.tx, ctx, patientId, id, clinic.timezone);
          };
          if (!key) return { status: 201, body: await book(), replayed: false };
          return withIdempotencyKey(
            scope.tx,
            ctx,
            { key, scope: `book:${patientId}`, body: request.body, at, status: 201 },
            book,
          );
        },
        BOOKING_TX,
      );
      if (result.replayed) void reply.header("idempotency-replayed", "true");
      return reply.code(201).send(result.body);
    },
  );

  app.post(
    "/patients/:patientId/appointments/:appointmentId/cancel",
    {
      config: { access },
      schema: {
        operationId: "cancelAppointment",
        tags: ["scheduling"],
        summary: "Cancel a coming booking. The slot opens again in the same transaction.",
        params: appointmentIdParamsSchema,
        body: appointmentCancelSchema,
        response: { 200: appointmentSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId, appointmentId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      await requireChild(request, "Appointment", patientId, appointmentId);
      const clinic = await findClinic(db, ctx);
      const slotId = await appointmentSlotId(db, ctx, patientId, appointmentId);
      return withTx(
        request,
        async (scope) => {
          const at = now();
          const slots = await lockSlots(scope.tx, ctx, slotId ? [slotId] : []);
          const appt = await lockAppointment(scope.tx, ctx, patientId, appointmentId);
          await cancelLocked(scope, ctx, {
            patientId,
            appt,
            slot: slotId ? slots.get(slotId) : undefined,
            reason: request.body.reason ?? null,
            at,
            rescheduled: false,
          });
          return reread(scope.tx, ctx, patientId, appointmentId, clinic.timezone);
        },
        BOOKING_TX,
      );
    },
  );

  app.post(
    "/patients/:patientId/appointments/:appointmentId/reschedule",
    {
      config: { access },
      schema: {
        operationId: "rescheduleAppointment",
        tags: ["scheduling"],
        summary:
          "Move a coming booking to another open slot: cancel and book in one transaction. If the new slot is taken, the original stays.",
        params: appointmentIdParamsSchema,
        headers: idempotencyHeadersSchema,
        body: appointmentRescheduleSchema,
        response: { 201: appointmentSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId, appointmentId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      await requireChild(request, "Appointment", patientId, appointmentId);
      const { slotId } = request.body;
      const clinic = await findClinic(db, ctx);
      const oldSlotId = await appointmentSlotId(db, ctx, patientId, appointmentId);
      if (oldSlotId === slotId) {
        throw slotError("body.slotId", "same_slot", "Choose a different time.");
      }
      const key = request.headers["idempotency-key"];
      const result = await withTx(
        request,
        async (scope) => {
          const at = now();
          const move = async () => {
            const slots = await lockSlots(
              scope.tx,
              ctx,
              oldSlotId ? [oldSlotId, slotId] : [slotId],
            );
            const appt = await lockAppointment(scope.tx, ctx, patientId, appointmentId);
            await cancelLocked(scope, ctx, {
              patientId,
              appt,
              slot: oldSlotId ? slots.get(oldSlotId) : undefined,
              reason: "Rescheduled",
              at,
              rescheduled: true,
            });
            const id = await bookInto(scope, ctx, {
              patientId,
              slot: slots.get(slotId),
              type: (appt as LockedAppointment).type,
              reason: (appt as LockedAppointment).reason,
              timezone: clinic.timezone,
              at,
              rescheduledFromId: appointmentId,
              typePath: "body.slotId",
            });
            return reread(scope.tx, ctx, patientId, id, clinic.timezone);
          };
          if (!key) return { status: 201, body: await move(), replayed: false };
          return withIdempotencyKey(
            scope.tx,
            ctx,
            {
              key,
              scope: `reschedule:${patientId}:${appointmentId}`,
              body: request.body,
              at,
              status: 201,
            },
            move,
          );
        },
        BOOKING_TX,
      );
      if (result.replayed) void reply.header("idempotency-replayed", "true");
      return reply.code(201).send(result.body);
    },
  );
};
