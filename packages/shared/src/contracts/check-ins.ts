import { z } from "zod";
import { instantSchema, pageOf, personRefSchema } from "./common.js";

/** Patient check-ins (Scenarios C and D). Pain is patient-reported, 0 to 10. */
export const checkInDifficultySchema = z.enum(["easier", "as_expected", "harder"]);

export const checkInCreateSchema = z
  .object({
    /** The session this check-in follows, or null for a check-in on its own. */
    sessionId: z.uuid().nullable(),
    painScore: z.number().int().min(0).max(10),
    difficulty: checkInDifficultySchema.nullable().default(null),
    notes: z.string().trim().max(1000).nullable().default(null),
  })
  .strict()
  .meta({ id: "CheckInCreate" });
export type CheckInCreate = z.input<typeof checkInCreateSchema>;

export const checkInSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid().nullable(),
    painScore: z.number().int(),
    difficulty: checkInDifficultySchema.nullable(),
    notes: z.string().nullable(),
    submittedAt: instantSchema,
    reviewedAt: instantSchema.nullable(),
    reviewedBy: personRefSchema.nullable(),
  })
  .meta({ id: "CheckIn" });
export type CheckIn = z.infer<typeof checkInSchema>;

/**
 * Contact notice at or above the clinic's pain threshold (AC-D7). `message` is the fixed copy
 * from PRD section 16 with the value and the clinic phone (or "contact your clinic" when the
 * organization has none); `emergencyNotice` is EMERGENCY_NOTICE. Neither contains a banned
 * diagnostic term.
 */
export const painNoticeSchema = z.object({
  painScore: z.number().int(),
  threshold: z.number().int(),
  clinicPhone: z.string().nullable(),
  message: z.string(),
  emergencyNotice: z.string(),
});
export type PainNotice = z.infer<typeof painNoticeSchema>;

export const checkInResultSchema = z
  .object({
    checkIn: checkInSchema,
    /** "Your therapist will see this" (AC-C6). */
    seenBy: z.literal("care_team"),
    painNotice: painNoticeSchema.nullable(),
  })
  .meta({ id: "CheckInResult" });
export type CheckInResult = z.infer<typeof checkInResultSchema>;

export const checkInPageSchema = pageOf(checkInSchema).meta({ id: "CheckInPage" });
export type CheckInPage = z.infer<typeof checkInPageSchema>;

export const checkInReviewRequestSchema = z
  .object({})
  .strict()
  .meta({ id: "CheckInReviewRequest" });

export const checkInIdParamsSchema = z.object({ patientId: z.uuid(), checkInId: z.uuid() });
