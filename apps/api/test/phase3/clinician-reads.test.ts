import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  auditEvents,
  createClinicalFixture,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";

/** Delivery step 3: overview, directory, timeline, record history, library, review queue. */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let fx: ClinicalFixture;
let therapist: Session;
let coordinator: Session;
let checkInId: string;
let sessionId: string;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db, { familyName: "Quintero" });
  fx = await createClinicalFixture(db, org, NOW);
  therapist = await login(app, org.therapist.email);
  coordinator = await login(app, org.coordinator.email);
  const patient = as(app, await login(app, org.patient.email));
  const base = `/patients/${org.patient.patientId}`;
  const s = (await patient({ method: "POST", url: `${base}/sessions`, payload: {} })).json();
  sessionId = s.id;
  await patient({
    method: "POST",
    url: `${base}/sessions/${s.id}/stop`,
    payload: { activityId: s.activities[0].id, discomfortLevel: 8 },
  });
  const c = await patient({
    method: "POST",
    url: `${base}/check-ins`,
    payload: { sessionId: s.id, painScore: 8 },
  });
  checkInId = c.json().checkIn.id;
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("overview (REQ-OVR-01)", () => {
  it("lists the caseload's work with counts equal to list lengths", async () => {
    const res = await as(app, therapist)({ method: "GET", url: "/overview" });
    expect(res.statusCode).toBe(200);
    const o = res.json();
    expect(o).toMatchObject({ today: "2026-11-19", timezone: "America/Phoenix", caseloadSize: 1 });
    for (const key of ["openTasks", "unreviewedCheckIns", "missedActivity", "recentPublishes"]) {
      expect(o[key].count, key).toBe(o[key].items.length);
    }
    expect(o.openTasks.items[0]).toMatchObject({
      value: 8,
      threshold: 7,
      rule: { key: "reported_pain" },
    });
    expect(o.unreviewedCheckIns.items[0]).toMatchObject({ id: checkInId, painScore: 8 });
    expect(o.recentPublishes.items.map((v: { versionId: string }) => v.versionId)).toEqual([fx.v2]);
    expect(o.missedActivity.items[0]).toMatchObject({
      windowStart: "2026-11-12",
      windowEnd: "2026-11-18",
      assignedSessions: 7,
      completedSessions: 0,
      missedSessions: 7,
    });
  });

  it("is refused to coordinators (no clinical.read)", async () => {
    expect((await as(app, coordinator)({ method: "GET", url: "/overview" })).statusCode).toBe(403);
  });
});

describe("directory (REQ-DIR-01)", () => {
  const ids = (res: { json: () => { items: { id: string }[] } }) =>
    res.json().items.map((i) => i.id);

  it("returns clinical rows with filters applied in SQL", async () => {
    const call = as(app, therapist);
    // CR-12: the term goes in the body of POST /patients/search, never in the URL.
    const byName = await call({ method: "POST", url: "/patients/search", payload: { q: "quint" } });
    expect(ids(byName)).toEqual([org.patient.patientId]);
    expect(byName.json().items[0]).toMatchObject({
      view: "clinical",
      planStage: "published",
      currentVersionNumber: 2,
      openReviewCount: 1,
      primaryClinician: { practitionerId: org.therapist.practitionerId },
    });
    const mine = await call({
      method: "GET",
      url: `/patients?clinicianId=${org.therapist.practitionerId}`,
    });
    expect(ids(mine)).toEqual([org.patient.patientId]);
    const review = await call({ method: "GET", url: "/patients?hasOpenReview=true" });
    expect(ids(review)).toEqual([org.patient.patientId]);
    const noReview = await call({
      method: "GET",
      url: "/patients?hasOpenReview=false&planStage=published",
    });
    expect(ids(noReview)).toEqual([org.otherPatient.patientId]);
    const none = await call({ method: "GET", url: "/patients?planStage=none" });
    expect(ids(none)).toEqual([]);
    const intake = await call({ method: "GET", url: "/patients?status=intake_incomplete" });
    expect(ids(intake)).toEqual([org.otherPatient.patientId]);
    const idle = await call({
      method: "GET",
      url: `/patients?lastActivityBefore=${NOW.toISOString()}`,
    });
    expect(ids(idle)).toEqual([org.otherPatient.patientId]);
    const recent = await call({ method: "GET", url: "/patients?sort=-lastActivity" });
    expect(ids(recent)).toEqual([org.patient.patientId, org.otherPatient.patientId]);
  });

  it("pages with an opaque cursor", async () => {
    const call = as(app, therapist);
    const p1 = await call({ method: "GET", url: "/patients?limit=1&sort=name" });
    expect(p1.json().items).toHaveLength(1);
    const p2 = await call({
      method: "GET",
      url: `/patients?limit=1&sort=name&cursor=${p1.json().nextCursor}`,
    });
    expect(p2.json().items).toHaveLength(1);
    expect(p2.json().nextCursor).toBeNull();
    expect(p2.json().items[0].id).not.toBe(p1.json().items[0].id);
  });

  it("gives coordinators administrative rows with the missing-intake flag (AC-A4)", async () => {
    const res = await as(app, coordinator)({ method: "GET", url: "/patients?sort=name" });
    const row = res.json().items.find((i: { id: string }) => i.id === org.otherPatient.patientId);
    expect(row).toMatchObject({
      view: "administrative",
      intakeStatus: "not_started",
      missingIntake: true,
    });
    expect(row).not.toHaveProperty("openReviewCount");
  });
});

