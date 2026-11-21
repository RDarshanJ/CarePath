import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { metricKeys, metricListKeys, type Metric, type Metrics } from "@carepath/shared/contracts";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  createClinicalFixture,
  setPatientCreatedAt,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";
import { createSlots } from "../support/scheduling/repo.js";
import {
  addCareTeam,
  addDraftPlan,
  assignmentsOf,
  makeAppointment,
  makeDoneActivity,
  makePatient,
  makeTask,
  markSlotBooked,
  setPatientStatusActive,
  sqlCounts,
} from "../support/admin/repo.js";

/**
 * WP 6.1, CR-13: the six metrics, their definitions, previous windows, and the rule that every
 * drill-down list has as many rows as the number it is named after (AC-H3, AC-H4).
 * Clock: Thursday 2026-11-19 09:00 in America/Phoenix (UTC-7, no daylight saving).
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const H = 3_600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let fx: ClinicalFixture;
let admin: Session;
let coordinator: Session;
let therapist: Session;
let patientSession: Session;
let appts: { cancelId: string };

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  // Fixture patients are created at the real wall clock; pin them outside every window.
  await setPatientCreatedAt(db, org.patient.patientId, ago(200 * D));
  await setPatientCreatedAt(db, org.otherPatient.patientId, ago(200 * D));

  // Enrollment: current window has 4 accounts (2 submitted), previous has 2 (1 submitted).
  await makePatient(db, org, { createdAt: ago(3 * D), intake: "submitted" });
  await makePatient(db, org, { createdAt: ago(10 * D), intake: "reviewed" });
  await makePatient(db, org, { createdAt: ago(12 * D), intake: "in_progress" });
  await makePatient(db, org, { createdAt: ago(20 * D), intake: null });
  await makePatient(db, org, { createdAt: ago(40 * D), intake: "submitted" });
  await makePatient(db, org, { createdAt: ago(50 * D), intake: "in_progress" });
  await makePatient(db, org, { createdAt: ago(100 * D), intake: "submitted" });

  // Utilisation: 60-minute slots at 17:00 UTC on distinct past days.
  const at = (daysAgo: number) => new Date(Date.UTC(2026, 10, 19 - daysAgo, 17));
  const [s1, s2, s3, s4, s5, s6] = await createSlots(db, org.orgId, org.therapist.practitionerId, [
    at(2),
    at(3),
    at(4),
    at(5),
    at(6),
    at(7),
  ]);
  await createSlots(db, org.orgId, org.therapist.practitionerId, [at(8)], { status: "blocked" });
  await createSlots(db, org.orgId, org.therapist.practitionerId, [at(40), at(41)]); // previous window
  await createSlots(db, org.orgId, org.therapist.practitionerId, [at(-3)]); // future: outside
  const p = await Promise.all(
    [0, 1, 2, 3, 4].map(() => makePatient(db, org, { createdAt: ago(300 * D) })),
  );
  // Created before the 60-day span, so cancellations below stay the only appointments in window.
  const old = ago(100 * D);
  await makeAppointment(db, org, {
    patientId: p[0]!,
    startsAt: at(2),
    status: "completed",
    createdAt: old,
    slotId: s1!,
  });
  await markSlotBooked(db, s1!);
  await makeAppointment(db, org, {
    patientId: p[1]!,
    startsAt: at(3),
    status: "checked_in",
    createdAt: old,
    slotId: s2!,
  });
  await markSlotBooked(db, s2!);
  await makeAppointment(db, org, {
    patientId: p[2]!,
    startsAt: at(4),
    status: "no_show",
    createdAt: old,
    slotId: s3!,
  });
  await markSlotBooked(db, s3!);
  // A cancelled visit leaves its slot open: it is unbooked.
  await makeAppointment(db, org, {
    patientId: p[3]!,
    startsAt: at(5),
    status: "cancelled_by_patient",
    createdAt: old,
    slotId: s4!,
  });
  void s5;
  void s6;

  // Cancellations: booked in the last 30 days.
  const future = (n: number) => new Date(NOW.getTime() + n * D);
  const q = await Promise.all(
    [0, 1, 2, 3, 4, 5].map(() => makePatient(db, org, { createdAt: ago(300 * D) })),
  );
  await makeAppointment(db, org, {
    patientId: q[0]!,
    startsAt: future(1),
    status: "booked",
    createdAt: ago(2 * D),
  });
  await makeAppointment(db, org, {
    patientId: q[1]!,
    startsAt: future(2),
    status: "booked",
    createdAt: ago(5 * D),
  });
  const cancelId = await makeAppointment(db, org, {
    patientId: q[2]!,
    startsAt: future(3),
    status: "booked",
    createdAt: ago(6 * D),
  });
  await makeAppointment(db, org, {
    patientId: q[3]!,
    startsAt: future(4),
    status: "cancelled_by_patient",
    createdAt: ago(7 * D),
  });
  const moved = await makeAppointment(db, org, {
    patientId: q[4]!,
    startsAt: future(5),
    status: "cancelled_by_clinic",
    createdAt: ago(8 * D),
  });
  await makeAppointment(db, org, {
    patientId: q[4]!,
    startsAt: future(6),
    status: "booked",
    createdAt: ago(8 * D),
    rescheduledFromId: moved,
  });
  await makeAppointment(db, org, {
    patientId: q[5]!,
    startsAt: future(7),
    status: "cancelled_by_clinic",
    createdAt: ago(45 * D),
  }); // previous window
  appts = { cancelId };

  // Care plan activation: four active patients, two with a published plan.
  await setPatientStatusActive(db, org.otherPatient.patientId);
  const draft = await makePatient(db, org, { createdAt: ago(300 * D), active: true });
  await addDraftPlan(db, org, draft);
  const none = await makePatient(db, org, { createdAt: ago(300 * D), active: true });
  await addCareTeam(db, org, none, ago(9 * D));

  // Activity: patient 1 had v1 until Nov 13, v2 from Nov 14; otherPatient's plan starts Nov 16.
  const v1 = await assignmentsOf(db, fx.v1);
  const v2 = await assignmentsOf(db, fx.v2);
  const ex = (list: typeof v1, i: number) => list.find((a) => a.exerciseId === fx.exerciseIds[i])!;
  const done = (versionId: string, a: { id: string }, when: Date) =>
    makeDoneActivity(db, org, {
      patientId: org.patient.patientId,
      versionId,
      assignmentId: a.id,
      completedAt: when,
    });
  await done(fx.v2, ex(v2, 0), ago(1 * H)); // Nov 19, scheduled
  await done(fx.v2, ex(v2, 0), ago(1 * D)); // Nov 18
  await done(fx.v2, ex(v2, 3), ago(1 * D)); // Nov 18
  await done(fx.v2, ex(v2, 1) ?? ex(v2, 0), ago(1 * D)); // exercise 1 is not in v2: not scheduled
  await done(fx.v1, ex(v1, 1), ago(6 * D)); // Nov 13 under v1, scheduled

  // Pending review: five waiting, one resolved.
  const rule = fx.ruleIds["reported_pain"]!;
  const t = (hours: number, status: "open" | "in_review" | "resolved") =>
    makeTask(db, org, {
      patientId: org.patient.patientId,
      ruleId: rule,
      createdAt: ago(hours * H),
      status,
    });
  await t(2, "open");
  await t(30, "in_review");
  await t(47, "open");
  await t(49, "open");
  await t(100, "in_review");
  await t(10, "resolved");

  admin = await login(app, org.admin.email);
  coordinator = await login(app, org.coordinator.email);
  therapist = await login(app, org.therapist.email);
  patientSession = await login(app, org.patient.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

async function metrics(): Promise<Metrics> {
  const res = await as(app, admin)({ method: "GET", url: "/metrics" });
  expect(res.statusCode, res.body).toBe(200);
  return res.json();
}
const byKey = (m: Metrics, key: string): Metric => m.items.find((x) => x.key === key)!;

async function allRows(metric: string, list: string, limit = 7) {
  const rows: unknown[] = [];
  let cursor: string | undefined;
  let pages = 0;
  let header: { count: number; minutes: number | null } | undefined;
  do {
    const url = `/metrics/rows?metric=${metric}&list=${list}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await as(app, admin)({ method: "GET", url });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    header = { count: body.count, minutes: body.minutes };
    rows.push(...body.items);
    cursor = body.nextCursor ?? undefined;
    pages += 1;
  } while (cursor && pages < 200);
  return { rows, header: header! };
}

describe("the six metrics (CR-13)", () => {
  it("returns every metric once, with a printed definition, window and computedAt", async () => {
    const m = await metrics();
    expect(m.items.map((i) => i.key)).toEqual([...metricKeys]);
    expect(m.timezone).toBe("America/Phoenix");
    for (const item of m.items) {
      expect(item.computedAt).toBe(NOW.toISOString());
      expect(item.definition.length).toBeGreaterThan(20);
      expect(item.calculation.length).toBeGreaterThan(20);
      expect(item.window.to).toBe(NOW.toISOString());
      expect(item.lists.map((l) => l.key)).toEqual([...metricListKeys[item.key]]);
    }
    expect(byKey(m, "care_plan_activation").definition).toContain("status is Active");
  });

  it("enrollment completion: 2 of 4, previous window 1 of 2", async () => {
    const e = byKey(await metrics(), "enrollment_completion");
    expect([e.numerator, e.denominator, e.ratio]).toEqual([2, 4, 0.5]);
    expect(e.previous).toMatchObject({ numerator: 1, denominator: 2, ratio: 0.5 });
    expect(e.window).toMatchObject({ kind: "trailing", days: 30 });
    expect(e.previousNote).toContain("newest accounts");
  });

  it("appointment utilisation: minutes, with blocked and future times left out", async () => {
    const u = byKey(await metrics(), "appointment_utilisation");
    // Published: 6 slots (blocked one excluded) of 60 minutes; used: completed and checked in.
    expect([u.unit, u.numerator, u.denominator]).toEqual(["minutes", 120, 360]);
    expect(u.previous).toMatchObject({ numerator: 0, denominator: 120, ratio: 0 });
  });

  it("cancellations: counts, split by who, and the moved visit shown separately", async () => {
    const c = byKey(await metrics(), "cancellations");
    // Booked in window: 6 (the one 45 days ago is previous). Cancelled: patient 1, clinic 1 (moved).
    expect([c.numerator, c.denominator]).toEqual([2, 6]);
    expect(c.breakdown).toEqual([
      { key: "by_patient", label: "Cancelled by the patient", count: 1 },
      { key: "by_clinic", label: "Cancelled by the clinic", count: 1 },
      { key: "moved_to_new_time", label: "Cancelled to move to another time", count: 1 },
    ]);
    expect(c.previous).toMatchObject({ numerator: 1, denominator: 1 });
  });

  it("care plan activation: the denominator is status active, and the page says so", async () => {
    const c = byKey(await metrics(), "care_plan_activation");
    expect([c.numerator, c.denominator]).toEqual([2, 4]);
    expect(c.window.kind).toBe("now");
    expect(c.previous).toBeNull();
    expect(c.previousNote).toContain("snapshot");
  });

  it("activity completion: items done of items scheduled, with no clinical content", async () => {
    const a = byKey(await metrics(), "activity_completion");
    // Patient 1: Nov 13 under v1 (3 items) plus Nov 14 to 19 under v2 (6 days x 5). Other: Nov 16 to 19.
    expect([a.numerator, a.denominator]).toEqual([4, 37]);
    expect(a.definition).toContain("not a measure of recovery");
    expect(a.previous).not.toBeNull();
    const { rows } = await allRows("activity_completion", "by_patient");
    expect(JSON.stringify(rows)).not.toMatch(/pain|explanation|Synthetic exercise/i);
  });

  it("pending review items: a count by age band, no ratio, no comparison", async () => {
    const r = byKey(await metrics(), "pending_review_items");
    expect([r.numerator, r.denominator, r.ratio]).toEqual([5, null, null]);
    expect(r.ratioUnavailableReason).toBeTruthy();
    expect(Object.fromEntries(r.lists.map((l) => [l.key, l.count]))).toEqual({
      all: 5,
      under_24h: 1,
      "24_to_48h": 2,
      over_48h: 2,
    });
    expect(r.previous).toBeNull();
  });

  it("matches independent SQL counts (AC-H3)", async () => {
    const m = await metrics();
    const from = new Date(NOW.getTime() - 30 * D);
    const sql = await sqlCounts(db, org.orgId, from, NOW);
    const e = byKey(m, "enrollment_completion");
    expect([e.numerator, e.denominator]).toEqual([sql.submitted, sql.accounts]);
    const u = byKey(m, "appointment_utilisation");
    expect([u.numerator, u.denominator]).toEqual([sql.usedMinutes, sql.publishedMinutes]);
    const c = byKey(m, "cancellations");
    expect([c.numerator, c.denominator]).toEqual([sql.cancelled, sql.booked]);
    const p = byKey(m, "care_plan_activation");
    expect([p.numerator, p.denominator]).toEqual([sql.activeWithPlan, sql.activePatients]);
    expect(byKey(m, "pending_review_items").numerator).toBe(sql.pending);
  });
});

describe("drill-down lists reconcile to the numbers (CR-13)", () => {
  it.each([...metricKeys])(
    "%s: every list has as many rows as its count, over several pages",
    async (key) => {
      const m = byKey(await metrics(), key);
      for (const list of m.lists) {
        const { rows, header } = await allRows(key, list.key);
        expect(rows.length, `${key}/${list.key} rows`).toBe(list.count);
        expect(header.count, `${key}/${list.key} header`).toBe(list.count);
        expect(header.minutes).toBe(list.minutes);
        const ids = rows.map((r) => JSON.stringify(r));
        expect(new Set(ids).size, "no row repeats across pages").toBe(ids.length);
      }
    },
  );

  it.each([...metricKeys])(
    "%s: numerator, denominator and remainder lists equal the numbers",
    async (key) => {
      const m = byKey(await metrics(), key);
      const amount = (l: Metric["lists"][number]) => (m.unit === "minutes" ? l.minutes : l.count);
      for (const l of m.lists) {
        if (l.role === "numerator") expect(amount(l), `${key}/${l.key}`).toBe(m.numerator);
        if (l.role === "denominator") expect(amount(l), `${key}/${l.key}`).toBe(m.denominator);
        if (l.role === "remainder") {
          expect(amount(l), `${key}/${l.key}`).toBe((m.denominator ?? 0) - m.numerator);
        }
      }
      if (key === "cancellations") {
        const byWho = m.lists
          .filter((l) => l.role === "breakdown")
          .reduce((s, l) => s + l.count, 0);
        expect(byWho).toBe(m.numerator);
      }
      if (key === "pending_review_items") {
        const bands = m.lists
          .filter((l) => l.role === "breakdown")
          .reduce((s, l) => s + l.count, 0);
        expect(bands).toBe(m.numerator);
      }
      if (key === "activity_completion") {
        const { rows } = await allRows(key, "by_patient");
        const sum = (f: "done" | "scheduled") =>
          (rows as { done: number; scheduled: number }[]).reduce((s, r) => s + r[f], 0);
        expect([sum("done"), sum("scheduled")]).toEqual([m.numerator, m.denominator]);
      }
    },
  );

  it("the drill-downs named in CR-13 list the right people and visits", async () => {
    const stalled = (await allRows("enrollment_completion", "not_submitted")).rows as {
      intakeStatus: string | null;
      daysSinceSignUp: number;
    }[];
    expect(stalled.map((r) => r.intakeStatus).sort()).toEqual(["in_progress", null]);
    expect(stalled.map((r) => r.daysSinceSignUp).sort((a, b) => a - b)).toEqual([12, 20]);

    const noPlan = (await allRows("care_plan_activation", "without_plan")).rows as {
      planStage: string;
      clinicians: string[];
      daysSinceAssigned: number | null;
    }[];
    expect(noPlan.map((r) => r.planStage).sort()).toEqual(["draft", "none"]);
    expect(noPlan.find((r) => r.planStage === "none")).toMatchObject({
      clinicians: ["Riley Example"],
      daysSinceAssigned: 9,
    });

    const cancelled = (await allRows("cancellations", "cancelled")).rows as {
      cancelledBy: string;
      movedToNewTime: boolean;
    }[];
    expect(cancelled.filter((r) => r.movedToNewTime)).toHaveLength(1);
    const band = (await allRows("pending_review_items", "over_48h")).rows as { ageHours: number }[];
    expect(band.map((r) => r.ageHours).sort((a, b) => a - b)).toEqual([49, 100]);
  });

  it("rejects a list the metric does not have", async () => {
    const res = await as(
      app,
      admin,
    )({ method: "GET", url: "/metrics/rows?metric=cancellations&list=submitted" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].issue).toBe("unknown_list");
  });

  it("a new cancellation changes the metric on the next load (AC-H4)", async () => {
    const before = byKey(await metrics(), "cancellations");
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${await patientOf(appts.cancelId)}/appointments/${appts.cancelId}/cancel`,
      payload: { reason: "Synthetic" },
    });
    expect(res.statusCode, res.body).toBe(200);
    const after = byKey(await metrics(), "cancellations");
    expect(after.numerator).toBe(before.numerator + 1);
    expect(after.denominator).toBe(before.denominator);
    const { rows } = await allRows("cancellations", "cancelled");
    expect(rows.length).toBe(after.numerator);
  });

  it("an empty window says why there is no share, never 0 percent", async () => {
    const solo = await createOrgFixture(db);
    await createClinicalFixture(db, solo, NOW);
    const s = await login(app, solo.admin.email);
    const res = await as(app, s)({ method: "GET", url: "/metrics" });
    const e = (res.json() as Metrics).items.find((i) => i.key === "enrollment_completion")!;
    expect(e.ratio).toBeNull();
    expect(e.ratioUnavailableReason).toContain("no accounts created");
  });
});

describe("access", () => {
  it("coordinator and admin read metrics; therapist and patient are refused", async () => {
    for (const [s, status] of [
      [admin, 200],
      [coordinator, 200],
      [therapist, 403],
      [patientSession, 403],
    ] as const) {
      expect((await as(app, s)({ method: "GET", url: "/metrics" })).statusCode).toBe(status);
      expect(
        (
          await as(
            app,
            s,
          )({ method: "GET", url: "/metrics/rows?metric=cancellations&list=cancelled" })
        ).statusCode,
      ).toBe(status);
    }
  });

  it("another organization never sees these rows", async () => {
    const other = await createOrgFixture(db);
    await createClinicalFixture(db, other, NOW);
    const s = await login(app, other.admin.email);
    const res = await as(
      app,
      s,
    )({ method: "GET", url: "/metrics/rows?metric=pending_review_items&list=all" });
    expect(res.json().count).toBe(0);
    const res2 = await as(
      app,
      s,
    )({ method: "GET", url: "/metrics/rows?metric=care_plan_activation&list=active" });
    // Its own fixture patient only; none of organization A's rows.
    expect(res2.json().count).toBe(1);
    expect(res2.body).not.toContain(org.patient.patientId);
  });
});

async function patientOf(appointmentId: string): Promise<string> {
  const a = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: { patientId: true },
  });
  return a.patientId;
}
