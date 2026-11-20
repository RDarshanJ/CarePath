import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { describeError } from "./errors.js";

/**
 * Structured logs with PHI kept out by construction (research section 2.1, PRD section 13).
 * Logs carry request id, route template, method, status, duration, actor and organization ids.
 * Never: bodies, raw URLs or query strings, headers, cookies, error messages (which can quote
 * database values), names, check-in text or pain values. Fastify's own request logging is off
 * and replaced by one allow-listed line per request. `redact` is a backstop for anything a
 * future caller passes by mistake.
 */
export function loggerOptions(
  level: string,
  stream?: NodeJS.WritableStream,
): FastifyServerOptions["logger"] {
  return {
    level,
    ...(stream ? { stream } : {}),
    serializers: {
      req: (req: { method?: string; routeOptions?: { url?: string } }) => ({
        method: req.method,
        route: req.routeOptions?.url ?? "unmatched",
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
      // Fastify's type expects message and stack; we deliberately omit the message.
      err: describeError as never,
    },
    redact: {
      paths: [
        "body",
        "*.body",
        "headers",
        "*.headers",
        "query",
        "*.query",
        "url",
        "*.url",
        "password",
        "*.password",
        "cookie",
        "*.cookie",
        "message",
        "err.message",
        "error.message",
      ],
      censor: "[redacted]",
    },
  };
}

export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? "unmatched",
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        actorUserId: request.ctx?.userId ?? null,
        orgId: request.ctx?.orgId ?? null,
      },
      "request completed",
    );
  });
}