describe("record sections", () => {
  it("timeline is the union of source rows, newest first, and shows the stop for discomfort", async () => {
    const res = await as(
      app,
      therapist,
    )({ method: "GET", url: `/patients/${org.patient.patientId}/timeline` });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as { kind: string; at: string; id: string }[];
    expect(items.map((i) => i.kind).sort()).toEqual(
      ["check_in", "plan_version", "plan_version", "review_task", "session"].sort(),
    );
    const times = items.map((i) => i.at);
    expect([...times].sort().reverse()).toEqual(times);
    expect(items.find((i) => i.kind === "session")).toMatchObject({
      id: sessionId,
      status: "stopped_discomfort",
      stoppedForDiscomfort: true,
    });
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events.map((e) => e.eventName)).toEqual(["phi.read"]);
  });

  it("record history lists published versions with their author", async () => {
    const res = await as(
      app,
      therapist,
    )({
      method: "GET",
      url: `/patients/${org.patient.patientId}/record-history`,
    });
    const items = res.json().items as {
      kind: string;
      detail: string;
      actor: { name: string } | null;
    }[];
    const published = items.filter((i) => i.kind === "plan_version_published");
    expect(published.map((i) => i.detail)).toEqual(["Version 2 published", "Version 1 published"]);
    expect(items.find((i) => i.kind === "care_team_member_added")?.detail).toContain(
      "primary therapist",
    );
  });
});

describe("exercise library", () => {
  it("searches and filters", async () => {
    const call = as(app, therapist);
    const all = await call({ method: "GET", url: "/exercises?limit=100" });
    expect(all.json().items).toHaveLength(6);
    const hip = await call({ method: "GET", url: "/exercises?bodyArea=hip&category=mobility" });
    expect(hip.json().items.map((e: { id: string }) => e.id)).toEqual([
      fx.exerciseIds[3],
      fx.exerciseIds[5],
    ]);
    const q = await call({ method: "GET", url: "/exercises?q=exercise%202" });
    expect(q.json().items[0].defaults).toEqual({
      sets: 2,
      reps: 10,
      holdSeconds: null,
      durationSeconds: null,
    });
    const bad = await call({ method: "GET", url: "/exercises?bodyArea=elbow" });
    expect(bad.statusCode).toBe(400);
  });
});

