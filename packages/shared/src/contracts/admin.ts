import { z } from "zod";
import { instantSchema, localDateSchema, pageOf, personRefSchema } from "./common.js";
import { appointmentStatusSchema, appointmentTypeSchema } from "./scheduling.js";

/**
 * Administration (WP 6.1; CR-13, CR-14, CR-15; DR-002 N). Instants are UTC ISO strings; calendar
 * days are computed in the clinic's time zone, which each response names in `timezone`.
 *
 * Nothing here carries clinical content: no pain values, notes, plan contents or AI output.
 * Metrics are computed from current rows on every request and stored nowhere, so a "Now" metric
 * has no earlier value to compare with (`previous` is null and `previousNote` says why).
 */

// ---- metrics (CR-13) -----------------------------------------------------------------------

export const metricKeys = [
  "enrollment_completion",
  "appointment_utilisation",
  "cancellations",
  "care_plan_activation",
  "activity_completion",
  "pending_review_items",
] as const;
export const metricKeySchema = z.enum(metricKeys);
export type MetricKey = z.infer<typeof metricKeySchema>;

/** What the numerator and denominator count. `appointment_utilisation` counts minutes. */
export const metricUnits = ["patients", "minutes", "appointments", "items", "review_tasks"] as const;
export const metricUnitSchema = z.enum(metricUnits);
export type MetricUnit = z.infer<typeof metricUnitSchema>;

/**
 * The drill-down lists of each metric. A list is one `GET /metrics/rows?metric=&list=` call; its
 * row count equals the `count` the metric states for it, and a list whose role is `numerator`,
 * `denominator` or `remainder` reconciles to the number it is named after (for minutes, the sum
 * of the rows' `minutes`).
 */
export const metricListKeys = {
  enrollment_completion: ["not_submitted", "submitted", "created"],
  appointment_utilisation: ["unbooked", "booked", "published"],
  cancellations: ["cancelled", "cancelled_by_patient", "cancelled_by_clinic", "booked"],
  care_plan_activation: ["without_plan", "with_plan", "active"],
  activity_completion: ["not_done", "done", "scheduled", "by_patient"],
  pending_review_items: ["all", "under_24h", "24_to_48h", "over_48h"],
} as const satisfies Record<MetricKey, readonly string[]>;

export type MetricListKey<K extends MetricKey = MetricKey> = (typeof metricListKeys)[K][number];

export const allMetricListKeys = [
  ...new Set(Object.values(metricListKeys).flatMap((keys) => [...keys])),
] as [string, ...string[]];
export const metricListKeySchema = z.enum(allMetricListKeys);

export const metricListRoles = ["numerator", "remainder", "denominator", "breakdown"] as const;
export const metricListRoleSchema = z.enum(metricListRoles);
export type MetricListRole = z.infer<typeof metricListRoleSchema>;

export const metricWindowSchema = z.object({
  /** `now`: the state at `to`, no period. `trailing`: the span from `from` up to `to`. */
  kind: z.enum(["now", "trailing"]),
  /** Length of a trailing window in days; null for `now`. */
  days: z.number().int().nullable(),
  from: instantSchema.nullable(),
  to: instantSchema,
});
export type MetricWindow = z.infer<typeof metricWindowSchema>;

export const metricPreviousSchema = z.object({
  window: metricWindowSchema,
  numerator: z.number().int(),
  denominator: z.number().int().nullable(),
  /** 0 to 1; null when the denominator is 0 (never shown as 0 percent). */
  ratio: z.number().nullable(),
});

export const metricListSchema = z.object({
  key: metricListKeySchema,
  label: z.string(),
  role: metricListRoleSchema,
  /** Number of rows the list returns. */
  count: z.number().int(),
  /** For minute metrics, the sum of the rows' minutes; otherwise null. */
  minutes: z.number().int().nullable(),
});

