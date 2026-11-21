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

/**
 * CR-9. Two levels, derived on the server from the task's own stored `priority` (a copy of the
 * rule's priority when the task was created): `high` when it is HIGH_PRIORITY_MIN or more,
 * otherwise `standard`. With the seeded rule priorities only reported pain is high. An
 * administrator who changes a rule's priority changes the level of tasks created afterwards.
 * The level is an ordering aid set by clinic rules; it is not a measure of medical risk.
 */
export const HIGH_PRIORITY_MIN = 70;
export const priorityLevelSchema = z.enum(["high", "standard"]);
export type PriorityLevel = z.infer<typeof priorityLevelSchema>;
export function priorityLevelOf(priority: number): PriorityLevel {
  return priority >= HIGH_PRIORITY_MIN ? "high" : "standard";
}

/**
 * CR-11. What happened to a task, oldest first. Creation is the task's `createdAt`, not an event.
 * `reviewed` is the care team marking a check-in the task reads as reviewed.
 */
export const reviewTaskEventKindSchema = z.enum([
  "assigned",
  "unassigned",
  "reviewed",
  "resolved",
  "dismissed",
]);
export type ReviewTaskEventKind = z.infer<typeof reviewTaskEventKindSchema>;

export const reviewTaskEventSchema = z
  .object({
    id: z.uuid(),
    kind: reviewTaskEventKindSchema,
    occurredAt: instantSchema,
    /** Who did it. */
    actor: personRefSchema,
    /** Assigned to (kind assigned) or taken from (kind unassigned); null otherwise. */
    practitioner: personRefSchema.nullable(),
    /** The resolution or dismissal note; null for the other kinds. */
    note: z.string().nullable(),
  })
  .meta({ id: "ReviewTaskEvent" });
export type ReviewTaskEvent = z.infer<typeof reviewTaskEventSchema>;

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
    /** CR-9: "high" or "standard", derived on the server from `priority` (see priorityLevelOf). */
    priorityLevel: priorityLevelSchema,
    assignedTo: personRefSchema.nullable(),
    createdAt: instantSchema,
    dueAt: instantSchema.nullable(),
    /** Whole hours since createdAt at the time of the response. */
    ageHours: z.number().int(),
    resolvedAt: instantSchema.nullable(),
    resolvedBy: personRefSchema.nullable(),
    resolutionNote: z.string().nullable(),
    /** CR-11: assigned, unassigned, reviewed, resolved and dismissed, oldest first. */
    events: z.array(reviewTaskEventSchema),
    /**
     * Whether the signed-in user is an active member of the patient's active care team (CR-2).
     * Assigning a task, and resolving or dismissing a clinical one, need it (403 `not_on_care_team`).
     */
    onCareTeam: z.boolean(),
  })
  .meta({ id: "ReviewTask" });
export type ReviewTask = z.infer<typeof reviewTaskSchema>;

export const reviewTaskQuerySchema = z.object({
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

/** CR-10. Tasks of one rule in the page's scope. */
export const reviewRuleTotalSchema = z.object({
  ruleId: z.uuid(),
  key: reviewRuleKeySchema,
  name: z.string(),
  total: z.number().int().min(0),
});
export type ReviewRuleTotal = z.infer<typeof reviewRuleTotalSchema>;

export const reviewTaskPageSchema = pageOf(reviewTaskSchema)
  .extend({
    /**
     * CR-10: one entry per rule of the organization, highest rule priority first, with zeros
     * included. Counts follow the query's `status` and `assignedTo` but ignore `ruleKey`, so the
     * count chips keep their numbers while one rule is selected. Without `ruleKey` the totals add
     * up to `total`.
     */
    ruleTotals: z.array(reviewRuleTotalSchema),
    /** When the queue was read. The empty state shows it (AC-D6). */
    lastCheckedAt: instantSchema,
    /** When the time-based rules last ran for this organization, or null if never. */
    rulesLastRunAt: instantSchema.nullable(),
    /** Tasks matching the query in the same scope, ignoring the cursor (CR-3). */
    total: z.number().int().min(0),
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
