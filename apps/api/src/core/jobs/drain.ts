/**
 * `pnpm jobs:drain`: run every due job for the registered queues, then exit (ADR-4).
 * Exit code 1 when any job was dead-lettered in this run.
 */
import { loadConfig } from "../../config.js";
import { createJobHandlers } from "../../jobs/handlers.js";
import { clockFromEnv } from "../clock.js";
import { createDb } from "../db/repo.js";
import { JobRunner } from "./runner.js";

const config = loadConfig();
const db = createDb(config.databaseUrl);
const { now } = clockFromEnv(process.env);
try {
  const stats = await new JobRunner({
    db,
    handlers: createJobHandlers({
      db,
      now,
      forceMessageFailure: () => config.messaging.forceDeliveryFailure,
    }),
    now,
  }).drain();
  console.log(
    `jobs:drain claimed=${stats.claimed} succeeded=${stats.succeeded} retried=${stats.retried} dead=${stats.dead}`,
  );
  process.exitCode = stats.dead > 0 ? 1 : 0;
} finally {
  await db.$disconnect();
}
