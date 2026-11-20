import type { JobHandler } from "../core/jobs/runner.js";

/**
 * Queue name to handler. Feature work packages add their queues here (for example appointment
 * reminders in WP 4.1). The runner claims only queues listed in this map.
 */
export const jobHandlers: Record<string, JobHandler> = {};
