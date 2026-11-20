import type { Db } from "../../core/db/repo.js";
import { JobError, type JobHandler } from "../../core/jobs/runner.js";
import { markFailed, markSent } from "./repo.js";

export const MESSAGE_DELIVER_QUEUE = "messages.deliver";

/** Plain reason the sender sees on a failed message. */
export const DELIVERY_FAILED_REASON = "This message could not be delivered. You can try again.";

export interface MessageDeliveryDeps {
  db: Db;
  now: () => Date;
  /**
   * Non-production test hook: when it returns true every delivery fails, so the failed state and
   * the retry path can be exercised. The API wires it to MESSAGE_FORCE_FAILURE, which is ignored
   * in production.
   */
  forceFailure?: () => boolean;
}

/**
 * Delivery job (ADR-4). Scoped by job.organizationId. Marks one queued message `sent`, or
 * `failed` when delivery is forced to fail or the last attempt errors. Idempotent: a message
 * that is no longer queued is left alone.
 */
export function messageDeliveryHandler(deps: MessageDeliveryDeps): JobHandler {
  return async (job) => {
    if (!job.organizationId) throw new JobError("job has no organizationId");
    const scope = { orgId: job.organizationId };
    const messageId = (job.payload as { messageId?: unknown } | null)?.messageId;
    if (typeof messageId !== "string") throw new JobError("job has no messageId");
    try {
      if (deps.forceFailure?.()) {
        await markFailed(deps.db, scope, messageId, DELIVERY_FAILED_REASON);
        return;
      }
      await markSent(deps.db, scope, messageId, deps.now());
    } catch (err) {
      // Out of attempts: leave a visible failed state instead of a message stuck in queued.
      if (job.attempts >= job.maxAttempts) {
        await markFailed(deps.db, scope, messageId, DELIVERY_FAILED_REASON);
      }
      throw err;
    }
  };
}
