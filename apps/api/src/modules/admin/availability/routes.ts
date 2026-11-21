import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  availabilityAddSchema,
  availabilityAddedSchema,
  availabilityListSchema,
  availabilityQuerySchema,
  availabilityRemovedSchema,
  availabilitySlotSchema,
  emptyBodySchema,
  practitionerIdParamsSchema,
  slotIdParamsSchema,
  type AvailabilityAdded,
  type AvailabilityList,
  type AvailabilityRemoved,
  type AvailabilitySlot,
} from "@carepath/shared/contracts";
import { auditActionFor } from "../../../core/auth/access.js";
import { requireCtx, type RequestCtx } from "../../../core/context.js";
import { withTx } from "../../../core/db/tx.js";
import { AppError, dbErrorToCode, errorResponses } from "../../../core/errors.js";
import { denyOutOfScope, requirePractitioner } from "../../../core/scope/patient-scope.js";
import {
  addDays,
  daysBetween,
  localDate,
  localInstant,
  startOfLocalDay,
} from "../../../core/time.js";
import { findClinic } from "../../clinic/repo.js";
import { findPractitionerRef, lockSlots } from "../../scheduling/repo.js";
import {
  deleteSlot,
  findSlot,
  findSlotOwner,
  insertSlots,
  listSlots,
  setBlocked,
  slotHasHistory,
} from "./repo.js";

const MAX_DAYS = 31;
const MAX_SLOTS_PER_ADD = 64;

function invalid(path: string, issue: string, message: string): AppError {
  return new AppError("validation_error", [{ path, issue, message }]);
}

/**
 * `availability.manage` covers any clinician of the organization; `availability.manage_own`
 * covers the caller's own practitioner profile only. The practitioner is readable to the caller,
 * so another therapist's times answer 403 (with an event), not 404.
 */
async function requireManage(
  request: FastifyRequest,
  ctx: RequestCtx,
  practitionerId: string,
): Promise<void> {
  if (ctx.permissions.has("availability.manage")) return;
  if (ctx.practitionerId === practitionerId) return;
  await request.server.deps.audit.fromRequest(request, {
    eventName: "security.access_denied",
    action: auditActionFor(request.method),
    outcome: "minor_failure",
    resourceType: "Practitioner",
    resourceId: practitionerId,
    detailCode: "not_own_availability",
  });
  throw new AppError("forbidden");
}

/** A slot of the organization; the practitioner check follows. */
async function requireSlot(request: FastifyRequest, slotId: string): Promise<RequestCtx> {
  const ctx = requireCtx(request.ctx);
  const owner = await findSlotOwner(request.server.deps.db, ctx, slotId);
  if (!owner) return denyOutOfScope(request, "AvailabilitySlot", slotId, null);
  await requireManage(request, ctx, owner.practitionerId);
  return ctx;
}

const access = { permission: ["availability.manage", "availability.manage_own"] as const };

/**
 * CR-14. Staff read and write the times patients book from. Every write audits `availability.update`
 * in its own transaction. A booked time is never changed here: block and remove answer 409
 * `slot_booked`, and a time that has started answers 409 `availability_past`. Writes lock the slot
 * row the way booking does, so a booking and a removal of the same time cannot both succeed.
 */
