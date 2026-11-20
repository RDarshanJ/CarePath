import { z } from "zod";
import { instantSchema } from "./common.js";

/** Care team card (AC-H1) and clinician assignment (Scenario A, REQ-ADM-02). */
export const careTeamMemberRoleSchema = z.enum([
  "primary_therapist",
  "therapist",
  "care_coordinator",
]);

export const careTeamCardSchema = z
  .object({
    patientId: z.uuid(),
    /** Empty when the patient is awaiting assignment. */
    members: z.array(
      z.object({
        userId: z.uuid(),
        practitionerId: z.uuid().nullable(),
        name: z.string(),
        credentials: z.string().nullable(),
        role: careTeamMemberRoleSchema,
        /** Plain label, for example "Physical therapist". */
        roleLabel: z.string(),
        since: instantSchema,
      }),
    ),
  })
  .meta({ id: "CareTeamCard" });
export type CareTeamCard = z.infer<typeof careTeamCardSchema>;

export const assignClinicianRequestSchema = z
  .object({ practitionerId: z.uuid() })
  .strict()
  .meta({ id: "AssignClinicianRequest" });
export type AssignClinicianRequest = z.infer<typeof assignClinicianRequestSchema>;

export const practitionerListSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.uuid(),
        userId: z.uuid().nullable(),
        name: z.string(),
        credentials: z.string().nullable(),
        /** Active patients whose care team includes this practitioner. */
        activeCaseload: z.number().int(),
      }),
    ),
  })
  .meta({ id: "PractitionerList" });
export type PractitionerList = z.infer<typeof practitionerListSchema>;
