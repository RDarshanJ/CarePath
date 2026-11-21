import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DeterministicProvider } from "@carepath/ai";
import { loadConfig } from "../../src/config.js";
import { unsupportedProbe } from "../../src/modules/ai/provider.js";
import { patientIdentifiers } from "../../src/modules/ai/repo.js";
import { buildInput } from "../../src/modules/ai/service.js";
import { as, login, testApp } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import {
  createEncounter,
  createGenerationAndNote,
  evalTranscript,
  grantAiConsent,
} from "../support/fixtures/ai.js";

/**
 * WP 5.6b, checkpoint C3 fixes at the API: B1 (entered in error by permission, header-only
 * answer without clinical.read), B2 (an entered-in-error note leaves the FHIR export), B4 (one
 * signed note per encounter), B5 (staff names go to the redactor) and B8 (the stored input
 * records are the allow list on read and at approval).
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const DAY = 86_400_000;
const db = createTestDb();
const aiConfig = { ...loadConfig().ai, backoffMs: 0 };

let app: FastifyInstance;

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW, config: { ai: aiConfig } });
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

type Req = ReturnType<typeof as>;
type Note = {
  id: string;
  status: string;
  currentVersionId: string;
  currentVersion: { subjective: string } | null;
  versions: unknown[];
};

/** A fresh organization whose patient has one visit with a generated draft note on it. */
async function world() {
  const org = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  const encounterId = await createEncounter(
    db,
    org.orgId,
    org.patient.patientId,
    org.therapist.practitionerId,
    new Date(NOW.getTime() - DAY),
    evalTranscript(2),
  );
  const therapist = as(app, await login(app, org.therapist.email));
  const base = `/patients/${org.patient.patientId}`;
  return { org, encounterId, therapist, base };
}

async function draftOn(org: OrgFixture, encounterId: string): Promise<string> {
  const { noteId } = await createGenerationAndNote(
    db,
    org.orgId,
    org.patient.patientId,
    org.therapist,
    encounterId,
    NOW,
  );
  return noteId;
}

async function sign(t: Req, base: string, noteId: string) {
  const note = (await t({ method: "GET", url: `${base}/notes/${noteId}` })).json() as Note;
  return t({
    method: "POST",
    url: `${base}/notes/${noteId}/sign`,
    payload: { expectedVersionId: note.currentVersionId },
  });
}

