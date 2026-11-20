import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  auditEvents,
  createClinicalFixture,
  createIntake,
  reviewTasksFor,
  sessionRow,
  setPatientCreatedAt,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";
import { createJobHandlers } from "../../src/jobs/handlers.js";
import { ABANDON_SESSIONS_QUEUE, TIME_RULES_QUEUE } from "../../src/modules/review/queues.js";

/** Delivery step 5: Scenario D actions, rules, check-in review and the time-based jobs. */
const NOW = new Date("2026-11-19T16:00:00Z");
const H = 3_600_000;
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let orgB: OrgFixture;
let fx: ClinicalFixture;
let therapist: Session;
let admin: Session;
let coordinator: Session;
let patient: ReturnType<typeof as>;
let painTaskId: string;
let checkInId: string;

const base = () => `/patients/${org.patient.patientId}`;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  orgB = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  await createClinicalFixture(db, orgB, NOW);
  therapist = await login(app, org.therapist.email);
  admin = await login(app, org.admin.email);
  coordinator = await login(app, org.coordinator.email);
  patient = as(app, await login(app, org.patient.email));
  const res = await patient({
    method: "POST",
    url: `${base()}/check-ins`,
    payload: { sessionId: null, painScore: 9 },
  });
  checkInId = res.json().checkIn.id;
  painTaskId = (await reviewTasksFor(db, org.patient.patientId))[0]!.id;
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("task actions (REQ-RVQ-03)", () => {
  const url = (action: string) => `${base()}/review-tasks/${painTaskId}/${action}`;

  it("assigns and unassigns within the care team", async () => {
    const call = as(app, therapist);
    const a = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: org.therapist.practitionerId },
    });
    expect(a.json()).toMatchObject({
      status: "in_review",
      assignedTo: { practitionerId: org.therapist.practitionerId },
    });
    const u = await call({ method: "POST", url: url("assign"), payload: { practitionerId: null } });
    expect(u.json()).toMatchObject({ status: "open", assignedTo: null });
    const bad = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: orgB.therapist.practitionerId },
    });
    expect(bad.statusCode).toBe(400);
    const off = await as(
      app,
      await login(app, org.otherTherapist.email),
    )({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: null },
    });
    expect(off.json().error.code).toBe("not_on_care_team");
  });

  it("refuses a coordinator on a clinical rule's task", async () => {
    const res = await as(
      app,
      coordinator,
    )({ method: "POST", url: url("resolve"), payload: { note: "Called." } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("forbidden");
  });

  it("resolves with a note, records resolver and time, leaves the open queue (AC-D5)", async () => {
    const call = as(app, therapist);
    expect(
      (await call({ method: "POST", url: url("resolve"), payload: { note: "" } })).statusCode,
    ).toBe(400);
    const res = await call({
      method: "POST",
      url: url("resolve"),
      payload: { note: "Called the patient; pain eased." },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      status: "resolved",
      resolvedAt: NOW.toISOString(),
      resolvedBy: { userId: org.therapist.userId },
      resolutionNote: "Called the patient; pain eased.",
    });
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events.map((e) => [e.eventName, e.resourceId])).toEqual([
      ["review_task.resolve", painTaskId],
    ]);

    const open = await call({ method: "GET", url: "/review-tasks" });
    expect(open.json().items.map((t: { id: string }) => t.id)).not.toContain(painTaskId);
    const closed = await call({ method: "GET", url: "/review-tasks?status=closed" });
    expect(closed.json().items.map((t: { id: string }) => t.id)).toContain(painTaskId);
    const again = await call({ method: "POST", url: url("dismiss"), payload: { note: "again" } });
    expect(again.json().error.code).toBe("invalid_transition");
    const history = await call({ method: "GET", url: `${base()}/record-history` });
    const resolved = history
      .json()
      .items.find((i: { resourceId: string }) => i.resourceId === painTaskId);
    expect(resolved).toMatchObject({
      kind: "review_task_resolved",
      actor: { userId: org.therapist.userId },
    });
  });

  it("marks a check-in reviewed once", async () => {
    const call = as(app, therapist);
    const url = `${base()}/check-ins/${checkInId}/review`;
    const res = await call({ method: "POST", url, payload: {} });
    expect(res.json()).toMatchObject({
      id: checkInId,
      reviewedAt: NOW.toISOString(),
      reviewedBy: { userId: org.therapist.userId },
    });
    expect((await call({ method: "POST", url, payload: {} })).json().error.code).toBe(
      "already_exists",
    );
    const overview = (await call({ method: "GET", url: "/overview" })).json();
    expect(overview.unreviewedCheckIns.count).toBe(0);
  });
});

