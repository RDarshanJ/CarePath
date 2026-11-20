import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, testApp, type Session } from "../support/http.js";
import { fixtureRoutes } from "../support/fixture-routes.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";

/** Scenario I: organization isolation, IDOR, care-team write scope. */
const db = createTestDb();
let app: FastifyInstance;
let orgA: OrgFixture;
let orgB: OrgFixture;

beforeAll(async () => {
  app = await testApp(db, { extraRoutes: fixtureRoutes });
  orgA = await createOrgFixture(db);
  orgB = await createOrgFixture(db);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

async function deniedEvent(requestId: string) {
  const events = await auditEventsForRequest(db, requestId);
  expect(events).toHaveLength(1);
  return events[0]!;
}

describe("cross-organization access", () => {
  let bTherapist: Session;
  let bAdmin: Session;
  beforeAll(async () => {
    bTherapist = await login(app, orgB.therapist.email);
    bAdmin = await login(app, orgB.admin.email);
  });

  it("answers 404 for another organization's patient and writes a security event", async () => {
    const res = await as(
      app,
      bTherapist,
    )({
      method: "GET",
      url: `/patients/${orgA.patient.patientId}`,
    });
    expect(res.statusCode).toBe(404);
    const e = await deniedEvent(res.headers["x-request-id"] as string);
    expect(e).toMatchObject({
      eventName: "security.access_denied",
      detailCode: "out_of_scope",
      outcome: "minor_failure",
      actorUserId: orgB.therapist.userId,
      actorRole: "physical_therapist",
      organizationId: orgB.orgId,
      resourceType: "Patient",
      resourceId: orgA.patient.patientId,
      patientId: null,
    });
    expect(e.metadata).toMatchObject({ route: "/patients/:patientId", method: "GET" });
    // AC-I7: no patient content in the event.
    expect(JSON.stringify(e)).not.toContain("Jordan");
  });

  it("gives a byte-identical 404 for a missing id and another organization's id (AC-I6)", async () => {
    const foreign = await as(
      app,
      bAdmin,
    )({
      method: "GET",
      url: `/patients/${orgA.otherPatient.patientId}`,
    });
    const missing = await as(app, bAdmin)({ method: "GET", url: `/patients/${randomUUID()}` });
    expect(foreign.statusCode).toBe(404);
    expect(missing.statusCode).toBe(404);
    expect(foreign.body).toBe(missing.body);
    expect(foreign.headers["content-type"]).toBe(missing.headers["content-type"]);
    expect(foreign.json()).toEqual({ error: { code: "not_found", message: "Not found." } });
  });

  it("answers 404 to a cross-organization write before any care-team check", async () => {
    const res = await as(
      app,
      bTherapist,
    )({
      method: "POST",
      url: `/test/patients/${orgA.patient.patientId}/clinical-write`,
    });
    expect(res.statusCode).toBe(404);
    expect((await deniedEvent(res.headers["x-request-id"] as string)).detailCode).toBe(
      "out_of_scope",
    );
  });
});

describe("IDOR on a patient id", () => {
  it("lets a patient read their own record and audits it as phi.read", async () => {
    const s = await login(app, orgA.patient.email);
    const res = await as(app, s)({ method: "GET", url: `/patients/${orgA.patient.patientId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: orgA.patient.patientId, birthDate: "1975-09-14" });
    const [e] = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(e).toMatchObject({
      eventName: "phi.read",
      action: "R",
      outcome: "success",
      patientId: orgA.patient.patientId,
      purposeOfUse: "patient_access",
    });
  });

  it("answers 404 when a patient requests another patient in the same organization (AC-I2)", async () => {
    const s = await login(app, orgA.patient.email);
    const res = await as(
      app,
      s,
    )({
      method: "GET",
      url: `/patients/${orgA.otherPatient.patientId}`,
    });
    expect(res.statusCode).toBe(404);
    const e = await deniedEvent(res.headers["x-request-id"] as string);
    expect(e).toMatchObject({
      eventName: "security.access_denied",
      actorUserId: orgA.patient.userId,
      resourceId: orgA.otherPatient.patientId,
      detailCode: "out_of_scope",
    });
  });

  it("rejects a malformed id with 400 and no lookup", async () => {
    const s = await login(app, orgA.patient.email);
    const res = await as(app, s)({ method: "GET", url: "/patients/1%20OR%201=1" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("validation_error");
    expect(await auditEventsForRequest(db, res.headers["x-request-id"] as string)).toHaveLength(0);
  });
});

describe("clinician scope: read org-wide, write only for care-team patients", () => {
  it("lets a therapist read a patient who is not on their care team (audited)", async () => {
    const s = await login(app, orgA.otherTherapist.email);
    const res = await as(app, s)({ method: "GET", url: `/patients/${orgA.patient.patientId}` });
    expect(res.statusCode).toBe(200);
    const [e] = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(e).toMatchObject({ eventName: "phi.read", purposeOfUse: "treatment" });
  });

  it("allows a clinical write by a care-team therapist", async () => {
    const s = await login(app, orgA.therapist.email);
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: `/test/patients/${orgA.patient.patientId}/clinical-write`,
    });
    expect(res.statusCode).toBe(200);
  });

  it("refuses a clinical write by a therapist outside the care team with 403 and an event", async () => {
    const s = await login(app, orgA.otherTherapist.email);
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: `/test/patients/${orgA.patient.patientId}/clinical-write`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("not_on_care_team");
    const e = await deniedEvent(res.headers["x-request-id"] as string);
    expect(e).toMatchObject({
      eventName: "security.access_denied",
      detailCode: "not_on_care_team",
      action: "C",
      patientId: orgA.patient.patientId,
    });
  });

  it("refuses a clinical write by a coordinator by permission (403)", async () => {
    const s = await login(app, orgA.coordinator.email);
    const res = await as(
      app,
      s,
    )({
      method: "POST",
      url: `/test/patients/${orgA.patient.patientId}/clinical-write`,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("forbidden");
  });

  it("lets a patient write to their own record but not another patient's", async () => {
    const s = await login(app, orgA.otherPatient.email);
    const own = await as(
      app,
      s,
    )({
      method: "POST",
      url: `/test/patients/${orgA.otherPatient.patientId}/clinical-write`,
    });
    expect(own.statusCode).toBe(200);
    const other = await as(
      app,
      s,
    )({
      method: "POST",
      url: `/test/patients/${orgA.patient.patientId}/clinical-write`,
    });
    expect(other.statusCode).toBe(404);
  });
});
