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
import { careTeamPatientIds, isOnCareTeam } from "../../core/scope/repo.js";
import {
  countPatientTasks,
  countTasks,
  listPatientTasks,
  listTasks,
  rulesLastRunAt,
} from "./repo.js";
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
      const filter = { status: q.status, assignedPractitionerId: assigned, ruleKey: q.ruleKey };
      const rows = await listTasks(db, ctx, filter, offset, q.limit + 1);
      const page = pageFrom(rows, offset, q.limit);
      const mine = await careTeamPatientIds(
        db,
        ctx,
        page.items.map((r) => r.patientId),
      );
      return {
        items: page.items.map((r) => toReviewTask(r, at, mine.has(r.patientId))),
        nextCursor: page.nextCursor,
        total: await countTasks(db, ctx, filter),
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
      const onCareTeam = await isOnCareTeam(db, ctx, patientId);
      return {
        items: page.items.map((r) => toReviewTask(r, at, onCareTeam)),
        nextCursor: page.nextCursor,
        total: await countPatientTasks(db, ctx, patientId),
        lastCheckedAt: at.toISOString(),
        rulesLastRunAt: (await rulesLastRunAt(db, ctx, TIME_RULES_QUEUE))?.toISOString() ?? null,
      };
    },
  );
};
