import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";

import {
  envelope,
  errorCodes,
  errorEnvelopeSchema,
  type ErrorCode,
  type ErrorDetail,
} from "@carepath/shared/contracts";

/**
 * Error envelope, codes and messages are shared contracts (packages/shared/src/contracts/errors.ts,
 * checkpoint C1 ruling 3.5). This file maps thrown errors onto them.
 */
export { envelope, errorCodes, errorEnvelopeSchema, type ErrorCode, type ErrorDetail };

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
