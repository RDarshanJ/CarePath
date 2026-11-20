import { z } from "zod";
import { bodyAreaSchema, instantSchema, localDateSchema, weekdaySchema } from "./common.js";

/**
 * Onboarding intake (Scenario A, REQ-ONB-01..07). Steps 1 and 2 (account and eligibility code)
 * are POST /onboarding/accounts; the nine steps below are saved one at a time with autosave and
 * resume (AC-A1). "Step n of 11": `number` counts the two account steps. Answers never produce a
 * diagnosis (REQ-ONB-06).
 */
export const intakeSteps = [
  "personal_information",
  "primary_goal",
  "body_area",
  "pain_levels",
  "activity_limitations",
  "clinician_preferences",
  "appointment_availability",
  "consent",
  "review",
] as const;
export const intakeStepSchema = z.enum(intakeSteps);
export type IntakeStep = z.infer<typeof intakeStepSchema>;

export const INTAKE_TOTAL_STEPS = 11;
/** Step number shown to the patient ("Step n of 11"). */
export function intakeStepNumber(step: IntakeStep): number {
  return intakeSteps.indexOf(step) + 3;
}

export const activityLimitations = [
  "walking",
  "stairs",
  "sitting",
  "standing",
  "lifting",
  "reaching_overhead",
  "sleeping",
  "driving",
  "exercise_or_sport",
  "work_tasks",
] as const;

/** Answers per step. The account steps prefill personal_information (WCAG 3.3.7). */
export const intakeAnswerSchemas = {
  personal_information: z
    .object({
      givenName: z.string().trim().min(1).max(100),
      familyName: z.string().trim().min(1).max(100),
      birthDate: localDateSchema,
      phone: z.string().trim().min(3).max(40).nullable(),
      preferredLanguage: z.enum(["en", "es"]),
    })
    .strict(),
  primary_goal: z.object({ goal: z.string().trim().min(1).max(500) }).strict(),
  body_area: z
    .object({
      bodyArea: bodyAreaSchema,
      side: z.enum(["left", "right", "both", "not_applicable"]),
    })
    .strict(),
  pain_levels: z
    .object({
      current: z.number().int().min(0).max(10),
      worstLastWeek: z.number().int().min(0).max(10),
      bestLastWeek: z.number().int().min(0).max(10),
    })
    .strict(),
  activity_limitations: z
    .object({
      limitations: z.array(z.enum(activityLimitations)).max(activityLimitations.length),
      other: z.string().trim().max(500).nullable(),
    })
    .strict(),
  clinician_preferences: z
    .object({
      genderPreference: z.enum(["no_preference", "female", "male"]),
      languagePreference: z.enum(["no_preference", "en", "es"]),
      notes: z.string().trim().max(500).nullable(),
    })
    .strict(),
  appointment_availability: z
    .object({
      days: z.array(weekdaySchema).min(1).max(7),
      times: z
        .array(z.enum(["morning", "afternoon", "evening"]))
        .min(1)
        .max(3),
    })
    .strict(),
  /**
   * Saving this step records the choices as Consent rows in the same transaction: the required
   * consent is granted, the optional AI consent is granted or revoked to match.
   */
  consent: z
    .object({
      treatmentAndDataUse: z.literal(true),
      aiAssistedFeatures: z.boolean(),
      textVersion: z.string().min(1).max(40),
    })
    .strict(),
  review: z.object({ confirmed: z.literal(true) }).strict(),
} as const satisfies Record<IntakeStep, z.ZodType>;

export type IntakeAnswers = { [K in IntakeStep]: z.infer<(typeof intakeAnswerSchemas)[K]> };

/** PUT body: `{ "answers": { ... } }` with the shape of the step in the path. */
export const intakeStepSaveSchema = z
  .object({ answers: z.record(z.string(), z.unknown()) })
  .strict()
  .meta({ id: "IntakeStepSave" });
export type IntakeStepSave = z.infer<typeof intakeStepSaveSchema>;

export const intakeSubmitRequestSchema = z.object({}).strict().meta({ id: "IntakeSubmitRequest" });

export const intakeStateSchema = z
  .object({
    /** `full` for the patient and clinical staff; `completeness` (no answers) for coordinators and admins. */
    view: z.enum(["full", "completeness"]),
    status: z.enum(["in_progress", "submitted", "reviewed"]),
    currentStep: intakeStepSchema,
    /** Where to resume (AC-A1). Null once every step is complete. */
    firstIncompleteStep: intakeStepSchema.nullable(),
    totalSteps: z.literal(INTAKE_TOTAL_STEPS),
    steps: z.array(
      z.object({
        step: intakeStepSchema,
        number: z.number().int(),
        complete: z.boolean(),
        answers: z.record(z.string(), z.unknown()).nullable(),
      }),
    ),
    /** Steps that must be complete before submit (review excluded). Includes `consent` while the required consent is not active. */
    missing: z.array(intakeStepSchema),
    startedAt: instantSchema,
    updatedAt: instantSchema,
    submittedAt: instantSchema.nullable(),
  })
  .meta({ id: "IntakeState" });
export type IntakeState = z.infer<typeof intakeStateSchema>;

export const intakeStepParamsSchema = z.object({ patientId: z.uuid(), step: intakeStepSchema });
