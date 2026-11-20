import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionInfo } from "@carepath/shared/contracts";
import type { AppConfig } from "../../config.js";
import { isPermission, type RoleKey } from "../authz/permissions.js";
import type { DbTx } from "../db/repo.js";
import { createSession, findSessionByTokenHash, type SessionRow } from "./repo.js";
import {
  cookieOptions,
  csrfTokenFor,
  evaluateSession,
  hashToken,
  newSessionToken,
} from "./session.js";

export function toSessionInfo(
  config: AppConfig,
  row: SessionRow,
  idleExpiresAt: Date,
): SessionInfo {
  return {
    user: {
      id: row.membership.user.id,
      displayName: row.membership.user.displayName,
      email: row.membership.user.email,
    },
    organization: {
      id: row.organization.id,
      name: row.organization.name,
      slug: row.organization.slug,
    },
    role: row.membership.role.key as RoleKey,
    permissions: row.membership.role.permissions.filter(isPermission),
    patientId: row.membership.role.key === "patient" ? (row.membership.patient?.id ?? null) : null,
    practitionerId: row.membership.practitioner?.id ?? null,
    csrfToken: csrfTokenFor(config, row.id),
    expiresAt: row.expiresAt.toISOString(),
    idleExpiresAt: idleExpiresAt.toISOString(),
  };
}

/**
 * Creates a session inside the caller's transaction and returns what the response and cookie
 * need. Used by login and by account creation (which signs the new patient in).
 */
export async function openSession(
  tx: DbTx,
  config: AppConfig,
  request: FastifyRequest,
  input: { userId: string; orgId: string; now: Date },
): Promise<{ token: string; row: SessionRow; idleExpiresAt: Date }> {
  const token = newSessionToken();
  await createSession(tx, {
    orgId: input.orgId,
    userId: input.userId,
    tokenHash: hashToken(token),
    now: input.now,
    expiresAt: new Date(input.now.getTime() + config.session.absoluteTimeoutMs),
    userAgent: request.headers["user-agent"] ?? null,
  });
  const row = await findSessionByTokenHash(tx, hashToken(token));
  const state = row ? evaluateSession(config, row, input.now) : null;
  if (!row || !state?.ok) throw new Error("session was not readable after creation");
  return { token, row, idleExpiresAt: state.idleExpiresAt };
}

export function setSessionCookie(config: AppConfig, reply: FastifyReply, token: string): void {
  reply.setCookie(
    config.cookie.name,
    token,
    cookieOptions(config, Math.floor(config.session.absoluteTimeoutMs / 1000)),
  );
}