describe("B1: entered in error by permission, header only without clinical.read", () => {
  it("gives the clinic administrator the note header and no note text", async () => {
    const { org, encounterId, therapist, base } = await world();
    const noteId = await draftOn(org, encounterId);
    expect((await sign(therapist, base, noteId)).statusCode).toBe(200);
    const admin = as(app, await login(app, org.admin.email));
    // The administrator cannot read the note.
    expect((await admin({ method: "GET", url: `${base}/notes/${noteId}` })).statusCode).toBe(403);

    const res = await admin({
      method: "POST",
      url: `${base}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Written on the wrong patient." },
    });
    expect(res.statusCode, res.body).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({
      id: noteId,
      status: "entered_in_error",
      versions: [],
      currentVersion: null,
      enteredInError: { reason: "Written on the wrong patient.", by: { userId: org.admin.userId } },
      canMarkEnteredInError: false,
      canSign: false,
      canAmend: false,
    });
    // No SOAP field and no fixture text anywhere in the answer.
    expect(res.body).not.toContain("Fixture.");
    for (const field of ["subjective", "objective", "assessment", "plan"])
      expect(res.body).not.toContain(`"${field}"`);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events).toEqual([
      expect.objectContaining({
        eventName: "note.entered_in_error",
        purposeOfUse: "operations",
        detailCode: "mark_entered_in_error_permission",
      }),
    ]);
    expect(events.map((e) => e.eventName)).not.toContain("phi.read");
  });

  it("refuses a therapist who is not the author, and a coordinator", async () => {
    const { org, encounterId, therapist, base } = await world();
    const noteId = await draftOn(org, encounterId);
    expect((await sign(therapist, base, noteId)).statusCode).toBe(200);
    const other = as(app, await login(app, org.otherTherapist.email));
    const notAuthor = await other({
      method: "POST",
      url: `${base}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Not mine." },
    });
    expect(notAuthor.statusCode).toBe(403);
    expect(notAuthor.json().error.code).toBe("not_note_author");
    const coordinator = as(app, await login(app, org.coordinator.email));
    const denied = await coordinator({
      method: "POST",
      url: `${base}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Not allowed." },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe("forbidden");
  });

  it("gives the author the full note, audited as treatment by the author", async () => {
    const { org, encounterId, therapist, base } = await world();
    const noteId = await draftOn(org, encounterId);
    const signed = await sign(therapist, base, noteId);
    expect(signed.json().canMarkEnteredInError).toBe(true);
    const res = await therapist({
      method: "POST",
      url: `${base}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Duplicate of another note." },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json().currentVersion.subjective).toBe("Fixture.");
    expect(res.json().versions).toHaveLength(1);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events).toEqual([
      expect.objectContaining({ purposeOfUse: "treatment", detailCode: "author" }),
    ]);
  });
});

describe("B4: one signed note per encounter", () => {
  it("answers 409 encounter_already_documented until the first note is entered in error", async () => {
    const { org, encounterId, therapist, base } = await world();
    const first = await draftOn(org, encounterId);
    const second = await draftOn(org, encounterId);
    expect((await sign(therapist, base, first)).statusCode).toBe(200);
    const blocked = await sign(therapist, base, second);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe("encounter_already_documented");
    const still = (await therapist({ method: "GET", url: `${base}/notes/${second}` })).json();
    expect(still.status).toBe("draft");

    const eie = await therapist({
      method: "POST",
      url: `${base}/notes/${first}/entered-in-error`,
      payload: { reason: "Replaced by a corrected note." },
    });
    expect(eie.statusCode).toBe(200);
    const corrected = await sign(therapist, base, second);
    expect(corrected.statusCode, corrected.body).toBe(200);
    expect(corrected.json().status).toBe("signed");
  });
});

describe("B2: an entered-in-error note leaves the FHIR export", () => {
  it("exports no id of the note or of any of its versions", async () => {
    const { org, encounterId, therapist, base } = await world();
    const noteId = await draftOn(org, encounterId);
    const signed = await sign(therapist, base, noteId);
    expect(signed.statusCode).toBe(200);
    const amend = await therapist({
      method: "POST",
      url: `${base}/notes/${noteId}/amendments`,
      payload: {
        expectedVersionId: signed.json().currentVersionId,
        subjective: "Amended (synthetic).",
        objective: "",
        assessment: "",
        plan: "",
        reason: "Corrected the subjective section.",
      },
    });
    expect(amend.statusCode, amend.body).toBe(201);
    const versionIds = (amend.json().versions as { id: string }[]).map((v) => v.id);
    expect(versionIds).toHaveLength(2);

    const before = await therapist({ method: "GET", url: `${base}/fhir/export` });
    expect(before.statusCode, before.body).toBe(200);
    for (const id of versionIds) expect(before.body).toContain(id);

    const eie = await therapist({
      method: "POST",
      url: `${base}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Written on the wrong patient." },
    });
    expect(eie.statusCode).toBe(200);
    const after = await therapist({ method: "GET", url: `${base}/fhir/export` });
    expect(after.statusCode, after.body).toBe(200);
    const types = (after.json().entry as { resource: { resourceType: string } }[]).map(
      (e) => e.resource.resourceType,
    );
    expect(types).not.toContain("DocumentReference");
    for (const id of [noteId, ...versionIds]) expect(after.body).not.toContain(id);
    expect(after.body).not.toContain(Buffer.from("Amended (synthetic).").toString("base64"));
  });
});

describe("B5: the redactor is given the staff names", () => {
  it("names the care team, the message senders and the visit's clinician", async () => {
    const { org, encounterId } = await world();
    const ctx = { orgId: org.orgId };
    const plain = await patientIdentifiers(db, ctx, org.patient.patientId);
    expect(plain.names).toEqual(
      expect.arrayContaining(["Jordan", "Synthetic", "Jordan Synthetic", "Riley Example"]),
    );
    expect(plain.names).toContain("Synthetic therapist");
    expect(plain.names).not.toContain("Synthetic coordinator");
    // The patient's own login name is not a staff name and adds nothing.
    expect(plain.names).not.toContain("Synthetic patient");

    const withSender = await patientIdentifiers(db, ctx, org.patient.patientId, {
      senderUserIds: [org.coordinator.userId, org.patient.userId],
    });
    expect(withSender.names).toContain("Synthetic coordinator");
    expect(withSender.names).not.toContain("Synthetic patient");

    await db.practitioner.update({
      where: { id: org.otherTherapist.practitionerId },
      data: { givenName: "Morgan", familyName: "Visitor" },
    });
    await db.encounter.update({
      where: { id: encounterId },
      data: { practitionerId: org.otherTherapist.practitionerId },
    });
    const built = await buildInput(
      db,
      {
        requestId: "t",
        sessionId: "t",
        userId: org.therapist.userId,
        orgId: org.orgId,
        role: "physical_therapist",
        permissions: new Set<never>(),
        patientId: null,
        practitionerId: org.therapist.practitionerId,
      },
      org.patient.patientId,
      { kind: "encounter", encounterId },
    );
    expect(built.input.identifiers?.names).toEqual(
      expect.arrayContaining(["Morgan", "Visitor", "Morgan Visitor", "Riley Example"]),
    );
  });
});

describe("B8: the stored input records are the allow list", () => {
  it("marks a cited record that was not in the input not_in_input, and blocks approval", async () => {
    const { org, encounterId, base } = await world();
    await grantAiConsent(db, org.orgId, org.patient.patientId);
    // A progress summary is not built from encounters: the visit exists for this patient, in
    // scope, but the generation was never given it.
    const probe = await testApp(db, {
      now: () => NOW,
      config: { ai: aiConfig },
      aiProvider: unsupportedProbe(new DeterministicProvider(), (kind) =>
        kind === "progress_summary"
          ? [
              {
                text: "The visit transcript mentions stairs.",
                sourceRefs: [{ type: "encounter", id: encounterId, field: "transcript.turn.1" }],
              },
            ]
          : [],
      ),
    });
    try {
      const t = as(probe, await login(probe, org.therapist.email));
      const res = await t({ method: "POST", url: `${base}/ai/summaries`, payload: {} });
      expect(res.statusCode, res.body).toBe(201);
      const read = await t({ method: "GET", url: `${base}/ai/generations/${res.json().id}` });
      const st = (
        read.json().sections as {
          statements: { text: string; sourceRefs: { inInput: boolean | null }[] }[];
        }[]
      )
        .flatMap((s) => s.statements)
        .find((s) => s.text === "The visit transcript mentions stairs.");
      expect(st).toMatchObject({
        support: "unsupported",
        unsupportedReason: "not_in_input",
        needsResolution: true,
        sourceRefs: [{ type: "encounter", status: "resolved", inInput: false }],
      });
      // Every other statement cites records the generation was given.
      const others = (read.json().sections as { statements: (typeof st)[] }[])
        .flatMap((s) => s.statements)
        .filter((s) => s !== undefined && s.text !== "The visit transcript mentions stairs.");
      for (const o of others)
        for (const r of o!.sourceRefs) expect(r.inInput, JSON.stringify(o)).toBe(true);
      const approve = await t({
        method: "POST",
        url: `${base}/ai/generations/${res.json().id}/approve`,
        payload: { revisionId: null },
      });
      expect(approve.statusCode).toBe(409);
      expect(approve.json().error.code).toBe("ai_approval_blocked");
      expect((approve.json().error.details as { issue: string }[]).map((d) => d.issue)).toContain(
        "unsupported_unresolved",
      );
    } finally {
      await probe.close();
    }
  });

  it("verifies an older row without inputRefs as before", async () => {
    const { org, encounterId, therapist, base } = await world();
    const g = await db.aIGeneration.create({
      data: {
        organizationId: org.orgId,
        patientId: org.patient.patientId,
        kind: "note_draft",
        provider: "deterministic",
        providerLabel: "Demo provider, rule-based",
        promptKey: "note_draft",
        promptVersion: "fixture",
        status: "succeeded",
        input: {
          schema: "carepath.ai.generation-input.v1",
          request: { kind: "encounter", encounterId },
          run: { calls: [], costLabel: "fixture", errorCode: null },
        },
        output: {
          schema: "carepath.ai.generation-output.v1",
          draft: {
            subjective: [
              {
                id: "s1",
                text: "Fixture statement.",
                sourceRefs: [{ type: "encounter", id: encounterId, field: "transcript.turn.1" }],
              },
            ],
            objective: [],
            assessment: [],
            plan: [],
            missingInformation: [],
            notices: [],
          },
          verification: null,
        },
        requestedByUserId: org.therapist.userId,
        createdAt: NOW,
        completedAt: NOW,
      },
      select: { id: true },
    });
    const read = await therapist({ method: "GET", url: `${base}/ai/generations/${g.id}` });
    expect(read.statusCode, read.body).toBe(200);
    const st = read.json().sections[0].statements[0];
    expect(st).toMatchObject({
      support: "supported",
      unsupportedReason: null,
      sourceRefs: [{ status: "resolved", inInput: null }],
    });
  });
});
