import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { errorEnvelopeSchema } from "@carepath/shared/contracts";
import { fixtureRoutes } from "../support/fixture-routes.js";
import { as, login, ORIGIN, testApp } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;

beforeAll(async () => {
  app = await testApp(db, { extraRoutes: fixtureRoutes });
  org = await createOrgFixture(db);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

function expectEnvelope(res: LightMyRequestResponse, status: number, code: string) {
  expect(res.statusCode).toBe(status);
  expect(res.headers["content-type"]).toMatch(/^application\/json/);
  const body = res.json();
  expect(errorEnvelopeSchema.safeParse(body).success, res.body).toBe(true);
  expect(Object.keys(body)).toEqual(["error"]);
  expect(body.error.code).toBe(code);
  expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  return body.error as { code: string; message: string; details?: unknown[] };
}

describe("error envelope", () => {
  it("400 validation errors list paths and issue codes, not values", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { origin: ORIGIN },
      payload: { email: "x@example.test", password: "", extra: "Jordan Synthetic" },
    });
    const err = expectEnvelope(res, 400, "validation_error");
    expect(err.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "body.password", issue: "too_small" }),
        expect.objectContaining({ issue: "unrecognized_keys" }),
      ]),
    );
    expect(res.body).not.toContain("Jordan");
  });

  it("400 for malformed JSON", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: "{not json",
    });
    expectEnvelope(res, 400, "validation_error");
  });

  it("415 for an unsupported content type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/xml" },
      payload: "<login/>",
    });
    expectEnvelope(res, 415, "unsupported_media_type");
  });

  it("401 without a session, also on unknown routes (no route discovery)", async () => {
    expectEnvelope(await app.inject({ method: "GET", url: "/roles" }), 401, "unauthenticated");
    expectEnvelope(
      await app.inject({ method: "GET", url: "/no/such/route" }),
      401,
      "unauthenticated",
    );
  });

  it("404 for an unknown route with a session", async () => {
    const s = await login(app, org.admin.email);
    expectEnvelope(await as(app, s)({ method: "GET", url: "/no/such/route" }), 404, "not_found");
  });

  it("500 hides the cause and quotes no input", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/test/check-in",
      headers: { origin: ORIGIN },
      payload: { painScore: 8, note: "knee hurts after stairs" },
    });
    const err = expectEnvelope(res, 500, "internal_error");
    expect(err.message).toBe("Something went wrong on our side.");
    expect(res.body).not.toContain("knee");
    expect(res.body).not.toContain("stack");
  });

  it("sets security headers on every response", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers).toMatchObject({
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "cache-control": "no-store",
    });
  });

  it("ignores a client-supplied request id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "attacker-chosen" },
    });
    expect(res.headers["x-request-id"]).not.toBe("attacker-chosen");
  });
});
