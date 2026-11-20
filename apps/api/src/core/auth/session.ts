import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieSerializeOptions } from "@fastify/cookie";
import type { AppConfig } from "../../config.js";
import type { SessionRow } from "./repo.js";

/**
 * Session primitives (ADR-7). The cookie holds 32 random bytes; the database stores only a
 * SHA-256 of it, so a database read does not yield a usable cookie.
 */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function cookieOptions(config: AppConfig, maxAgeSeconds: number): CookieSerializeOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookie.secure,
    maxAge: maxAgeSeconds,
  };
}

/**
 * CSRF token for the session: HMAC(secret, session id). Stateless, so no schema change; it is
 * returned by login and GET /auth/session and must come back in `x-csrf-token` on every
 * mutating request made with the session cookie.
 */
export function csrfTokenFor(config: AppConfig, sessionId: string): string {
  return createHmac("sha256", config.sessionSecret).update(`csrf:${sessionId}`).digest("base64url");
}

export function csrfTokenMatches(config: AppConfig, sessionId: string, given: unknown): boolean {
  if (typeof given !== "string" || given.length === 0 || given.length > 128) return false;
  const expected = Buffer.from(csrfTokenFor(config, sessionId));
  const actual = Buffer.from(given);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashIp(config: AppConfig, ip: string): string {
  return createHmac("sha256", config.sessionSecret).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export type SessionState =
  | { ok: true; idleExpiresAt: Date }
  | { ok: false; reason: "revoked" | "expired" | "idle" | "inactive" };

/** Idle and absolute timeouts plus account, membership and organization state. */
export function evaluateSession(config: AppConfig, row: SessionRow, now: Date): SessionState {
  if (row.revokedAt) return { ok: false, reason: "revoked" };
  if (now >= row.expiresAt) return { ok: false, reason: "expired" };
  const idleExpiresAt = new Date(row.lastSeenAt.getTime() + config.session.idleTimeoutMs);
  if (now >= idleExpiresAt) return { ok: false, reason: "idle" };
  if (
    row.membership.status !== "active" ||
    row.membership.user.status !== "active" ||
    !row.organization.active
  ) {
    return { ok: false, reason: "inactive" };
  }
  return { ok: true, idleExpiresAt };
}
