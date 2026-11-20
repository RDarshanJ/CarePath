import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BANNED_DIAGNOSTIC_TERMS,
  EMERGENCY_NOTICE,
  findBannedDiagnosticTerms,
} from "@carepath/shared";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  createClinicalFixture,
  observationsForCheckIn,
  reviewTasksFor,
  setClinic,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";
import { evaluatePainRule } from "../../src/modules/review/pain.js";

/** Delivery step 2: Scenario C (sessions, resume, skip, stop) and the pain rule of Scenario D. */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let fx: ClinicalFixture;
let patient: Session;
let call: ReturnType<typeof as>;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  patient = await login(app, org.patient.email);
  call = as(app, patient);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const base = () => `/patients/${org.patient.patientId}`;
type Detail = {
  id: string;
  status: string;
  currentPosition: number;
  versionNumber: number;
  checkInRequested: boolean;
  activities: { id: string; status: string; skipReason: string | null; position: number }[];
  activityCounts: Record<string, number>;
};

async function start(): Promise<Detail> {
  const res = await call({ method: "POST", url: `${base()}/sessions`, payload: {} });
  expect(res.statusCode, res.body).toBe(201);
  return res.json();
}

function complete(s: Detail, index: number) {
  return call({
    method: "PUT",
    url: `${base()}/sessions/${s.id}/activities/${s.activities[index]!.id}`,
    payload: { status: "completed", completedSets: 2, completedReps: 12 },
  });
}

describe("guided session (Scenario C)", () => {
  let s: Detail;

  it("starts on the current version with one pending activity per exercise", async () => {
    s = await start();
    expect(s).toMatchObject({ status: "in_progress", versionNumber: 2, currentPosition: 0 });
    expect(s.activities).toHaveLength(5);
    expect(s.activities.every((a) => a.status === "pending")).toBe(true);
    const again = await call({ method: "POST", url: `${base()}/sessions`, payload: {} });
    expect(again.statusCode).toBe(409);
    expect(again.json().error.code).toBe("session_open");
  });

  it("resumes at exercise 3 of 5 with the first two recorded (AC-C1)", async () => {
    expect((await complete(s, 0)).statusCode).toBe(200);
    expect((await complete(s, 1)).json().currentPosition).toBe(2);
    const pause = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/pause`,
      payload: { currentPosition: 2, elapsedSeconds: 310 },
    });
    expect(pause.json()).toMatchObject({
      status: "paused",
      currentPosition: 2,
      elapsedSeconds: 310,
    });

    // Interruption: a new sign-in (another device) finds the paused session on Today.
    const again = as(app, await login(app, org.patient.email));
    const today = await again({ method: "GET", url: `${base()}/today` });
    expect(today.json().session).toEqual({
      state: "paused",
      openSessionId: s.id,
      lastSessionId: null,
    });

    const blocked = await complete(s, 2);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe("invalid_transition");

    const resumed = await again({
      method: "POST",
      url: `${base()}/sessions/${s.id}/resume`,
      payload: {},
    });
    expect(resumed.statusCode).toBe(200);
    const body = resumed.json() as Detail;
    expect(body.status).toBe("in_progress");
    expect(body.currentPosition).toBe(2);
    expect(body.activities.map((a) => a.status)).toEqual([
      "completed",
      "completed",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("stores a skip with its reason and does not count it as completed (AC-C3)", async () => {
    const res = await call({
      method: "PUT",
      url: `${base()}/sessions/${s.id}/activities/${s.activities[2]!.id}`,
      payload: { status: "skipped", skipReason: "No step available at home" },
    });
    const body = res.json() as Detail;
    expect(body.activities[2]).toMatchObject({
      status: "skipped",
      skipReason: "No step available at home",
    });
    expect(body.activityCounts).toEqual({ total: 5, completed: 2, skipped: 1, pending: 2 });
    expect(body.currentPosition).toBe(3);
    const empty = await call({
      method: "PUT",
      url: `${base()}/sessions/${s.id}/activities/${s.activities[3]!.id}`,
      payload: { status: "skipped", skipReason: "   " },
    });
    expect(empty.statusCode).toBe(400);
  });

  it("refuses to finish with pending activities, then completes", async () => {
    const early = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/complete`,
      payload: { currentPosition: 3, elapsedSeconds: 600 },
    });
    expect(early.statusCode).toBe(409);
    expect(early.json().error.details[0].issue).toBe("pending_activities");
    await complete(s, 3);
    await complete(s, 4);
    const done = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/complete`,
      payload: { currentPosition: 4, elapsedSeconds: 900 },
    });
    expect(done.json()).toMatchObject({ status: "completed", checkInRequested: true });
  });

  it("answers session_closed for actions on an ended session and keeps completed final", async () => {
    const pause = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/pause`,
      payload: { currentPosition: 0, elapsedSeconds: 1 },
    });
    expect(pause.json().error.code).toBe("session_closed");
    const redo = await call({
      method: "PUT",
      url: `${base()}/sessions/${s.id}/activities/${s.activities[0]!.id}`,
      payload: { status: "skipped", skipReason: "changed my mind" },
    });
    expect(redo.json().error.code).toBe("session_closed");
  });

  it("shows the session as done on Today, with a check-in due for it", async () => {
    const today = await call({ method: "GET", url: `${base()}/today` });
    expect(today.json()).toMatchObject({
      session: { state: "done", lastSessionId: s.id },
      checkIn: { due: true, sessionId: s.id },
      week: { completedSessions: 1, completedActivities: 4, skippedActivities: 1 },
    });
  });

  it("records a check-in below the threshold with no notice and no task (AC-C6, AC-D3)", async () => {
    const res = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: s.id, painScore: 6, difficulty: "as_expected", notes: "Fine overall" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      seenBy: "care_team",
      painNotice: null,
      checkIn: { painScore: 6, sessionId: s.id },
    });
    expect(await reviewTasksFor(db, org.patient.patientId)).toHaveLength(0);
    const obs = await observationsForCheckIn(db, body.checkIn.id);
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatchObject({
      code: "72514-3",
      codeSystem: "http://loinc.org",
      performerType: "patient",
      status: "final",
    });
    expect(Number(obs[0]!.valueQuantity)).toBe(6);

    const dup = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: s.id, painScore: 3 },
    });
    expect(dup.json().error.code).toBe("already_exists");
    const today = await call({ method: "GET", url: `${base()}/today` });
    expect(today.json().checkIn).toMatchObject({ due: false, sessionId: null });
  });
});

