import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OpenAPIV3_1 } from "openapi-types";
import {
  HIGH_PRIORITY_MIN,
  priorityLevelOf,
  reviewRuleKeys,
  type ReviewTask,
} from "@carepath/shared/contracts";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  createClinicalFixture,
  observationsForCheckIn,
  reviewTasksFor,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";
import { createSlots, freshHour } from "../support/scheduling/repo.js";

/**
 * WP B-CR: CR-6 (stop without a rating), CR-9 (priorityLevel), CR-10 (per-rule totals), CR-11
 * (task history), CR-12 (POST /patients/search) and CR-17 (booking idempotency key).
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const H = 3_600_000;
const db = createTestDb();
let clock = NOW;
let app: FastifyInstance;
let org: OrgFixture;
let fx: ClinicalFixture;
let patient: Session;
let therapist: Session;
let coordinator: Session;
let admin: Session;

const base = () => `/patients/${org.patient.patientId}`;

beforeAll(async () => {
  app = await testApp(db, { now: () => clock });
  org = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  patient = await login(app, org.patient.email);
  therapist = await login(app, org.therapist.email);
  coordinator = await login(app, org.coordinator.email);
  admin = await login(app, org.admin.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("CR-6: Stop without a pain rating", () => {
  it("ends the session at once with no number, stores none, and the rating follows as a check-in", async () => {
    const call = as(app, patient);
    const started = (await call({ method: "POST", url: `${base()}/sessions`, payload: {} })).json();
    const activityId = started.activities[0].id as string;
    const stop = await call({
      method: "POST",
      url: `${base()}/sessions/${started.id}/stop`,
      payload: { activityId },
    });
    expect(stop.statusCode).toBe(200);
    expect(stop.json()).toMatchObject({ status: "stopped_discomfort", checkInRequested: true });
    expect(stop.json().activities[0]).toMatchObject({ discomfortLevel: null });
    const row = await db.sessionActivity.findUniqueOrThrow({ where: { id: activityId } });
    expect(row).toMatchObject({ discomfortReported: false, discomfortLevel: null });
    // Nothing is recorded as pain until the patient gives a number.
    expect(await db.observation.count({ where: { patientId: org.patient.patientId } })).toBe(0);

    const checkIn = await call({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: started.id, painScore: 4 },
    });
    expect(checkIn.statusCode).toBe(201);
    const observations = await observationsForCheckIn(db, checkIn.json().checkIn.id);
    expect(observations).toHaveLength(1);
    expect(Number(observations[0]!.valueQuantity)).toBe(4);
  });

  it("accepts an explicit null and still stores a number when one is given", async () => {
    const call = as(app, patient);
    const first = (await call({ method: "POST", url: `${base()}/sessions`, payload: {} })).json();
    const nullStop = await call({
      method: "POST",
      url: `${base()}/sessions/${first.id}/stop`,
      payload: { activityId: first.activities[0].id, discomfortLevel: null, note: "Sharp pain" },
    });
    expect(nullStop.statusCode).toBe(200);
    expect(nullStop.json().activities[0]).toMatchObject({
      discomfortLevel: null,
      discomfortNote: "Sharp pain",
    });
    const second = (await call({ method: "POST", url: `${base()}/sessions`, payload: {} })).json();
    const rated = await call({
      method: "POST",
      url: `${base()}/sessions/${second.id}/stop`,
      payload: { activityId: second.activities[0].id, discomfortLevel: 6 },
    });
    expect(rated.json().activities[0]).toMatchObject({ discomfortLevel: 6 });
    const bad = await call({
      method: "POST",
      url: `${base()}/sessions/${second.id}/stop`,
      payload: { activityId: second.activities[0].id, discomfortLevel: 11 },
    });
    expect(bad.statusCode).toBe(400);
  });
});

describe("CR-9: priorityLevel", () => {
  it("is high from the threshold up, derived from the stored priority", () => {
    expect(priorityLevelOf(HIGH_PRIORITY_MIN)).toBe("high");
    expect(priorityLevelOf(HIGH_PRIORITY_MIN - 1)).toBe("standard");
    expect(priorityLevelOf(100)).toBe("high");
    expect(priorityLevelOf(0)).toBe("standard");
  });
});

describe("CR-9, CR-10, CR-11: the review queue", () => {
  let painTaskId: string;
  let adminTaskId: string;
  let checkInId: string;

  beforeAll(async () => {
    const res = await as(
      app,
      patient,
    )({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: null, painScore: 9 },
    });
    checkInId = res.json().checkIn.id;
    painTaskId = (await reviewTasksFor(db, org.patient.patientId))[0]!.id;
    // A standard-priority administrative task and one more of the same rule.
    for (const [i, key] of (["missing_intake", "missing_intake"] as const).entries()) {
      const t = await db.reviewTask.create({
        data: {
          organizationId: org.orgId,
          patientId: org.patient.patientId,
          ruleId: fx.ruleIds[key]!,
          dedupeKey: `bcr-${i}`,
          explanation: "Intake not finished 4 days after sign-up. Clinic rule: 3.",
          evidence: [],
          priority: 50,
        },
        select: { id: true },
      });
      if (i === 0) adminTaskId = t.id;
    }
  });

  const list = async (
    query = "",
  ): Promise<{ items: ReviewTask[]; ruleTotals: unknown[]; total: number }> =>
    (await as(app, therapist)({ method: "GET", url: `/review-tasks${query}` })).json();

  it("CR-9: tags the reported-pain task high and the others standard", async () => {
    const page = await list();
    const level = (id: string) => page.items.find((t) => t.id === id)?.priorityLevel;
    expect(level(painTaskId)).toBe("high");
    expect(level(adminTaskId)).toBe("standard");
  });

  it("CR-10: totals per rule cover every rule, zeros included, and ignore the rule filter", async () => {
    const all = await list();
    expect(all.ruleTotals).toHaveLength(reviewRuleKeys.length);
    const totals = Object.fromEntries(
      (all.ruleTotals as { key: string; total: number }[]).map((r) => [r.key, r.total]),
    );
    expect(totals).toMatchObject({
      reported_pain: 1,
      missing_intake: 2,
      missed_sessions: 0,
      unreviewed_checkin: 0,
      upcoming_followup: 0,
    });
    expect((all.ruleTotals as { total: number }[]).reduce((n, r) => n + r.total, 0)).toBe(
      all.total,
    );
    // Highest rule priority first.
    expect((all.ruleTotals as { key: string }[])[0]!.key).toBe("reported_pain");

    const filtered = await list("?ruleKey=missing_intake");
    expect(filtered.total).toBe(2);
    expect(filtered.ruleTotals).toEqual(all.ruleTotals);

    const closed = await list("?status=closed");
    expect((closed.ruleTotals as { total: number }[]).every((r) => r.total === 0)).toBe(true);
    const patientPage = (
      await as(app, therapist)({ method: "GET", url: `${base()}/review-tasks` })
    ).json();
    expect(patientPage.ruleTotals).toHaveLength(reviewRuleKeys.length);
  });

  it("CR-11: records who assigned, unassigned, reviewed and resolved, with the note", async () => {
    const call = as(app, therapist);
    const url = (action: string) => `${base()}/review-tasks/${painTaskId}/${action}`;
    expect((await list()).items.find((t) => t.id === painTaskId)!.events, "no events yet").toEqual(
      [],
    );

    const assigned = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: org.therapist.practitionerId },
    });
    expect(assigned.json().events).toMatchObject([
      {
        kind: "assigned",
        occurredAt: clock.toISOString(),
        actor: { userId: org.therapist.userId },
        practitioner: { practitionerId: org.therapist.practitionerId },
        note: null,
      },
    ]);
    // Assigning the same person again changes nothing and records nothing.
    const same = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: org.therapist.practitionerId },
    });
    expect(same.json().events).toHaveLength(1);

    const open = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: null },
    });
    expect(open.json().events.map((e: { kind: string }) => e.kind)).toEqual([
      "assigned",
      "unassigned",
    ]);
    expect(open.json().events[1].practitioner.practitionerId).toBe(org.therapist.practitionerId);
    // Unassigning an open task records nothing.
    const again = await call({
      method: "POST",
      url: url("assign"),
      payload: { practitionerId: null },
    });
    expect(again.json().events).toHaveLength(2);

    expect(
      (await call({ method: "POST", url: `${base()}/check-ins/${checkInId}/review`, payload: {} }))
        .statusCode,
    ).toBe(200);
    const resolved = await call({
      method: "POST",
      url: url("resolve"),
      payload: { note: "Called the patient." },
    });
    const events = resolved.json().events as {
      kind: string;
      note: string | null;
      occurredAt: string;
    }[];
    expect(events.map((e) => e.kind)).toEqual(["assigned", "unassigned", "reviewed", "resolved"]);
    expect(events[3]).toMatchObject({
      note: "Called the patient.",
      occurredAt: clock.toISOString(),
    });
    // Same instant: the history keeps the order the events were written in.
    expect(events.every((e) => e.occurredAt === clock.toISOString())).toBe(true);

    // The list carries the same history.
    const closedList = await list("?status=closed");
    expect(closedList.items.find((t) => t.id === painTaskId)!.events).toHaveLength(4);
  });

  it("CR-11: dismissing records a dismissed event, and the history cannot be changed", async () => {
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `${base()}/review-tasks/${adminTaskId}/dismiss`,
      payload: { note: "Patient finished intake by phone." },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().events).toMatchObject([
      {
        kind: "dismissed",
        actor: { userId: org.coordinator.userId },
        note: "Patient finished intake by phone.",
      },
    ]);
    await expect(
      db.reviewTaskEvent.updateMany({ where: { taskId: adminTaskId }, data: { note: "edited" } }),
    ).rejects.toThrow();
    await expect(
      db.reviewTaskEvent.deleteMany({ where: { taskId: adminTaskId } }),
    ).rejects.toThrow();
  });
});

describe("CR-12: POST /patients/search", () => {
  const search = (s: Session, q: unknown, query = "") =>
    as(app, s)({ method: "POST", url: `/patients/search${query}`, payload: { q } });

  it("finds by name or MRN with the term in the body, scoped like the directory", async () => {
    const mrn = (await db.patient.findUniqueOrThrow({ where: { id: org.patient.patientId } })).mrn;
    const byName = await search(therapist, "SYNTH");
    expect(byName.statusCode).toBe(200);
    expect(byName.json().items.map((i: { id: string }) => i.id)).toContain(org.patient.patientId);
    expect(byName.json().items[0]).toMatchObject({ view: "clinical" });
    const byMrn = await search(therapist, mrn);
    expect(byMrn.json().items.map((i: { id: string }) => i.id)).toEqual([org.patient.patientId]);
    expect(byMrn.json().total).toBe(1);
    const none = await search(therapist, "no-such-patient-zzz");
    expect(none.json()).toMatchObject({ items: [], total: 0 });
    // Roles without clinical.read get administrative rows, as on GET /patients.
    const adminRows = await search(coordinator, mrn);
    expect(adminRows.json().items[0]).toMatchObject({ view: "administrative" });
  });

  it("keeps the other filters in the query and refuses a patient or a blank body", async () => {
    const filtered = await search(therapist, "Synth", "?status=discharged");
    expect(filtered.json().items).toEqual([]);
    expect((await search(therapist, "")).statusCode).toBe(400);
    expect((await search(therapist, undefined)).statusCode).toBe(400);
    expect(
      (
        await as(
          app,
          therapist,
        )({ method: "POST", url: "/patients/search", payload: { q: "a", extra: 1 } })
      ).statusCode,
    ).toBe(400);
    expect((await search(patient, "a")).statusCode).toBe(403);
  });

  it("GET /patients no longer takes the term: a q in the URL filters nothing", async () => {
    const res = await as(app, therapist)({ method: "GET", url: "/patients?q=no-such-patient-zzz" });
    expect(res.statusCode).toBe(200);
    expect(res.json().items.length).toBeGreaterThan(0);
    const doc = app.swagger() as OpenAPIV3_1.Document;
    const get = doc.paths?.["/patients"]?.get;
    const names = ((get?.parameters ?? []) as { name: string }[]).map((p) => p.name);
    expect(names).not.toContain("q");
    expect(doc.paths?.["/patients/search"]?.post?.operationId).toBe("searchPatients");
  });

  it("is a read: no write audit event and nothing stored", async () => {
    const before = await db.auditEvent.count({ where: { organizationId: org.orgId } });
    await search(therapist, "anything");
    expect(await db.auditEvent.count({ where: { organizationId: org.orgId } })).toBe(before);
  });
});

describe("CR-17: booking idempotency key", () => {
  const book = (s: Session, slotId: string, key?: string, type = "follow_up") =>
    as(
      app,
      s,
    )({
      method: "POST",
      url: `${base()}/appointments`,
      payload: { slotId, type },
      headers: key ? { "idempotency-key": key } : {},
    });
  const live = () =>
    db.appointment.count({
      where: { patientId: org.patient.patientId, status: { in: ["booked", "checked_in"] } },
    });
  const slots = (n: number) =>
    createSlots(
      db,
      org.orgId,
      org.therapist.practitionerId,
      Array.from({ length: n }, () => freshHour(clock, 3)),
    );

  it("same key and same body answers the first success again, once", async () => {
    clock = NOW;
    const [slot] = await slots(1);
    const before = await live();
    const first = await book(patient, slot!, "key-same-1");
    expect(first.statusCode).toBe(201);
    expect(first.headers["idempotency-replayed"]).toBeUndefined();
    const second = await book(patient, slot!, "key-same-1");
    expect(second.statusCode).toBe(201);
    expect(second.headers["idempotency-replayed"]).toBe("true");
    expect(second.json()).toEqual(first.json());
    expect(await live()).toBe(before + 1);
    expect(
      await db.auditEvent.count({
        where: { eventName: "appointment.book", resourceId: first.json().id },
      }),
    ).toBe(1);
  });

  it("same key with a different body is 409 idempotency_key_reused and runs nothing", async () => {
    const [a, b] = await slots(2);
    expect((await book(patient, a!, "key-diff-1")).statusCode).toBe(201);
    const before = await live();
    const other = await book(patient, b!, "key-diff-1");
    expect(other.statusCode).toBe(409);
    expect(other.json().error.code).toBe("idempotency_key_reused");
    expect(await live()).toBe(before);
    expect((await db.availabilitySlot.findUniqueOrThrow({ where: { id: b! } })).status).toBe(
      "open",
    );
    // A different visit type is a different body too.
    const type = await book(patient, a!, "key-diff-1", "video_follow_up");
    expect(type.json().error.code).toBe("idempotency_key_reused");
  });

  it("scopes a key to the user and works without a key", async () => {
    const [a, b] = await slots(2);
    expect((await book(patient, a!, "key-scope-1")).statusCode).toBe(201);
    // The same text from another user is another key: the coordinator books slot b for the patient.
    const byCoordinator = await book(coordinator, b!, "key-scope-1");
    expect(byCoordinator.statusCode).toBe(201);
    expect(byCoordinator.headers["idempotency-replayed"]).toBeUndefined();
    const [c] = await slots(1);
    expect((await book(patient, c!)).statusCode).toBe(201);
  });

  it("stores nothing for a failed request, so a retry is a fresh attempt", async () => {
    const [a] = await slots(1);
    expect((await book(patient, a!)).statusCode).toBe(201);
    const refused = await book(coordinator, a!, "key-fail-1");
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe("booking_conflict");
    expect(
      await db.idempotencyKey.count({ where: { organizationId: org.orgId, key: "key-fail-1" } }),
    ).toBe(0);
  });

  it("rejects a malformed key", async () => {
    const [a] = await slots(1);
    for (const key of ["has space", "x".repeat(129), "bad/slash"]) {
      expect((await book(patient, a!, key)).statusCode, key).toBe(400);
    }
  });

  it("honours a key for 24 hours, then treats it as new", async () => {
    clock = NOW;
    const [a] = await slots(1);
    const first = await book(patient, a!, "key-ttl-1");
    expect(first.statusCode).toBe(201);
    const stored = await db.idempotencyKey.findFirstOrThrow({
      where: { organizationId: org.orgId, key: "key-ttl-1" },
    });
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(24 * H);
    clock = new Date(NOW.getTime() + 23 * H);
    const at23 = await login(app, org.patient.email);
    expect((await book(at23, a!, "key-ttl-1")).headers["idempotency-replayed"]).toBe("true");
    clock = new Date(NOW.getTime() + 25 * H);
    const at25 = await login(app, org.patient.email);
    const [c] = await slots(1);
    // Past the window the key is free: a different body is a new request, not a conflict.
    const fresh = await book(at25, c!, "key-ttl-1");
    expect(fresh.statusCode).toBe(201);
    expect(fresh.headers["idempotency-replayed"]).toBeUndefined();
    clock = NOW;
  });

  it("covers reschedule with the same rules", async () => {
    clock = NOW;
    const [a, b, c] = await slots(3);
    const booked = (await book(patient, a!)).json();
    const move = (slotId: string, key: string) =>
      as(
        app,
        patient,
      )({
        method: "POST",
        url: `${base()}/appointments/${booked.id}/reschedule`,
        payload: { slotId },
        headers: { "idempotency-key": key },
      });
    const first = await move(b!, "key-resched-1");
    expect(first.statusCode).toBe(201);
    const replay = await move(b!, "key-resched-1");
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    expect(replay.json()).toEqual(first.json());
    expect((await move(c!, "key-resched-1")).json().error.code).toBe("idempotency_key_reused");
  });

  it("concurrency: parallel requests with one key book once and all see the same answer", async () => {
    clock = NOW;
    const [slot] = await slots(1);
    const before = await live();
    const results = await Promise.all(
      Array.from({ length: 12 }, () => book(patient, slot!, "key-parallel-1")),
    );
    expect(results.map((r) => r.statusCode)).toEqual(Array(12).fill(201));
    const ids = new Set(results.map((r) => r.json().id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.headers["idempotency-replayed"] === "true")).toHaveLength(11);
    expect(await live()).toBe(before + 1);
    expect(
      await db.idempotencyKey.count({
        where: { organizationId: org.orgId, key: "key-parallel-1" },
      }),
    ).toBe(1);
  });

  it("concurrency: parallel requests with one key and two bodies book at most one", async () => {
    clock = NOW;
    const [a, b] = await slots(2);
    const before = await live();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => book(patient, i % 2 === 0 ? a! : b!, "key-parallel-2")),
    );
    const created = results.filter((r) => r.statusCode === 201);
    const reused = results.filter((r) => r.statusCode === 409);
    expect(created.length + reused.length).toBe(10);
    expect(new Set(created.map((r) => r.json().id)).size).toBe(1);
    for (const r of reused) expect(r.json().error.code).toBe("idempotency_key_reused");
    expect(await live()).toBe(before + 1);
    void admin;
  });
});
