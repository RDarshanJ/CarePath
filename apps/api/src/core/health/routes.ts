import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { pingDatabase } from "../db/repo.js";

const healthSchema = z
  .object({
    status: z.enum(["ok", "unavailable"]),
    checks: z.object({ database: z.enum(["ok", "unavailable"]) }),
  })
  .meta({ id: "Health" });

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      config: { access: { auth: "public" } },
      schema: {
        operationId: "getHealth",
        tags: ["system"],
        security: [],
        summary: "Liveness and database reachability. 503 when the database does not answer.",
        response: { 200: healthSchema, 503: healthSchema },
      },
    },
    async (_request, reply) => {
      const dbOk = await pingDatabase(app.deps.db);
      const state = dbOk ? "ok" : "unavailable";
      return reply.code(dbOk ? 200 : 503).send({ status: state, checks: { database: state } });
    },
  );
};