export const availabilityRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/practitioners/:practitionerId/availability",
    {
      config: { access },
      schema: {
        operationId: "listAvailability",
        tags: ["admin"],
        summary:
          "Every time of one practitioner from one clinic-zone day to another, any status, grouped by day with open, booked and blocked counts.",
        params: practitionerIdParamsSchema,
        querystring: availabilityQuerySchema,
        response: { 200: availabilityListSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<AvailabilityList> => {
      const { practitionerId } = request.params;
      const ctx = await requirePractitioner(request, practitionerId);
      await requireManage(request, ctx, practitionerId);
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const at = now();
      const from = request.query.from ?? localDate(at, tz);
      const to = request.query.to ?? addDays(from, 6);
      const span = daysBetween(from, to);
      if (span < 0 || span >= MAX_DAYS) {
        throw invalid(
          "querystring.to",
          "invalid_range",
          `Choose a range of 1 to ${MAX_DAYS} days, ending on or after the start.`,
        );
      }
      const practitioner = (await findPractitionerRef(db, ctx, practitionerId))!;
      const slots = await listSlots(
        db,
        ctx,
        practitionerId,
        { from: startOfLocalDay(from, tz), to: startOfLocalDay(addDays(to, 1), tz) },
        at,
      );
      const days: AvailabilityList["days"] = [];
      for (let i = 0; i <= span; i++) {
        days.push({
          date: addDays(from, i),
          openCount: 0,
          bookedCount: 0,
          blockedCount: 0,
          slots: [],
        });
      }
      for (const slot of slots) {
        const day = days[daysBetween(from, localDate(new Date(slot.startsAt), tz))];
        if (!day) continue;
        day.slots.push(slot);
        if (slot.status === "open") day.openCount += 1;
        else if (slot.status === "booked") day.bookedCount += 1;
        else day.blockedCount += 1;
      }
      return { practitioner, timezone: tz, from, to, days };
    },
  );

  app.post(
    "/practitioners/:practitionerId/availability",
    {
      config: { access },
      schema: {
        operationId: "addAvailability",
        tags: ["admin"],
        summary:
          "Add times for one practitioner on one clinic-zone day, split into slots. All or none: 409 availability_overlap when any overlaps an existing time.",
        params: practitionerIdParamsSchema,
        body: availabilityAddSchema,
        response: { 201: availabilityAddedSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply): Promise<AvailabilityAdded> => {
      const { practitionerId } = request.params;
      const ctx = await requirePractitioner(request, practitionerId);
      await requireManage(request, ctx, practitionerId);
      const { date, startTime, endTime, slotMinutes, status } = request.body;
      const types = [...new Set(request.body.appointmentTypes)];
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const at = now();
      if (endTime <= startTime) {
        throw invalid(
          "body.endTime",
          "end_before_start",
          "The end time must be after the start time.",
        );
      }
      const start = localInstant(date, startTime, tz);
      const end = localInstant(date, endTime, tz);
      const total = Math.round((end.getTime() - start.getTime()) / 60_000);
      const count = Math.floor(total / slotMinutes);
      if (count < 1) {
        throw invalid(
          "body.slotMinutes",
          "longer_than_range",
          "The slot is longer than the time range.",
        );
      }
      if (count > MAX_SLOTS_PER_ADD) {
        throw invalid(
          "body.slotMinutes",
          "too_many_slots",
          `Add at most ${MAX_SLOTS_PER_ADD} times at once.`,
        );
      }
      if (start <= at) {
        throw invalid("body.startTime", "past_time", "Choose times that have not started yet.");
      }
      const times = Array.from({ length: count }, (_, i) => ({
        startsAt: new Date(start.getTime() + i * slotMinutes * 60_000),
        endsAt: new Date(start.getTime() + (i + 1) * slotMinutes * 60_000),
      }));
      let ids: string[];
      try {
        ids = await withTx(request, async ({ tx, audit }) => {
          const created = await insertSlots(tx, ctx, {
            practitionerId,
            times,
            appointmentTypes: types,
            status,
          });
          await audit({
            eventName: "availability.update",
            action: "C",
            outcome: "success",
            resourceType: "Practitioner",
            resourceId: practitionerId,
            purposeOfUse: "admin",
            metadata: { op: "add", date, count: created.length, status },
          });
          return created;
        });
      } catch (err) {
        if (dbErrorToCode(err) === "booking_conflict") throw new AppError("availability_overlap");
        throw err;
      }
      const practitioner = (await findPractitionerRef(db, ctx, practitionerId))!;
      const slots = await listSlots(db, ctx, practitionerId, { from: start, to: end }, at);
      void reply.code(201);
      return {
        practitioner,
        timezone: tz,
        date,
        created: slots.filter((s) => ids.includes(s.id)),
        leftoverMinutes: total - count * slotMinutes,
      };
    },
  );

  for (const op of ["block", "unblock"] as const) {
    app.post(
      `/availability/slots/:slotId/${op}`,
      {
        config: { access },
        schema: {
          operationId: op === "block" ? "blockAvailability" : "unblockAvailability",
          tags: ["admin"],
          summary:
            op === "block"
              ? "Block one open time so it cannot be booked. 409 slot_booked when a visit holds it."
              : "Open a blocked time again.",
          params: slotIdParamsSchema,
          body: emptyBodySchema,
          response: {
            200: availabilitySlotSchema,
            ...errorResponses(400, 401, 403, 404, 409, 429),
          },
        },
      },
      async (request): Promise<AvailabilitySlot> => {
        const { slotId } = request.params;
        const ctx = await requireSlot(request, slotId);
        await withTx(request, async ({ tx, audit }) => {
          const slot = (await lockSlots(tx, ctx, [slotId])).get(slotId);
          if (!slot) throw new AppError("not_found");
          if (slot.status === "booked") throw new AppError("slot_booked");
          if (slot.startsAt <= now()) throw new AppError("availability_past");
          const wanted = op === "block" ? "blocked" : "open";
          if (slot.status === wanted) throw new AppError("invalid_transition");
          await setBlocked(tx, ctx, slotId, op === "block");
          await audit({
            eventName: "availability.update",
            action: "U",
            outcome: "success",
            resourceType: "AvailabilitySlot",
            resourceId: slotId,
            purposeOfUse: "admin",
            metadata: { op, practitionerId: slot.practitionerId },
          });
        });
        return (await findSlot(db, ctx, slotId, now()))!;
      },
    );
  }

  app.delete(
    "/availability/slots/:slotId",
    {
      config: { access },
      schema: {
        operationId: "removeAvailability",
        tags: ["admin"],
        summary:
          "Remove an unbooked time. 409 slot_booked when a visit holds it. A time that once held a cancelled visit is blocked instead of deleted.",
        params: slotIdParamsSchema,
        response: { 200: availabilityRemovedSchema, ...errorResponses(401, 403, 404, 409, 429) },
      },
    },
    async (request): Promise<AvailabilityRemoved> => {
      const { slotId } = request.params;
      const ctx = await requireSlot(request, slotId);
      const outcome = await withTx(request, async ({ tx, audit }) => {
        const slot = (await lockSlots(tx, ctx, [slotId])).get(slotId);
        if (!slot) throw new AppError("not_found");
        if (slot.status === "booked") throw new AppError("slot_booked");
        if (slot.startsAt <= now()) throw new AppError("availability_past");
        let result: AvailabilityRemoved["outcome"] = "removed";
        if (await slotHasHistory(tx, ctx, slotId)) {
          result = "blocked_instead";
          if (slot.status !== "blocked") await setBlocked(tx, ctx, slotId, true);
        } else {
          await deleteSlot(tx, ctx, slotId);
        }
        await audit({
          eventName: "availability.update",
          action: result === "removed" ? "D" : "U",
          outcome: "success",
          resourceType: "AvailabilitySlot",
          resourceId: slotId,
          purposeOfUse: "admin",
          metadata: { op: "remove", result, practitionerId: slot.practitionerId },
        });
        return result;
      });
      return {
        id: slotId,
        outcome,
        slot: outcome === "removed" ? null : await findSlot(db, ctx, slotId, now()),
      };
    },
  );
};
