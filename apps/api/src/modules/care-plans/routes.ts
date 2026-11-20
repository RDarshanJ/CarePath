import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  carePlanVersionDetailSchema,
  carePlanVersionListSchema,
  patientCarePlanSchema,
  patientIdParamsSchema,
  planChangeAcknowledgeSchema,
  versionIdParamsSchema,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { practitionerRef } from "../../core/people.js";
import { recordPhiRead, requireChild, requirePatientRead } from "../../core/scope/patient-scope.js";
import {
  findOpenPlan,
  findVersion,
  listVersions,
  markPlanNoticeRead,
  patientUserId,
} from "./repo.js";
import { publishedView } from "./view.js";

/** Patient-facing plan reads (delivery step 1). Draft and publish routes are in draft-routes.ts. */
export const carePlanRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;
  const readAccess = { permission: ["careplan.read_own", "clinical.read"] as const };

  app.get(
    "/patients/:patientId/care-plan",
    {
      config: { access: { permission: [...readAccess.permission] } },
      schema: {
        operationId: "getPatientCarePlan",
        tags: ["care-plan"],
        summary:
          "The current published plan version with change note and diff; plan is null when none is published.",
        params: patientIdParamsSchema,
        response: { 200: patientCarePlanSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const plan = await findOpenPlan(db, ctx, patientId);
      const version = plan?.currentVersionId
        ? await findVersion(db, ctx, patientId, plan.currentVersionId)
        : null;
      await recordPhiRead(request, patientId, "CarePlan", plan?.id ?? patientId);
      return { plan: version ? await publishedView(db, ctx, patientId, version) : null };
    },
  );

  app.get(
    "/patients/:patientId/care-plan/versions",
    {
      config: { access: { permission: [...readAccess.permission] } },
      schema: {
        operationId: "listCarePlanVersions",
        tags: ["care-plan"],
        summary: "Every published version with author, time and change note, newest first.",
        params: patientIdParamsSchema,
        response: { 200: carePlanVersionListSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const rows = await listVersions(db, ctx, patientId);
      return {
        items: rows.map((v) => ({
          id: v.id,
          number: v.versionNumber,
          publishedAt: v.publishedAt.toISOString(),
          publishedBy: practitionerRef(v.publishedBy),
          changeNoteForPatient: v.changeNoteForPatient,
          isCurrent: v.carePlan.currentVersionId === v.id,
        })),
      };
    },
  );

  app.get(
    "/patients/:patientId/care-plan/versions/:versionId",
    {
      config: { access: { permission: [...readAccess.permission] } },
      schema: {
        operationId: "getCarePlanVersion",
        tags: ["care-plan"],
        summary: "One published version, through the same serializer as the patient plan.",
        params: versionIdParamsSchema,
        response: { 200: carePlanVersionDetailSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId, versionId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      await requireChild(request, "CarePlanVersion", patientId, versionId);
      const version = await findVersion(db, ctx, patientId, versionId);
      if (!version) throw new AppError("not_found");
      await recordPhiRead(request, patientId, "CarePlanVersion", versionId);
      return publishedView(db, ctx, patientId, version);
    },
  );

  app.post(
    "/patients/:patientId/care-plan/versions/:versionId/acknowledge",
    {
      config: { access: { permission: "careplan.read_own" } },
      schema: {
        operationId: "acknowledgePlanChange",
        tags: ["care-plan"],
        summary: "Hide the plan-change explanation on Today for this version (REQ-TOD-02).",
        params: versionIdParamsSchema,
        body: planChangeAcknowledgeSchema,
        response: { 204: z.undefined(), ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request, reply) => {
      const { patientId, versionId } = request.params;
      await requirePatientRead(request, patientId);
      await requireChild(request, "CarePlanVersion", patientId, versionId);
      await withTx(request, async ({ tx, ctx }) => {
        const scope = requireCtx(ctx);
        const userId = await patientUserId(tx, scope, patientId);
        if (userId) await markPlanNoticeRead(tx, scope, userId, versionId, now());
      });
      return reply.code(204).send();
    },
  );
};