export const metricSchema = z
  .object({
    key: metricKeySchema,
    name: z.string(),
    unit: metricUnitSchema,
    numerator: z.number().int(),
    numeratorLabel: z.string(),
    /** Null for a count with no denominator (pending review items). */
    denominator: z.number().int().nullable(),
    denominatorLabel: z.string().nullable(),
    /** 0 to 1. Null when there is no denominator or it is 0. */
    ratio: z.number().nullable(),
    /** Why `ratio` is null; null when it is not. */
    ratioUnavailableReason: z.string().nullable(),
    window: metricWindowSchema,
    /** The window in words, for example "Accounts created in the last 30 days". */
    windowLabel: z.string(),
    computedAt: instantSchema,
    /** Plain-words definition, printed with the number. */
    definition: z.string(),
    /** How the number is calculated, step by step. */
    calculation: z.string(),
    /** The records the number is counted from. */
    source: z.string(),
    /** The administrative decision the number supports. */
    supports: z.string(),
    /** The same calculation over the window before, recomputed from current rows. Null when not computable. */
    previous: metricPreviousSchema.nullable(),
    /** The reason `previous` is null, or the caveat that goes with it when it is not. */
    previousNote: z.string(),
    /** Parts of the number that are not lists of their own (for example, cancelled by whom). */
    breakdown: z.array(z.object({ key: z.string(), label: z.string(), count: z.number().int() })),
    lists: z.array(metricListSchema),
  })
  .meta({ id: "Metric" });
export type Metric = z.infer<typeof metricSchema>;

export const metricsSchema = z
  .object({
    computedAt: instantSchema,
    timezone: z.string(),
    items: z.array(metricSchema),
  })
  .meta({ id: "Metrics" });
export type Metrics = z.infer<typeof metricsSchema>;

