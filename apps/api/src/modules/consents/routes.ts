import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  CONSENT_TEXT_VERSIONS,
  consentGrantRequestSchema,
  consentIdParamsSchema,
  consentListSchema,
  consentRevokeRequestSchema,
  consentSchema,
  consentTypeSchema,
  patientIdParamsSchema,
  type ConsentList,
} from "@carepath/shared/contracts";
import { withTx } from "../../core/db/tx.js";
import { AppError, dbErrorToCode, errorResponses } from "../../core/errors.js";
import {
  requireChild,
  requirePatientRead,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import {
  findActiveConsent,
  findConsent,
  grantConsent,
  listConsents,
  revokeConsent,
  toConsent,
} from "./repo.js";

/**
 * Sharing and consent (REQ-CON-01). Patients grant and revoke their own optional consent; the
 * required consent is withdrawn through the clinic (Q4), so revoking it answers 409
 * `consent_required_type`. Grants and revocations are audited with the change.
 */
const REQUIRED = "treatment_and_data_use";

export const consentRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/patients/:patientId/consents",
    {
      config: { access: { permission: ["consent.manage_own", "consent.read"] } },
      schema: {
        operationId: "listConsents",
        tags: ["onboarding"],
        summary: "Each consent type with its active row, and every change, newest first.",
        params: patientIdParamsSchema,
        response: { 200: consentListSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<ConsentList> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const history = (await listConsents(db, ctx, patientId)).map(toConsent);
      return {
        types: consentTypeSchema.options.map((type) => ({
          type,
          required: type === REQUIRED,
          grantable: type !== "motion_tracking",
          currentTextVersion: CONSENT_TEXT_VERSIONS[type],
          active: history.find((c) => c.type === type && c.status === "active") ?? null,
        })),
        history,
      };
    },
  );

  app.post(
    "/patients/:patientId/consents",
    {
      config: { access: { permission: "consent.manage_own" } },
      schema: {
        operationId: "grantConsent",
        tags: ["onboarding"],
        summary: "Grant a consent at its current text version; audited.",
        params: patientIdParamsSchema,
        body: consentGrantRequestSchema,
        response: { 201: consentSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      const { type, textVersion } = request.body;
      if (textVersion !== CONSENT_TEXT_VERSIONS[type]) {
        throw new AppError("validation_error", [
          {
            path: "body.textVersion",
            issue: "outdated_text",
            message: "Show the current consent text.",
          },
        ]);
      }
      try {
        const consent = await withTx(request, async ({ tx, audit }) => {
          if (await findActiveConsent(tx, ctx, patientId, type))
            throw new AppError("already_exists");
          const row = await grantConsent(tx, ctx, {
            patientId,
            type,
            userId: ctx.userId,
            now: now(),
          });
          await audit({
            eventName: "consent.grant",
            action: "C",
            outcome: "success",
            resourceType: "Consent",
            resourceId: row.id,
            patientId,
            purposeOfUse: "patient_access",
            metadata: { type, textVersion },
          });
          return toConsent(row);
        });
        return reply.code(201).send(consent);
      } catch (err) {
        if (dbErrorToCode(err) === "already_exists") throw new AppError("already_exists");
        throw err;
      }
    },
  );

  app.post(
    "/patients/:patientId/consents/:consentId/revoke",
    {
      config: { access: { permission: "consent.manage_own" } },
      schema: {
        operationId: "revokeConsent",
        tags: ["onboarding"],
        summary:
          "Revoke an optional consent; audited. The required consent is withdrawn through the clinic.",
        params: consentIdParamsSchema,
        body: consentRevokeRequestSchema,
        response: { 200: consentSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request) => {
      const { patientId, consentId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: false });
      await requireChild(request, "Consent", patientId, consentId);
      return withTx(request, async ({ tx, audit }) => {
        const consent = await findConsent(tx, ctx, patientId, consentId);
        if (!consent) throw new AppError("not_found");
        if (consent.type === REQUIRED) throw new AppError("consent_required_type");
        if (!(await revokeConsent(tx, ctx, patientId, consentId, now()))) {
          throw new AppError("invalid_transition");
        }
        await audit({
          eventName: "consent.revoke",
          action: "U",
          outcome: "success",
          resourceType: "Consent",
          resourceId: consentId,
          patientId,
          purposeOfUse: "patient_access",
          metadata: { type: consent.type },
        });
        return toConsent((await findConsent(tx, ctx, patientId, consentId))!);
      });
    },
  );
};
