import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { as, login, ORIGIN, sessionCookie, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  auditEvents,
  createEnrollmentCode,
  enrollmentCodeByHash,
  patientRow,
  setClinic,
  userByEmail,
} from "../support/fixtures/repo.js";

/** Delivery step 6: Scenario A (account, intake, consent, assignment). */
const NOW = new Date("2026-11-19T16:00:00Z");
const DAY = 86_400_000;
const PASSWORD = "a long synthetic passphrase";
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let coordinator: Session;
let therapist: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  org = await createOrgFixture(db);
  await setClinic(db, org.orgId, {});
  coordinator = await login(app, org.coordinator.email);
  therapist = await login(app, org.therapist.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

function signUp(code: string, email = `new-${randomUUID()}@example.test`) {
  return app.inject({
    method: "POST",
    url: "/onboarding/accounts",
    headers: { origin: ORIGIN },
    payload: {
      email,
      password: PASSWORD,
      eligibilityCode: code,
      givenName: "Avery",
      familyName: "Newcomer",
      birthDate: "1984-06-02",
    },
  });
}

describe("account creation (AC-A3, AC-A5)", () => {
  it("rejects unknown, expired and used codes with no account created", async () => {
    const expired = await createEnrollmentCode(db, org.orgId, new Date(NOW.getTime() - DAY));
    for (const code of ["NOT-A-CODE", expired]) {
      const email = `reject-${randomUUID()}@example.test`;
      const res = await signUp(code, email);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toEqual({
        error: { code: "eligibility_code_invalid", message: expect.any(String) },
      });
      expect(await userByEmail(db, email)).toBeNull();
    }
  });

  it("creates the account, redeems the code and signs in; the code cannot be reused", async () => {
    const code = await createEnrollmentCode(db, org.orgId, new Date(NOW.getTime() + 30 * DAY));
    // Pasted with spaces and lower case (WCAG 3.3.8).
    const res = await signUp(` ${code.toLowerCase().replace("-", " - ")} `);
    expect(res.statusCode, res.body).toBe(201);
    const info = res.json();
    expect(info).toMatchObject({ role: "patient", organization: { id: org.orgId } });
    expect(sessionCookie(res)).toMatch(/^cp_session=/);
    const stored = await enrollmentCodeByHash(db, hashEnrollmentCode(code));
    expect(stored).toMatchObject({ redeemedByPatientId: info.patientId, redeemedAt: NOW });
    const patient = await patientRow(db, info.patientId);
    expect(patient).toMatchObject({ status: "intake_incomplete", timezone: "America/Phoenix" });
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events.map((e) => [e.eventName, e.outcome])).toEqual([["account.create", "success"]]);

    const email = `reuse-${randomUUID()}@example.test`;
    const again = await signUp(code, email);
    expect(again.json().error.code).toBe("eligibility_code_invalid");
    expect(await userByEmail(db, email)).toBeNull();
  });

  it("answers account_exists for a taken email and leaves the code unredeemed", async () => {
    const code = await createEnrollmentCode(db, org.orgId, new Date(NOW.getTime() + DAY));
    const res = await signUp(code, org.patient.email);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("account_exists");
    expect((await enrollmentCodeByHash(db, hashEnrollmentCode(code)))!.redeemedAt).toBeNull();
  });
});

