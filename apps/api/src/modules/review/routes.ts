import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  cursorQuerySchema,
  patientIdParamsSchema,
  reviewTaskPageSchema,
  reviewTaskQuerySchema,
  type ReviewTaskPage,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { requirePatientRead } from "../../core/scope/patient-scope.js";
import { listPatientTasks, listTasks, rulesLastRunAt } from "./repo.js";
import { TIME_RULES_QUEUE } from "./queues.js";
import { toReviewTask } from "./view.js";

/** Review queue reads (delivery step 3). Task actions and rules are in action-routes.ts. */
export const reviewRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, now } = app.deps;

  app.get(
    "/review-tasks",
    {
      config: { access: { permission: "review_task.read" } },
      schema: {
        operationId: "listReviewTasks",
        tags: ["review"],
        summary:
          "The organization's review queue, highest priority then oldest first. Rule-based; no score.",
        querystring: reviewTaskQuerySchema,
        response: { 200: reviewTaskPageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<ReviewTaskPage> => {
      const ctx = requireCtx(request.ctx);
      const q = request.query;
      const offset = decodeCursor(q.cursor);
      const at = now();
      const assigned =
        q.assignedTo === undefined
          ? undefined
          : q.assignedTo === "unassigned"
            ? null
            : q.assignedTo === "me"
              ? // Staff without a practitioner profile are never assigned; match nothing.
                (ctx.practitionerId ?? "00000000-0000-0000-0000-000000000000")
              : q.assignedTo;
      const rows = await listTasks(
        db,
        ctx,
        { status: q.status, assignedPractitionerId: assigned, ruleKey: q.ruleKey },
        offset,
        q.limit + 1,
      );
      const page = pageFrom(rows, offset, q.limit);
      return {
        items: page.items.map((r) => toReviewTask(r, at)),
        nextCursor: page.nextCursor,
        lastCheckedAt: at.toISOString(),
        rulesLastRunAt: (await rulesLastRunAt(db, ctx, TIME_RULES_QUEUE))?.toISOString() ?? null,
      };
    },
  );

  app.get(
    "/patients/:patientId/review-tasks",
    {
      config: { access: { permission: "review_task.read" } },
      schema: {
        operationId: "listPatientReviewTasks",
        tags: ["review"],
        summary: "Every review task of one patient, newest first.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: reviewTaskPageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<ReviewTaskPage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const at = now();
      const rows = await listPatientTasks(db, ctx, patientId, offset, request.query.limit + 1);
      const page = pageFrom(rows, offset, request.query.limit);
      return {
        items: page.items.map((r) => toReviewTask(r, at)),
        nextCursor: page.nextCursor,
        lastCheckedAt: at.toISOString(),
        rulesLastRunAt: (await rulesLastRunAt(db, ctx, TIME_RULES_QUEUE))?.toISOString() ?? null,
      };
    },
  );
};
