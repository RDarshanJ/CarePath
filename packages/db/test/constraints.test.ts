import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import {
  addMember,
  addPatient,
  appointment,
  at,
  createOrg,
  expectDbError,
  freshDay,
  insert,
  one,
  pool,
  type Org,
} from "./helpers.js";

afterAll(async () => {
  await pool.end();
});

async function publishedPlan(org: Org) {
  const planId = await insert("CarePlan", {
    organizationId: org.orgId,
    patientId: org.patientId,
    title: "Knee mobility",
    createdByPractitionerId: org.practitionerId,
  });
  const v1 = await insert("CarePlanVersion", {
    organizationId: org.orgId,
    carePlanId: planId,
    versionNumber: 1,
    title: "Knee mobility",
    instructions: "Fictional demonstration plan.",
    publishedByPractitionerId: org.practitionerId,
  });
  await pool.query(
    `UPDATE "CarePlan" SET status = 'active', "currentVersionId" = $1 WHERE id = $2`,
    [v1, planId],
  );
  return { planId, v1 };
}

async function draftNote(org: Org) {
  const noteId = await insert("ClinicalNote", {
    organizationId: org.orgId,
    patientId: org.patientId,
    authorPractitionerId: org.practitionerId,
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
  return { noteId, v1 };
}

describe("booking integrity (exclusion constraints)", () => {
  it("rejects an overlapping appointment for the same practitioner", async () => {
    const org = await createOrg();
    const day = freshDay();
    await insert("Appointment", appointment(org, at(day, 15), at(day, 16)));
    const otherPatient = await addPatient(org.orgId);
    await expectDbError(
      insert(
        "Appointment",
        appointment(org, at(day, 15, 30), at(day, 16, 30), { patientId: otherPatient }),
      ),
      E.exclusionViolation,
      "Appointment_practitioner_no_overlap",
    );
  });

  it("rejects an overlapping appointment for the same patient with another practitioner", async () => {
    const org = await createOrg();
    const day = freshDay();
    await insert("Appointment", appointment(org, at(day, 15), at(day, 16)));
    const otherPt = await insert("Practitioner", {
      organizationId: org.orgId,
      staffId: `PT-other-${org.slug}`,
      givenName: "Sam",
      familyName: "Example",
    });
    await expectDbError(
      insert(
        "Appointment",
        appointment(org, at(day, 15, 45), at(day, 16, 15), { practitionerId: otherPt }),
      ),
      E.exclusionViolation,
      "Appointment_patient_no_overlap",
    );
  });

  it("allows back-to-back slots and rebooking a cancelled time", async () => {
    const org = await createOrg();
    const day = freshDay();
    const first = await insert("Appointment", appointment(org, at(day, 15), at(day, 16)));
    await insert("Appointment", appointment(org, at(day, 16), at(day, 17)));
    await pool.query(
      `UPDATE "Appointment" SET status = 'cancelled_by_patient', "cancelledAt" = now() WHERE id = $1`,
      [first],
    );
    await insert("Appointment", appointment(org, at(day, 15), at(day, 16)));
  });

  it("lets exactly one of 10 concurrent bookings for the same time succeed", async () => {
    const org = await createOrg();
    const day = freshDay();
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        insert("Appointment", appointment(org, at(day, 18), at(day, 19))),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      await expectDbError(
        Promise.reject((r as PromiseRejectedResult).reason),
        E.exclusionViolation,
      );
    }
  });

  it("rejects overlapping availability slots for one practitioner", async () => {
    const org = await createOrg();
    const day = freshDay();
    const slot = {
      organizationId: org.orgId,
      practitionerId: org.practitionerId,
      startsAt: at(day, 14),
      endsAt: at(day, 15),
    };
    await insert("AvailabilitySlot", slot);
    await expectDbError(
      insert("AvailabilitySlot", { ...slot, startsAt: at(day, 14, 30), endsAt: at(day, 15, 30) }),
      E.exclusionViolation,
      "AvailabilitySlot_practitioner_no_overlap",
    );
  });
});

describe("organization boundaries (composite foreign keys)", () => {
  it("rejects an appointment whose patient belongs to another organization", async () => {
    const a = await createOrg();
    const b = await createOrg();
    const day = freshDay();
    await expectDbError(
      insert("Appointment", appointment(a, at(day, 9), at(day, 10), { patientId: b.patientId })),
      E.foreignKeyViolation,
      "Appointment_patientId_organizationId_fkey",
    );
  });

  it("rejects a care-team member who is not a member of the organization", async () => {
    const a = await createOrg();
    const b = await createOrg();
    const teamId = await insert("CareTeam", {
      organizationId: a.orgId,
      patientId: a.patientId,
      name: "Care team",
    });
    await expectDbError(
      insert("CareTeamMember", {
        organizationId: a.orgId,
        careTeamId: teamId,
        userId: b.clinicianUserId,
        role: "primary_therapist",
      }),
      E.foreignKeyViolation,
    );
  });

  it("rejects pointing a care plan at another plan's version", async () => {
    const org = await createOrg();
    const first = await publishedPlan(org);
    await pool.query(`UPDATE "CarePlan" SET status = 'completed' WHERE id = $1`, [first.planId]);
    const second = await publishedPlan(org);
    await expectDbError(
      pool.query(`UPDATE "CarePlan" SET "currentVersionId" = $1 WHERE id = $2`, [
        first.v1,
        second.planId,
      ]),
      E.foreignKeyViolation,
      "CarePlan_currentVersionId_id_fkey",
    );
  });

  it("rejects a message from someone who is not a conversation participant", async () => {
    const org = await createOrg();
    const conversationId = await insert("Conversation", {
      organizationId: org.orgId,
      patientId: org.patientId,
      subject: "Questions about my plan",
    });
    await insert("ConversationParticipant", {
      organizationId: org.orgId,
      conversationId,
      userId: org.patientUserId,
    });
    await expectDbError(
      insert("Message", {
        organizationId: org.orgId,
        conversationId,
        senderUserId: org.coordinatorUserId,
        body: "Hello",
      }),
      E.foreignKeyViolation,
      "Message_conversationId_senderUserId_fkey",
    );
  });
});

describe("unique constraints", () => {
  it("rejects a duplicate MRN in one organization but allows it in another", async () => {
    const a = await createOrg();
    const b = await createOrg();
    const { mrn } = await one<{ mrn: string }>(`SELECT mrn FROM "Patient" WHERE id = $1`, [
      a.patientId,
    ]);
    const row = { mrn, givenName: "Dup", familyName: "Synthetic", birthDate: "1990-01-01" };
    await expectDbError(
      insert("Patient", { ...row, organizationId: a.orgId }),
      E.uniqueViolation,
      "Patient_organizationId_mrn_key",
    );
    await insert("Patient", { ...row, organizationId: b.orgId });
  });

  it("allows only one open care plan per patient (partial unique index)", async () => {
    const org = await createOrg();
    await publishedPlan(org);
    await expectDbError(
      insert("CarePlan", {
        organizationId: org.orgId,
        patientId: org.patientId,
        title: "Second open plan",
        createdByPractitionerId: org.practitionerId,
      }),
      E.uniqueViolation,
      "CarePlan_one_open_per_patient_key",
    );
  });

  it("allows only one active primary therapist per care team", async () => {
    const org = await createOrg();
    const other = await addMember(org.orgId, "physical_therapist");
    const careTeamId = await insert("CareTeam", {
      organizationId: org.orgId,
      patientId: org.patientId,
      name: "Care team",
    });
    const member = { organizationId: org.orgId, careTeamId, role: "primary_therapist" };
    await insert("CareTeamMember", { ...member, userId: org.clinicianUserId });
    await expectDbError(
      insert("CareTeamMember", { ...member, userId: other }),
      E.uniqueViolation,
      "CareTeamMember_one_primary_therapist_key",
    );
  });
});

describe("status transitions", () => {
  it("rejects an illegal appointment transition and allows a legal one", async () => {
    const org = await createOrg();
    const day = freshDay();
    const id = await insert("Appointment", appointment(org, at(day, 10), at(day, 11)));
    await pool.query(`UPDATE "Appointment" SET status = 'checked_in' WHERE id = $1`, [id]);
    await pool.query(`UPDATE "Appointment" SET status = 'completed' WHERE id = $1`, [id]);
    await expectDbError(
      pool.query(`UPDATE "Appointment" SET status = 'booked' WHERE id = $1`, [id]),
      E.illegalStatusTransition,
    );
  });

  it("rejects moving a signed note back to draft", async () => {
    const org = await createOrg();
    const { noteId } = await draftNote(org);
    await pool.query(
      `UPDATE "ClinicalNote" SET status = 'signed', "signedAt" = now(), "signedByPractitionerId" = $2 WHERE id = $1`,
      [noteId, org.practitionerId],
    );
    await expectDbError(
      pool.query(`UPDATE "ClinicalNote" SET status = 'draft' WHERE id = $1`, [noteId]),
      E.illegalStatusTransition,
    );
  });
});

describe("append-only tables", () => {
  it("rejects UPDATE and DELETE on AuditEvent", async () => {
    const org = await createOrg();
    const id = await insert("AuditEvent", {
      organizationId: org.orgId,
      actorUserId: org.clinicianUserId,
      actorRole: "physical_therapist",
      actorType: "user",
      action: "R",
      eventName: "phi.read",
      outcome: "success",
      resourceType: "Patient",
      resourceId: org.patientId,
      patientId: org.patientId,
    });
    await expectDbError(
      pool.query(`UPDATE "AuditEvent" SET outcome = 'major_failure' WHERE id = $1`, [id]),
      E.appendOnly,
    );
    await expectDbError(pool.query(`DELETE FROM "AuditEvent" WHERE id = $1`, [id]), E.appendOnly);
  });

  it("rejects editing a published care plan version", async () => {
    const org = await createOrg();
    const { v1 } = await publishedPlan(org);
    await expectDbError(
      pool.query(`UPDATE "CarePlanVersion" SET instructions = 'changed' WHERE id = $1`, [v1]),
      E.appendOnly,
    );
  });
});

describe("check constraints and domain rules", () => {
  it("rejects a pain score outside 0 to 10", async () => {
    const org = await createOrg();
    await expectDbError(
      insert("PatientCheckIn", {
        organizationId: org.orgId,
        patientId: org.patientId,
        painScore: 11,
      }),
      E.checkViolation,
      "PatientCheckIn_pain_check",
    );
  });

  it("requires a patient-facing change note from version 2", async () => {
    const org = await createOrg();
    const { planId } = await publishedPlan(org);
    const v2 = {
      organizationId: org.orgId,
      carePlanId: planId,
      versionNumber: 2,
      title: "Knee mobility",
      instructions: "Fictional demonstration plan, revised.",
      publishedByPractitionerId: org.practitionerId,
    };
    await expectDbError(
      insert("CarePlanVersion", v2),
      E.checkViolation,
      "CarePlanVersion_patient_note_check",
    );
    await insert("CarePlanVersion", {
      ...v2,
      changeNoteForPatient: "Added a hold to the second exercise.",
    });
  });

  it("rejects skipped version numbers", async () => {
    const org = await createOrg();
    const { planId } = await publishedPlan(org);
    await expectDbError(
      insert("CarePlanVersion", {
        organizationId: org.orgId,
        carePlanId: planId,
        versionNumber: 3,
        title: "Skipped",
        instructions: "Fictional.",
        changeNoteForPatient: "Skipped a number.",
        publishedByPractitionerId: org.practitionerId,
      }),
      E.domainRule,
    );
  });

  it("only lets the author sign, and a signed note only takes amendments", async () => {
    const org = await createOrg();
    const { noteId } = await draftNote(org);
    const otherPt = await insert("Practitioner", {
      organizationId: org.orgId,
      staffId: `PT-signer-${org.slug}`,
      givenName: "Casey",
      familyName: "Example",
    });
    await expectDbError(
      pool.query(
        `UPDATE "ClinicalNote" SET status = 'signed', "signedAt" = now(), "signedByPractitionerId" = $2 WHERE id = $1`,
        [noteId, otherPt],
      ),
      E.checkViolation,
      "ClinicalNote_signer_is_author_check",
    );
    await pool.query(
      `UPDATE "ClinicalNote" SET status = 'signed', "signedAt" = now(), "signedByPractitionerId" = $2 WHERE id = $1`,
      [noteId, org.practitionerId],
    );
    const version = {
      organizationId: org.orgId,
      noteId,
      versionNumber: 2,
      subjective: "s",
      objective: "o",
      assessment: "a",
      plan: "p",
      createdByUserId: org.clinicianUserId,
    };
    await expectDbError(insert("ClinicalNoteVersion", version), E.domainRule);
    const amendment = await insert("ClinicalNoteVersion", {
      ...version,
      isAmendment: true,
      amendmentReason: "Corrected the exercise count.",
    });
    await pool.query(`UPDATE "ClinicalNote" SET "currentVersionId" = $1 WHERE id = $2`, [
      amendment,
      noteId,
    ]);
  });

  it("rejects a user holding both a patient and a practitioner profile", async () => {
    const org = await createOrg();
    await expectDbError(
      insert("Practitioner", {
        organizationId: org.orgId,
        userId: org.patientUserId,
        staffId: `PT-dual-${org.slug}`,
        givenName: "Dual",
        familyName: "Profile",
      }),
      E.domainRule,
    );
  });

  it("rejects an encounter for an appointment that did not take place", async () => {
    const org = await createOrg();
    const day = freshDay();
    const apptId = await insert("Appointment", appointment(org, at(day, 8), at(day, 9)));
    const encounter = {
      organizationId: org.orgId,
      patientId: org.patientId,
      practitionerId: org.practitionerId,
      appointmentId: apptId,
      class: "AMB",
      typeCode: "pt-follow-up",
      typeDisplay: "Physical therapy follow-up",
      startedAt: at(day, 8),
    };
    await expectDbError(insert("Encounter", encounter), E.domainRule);
    await pool.query(`UPDATE "Appointment" SET status = 'checked_in' WHERE id = $1`, [apptId]);
    await insert("Encounter", encounter);
  });
});
