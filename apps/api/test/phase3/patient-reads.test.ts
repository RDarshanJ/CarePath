import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EMERGENCY_NOTICE, EXERCISE_CONTENT_NOTICE } from "@carepath/shared";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  auditEvents,
  createClinicalFixture,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";

/** Delivery step 1: patient reads (Today, plan, versions, sessions, check-ins, progress, clinic). */
const NOW = new Date("2026-11-19T16:00:00Z"); // Thursday, 09:00 in America/Phoenix
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let fx: ClinicalFixture;
let patient: Session;
let therapist: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  patient = await login(app, org.patient.email);
  therapist = await login(app, org.therapist.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const base = () => `/patients/${org.patient.patientId}`;

describe("Today", () => {
  it("computes the local date, the due session and the unacknowledged plan change", async () => {
    const res = await as(app, patient)({ method: "GET", url: `${base()}/today` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      date: "2026-11-19",
      timezone: "America/Phoenix",
      plan: { versionId: fx.v2, versionNumber: 2, exerciseCount: 5, exercisesToday: 5 },
      session: { state: "due", openSessionId: null },
      checkIn: { due: true, sessionId: null, lastSubmittedAt: null },
      planChange: {
        versionId: fx.v2,
        changeNoteForPatient: "Added hip work and two more reps on the first exercise.",
        publishedBy: { practitionerId: org.therapist.practitionerId, name: "Riley Example" },
      },
      week: {
        weekStart: "2026-11-16",
        weekEnd: "2026-11-22",
        assignedSessions: 4,
        completedSessions: 0,
      },
    });
  });

  it("hides the plan change once acknowledged (REQ-TOD-02)", async () => {
    const ack = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `${base()}/care-plan/versions/${fx.v2}/acknowledge`,
      payload: {},
    });
    expect(ack.statusCode).toBe(204);
    const res = await as(app, patient)({ method: "GET", url: `${base()}/today` });
    expect(res.json().planChange).toBeNull();
  });

  it("is a patient screen: a therapist is refused with 403", async () => {
    const res = await as(app, therapist)({ method: "GET", url: `${base()}/today` });
    expect(res.statusCode).toBe(403);
  });
});

describe("care plan reads", () => {
  it("returns the current version with the computed diff, author and date (AC-B3)", async () => {
    const res = await as(app, patient)({ method: "GET", url: `${base()}/care-plan` });
    expect(res.statusCode).toBe(200);
    const { plan } = res.json();
    expect(plan.preview).toBe(false);
    expect(plan.version).toMatchObject({ id: fx.v2, number: 2, isCurrent: true });
    expect(plan.items.map((i: { position: number }) => i.position)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.contentNotice).toBe(EXERCISE_CONTENT_NOTICE);
    const diff = plan.diffFromPrevious;
    expect(diff.previousVersionNumber).toBe(1);
    expect(diff.added.map((e: { exerciseId: string }) => e.exerciseId)).toEqual(
      fx.exerciseIds.slice(3, 6),
    );
    expect(diff.removed.map((e: { exerciseId: string }) => e.exerciseId)).toEqual([
      fx.exerciseIds[1],
    ]);
    expect(diff.changed).toEqual([
      { exerciseId: fx.exerciseIds[0], name: "Synthetic exercise 1", fields: ["reps"] },
      { exerciseId: fx.exerciseIds[2], name: "Synthetic exercise 3", fields: ["reps"] },
    ]);
    expect(plan.goals).toHaveLength(1);
  });

  it("lists every version with author and time, and opens version 1 without a diff (AC-B7)", async () => {
    const list = await as(app, patient)({ method: "GET", url: `${base()}/care-plan/versions` });
    expect(list.json().items.map((v: { number: number }) => v.number)).toEqual([2, 1]);
    expect(list.json().items[1]).toMatchObject({
      id: fx.v1,
      isCurrent: false,
      changeNoteForPatient: null,
    });
    const v1 = await as(
      app,
      patient,
    )({ method: "GET", url: `${base()}/care-plan/versions/${fx.v1}` });
    expect(v1.statusCode).toBe(200);
    expect(v1.json()).toMatchObject({
      version: { number: 1, isCurrent: false },
      diffFromPrevious: null,
    });
  });

  it("audits a clinician opening the plan as phi.read", async () => {
    const res = await as(app, therapist)({ method: "GET", url: `${base()}/care-plan` });
    expect(res.statusCode).toBe(200);
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events.map((e) => e.eventName)).toEqual(["phi.read"]);
    expect(events[0]).toMatchObject({
      patientId: org.patient.patientId,
      purposeOfUse: "treatment",
    });
  });

  it("answers plan null for a patient with no published version", async () => {
    const bare = await createOrgFixture(db);
    const s = await login(app, bare.patient.email);
    const res = await as(
      app,
      s,
    )({ method: "GET", url: `/patients/${bare.patient.patientId}/care-plan` });
    expect(res.json()).toEqual({ plan: null });
    const today = await as(
      app,
      s,
    )({ method: "GET", url: `/patients/${bare.patient.patientId}/today` });
    expect(today.json()).toMatchObject({
      plan: null,
      session: { state: "not_scheduled" },
      planChange: null,
    });
  });
});

describe("other patient reads", () => {
  it("returns the clinic card with phone and the emergency notice", async () => {
    const res = await as(app, patient)({ method: "GET", url: `${base()}/clinic` });
    expect(res.json()).toMatchObject({
      phone: "(555) 555-0110",
      emergencyNotice: EMERGENCY_NOTICE,
      replyTimeText: "Your care team usually replies within one business day.",
    });
  });

  it("returns empty session and check-in pages", async () => {
    for (const path of ["sessions", "check-ins"]) {
      const res = await as(app, patient)({ method: "GET", url: `${base()}/${path}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ items: [], nextCursor: null });
    }
  });

  it("returns weekly progress with patient-reported pain and goals", async () => {
    const res = await as(app, patient)({ method: "GET", url: `${base()}/progress?weeks=2` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.weeks).toHaveLength(2);
    expect(body.weeks[0]).toMatchObject({ weekStart: "2026-11-09", assignedSessions: 7 });
    expect(body.weeks[1]).toMatchObject({ weekStart: "2026-11-16", assignedSessions: 4 });
    expect(body.pain).toEqual({ label: "Patient-reported", scale: "0 to 10", points: [] });
    expect(body.goals[0].description).toBe("Climb one flight of stairs without stopping");
  });

  it("rejects a malformed cursor with 400", async () => {
    const res = await as(app, patient)({ method: "GET", url: `${base()}/sessions?cursor=nope` });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].path).toBe("querystring.cursor");
  });
});
