import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  exerciseLibraryPageSchema,
  exerciseLibraryQuerySchema,
  type ExerciseLibraryPage,
} from "@carepath/shared/contracts";
import { requireCtx } from "../../core/context.js";
import { errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { listExercises } from "./repo.js";

export const exerciseRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/exercises",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "listExercises",
        tags: ["exercises"],
        summary:
          "Exercise library with search and filters. Fictional content, not medically reviewed.",
        querystring: exerciseLibraryQuerySchema,
        response: { 200: exerciseLibraryPageSchema, ...errorResponses(400, 401, 403, 429) },
      },
    },
    async (request): Promise<ExerciseLibraryPage> => {
      const ctx = requireCtx(request.ctx);
      const { q, bodyArea, category, cursor, limit } = request.query;
      const offset = decodeCursor(cursor);
      const rows = await listExercises(
        app.deps.db,
        ctx,
        { q, bodyArea, category },
        offset,
        limit + 1,
      );
      const page = pageFrom(rows, offset, limit);
      return {
        items: page.items.map((e) => ({
          id: e.id,
          slug: e.slug,
          name: e.name,
          bodyArea: e.bodyArea,
          category: e.category,
          description: e.description,
          instructions: e.instructions,
          mediaPath: e.mediaPath,
          defaults: {
            sets: e.defaultSets,
            reps: e.defaultReps,
            holdSeconds: e.defaultHoldSeconds,
            durationSeconds: e.defaultDurationSeconds,
          },
        })),
        nextCursor: page.nextCursor,
      };
    },
  );
};
