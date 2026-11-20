import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, loginRaw, testApp } from "../support/http.js";
import {
  addMembership,
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  findAuthSession,
  PASSWORD,
  sessionsForUser,
  setLastSeen,
  type OrgFixture,
} from "../support/repo.js";

const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;

beforeAll(async () => {
  app = await testApp(db);
  org = await createOrgFixture(db);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("login", () => {
  it("sets an HttpOnly SameSite=Lax session cookie and returns the session", async () => {
    const res = await loginRaw(app, { email: org.therapist.email, password: PASSWORD });
    expect(res.statusCode).toBe(200);
    const cookie = res.cookies.find((c) => c.name === "cp_session");
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(12 * 60 * 60);
    const body = res.json();
    expect(body.role).toBe("physical_therapist");
    expect(body.organization.id).toBe(org.orgId);
    expect(body.practitionerId).toBe(org.therapist.practitionerId);
    expect(body.patientId).toBeNull();
    expect(body.permissions).toContain("clinical.write");
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The database stores a hash, never the cookie value.
    const sessions = await sessionsForUser(db, org.therapist.userId);
    expect(sessions.some((s) => s.tokenHash === cookie?.value)).toBe(false);

    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["auth.login"]);
    expect(events[0]?.actorUserId).toBe(org.therapist.userId);
    expect(events[0]?.organizationId).toBe(org.orgId);
  });

  it("accepts the email in any case and with surrounding spaces", async () => {
    const res = await loginRaw(app, {
      email: `  ${org.coordinator.email.toUpperCase()} `,
      password: PASSWORD,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe("care_coordinator");
  });

  it("gives the same 401 for a wrong password and an unknown email, and audits both", async () => {
    const wrong = await loginRaw(app, { email: org.admin.email, password: "nope" });
    const unknown = await loginRaw(app, { email: "nobody@example.test", password: "nope" });
    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.body).toBe(unknown.body);
    expect(wrong.json()).toEqual({
      error: { code: "invalid_credentials", message: "Email or password is incorrect." },
    });
    expect(wrong.cookies).toHaveLength(0);

    const [w] = await auditEventsForRequest(db, wrong.headers["x-request-id"] as string);
    expect(w?.eventName).toBe("auth.login_failed");
    expect(w?.actorUserId).toBe(org.admin.userId);
    expect(w?.detailCode).toBe("bad_password");
    const [u] = await auditEventsForRequest(db, unknown.headers["x-request-id"] as string);
    expect(u?.eventName).toBe("auth.login_failed");
    expect(u?.actorUserId).toBeNull();
    // Checkpoint C1 ruling 3.1: an unknown caller is anonymous, not the system.
    expect(u?.actorType).toBe("anonymous");
    expect(w?.actorType).toBe("user");
    expect(u?.metadata).not.toHaveProperty("anonymous");
    expect(JSON.stringify(u)).not.toContain("nobody@example.test");
  });

  it("asks which organization when the account has more than one", async () => {
    const second = await createOrgFixture(db);
    await addMembership(db, second.orgId, org.otherTherapist.userId, "physical_therapist");
    const ambiguous = await loginRaw(app, { email: org.otherTherapist.email, password: PASSWORD });
    expect(ambiguous.statusCode).toBe(400);
    expect(ambiguous.json().error.code).toBe("organization_required");

    const chosen = await loginRaw(app, {
      email: org.otherTherapist.email,
      password: PASSWORD,
      organizationSlug: second.slug,
    });
    expect(chosen.statusCode).toBe(200);
    expect(chosen.json().organization.id).toBe(second.orgId);
  });

  it("rotates: logging in with an existing session cookie ends the old session", async () => {
    const first = await login(app, org.patient.email);
    const res = await loginRaw(
      app,
      { email: org.patient.email, password: PASSWORD },
      { cookie: first.cookie },
    );
    expect(res.statusCode).toBe(200);
    expect((await findAuthSession(db, first.sessionId)).revokedAt).not.toBeNull();
    const old = await as(app, first)({ method: "GET", url: "/auth/session" });
    expect(old.statusCode).toBe(401);
  });
});

describe("session", () => {
  it("returns the current session and 401 without a cookie", async () => {
    const s = await login(app, org.patient.email);
    const res = await as(app, s)({ method: "GET", url: "/auth/session" });
    expect(res.statusCode).toBe(200);
    expect(res.json().patientId).toBe(org.patient.patientId);
    expect(res.json().csrfToken).toBe(s.csrfToken);

    const anon = await app.inject({ method: "GET", url: "/auth/session" });
    expect(anon.statusCode).toBe(401);
    expect(anon.json().error.code).toBe("unauthenticated");
  });

  it("logout revokes the session, clears the cookie and is audited", async () => {
    const s = await login(app, org.therapist.email);
    const out = await as(app, s)({ method: "POST", url: "/auth/logout" });
    expect(out.statusCode).toBe(204);
    const cleared = out.cookies.find((c) => c.name === "cp_session");
    expect(cleared?.value).toBe("");
    expect((await findAuthSession(db, s.sessionId)).revokedAt).not.toBeNull();
    const events = await auditEventsForRequest(db, out.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["auth.logout"]);

    const after = await as(app, s)({ method: "GET", url: "/auth/session" });
    expect(after.statusCode).toBe(401);
  });
});

describe("session expiry", () => {
  let clock = 0;
  let timed: FastifyInstance;
  beforeAll(async () => {
    timed = await testApp(db, { now: () => new Date(clock) });
  });
  afterAll(async () => timed.close());

  it("survives activity, then ends after 30 minutes idle", async () => {
    clock = Date.now();
    const s = await login(timed, org.coordinator.email);
    clock += 29 * 60_000;
    expect((await as(timed, s)({ method: "GET", url: "/auth/session" })).statusCode).toBe(200);
    // That request moved lastSeenAt, so another 29 minutes is still inside the idle window.
    clock += 29 * 60_000;
    expect((await as(timed, s)({ method: "GET", url: "/auth/session" })).statusCode).toBe(200);
    clock += 31 * 60_000;
    const res = await as(timed, s)({ method: "GET", url: "/auth/session" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("session_expired");
    expect(res.cookies.find((c) => c.name === "cp_session")?.value).toBe("");
    expect((await findAuthSession(db, s.sessionId)).revokedAt).not.toBeNull();
  });

  it("ends after 12 hours even when the user is active", async () => {
    clock = Date.now();
    const s = await login(timed, org.admin.email);
    const start = clock;
    clock = start + 12 * 60 * 60_000 - 60_000;
    await setLastSeen(db, s.sessionId, new Date(clock - 5 * 60_000));
    expect((await as(timed, s)({ method: "GET", url: "/auth/session" })).statusCode).toBe(200);
    clock = start + 12 * 60 * 60_000 + 1_000;
    const res = await as(timed, s)({ method: "GET", url: "/auth/session" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("session_expired");
  });
});
