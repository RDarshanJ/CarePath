import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";
import { loginRaw, testApp } from "../support/http.js";
import { createOrgFixture, createTestDb, PASSWORD, type OrgFixture } from "../support/repo.js";

const db = createTestDb();
let org: OrgFixture;

beforeAll(async () => {
  org = await createOrgFixture(db);
});
afterAll(async () => db.$disconnect());

describe("login rate limit (10 per minute per account and IP)", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await testApp(db);
  });
  afterAll(async () => app.close());

  it("answers 429 with Retry-After and the error envelope on the 11th attempt", async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await loginRaw(app, { email: org.coordinator.email, password: "wrong" });
      expect(res.statusCode, `attempt ${i + 1}`).toBe(401);
    }
    const blocked = await loginRaw(app, { email: org.coordinator.email, password: PASSWORD });
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.json()).toEqual({
      error: { code: "rate_limited", message: "Too many requests. Try again later." },
    });
    expect(blocked.cookies).toHaveLength(0);
  });

  it("limits per account: another account from the same IP still signs in", async () => {
    const res = await loginRaw(app, { email: org.admin.email, password: PASSWORD });
    expect(res.statusCode).toBe(200);
  });
});

describe("global rate limit", () => {
  it("answers 429 once the per-IP budget is spent", async () => {
    const app = await testApp(db, {
      config: { rateLimit: { globalPerMinute: 3, loginPerMinute: 10 } },
    });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        codes.push((await app.inject({ method: "GET", url: "/health" })).statusCode);
      }
      expect(codes).toEqual([200, 200, 200, 429]);
    } finally {
      await app.close();
    }
  });
});

describe("TRUST_PROXY (checkpoint C1 section 5.2)", () => {
  const health = (app: FastifyInstance, forwardedFor: string, remoteAddress = "127.0.0.1") =>
    app.inject({
      method: "GET",
      url: "/health",
      remoteAddress,
      headers: { "x-forwarded-for": forwardedFor },
    });

  it("defaults to off", () => {
    expect(loadConfig({ NODE_ENV: "test" }).trustProxy).toBe("off");
    expect(loadConfig({ NODE_ENV: "test", TRUST_PROXY: "loopback" }).trustProxy).toBe("loopback");
    expect(() => loadConfig({ NODE_ENV: "test", TRUST_PROXY: "any" })).toThrow();
  });

  it("off: X-Forwarded-For is ignored, so every browser behind the proxy shares one budget", async () => {
    const app = await testApp(db, {
      config: { trustProxy: "off", rateLimit: { globalPerMinute: 2, loginPerMinute: 10 } },
    });
    try {
      const codes = [
        (await health(app, "203.0.113.1")).statusCode,
        (await health(app, "203.0.113.2")).statusCode,
        (await health(app, "203.0.113.3")).statusCode,
      ];
      expect(codes).toEqual([200, 200, 429]);
    } finally {
      await app.close();
    }
  });

  it("loopback: the forwarded client address gets its own budget", async () => {
    const app = await testApp(db, {
      config: { trustProxy: "loopback", rateLimit: { globalPerMinute: 2, loginPerMinute: 10 } },
    });
    try {
      const a = [
        (await health(app, "203.0.113.1")).statusCode,
        (await health(app, "203.0.113.1")).statusCode,
        (await health(app, "203.0.113.1")).statusCode,
      ];
      expect(a).toEqual([200, 200, 429]);
      expect((await health(app, "203.0.113.2")).statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("loopback: a forwarded header from a non-loopback peer is not trusted", async () => {
    const app = await testApp(db, {
      config: { trustProxy: "loopback", rateLimit: { globalPerMinute: 2, loginPerMinute: 10 } },
    });
    try {
      const codes = [
        (await health(app, "203.0.113.1", "198.51.100.9")).statusCode,
        (await health(app, "203.0.113.2", "198.51.100.9")).statusCode,
        (await health(app, "203.0.113.3", "198.51.100.9")).statusCode,
      ];
      expect(codes).toEqual([200, 200, 429]);
    } finally {
      await app.close();
    }
  });
});
