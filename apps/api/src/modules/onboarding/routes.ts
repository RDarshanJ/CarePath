import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import { hashPassword } from "@carepath/shared/password";
import { hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { createAccountRequestSchema, sessionInfoSchema } from "@carepath/shared/contracts";
import { openSession, setSessionCookie, toSessionInfo } from "../../core/auth/issue.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, dbErrorToCode, errorResponses } from "../../core/errors.js";
import { createPatientAccount, emailTaken, findUsableCode, redeemCode } from "./repo.js";

/**
 * POST /onboarding/accounts (C1 section 5.4, AC-A3). Code check, redemption, user, membership,
 * patient, intake and session are one transaction: an unknown, used or expired code, a taken
 * email or a lost redemption race leaves nothing behind.
 */
export const onboardingRoutes: FastifyPluginAsyncZod = async (app) => {
  const { config, db, audit, now } = app.deps;

  async function failed(request: FastifyRequest, detailCode: string) {
    await audit.fromRequest(request, {
      eventName: "account.create",
      action: "C",
      outcome: "minor_failure",
      orgId: null,
      actorUserId: null,
      actorRole: null,
      detailCode,
    });
  }

  app.post(
    "/onboarding/accounts",
    {
      config: {
        access: { auth: "public" },
        // Rate limited like login (PRD section 13): per address, codes cannot be brute-forced.
        rateLimit: {
          max: config.rateLimit.loginPerMinute,
          timeWindow: 60_000,
          keyGenerator: (request: FastifyRequest) => `onboarding:${request.ipHash}`,
        },
      },
      schema: {
        operationId: "createAccount",
        tags: ["onboarding"],
        security: [],
        summary:
          "Create a patient account with an eligibility code, in one step; signs the patient in.",
        body: createAccountRequestSchema,
        response: { 201: sessionInfoSchema, ...errorResponses(400, 403, 409, 429) },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const at = now();
      const code = await findUsableCode(db, hashEnrollmentCode(body.eligibilityCode), at);
      if (!code || !code.organization.active) {
        await failed(request, "eligibility_code_invalid");
        throw new AppError("eligibility_code_invalid");
      }
      const passwordHash = await hashPassword(body.password);
      try {
        const opened = await withTx(request, async ({ tx, audit: auditTx }) => {
          if (await emailTaken(tx, body.email)) throw new AppError("account_exists");
          const account = await createPatientAccount(tx, {
            orgId: code.organizationId,
            timezone: code.organization.timezone,
            email: body.email,
            passwordHash,
            givenName: body.givenName,
            familyName: body.familyName,
            birthDate: body.birthDate,
            now: at,
          });
          const redeemed = await redeemCode(tx, {
            codeId: code.id,
            orgId: code.organizationId,
            patientId: account.patientId,
            now: at,
          });
          if (!redeemed) throw new AppError("eligibility_code_invalid");
          const session = await openSession(tx, config, request, {
            userId: account.userId,
            orgId: code.organizationId,
            now: at,
          });
          await auditTx({
            eventName: "account.create",
            action: "C",
            outcome: "success",
            orgId: code.organizationId,
            actorUserId: account.userId,
            actorRole: "patient",
            resourceType: "Patient",
            resourceId: account.patientId,
            patientId: account.patientId,
            purposeOfUse: "patient_access",
          });
          return session;
        });
        setSessionCookie(config, reply, opened.token);
        return reply.code(201).send(toSessionInfo(config, opened.row, opened.idleExpiresAt));
      } catch (err) {
        const code =
          err instanceof AppError
            ? err.code
            : dbErrorToCode(err) === "already_exists"
              ? "account_exists"
              : null;
        if (code === "account_exists" || code === "eligibility_code_invalid") {
          await failed(request, code);
          throw new AppError(code);
        }
        throw err;
      }
    },
  );
};