/** `GET /metrics/rows?metric=&list=`. The metric is a query value so no tenant id sits in the path. */
export const metricRowsQuerySchema = z.object({
  metric: metricKeySchema,
  list: metricListKeySchema,
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type MetricRowsQuery = z.input<typeof metricRowsQuerySchema>;

const patientRefShape = { id: z.uuid(), name: z.string() };

export const enrollmentRowSchema = z.object({
  kind: z.literal("enrollment"),
  patientId: z.uuid(),
  name: z.string(),
  createdAt: instantSchema,
  /** Whole days from sign-up to the computation. */
  daysSinceSignUp: z.number().int(),
  /** Intake status; null when the patient has no intake record. */
  intakeStatus: z.enum(["in_progress", "submitted", "reviewed"]).nullable(),
  /** The step the intake stands on; a stored step key, not free text. */
  intakeStep: z.string().nullable(),
  submittedAt: instantSchema.nullable(),
});

export const slotRowSchema = z.object({
  kind: z.literal("slot"),
  slotId: z.uuid(),
  practitioner: personRefSchema,
  startsAt: instantSchema,
  endsAt: instantSchema,
  minutes: z.number().int(),
  slotStatus: z.enum(["open", "booked"]),
  /** The visit that uses the slot; null when it is unbooked. */
  appointmentId: z.uuid().nullable(),
  appointmentStatus: appointmentStatusSchema.nullable(),
  patient: z.object(patientRefShape).nullable(),
});

export const cancellationRowSchema = z.object({
  kind: z.literal("appointment"),
  appointmentId: z.uuid(),
  patient: z.object(patientRefShape),
  practitioner: personRefSchema,
  type: appointmentTypeSchema,
  status: appointmentStatusSchema,
  startsAt: instantSchema,
  bookedAt: instantSchema,
  cancelledAt: instantSchema.nullable(),
  /** Who cancelled; null when the visit is not cancelled. */
  cancelledBy: z.enum(["patient", "clinic"]).nullable(),
  cancellationReason: z.string().nullable(),
  /** True when the cancellation moved the visit to another time (a reschedule). */
  movedToNewTime: z.boolean(),
});

export const planRowSchema = z.object({
  kind: z.literal("plan"),
  patientId: z.uuid(),
  name: z.string(),
  planStage: z.enum(["none", "draft", "published"]),
  /** Names of the active care-team clinicians; empty when none is assigned. */
  clinicians: z.array(z.string()),
  /** When the patient's earliest active care-team member started; null when none. */
  assignedSince: instantSchema.nullable(),
  daysSinceAssigned: z.number().int().nullable(),
});

export const itemRowSchema = z.object({
  kind: z.literal("item"),
  patientId: z.uuid(),
  name: z.string(),
  /** Clinic-zone day the item was scheduled. */
  date: localDateSchema,
  /** Position of the exercise in the plan, counted from 1. No exercise name is returned. */
  itemNumber: z.number().int(),
  /** Which of that day's repeats, counted from 1. */
  instance: z.number().int(),
  done: z.boolean(),
});

export const patientItemsRowSchema = z.object({
  kind: z.literal("patient_items"),
  patientId: z.uuid(),
  name: z.string(),
  scheduled: z.number().int(),
  done: z.number().int(),
});

export const reviewBands = ["under_24h", "24_to_48h", "over_48h"] as const;
export const reviewBandSchema = z.enum(reviewBands);
export type ReviewBand = z.infer<typeof reviewBandSchema>;

export const reviewRowSchema = z.object({
  kind: z.literal("review_task"),
  taskId: z.uuid(),
  patientId: z.uuid(),
  name: z.string(),
  ruleName: z.string(),
  status: z.enum(["open", "in_review"]),
  priorityLevel: z.enum(["standard", "high"]),
  createdAt: instantSchema,
  /** Whole hours waited at the computation. */
  ageHours: z.number().int(),
  band: reviewBandSchema,
  assignedTo: z.string().nullable(),
});

export const metricRowSchema = z.discriminatedUnion("kind", [
  enrollmentRowSchema,
  slotRowSchema,
  cancellationRowSchema,
  planRowSchema,
  itemRowSchema,
  patientItemsRowSchema,
  reviewRowSchema,
]);
export type MetricRow = z.infer<typeof metricRowSchema>;

export const metricRowsSchema = z
  .object({
    metric: metricKeySchema,
    list: metricListKeySchema,
    label: z.string(),
    computedAt: instantSchema,
    timezone: z.string(),
    /** Total rows of the list (all pages). */
    count: z.number().int(),
    minutes: z.number().int().nullable(),
    items: z.array(metricRowSchema),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: "MetricRows" });
export type MetricRows = z.infer<typeof metricRowsSchema>;

// ---- availability (CR-14) ------------------------------------------------------------------

export const slotStatuses = ["open", "booked", "blocked"] as const;
export const slotStatusSchema = z.enum(slotStatuses);
export type SlotStatus = z.infer<typeof slotStatusSchema>;

export const slotIdParamsSchema = z.object({ slotId: z.uuid() });

/** `GET /practitioners/:practitionerId/availability`: clinic-zone days, inclusive; at most 31. */
export const availabilityQuerySchema = z.object({
  from: localDateSchema.optional(),
  to: localDateSchema.optional(),
});
export type AvailabilityQuery = z.input<typeof availabilityQuerySchema>;

export const availabilitySlotSchema = z
  .object({
    id: z.uuid(),
    startsAt: instantSchema,
    endsAt: instantSchema,
    minutes: z.number().int(),
    status: slotStatusSchema,
    appointmentTypes: z.array(appointmentTypeSchema),
    /** True when the slot started before the API's clock. Past times cannot be changed. */
    past: z.boolean(),
    /** The live visit in a booked slot. */
    appointment: z
      .object({
        id: z.uuid(),
        status: appointmentStatusSchema,
        patient: z.object(patientRefShape),
      })
      .nullable(),
  })
  .meta({ id: "AvailabilitySlot" });
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;

export const availabilityDaySchema = z.object({
  date: localDateSchema,
  openCount: z.number().int(),
  bookedCount: z.number().int(),
  blockedCount: z.number().int(),
  slots: z.array(availabilitySlotSchema),
});

export const availabilityListSchema = z
  .object({
    practitioner: personRefSchema,
    timezone: z.string(),
    from: localDateSchema,
    to: localDateSchema,
    /** One entry for every clinic-zone day from `from` to `to`, empty days included. */
    days: z.array(availabilityDaySchema),
  })
  .meta({ id: "AvailabilityList" });
export type AvailabilityList = z.infer<typeof availabilityListSchema>;

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM, 24-hour clock");

/**
 * `POST /practitioners/:practitionerId/availability`. Splits `startTime` to `endTime` (clinic
 * zone, one day) into slots of `slotMinutes`. A remainder shorter than a slot is not created and
 * is returned as `leftoverMinutes`. `status: "blocked"` records the times as blocked, for times
 * that are not to be booked and have no slot yet. All or none: an overlap with an existing time
 * answers 409 `availability_overlap` and creates nothing.
 */
export const availabilityAddSchema = z
  .object({
    date: localDateSchema,
    startTime: clockTimeSchema,
    endTime: clockTimeSchema,
    slotMinutes: z.number().int().min(15).max(240),
    appointmentTypes: z.array(appointmentTypeSchema).min(1).max(3),
    status: z.enum(["open", "blocked"]).default("open"),
  })
  .strict()
  .meta({ id: "AvailabilityAdd" });
export type AvailabilityAdd = z.input<typeof availabilityAddSchema>;

export const availabilityAddedSchema = z
  .object({
    practitioner: personRefSchema,
    timezone: z.string(),
    date: localDateSchema,
    created: z.array(availabilitySlotSchema),
    leftoverMinutes: z.number().int(),
  })
  .meta({ id: "AvailabilityAdded" });
export type AvailabilityAdded = z.infer<typeof availabilityAddedSchema>;

/**
 * `DELETE /availability/slots/:slotId`. A time that was never booked is deleted (`removed`). A
 * time that once held a visit that was cancelled cannot be deleted without losing that visit's
 * history, so it is blocked instead (`blocked_instead`) and leaves the open times either way.
 */
export const availabilityRemovedSchema = z
  .object({
    id: z.uuid(),
    outcome: z.enum(["removed", "blocked_instead"]),
    slot: availabilitySlotSchema.nullable(),
  })
  .meta({ id: "AvailabilityRemoved" });
export type AvailabilityRemoved = z.infer<typeof availabilityRemovedSchema>;

// ---- audit query (CR-15) -------------------------------------------------------------------

/**
 * Every audit event name the API writes. The audit writer, the audit viewer's labels and the
 * tests read this one list.
 */
export const auditEventNames = [
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "account.create",
  "consent.grant",
  "consent.revoke",
  "phi.read",
  "careplan.publish",
  "note.sign",
  // WP 5.2, not in PRD section 13: a working version of a draft note, and a signed note
  // marked entered in error (CR-8).
  "note.version",
  "note.entered_in_error",
  "ai.generate",
  "ai.refused",
  "ai.review",
  "review_task.resolve",
  "review_rule.update",
  "appointment.book",
  "appointment.cancel",
  "assignment.create",
  "availability.update",
  "settings.update",
  "export.fhir",
  "import.fhir",
  "security.access_denied",
  // WP 6.1: reading the audit log is itself recorded; eligibility codes are issued and revoked.
  "audit.query",
  "enrollment_code.issue",
  "enrollment_code.revoke",
] as const;
export const auditEventNameSchema = z.enum(auditEventNames);
export type AuditEventName = z.infer<typeof auditEventNameSchema>;

export const auditActions = ["C", "R", "U", "D", "E"] as const;
export const auditActionSchema = z.enum(auditActions);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditOutcomes = ["success", "minor_failure", "serious_failure", "major_failure"] as const;
export const auditOutcomeSchema = z.enum(auditOutcomes);
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

export const auditActorTypes = ["user", "system", "ai", "anonymous"] as const;
export const auditActorTypeSchema = z.enum(auditActorTypes);

export const auditPurposes = ["treatment", "operations", "patient_access", "admin", "export"] as const;
export const auditPurposeSchema = z.enum(auditPurposes);

/**
 * `GET /audit-events`. Newest first. Every filter is optional and they combine with AND. `from`
 * is inclusive, `to` is exclusive. `cursor` is opaque and stays valid while new events arrive
 * (it keys on time and id, not on position). Reading the log writes an `audit.query` event after
 * the page is built, so a request never lists itself.
 */
export const auditQuerySchema = z.object({
  actorUserId: z.uuid().optional(),
  /** What happened: an event name such as `careplan.publish`. */
  eventName: auditEventNameSchema.optional(),
  /** Create, read, update, delete or execute. */
  action: auditActionSchema.optional(),
  resourceType: z.string().trim().min(1).max(60).optional(),
  resourceId: z.string().trim().min(1).max(80).optional(),
  patientId: z.uuid().optional(),
  from: instantSchema.optional(),
  to: instantSchema.optional(),
  outcome: auditOutcomeSchema.optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type AuditQuery = z.input<typeof auditQuerySchema>;

export const auditEventSchema = z
  .object({
    id: z.uuid(),
    occurredAt: instantSchema,
    eventName: z.string(),
    action: auditActionSchema,
    outcome: auditOutcomeSchema,
    actor: z.object({
      type: auditActorTypeSchema,
      userId: z.uuid().nullable(),
      name: z.string().nullable(),
      role: z.enum(["patient", "physical_therapist", "care_coordinator", "clinic_admin"]).nullable(),
    }),
    resourceType: z.string().nullable(),
    resourceId: z.string().nullable(),
    patient: z.object(patientRefShape).nullable(),
    purposeOfUse: auditPurposeSchema.nullable(),
    /** Machine-readable reason, for example `out_of_scope`. */
    detailCode: z.string().nullable(),
    requestId: z.string().nullable(),
    /** Short scalar values only: route template, method, ids. Never a body or free text. */
    metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  })
  .meta({ id: "AuditEvent" });
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const auditPageSchema = pageOf(auditEventSchema).meta({ id: "AuditPage" });
export type AuditPage = z.infer<typeof auditPageSchema>;

// ---- eligibility codes ---------------------------------------------------------------------

export const enrollmentCodeStatuses = ["unused", "redeemed", "expired", "revoked"] as const;
export const enrollmentCodeStatusSchema = z.enum(enrollmentCodeStatuses);
export type EnrollmentCodeStatus = z.infer<typeof enrollmentCodeStatusSchema>;

export const enrollmentCodeIdParamsSchema = z.object({ codeId: z.uuid() });

export const enrollmentCodeQuerySchema = z.object({
  status: enrollmentCodeStatusSchema.optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type EnrollmentCodeQuery = z.input<typeof enrollmentCodeQuerySchema>;

/** The stored code is a hash. Staff recognise a code by its label (the last four characters). */
export const enrollmentCodeSchema = z
  .object({
    id: z.uuid(),
    label: z.string(),
    status: enrollmentCodeStatusSchema,
    createdAt: instantSchema,
    expiresAt: instantSchema,
    redeemedAt: instantSchema.nullable(),
    redeemedBy: z.object(patientRefShape).nullable(),
    revokedAt: instantSchema.nullable(),
  })
  .meta({ id: "EnrollmentCode" });
export type EnrollmentCode = z.infer<typeof enrollmentCodeSchema>;

export const enrollmentCodePageSchema = pageOf(enrollmentCodeSchema).meta({
  id: "EnrollmentCodePage",
});
export type EnrollmentCodePage = z.infer<typeof enrollmentCodePageSchema>;

export const enrollmentCodeIssueSchema = z
  .object({ expiresInDays: z.number().int().min(1).max(90).default(14) })
  .strict()
  .meta({ id: "EnrollmentCodeIssue" });
export type EnrollmentCodeIssue = z.input<typeof enrollmentCodeIssueSchema>;

/**
 * The only response that carries the code itself. It is shown once: the API keeps a hash and
 * cannot return the code again. Spaces and letter case are ignored when it is entered.
 */
export const enrollmentCodeIssuedSchema = enrollmentCodeSchema
  .extend({ code: z.string() })
  .meta({ id: "EnrollmentCodeIssued" });
export type EnrollmentCodeIssued = z.infer<typeof enrollmentCodeIssuedSchema>;
