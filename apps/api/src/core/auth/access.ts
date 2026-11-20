import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isPermission, type Permission, type RoleKey } from "../authz/permissions.js";
import type { RequestCtx } from "../context.js";
import { AppError } from "../errors.js";
import { findSessionByTokenHash, revokeSession, touchSession } from "./repo.js";
import { csrfTokenMatches, evaluateSession, hashIp, hashToken } from "./session.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function auditActionFor(method: string): "C" | "R" | "U" | "D" {
  if (method === "POST") return "C";
  if (method === "PUT" || method === "PATCH") return "U";
  if (method === "DELETE") return "D";
  return "R";
}

function requestOrigin(request: FastifyRequest): string | null {
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin !== "null") return origin;
  const referer = request.headers.referer;
  if (typeof referer === "string") {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Access hooks, in order, on every request (deny by default):
 *   1. Origin check on mutating methods (ADR-7). A missing or unlisted Origin is refused, so a
 *      cross-site form post cannot ride the session cookie even where SameSite=Lax allows it.
 *   2. Session load from the HttpOnly cookie, with idle and absolute timeouts.
 *   3. Authentication: routes without `access.auth = "public"` need a session (401).
 *   4. CSRF token on mutating session requests (double check alongside Origin).
 *   5. Route permission (403 and a `security.access_denied` audit event).
 * Object scope (organization, own patient, care team) is checked later by the scoped
 * repositories, because it needs the object id.
 */
export function registerAccessHooks(app: FastifyInstance): void {
  app.decorateRequest("ctx", null);
  app.decorateRequest("ipHash", "");

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const { config, db, audit, now } = app.deps;
    request.ipHash = hashIp(config, request.ip);
    if (request.method === "OPTIONS") return;

    if (MUTATING.has(request.method)) {
      const origin = requestOrigin(request);
      if (!origin || !config.allowedOrigins.includes(origin)) {
        throw new AppError("origin_rejected");
      }
    }

    const access = request.routeOptions.config.access ?? {};
    const isPublic = access.auth === "public";

    let endedReason: string | null = null;
    const token = request.cookies[config.cookie.name];
    if (token) {
      const row = await findSessionByTokenHash(db, hashToken(token));
      const at = now();
      const state = row ? evaluateSession(config, row, at) : null;
      if (row && state?.ok) {
        const role = row.membership.role.key as RoleKey;
        request.ctx = {
          requestId: request.id,
          sessionId: row.id,
          userId: row.userId,
          orgId: row.organizationId,
          role,
          permissions: new Set(row.membership.role.permissions.filter(isPermission)),
          patientId: role === "patient" ? (row.membership.patient?.id ?? null) : null,
          practitionerId: row.membership.practitioner?.id ?? null,
        } satisfies RequestCtx;
        if (at.getTime() - row.lastSeenAt.getTime() >= config.session.touchIntervalMs) {
          await touchSession(db, row.id, at);
        }
      } else {
        endedReason = state && !state.ok ? state.reason : "unknown";
        if (row && !row.revokedAt) await revokeSession(db, row.id, at);
        reply.clearCookie(config.cookie.name, { path: "/" });
      }
    }

    if (isPublic) return;

    const ctx = request.ctx;
    if (!ctx) {
      throw new AppError(
        endedReason === "idle" || endedReason === "expired" ? "session_expired" : "unauthenticated",
      );
    }

    if (MUTATING.has(request.method)) {
      if (!csrfTokenMatches(config, ctx.sessionId, request.headers["x-csrf-token"])) {
        throw new AppError("csrf_failed");
      }
    }

    const required = access.permission;
    if (required !== undefined) {
      const anyOf: readonly Permission[] = typeof required === "string" ? [required] : required;
      if (!anyOf.some((p) => ctx.permissions.has(p))) {
        await audit.fromRequest(request, {
          eventName: "security.access_denied",
          action: auditActionFor(request.method),
          outcome: "minor_failure",
          detailCode: "missing_permission",
          metadata: { permission: anyOf.join("|") },
        });
        throw new AppError("forbidden");
      }
    }
  });
}
