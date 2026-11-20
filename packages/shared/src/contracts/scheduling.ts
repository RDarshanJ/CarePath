import { z } from "zod";
import { instantSchema, localDateSchema, personRefSchema } from "./common.js";

/**
 * Scheduling (WP 4.1, checkpoint C2 sections 2, 3.1 and 6.4; PRD Scenario E). Instants are UTC
 * ISO strings. Calendar days (`date`, slot grouping, the agenda day) are computed by the API in
 * the clinic's time zone, which every response names in `timezone`; the web shows times in the
 * viewer's zone and names that zone (REQ-APT-03).
 *
 * Booking always takes a slot. A slot that was just taken answers 409 `booking_conflict`; a slot
 * in the past or blocked answers 409 `slot_unavailable`.
 */

export const appointmentTypes = ["initial_evaluation", "follow_up", "video_follow_up"] as const;
export const appointmentTypeSchema = z.enum(appointmentTypes);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

/**
 * `requested` is part of the stored lifecycle but no workflow creates it (C1 ruling 3.3, C2
 * section 5). Patient cancellations end in `cancelled_by_patient`, staff ones in
 * `cancelled_by_clinic`.
 */
export const appointmentStatuses = [
  "requested",
  "booked",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled_by_patient",
  "cancelled_by_clinic",
  "no_show",
] as const;
export const appointmentStatusSchema = z.enum(appointmentStatuses);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const practitionerIdParamsSchema = z.object({ practitionerId: z.uuid() });
export const appointmentIdParamsSchema = z.object({
  patientId: z.uuid(),
  appointmentId: z.uuid(),
});

/**
 * `GET /practitioners/:practitionerId/slots`. `from` and `to` are clinic-zone days, inclusive;
 * defaults are today and 13 days later. At most 31 days per request. Only open slots that start
 * after the API's clock are returned.
 */
export const slotQuerySchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
  type: appointmentTypeSchema.optional(),
});
export type SlotQuery = z.input<typeof slotQuerySchema>;

export const openSlotSchema = z
  .object({
    id: z.uuid(),
    startsAt: instantSchema,
    endsAt: instantSchema,
    appointmentTypes: z.array(appointmentTypeSchema),
  })
  .meta({ id: "OpenSlot" });
export type OpenSlot = z.infer<typeof openSlotSchema>;

export const slotListSchema = z
  .object({
    practitioner: personRefSchema,
    timezone: z.string(),
    from: localDateSchema,
    to: localDateSchema,
    /** One entry per clinic-zone day that has open slots, in order. Empty days are left out. */
    days: z.array(z.object({ date: localDateSchema, slots: z.array(openSlotSchema) })),
  })
  .meta({ id: "SlotList" });
export type SlotList = z.infer<typeof slotListSchema>;

export const appointmentSchema = z
  .object({
    id: z.uuid(),
    patient: z.object({ id: z.uuid(), name: z.string() }),
    practitioner: personRefSchema,
    slotId: z.uuid().nullable(),
    type: appointmentTypeSchema,
    status: appointmentStatusSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    /** Clinic-zone day of `startsAt`. */
    date: localDateSchema,
    /** The clinic's zone, in which `date` is computed. */
    timezone: z.string(),
    reason: z.string().nullable(),
    bookedBy: personRefSchema.nullable(),
    createdAt: instantSchema,
    cancelledAt: instantSchema.nullable(),
    cancellationReason: z.string().nullable(),
    cancelledBy: personRefSchema.nullable(),
    /** The cancelled appointment this one replaced. */
    rescheduledFromId: z.uuid().nullable(),
    /** The appointment that replaced this one, when it was rescheduled. */
    rescheduledToId: z.uuid().nullable(),
  })
  .meta({ id: "Appointment" });
export type Appointment = z.infer<typeof appointmentSchema>;

/**
 * `GET /patients/:patientId/appointments`. `upcoming` (default): not yet ended and not
 * cancelled, soonest first. `past`: ended or cancelled, newest first.
 */
export const patientAppointmentQuerySchema = z.object({
  when: z.enum(["upcoming", "past"]).default("upcoming"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PatientAppointmentQuery = z.input<typeof patientAppointmentQuerySchema>;

export const appointmentPageSchema = z
  .object({
    timezone: z.string(),
    items: z.array(appointmentSchema),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: "AppointmentPage" });
export type AppointmentPage = z.infer<typeof appointmentPageSchema>;

/** `GET /appointments?date&practitionerId` (CR-1): one practitioner's clinic-zone day. */
export const appointmentDayQuerySchema = z.object({
  date: localDateSchema,
  practitionerId: z.uuid(),
});
export type AppointmentDayQuery = z.input<typeof appointmentDayQuerySchema>;

export const appointmentListSchema = z
  .object({
    date: localDateSchema,
    timezone: z.string(),
    practitioner: personRefSchema,
    /** Every appointment starting that day, cancelled ones included, by start time. */
    items: z.array(appointmentSchema),
  })
  .meta({ id: "AppointmentList" });
export type AppointmentList = z.infer<typeof appointmentListSchema>;

const reasonSchema = z.string().trim().min(1).max(500);

export const appointmentBookSchema = z
  .object({
    slotId: z.uuid(),
    type: appointmentTypeSchema,
    reason: reasonSchema.nullable().optional(),
  })
  .strict()
  .meta({ id: "AppointmentBook" });
export type AppointmentBook = z.infer<typeof appointmentBookSchema>;

export const appointmentCancelSchema = z
  .object({ reason: reasonSchema.nullable().optional() })
  .strict()
  .meta({ id: "AppointmentCancel" });
export type AppointmentCancel = z.infer<typeof appointmentCancelSchema>;

/** Cancel plus book in one transaction; if the new slot is taken the original stays (AC-E7). */
export const appointmentRescheduleSchema = z
  .object({ slotId: z.uuid() })
  .strict()
  .meta({ id: "AppointmentReschedule" });
export type AppointmentReschedule = z.infer<typeof appointmentRescheduleSchema>;

/** The patient's next live visit, shown on Today (REQ-TOD-01). */
export const nextAppointmentSchema = z
  .object({
    id: z.uuid(),
    practitioner: personRefSchema,
    type: appointmentTypeSchema,
    status: appointmentStatusSchema,
    startsAt: instantSchema,
    endsAt: instantSchema,
    date: localDateSchema,
  })
  .meta({ id: "NextAppointment" });
export type NextAppointment = z.infer<typeof nextAppointmentSchema>;
