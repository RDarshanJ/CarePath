import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";
import { insertJob } from "../../src/core/jobs/repo.js";
import type { JobHandler } from "../../src/core/jobs/runner.js";
import { bearerMatches, runCronPass } from "../../src/jobs/cron.js";
import { as, login, testApp } from "../support/http.js";
import { createOrgFixture, createTestDb, jobRow } from "../support/repo.js";
import { setClinic } from "../support/fixtures/repo.js";
import { createConversation, messageRow } from "../support/fixtures/messaging.js";

/**
 * Serverless deployment (docs/deployment.md): the cron route, the bounded cron pass, and inline
 * message delivery. Every job here sits in a queue of its own or is claimed by id, so no pass in
 * this file runs another file's jobs.
 */
const db = createTestDb();
const SECRET = "test-cron-secret-0123456789";
const q = `test.cron.${randomUUID()}`;
const ran: string[] = [];
const handler: JobHandler = async (job) => {
  ran.push(job.id);
};
let cronApp: FastifyInstance;
let unconfigured: FastifyInstance;

beforeAll(async () => {
  cronApp = await testApp(db, {
    config: { jobs: { inline: false, cronSecret: SECRET, cronBudgetMs: 10_000 } },
    cron: { handlers: { [q]: handler }, enqueue: async () => 0 },
  });
  unconfigured = await testApp(db, { cron: { handlers: { [q]: handler } } });
});
afterAll(async () => {
  await cronApp.close();
  await unconfigured.close();
  await db.$disconnect();
});

describe("cron route", () => {
  it("refuses a call without the bearer secret, a wrong one, and every call when unset", async () => {
    const url = "/internal/cron/jobs";
    expect((await cronApp.inject({ method: "GET", url })).statusCode).toBe(401);
    const wrong = await cronApp.inject({
      method: "GET",
      url,
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toMatchObject({ error: { code: "unauthenticated" } });
    const none = await unconfigured.inject({
      method: "GET",
      url,
      headers: { authorization: "Bearer " },
    });
    expect(none.statusCode).toBe(401);
  });

  it("runs due jobs with the secret and reports the pass", async () => {
    const id = (await insertJob(db, { queue: q, payload: {}, runAt: new Date() }))!;
    const res = await cronApp.inject({
      method: "GET",
      url: "/internal/cron/jobs",
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ enqueued: 0, claimed: 1, succeeded: 1, complete: true });
    expect(ran).toContain(id);
    expect((await jobRow(db, id)).status).toBe("succeeded");
  });

  it("compares the header in constant time and only as a whole", () => {
    expect(bearerMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(bearerMatches(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(bearerMatches(SECRET, SECRET)).toBe(false);
    expect(bearerMatches(undefined, SECRET)).toBe(false);
    expect(bearerMatches("Bearer ", null)).toBe(false);
  });
});

describe("cron pass budget", () => {
  it("stops when the budget is spent and leaves the rest queued", async () => {
    const own = `test.cron.${randomUUID()}`;
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push((await insertJob(db, { queue: own, payload: {} }))!);
    let t = 0;
    const result = await runCronPass({
      db,
      now: () => new Date(),
      handlers: {
        [own]: async () => {
          t += 1_000;
        },
      },
      enqueue: async () => 0,
      budgetMs: 500,
      clock: () => t,
    });
    // One runner pass claims up to ten jobs, so all three run in the first pass; the budget is
    // then spent and the loop ends without the empty pass that would mark it complete.
    expect(result).toMatchObject({ claimed: 3, succeeded: 3, complete: false });
  });
});

describe("configuration", () => {
  it("reads JOBS_INLINE, CRON_SECRET and CRON_BUDGET_MS", () => {
    const c = loadConfig({ NODE_ENV: "test", JOBS_INLINE: "1", CRON_SECRET: SECRET });
    expect(c.jobs).toEqual({ inline: true, cronSecret: SECRET, cronBudgetMs: 45_000 });
    expect(loadConfig({ NODE_ENV: "test" }).jobs).toEqual({
      inline: false,
      cronSecret: null,
      cronBudgetMs: 45_000,
    });
  });

  it("refuses a short CRON_SECRET in production", () => {
    expect(() =>
      loadConfig({ NODE_ENV: "production", SESSION_SECRET: "a-real-secret", CRON_SECRET: "short" }),
    ).toThrow(/CRON_SECRET/);
  });
});

describe("inline message delivery (JOBS_INLINE=1)", () => {
  it("delivers a sent message in the same request and leaves its job succeeded", async () => {
    const app = await testApp(db, {
      config: { jobs: { inline: true, cronSecret: null, cronBudgetMs: 1_000 } },
    });
    try {
      const org = await createOrgFixture(db);
      await setClinic(db, org.orgId, {});
      const convId = await createConversation(db, org, {
        patientId: org.patient.patientId,
        userIds: [org.patient.userId, org.therapist.userId],
      });
      const therapist = as(app, await login(app, org.therapist.email));
      const res = await therapist({
        method: "POST",
        url: `/conversations/${convId}/messages`,
        payload: { body: "Inline delivery check." },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ status: "sent", body: "Inline delivery check." });
      expect((await messageRow(db, res.json().id)).status).toBe("sent");
      const job = await db.job.findFirst({
        where: { queue: "messages.deliver", payload: { equals: { messageId: res.json().id } } },
      });
      expect(job?.status).toBe("succeeded");
    } finally {
      await app.close();
    }
  });
});
