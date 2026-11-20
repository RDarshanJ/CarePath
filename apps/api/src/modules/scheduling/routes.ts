import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  appointmentDayQuerySchema,
  appointmentListSchema,
  appointmentPageSchema,
  patientAppointmentQuerySchema,
  patientIdParamsSchema,
  practitionerIdParamsSchema,
  slotListSchema,
  slotQuerySchema,
  type AppointmentList,
  type AppointmentPage,
  type SlotList,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import {
  recordPhiRead,
  requirePatientRead,
  requirePractitioner,
} from "../../core/scope/patient-scope.js";
import { addDays, daysBetween, localDate, startOfLocalDay } from "../../core/time.js";
import { findClinic } from "../clinic/repo.js";
import {
  findPractitionerRef,
  listDayAppointments,
  listOpenSlots,
  listPatientAppointments,
} from "./repo.js";
import { schedulingWriteRoutes } from "./write-routes.js";

/** Longest slot window one request may ask for, in days. */
const MAX_SLOT_DAYS = 31;
const DEFAULT_SLOT_DAYS = 14;

/**
 * Scheduling reads (WP 4.1): open slots grouped by clinic-zone day, a patient's appointments,
 * and one practitioner's day (CR-1). Writes are in write-routes.ts, registered from here so
 * app.ts gains one line.
 */
export const schedulingRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;
  await app.register(schedulingWriteRoutes);

  app.get(
    "/practitioners/:practitionerId/slots",
    {
      config: { access: { permission: ["appointment.manage_own", "appointment.read"] } },
      schema: {
        operationId: "listOpenSlots",
        tags: ["scheduling"],
        summary:
          "Open future slots of one practitioner, grouped by clinic-zone day. Patients see only their care team's practitioners.",
        params: practitionerIdParamsSchema,
        querystring: slotQuerySchema,
        response: { 200: slotListSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<SlotList> => {
      const { practitionerId } = request.params;
      const ctx = await requirePractitioner(request, practitionerId);
      const at = now();
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const from = request.query.from ?? localDate(at, tz);
      const to = request.query.to ?? addDays(from, DEFAULT_SLOT_DAYS - 1);
      const span = daysBetween(from, to);
      if (span < 0 || span >= MAX_SLOT_DAYS) {
        throw new AppError("validation_error", [
          {
            path: "querystring.to",
            issue: "invalid_range",
            message: `Choose a range of 1 to ${MAX_SLOT_DAYS} days, ending on or after the start.`,
          },
        ]);
      }
      const practitioner = await findPractitionerRef(db, ctx, practitionerId);
      if (!practitioner) throw new AppError("not_found");
      const slots = await listOpenSlots(db, ctx, practitionerId, {
        from: startOfLocalDay(from, tz),
        to: startOfLocalDay(addDays(to, 1), tz),
        after: at,
        ...(request.query.type ? { type: request.query.type } : {}),
      });
      const days: SlotList["days"] = [];
      for (const slot of slots) {
        const date = localDate(new Date(slot.startsAt), tz);
        const last = days[days.length - 1];
        if (last && last.date === date) last.slots.push(slot);
        else days.push({ date, slots: [slot] });
      }
      return { practitioner, timezone: tz, from, to, days };
    },
  );

  app.get(
    "/patients/:patientId/appointments",
    {
      config: { access: { permission: ["appointment.manage_own", "appointment.read"] } },
      schema: {
        operationId: "listPatientAppointments",
        tags: ["scheduling"],
        summary:
          "A patient's appointments: upcoming (soonest first) or past and cancelled (newest first).",
        params: patientIdParamsSchema,
        querystring: patientAppointmentQuerySchema,
        response: { 200: appointmentPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<AppointmentPage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const { when, limit } = request.query;
      const offset = decodeCursor(request.query.cursor);
      const clinic = await findClinic(db, ctx);
      const rows = await listPatientAppointments(db, ctx, patientId, {
        when,
        now: now(),
        offset,
        take: limit + 1,
        timezone: clinic.timezone,
      });
      await recordPhiRead(request, patientId, "Appointment", patientId);
      return { timezone: clinic.timezone, ...pageFrom(rows, offset, limit) };
    },
  );

  app.get(
    "/appointments",
    {
      config: { access: { permission: "appointment.read" } },
      schema: {
        operationId: "listDayAppointments",
        tags: ["scheduling"],
        summary:
          "One practitioner's appointments on one clinic-zone day, every status, by start time (CR-1).",
        querystring: appointmentDayQuerySchema,
        response: { 200: appointmentListSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<AppointmentList> => {
      const ctx = requireCtx(request.ctx);
      const { date, practitionerId } = request.query;
      // A query id outside the organization is a validation error, like an unknown one.
      const practitioner = await findPractitionerRef(db, ctx, practitionerId);
      if (!practitioner) {
        throw new AppError("validation_error", [
          {
            path: "querystring.practitionerId",
            issue: "unknown_practitioner",
            message: "Not a practitioner of this clinic.",
          },
        ]);
      }
      const clinic = await findClinic(db, ctx);
      const tz = clinic.timezone;
      const items = await listDayAppointments(db, ctx, practitionerId, {
        from: startOfLocalDay(date, tz),
        to: startOfLocalDay(addDays(date, 1), tz),
        timezone: tz,
      });
      return { date, timezone: tz, practitioner, items };
    },
  );
};
