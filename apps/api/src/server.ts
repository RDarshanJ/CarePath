import { buildApp } from "./app.js";
import { JobRunner } from "./core/jobs/runner.js";
import { jobHandlers } from "./jobs/handlers.js";

const port = Number(process.env["API_PORT"] ?? 4000);
const host = process.env["API_HOST"] ?? "127.0.0.1";

const app = await buildApp();
// ADR-4: the worker loop runs inside the API process. Set JOBS_WORKER=off to disable it.
const runner =
  process.env["JOBS_WORKER"] === "off"
    ? null
    : new JobRunner({ db: app.deps.db, handlers: jobHandlers, logger: app.log });

async function shutdown() {
  await runner?.stop();
  await app.close();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ port, host });
  runner?.start();
} catch (err) {
  app.log.error({ err }, "failed to start");
  process.exit(1);
}
