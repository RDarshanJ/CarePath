import { buildApp } from "./app.js";
import { clockFromEnv } from "./core/clock.js";
import { JobRunner } from "./core/jobs/runner.js";
import { createJobHandlers } from "./jobs/handlers.js";
import { enqueueRecurring, RECURRING_INTERVAL_MS } from "./jobs/schedule.js";

const port = Number(process.env["API_PORT"] ?? 4000);
const host = process.env["API_HOST"] ?? "127.0.0.1";

// Checkpoint C1, ruling 3.8: gates fix the clock to the seed anchor (never in production).
const clock = clockFromEnv(process.env);
const app = await buildApp({ now: clock.now });
if (clock.warning) app.log.warn(clock.warning);
// ADR-4: the worker loop runs inside the API process. Set JOBS_WORKER=off to disable it.
const runner =
  process.env["JOBS_WORKER"] === "off"
    ? null
    : new JobRunner({
        db: app.deps.db,
        handlers: createJobHandlers({
          db: app.deps.db,
          now: clock.now,
          forceMessageFailure: () => app.deps.config.messaging.forceDeliveryFailure,
        }),
        now: clock.now,
        logger: app.log,
      });
// Time-based review rules and session abandonment run every 15 minutes per organization.
let scheduler: NodeJS.Timeout | undefined;
async function schedule() {
  try {
    await enqueueRecurring(app.deps.db, clock.now());
  } catch (err) {
    app.log.error({ err }, "recurring job enqueue failed");
  }
}

async function shutdown() {
  clearInterval(scheduler);
  await runner?.stop();
  await app.close();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ port, host });
  if (runner) {
    await schedule();
    scheduler = setInterval(() => void schedule(), RECURRING_INTERVAL_MS);
    runner.start();
  }
} catch (err) {
  app.log.error({ err }, "failed to start");
  process.exit(1);
}
