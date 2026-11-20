import { z } from "zod";
import { instantSchema, pageOf, personRefSchema } from "./common.js";

/**
 * Review rules and tasks (Scenario D, PRD section 10). Rules are administrative thresholds set by
 * the clinic. They are unvalidated, predict nothing, and their defaults are arbitrary demo
 * values. A task always says why it appeared: the rule, the observed value, the threshold and
 * the source records it was computed from. There is no score (REQ-RVQ-04).
 */
export const reviewRuleKeys = [
  "reported_pain",
  "missed_sessions",
  "unreviewed_checkin",
  "upcoming_followup",
  "missing_intake",
] as const;
export const reviewRuleKeySchema = z.enum(reviewRuleKeys);
export type ReviewRuleKey = z.infer<typeof reviewRuleKeySchema>;

/** Rules whose tasks are clinical (care-team therapists resolve them). The rest are administrative. */
export const clinicalReviewRuleKeys: readonly ReviewRuleKey[] = [
  "reported_pain",
  "missed_sessions",
  "unreviewed_checkin",
];

/** Per-rule parameters. Stored in ReviewRule.params. */
export const reviewRuleParamsSchemas = {
  reported_pain: z.object({ threshold: z.number().int().min(1).max(10) }).strict(),
  missed_sessions: z
    .object({
      threshold: z.number().int().min(1).max(14),
      windowDays: z.number().int().min(1).max(28),
    })
    .strict(),
  unreviewed_checkin: z
    .object({
      thresholdHours: z
        .number()
        .int()
        .min(1)
        .max(24 * 30),
    })
    .strict(),
  upcoming_followup: z
    .object({
      thresholdHours: z
        .number()
        .int()
        .min(1)
        .max(24 * 14),
    })
    .strict(),
  missing_intake: z.object({ thresholdDays: z.number().int().min(1).max(60) }).strict(),
} as const satisfies Record<ReviewRuleKey, z.ZodType>;

export type ReviewRuleParams = {
  [K in ReviewRuleKey]: z.infer<(typeof reviewRuleParamsSchemas)[K]>;
};

/** Demo defaults (C1 ruling 3.7). The seed uses the same values. */
export const defaultReviewRuleParams: ReviewRuleParams = {
  reported_pain: { threshold: 7 },
  missed_sessions: { threshold: 2, windowDays: 7 },
  unreviewed_checkin: { thresholdHours: 48 },
  upcoming_followup: { thresholdHours: 48 },
  missing_intake: { thresholdDays: 3 },
};

export const REVIEW_RULE_DEFAULTS_NOTICE =
  "Rules are clinic-set thresholds. They are not validated and predict nothing. The defaults are arbitrary demonstration values.";

// upcoming_followup has the same shape as unreviewed_checkin ({ thresholdHours }), so four
// members cover all five rules. The route checks the parsed shape against the rule's key.
const reviewRuleParamsUnion = z.union([
  reviewRuleParamsSchemas.reported_pain,
  reviewRuleParamsSchemas.missed_sessions,
  reviewRuleParamsSchemas.unreviewed_checkin,
  reviewRuleParamsSchemas.missing_intake,
]);

export const reviewRuleSchema = z
  .object({
    id: z.uuid(),
    key: reviewRuleKeySchema,
    name: z.string(),
    description: z.string(),
    kind: z.enum(["clinical", "administrative"]),
    enabled: z.boolean(),
    priority: z.number().int(),
    /** Shape depends on `key` (see reviewRuleParamsSchemas). */
    params: z.record(z.string(), z.number()),
    defaultParams: z.record(z.string(), z.number()),
    updatedAt: instantSchema,
  })
  .meta({ id: "ReviewRule" });
export type ReviewRule = z.infer<typeof reviewRuleSchema>;

export const reviewRuleListSchema = z
  .object({ items: z.array(reviewRuleSchema), notice: z.string() })
  .meta({ id: "ReviewRuleList" });
export type ReviewRuleList = z.infer<typeof reviewRuleListSchema>;

