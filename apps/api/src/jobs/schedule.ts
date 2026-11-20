import type { Db } from "../core/db/repo.js";
import { insertJob } from "../core/jobs/repo.js";
import { recurringQueues } from "./handlers.js";
import { activeOrganizationIds } from "./repo.js";

const SLOT_MS = 15 * 60_000;

/**
 * Enqueues one job per recurring queue and active organization for the current 15-minute slot.
 * The dedupe key makes a second call in the same slot a no-op, so several API processes (or a
 * restart) never double the work.
 */
export async function enqueueRecurring(db: Db, now: Date): Promise<number> {
  const slot = Math.floor(now.getTime() / SLOT_MS);
  let n = 0;
  for (const orgId of await activeOrganizationIds(db)) {
    for (const queue of recurringQueues) {
      const id = await insertJob(db, {
        queue,
        payload: {},
        organizationId: orgId,
        runAt: now,
        dedupeKey: `${queue}:${orgId}:${slot}`,
      });
      if (id) n += 1;
    }
  }
  return n;
}

export const RECURRING_INTERVAL_MS = SLOT_MS;
