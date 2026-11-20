import Fastify, { type FastifyInstance } from "fastify";

/**
 * App factory. Tests use `app.inject()` so no listening server is needed (ADR-2).
 * Feature modules are registered here by later work packages (src/modules/*, src/core/*).
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env["NODE_ENV"] !== "test" });

  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
