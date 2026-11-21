import type { Db, DbClient } from "../db/repo.js";

export interface ClaimedJob {
  id: string;
  queue: string;
  payload: unknown;
  /** Attempt number of this run, starting at 1. */
  attempts: number;
  maxAttempts: number;
  organizationId: string | null;
}

export interface EnqueueInput {
  queue: string;
  payload: Record<string, unknown>;
  organizationId?: string | null;
  runAt?: Date;
  maxAttempts?: number;
  /** At most one queued or running job per (queue, dedupeKey); a duplicate returns null. */
  dedupeKey?: string;
}

/** Takes a transaction client too, so a job can be enqueued in the same transaction as its cause. */
export async function insertJob(db: DbClient, input: EnqueueInput): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO "Job" (queue, payload, "organizationId", "runAt", "maxAttempts", "dedupeKey")
    VALUES (
      ${input.queue},
      ${JSON.stringify(input.payload)}::jsonb,
      ${input.organizationId ?? null}::uuid,
      ${input.runAt ?? new Date()}::timestamptz,
      ${input.maxAttempts ?? 5}::int,
      ${input.dedupeKey ?? null}
    )
    ON CONFLICT (queue, "dedupeKey") WHERE "dedupeKey" IS NOT NULL AND status IN ('queued', 'running')
    DO NOTHING
    RETURNING id`;
  return rows[0]?.id ?? null;
}

/**
 * Claim due jobs with FOR UPDATE SKIP LOCKED (ADR-4): concurrent workers never claim the same
 * row and never wait on each other. The attempt counter is incremented at claim time, so a
 * crash mid-run still counts as an attempt.
 */
export async function claimJobs(
  db: Db,
  input: {
    queues: string[];
    workerId: string;
    now: Date;
    limit: number;
    /** Claim only these job ids (inline delivery runs the job its own request enqueued). */
    ids?: string[];
  },
): Promise<ClaimedJob[]> {
  if (input.queues.length === 0) return [];
  if (input.ids) {
    if (input.ids.length === 0) return [];
    return db.$queryRaw<ClaimedJob[]>`
    UPDATE "Job" AS j
    SET status = 'running',
        "lockedAt" = ${input.now}::timestamptz,
        "lockedBy" = ${input.workerId},
        attempts = j.attempts + 1,
        "updatedAt" = ${input.now}::timestamptz
    WHERE j.id IN (
      SELECT id FROM "Job"
      WHERE status = 'queued'
        AND "runAt" <= ${input.now}::timestamptz
        AND queue = ANY(${input.queues}::text[])
        AND attempts < "maxAttempts"
        AND id = ANY(${input.ids}::uuid[])
      ORDER BY "runAt", "createdAt"
      LIMIT ${input.limit}::int
      FOR UPDATE SKIP LOCKED
    )
    RETURNING j.id, j.queue, j.payload, j.attempts, j."maxAttempts", j."organizationId"`;
  }
  return db.$queryRaw<ClaimedJob[]>`
    UPDATE "Job" AS j
    SET status = 'running',
        "lockedAt" = ${input.now}::timestamptz,
        "lockedBy" = ${input.workerId},
        attempts = j.attempts + 1,
        "updatedAt" = ${input.now}::timestamptz
    WHERE j.id IN (
      SELECT id FROM "Job"
      WHERE status = 'queued'
        AND "runAt" <= ${input.now}::timestamptz
        AND queue = ANY(${input.queues}::text[])
        AND attempts < "maxAttempts"
      ORDER BY "runAt", "createdAt"
      LIMIT ${input.limit}::int
      FOR UPDATE SKIP LOCKED
    )
    RETURNING j.id, j.queue, j.payload, j.attempts, j."maxAttempts", j."organizationId"`;
}

/** Guarded by lockedBy, so a job taken over by the stale-lock reaper is not overwritten. */
export async function markSucceeded(db: Db, id: string, workerId: string, now: Date) {
  const res = await db.job.updateMany({
    where: { id, status: "running", lockedBy: workerId },
    data: {
      status: "succeeded",
      completedAt: now,
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    },
  });
  return res.count === 1;
}

export async function markFailed(
  db: Db,
  input: { id: string; workerId: string; now: Date; error: string; retryAt: Date | null },
) {
  const res = await db.job.updateMany({
    where: { id: input.id, status: "running", lockedBy: input.workerId },
    data: input.retryAt
      ? {
          status: "queued",
          runAt: input.retryAt,
          lockedAt: null,
          lockedBy: null,
          lastError: input.error,
        }
      : { status: "dead", lockedAt: null, lockedBy: null, lastError: input.error },
  });
  return res.count === 1;
}

/**
 * Jobs left running by a crashed worker, in the queues this worker handles: retry now, or
 * dead when out of attempts.
 */
export async function reapStaleJobs(
  db: Db,
  input: { queues: string[]; now: Date; lockedBefore: Date },
) {
  if (input.queues.length === 0) return [];
  return db.$queryRaw<{ id: string; status: "queued" | "dead" }[]>`
    UPDATE "Job"
    SET status = CASE WHEN attempts >= "maxAttempts" THEN 'dead'::"JobStatus" ELSE 'queued'::"JobStatus" END,
        "lockedAt" = NULL,
        "lockedBy" = NULL,
        "lastError" = 'lock_timeout',
        "runAt" = ${input.now}::timestamptz,
        "updatedAt" = ${input.now}::timestamptz
    WHERE status = 'running'
      AND "lockedAt" < ${input.lockedBefore}::timestamptz
      AND queue = ANY(${input.queues}::text[])
    RETURNING id, status::text AS status`;
}

/** Manual retry of a dead-lettered job. Attempts restart from zero. */
export async function requeueDead(db: Db, id: string, now: Date): Promise<boolean> {
  const res = await db.job.updateMany({
    where: { id, status: "dead" },
    data: { status: "queued", attempts: 0, runAt: now, lastError: null },
  });
  return res.count === 1;
}

export async function findJob(db: Db, id: string) {
  return db.job.findUnique({
    where: { id },
    select: {
      id: true,
      queue: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      runAt: true,
      lastError: true,
      completedAt: true,
      lockedBy: true,
    },
  });
}
