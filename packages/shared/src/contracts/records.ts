import { z } from "zod";
import { instantSchema, pageOf, personRefSchema } from "./common.js";
import { reviewRuleKeySchema, reviewTaskStatusSchema } from "./review.js";
import { exerciseSessionStatusSchema } from "./sessions.js";

/**
 * Clinician record sections (REQ-REC-01): the timeline and the record history. Both are built
 * from domain rows. AuditEvent stays admin-only (C1 ruling 3.7).
 */

export const timelineItemSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("plan_version"),
      at: instantSchema,
      id: z.uuid(),
      versionNumber: z.number().int(),
      publishedBy: personRefSchema,
      changeNoteForPatient: z.string().nullable(),
    }),
    z.object({
      kind: z.literal("session"),
      at: instantSchema,
      id: z.uuid(),
      status: exerciseSessionStatusSchema,
      versionNumber: z.number().int(),
      endedAt: instantSchema.nullable(),
      completedActivities: z.number().int(),
      skippedActivities: z.number().int(),
      totalActivities: z.number().int(),
      /** True for "Stop, this hurts" (AC-C4). */
      stoppedForDiscomfort: z.boolean(),
    }),
    z.object({
      kind: z.literal("check_in"),
      at: instantSchema,
      id: z.uuid(),
      painScore: z.number().int(),
      sessionId: z.uuid().nullable(),
      reviewedAt: instantSchema.nullable(),
    }),
    z.object({
      kind: z.literal("review_task"),
      at: instantSchema,
      id: z.uuid(),
      ruleKey: reviewRuleKeySchema,
      status: reviewTaskStatusSchema,
      explanation: z.string(),
    }),
  ])
  .meta({ id: "TimelineItem" });
export type TimelineItem = z.infer<typeof timelineItemSchema>;

/** Newest first: plan versions, sessions, check-ins and review tasks of one patient. */
export const timelinePageSchema = pageOf(timelineItemSchema).meta({ id: "TimelinePage" });
export type TimelinePage = z.infer<typeof timelinePageSchema>;

export const recordHistoryItemSchema = z
  .object({
    kind: z.enum([
      "intake_submitted",
      "consent_granted",
      "consent_revoked",
      "care_team_member_added",
      "plan_version_published",
      "check_in_reviewed",
      "review_task_resolved",
      "review_task_dismissed",
    ]),
    at: instantSchema,
    /** The row the entry describes. */
    resourceType: z.string(),
    resourceId: z.uuid(),
    actor: personRefSchema.nullable(),
    /** Short factual text, for example "Version 2 published" or "ai_assisted_features". */
    detail: z.string(),
  })
  .meta({ id: "RecordHistoryItem" });
export type RecordHistoryItem = z.infer<typeof recordHistoryItemSchema>;

export const recordHistoryPageSchema = pageOf(recordHistoryItemSchema).meta({
  id: "RecordHistoryPage",
});
export type RecordHistoryPage = z.infer<typeof recordHistoryPageSchema>;