describe("intake, consent and assignment (AC-A1, A2, A4, A8, H1)", () => {
  let patientId: string;
  let email: string;
  let call: ReturnType<typeof as>;
  const step = (s: string, answers: unknown) =>
    call({ method: "PUT", url: `/patients/${patientId}/intake/steps/${s}`, payload: { answers } });

  beforeAll(async () => {
    email = `intake-${randomUUID()}@example.test`;
    const code = await createEnrollmentCode(db, org.orgId, new Date(NOW.getTime() + DAY));
    const res = await signUp(code, email);
    patientId = res.json().patientId;
    call = as(app, await login(app, email, { password: PASSWORD }));
  });

  it("starts with personal information prefilled from the account step", async () => {
    const res = await call({ method: "GET", url: `/patients/${patientId}/intake` });
    expect(res.json()).toMatchObject({
      view: "full",
      status: "in_progress",
      totalSteps: 11,
      firstIncompleteStep: "primary_goal",
    });
    expect(res.json().steps[0]).toMatchObject({
      step: "personal_information",
      number: 3,
      complete: true,
      answers: { givenName: "Avery", birthDate: "1984-06-02" },
    });
  });

  it("resumes at step 5 on a new sign-in with steps 1 to 4 intact (AC-A1)", async () => {
    expect((await step("primary_goal", { goal: "Garden without stiffness" })).statusCode).toBe(200);
    const bad = await step("body_area", { bodyArea: "elbow", side: "left" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.details[0].path).toBe("body.answers.bodyArea");
    const resumed = as(app, await login(app, email, { password: PASSWORD }));
    const res = await resumed({ method: "GET", url: `/patients/${patientId}/intake` });
    expect(res.json().firstIncompleteStep).toBe("body_area");
    expect(res.json().steps.find((s: { step: string }) => s.step === "body_area").number).toBe(5);
    expect(res.json().steps[1].answers).toEqual({ goal: "Garden without stiffness" });
  });

  it("refuses submit while steps are missing, and refuses assignment (AC-A4)", async () => {
    const res = await call({
      method: "POST",
      url: `/patients/${patientId}/intake/submit`,
      payload: {},
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("intake_incomplete");
    expect(res.json().error.details.map((d: { path: string }) => d.path)).toContain("consent");
    const assign = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${patientId}/care-team/assignments`,
      payload: { practitionerId: org.therapist.practitionerId },
    });
    expect(assign.json().error.code).toBe("invalid_transition");
  });

  it("records consent choices from the consent step, optional AI off (AC-A8, AC-A5)", async () => {
    for (const [s, a] of [
      ["body_area", { bodyArea: "knee", side: "left" }],
      ["pain_levels", { current: 4, worstLastWeek: 6, bestLastWeek: 2 }],
      ["activity_limitations", { limitations: ["stairs"], other: null }],
      [
        "clinician_preferences",
        { genderPreference: "no_preference", languagePreference: "en", notes: null },
      ],
      ["appointment_availability", { days: [1, 3], times: ["morning"] }],
    ] as const) {
      expect((await step(s, a)).statusCode, s).toBe(200);
    }
    const consent = await step("consent", {
      treatmentAndDataUse: true,
      aiAssistedFeatures: false,
      textVersion: "2026-11-01",
    });
    expect(consent.statusCode).toBe(200);
    const events = await auditEvents(db, { requestId: consent.headers["x-request-id"] as string });
    expect(events.map((e) => e.eventName)).toEqual(["consent.grant"]);
    const list = (await call({ method: "GET", url: `/patients/${patientId}/consents` })).json();
    expect(
      list.types.map((t: { type: string; active: unknown }) => [t.type, t.active !== null]),
    ).toEqual([
      ["treatment_and_data_use", true],
      ["ai_assisted_features", false],
      ["motion_tracking", false],
    ]);
    expect(list.types[0].active.textVersion).toBe("2026-11-01");
  });

  it("submits: awaiting assignment, visible to staff without answers (AC-A2)", async () => {
    expect((await step("review", { confirmed: true })).statusCode).toBe(200);
    const res = await call({
      method: "POST",
      url: `/patients/${patientId}/intake/submit`,
      payload: {},
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({
      status: "submitted",
      firstIncompleteStep: null,
      missing: [],
    });
    expect((await patientRow(db, patientId)).status).toBe("awaiting_assignment");
    expect((await step("primary_goal", { goal: "late edit" })).json().error.code).toBe(
      "invalid_transition",
    );

    const dir = await as(
      app,
      coordinator,
    )({ method: "GET", url: "/patients?status=awaiting_assignment" });
    expect(dir.json().items.find((r: { id: string }) => r.id === patientId)).toMatchObject({
      view: "administrative",
      intakeStatus: "submitted",
      missingIntake: false,
    });
    const intake = await as(
      app,
      coordinator,
    )({ method: "GET", url: `/patients/${patientId}/intake` });
    expect(intake.json().view).toBe("completeness");
    expect(intake.json().steps.every((s: { answers: unknown }) => s.answers === null)).toBe(true);
  });

  it("assigns a clinician: patient active, on the clinician's list, named on the card (AC-H1)", async () => {
    const practitioners = await as(app, coordinator)({ method: "GET", url: "/practitioners" });
    expect(practitioners.json().items.length).toBeGreaterThanOrEqual(2);
    const bad = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${patientId}/care-team/assignments`,
      payload: { practitionerId: randomUUID() },
    });
    expect(bad.statusCode).toBe(400);
    const res = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${patientId}/care-team/assignments`,
      payload: { practitionerId: org.therapist.practitionerId },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().members).toEqual([
      expect.objectContaining({
        practitionerId: org.therapist.practitionerId,
        role: "primary_therapist",
        roleLabel: "Physical therapist",
      }),
    ]);
    const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
    expect(events.map((e) => e.eventName)).toEqual(["assignment.create"]);
    expect((await patientRow(db, patientId)).status).toBe("active");
    const mine = await as(
      app,
      therapist,
    )({ method: "GET", url: `/patients?clinicianId=${org.therapist.practitionerId}` });
    expect(mine.json().items.map((r: { id: string }) => r.id)).toContain(patientId);
    const cardForPatient = await call({ method: "GET", url: `/patients/${patientId}/care-team` });
    expect(cardForPatient.json().members[0].name).toBe("Riley Example");
    const again = await as(
      app,
      coordinator,
    )({
      method: "POST",
      url: `/patients/${patientId}/care-team/assignments`,
      payload: { practitionerId: org.otherTherapist.practitionerId },
    });
    expect(again.json().error.code).toBe("invalid_transition");
    expect(
      (
        await as(
          app,
          therapist,
        )({
          method: "POST",
          url: `/patients/${patientId}/care-team/assignments`,
          payload: { practitionerId: org.therapist.practitionerId },
        })
      ).statusCode,
    ).toBe(403);
  });

  it("grants and revokes the optional consent; the required one is withdrawn through the clinic", async () => {
    const url = `/patients/${patientId}/consents`;
    expect(
      (
        await call({
          method: "POST",
          url,
          payload: { type: "ai_assisted_features", textVersion: "2020-01-01" },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call({
          method: "POST",
          url,
          payload: { type: "motion_tracking", textVersion: "2026-11-01" },
        })
      ).statusCode,
    ).toBe(400);
    const granted = await call({
      method: "POST",
      url,
      payload: { type: "ai_assisted_features", textVersion: "2026-11-01" },
    });
    expect(granted.statusCode).toBe(201);
    const dup = await call({
      method: "POST",
      url,
      payload: { type: "ai_assisted_features", textVersion: "2026-11-01" },
    });
    expect(dup.json().error.code).toBe("already_exists");
    const revoke = await call({
      method: "POST",
      url: `${url}/${granted.json().id}/revoke`,
      payload: {},
    });
    expect(revoke.json()).toMatchObject({ status: "inactive", revokedAt: NOW.toISOString() });
    const events = await auditEvents(db, { requestId: revoke.headers["x-request-id"] as string });
    expect(events.map((e) => e.eventName)).toEqual(["consent.revoke"]);
    const twice = await call({
      method: "POST",
      url: `${url}/${granted.json().id}/revoke`,
      payload: {},
    });
    expect(twice.json().error.code).toBe("invalid_transition");
    const list = (await call({ method: "GET", url })).json();
    const required = list.types[0].active.id;
    const refused = await call({ method: "POST", url: `${url}/${required}/revoke`, payload: {} });
    expect(refused.json().error.code).toBe("consent_required_type");
    expect(list.history).toHaveLength(2);
    const staff = await as(app, therapist)({ method: "GET", url });
    expect(staff.statusCode).toBe(200);
  });
});