describe("stop for discomfort and the pain rule (AC-C4, Scenario D)", () => {
  let stoppedId: string;

  it("ends the session as stopped and asks for a pain report", async () => {
    const s = await start();
    const other = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/stop`,
      payload: { activityId: fx.v2Assignments[0], discomfortLevel: 8 },
    });
    expect(other.statusCode).toBe(400);
    const res = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/stop`,
      payload: { activityId: s.activities[1]!.id, discomfortLevel: 8, note: "Sharp at the knee" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "stopped_discomfort", checkInRequested: true });
    expect(res.json().stoppedAt).toBe(NOW.toISOString());
    expect(res.json().activities[1]).toMatchObject({
      discomfortLevel: 8,
      discomfortNote: "Sharp at the knee",
    });
    stoppedId = s.id;
    const again = await call({
      method: "POST",
      url: `${base()}/sessions/${s.id}/stop`,
      payload: { activityId: s.activities[1]!.id, discomfortLevel: 8 },
    });
    expect(again.json().error.code).toBe("session_closed");
  });

  it("at the threshold returns the contact notice and raises exactly one task (AC-D1, AC-D7)", async () => {
    const res = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: stoppedId, painScore: 7 },
    });
    expect(res.statusCode).toBe(201);
    const { painNotice, checkIn } = res.json();
    expect(painNotice).toEqual({
      painScore: 7,
      threshold: 7,
      clinicPhone: "(555) 555-0110",
      message:
        "You reported pain of 7 out of 10. If you are worried, contact your clinic at (555) 555-0110.",
      emergencyNotice: EMERGENCY_NOTICE,
    });
    expect(BANNED_DIAGNOSTIC_TERMS.length).toBeGreaterThan(0);
    expect(
      findBannedDiagnosticTerms(`${painNotice.message} ${painNotice.emergencyNotice}`),
    ).toEqual([]);

    const tasks = await reviewTasksFor(db, org.patient.patientId);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      ruleId: fx.ruleIds["reported_pain"],
      status: "open",
      dedupeKey: `checkin:${checkIn.id}`,
      explanation: "Reported pain 7 of 10. Clinic rule: 7 or higher.",
    });
    expect(tasks[0]!.evidence).toEqual([
      {
        type: "PatientCheckIn",
        id: checkIn.id,
        field: "painScore",
        value: 7,
        threshold: 7,
        unit: "of 10",
      },
    ]);

    // AC-D2: the same check-in processed again still leaves one task.
    for (let i = 0; i < 2; i++) {
      const again = await evaluatePainRule(
        db,
        { orgId: org.orgId },
        {
          patientId: org.patient.patientId,
          checkInId: checkIn.id,
          painScore: 7,
          now: NOW,
        },
      );
      expect(again.taskId).toBeNull();
    }
    expect(await reviewTasksFor(db, org.patient.patientId)).toHaveLength(1);
  });

  it("says contact your clinic when the clinic has no phone", async () => {
    await setClinic(db, org.orgId, { phone: null });
    const res = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: null, painScore: 9 },
    });
    expect(res.json().painNotice.message).toBe(
      "You reported pain of 9 out of 10. If you are worried, contact your clinic.",
    );
    await setClinic(db, org.orgId, {});
  });

  it("rejects a check-in on another patient's session as a validation error", async () => {
    const res = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: "00000000-0000-4000-8000-000000000000", painScore: 2 },
    });
    expect(res.statusCode).toBe(400);
  });

  it("lets only one of two concurrent starts through (partial unique index)", async () => {
    const other = as(app, await login(app, org.otherPatient.email));
    const url = `/patients/${org.otherPatient.patientId}/sessions`;
    const results = await Promise.all([
      other({ method: "POST", url, payload: {} }),
      other({ method: "POST", url, payload: {} }),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.statusCode === 409)!.json().error.code).toBe("session_open");
  });

  it("answers plan_not_published for a patient without a published plan", async () => {
    const bare = await createOrgFixture(db);
    const s = as(app, await login(app, bare.patient.email));
    const res = await s({
      method: "POST",
      url: `/patients/${bare.patient.patientId}/sessions`,
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("plan_not_published");
  });
});
