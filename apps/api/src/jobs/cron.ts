import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { Db } from "../core/db/repo.js";
import { AppError, errorResponses } from "../core/errors.js";
import { JobRunner, type JobHandler, type JobLogger, type RunStats } from "../core/jobs/runner.js";
import { createJobHandlers } from "./handlers.js";
import { enqueueRecurring } from "./schedule.js";

/**
 * Serverless job pass (ADR-4 on Vercel, docs/deployment.md). No worker loop survives between
 * requests on a Vercel Function, so a cron call does what the in-process loop does: enqueue the
 * recurring jobs for the current 15-minute slot (deduplicated, so extra calls are harmless), then
 * run due jobs until none are left or the time budget is spent. Jobs left over run on the next
 * pass; a job interrupted mid-run is recovered by the stale-lock reaper.
 */
export interface CronPassOptions {
  db: Db;
  now: () => Date;
  handlers: Record<string, JobHandler>;
  /** Enqueue the recurring jobs; returns how many were new. */
  enqueue: (db: Db, at: Date) => Promise<number>;
  budgetMs: number;
  logger?: JobLogger;
  /** Wall clock for the budget, separate from the (possibly fixed) application clock. */
  clock?: () => number;
}

export interface CronPassResult extends RunStats {
  enqueued: number;
  /** False when the budget ran out while jobs were still being claimed. */
  complete: boolean;
}

export async function runCronPass(options: CronPassOptions): Promise<CronPassResult> {
  const clock = options.clock ?? Date.now;
  const started = clock();
  const enqueued = await options.enqueue(options.db, options.now());
  const runner = new JobRunner({
    db: options.db,
    handlers: options.handlers,
    now: options.now,
    ...(options.logger ? { logger: options.logger } : {}),
  });
  const total: CronPassResult = {
    enqueued,
    claimed: 0,
    succeeded: 0,
    retried: 0,
    dead: 0,
    complete: false,
  };
  while (clock() - started < options.budgetMs) {
    const s = await runner.runOnce();
    total.claimed += s.claimed;
    total.succeeded += s.succeeded;
    total.retried += s.retried;
    total.dead += s.dead;
    if (s.claimed === 0) {
      total.complete = true;
      break;
    }
  }
  return total;
}

/** Constant-time comparison of the Authorization header with `Bearer <secret>`. */
export function bearerMatches(header: unknown, secret: string | null): boolean {
  if (!secret || typeof header !== "string") return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const cronResultSchema = z.object({
  enqueued: z.number().int(),
  claimed: z.number().int(),
  succeeded: z.number().int(),
  retried: z.number().int(),
  dead: z.number().int(),
  complete: z.boolean(),
});

export interface CronRouteOptions {
  /** Tests replace the handlers and the enqueue step so a pass never touches other files' jobs. */
  handlers?: Record<string, JobHandler>;
  enqueue?: (db: Db, at: Date) => Promise<number>;
}

export const cronRoutes: FastifyPluginAsyncZod<CronRouteOptions> = async (app, opts) => {
  app.get(
    "/internal/cron/jobs",
    {
      // No session: the caller is Vercel Cron. The bearer secret below is the only credential.
      config: { access: { auth: "public" } },
      schema: {
        operationId: "runCronJobs",
        tags: ["system"],
        security: [],
        summary:
          "Serverless job pass: enqueue recurring jobs, then run due jobs for a bounded time. Needs Authorization: Bearer CRON_SECRET.",
        response: { 200: cronResultSchema, ...errorResponses(401, 429) },
      },
    },
    async (request) => {
      const { config, db, now } = app.deps;
      if (!bearerMatches(request.headers.authorization, config.jobs.cronSecret)) {
        throw new AppError("unauthenticated");
      }
      const result = await runCronPass({
        db,
        now,
        handlers:
          opts.handlers ??
          createJobHandlers({
            db,
            now,
            forceMessageFailure: () => config.messaging.forceDeliveryFailure,
          }),
        enqueue: opts.enqueue ?? enqueueRecurring,
        budgetMs: config.jobs.cronBudgetMs,
        logger: request.log,
      });
      request.log.info({ ...result }, "cron pass finished");
      return result;
    },
  );
};