export const reviewRuleUpdateSchema = z
  .object({
    enabled: z.boolean(),
    /** Validated against the rule's key: a shape for another rule is a 400 on `params`. */
    params: reviewRuleParamsUnion,
  })
  .strict()
  .meta({ id: "ReviewRuleUpdate" });
export type ReviewRuleUpdate = z.infer<typeof reviewRuleUpdateSchema>;

export const ruleIdParamsSchema = z.object({ ruleId: z.uuid() });

// ---- tasks --------------------------------------------------------------------------------

export const reviewTaskStatusSchema = z.enum(["open", "in_review", "resolved", "dismissed"]);
export type ReviewTaskStatus = z.infer<typeof reviewTaskStatusSchema>;

/** A record the rule read. `apiPath` opens it (AC-D1: the pain task opens the check-in). */
export const reviewTaskSourceSchema = z.object({
  type: z.enum(["PatientCheckIn", "CarePlanVersion", "Appointment", "IntakeAssessment"]),
  id: z.uuid(),
  field: z.string(),
  apiPath: z.string().nullable(),
});
export type ReviewTaskSource = z.infer<typeof reviewTaskSourceSchema>;

export const reviewTaskSchema = z
  .object({
    id: z.uuid(),
    status: reviewTaskStatusSchema,
    patient: z.object({
      id: z.uuid(),
      givenName: z.string(),
      familyName: z.string(),
      mrn: z.string(),
    }),
    rule: z.object({ id: z.uuid(), key: reviewRuleKeySchema, name: z.string() }),
    kind: z.enum(["clinical", "administrative"]),
    /** The rule's explanation sentence, for example "Reported pain 8 of 10. Clinic rule: 7 or higher." */
    explanation: z.string(),
    /** The observed value and the threshold in force when the task was created. */
    value: z.number().nullable(),
    threshold: z.number().nullable(),
    unit: z.string().nullable(),
    sources: z.array(reviewTaskSourceSchema),
    priority: z.number().int(),
    assignedTo: personRefSchema.nullable(),
    createdAt: instantSchema,
    dueAt: instantSchema.nullable(),
    /** Whole hours since createdAt at the time of the response. */
    ageHours: z.number().int(),
    resolvedAt: instantSchema.nullable(),
    resolvedBy: personRefSchema.nullable(),
    resolutionNote: z.string().nullable(),
  })
  .meta({ id: "ReviewTask" });
export type ReviewTask = z.infer<typeof reviewTaskSchema>;

export const reviewTaskQuerySchema = z
  .object({
    /** `active` (default) is open and in_review together. */
    status: z
      .enum(["active", "open", "in_review", "resolved", "dismissed", "closed"])
      .default("active"),
    /** `me`, `unassigned` or a practitioner id. */
    assignedTo: z.union([z.literal("me"), z.literal("unassigned"), z.uuid()]).optional(),
    ruleKey: reviewRuleKeySchema.optional(),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  });
export type ReviewTaskQuery = z.input<typeof reviewTaskQuerySchema>;

export const reviewTaskPageSchema = pageOf(reviewTaskSchema)
  .extend({
    /** When the queue was read. The empty state shows it (AC-D6). */
    lastCheckedAt: instantSchema,
    /** When the time-based rules last ran for this organization, or null if never. */
    rulesLastRunAt: instantSchema.nullable(),
  })
  .meta({ id: "ReviewTaskPage" });
export type ReviewTaskPage = z.infer<typeof reviewTaskPageSchema>;

export const reviewTaskAssignSchema = z
  .object({ practitionerId: z.uuid().nullable() })
  .strict()
  .meta({ id: "ReviewTaskAssign" });
export type ReviewTaskAssign = z.infer<typeof reviewTaskAssignSchema>;

export const reviewTaskResolveSchema = z
  .object({ note: z.string().trim().min(1).max(2000) })
  .strict()
  .meta({ id: "ReviewTaskResolve" });
export type ReviewTaskResolve = z.infer<typeof reviewTaskResolveSchema>;

export const taskIdParamsSchema = z.object({ patientId: z.uuid(), taskId: z.uuid() });
