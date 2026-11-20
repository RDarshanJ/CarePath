import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CARE_TEAM_THREAD_SUBJECT } from "@carepath/shared";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import {
  awaitingWithCoordinatorTeam,
  backToAwaiting,
  threadsOf,
} from "../support/scheduling/repo.js";

/**
 * Orchestrator ruling with WP 4.1: assigning a therapist creates the patient-to-care-team
 * conversation in the same transaction, idempotently, with the patient, the assigned therapist
 * and the care team's coordinator as participants.
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let coordinator: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  coordinator = await login(app, org.coordinator.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const assign = (patientId: string, practitionerId: string) =>
  as(
    app,
    coordinator,
  )({
    method: "POST",
    url: `/patients/${patientId}/care-team/assignments`,
    payload: { practitionerId },
  });

describe("assignment creates the care-team thread", () => {
  it("creates nothing when the assignment is refused", async () => {
    // otherPatient is still intake_incomplete: 409 and the transaction rolls back.
    const res = await assign(org.otherPatient.patientId, org.therapist.practitionerId);
    expect(res.json().error.code).toBe("invalid_transition");
    expect(await threadsOf(db, org.otherPatient.patientId)).toEqual([]);
  });

  it("creates one thread with patient, therapist and coordinator, and the patient can use it", async () => {
    const pid = org.otherPatient.patientId;
    await awaitingWithCoordinatorTeam(db, org, pid);
    expect((await assign(pid, org.therapist.practitionerId)).statusCode).toBe(200);
    const threads = await threadsOf(db, pid);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.subject).toBe(CARE_TEAM_THREAD_SUBJECT);
    expect(threads[0]!.participants.map((p) => p.userId).sort()).toEqual(
      [org.otherPatient.userId, org.therapist.userId, org.coordinator.userId].sort(),
    );

    const patient = await login(app, org.otherPatient.email);
    const list = (await as(app, patient)({ method: "GET", url: "/conversations" })).json();
    expect(JSON.stringify(list)).toContain(threads[0]!.id);
    const sent = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `/conversations/${threads[0]!.id}/messages`,
      payload: { body: "Hello care team" },
    });
    expect(sent.statusCode).toBeLessThan(300);
  });

  it("is idempotent: a reassignment reuses the thread and adds only the new therapist", async () => {
    const pid = org.otherPatient.patientId;
    const before = await threadsOf(db, pid);
    await backToAwaiting(db, pid);
    expect((await assign(pid, org.otherTherapist.practitionerId)).statusCode).toBe(200);
    const after = await threadsOf(db, pid);
    expect(after).toHaveLength(1);
    expect(after[0]!.id).toBe(before[0]!.id);
    expect(after[0]!.participants.map((p) => p.userId).sort()).toEqual(
      [
        org.otherPatient.userId,
        org.therapist.userId,
        org.otherTherapist.userId,
        org.coordinator.userId,
      ].sort(),
    );
  });
});
