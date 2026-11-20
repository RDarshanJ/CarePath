import { z } from "zod";

/** Path parameters of every route in the /patients/:patientId/... family. */
export const patientIdParamsSchema = z.object({ patientId: z.uuid() });

export const patientStatusSchema = z.enum([
  "intake_incomplete",
  "awaiting_assignment",
  "active",
  "inactive",
  "discharged",
]);

export const patientHeaderSchema = z
  .object({
    id: z.uuid(),
    mrn: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    birthDate: z.iso.date(),
    gender: z.enum(["female", "male", "other", "unknown"]),
    status: patientStatusSchema,
    timezone: z.string(),
    preferredLanguage: z.string(),
  })
  .meta({ id: "PatientHeader" });

export type PatientHeader = z.infer<typeof patientHeaderSchema>;

// ---- directory (REQ-DIR-01) ----------------------------------------------------------------

export const planStageSchema = z.enum(["none", "draft", "published"]);
export type PlanStage = z.infer<typeof planStageSchema>;

const booleanQuery = z.enum(["true", "false"]).transform((v) => v === "true");

export const patientDirectoryQuerySchema = z.object({
  /** Name or MRN, case-insensitive substring. */
  q: z.string().trim().min(1).max(100).optional(),
  status: patientStatusSchema.optional(),
  /** Practitioner id: patients whose active care team includes this clinician. */
  clinicianId: z.uuid().optional(),
  /** Patients with no activity since this instant (no activity at all included). */
  lastActivityBefore: z.iso.datetime().optional(),
  hasUpcomingAppointment: booleanQuery.optional(),
  planStage: planStageSchema.optional(),
  hasOpenReview: booleanQuery.optional(),
  sort: z
    .enum(["name", "-name", "lastActivity", "-lastActivity", "status", "-status"])
    .default("name"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type PatientDirectoryQuery = z.input<typeof patientDirectoryQuerySchema>;

const directoryBase = {
  id: z.uuid(),
  mrn: z.string(),
  givenName: z.string(),
  familyName: z.string(),
  birthDate: z.iso.date(),
  status: patientStatusSchema,
  primaryClinician: z
    .object({ practitionerId: z.uuid().nullable(), userId: z.uuid(), name: z.string() })
    .nullable(),
  lastActivityAt: z.iso.datetime().nullable(),
  nextAppointmentAt: z.iso.datetime().nullable(),
  planStage: planStageSchema,
};

/** Row for roles with clinical.read. */
export const patientDirectoryRowSchema = z
  .object({
    view: z.literal("clinical"),
    ...directoryBase,
    currentVersionNumber: z.number().int().nullable(),
    openReviewCount: z.number().int(),
  })
  .meta({ id: "PatientDirectoryRow" });

/** Row for coordinators and admins: administrative fields only (C1 ruling 3.7). */
export const patientAdminRowSchema = z
  .object({
    view: z.literal("administrative"),
    ...directoryBase,
    createdAt: z.iso.datetime(),
    intakeStatus: z.enum(["not_started", "in_progress", "submitted", "reviewed"]),
    /** "Missing intake information" (AC-A4): intake not yet submitted. */
    missingIntake: z.boolean(),
  })
  .meta({ id: "PatientAdminRow" });

export const patientDirectoryPageSchema = z
  .object({
    items: z.array(
      z.discriminatedUnion("view", [patientDirectoryRowSchema, patientAdminRowSchema]),
    ),
    nextCursor: z.string().nullable(),
  })
  .meta({ id: "PatientDirectoryPage" });
export type PatientDirectoryPage = z.infer<typeof patientDirectoryPageSchema>;
