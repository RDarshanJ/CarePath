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
