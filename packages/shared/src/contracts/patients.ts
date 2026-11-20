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
