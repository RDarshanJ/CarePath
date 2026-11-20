import { z } from "zod";
import { instantSchema, localDateSchema, personRefSchema } from "./common.js";
import { unreadMessagesSchema } from "./messaging.js";
import { weeklyProgressSchema } from "./progress.js";
import { nextAppointmentSchema } from "./scheduling.js";

/**
 * Patient Today (REQ-TOD-01). Dates and due states are computed by the API in the organization's
 * time zone; the web never derives them from the browser clock (C1 ruling 3.8). Appointment and
 * message fields arrive in Phase 4; `nextAppointment` is WP 4.1.
 *
 * session.state:
 * - due: today is a scheduled day and no session has been completed today
 * - in_progress / paused: an open session exists (`openSessionId`), whatever the day
 * - done: a session was completed or stopped today
 * - not_scheduled: no published plan, or today is not a scheduled day
 */
export const todaySessionStateSchema = z.enum([
  "due",
  "in_progress",
  "paused",
  "done",
  "not_scheduled",
]);
export type TodaySessionState = z.infer<typeof todaySessionStateSchema>;

export const todayViewSchema = z
  .object({
    date: localDateSchema,
    timezone: z.string(),
    patient: z.object({ id: z.uuid(), givenName: z.string(), status: z.string() }),
    plan: z
      .object({
        carePlanId: z.uuid(),
        title: z.string(),
        versionId: z.uuid(),
        versionNumber: z.number().int(),
        publishedAt: instantSchema,
        exerciseCount: z.number().int(),
        exercisesToday: z.number().int(),
      })
      .nullable(),
    session: z.object({
      state: todaySessionStateSchema,
      openSessionId: z.uuid().nullable(),
      /** Set when state is done: the session that finished today. */
      lastSessionId: z.uuid().nullable(),
    }),
    checkIn: z.object({
      /**
       * True when a session ended today without a check-in, or when no check-in has been
       * submitted today on a scheduled day.
       */
      due: z.boolean(),
      /** The session a check-in would follow, if one ended today without one. */
      sessionId: z.uuid().nullable(),
      lastSubmittedAt: instantSchema.nullable(),
    }),
    /** Shown until acknowledged (REQ-TOD-02). Null when there is nothing to explain. */
    planChange: z
      .object({
        versionId: z.uuid(),
        versionNumber: z.number().int(),
        changeNoteForPatient: z.string().nullable(),
        publishedAt: instantSchema,
        publishedBy: personRefSchema,
      })
      .nullable(),
    week: weeklyProgressSchema,
    /** Unread messages from the care team, from the participant read marker (WP 4.2). */
    messages: unreadMessagesSchema,
    /** The next booked or checked-in visit that has not ended (WP 4.1), or null. */
    nextAppointment: nextAppointmentSchema.nullable(),
  })
  .meta({ id: "TodayView" });
export type TodayView = z.infer<typeof todayViewSchema>;

export const planChangeAcknowledgeSchema = z
  .object({})
  .strict()
  .meta({ id: "PlanChangeAcknowledge" });
