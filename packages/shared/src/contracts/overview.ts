import { z } from "zod";
import { instantSchema, localDateSchema, personRefSchema } from "./common.js";
import { unreadMessagesSchema } from "./messaging.js";
import { reviewTaskSchema } from "./review.js";

/**
 * Clinician overview (REQ-OVR-01): work lists for the signed-in clinician's care-team patients,
 * each with a count that equals its list length. No KPI tiles and no judgement labels.
 * Appointment, message and AI lists arrive in Phases 4 and 5.
 */
const overviewPatientSchema = z.object({
  id: z.uuid(),
  givenName: z.string(),
  familyName: z.string(),
  mrn: z.string(),
});

function workList<T extends z.ZodType>(item: T) {
  return z.object({ count: z.number().int(), items: z.array(item) });
}

export const clinicianOverviewSchema = z
  .object({
    generatedAt: instantSchema,
    today: localDateSchema,
    timezone: z.string(),
    /** Number of patients whose care team includes the signed-in clinician. */
    caseloadSize: z.number().int(),
    /**
     * Open and in-review tasks of the signed-in clinician's caseload (care-team patients) only, not
     * the whole clinic queue; highest priority then oldest first. `GET /review-tasks` is the clinic queue.
     */
    openTasks: workList(reviewTaskSchema),
    /** Check-ins of care-team patients not yet marked reviewed, oldest first. */
    unreviewedCheckIns: workList(
      z.object({
        id: z.uuid(),
        patient: overviewPatientSchema,
        painScore: z.number().int(),
        submittedAt: instantSchema,
        sessionId: z.uuid().nullable(),
      }),
    ),
    /**
     * Active care-team patients with fewer completed sessions than assigned over the 7 days
     * before today, `windowStart` to `windowEnd` (same definitions as ProgressView).
     */
    missedActivity: workList(
      z.object({
        patient: overviewPatientSchema,
        assignedSessions: z.number().int(),
        completedSessions: z.number().int(),
        missedSessions: z.number().int(),
        windowStart: localDateSchema,
        windowEnd: localDateSchema,
      }),
    ),
    /** Unread messages across the clinician's own conversations (WP 4.2). */
    messages: unreadMessagesSchema,
    /** Plan versions published for care-team patients in the last 7 days, newest first. */
    recentPublishes: workList(
      z.object({
        versionId: z.uuid(),
        patient: overviewPatientSchema,
        versionNumber: z.number().int(),
        publishedAt: instantSchema,
        publishedBy: personRefSchema,
      }),
    ),
  })
  .meta({ id: "ClinicianOverview" });
export type ClinicianOverview = z.infer<typeof clinicianOverviewSchema>;
