import type { Db } from "../core/db/repo.js";
import { JobError, type JobHandler } from "../core/jobs/runner.js";
import { MESSAGE_DELIVER_QUEUE, messageDeliveryHandler } from "../modules/messaging/delivery.js";
import { ABANDON_SESSIONS_QUEUE, TIME_RULES_QUEUE } from "../modules/review/queues.js";
import { abandonSessions, runTimeRules, type SystemScope } from "../modules/review/time-rules.js";

/**
 * Queue name to handler. The runner claims only queues listed here.
 *
 * Every handler builds a system scope from job.organizationId and works through the scoped
 * repositories, so no handler reads or writes across organizations (C1, WP 2.4 defect 7).
 * A job without an organization is refused.
 */
export interface JobDeps {
  db: Db;
  now: () => Date;
  /** Non-production hook: every message delivery fails (see messageDeliveryHandler). */
  forceMessageFailure?: () => boolean;
}

function scopeOf(job: { organizationId: string | null }): SystemScope {
  if (!job.organizationId) throw new JobError("job has no organizationId");
  return { orgId: job.organizationId };
}

export function createJobHandlers(deps: JobDeps): Record<string, JobHandler> {
  return {
    [TIME_RULES_QUEUE]: async (job) => {
      await runTimeRules(deps.db, scopeOf(job), deps.now());
    },
    [ABANDON_SESSIONS_QUEUE]: async (job) => {
      await abandonSessions(deps.db, scopeOf(job), deps.now());
    },
    [MESSAGE_DELIVER_QUEUE]: messageDeliveryHandler({
      db: deps.db,
      now: deps.now,
      ...(deps.forceMessageFailure ? { forceFailure: deps.forceMessageFailure } : {}),
    }),
  };
}

/** Queues the scheduler enqueues for every active organization. */
export const recurringQueues = [TIME_RULES_QUEUE, ABANDON_SESSIONS_QUEUE] as const;
