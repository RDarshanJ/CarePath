import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import { createOrg, expectDbError, insert, one, pool, type Org } from "./helpers.js";

/**
 * Checkpoint C3, B6: database tests for the entered-in-error rules of migration
 * phase5_ai_review (`ClinicalNote_entered_in_error_check`, trigger
 * `ClinicalNote_freeze_entered_in_error`) and for the two rules of migration phase5_c3_fixes
 * (the `note.mark_entered_in_error` grant and `ClinicalNote_one_signed_per_encounter_key`).
 */
afterAll(async () => {
  await pool.end();
});

const CHECK = "ClinicalNote_entered_in_error_check";
const ONE_SIGNED = "ClinicalNote_one_signed_per_encounter_key";

async function encounter(org: Org): Promise<string> {
  return insert("Encounter", {
    organizationId: org.orgId,
    patientId: org.patientId,
    practitionerId: org.practitionerId,
    class: "AMB",
    typeCode: "pt-follow-up",
    typeDisplay: "Physical therapy follow-up",
    startedAt: "2030-03-04T10:00:00Z",
  });
}

/** A draft note with one version, optionally on an encounter. */
async function draftNote(org: Org, encounterId: string | null = null): Promise<string> {
  const noteId = await insert("ClinicalNote", {
    organizationId: org.orgId,
    patientId: org.patientId,
    authorPractitionerId: org.practitionerId,
    ...(encounterId ? { encounterId } : {}),
  });
  const v1 = await insert("ClinicalNoteVersion", {
    organizationId: org.orgId,
    noteId,
    versionNumber: 1,
    subjective: "Synthetic subjective.",
    objective: "Synthetic objective.",
    assessment: "Synthetic assessment.",
    plan: "Synthetic plan.",
    createdByUserId: org.clinicianUserId,
  });
  await pool.query(`UPDATE "ClinicalNote" SET "currentVersionId" = $1 WHERE id = $2`, [v1, noteId]);
  return noteId;
}

function sign(org: Org, noteId: string) {
  return pool.query(
    `UPDATE "ClinicalNote" SET status = 'signed', "signedAt" = now(), "signedByPractitionerId" = $2 WHERE id = $1`,
    [noteId, org.practitionerId],
  );
}

async function signedNote(org: Org, encounterId: string | null = null): Promise<string> {
  const noteId = await draftNote(org, encounterId);
  await sign(org, noteId);
  return noteId;
}

function markEnteredInError(org: Org, noteId: string, reason = "Documented on the wrong visit.") {
  return pool.query(
    `UPDATE "ClinicalNote" SET status = 'entered_in_error', "enteredInErrorAt" = now(),
       "enteredInErrorByUserId" = $2, "enteredInErrorReason" = $3 WHERE id = $1`,
    [noteId, org.clinicianUserId, reason],
  );
}

describe("ClinicalNote_entered_in_error_check, each branch", () => {
  it("accepts a signed note marked entered in error with time, user and reason", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await markEnteredInError(org, noteId);
    const row = await one<{ status: string }>(`SELECT status FROM "ClinicalNote" WHERE id = $1`, [
      noteId,
    ]);
    expect(row.status).toBe("entered_in_error");
  });

  it("refuses the status without the time (status = entered_in_error iff enteredInErrorAt)", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await expectDbError(
      pool.query(
        `UPDATE "ClinicalNote" SET status = 'entered_in_error', "enteredInErrorByUserId" = $2,
           "enteredInErrorReason" = 'Wrong patient.' WHERE id = $1`,
        [noteId, org.clinicianUserId],
      ),
      E.checkViolation,
      CHECK,
    );
  });

  it("refuses the time without the status", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await expectDbError(
      pool.query(
        `UPDATE "ClinicalNote" SET "enteredInErrorAt" = now(), "enteredInErrorByUserId" = $2,
           "enteredInErrorReason" = 'Wrong patient.' WHERE id = $1`,
        [noteId, org.clinicianUserId],
      ),
      E.checkViolation,
      CHECK,
    );
  });

  it("refuses the time without the user, and the user without the time", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await expectDbError(
      pool.query(
        `UPDATE "ClinicalNote" SET status = 'entered_in_error', "enteredInErrorAt" = now(),
           "enteredInErrorReason" = 'Wrong patient.' WHERE id = $1`,
        [noteId],
      ),
      E.checkViolation,
      CHECK,
    );
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET "enteredInErrorByUserId" = $2 WHERE id = $1`, [
        noteId,
        org.clinicianUserId,
      ]),
      E.checkViolation,
      CHECK,
    );
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["blank", "   "],
  ])("refuses a %s reason", async (_label, reason) => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await expectDbError(markEnteredInError(org, noteId, reason as string), E.checkViolation, CHECK);
  });

  it("refuses a reason on a note that is not entered in error", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET "enteredInErrorReason" = 'Early.' WHERE id = $1`, [
        noteId,
      ]),
      E.checkViolation,
      CHECK,
    );
  });

  it("refuses the same rows on insert", async () => {
    const org = await createOrg();
    await expectDbError(
      insert("ClinicalNote", {
        organizationId: org.orgId,
        patientId: org.patientId,
        authorPractitionerId: org.practitionerId,
        enteredInErrorReason: "Never entered in error.",
      }),
      E.checkViolation,
      CHECK,
    );
  });
});