describe("review rules (REQ-RVQ-01, AC-D4)", () => {
  it("lists rules with the demo-defaults notice", async () => {
    const res = await as(app, admin)({ method: "GET", url: "/review-rules" });
    expect(res.json().notice).toContain("arbitrary demonstration values");
    const pain = res.json().items.find((r: { key: string }) => r.key === "reported_pain");
    expect(pain).toMatchObject({
      params: { threshold: 7 },
      defaultParams: { threshold: 7 },
      kind: "clinical",
    });
    expect((await as(app, therapist)({ method: "GET", url: "/review-rules" })).statusCode).toBe(
      200,
    );
  });

  it("applies a threshold change to later check-ins and audits it", async () => {
    const url = `/review-rules/${fx.ruleIds["reported_pain"]}`;
    const before = await patient({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: null, painScore: 5 },
    });
    expect(before.json().painNotice).toBeNull();
    expect(
      (
        await as(
          app,
          therapist,
        )({ method: "PUT", url, payload: { enabled: true, params: { threshold: 5 } } })
      ).statusCode,
    ).toBe(403);
    const wrong = await as(
      app,
      admin,
    )({ method: "PUT", url, payload: { enabled: true, params: { thresholdDays: 5 } } });
    expect(wrong.json().error.details[0].path).toBe("body.params");
    const res = await as(
      app,
      admin,
    )({ method: "PUT", url, payload: { enabled: true, params: { threshold: 5 } } });
    expect(res.json()).toMatchObject({ params: { threshold: 5 } });
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events[0]).toMatchObject({
      eventName: "review_rule.update",
      resourceId: fx.ruleIds["reported_pain"],
    });
    expect(events[0]!.metadata).toMatchObject({ ruleKey: "reported_pain", "param.threshold": 5 });

    const after = await patient({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: null, painScore: 5 },
    });
    expect(after.json().painNotice).toMatchObject({ threshold: 5 });
    const open = (await reviewTasksFor(db, org.patient.patientId)).filter(
      (t) => t.status === "open",
    );
    expect(open).toHaveLength(1);
    expect(open[0]!.explanation).toBe("Reported pain 5 of 10. Clinic rule: 5 or higher.");
  });

  it("refuses another organization's rule with 404", async () => {
    const res = await as(
      app,
      await login(app, orgB.admin.email),
    )({
      method: "PUT",
      url: `/review-rules/${fx.ruleIds["reported_pain"]}`,
      payload: { enabled: false, params: { threshold: 3 } },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("time-based jobs, scoped by job.organizationId", () => {
  const job = (queue: string, organizationId: string | null) => ({
    id: "00000000-0000-4000-8000-000000000001",
    queue,
    payload: {},
    attempts: 1,
    maxAttempts: 5,
    organizationId,
  });

  it("raises unreviewed-check-in and missing-intake tasks once, for one organization only", async () => {
    const later = new Date(NOW.getTime() + 49 * H);
    await createIntake(db, org.orgId, org.otherPatient.patientId, {
      personal_information: {
        givenName: "A",
        familyName: "B",
        birthDate: "1980-01-01",
        phone: null,
        preferredLanguage: "en",
      },
    });
    await setPatientCreatedAt(db, org.otherPatient.patientId, new Date(NOW.getTime() - 5 * 24 * H));
    const handlers = createJobHandlers({ db, now: () => later });
    await handlers[TIME_RULES_QUEUE]!(job(TIME_RULES_QUEUE, org.orgId));
    await handlers[TIME_RULES_QUEUE]!(job(TIME_RULES_QUEUE, org.orgId));

    const tasks = await reviewTasksFor(db, org.patient.patientId);
    const unreviewed = tasks.filter((t) => t.ruleId === fx.ruleIds["unreviewed_checkin"]);
    expect(unreviewed).toHaveLength(2); // the two later check-ins; the first was reviewed
    expect(unreviewed[0]!.explanation).toBe("Not reviewed for 49 hours. Clinic rule: 48.");
    const intake = (await reviewTasksFor(db, org.otherPatient.patientId)).filter(
      (t) => t.ruleId === fx.ruleIds["missing_intake"],
    );
    expect(intake).toHaveLength(1);
    expect(intake[0]!.explanation).toMatch(
      /^Intake incomplete for 7 days\. Missing: primary goal, body area/,
    );
    expect(await reviewTasksFor(db, orgB.patient.patientId)).toHaveLength(0);
    await expect(handlers[TIME_RULES_QUEUE]!(job(TIME_RULES_QUEUE, null))).rejects.toThrow(
      "organizationId",
    );
  });

  it("lets a coordinator resolve the administrative missing-intake task", async () => {
    const [task] = (await reviewTasksFor(db, org.otherPatient.patientId)).filter(
      (t) => t.ruleId === fx.ruleIds["missing_intake"],
    );
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${org.otherPatient.patientId}/review-tasks/${task!.id}/resolve`,
      payload: { note: "Sent a reminder." },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ kind: "administrative", status: "resolved" });
  });

  it("raises a missed-sessions task from the plan schedule", async () => {
    const handlers = createJobHandlers({ db, now: () => NOW });
    await handlers[TIME_RULES_QUEUE]!(job(TIME_RULES_QUEUE, org.orgId));
    const missed = (await reviewTasksFor(db, org.patient.patientId)).filter(
      (t) => t.ruleId === fx.ruleIds["missed_sessions"],
    );
    expect(missed).toHaveLength(1);
    expect(missed[0]!.explanation).toBe("Missed 7 sessions in 7 days. Clinic rule: 2 or more.");
  });

  it("abandons sessions idle for 24 hours in the job's organization only", async () => {
    const mine = (await patient({ method: "POST", url: `${base()}/sessions`, payload: {} })).json();
    const b = as(app, await login(app, orgB.patient.email));
    const theirs = (
      await b({ method: "POST", url: `/patients/${orgB.patient.patientId}/sessions`, payload: {} })
    ).json();
    const handlers = createJobHandlers({ db, now: () => new Date(NOW.getTime() + 23 * H) });
    await handlers[ABANDON_SESSIONS_QUEUE]!(job(ABANDON_SESSIONS_QUEUE, org.orgId));
    expect((await sessionRow(db, mine.id)).status).toBe("in_progress");
    const later = createJobHandlers({ db, now: () => new Date(NOW.getTime() + 25 * H) });
    await later[ABANDON_SESSIONS_QUEUE]!(job(ABANDON_SESSIONS_QUEUE, org.orgId));
    expect((await sessionRow(db, mine.id)).status).toBe("abandoned");
    expect((await sessionRow(db, theirs.id)).status).toBe("in_progress");
  });
});
