import type { FastifyBaseLogger } from "fastify";
import type { AppDeps } from "../../core/context.js";
import { JobRunner, safeErrorText } from "../../core/jobs/runner.js";
import { MESSAGE_DELIVER_QUEUE, messageDeliveryHandler } from "./delivery.js";

/**
 * Inline delivery (JOBS_INLINE=1, docs/deployment.md). On a serverless deployment no worker loop
 * runs between requests, so the send and retry routes run the delivery job they just enqueued,
 * after their transaction has committed. Only that job is claimed, through the normal runner, so
 * attempts, backoff and the dead-letter state behave as they do for the worker. A failure here is
 * logged and left to the next cron pass; it never fails the request that sent the message.
 */
export async function deliverInline(
  deps: AppDeps,
  log: FastifyBaseLogger,
  jobId: string | null,
): Promise<void> {
  if (!deps.config.jobs.inline || !jobId) return;
  const runner = new JobRunner({
    db: deps.db,
    now: deps.now,
    handlers: {
      [MESSAGE_DELIVER_QUEUE]: messageDeliveryHandler({
        db: deps.db,
        now: deps.now,
        forceFailure: () => deps.config.messaging.forceDeliveryFailure,
      }),
    },
    logger: log,
  });
  try {
    await runner.runOnce({ ids: [jobId] });
  } catch (err) {
    log.error({ jobId, error: safeErrorText(err) }, "inline message delivery failed");
  }
}