describe("review queue reads (Scenario D)", () => {
  it("explains each task and links to the check-in it came from (AC-D1)", async () => {
    const call = as(app, therapist);
    const res = await call({ method: "GET", url: "/review-tasks" });
    expect(res.statusCode).toBe(200);
    const [task] = res.json().items;
    expect(task).toMatchObject({
      kind: "clinical",
      status: "open",
      value: 8,
      threshold: 7,
      unit: "of 10",
      explanation: "Reported pain 8 of 10. Clinic rule: 7 or higher.",
      sources: [
        {
          type: "PatientCheckIn",
          id: checkInId,
          field: "painScore",
          apiPath: `/patients/${org.patient.patientId}/check-ins/${checkInId}`,
        },
      ],
    });
    const opened = await call({ method: "GET", url: task.sources[0].apiPath });
    expect(opened.json()).toMatchObject({ id: checkInId, painScore: 8 });
    const perPatient = await call({
      method: "GET",
      url: `/patients/${org.patient.patientId}/review-tasks`,
    });
    expect(perPatient.json().items.map((t: { id: string }) => t.id)).toEqual([task.id]);
  });

  it("an empty queue still carries lastCheckedAt (AC-D6)", async () => {
    const res = await as(app, therapist)({ method: "GET", url: "/review-tasks?status=resolved" });
    expect(res.json()).toMatchObject({
      items: [],
      nextCursor: null,
      lastCheckedAt: NOW.toISOString(),
    });
  });

  it("patient progress and clinician activity history read the same rows (AC-C2)", async () => {
    const url = `/patients/${org.patient.patientId}/progress`;
    const p = as(app, await login(app, org.patient.email));
    const a = await p({ method: "GET", url });
    const b = await as(app, therapist)({ method: "GET", url });
    expect(b.json()).toEqual(a.json());
    expect(a.json().pain.points.map((x: { painScore: number }) => x.painScore)).toEqual([8]);
    expect(a.json().weeks.at(-1)).toMatchObject({ stoppedSessions: 1, completedSessions: 0 });
  });
});

describe("care-team flag and totals (CR-2, CR-3; checkpoint C2, F4)", () => {
  it("directory total counts the whole query, ignoring the cursor", async () => {
    const call = as(app, therapist);
    const p1 = await call({ method: "GET", url: "/patients?limit=1&sort=name" });
    expect(p1.json()).toMatchObject({ total: 2 });
    const p2 = await call({
      method: "GET",
      url: `/patients?limit=1&sort=name&cursor=${p1.json().nextCursor}`,
    });
    expect(p2.json()).toMatchObject({ total: 2 });
    const filtered = await call({ method: "GET", url: "/patients?hasOpenReview=true" });
    expect(filtered.json()).toMatchObject({ total: 1 });
    const admin = await as(app, coordinator)({ method: "GET", url: "/patients?status=active" });
    expect(admin.json().total).toBe(admin.json().items.length);
  });

  it("review tasks say whether the caller is on the patient's care team", async () => {
    const other = as(app, await login(app, org.otherTherapist.email));
    const mine = (await as(app, therapist)({ method: "GET", url: "/review-tasks" })).json();
    const theirs = (await other({ method: "GET", url: "/review-tasks" })).json();
    expect(mine).toMatchObject({ total: 1, items: [{ onCareTeam: true }] });
    expect(theirs).toMatchObject({
      total: 1,
      items: [{ id: mine.items[0].id, onCareTeam: false }],
    });
    const perPatient = await other({
      method: "GET",
      url: `/patients/${org.patient.patientId}/review-tasks?limit=1`,
    });
    expect(perPatient.json()).toMatchObject({ total: 1, items: [{ onCareTeam: false }] });
    const resolved = await other({ method: "GET", url: "/review-tasks?status=resolved" });
    expect(resolved.json()).toMatchObject({ total: 0, items: [] });
  });

  it("the patient header carries onCareTeam for clinical callers only", async () => {
    const url = `/patients/${org.patient.patientId}`;
    const header = async (s: Session) => (await as(app, s)({ method: "GET", url })).json();
    expect(await header(therapist)).toMatchObject({ onCareTeam: true });
    expect(await header(await login(app, org.otherTherapist.email))).toMatchObject({
      onCareTeam: false,
    });
    expect(await header(coordinator)).toMatchObject({ onCareTeam: null });
    expect(await header(await login(app, org.patient.email))).toMatchObject({ onCareTeam: null });
  });
});
