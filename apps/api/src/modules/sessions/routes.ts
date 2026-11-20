import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  cursorQuerySchema,
  exerciseSessionDetailSchema,
  exerciseSessionPageSchema,
  patientIdParamsSchema,
  sessionIdParamsSchema,
} from "@carepath/shared/contracts";
import { AppError, errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { requireChild, requirePatientRead } from "../../core/scope/patient-scope.js";
import { findSessionDetail, listSessions } from "./repo.js";
import { toSessionDetail, toSessionSummary } from "./view.js";

/** Session reads (delivery step 1). Writes are in write-routes.ts. */
export const sessionRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db } = app.deps;

  app.get(
    "/patients/:patientId/sessions",
    {
      config: { access: { permission: ["session.write_own", "clinical.read"] } },
      schema: {
        operationId: "listSessions",
        tags: ["sessions"],
        summary: "Exercise sessions, newest first.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: exerciseSessionPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const rows = await listSessions(db, ctx, patientId, offset, request.query.limit + 1);
      const page = pageFrom(rows, offset, request.query.limit);
      return { items: page.items.map(toSessionSummary), nextCursor: page.nextCursor };
    },
  );

  app.get(
    "/patients/:patientId/sessions/:sessionId",
    {
      config: { access: { permission: ["session.write_own", "clinical.read"] } },
      schema: {
        operationId: "getExerciseSession",
        tags: ["sessions"],
        summary: "One session with its plan version, activities, position and elapsed time.",
        params: sessionIdParamsSchema,
        response: { 200: exerciseSessionDetailSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request) => {
      const { patientId, sessionId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      await requireChild(request, "ExerciseSession", patientId, sessionId);
      const row = await findSessionDetail(db, ctx, patientId, sessionId);
      if (!row) throw new AppError("not_found");
      return toSessionDetail(row);
    },
  );
};
