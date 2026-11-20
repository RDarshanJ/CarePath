import { z } from "zod";
import { carePlanGoalSchema } from "./care-plan.js";
import { instantSchema, localDateSchema } from "./common.js";

/**
 * Weekly progress (REQ-PRG-01). Patients and clinicians read the same endpoint, so the patient's
 * weekly progress and the clinician's activity history show the same counts from the same rows
 * (AC-C2). Pain is labelled patient-reported and carries no trend caption (AC-C7).
 *
 * Definitions, all in the organization's time zone, for days up to and including today:
 * - assignedSessions: days on which the plan version current at the end of that day schedules
 *   exercises, times its timesPerDay.
 * - completedSessions: sessions with status completed whose start falls in the week.
 * - stoppedSessions: sessions stopped for discomfort.
 * - completedActivities / skippedActivities: SessionActivity rows of those sessions.
 */
export const progressQuerySchema = z
  .object({ weeks: z.coerce.number().int().min(1).max(12).default(4) })
  .strict()
  .meta({ id: "ProgressQuery" });
export type ProgressQuery = z.input<typeof progressQuerySchema>;

export const weeklyProgressSchema = z
  .object({
    /** Monday of the week. */
    weekStart: localDateSchema,
    weekEnd: localDateSchema,
    assignedSessions: z.number().int(),
    completedSessions: z.number().int(),
    stoppedSessions: z.number().int(),
    completedActivities: z.number().int(),
    skippedActivities: z.number().int(),
  })
  .meta({ id: "WeeklyProgress" });
export type WeeklyProgress = z.infer<typeof weeklyProgressSchema>;

export const painPointSchema = z.object({
  checkInId: z.uuid(),
  submittedAt: instantSchema,
  date: localDateSchema,
  painScore: z.number().int(),
});

export const progressViewSchema = z
  .object({
    timezone: z.string(),
    today: localDateSchema,
    /** Oldest first; the last entry is the current week. */
    weeks: z.array(weeklyProgressSchema),
    sessions: z.array(
      z.object({
        id: z.uuid(),
        status: z.enum(["completed", "stopped_discomfort", "abandoned"]),
        startedAt: instantSchema,
        endedAt: instantSchema.nullable(),
        versionNumber: z.number().int(),
        completedActivities: z.number().int(),
        skippedActivities: z.number().int(),
      }),
    ),
    pain: z.object({
      /** Always "Patient-reported" (PRD section 16). */
      label: z.literal("Patient-reported"),
      scale: z.literal("0 to 10"),
      /** Oldest first, every check-in in the window. The table form uses the same values. */
      points: z.array(painPointSchema),
    }),
    goals: z.array(carePlanGoalSchema),
  })
  .meta({ id: "ProgressView" });
export type ProgressView = z.infer<typeof progressViewSchema>;
