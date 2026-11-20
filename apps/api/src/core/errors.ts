import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { z } from "zod";

/**
 * One error envelope for every non-2xx response:
 *   { "error": { "code": "not_found", "message": "Not found.", "details": [...] } }
 * The request id travels in the `x-request-id` header, not the body, so two 404s for
 * "does not exist" and "exists in another organization" are byte-identical (AC-I6).
 * Messages are fixed strings per code; they never echo input or database text.
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

export const errorDetailSchema = z.object({
  path: z.string().describe("Dot path of the offending field, empty for the whole input."),
  issue: z.string().describe("Machine-readable issue code."),
  message: z.string(),
});

export const errorEnvelopeSchema = z
  .object({
    error: z.object({
      code: z.enum(Object.keys(errorCodes) as [ErrorCode, ...ErrorCode[]]),
      message: z.string(),
      details: z.array(errorDetailSchema).optional(),
    }),
  })
  .meta({ id: "ErrorEnvelope" });

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export class AppError extends Error {
  readonly statusCode: number;
  constructor(
    readonly code: ErrorCode,
    readonly details?: ErrorDetail[],
  ) {
    super(errorCodes[code].message);
    this.name = "AppError";
    this.statusCode = errorCodes[code].status;
  }
}

export function envelope(code: ErrorCode, details?: ErrorDetail[]): ErrorEnvelope {
  return { error: { code, message: errorCodes[code].message, ...(details ? { details } : {}) } };
}

/** Error responses to declare on routes, so OpenAPI lists them with the envelope schema. */
export function errorResponses<const S extends readonly number[]>(...statuses: S) {
  return Object.fromEntries(statuses.map((s) => [s, errorEnvelopeSchema])) as {
    [K in S[number]]: typeof errorEnvelopeSchema;
  };
}

function fastifyCodeToError(err: FastifyError): ErrorCode | undefined {
  switch (err.code) {
    case "FST_ERR_CTP_BODY_TOO_LARGE":
      return "payload_too_large";
    case "FST_ERR_CTP_INVALID_MEDIA_TYPE":
      return "unsupported_media_type";
    case "FST_ERR_CTP_EMPTY_JSON_BODY":
    case "FST_ERR_CTP_INVALID_JSON_BODY":
    case "FST_ERR_CTP_INVALID_CONTENT_LENGTH":
      return "validation_error";
    default:
      return undefined;
  }
}

/** Safe description of an error for logs: type, code and stack frames, never the message. */
export function describeError(err: unknown): Record<string, unknown> {
  if (typeof err !== "object" || err === null) return { type: typeof err };
  const e = err as { name?: unknown; stack?: unknown; code?: unknown; statusCode?: unknown };
  const frames = (typeof e.stack === "string" ? e.stack : "")
    .split("\n")
    .filter((l) => l.startsWith("    at "))
    .slice(0, 8)
    .map((l) => l.trim());
  return {
    type: typeof e.name === "string" ? e.name : "object",
    ...(typeof e.code === "string" ? { code: e.code } : {}),
    ...(typeof e.statusCode === "number" ? { statusCode: e.statusCode } : {}),
    frames,
  };
}

function sendError(reply: FastifyReply, code: ErrorCode, details?: ErrorDetail[]) {
  return reply.code(errorCodes[code].status).send(envelope(code, details));
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof AppError) {
      return sendError(reply, err.code, err.details);
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      // Paths, issue codes and Zod's generic messages only. Zod 4 messages do not include
      // the received value, so no input (and no PHI) is echoed back or logged.
      const where = err.validationContext ?? "";
      const details = err.validation.map((v) => ({
        path: [where, ...v.instancePath.split("/")].filter(Boolean).join("."),
        issue: String(v.keyword),
        message: v.message ?? "Invalid value.",
      }));
      return sendError(reply, "validation_error", details);
    }
    if (isResponseSerializationError(err)) {
      request.log.error({ err }, "response failed its schema");
      return sendError(reply, "internal_error");
    }
    const mapped = fastifyCodeToError(err);
    if (mapped) return sendError(reply, mapped);
    if (err.statusCode === 429) return sendError(reply, "rate_limited");
    if (typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500) {
      request.log.warn({ err }, "client error");
      return sendError(reply, err.statusCode === 404 ? "not_found" : "validation_error");
    }
    request.log.error({ err }, "unhandled error");
    return sendError(reply, "internal_error");
  });

  app.setNotFoundHandler((_request, reply) => sendError(reply, "not_found"));
}
