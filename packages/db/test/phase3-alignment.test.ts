/**
 * Migration phase3_alignment (checkpoint C1, WP 3.0 M2): same-patient parents, anonymous audit
 * actor, skip reason, stop for discomfort, enrollment codes and clinic settings.
 */
import { createHash, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import { canTransition } from "../src/status.js";
import { addPatient, createOrg, expectDbError, insert, one, pool, type Org } from "./helpers.js";

afterAll(async () => {
  await pool.end();
});

async function exercise(org: Org): Promise<string> {
  return insert("Exercise", {
    organizationId: org.orgId,
    slug: `ex-${randomUUID().slice(0, 8)}`,
    name: "Fictional heel slide",
    bodyArea: "knee",
    category: "mobility",
    description: "Fictional demonstration exercise.",
    instructions: "Fictional instructions.",
  });
}

/** A published plan (version 1, one assignment) for one patient. */
async function plan(org: Org, patientId: string) {
  const planId = await insert("CarePlan", {
    organizationId: org.orgId,
    patientId,
    title: "Knee mobility",
    createdByPractitionerId: org.practitionerId,
  });
  const versionId = await insert("CarePlanVersion", {
    organizationId: org.orgId,
    carePlanId: planId,
    versionNumber: 1,
    title: "Knee mobility",
    instructions: "Fictional demonstration plan.",
    publishedByPractitionerId: org.practitionerId,
  });
  await pool.query(
    `UPDATE "CarePlan" SET status = 'active', "currentVersionId" = $1 WHERE id = $2`,
    [versionId, planId],
  );
  const assignmentId = await insert("ExerciseAssignment", {
    organizationId: org.orgId,
    carePlanVersionId: versionId,
    exerciseId: await exercise(org),
    position: 0,
    reps: 10,
    daysOfWeek: [1, 3, 5],
  });
  return { planId, versionId, assignmentId };
}

/** One open plan per patient (partial unique index): complete it before a second plan. */
async function closePlan(planId: string): Promise<void> {
  await pool.query(`UPDATE "CarePlan" SET status = 'completed' WHERE id = $1`, [planId]);
}

async function session(org: Org, patientId: string, versionId: string): Promise<string> {
  return insert("ExerciseSession", {
    organizationId: org.orgId,
    patientId,
    carePlanVersionId: versionId,
  });
}

async function checkIn(org: Org, patientId: string, sessionId: string | null): Promise<string> {
  return insert("PatientCheckIn", {
    organizationId: org.orgId,
    patientId,
    sessionId,
    painScore: 3,
  });
}

async function encounter(org: Org, patientId: string): Promise<string> {
  return insert("Encounter", {
    organizationId: org.orgId,
    patientId,
    practitionerId: org.practitionerId,
    class: "AMB",
    typeCode: "pt-follow-up",
    typeDisplay: "Physical therapy follow-up",
    startedAt: "2030-01-02T10:00:00Z",
  });
}

function painObservation(org: Org, patientId: string, extra: Record<string, unknown>) {
  return {
    organizationId: org.orgId,
    patientId,
    category: "survey",
    codeSystem: "http://loinc.org",
    code: "72514-3",
    display: "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
    valueQuantity: 3,
    valueUnit: "{score}",
    performerType: "patient",
    effectiveAt: "2030-01-02T10:00:00Z",
    ...extra,
  };
}

/** Two patients in one organization, each with a plan, a session and a check-in. */
async function twoPatients() {
  const org = await createOrg();
  const a = org.patientId;
  const b = await addPatient(org.orgId, "b");
  const planA = await plan(org, a);
  const planB = await plan(org, b);
  const sessionA = await session(org, a, planA.versionId);
  const sessionB = await session(org, b, planB.versionId);
  const checkInA = await checkIn(org, a, sessionA);
  const checkInB = await checkIn(org, b, sessionB);
  return { org, a, b, planA, planB, sessionA, sessionB, checkInA, checkInB };
}

describe("same-patient parents (C1 WP 2.3 defect 1)", () => {
  it("ExerciseSession: rejects another patient's plan version", async () => {
    const w = await twoPatients();
    // twoPatients() already inserted the matching session for A (one open session per patient).
    await pool.query(`UPDATE "ExerciseSession" SET status = 'abandoned' WHERE id = $1`, [
      w.sessionA,
    ]);
    await expectDbError(session(w.org, w.a, w.planB.versionId), E.domainRule);
    await session(w.org, w.a, w.planA.versionId);
  });

  it("PatientCheckIn: rejects another patient's session", async () => {
    const w = await twoPatients();
    await expectDbError(checkIn(w.org, w.a, w.sessionB), E.domainRule);
    await checkIn(w.org, w.a, null);
  });

  it("Observation: rejects another patient's check-in or session", async () => {
    const w = await twoPatients();
    await expectDbError(
      insert("Observation", painObservation(w.org, w.a, { checkInId: w.checkInB })),
      E.domainRule,
    );
    await expectDbError(
      insert("Observation", painObservation(w.org, w.a, { sessionId: w.sessionB })),
      E.domainRule,
    );
    await insert(
      "Observation",
      painObservation(w.org, w.a, { checkInId: w.checkInA, sessionId: w.sessionA }),
    );
  });

  it("Goal: rejects another patient's care plan", async () => {
    const w = await twoPatients();
    const goal = (carePlanId: string) => ({
      organizationId: w.org.orgId,
      patientId: w.a,
      carePlanId,
      description: "Walk to the mailbox without stopping (synthetic).",
    });
    await expectDbError(insert("Goal", goal(w.planB.planId)), E.domainRule);
    await insert("Goal", goal(w.planA.planId));
  });

  it("SessionActivity: rejects an assignment from a different plan version than the session", async () => {
    const w = await twoPatients();
    // Same patient, second plan: its version differs from the session's.
    await closePlan(w.planA.planId);
    const otherPlanForA = await plan(w.org, w.a);
    const activity = (assignmentId: string) => ({
      organizationId: w.org.orgId,
      sessionId: w.sessionA,
      assignmentId,
    });
    await expectDbError(
      insert("SessionActivity", activity(otherPlanForA.assignmentId)),
      E.domainRule,
    );
    await expectDbError(insert("SessionActivity", activity(w.planB.assignmentId)), E.domainRule);
    await insert("SessionActivity", activity(w.planA.assignmentId));
  });

  it("ClinicalNote: rejects another patient's encounter", async () => {
    const w = await twoPatients();
    const encB = await encounter(w.org, w.b);
    const encA = await encounter(w.org, w.a);
    const note = (encounterId: string) => ({
      organizationId: w.org.orgId,
      patientId: w.a,
      encounterId,
      authorPractitionerId: w.org.practitionerId,
    });
    await expectDbError(insert("ClinicalNote", note(encB)), E.domainRule);
    await insert("ClinicalNote", note(encA));
  });

  it("rejects the same mismatch when it is introduced by UPDATE", async () => {
    const w = await twoPatients();
    await expectDbError(
      pool.query(`UPDATE "PatientCheckIn" SET "sessionId" = $1 WHERE id = $2`, [
        w.sessionB,
        w.checkInA,
      ]),
      E.domainRule,
    );
  });

  it("fixes the patient of a parent once written, so children cannot be re-pointed", async () => {
    const w = await twoPatients();
    for (const [table, id] of [
      ["CarePlan", w.planA.planId],
      ["ExerciseSession", w.sessionA],
      ["PatientCheckIn", w.checkInA],
    ] as const) {
      await expectDbError(
        pool.query(`UPDATE "${table}" SET "patientId" = $1 WHERE id = $2`, [w.b, id]),
        E.domainRule,
      );
    }
    // Another version of the same patient passes the same-patient check; it is still refused.
    await closePlan(w.planA.planId);
    const second = await plan(w.org, w.a);
    await expectDbError(
      pool.query(`UPDATE "ExerciseSession" SET "carePlanVersionId" = $1 WHERE id = $2`, [
        second.versionId,
        w.sessionA,
      ]),
      E.domainRule,
    );
  });
});

describe("anonymous audit actor (ruling 3.1)", () => {
  const base = { action: "E", eventName: "auth.login_failed", outcome: "minor_failure" };

  it("accepts anonymous without a user and rejects it with one", async () => {
    const org = await createOrg();
    await insert("AuditEvent", { ...base, actorType: "anonymous" });
    await expectDbError(
      insert("AuditEvent", { ...base, actorType: "anonymous", actorUserId: org.patientUserId }),
      E.checkViolation,
      "AuditEvent_anonymous_actor_check",
    );
  });
});

describe("skip reason and stop for discomfort (AC-C3, AC-C4)", () => {
  it("stores a skip reason only on skipped activities", async () => {
    const w = await twoPatients();
    const id = await insert("SessionActivity", {
      organizationId: w.org.orgId,
      sessionId: w.sessionA,
      assignmentId: w.planA.assignmentId,
    });
    await expectDbError(
      pool.query(`UPDATE "SessionActivity" SET "skipReason" = 'Too tired' WHERE id = $1`, [id]),
      E.checkViolation,
      "SessionActivity_skip_reason_check",
    );
    await pool.query(
      `UPDATE "SessionActivity" SET status = 'skipped', "skipReason" = 'Too tired' WHERE id = $1`,
      [id],
    );
    const row = await one<{ status: string; skipReason: string }>(
      `SELECT status, "skipReason" FROM "SessionActivity" WHERE id = $1`,
      [id],
    );
    expect(row).toEqual({ status: "skipped", skipReason: "Too tired" });
  });

  it("allows in_progress and paused to stop for discomfort, and requires stoppedAt", async () => {
    expect(canTransition("ExerciseSession", "in_progress", "stopped_discomfort")).toBe(true);
    expect(canTransition("ExerciseSession", "paused", "stopped_discomfort")).toBe(true);
    expect(canTransition("ExerciseSession", "stopped_discomfort", "in_progress")).toBe(false);

    const w = await twoPatients();
    await expectDbError(
      pool.query(`UPDATE "ExerciseSession" SET status = 'stopped_discomfort' WHERE id = $1`, [
        w.sessionA,
      ]),
      E.checkViolation,
      "ExerciseSession_stopped_check",
    );
    await pool.query(
      `UPDATE "ExerciseSession" SET status = 'paused', "pausedAt" = now() WHERE id = $1`,
      [w.sessionA],
    );
    await pool.query(
      `UPDATE "ExerciseSession" SET status = 'stopped_discomfort', "stoppedAt" = now() WHERE id = $1`,
      [w.sessionA],
    );
    await expectDbError(
      pool.query(`UPDATE "ExerciseSession" SET status = 'in_progress' WHERE id = $1`, [w.sessionA]),
      E.illegalStatusTransition,
    );
    await pool.query(
      `UPDATE "ExerciseSession" SET status = 'stopped_discomfort', "stoppedAt" = now() WHERE id = $1`,
      [w.sessionB],
    );
  });
});

describe("enrollment codes and clinic settings", () => {
  const hash = (code: string) => createHash("sha256").update(code).digest("hex");

  it("stores a unique hash, redeemed once, by a patient of the same organization", async () => {
    const org = await createOrg();
    const other = await createOrg();
    const code = `DEMO-${randomUUID()}`;
    const row = {
      organizationId: org.orgId,
      codeHash: hash(code),
      label: code.slice(-4),
      expiresAt: "2030-01-01T00:00:00Z",
    };
    const id = await insert("EnrollmentCode", row);
    await expectDbError(insert("EnrollmentCode", row), E.uniqueViolation);
    await expectDbError(
      insert("EnrollmentCode", { ...row, codeHash: "not-a-hash" }),
      E.checkViolation,
      "EnrollmentCode_hash_check",
    );
    await expectDbError(
      pool.query(`UPDATE "EnrollmentCode" SET "redeemedAt" = now() WHERE id = $1`, [id]),
      E.checkViolation,
      "EnrollmentCode_redeemed_check",
    );
    await expectDbError(
      pool.query(
        `UPDATE "EnrollmentCode" SET "redeemedAt" = now(), "redeemedByPatientId" = $1 WHERE id = $2`,
        [other.patientId, id],
      ),
      E.foreignKeyViolation,
    );
    await pool.query(
      `UPDATE "EnrollmentCode" SET "redeemedAt" = now(), "redeemedByPatientId" = $1 WHERE id = $2`,
      [org.patientId, id],
    );
  });

  it("keeps clinic phone and reply-time text optional but not blank", async () => {
    const org = await createOrg();
    await pool.query(
      `UPDATE "Organization" SET phone = '555-0100', "replyTimeText" = 'Replies within one business day.' WHERE id = $1`,
      [org.orgId],
    );
    await expectDbError(
      pool.query(`UPDATE "Organization" SET phone = '  ' WHERE id = $1`, [org.orgId]),
      E.checkViolation,
      "Organization_phone_check",
    );
  });
});

describe("exercise illustration description (migration exercise_media_alt, checkpoint C2 ruling 3.4)", () => {
  const base = (org: Org) => ({
    organizationId: org.orgId,
    slug: `ex-${randomUUID().slice(0, 8)}`,
    name: "Fictional heel slide",
    bodyArea: "knee",
    category: "mobility",
    description: "Fictional demonstration exercise.",
    instructions: "Fictional instructions.",
  });

  it("stores a path with its description, or neither", async () => {
    const org = await createOrg();
    await exercise(org);
    const id = await insert("Exercise", {
      ...base(org),
      mediaPath: "/assets/exercises/heel-slide.webp",
      mediaAlt: "A person lying on a mat with one knee bent",
    });
    const row = await one<{ mediaAlt: string }>(`SELECT "mediaAlt" FROM "Exercise" WHERE id = $1`, [
      id,
    ]);
    expect(row.mediaAlt).toBe("A person lying on a mat with one knee bent");
  });

  it("rejects a path without a description and a description without a path", async () => {
    const org = await createOrg();
    await expectDbError(
      insert("Exercise", { ...base(org), mediaPath: "/assets/exercises/heel-slide.webp" }),
      E.checkViolation,
      "Exercise_media_alt_with_path",
    );
    await expectDbError(
      insert("Exercise", { ...base(org), mediaAlt: "A person lying on a mat" }),
      E.checkViolation,
      "Exercise_media_alt_with_path",
    );
  });
});
