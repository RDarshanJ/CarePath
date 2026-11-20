import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import type { Db } from "../db/repo.js";
import {
  claimJobs,
  insertJob,
  markFailed,
  markSucceeded,
  reapStaleJobs,
  requeueDead,
  type ClaimedJob,
  type EnqueueInput,
} from "./repo.js";

/**
 * Postgres job runner (ADR-4). No Redis, no BullMQ.
 *
 * queued -> running -> succeeded
 *                   -> queued   (failure with attempts left; runAt pushed out by backoff)
 *                   -> dead     (failure on the last attempt: the dead-letter state)
 * dead -> queued only by an explicit requeue.
 *
 * Handlers receive the payload and must be idempotent: a crash after the work but before the
 * status write runs the job again. Single-process scope: the worker loop lives in the API
 * process, and `pnpm jobs:drain` runs it to completion for tests and scripts.
 */
export type JobHandler = (job: ClaimedJob) => Promise<void>;

/**
 * Throw this from a handler to record a message in Job.lastError. Any other error records only
 * its type and code, because messages from libraries can quote patient data.
 */
export class JobError extends Error {
  constructor(safeMessage: string) {
    super(safeMessage);
    this.name = "JobError";
  }
}

export interface JobLogger {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export interface JobRunnerOptions {
  db: Db;
  handlers: Record<string, JobHandler>;
  workerId?: string;
  now?: () => Date;
  /** Delay before attempt n+1 after attempt n failed. Default: 1 s doubling, capped at 5 min. */
  backoffMs?: (attempt: number) => number;
  lockTimeoutMs?: number;
  batchSize?: number;
  pollIntervalMs?: number;
  logger?: JobLogger;
}

export interface RunStats {
  claimed: number;
  succeeded: number;
  retried: number;
  dead: number;
}

export function defaultBackoffMs(attempt: number): number {
  return Math.min(1_000 * 2 ** Math.max(0, attempt - 1), 5 * 60_000);
}

export function safeErrorText(err: unknown): string {
  if (err instanceof JobError) return `JobError: ${err.message}`.slice(0, 500);
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? `${err.name} (${code})` : err.name;
  }
  return typeof err;
}

const silent: JobLogger = { info() {}, warn() {}, error() {} };

export class JobRunner {
  readonly workerId: string;
  private readonly now: () => Date;
  private readonly backoffMs: (attempt: number) => number;
  private readonly lockTimeoutMs: number;
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly log: JobLogger;
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> | null = null;
  private stopped = true;

  constructor(private readonly options: JobRunnerOptions) {
    this.workerId = options.workerId ?? `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
    this.now = options.now ?? (() => new Date());
    this.backoffMs = options.backoffMs ?? defaultBackoffMs;
    this.lockTimeoutMs = options.lockTimeoutMs ?? 5 * 60_000;
    this.batchSize = options.batchSize ?? 10;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.log = options.logger ?? silent;
  }

  enqueue(input: EnqueueInput): Promise<string | null> {
    return insertJob(this.options.db, input);
  }

  requeueDead(id: string): Promise<boolean> {
    return requeueDead(this.options.db, id, this.now());
  }

  /** One pass: recover stale locks, claim due jobs, run them one by one. */
  async runOnce(): Promise<RunStats> {
    const { db, handlers } = this.options;
    const stats: RunStats = { claimed: 0, succeeded: 0, retried: 0, dead: 0 };
    const at = this.now();
    const queues = Object.keys(handlers);
    const reaped = await reapStaleJobs(db, {
      queues,
      now: at,
      lockedBefore: new Date(at.getTime() - this.lockTimeoutMs),
    });
    for (const r of reaped) this.log.warn({ jobId: r.id, status: r.status }, "job lock expired");

    const jobs = await claimJobs(db, {
      queues,
      workerId: this.workerId,
      now: at,
      limit: this.batchSize,
    });
    stats.claimed = jobs.length;

    for (const job of jobs) {
      const handler = handlers[job.queue];
      try {
        if (!handler) throw new JobError(`no handler for queue ${job.queue}`);
        await handler(job);
        await markSucceeded(db, job.id, this.workerId, this.now());
        stats.succeeded += 1;
        this.log.info({ jobId: job.id, queue: job.queue, attempt: job.attempts }, "job succeeded");
      } catch (err) {
        const finished = this.now();
        const last = job.attempts >= job.maxAttempts;
        const retryAt = last ? null : new Date(finished.getTime() + this.backoffMs(job.attempts));
        await markFailed(db, {
          id: job.id,
          workerId: this.workerId,
          now: finished,
          error: safeErrorText(err),
          retryAt,
        });
        if (last) {
          stats.dead += 1;
          this.log.error(
            { jobId: job.id, queue: job.queue, attempt: job.attempts, error: safeErrorText(err) },
            "job dead-lettered",
          );
        } else {
          stats.retried += 1;
          this.log.warn(
            { jobId: job.id, queue: job.queue, attempt: job.attempts, error: safeErrorText(err) },
            "job failed, will retry",
          );
        }
      }
    }
    return stats;
  }

  /** Run passes until nothing is due. Jobs scheduled for later (backoff) are left queued. */
  async drain(maxPasses = 1_000): Promise<RunStats> {
    const total: RunStats = { claimed: 0, succeeded: 0, retried: 0, dead: 0 };
    for (let i = 0; i < maxPasses; i += 1) {
      const s = await this.runOnce();
      total.claimed += s.claimed;
      total.succeeded += s.succeeded;
      total.retried += s.retried;
      total.dead += s.dead;
      if (s.claimed === 0) break;
    }
    return total;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    const tick = async () => {
      if (this.stopped) return;
      this.running = this.drain(100).catch((err: unknown) =>
        this.log.error({ error: safeErrorText(err) }, "job poll failed"),
      );
      await this.running;
      if (!this.stopped) this.timer = setTimeout(() => void tick(), this.pollIntervalMs);
    };
    void tick();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.running;
  }
}
