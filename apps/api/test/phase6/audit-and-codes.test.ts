import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuditPage, EnrollmentCode, EnrollmentCodeIssued } from "@carepath/shared/contracts";
import { hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { as, login, ORIGIN, testApp, type Session } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  PASSWORD,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture, createEnrollmentCode } from "../support/fixtures/repo.js";
import { allColumnsOf, enrollmentCodeRow, insertAudit } from "../support/admin/repo.js";

/**
 * WP 6.1, CR-15 (audit query: filters, cursor paging, itself audited, admin only) and the
 * eligibility-code routes (list, issue once, revoke).
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const H = 3_600_000;
const D = 24 * H;
const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * H);
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let other: OrgFixture;
let admin: Session;
let coordinator: Session;
let therapist: Session;
let patient: Session;
let bAdmin: Session;
let bCoordinator: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  other = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  admin = await login(app, org.admin.email);
  coordinator = await login(app, org.coordinator.email);
  therapist = await login(app, org.therapist.email);
  patient = await login(app, org.patient.email);
  bAdmin = await login(app, other.admin.email);
  bCoordinator = await login(app, other.coordinator.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const audit = (s: Session, qs = "") => as(app, s)({ method: "GET", url: `/audit-events${qs}` });

describe("audit query (CR-15)", () => {
  // A private organization so counts are exact.
  let a: OrgFixture;
  let s: Session;
  let ids: string[];
  const when = (n: number) => new Date("2026-06-01T00:00:00Z").getTime() + n * 60_000;

  beforeAll(async () => {
    a = await createOrgFixture(db);
    s = await login(app, a.admin.email);
    ids = [];
    // 12 events a minute apart (oldest first), three of them at the very same instant.
    const specs: Parameters<typeof insertAudit>[1][] = [];
    for (let i = 0; i < 12; i++) {
      specs.push({
        orgId: a.orgId,
        occurredAt: new Date(i >= 9 ? when(9) : when(i)),
        eventName:
          i % 3 === 0 ? "phi.read" : i % 3 === 1 ? "careplan.publish" : "security.access_denied",
        action: i % 3 === 1 ? "C" : "R",
        outcome: i % 3 === 2 ? "minor_failure" : "success",
        actorUserId: i % 2 === 0 ? a.therapist.userId : a.coordinator.userId,
        actorRole: i % 2 === 0 ? "physical_therapist" : "care_coordinator",
        resourceType: i < 6 ? "Patient" : "CarePlan",
        resourceId: i < 6 ? a.patient.patientId : `cp-${i}`,
        patientId: i < 6 ? a.patient.patientId : null,
      });
    }
    for (const spec of specs) ids.push(await insertAudit(db, spec));
    // Another organization's and an organization-less event must never appear.
    await insertAudit(db, {
      orgId: org.orgId,
      occurredAt: new Date(when(5)),
      eventName: "phi.read",
    });
    await insertAudit(db, {
      orgId: null,
      occurredAt: new Date(when(5)),
      eventName: "auth.login_failed",
      outcome: "minor_failure",
    });
  });

  async function pages(qs: string, limit: number) {
    const out: AuditPage["items"][] = [];
    let cursor: string | undefined;
    do {
      const res = await audit(s, `?${qs}&limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`);
      expect(res.statusCode, res.body).toBe(200);
      const body = res.json() as AuditPage;
      out.push(body.items);
      cursor = body.nextCursor ?? undefined;
    } while (cursor && out.length < 50);
    return out;
  }

  it("returns newest first with actor, patient and resource, and only this organization's rows", async () => {
    const [first] = await pages("", 100);
    const mine = first!;
    const sorted = [...mine].sort((x, y) =>
      y.occurredAt === x.occurredAt ? (y.id > x.id ? 1 : -1) : y.occurredAt > x.occurredAt ? 1 : -1,
    );
    expect(mine.map((e) => e.id)).toEqual(sorted.map((e) => e.id));
    const fixtures = mine.filter((e) => ids.includes(e.id));
    expect(fixtures).toHaveLength(12);
    expect(mine.every((e) => e.metadata["route"] !== undefined)).toBe(true);
    const row = fixtures.find((e) => e.resourceId === a.patient.patientId)!;
    expect(row.patient).toEqual({ id: a.patient.patientId, name: "Jordan Synthetic" });
    expect(row.actor.name).toMatch(/Synthetic (therapist|coordinator)/);
    expect(JSON.stringify(mine)).not.toContain(org.patient.patientId);
  });

  it.each([
    ["actorUserId", () => `actorUserId=${a.therapist.userId}`, 6],
    ["eventName", () => "eventName=careplan.publish", 4],
    ["action", () => "action=C", 4],
    ["resourceType", () => "resourceType=CarePlan", 6],
    ["resourceId", () => "resourceId=cp-7", 1],
    ["patientId", () => `patientId=${a.patient.patientId}`, 6],
    ["outcome", () => "outcome=minor_failure", 4],
    ["from", () => `from=${new Date(when(8)).toISOString()}`, 4],
    ["to (exclusive)", () => `to=${new Date(when(3)).toISOString()}`, 3],
    [
      "from and to",
      () => `from=${new Date(when(2)).toISOString()}&to=${new Date(when(5)).toISOString()}`,
      3,
    ],
    ["combined", () => `eventName=phi.read&actorUserId=${a.therapist.userId}&outcome=success`, 2],
  ])("filters by %s", async (_name, qs, expected) => {
    const found = (await pages(qs(), 100)).flat().filter((e) => ids.includes(e.id));
    expect(found).toHaveLength(expected);
  });

  it("pages with a cursor: every row once, in order, even with a tie on time", async () => {
    const all = (await pages("resourceType=Patient", 100)).flat();
    expect(all).toHaveLength(6);
    const paged = await pages("", 5);
    const flat = paged.flat();
    expect(new Set(flat.map((e) => e.id)).size).toBe(flat.length);
    expect(flat.filter((e) => ids.includes(e.id))).toHaveLength(12);
    expect(paged.slice(0, -1).every((p) => p.length === 5)).toBe(true);
    // Ties (three events at one instant) stay in id order across a page boundary.
    const tied = flat.filter(
      (e) => e.occurredAt === new Date(when(9)).toISOString() && ids.includes(e.id),
    );
    expect(tied.map((e) => e.id)).toEqual([...tied.map((e) => e.id)].sort().reverse());
    for (const size of [1, 2, 3, 7]) {
      const rows = (await pages("eventName=phi.read", size)).flat();
      expect(rows).toHaveLength(4);
    }
  });

  it("a cursor survives new events arriving between pages", async () => {
    const first = await audit(s, "?eventName=phi.read&limit=2");
    const body = first.json() as AuditPage;
    expect(body.items).toHaveLength(2);
    await insertAudit(db, {
      orgId: a.orgId,
      occurredAt: new Date(NOW.getTime()),
      eventName: "phi.read",
    });
    const rest = (
      await audit(s, `?eventName=phi.read&limit=100&cursor=${body.nextCursor}`)
    ).json() as AuditPage;
    expect([...body.items, ...rest.items].filter((e) => ids.includes(e.id))).toHaveLength(4);
    expect(rest.items.every((e) => e.occurredAt <= body.items[1]!.occurredAt)).toBe(true);
  });

  it("rejects a malformed cursor, an unknown event name and a bad date", async () => {
    for (const qs of [
      "?cursor=nope",
      "?eventName=not.an.event",
      "?from=yesterday",
      "?limit=0",
      "?patientId=1",
    ]) {
      const res = await audit(s, qs);
      expect(res.statusCode, qs).toBe(400);
    }
  });

  it("is itself audited: audit.query after the page, with the filters used, never in its own page", async () => {
    const before = await db.auditEvent.count({
      where: { organizationId: a.orgId, eventName: "audit.query" },
    });
    const res = await audit(s, `?eventName=phi.read&outcome=success&limit=3`);
    expect(res.statusCode).toBe(200);
    const events = (await auditEventsForRequest(db, res.headers["x-request-id"] as string)).filter(
      (e) => e.eventName === "audit.query",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      action: "R",
      outcome: "success",
      actorUserId: a.admin.userId,
      purposeOfUse: "admin",
    });
    expect(events[0]!.metadata).toMatchObject({
      rows: 3,
      "filter.eventName": "phi.read",
      "filter.outcome": "success",
      route: "/audit-events",
    });
    expect((res.json() as AuditPage).items.some((e) => e.id === events[0]!.id)).toBe(false);
    expect(
      await db.auditEvent.count({ where: { organizationId: a.orgId, eventName: "audit.query" } }),
    ).toBe(before + 1);
    // The next read lists the previous read.
    const next = (await audit(s, "?eventName=audit.query&limit=100")).json() as AuditPage;
    expect(next.items.some((e) => e.id === events[0]!.id)).toBe(true);
  });
});

describe("audit query permissions (AC-H5)", () => {
  it("the clinic administrator reads; the coordinator, therapist and patient are refused with an event", async () => {
    expect((await audit(admin)).statusCode).toBe(200);
    for (const s of [coordinator, therapist, patient]) {
      const res = await audit(s);
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("forbidden");
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events.some((e) => e.eventName === "security.access_denied")).toBe(true);
    }
  });

  it("another organization's administrator never sees this organization's events", async () => {
    await insertAudit(db, {
      orgId: org.orgId,
      occurredAt: at(1),
      eventName: "phi.read",
      resourceId: "org-a-marker",
    });
    const res = await audit(bAdmin, "?limit=100");
    expect(res.body).not.toContain("org-a-marker");
    expect(res.body).not.toContain(org.orgId);
    expect((await audit(bAdmin, "?resourceId=org-a-marker")).json().items).toEqual([]);
    expect((await audit(bAdmin, `?patientId=${org.patient.patientId}`)).json().items).toEqual([]);
  });
});

describe("eligibility codes", () => {
  const issue = (s: Session, body: Record<string, unknown> = {}) =>
    as(app, s)({ method: "POST", url: "/enrollment-codes", payload: body });
  const list = (s: Session, qs = "") =>
    as(app, s)({ method: "GET", url: `/enrollment-codes${qs}` });
  const signUp = (code: string) =>
    app.inject({
      method: "POST",
      url: "/onboarding/accounts",
      headers: { origin: ORIGIN },
      payload: {
        email: `new-${randomUUID()}@example.test`,
        password: PASSWORD,
        eligibilityCode: code,
        givenName: "Avery",
        familyName: "Newcomer",
        birthDate: "1984-06-02",
      },
    });

  it("issues a code once: only the hash is stored, and the code is never returned again", async () => {
    const res = await issue(coordinator, { expiresInDays: 7 });
    expect(res.statusCode, res.body).toBe(201);
    const body = res.json() as EnrollmentCodeIssued;
    expect(body.code).toMatch(/^[A-Z2-9]{4} [A-Z2-9]{4} [A-Z2-9]{4}$/);
    const raw = body.code.replace(/ /g, "");
    expect(body).toMatchObject({
      status: "unused",
      label: raw.slice(-4),
      redeemedBy: null,
      revokedAt: null,
    });
    expect(body.expiresAt).toBe(new Date(NOW.getTime() + 7 * D).toISOString());
    const row = await enrollmentCodeRow(db, body.id);
    expect(row.codeHash).toBe(hashEnrollmentCode(body.code));
    expect(await allColumnsOf(db, body.id)).not.toContain(raw);
    // The list and every other read carry the label and status, never the code.
    for (const s of [coordinator, admin]) {
      const listed = await list(s, "?limit=100");
      expect(listed.body).not.toContain(raw);
      expect(listed.body).not.toContain(body.code);
      expect((listed.json().items as EnrollmentCode[]).find((c) => c.id === body.id)).toMatchObject(
        { label: raw.slice(-4), status: "unused" },
      );
      expect(Object.keys(listed.json().items[0])).not.toContain("code");
    }
    const events = (await auditEventsForRequest(db, res.headers["x-request-id"] as string)).filter(
      (e) => e.eventName === "enrollment_code.issue",
    );
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events[0])).not.toContain(raw);
    expect(events[0]).toMatchObject({ action: "C", resourceId: body.id });
  });

  it("an issued code creates an account, once; the list then shows who used it", async () => {
    const { code, id } = (await issue(admin)).json() as EnrollmentCodeIssued;
    // Letter case and spaces are ignored, as at sign-up.
    const ok = await signUp(code.toLowerCase().replace(/ /g, ""));
    expect(ok.statusCode, ok.body).toBe(201);
    expect((await signUp(code)).statusCode).toBe(400);
    const row = (await list(admin, "?status=redeemed&limit=100"))
      .json()
      .items.find((c: EnrollmentCode) => c.id === id);
    expect(row).toMatchObject({ status: "redeemed", redeemedBy: { name: "Avery Newcomer" } });
    expect(
      (
        await as(app, admin)({ method: "POST", url: `/enrollment-codes/${id}/revoke`, payload: {} })
      ).json().error.code,
    ).toBe("invalid_transition");
  });

  it("revokes an unused code: it stops working, the list says so, and it is audited", async () => {
    const issued = (await issue(admin)).json() as EnrollmentCodeIssued;
    const res = await as(
      app,
      admin,
    )({ method: "POST", url: `/enrollment-codes/${issued.id}/revoke`, payload: {} });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({
      id: issued.id,
      status: "revoked",
      revokedAt: NOW.toISOString(),
    });
    const attempt = await signUp(issued.code);
    expect(attempt.statusCode).toBe(400);
    expect(attempt.json().error.code).toBe("eligibility_code_invalid");
    const again = await as(
      app,
      admin,
    )({ method: "POST", url: `/enrollment-codes/${issued.id}/revoke`, payload: {} });
    expect(again.statusCode).toBe(409);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.filter((e) => e.eventName === "enrollment_code.revoke")).toHaveLength(1);
    expect(
      (await list(admin, "?status=revoked&limit=100"))
        .json()
        .items.some((c: EnrollmentCode) => c.id === issued.id),
    ).toBe(true);
    expect(
      (await list(admin, "?status=unused&limit=100"))
        .json()
        .items.some((c: EnrollmentCode) => c.id === issued.id),
    ).toBe(false);
  });

  it("filters by status and pages newest first", async () => {
    const expiredCode = await createEnrollmentCode(db, org.orgId, new Date(NOW.getTime() - D));
    void expiredCode;
    const expired = (await list(admin, "?status=expired&limit=100")).json()
      .items as EnrollmentCode[];
    expect(expired.length).toBeGreaterThan(0);
    expect(expired.every((c) => c.status === "expired")).toBe(true);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const res = await list(admin, `?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      seen.push(...res.json().items.map((c: EnrollmentCode) => c.id));
      cursor = res.json().nextCursor ?? undefined;
    } while (cursor);
    expect(new Set(seen).size).toBe(seen.length);
    const total = await db.enrollmentCode.count({ where: { organizationId: org.orgId } });
    expect(seen).toHaveLength(total);
  });

  it("validates the expiry and refuses roles without enrollment.manage", async () => {
    for (const body of [
      { expiresInDays: 0 },
      { expiresInDays: 91 },
      { expiresInDays: 7, extra: 1 },
    ]) {
      expect((await issue(admin, body)).statusCode).toBe(400);
    }
    for (const s of [therapist, patient]) {
      expect((await issue(s)).statusCode).toBe(403);
      expect((await list(s)).statusCode).toBe(403);
    }
  });

  it("another organization cannot see or revoke this organization's codes", async () => {
    const issued = (await issue(admin)).json() as EnrollmentCodeIssued;
    for (const s of [bAdmin, bCoordinator]) {
      expect((await list(s, "?limit=100")).body).not.toContain(issued.id);
      const res = await as(
        app,
        s,
      )({ method: "POST", url: `/enrollment-codes/${issued.id}/revoke`, payload: {} });
      expect(res.statusCode).toBe(404);
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events.some((e) => e.eventName === "security.access_denied")).toBe(true);
    }
    expect((await enrollmentCodeRow(db, issued.id)).revokedAt).toBeNull();
  });
});
