import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { claimJobs } from "../../src/core/jobs/repo.js";
import { JobError, JobRunner, type JobHandler } from "../../src/core/jobs/runner.js";
import { createTestDb, jobRow } from "../support/repo.js";

/**
 * Postgres job runner (ADR-4). Each test uses its own queue name so files and tests never
 * claim each other's jobs. Time is injected, so backoff is checked without sleeping.
 */
const db = createTestDb();
afterAll(async () => db.$disconnect());

function queue(): string {
  return `test.${randomUUID()}`;
}

function clock(start = Date.now()) {
  let t = start;
  return { now: () => new Date(t), advance: (ms: number) => (t += ms) };
}

describe("job runner", () => {
  it("retries a failing job with exponential backoff, then succeeds", async () => {
    const q = queue();
    const c = clock();
    let calls = 0;
    const handler: JobHandler = async () => {
      calls += 1;
      if (calls < 3) throw new JobError(`transient failure ${calls}`);
    };
    const runner = new JobRunner({ db, handlers: { [q]: handler }, now: c.now });
    const id = (await runner.enqueue({ queue: q, payload: { kind: "test" }, runAt: c.now() }))!;

    expect(await runner.runOnce()).toMatchObject({ claimed: 1, retried: 1 });
    let job = await jobRow(db, id);
    expect(job).toMatchObject({
      status: "queued",
      attempts: 1,
      lastError: "JobError: transient failure 1",
    });
    expect(job.runAt.getTime()).toBe(c.now().getTime() + 1_000);

    // Not due yet: nothing is claimed.
    c.advance(999);
    expect((await runner.runOnce()).claimed).toBe(0);
    c.advance(1);
    expect(await runner.runOnce()).toMatchObject({ claimed: 1, retried: 1 });
    job = await jobRow(db, id);
    expect(job).toMatchObject({ status: "queued", attempts: 2 });
    expect(job.runAt.getTime()).toBe(c.now().getTime() + 2_000);

    c.advance(2_000);
    expect(await runner.runOnce()).toMatchObject({ claimed: 1, succeeded: 1 });
    job = await jobRow(db, id);
    expect(job).toMatchObject({
      status: "succeeded",
      attempts: 3,
      lastError: null,
      lockedBy: null,
    });
    expect(job.completedAt).not.toBeNull();
    expect(calls).toBe(3);
  });

  it("dead-letters a job after maxAttempts and leaves it alone until requeued", async () => {
    const q = queue();
    const c = clock();
    let calls = 0;
    const runner = new JobRunner({
      db,
      handlers: {
        [q]: async () => {
          calls += 1;
          // A library error whose message could quote patient data: only its type is stored.
          throw new TypeError("cannot read property of patient Jordan Synthetic");
        },
      },
      now: c.now,
      backoffMs: () => 10,
    });
    const id = (await runner.enqueue({ queue: q, payload: {}, maxAttempts: 3, runAt: c.now() }))!;

    const totals = { retried: 0, dead: 0 };
    for (let i = 0; i < 5; i += 1) {
      const s = await runner.runOnce();
      totals.retried += s.retried;
      totals.dead += s.dead;
      c.advance(10);
    }
    expect(totals).toEqual({ retried: 2, dead: 1 });
    expect(calls).toBe(3);
    let job = await jobRow(db, id);
    expect(job).toMatchObject({ status: "dead", attempts: 3, lastError: "TypeError" });
    expect(job.lastError).not.toContain("Jordan");

    // Dead jobs are never claimed again on their own.
    c.advance(60_000);
    expect((await runner.runOnce()).claimed).toBe(0);

    expect(await runner.requeueDead(id)).toBe(true);
    job = await jobRow(db, id);
    expect(job).toMatchObject({ status: "queued", attempts: 0, lastError: null });
  });

  it("drain() runs everything due and reports totals", async () => {
    const q = queue();
    const seen: unknown[] = [];
    const runner = new JobRunner({
      db,
      handlers: { [q]: async (job) => void seen.push(job.payload) },
      batchSize: 2,
    });
    for (let i = 0; i < 5; i += 1) await runner.enqueue({ queue: q, payload: { n: i } });
    const stats = await runner.drain();
    expect(stats).toMatchObject({ claimed: 5, succeeded: 5, retried: 0, dead: 0 });
    expect(seen).toHaveLength(5);
  });

  it("never gives the same job to two concurrent workers (FOR UPDATE SKIP LOCKED)", async () => {
    const q = queue();
    const runner = new JobRunner({ db, handlers: {} });
    const ids = new Set<string>();
    for (let i = 0; i < 20; i += 1) ids.add((await runner.enqueue({ queue: q, payload: { i } }))!);
    const now = new Date(Date.now() + 1_000);
    const batches = await Promise.all(
      Array.from({ length: 6 }, (_, w) =>
        claimJobs(db, { queues: [q], workerId: `w${w}`, now, limit: 5 }),
      ),
    );
    const claimed = batches.flat().map((j) => j.id);
    expect(new Set(claimed).size).toBe(claimed.length);
    expect(claimed.length).toBe(20);
    expect(new Set(claimed)).toEqual(ids);
  });

  it("recovers a job whose worker died mid-run (stale lock)", async () => {
    const q = queue();
    const c = clock();
    const runner = new JobRunner({
      db,
      handlers: { [q]: async () => {} },
      now: c.now,
      lockTimeoutMs: 60_000,
    });
    const id = (await runner.enqueue({ queue: q, payload: {}, runAt: c.now() }))!;
    // A worker claims it and then disappears.
    await claimJobs(db, { queues: [q], workerId: "crashed", now: c.now(), limit: 1 });
    expect((await jobRow(db, id)).status).toBe("running");

    c.advance(30_000);
    expect((await runner.runOnce()).claimed).toBe(0);
    c.advance(31_000);
    expect(await runner.runOnce()).toMatchObject({ claimed: 1, succeeded: 1 });
    expect(await jobRow(db, id)).toMatchObject({ status: "succeeded", attempts: 2 });
  });

  it("deduplicates live jobs by (queue, dedupeKey)", async () => {
    const q = queue();
    const runner = new JobRunner({ db, handlers: { [q]: async () => {} } });
    const first = await runner.enqueue({ queue: q, payload: {}, dedupeKey: "appt-1" });
    const second = await runner.enqueue({ queue: q, payload: {}, dedupeKey: "appt-1" });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    await runner.drain();
    // Once the first finished, the key is free again.
    expect(await runner.enqueue({ queue: q, payload: {}, dedupeKey: "appt-1" })).not.toBeNull();
  });

  it("only claims queues it has handlers for", async () => {
    const q = queue();
    const other = new JobRunner({ db, handlers: { [queue()]: async () => {} } });
    const id = (await new JobRunner({ db, handlers: {} }).enqueue({ queue: q, payload: {} }))!;
    expect((await other.drain()).claimed).toBe(0);
    expect((await jobRow(db, id)).status).toBe("queued");
  });
});
