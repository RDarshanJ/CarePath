import { z } from "zod";
import { instantSchema, localDateSchema, personRefSchema, weekdaySchema } from "./common.js";

/**
 * Care plans (Scenario B). A plan has one mutable draft (CarePlan.draftContent) and immutable
 * published versions. Patients only ever see published versions (AC-B1). The draft preview and
 * the patient plan endpoints render through one serializer, so `CarePlanView` is the single
 * patient-facing shape (REQ-PLN-05).
 */

export const doseSchema = z.object({
  sets: z.number().int().min(1).max(20).nullable(),
  reps: z.number().int().min(1).max(200).nullable(),
  holdSeconds: z.number().int().min(1).max(600).nullable(),
  durationSeconds: z.number().int().min(1).max(3600).nullable(),
  restSeconds: z.number().int().min(0).max(600),
});
export type Dose = z.infer<typeof doseSchema>;

export const scheduleSchema = z.object({
  /** 0 is Sunday. At least one day, no repeats. */
  daysOfWeek: z
    .array(weekdaySchema)
    .min(1)
    .max(7)
    .refine((d) => new Set(d).size === d.length, "Days must not repeat."),
  timesPerDay: z.number().int().min(1).max(6),
});
export type Schedule = z.infer<typeof scheduleSchema>;

// ---- draft (clinician side) ---------------------------------------------------------------

export const carePlanDraftItemSchema = z
  .object({
    exerciseId: z.uuid(),
    /** 0-based; must equal the item's index in `items`. Move up and down change it (AC-B8). */
    position: z.number().int().min(0),
    dose: doseSchema.refine(
      (d) => d.reps !== null || d.durationSeconds !== null || d.holdSeconds !== null,
      { message: "Give repetitions, a duration or a hold time.", path: ["reps"] },
    ),
    schedule: scheduleSchema,
    /** Clinician-authored note for this exercise, shown to the patient. */
    instructions: z.string().trim().max(1000).nullable(),
  })
  .strict();
export type CarePlanDraftItem = z.infer<typeof carePlanDraftItemSchema>;

export const carePlanGoalInputSchema = z
  .object({
    /** An existing goal of this plan, or null for a new goal. */
    id: z.uuid().nullable(),
    description: z.string().trim().min(1).max(500),
    targetValue: z.number().min(0).max(100000).nullable(),
    targetUnit: z.string().trim().min(1).max(40).nullable(),
    dueDate: localDateSchema.nullable(),
  })
  .strict();
export type CarePlanGoalInput = z.infer<typeof carePlanGoalInputSchema>;

/** The content a clinician edits. Stored as CarePlan.draftContent. */
export const carePlanDraftContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    instructions: z.string().trim().max(4000),
    items: z
      .array(carePlanDraftItemSchema)
      .max(20)
      .superRefine((items, c) => {
        items.forEach((item, i) => {
          if (item.position !== i) {
            c.addIssue({
              code: "custom",
              message: "Positions must be 0, 1, 2 ... in list order.",
              path: [i, "position"],
            });
          }
        });
        const ids = items.map((i) => i.exerciseId);
        if (new Set(ids).size !== ids.length) {
          c.addIssue({ code: "custom", message: "An exercise appears twice.", path: [] });
        }
      }),
    goals: z.array(carePlanGoalInputSchema).max(10),
  })
  .strict()
  .meta({ id: "CarePlanDraftContent" });
export type CarePlanDraftContent = z.infer<typeof carePlanDraftContentSchema>;

export const carePlanDraftSaveSchema = carePlanDraftContentSchema
  .extend({
    /**
     * The `updatedAt` of the draft this edit started from, or null when there is no draft yet.
     * A different value means someone saved in between: 409 `draft_stale`.
     */
    expectedUpdatedAt: instantSchema.nullable(),
  })
  .strict()
  .meta({ id: "CarePlanDraftSave" });
export type CarePlanDraftSave = z.infer<typeof carePlanDraftSaveSchema>;

export const carePlanDraftSchema = z
  .object({
    carePlanId: z.uuid(),
    content: carePlanDraftContentSchema,
    updatedAt: instantSchema,
    author: personRefSchema,
    /** Number the next publish will get. A change note is required when it is 2 or more. */
    nextVersionNumber: z.number().int().min(1),
    currentVersionId: z.uuid().nullable(),
  })
  .meta({ id: "CarePlanDraft" });
