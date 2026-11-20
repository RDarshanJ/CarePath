import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  checkInIdParamsSchema,
  checkInPageSchema,
  checkInSchema,
  cursorQuerySchema,
  patientIdParamsSchema,
} from "@carepath/shared/contracts";
import { AppError, errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { requireChild, requirePatientRead } from "../../core/scope/patient-scope.js";
import { findCheckIn, listCheckIns } from "./repo.js";

/** Check-in reads (delivery step 1). Create and review are in write-routes.ts. */
export const checkInRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db } = app.deps;

  app.get(
    "/patients/:patientId/check-ins",
    {
      config: { access: { permission: ["checkin.write_own", "clinical.read"] } },
      schema: {
        operationId: "listCheckIns",
        tags: ["check-ins"],
        summary: "Check-ins, newest first. Pain is patient-reported.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: checkInPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const rows = await listCheckIns(db, ctx, patientId, offset, request.query.limit + 1);
      return pageFrom(rows, offset, request.query.limit);
    },
  );

  app.get(
    "/patients/:patientId/check-ins/:checkInId",
    {
      config: { access: { permission: ["checkin.write_own", "clinical.read"] } },
      schema: {
        operationId: "getCheckIn",
        tags: ["check-ins"],
        summary: "One check-in. A pain task's source link points here (AC-D1).",
        params: checkInIdParamsSchema,
        response: { 200: checkInSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId, checkInId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      await requireChild(request, "PatientCheckIn", patientId, checkInId);
      const row = await findCheckIn(db, ctx, patientId, checkInId);
      if (!row) throw new AppError("not_found");
      return row;
    },
  );
};
