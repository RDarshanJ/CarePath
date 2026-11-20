import { z } from "zod";
import { doseSchema } from "./care-plan.js";
import { exerciseMediaShape, instantSchema, pageOf } from "./common.js";

/**
 * Guided exercise sessions (Scenario C). A session runs against one immutable plan version and
 * keeps it even if a new version is published mid-session (AC-B5). State is stored per step,
 * so a session resumes where it stopped on any device (AC-C1).
 *
 * in_progress <-> paused; in_progress or paused -> completed (from in_progress only),
 * stopped_discomfort ("Stop, this hurts"), abandoned (24 idle hours, by a job).
 */
export const exerciseSessionStatuses = [
  "in_progress",
  "paused",
  "completed",
  "abandoned",
  "stopped_discomfort",
] as const;
export const exerciseSessionStatusSchema = z.enum(exerciseSessionStatuses);
export type ExerciseSessionStatus = z.infer<typeof exerciseSessionStatusSchema>;

export const sessionActivityStatusSchema = z.enum(["pending", "completed", "skipped"]);

export const activityCountsSchema = z.object({
  total: z.number().int(),
  completed: z.number().int(),
  skipped: z.number().int(),
  pending: z.number().int(),
});

export const exerciseSessionSummarySchema = z
  .object({
    id: z.uuid(),
    status: exerciseSessionStatusSchema,
    carePlanVersionId: z.uuid(),
    versionNumber: z.number().int(),
    startedAt: instantSchema,
    pausedAt: instantSchema.nullable(),
    completedAt: instantSchema.nullable(),
    stoppedAt: instantSchema.nullable(),
    elapsedSeconds: z.number().int(),
    activityCounts: activityCountsSchema,
    /** A check-in that references this session, if any. */
    checkInId: z.uuid().nullable(),
  })
  .meta({ id: "ExerciseSessionSummary" });
export type ExerciseSessionSummary = z.infer<typeof exerciseSessionSummarySchema>;

export const sessionActivitySchema = z.object({
  id: z.uuid(),
  assignmentId: z.uuid(),
  position: z.number().int(),
  status: sessionActivityStatusSchema,
  exercise: z.object({
    id: z.uuid(),
    name: z.string(),
    bodyArea: z.string(),
    category: z.string(),
    description: z.string(),
    instructions: z.string(),
    ...exerciseMediaShape,
  }),
  dose: doseSchema,
  clinicianInstructions: z.string().nullable(),
  completedSets: z.number().int().nullable(),
  completedReps: z.number().int().nullable(),
  durationSeconds: z.number().int().nullable(),
  skipReason: z.string().nullable(),
  discomfortLevel: z.number().int().nullable(),
  discomfortNote: z.string().nullable(),
  completedAt: instantSchema.nullable(),
});
export type SessionActivity = z.infer<typeof sessionActivitySchema>;

export const exerciseSessionDetailSchema = exerciseSessionSummarySchema
  .extend({
    /** 0-based position of the activity to show next. */
    currentPosition: z.number().int(),
    activities: z.array(sessionActivitySchema),
    /**
     * True when the session has ended (completed or stopped for discomfort) and no check-in
     * references it yet. After "Stop, this hurts" the client asks for a pain report (AC-C4).
     */
    checkInRequested: z.boolean(),
    contentNotice: z.string(),
  })
  .meta({ id: "ExerciseSessionDetail" });
export type ExerciseSessionDetail = z.infer<typeof exerciseSessionDetailSchema>;

export const exerciseSessionPageSchema = pageOf(exerciseSessionSummarySchema).meta({
  id: "ExerciseSessionPage",
});
export type ExerciseSessionPage = z.infer<typeof exerciseSessionPageSchema>;

/** Always starts on the current published version; nothing to choose. */
export const sessionStartRequestSchema = z.object({}).strict().meta({ id: "SessionStartRequest" });
export const sessionResumeRequestSchema = z
  .object({})
  .strict()
  .meta({ id: "SessionResumeRequest" });

export const sessionProgressSchema = z
  .object({
    currentPosition: z.number().int().min(0).max(50),
    elapsedSeconds: z
      .number()
      .int()
      .min(0)
      .max(24 * 3600),
  })
  .strict()
  .meta({ id: "SessionProgress" });
export type SessionProgress = z.infer<typeof sessionProgressSchema>;

const discomfortFields = {
  discomfortLevel: z.number().int().min(0).max(10).nullable().default(null),
  discomfortNote: z.string().trim().max(500).nullable().default(null),
};

/** Complete an activity with what was done, or skip it with a reason (AC-C3). */
export const sessionActivityUpdateSchema = z
  .discriminatedUnion("status", [
    z
      .object({
        status: z.literal("completed"),
        completedSets: z.number().int().min(0).max(50).nullable().default(null),
        completedReps: z.number().int().min(0).max(1000).nullable().default(null),
        durationSeconds: z.number().int().min(0).max(7200).nullable().default(null),
        ...discomfortFields,
      })
      .strict(),
    z
      .object({
        status: z.literal("skipped"),
        skipReason: z.string().trim().min(1).max(500),
        ...discomfortFields,
      })
      .strict(),
  ])
  .meta({ id: "SessionActivityUpdate" });
export type SessionActivityUpdate = z.input<typeof sessionActivityUpdateSchema>;

/** "Stop, this hurts" (AC-C4): ends the session as stopped_discomfort. */
export const sessionStopRequestSchema = z
  .object({
    activityId: z.uuid(),
    discomfortLevel: z.number().int().min(0).max(10),
    note: z.string().trim().max(500).nullable().default(null),
  })
  .strict()
  .meta({ id: "SessionStopRequest" });
export type SessionStopRequest = z.input<typeof sessionStopRequestSchema>;

export const sessionIdParamsSchema = z.object({ patientId: z.uuid(), sessionId: z.uuid() });
export const activityIdParamsSchema = z.object({
  patientId: z.uuid(),
  sessionId: z.uuid(),
  activityId: z.uuid(),
});