export type CarePlanDraft = z.infer<typeof carePlanDraftSchema>;

export const carePlanPublishRequestSchema = z
  .object({
    /** Required from version 2 (AC-B4): a missing or blank note is a 400 on this path. */
    changeNoteForPatient: z.string().trim().max(2000).nullable(),
    expectedUpdatedAt: instantSchema,
  })
  .strict()
  .meta({ id: "CarePlanPublishRequest" });
export type CarePlanPublishRequest = z.infer<typeof carePlanPublishRequestSchema>;

// ---- patient-facing view (published version or draft preview) ------------------------------

export const carePlanItemSchema = z.object({
  /** Null in a draft preview: assignments exist only once published. */
  assignmentId: z.uuid().nullable(),
  position: z.number().int(),
  exercise: z.object({
    id: z.uuid(),
    name: z.string(),
    bodyArea: z.string(),
    category: z.string(),
    description: z.string(),
    instructions: z.string(),
    mediaPath: z.string().nullable(),
  }),
  /** "Set by your care team" (REQ-PLN-06). */
  dose: doseSchema,
  schedule: scheduleSchema,
  clinicianInstructions: z.string().nullable(),
});
export type CarePlanItem = z.infer<typeof carePlanItemSchema>;

export const carePlanGoalSchema = z.object({
  id: z.uuid().nullable(),
  description: z.string(),
  targetValue: z.number().nullable(),
  targetUnit: z.string().nullable(),
  dueDate: localDateSchema.nullable(),
});

export const exerciseRefSchema = z.object({ exerciseId: z.uuid(), name: z.string() });

/** Computed against the previous published version (AC-B3). */
export const carePlanDiffSchema = z
  .object({
    previousVersionNumber: z.number().int(),
    added: z.array(exerciseRefSchema),
    removed: z.array(exerciseRefSchema),
    changed: z.array(
      exerciseRefSchema.extend({
        /** Which prescribed fields differ, for example ["reps", "daysOfWeek"]. */
        fields: z.array(z.string()),
      }),
    ),
  })
  .meta({ id: "CarePlanDiff" });
export type CarePlanDiff = z.infer<typeof carePlanDiffSchema>;

export const carePlanViewSchema = z
  .object({
    carePlanId: z.uuid(),
    /** True when rendered from the draft for the clinician's preview. Never true for patients. */
    preview: z.boolean(),
    title: z.string(),
    instructions: z.string(),
    version: z.object({
      /** Null in a preview. */
      id: z.uuid().nullable(),
      number: z.number().int(),
      publishedAt: instantSchema.nullable(),
      publishedBy: personRefSchema,
      changeNoteForPatient: z.string().nullable(),
      isCurrent: z.boolean(),
    }),
    items: z.array(carePlanItemSchema),
    goals: z.array(carePlanGoalSchema),
    /** Null for version 1. */
    diffFromPrevious: carePlanDiffSchema.nullable(),
    /** Fixed notice shown with exercise content (PRD section 16). */
    contentNotice: z.string(),
  })
  .meta({ id: "CarePlanVersionDetail" });
export type CarePlanView = z.infer<typeof carePlanViewSchema>;
export type CarePlanVersionDetail = CarePlanView;
/** Same shape as CarePlanView; the route table names it CarePlanVersionDetail. */
export const carePlanVersionDetailSchema = carePlanViewSchema;

export const patientCarePlanSchema = z
  .object({
    /** Null when no version is published (and, for the preview, never null). */
    plan: carePlanViewSchema.nullable(),
  })
  .meta({ id: "PatientCarePlan" });
export type PatientCarePlan = z.infer<typeof patientCarePlanSchema>;

export const carePlanVersionListSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        number: z.number().int(),
        publishedAt: instantSchema,
        publishedBy: personRefSchema,
        changeNoteForPatient: z.string().nullable(),
        isCurrent: z.boolean(),
      }),
    ),
  })
  .meta({ id: "CarePlanVersionList" });
export type CarePlanVersionList = z.infer<typeof carePlanVersionListSchema>;

export const versionIdParamsSchema = z.object({ patientId: z.uuid(), versionId: z.uuid() });
