/** Checkpoint C1, ruling 3.8: CAREPATH_FIXED_NOW fixes the API clock outside production. */
import type { FastifyInstance } from "fastify";
import { afterAll, describe, expect, it } from "vitest";
import { clockFromEnv } from "../../src/core/clock.js";
import { login, testApp } from "../support/http.js";
import { createOrgFixture, createTestDb } from "../support/repo.js";

const ANCHOR = "2026-11-19T16:00:00.000Z";
const db = createTestDb();
afterAll(async () => db.$disconnect());

describe("CAREPATH_FIXED_NOW", () => {
  it("is ignored when unset", () => {
    const clock = clockFromEnv({ NODE_ENV: "test" });
    expect(clock.fixedAt).toBeNull();
    expect(clock.warning).toBeNull();
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(5_000);
  });

  it("fixes the clock outside production and says so in one line", () => {
    const clock = clockFromEnv({ NODE_ENV: "development", CAREPATH_FIXED_NOW: ANCHOR });
    expect(clock.now().toISOString()).toBe(ANCHOR);
    expect(clock.now()).not.toBe(clock.now());
    expect(clock.warning).toContain(ANCHOR);
    expect(clock.warning?.split("\n")).toHaveLength(1);
  });

  it("is ignored in production", () => {
    const clock = clockFromEnv({ NODE_ENV: "production", CAREPATH_FIXED_NOW: ANCHOR });
    expect(clock.fixedAt).toBeNull();
    expect(clock.now().toISOString()).not.toBe(ANCHOR);
    expect(clock.warning).toMatch(/ignored in production/);
  });

  it("rejects a value that is not an instant", () => {
    expect(() => clockFromEnv({ NODE_ENV: "test", CAREPATH_FIXED_NOW: "tomorrow" })).toThrow(
      /ISO 8601/,
    );
  });

  it("drives the session times the API returns", async () => {
    const clock = clockFromEnv({ NODE_ENV: "test", CAREPATH_FIXED_NOW: ANCHOR });
    const app: FastifyInstance = await testApp(db, { now: clock.now });
    try {
      const org = await createOrgFixture(db);
      const s = await login(app, org.patient.email);
      expect(s.body["expiresAt"]).toBe("2026-11-20T04:00:00.000Z");
      expect(s.body["idleExpiresAt"]).toBe("2026-11-19T16:30:00.000Z");
    } finally {
      await app.close();
    }
  });
});
