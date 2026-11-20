import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, loginRaw, testApp, type Session } from "../support/http.js";
import {
  createOrgFixture,
  createTestDb,
  findAuthSession,
  PASSWORD,
  type OrgFixture,
} from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let s: Session;

beforeAll(async () => {
  app = await testApp(db);
  org = await createOrgFixture(db);
  s = await login(app, org.therapist.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("CSRF protection for cookie auth", () => {
  it("rejects a mutating request without the CSRF header", async () => {
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: "/auth/logout",
      headers: { "x-csrf-token": "" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: "csrf_failed", message: "Missing or invalid CSRF token." },
    });
    expect((await findAuthSession(db, s.sessionId)).revokedAt).toBeNull();
  });

  it("rejects another session's CSRF token", async () => {
    const other = await login(app, org.coordinator.email);
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: "/auth/logout",
      headers: { "x-csrf-token": other.csrfToken },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("csrf_failed");
  });

  it("rejects a mutating request from an unlisted Origin, even with a valid token", async () => {
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: "/auth/logout",
      headers: { origin: "https://evil.example" },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("origin_rejected");
  });

  it("rejects a mutating request with no Origin or Referer", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: s.cookie, "x-csrf-token": s.csrfToken },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("origin_rejected");
  });

  it("accepts a same-origin Referer when Origin is absent", async () => {
    const t = await login(app, org.admin.email);
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: {
        cookie: t.cookie,
        "x-csrf-token": t.csrfToken,
        referer: "http://127.0.0.1:3000/admin/roles",
      },
    });
    expect(res.statusCode).toBe(204);
  });

  it("guards login against cross-site posts (login CSRF)", async () => {
    const res = await loginRaw(
      app,
      { email: org.patient.email, password: PASSWORD },
      { origin: "https://evil.example" },
    );
    expect(res.statusCode).toBe(403);
    expect(res.cookies).toHaveLength(0);
  });

  it("does not need a CSRF token for reads", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/session",
      headers: { cookie: s.cookie },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("CORS", () => {
  it("answers a preflight from an allowed origin with credentials", async () => {
    const res = await app.inject({
      method: "OPTIONS",
      url: "/auth/login",
      headers: {
        origin: "http://127.0.0.1:3000",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,x-csrf-token",
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    expect(String(res.headers["access-control-allow-headers"])).toContain("x-csrf-token");
  });

  it("gives no CORS grant to an unlisted origin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
