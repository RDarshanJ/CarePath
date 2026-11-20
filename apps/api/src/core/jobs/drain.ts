/**
 * `pnpm jobs:drain`: run every due job for the registered queues, then exit (ADR-4).
 * Exit code 1 when any job was dead-lettered in this run.
 */
import { loadConfig } from "../../config.js";
import { jobHandlers } from "../../jobs/handlers.js";
import { createDb } from "../db/repo.js";
import { JobRunner } from "./runner.js";

const db = createDb(loadConfig().databaseUrl);
try {
  const stats = await new JobRunner({ db, handlers: jobHandlers }).drain();
  console.log(
    `jobs:drain claimed=${stats.claimed} succeeded=${stats.succeeded} retried=${stats.retried} dead=${stats.dead}`,
  );
  process.exitCode = stats.dead > 0 ? 1 : 0;
} finally {
  await db.$disconnect();
}
