import { hashPassword, verifyPassword } from "@carepath/shared/password";
import type { FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { RoleKey } from "../authz/permissions.js";
import { requireCtx } from "../context.js";
import { withTx } from "../db/tx.js";
import { AppError, errorResponses } from "../errors.js";
import { loginBodySchema, sessionInfoSchema } from "@carepath/shared/contracts";
import { openSession, setSessionCookie, toSessionInfo } from "./issue.js";
import {
  findSessionByTokenHash,
  findUserForLogin,
  recordLogin,
  revokeSession,
  revokeSessionByTokenHash,
  type SessionRow,
} from "./repo.js";
import { evaluateSession, hashToken } from "./session.js";

let dummyHash: Promise<string> | undefined;
/** Unknown emails still pay for one scrypt run, so timing does not reveal which accounts exist. */
function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password-for-timing-only");
  return dummyHash;
}

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { config, db, audit, now } = app.deps;

  const sessionInfo = (row: SessionRow, idle: Date) => toSessionInfo(config, row, idle);

  async function failLogin(request: FastifyRequest, userId: string | null, detailCode: string) {
    // No email in the event: an unknown address may be a typo of someone else's.
    await audit.fromRequest(request, {
      eventName: "auth.login_failed",
      action: "E",
      outcome: "minor_failure",
      orgId: null,
      actorUserId: userId,
      actorRole: null,
      detailCode,
    });
  }

  app.post(
    "/auth/login",
    {
      config: {
        access: { auth: "public" },
        // PRD section 13: 10 attempts per minute per account and IP. Runs after body
        // validation so the key can include the normalised email.
        rateLimit: {
          max: config.rateLimit.loginPerMinute,
          timeWindow: 60_000,
          hook: "preHandler",
          keyGenerator: (request: FastifyRequest) => {
            const body = request.body as { email?: unknown } | undefined;
            const email = typeof body?.email === "string" ? body.email : "";
            return `login:${request.ipHash}:${hashToken(email)}`;
          },
        },
      },
      schema: {
        operationId: "login",
        tags: ["auth"],
        security: [],
        summary: "Sign in with email and password; sets the session cookie.",
        body: loginBodySchema,
        response: { 200: sessionInfoSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request, reply) => {
      const { email, password, organizationSlug } = request.body;
      const user = await findUserForLogin(db, email);
      const passwordOk = await verifyPassword(
        password,
        user?.passwordHash ?? (await dummyPasswordHash()),
      );
      if (!user || !passwordOk) {
        await failLogin(request, user?.id ?? null, user ? "bad_password" : "unknown_account");
        throw new AppError("invalid_credentials");
      }
      if (user.status !== "active" || user.memberships.length === 0) {
        await failLogin(request, user.id, "account_inactive");
        throw new AppError("invalid_credentials");
      }
      const membership = organizationSlug
        ? user.memberships.find((m) => m.organization.slug === organizationSlug)
        : user.memberships.length === 1
          ? user.memberships[0]
          : undefined;
      if (!membership) {
        if (organizationSlug) {
          await failLogin(request, user.id, "organization_mismatch");
          throw new AppError("invalid_credentials");
        }
        throw new AppError("organization_required");
      }

      const at = now();
      // Session, last-login time and the audit event commit together (checkpoint C1, M4).
      const opened = await withTx(request, async ({ tx, audit }) => {
        // Rotation: a session presented with the login request is ended, never reused.
        const presented = request.cookies[config.cookie.name];
        if (presented) await revokeSessionByTokenHash(tx, hashToken(presented), at);
        const session = await openSession(tx, config, request, {
          userId: user.id,
          orgId: membership.organizationId,
          now: at,
        });
        await recordLogin(tx, user.id, at);
        await audit({
          eventName: "auth.login",
          action: "E",
          outcome: "success",
          orgId: session.row.organizationId,
          actorUserId: user.id,
          actorRole: session.row.membership.role.key as RoleKey,
          resourceType: "AuthSession",
          resourceId: session.row.id,
        });
        return session;
      });
      setSessionCookie(config, reply, opened.token);
      return sessionInfo(opened.row, opened.idleExpiresAt);
    },
  );

  app.post(
    "/auth/logout",
    {
      config: { access: { auth: "session" } },
      schema: {
        operationId: "logout",
        tags: ["auth"],
        summary: "End the current session and clear the cookie.",
        response: { 204: z.undefined(), ...errorResponses(401, 403, 429) },
      },
    },
    async (request, reply) => {
      const ctx = requireCtx(request.ctx);
      await withTx(request, async ({ tx, audit }) => {
        await revokeSession(tx, ctx.sessionId, now());
        await audit({
          eventName: "auth.logout",
          action: "E",
          outcome: "success",
          resourceType: "AuthSession",
          resourceId: ctx.sessionId,
        });
      });
      reply.clearCookie(config.cookie.name, { path: "/" });
      return reply.code(204).send();
    },
  );

  app.get(
    "/auth/session",
    {
      config: { access: { auth: "session" } },
      schema: {
        operationId: "getSession",
        tags: ["auth"],
        summary: "The signed-in user, organization, role, permissions and CSRF token.",
        response: { 200: sessionInfoSchema, ...errorResponses(401, 429) },
      },
    },
    async (request) => {
      const token = request.cookies[config.cookie.name] ?? "";
      const row = await findSessionByTokenHash(db, hashToken(token));
      const state = row ? evaluateSession(config, row, now()) : null;
      if (!row || !state?.ok) throw new AppError("unauthenticated");
      return sessionInfo(row, state.idleExpiresAt);
    },
  );
};
