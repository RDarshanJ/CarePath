import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { AppError } from "./errors.js";

/**
 * Transport concerns: cookies, CORS allow-list, response headers, in-memory rate limiting.
 * The rate limiter is per process (ADR-4); a second API instance would need a shared store.
 */
export async function registerHttp(app: FastifyInstance): Promise<void> {
  const { config } = app.deps;

  await app.register(cookie);

  await app.register(cors, {
    // Exact-match allow-list. Credentials are needed for the session cookie, so "*" is never used.
    origin: (origin, cb) => {
      if (!origin) return cb(null, false);
      cb(null, config.allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["content-type", "x-csrf-token"],
    exposedHeaders: ["x-request-id", "retry-after"],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.globalPerMinute,
    timeWindow: 60_000,
    // Checkpoint C2, F3: the key is the session id when the request carries a valid session and the
    // client address otherwise. Server-rendered pages reach the API from the web server, so an address
    // key alone puts every signed-in user in one bucket. The plugin adds its check as a route-level
    // onRequest hook, which runs after the app-level access hook has loaded `request.ctx`.
    // Sign-in and account creation keep their own per-address limits (route config).
    keyGenerator: (request) =>
      request.ctx ? `session:${request.ctx.sessionId}` : `address:${request.ip}`,
    errorResponseBuilder: () => new AppError("rate_limited"),
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-frame-options", "DENY");
    reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    reply.header("cross-origin-resource-policy", "same-site");
    // Responses can carry patient data; nothing may be cached by browsers or proxies.
    reply.header("cache-control", "no-store");
    return payload;
  });
}
