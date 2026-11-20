import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fixtureRoutes } from "../support/fixture-routes.js";
import { as, login, loginRaw, ORIGIN, testApp } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";

/**
 * Canary test (PRD section 13, research section 2.1): a patient name, check-in text, a pain
 * value, an email and a password pass through the API, and none of them reach the logs.
 */
const db = createTestDb();
const lines: string[] = [];
const sink = new Writable({
  write(chunk, _enc, cb) {
    lines.push(String(chunk));
    cb();
  },
});

const canaryGiven = `Quillon${randomUUID().slice(0, 6)}`;
const canaryFamily = `Marchbanks${randomUUID().slice(0, 6)}`;
const canaryNote = `canary-note-${randomUUID()}`;
const canaryPassword = `canary-password-${randomUUID()}`;
const canaryEmail = `canary-${randomUUID()}@example.test`;
const PAIN = 9;

let app: FastifyInstance;
let org: OrgFixture;

beforeAll(async () => {
  org = await createOrgFixture(db, { givenName: canaryGiven, familyName: canaryFamily });
  app = await testApp(db, {
    config: { logLevel: "debug" },
    logStream: sink,
    extraRoutes: fixtureRoutes,
  });
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("structured logging with PHI redaction", () => {
  it("keeps names, check-in text, pain values and credentials out of every log line", async () => {
    const s = await login(app, org.therapist.email);
    const read = await as(app, s)({ method: "GET", url: `/patients/${org.patient.patientId}` });
    expect(read.json().givenName).toBe(canaryGiven);

    // A failing handler whose error message quotes the note and pain value.
    const failed = await app.inject({
      method: "POST",
      url: "/test/check-in",
      headers: { origin: ORIGIN },
      payload: { painScore: PAIN, note: canaryNote },
    });
    expect(failed.statusCode).toBe(500);
    // A validation failure carrying the same content.
    await app.inject({
      method: "POST",
      url: "/test/check-in",
      headers: { origin: ORIGIN },
      payload: { painScore: 11, note: canaryNote, extra: canaryFamily },
    });
    // Failed login with an unknown email and a password.
    await loginRaw(app, { email: canaryEmail, password: canaryPassword });
    // A patient id in the URL is fine as a resource id, but the raw URL is not logged.
    await as(
      app,
      s,
    )({ method: "GET", url: `/patients/${org.patient.patientId}?q=${canaryFamily}` });

    const log = lines.join("");
    expect(lines.length).toBeGreaterThan(5);
    for (const canary of [
      canaryGiven,
      canaryFamily,
      canaryNote,
      canaryPassword,
      canaryEmail,
      org.therapist.email,
      "painScore",
      `pain=${PAIN}`,
      s.cookie.split("=")[1]!,
    ]) {
      expect(log, `log contains ${canary}`).not.toContain(canary);
    }
  });

  it("still logs what operators need: request id, route template, status, actor", async () => {
    const parsed = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
    const completed = parsed.filter((l) => l["msg"] === "request completed");
    expect(completed.length).toBeGreaterThan(0);
    const patientRead = completed.find((l) => l["route"] === "/patients/:patientId");
    expect(patientRead).toMatchObject({
      method: "GET",
      statusCode: 200,
      actorUserId: org.therapist.userId,
      orgId: org.orgId,
    });
    expect(typeof patientRead?.["reqId"]).toBe("string");
    const crash = parsed.find((l) => l["msg"] === "unhandled error");
    expect(crash?.["err"]).toMatchObject({ type: "Error" });
  });
});