describe("trigger ClinicalNote_freeze_entered_in_error", () => {
  it("refuses any change to a note once it is entered in error", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await markEnteredInError(org, noteId);
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET "enteredInErrorReason" = 'Changed.' WHERE id = $1`, [
        noteId,
      ]),
      E.domainRule,
    );
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET "updatedAt" = now() WHERE id = $1`, [noteId]),
      E.domainRule,
    );
  });

  it("refuses a new version on it, and its current version cannot be moved", async () => {
    const org = await createOrg();
    const noteId = await signedNote(org);
    await markEnteredInError(org, noteId);
    await expectDbError(
      insert("ClinicalNoteVersion", {
        organizationId: org.orgId,
        noteId,
        versionNumber: 2,
        subjective: "Amended.",
        objective: "",
        assessment: "",
        plan: "",
        isAmendment: true,
        amendmentReason: "Too late.",
        createdByUserId: org.clinicianUserId,
      }),
      E.domainRule,
    );
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET "currentVersionId" = NULL WHERE id = $1`, [noteId]),
      E.domainRule,
    );
    const row = await one<{ status: string; reason: string }>(
      `SELECT status, "enteredInErrorReason" AS reason FROM "ClinicalNote" WHERE id = $1`,
      [noteId],
    );
    expect(row).toEqual({ status: "entered_in_error", reason: "Documented on the wrong visit." });
  });
});

describe("migration phase5_c3_fixes", () => {
  it("grants note.mark_entered_in_error to clinic_admin only", async () => {
    const rows = (
      await pool.query<{ key: string; holds: boolean }>(
        `SELECT key, 'note.mark_entered_in_error' = ANY (permissions) AS holds FROM "Role" ORDER BY key`,
      )
    ).rows;
    expect(Object.fromEntries(rows.map((r) => [r.key, r.holds]))).toEqual({
      care_coordinator: false,
      clinic_admin: true,
      patient: false,
      physical_therapist: false,
    });
  });

  it("is a partial unique index on signed notes", async () => {
    const row = await one<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = $1`,
      [ONE_SIGNED],
    );
    expect(row.indexdef).toMatch(/UNIQUE INDEX .* \("encounterId"\) WHERE .*signed/);
  });

  it("allows one signed note per encounter, any number of drafts", async () => {
    const org = await createOrg();
    const enc = await encounter(org);
    const first = await draftNote(org, enc);
    const second = await draftNote(org, enc);
    await sign(org, first);
    await expectDbError(sign(org, second), E.uniqueViolation, ONE_SIGNED);
    // Notes on other encounters, or on none, are not limited.
    await signedNote(org, await encounter(org));
    await signedNote(org);
    await signedNote(org);
  });

  it("frees the visit once the signed note is entered in error", async () => {
    const org = await createOrg();
    const enc = await encounter(org);
    const first = await signedNote(org, enc);
    const second = await draftNote(org, enc);
    await expectDbError(sign(org, second), E.uniqueViolation, ONE_SIGNED);
    await markEnteredInError(org, first);
    await sign(org, second);
    const n = await one<{ n: number }>(
      `SELECT count(*)::int n FROM "ClinicalNote" WHERE "encounterId" = $1 AND status = 'signed'`,
      [enc],
    );
    expect(n.n).toBe(1);
  });
});
