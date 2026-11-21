import { z } from "zod";

/**
 * One error envelope for every non-2xx response:
 *   { "error": { "code": "not_found", "message": "Not found.", "details": [...] } }
 * The request id travels in the `x-request-id` header, not the body, so two 404s for
 * "does not exist" and "exists in another organization" are byte-identical (AC-I6).
 * Messages are fixed strings per code; they never echo input or database text.
 * The web app branches on `code`, never on `message`.
 */
export const errorCodes = {
  validation_error: { status: 400, message: "The request is not valid." },
  organization_required: {
    status: 400,
    message: "Choose an organization to sign in to.",
  },
  invalid_credentials: { status: 401, message: "Email or password is incorrect." },
  unauthenticated: { status: 401, message: "Sign in to continue." },
  session_expired: { status: 401, message: "Your session has ended. Sign in again." },
  origin_rejected: { status: 403, message: "Request origin is not allowed." },
  csrf_failed: { status: 403, message: "Missing or invalid CSRF token." },
  forbidden: { status: 403, message: "You do not have permission to do this." },
  not_on_care_team: {
    status: 403,
    message: "Only members of this patient's care team can make this change.",
  },
  not_found: { status: 404, message: "Not found." },
  conflict: { status: 409, message: "The request conflicts with the current state." },
  // Database constraint outcomes (checkpoint C1, M5). Stable codes the web can branch on.
  booking_conflict: {
    status: 409,
    message: "That time overlaps another booking. Choose a different time.",
  },
  already_exists: { status: 409, message: "A matching record already exists." },
  invalid_transition: {
    status: 409,
    message: "This change is not allowed from the record's current status.",
  },
  rule_violation: { status: 409, message: "The change breaks a rule for this record." },
  // Phase 3 route-specific codes (docs/architecture/api-phase3.md section 2).
  eligibility_code_invalid: {
    status: 400,
    message: "That eligibility code is not valid. Check it with your clinic.",
  },
  account_exists: { status: 409, message: "An account with this email already exists." },
  intake_incomplete: {
    status: 409,
    message: "Some onboarding steps are not complete yet.",
  },
  consent_required_type: {
    status: 409,
    message: "This consent is required for care. Contact your clinic to withdraw it.",
  },
  draft_stale: {
    status: 409,
    message: "The draft changed since you opened it. Reload it and try again.",
  },
  session_open: { status: 409, message: "A session is already in progress." },
  session_closed: { status: 409, message: "This session has already ended." },
  plan_not_published: { status: 409, message: "There is no published care plan yet." },
  // Phase 4 scheduling (WP 4.1). A slot taken by someone else is booking_conflict.
  slot_unavailable: {
    status: 409,
    message: "That time can no longer be booked. Choose another time.",
  },
  // CR-17: an Idempotency-Key reused with a different request body.
  idempotency_key_reused: {
    status: 409,
    message: "This key was already used for a different request.",
  },
  // Phase 5 AI and notes (WP 5.2).
  ai_consent_required: {
    status: 409,
    message: "The patient has not allowed AI-assisted drafting. Nothing was generated.",
  },
  ai_generation_failed: {
    status: 502,
    message: "Could not generate a draft. Nothing in the record was changed. Try again.",
  },
  ai_consent_withdrawn: {
    status: 409,
    message:
      "The patient withdrew consent to AI-assisted drafting. This draft can no longer be approved.",
  },
  ai_not_reviewable: { status: 409, message: "This generation failed and cannot be reviewed." },
  ai_already_decided: {
    status: 409,
    message: "This draft already has a decision. Regenerate to start a new draft.",
  },
  ai_approval_blocked: {
    status: 409,
    message: "Resolve every statement without a supporting record before approving.",
  },
  revision_stale: {
    status: 409,
    message: "Someone changed this draft since you opened it. Reload it and try again.",
  },
  encounter_no_transcript: {
    status: 409,
    message: "This visit has no transcript to draft a note from.",
  },
  not_note_author: { status: 403, message: "Only the note's author can do this." },
  note_empty: { status: 409, message: "A note with all four sections empty cannot be signed." },
  encounter_already_documented: {
    status: 409,
    message: "This visit already has a signed note. Mark that note entered in error first.",
  },
  // Phase 6 administration (WP 6.1, CR-14).
  slot_booked: {
    status: 409,
    message: "This time has a booked visit. Cancel the visit first.",
  },
  availability_overlap: {
    status: 409,
    message: "These times overlap an existing time.",
  },
  availability_past: { status: 409, message: "Past times cannot be changed." },
  payload_too_large: { status: 413, message: "The request body is too large." },
  unsupported_media_type: { status: 415, message: "Unsupported content type." },
  rate_limited: { status: 429, message: "Too many requests. Try again later." },
  internal_error: { status: 500, message: "Something went wrong on our side." },
  service_unavailable: { status: 503, message: "The service is temporarily unavailable." },
} as const;

export type ErrorCode = keyof typeof errorCodes;

export const errorCodeSchema = z.enum(Object.keys(errorCodes) as [ErrorCode, ...ErrorCode[]]);

export const errorDetailSchema = z.object({
  path: z.string().describe("Dot path of the offending field, empty for the whole input."),
  issue: z.string().describe("Machine-readable issue code."),
  message: z.string(),
});

export const errorEnvelopeSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z.array(errorDetailSchema).optional(),
    }),
  })
  .meta({ id: "ErrorEnvelope" });

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export function envelope(code: ErrorCode, details?: ErrorDetail[]): ErrorEnvelope {
  return { error: { code, message: errorCodes[code].message, ...(details ? { details } : {}) } };
}
