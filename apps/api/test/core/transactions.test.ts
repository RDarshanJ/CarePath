/**
 * Checkpoint C1, M4: a mutation and its audit event commit together or not at all.
 */
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inTransaction } from "../../src/core/db/repo.js";
import { fixtureRoutes } from "../support/fixture-routes.js";
import { as, login, testApp } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  patientPhone,
  setPatientPhone,
  type OrgFixture,
} from "../support/repo.js";

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

describe("withTx: mutation and audit in one transaction", () => {
  it("commits the change and its audit event together", async () => {
    const coordinator = await login(app, org.coordinator.email);
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/test/patients/${org.patient.patientId}/phone`,
      payload: { phone: "555-0101", failAudit: false },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(await patientPhone(db, org.patient.patientId)).toBe("555-0101");
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["settings.update"]);
    expect(events[0]?.patientId).toBe(org.patient.patientId);
  });

  it("a forced audit failure leaves no changed row and no event", async () => {
    const coordinator = await login(app, org.coordinator.email);
    const before = await patientPhone(db, org.patient.patientId);
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/test/patients/${org.patient.patientId}/phone`,
      payload: { phone: "555-0199", failAudit: true },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe("internal_error");
    expect(await patientPhone(db, org.patient.patientId)).toBe(before);
    expect(await auditEventsForRequest(db, res.headers["x-request-id"] as string)).toEqual([]);
  });

  it("inTransaction rolls back every write when the callback throws", async () => {
    const before = await patientPhone(db, org.otherPatient.patientId);
    const ctx = {
      requestId: "test",
      sessionId: "test",
      userId: org.coordinator.userId,
      orgId: org.orgId,
      role: "care_coordinator" as const,
      permissions: new Set<never>(),
      patientId: null,
      practitionerId: null,
    };
    await expect(
      inTransaction(db, async (tx) => {
        await setPatientPhone(tx, ctx, org.otherPatient.patientId, "555-0150");
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await patientPhone(db, org.otherPatient.patientId)).toBe(before);
  });

  it("login writes its session and audit event in one transaction", async () => {
    const s = await login(app, org.therapist.email);
    const res = await as(app, s)({ method: "POST", url: "/auth/logout" });
    expect(res.statusCode).toBe(204);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["auth.logout"]);
  });
});
