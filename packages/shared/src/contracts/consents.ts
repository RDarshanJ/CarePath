import { z } from "zod";
import { instantSchema } from "./common.js";

/**
 * Consent (REQ-ONB-05, REQ-CON-01). Three types exist (advisor plan revision 1). In Phase 3 a
 * patient can grant `treatment_and_data_use` (required) and `ai_assisted_features` (optional, off
 * until granted). `motion_tracking` belongs to Phase 9 and cannot be granted yet. The required
 * consent is withdrawn through the clinic, not by the patient (Q4).
 */
export const consentTypeSchema = z.enum([
  "treatment_and_data_use",
  "ai_assisted_features",
  "motion_tracking",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const grantableConsentTypeSchema = z.enum([
  "treatment_and_data_use",
  "ai_assisted_features",
]);

/** Current consent text version per type. A grant must name it. */
export const CONSENT_TEXT_VERSIONS = {
  treatment_and_data_use: "2026-11-01",
  ai_assisted_features: "2026-11-01",
  motion_tracking: "2026-11-01",
} as const satisfies Record<ConsentType, string>;

export const consentSchema = z
  .object({
    id: z.uuid(),
    type: consentTypeSchema,
    status: z.enum(["active", "inactive", "rejected", "entered_in_error"]),
    textVersion: z.string(),
    policyUri: z.string(),
    grantedAt: instantSchema,
    revokedAt: instantSchema.nullable(),
  })
  .meta({ id: "Consent" });
export type Consent = z.infer<typeof consentSchema>;

export const consentListSchema = z
  .object({
    /** One entry per type, in a fixed order, with the active row if any. */
    types: z.array(
      z.object({
        type: consentTypeSchema,
        required: z.boolean(),
        /** False for motion_tracking in this phase. */
        grantable: z.boolean(),
        currentTextVersion: z.string(),
        active: consentSchema.nullable(),
      }),
    ),
    /** Every consent row, newest first: "when it changed" (REQ-CON-01). */
    history: z.array(consentSchema),
  })
  .meta({ id: "ConsentList" });
export type ConsentList = z.infer<typeof consentListSchema>;

export const consentGrantRequestSchema = z
  .object({
    type: grantableConsentTypeSchema,
    /** Must equal CONSENT_TEXT_VERSIONS[type]; another value is a 400 on this path. */
    textVersion: z.string().min(1).max(40),
  })
  .strict()
  .meta({ id: "ConsentGrantRequest" });
export type ConsentGrantRequest = z.infer<typeof consentGrantRequestSchema>;

export const consentRevokeRequestSchema = z
  .object({})
  .strict()
  .meta({ id: "ConsentRevokeRequest" });

export const consentIdParamsSchema = z.object({ patientId: z.uuid(), consentId: z.uuid() });
