import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DeterministicProvider, sourceRecords, type LLMProvider } from "@carepath/ai";
import { loadConfig } from "../../src/config.js";
import { failingProvider, unsupportedProbe } from "../../src/modules/ai/provider.js";
import { loadSources } from "../../src/modules/ai/repo.js";
import { buildInput, progressRequest } from "../../src/modules/ai/service.js";
import { as, login, testApp, type Session } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture } from "../support/fixtures/repo.js";
import {
  createEncounter,
  evalTranscript,
  eventsFor,
  generationRow,
  generationsFor,
  grantAiConsent,
  noteRows,
  revokeConsent,
  createGenerationAndNote,
  reviewRows,
  tryUpdateGeneration,
} from "../support/fixtures/ai.js";

/**
 * WP 5.2, Scenario F (AC-F1 to AC-F5, AC-F7, AC-F8, AC-F10 at the API): generate, inspect a
 * source, edit, approve; audit shows generation and review; an AI note draft becomes a draft
 * note that only its author's explicit signature finalises; consent refusal; references to
 * another patient are unsupported; a failed generation is stored and never answered as success.
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
const aiConfig = { ...loadConfig().ai, backoffMs: 0 };

let org: OrgFixture;
let encounterId: string;
let otherCheckInId: string;

type Req = ReturnType<typeof as>;

async function appWith(provider?: LLMProvider, ai: Partial<typeof aiConfig> = {}) {
  return testApp(db, {
    now: () => NOW,
    config: { ai: { ...aiConfig, ...ai } },
    ...(provider ? { aiProvider: provider } : {}),
  });
}

let app: FastifyInstance;
let therapist: Req;
let therapistSession: Session;

const base = () => `/patients/${org.patient.patientId}`;

type Gen = {
  id: string;
  currentRevisionId: string | null;
  approval: {
    allowed: boolean;
    blockers: { code: string; statementIds: string[]; items: string[] }[];
  };
  sections: {
    key: string;
    statements: { id: string; sourceRefs: { type: string; id: string }[] }[];
  }[];
};

/**
 * Meets the rest of the approval gate (CD-407): acknowledges every missing-information item and
 * opens evidence for each statement that still needs it. Returns the latest view.
 */
async function prepare(req: Req, genId: string): Promise<Gen> {
  const url = `${base()}/ai/generations/${genId}`;
  let g = (await req({ method: "GET", url })).json() as Gen;
  const missing = g.approval.blockers.find((b) => b.code === "missing_unacknowledged");
  if (missing) {
    const res = await req({
      method: "POST",
      url: `${url}/revisions`,
      payload: {
        baseRevisionId: g.currentRevisionId,
        changes: missing.items.map((item) => ({ action: "acknowledge_missing", item })),
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    g = res.json();
  }
  const unopened = g.approval.blockers.find((b) => b.code === "evidence_not_opened");
  for (const id of unopened?.statementIds ?? []) {
    const st = g.sections.flatMap((s) => s.statements).find((x) => x.id === id)!;
    const res = await req({
      method: "POST",
      url: `${url}/evidence-opens`,
      payload: {
        statementId: id,
        sourceType: st.sourceRefs[0]!.type,
        sourceId: st.sourceRefs[0]!.id,
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    g = res.json();
  }
  return g;
}

beforeAll(async () => {
  org = await createOrgFixture(db);
  await createClinicalFixture(db, org, NOW);
  await grantAiConsent(db, org.orgId, org.patient.patientId);
  await grantAiConsent(db, org.orgId, org.otherPatient.patientId);
  app = await appWith();
  const patient = as(app, await login(app, org.patient.email));
  for (const [painScore, notes] of [
    [4, "Stairs felt easier this week."],
    [6, "Knee was sore after the long walk."],
  ] as const) {
    const res = await patient({
      method: "POST",
      url: `${base()}/check-ins`,
      payload: { sessionId: null, painScore, difficulty: "as_expected", notes },
    });
    expect(res.statusCode).toBe(201);
  }
  const other = as(app, await login(app, org.otherPatient.email));
  const oc = await other({
    method: "POST",
    url: `/patients/${org.otherPatient.patientId}/check-ins`,
    payload: { sessionId: null, painScore: 9, notes: "Other patient's note." },
  });
  otherCheckInId = oc.json().checkIn.id;
  encounterId = await createEncounter(
    db,
    org.orgId,
    org.patient.patientId,
    org.therapist.practitionerId,
    new Date(NOW.getTime() - 86_400_000),
    evalTranscript(1),
  );
  therapistSession = await login(app, org.therapist.email);
  therapist = as(app, therapistSession);
});

afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("Scenario F: progress summary, generate -> inspect -> edit -> approve", () => {
  let genId: string;
  let generated: Record<string, unknown>;

  it("generates with the provider label, prompt version, refs and cost record (AC-F1, AC-F10)", async () => {
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/summaries`,
      payload: { windowDays: 14 },
    });
    expect(res.statusCode, res.body).toBe(201);
    const g = res.json();
    genId = g.id;
    generated = g;
    expect(g).toMatchObject({
      kind: "progress_summary",
      status: "succeeded",
      reviewState: "unreviewed",
      provider: {
        id: "deterministic",
        label: "Demo provider, rule-based",
        isDemo: true,
        model: null,
      },
      source: { kind: "progress_window", windowDays: 14, to: NOW.toISOString() },
      decision: null,
      currentRevisionId: null,
    });
    expect(g.usage).toMatchObject({
      attempts: 1,
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
    });
    expect(g.usage.costLabel).toMatch(/demo provider/i);
    expect(g.verification.unsupportedCount).toBe(0);
    // The gate: missing information and evidence opening may block; nothing is unsupported.
    expect(g.approval.allowed).toBe(g.approval.blockers.length === 0);
    expect(g.approval.blockers.map((b: { code: string }) => b.code)).not.toContain(
      "unsupported_unresolved",
    );
    const statements = g.sections.flatMap((s: { statements: unknown[] }) => s.statements);
    expect(statements.length).toBeGreaterThan(0);
    const cited = statements.flatMap((s: { sourceRefs: { status: string }[] }) => s.sourceRefs);
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.every((r: { status: string }) => r.status === "resolved")).toBe(true);

    const row = await generationRow(db, genId);
    expect(row).toMatchObject({
      provider: "deterministic",
      providerLabel: "Demo provider, rule-based",
      status: "succeeded",
      inputTokens: 0,
      outputTokens: 0,
      costMicroUsd: 0,
      unsupportedStatementCount: 0,
      requestedByUserId: org.therapist.userId,
    });
    expect(row.promptVersion).toMatch(/\S/);
    const input = row.input as { inputRefs: unknown[]; run: { calls: unknown[] } };
    expect(input.inputRefs.length).toBeGreaterThan(0);
    expect(input.run.calls).toHaveLength(1);

    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toContain("ai.generate");
    const ev = events.find((e) => e.eventName === "ai.generate")!;
    expect(ev).toMatchObject({
      resourceType: "AIGeneration",
      resourceId: genId,
      outcome: "success",
    });
  });

  it("opens the source record behind a statement, audited as phi.read", async () => {
    const ref = (
      generated["sections"] as { statements: { sourceRefs: Record<string, string>[] }[] }[]
    )
      .flatMap((s) => s.statements)
      .flatMap((s) => s.sourceRefs)[0]!;
    const res = await therapist({
      method: "GET",
      url: `${base()}/ai/sources/${ref["type"]}/${ref["id"]}`,
    });
    expect(res.statusCode, res.body).toBe(200);
    const rec = res.json();
    expect(rec).toMatchObject({
      type: ref["type"],
      id: ref["id"],
      patientId: org.patient.patientId,
    });
    const field = rec.fields.find((f: { field: string }) => f.field === ref["field"]);
    expect(field.value).toEqual(ref["value"]);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.some((e) => e.eventName === "phi.read" && e.resourceId === ref["id"])).toBe(true);
  });

  it("records an edit as an append-only revision and keeps the generated text", async () => {
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: null,
        changes: [{ action: "edit", statementId: "s1", text: "Clinician wording of the summary." }],
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    const g = res.json();
    expect(g.reviewState).toBe("in_review");
    expect(g.revisions).toHaveLength(1);
    const s1 = g.sections
      .flatMap((s: { statements: Record<string, unknown>[] }) => s.statements)
      .find((s: Record<string, unknown>) => s["id"] === "s1");
    expect(s1).toMatchObject({ text: "Clinician wording of the summary.", resolution: "edited" });
    expect(s1.originalText).not.toBe("Clinician wording of the summary.");

    // Another clinician's view is now stale: a second edit on the old base is refused.
    const stale = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: { baseRevisionId: null, changes: [{ action: "remove", statementId: "s1" }] },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe("revision_stale");
  });

  it("approves once, keeps the original generation, and audits generation and review (AC-F4)", async () => {
    const before = await generationRow(db, genId);
    const current = await prepare(therapist, genId);
    expect(current.approval).toEqual({ allowed: true, blockers: [] });
    const stale = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: null },
    });
    expect(stale.json().error.code).toBe("revision_stale");
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: current.currentRevisionId },
    });
    expect(res.statusCode, res.body).toBe(200);
    const g = res.json();
    expect(g.reviewState).toBe("approved_with_edits");
    expect(g.decision).toMatchObject({
      decision: "approved_with_edits",
      noteId: null,
      reviewer: { userId: org.therapist.userId },
    });
    expect(g.approval.allowed).toBe(false);

    const after = await generationRow(db, genId);
    expect(after.output).toEqual(before.output);
    expect(after.status).toBe("succeeded");
    const reviews = await reviewRows(db, genId);
    const decisions = reviews.map((r) => r.decision);
    expect(decisions[0]).toBe("revised");
    expect(decisions.at(-1)).toBe("approved_with_edits");
    expect(decisions.slice(0, -1).every((d) => d === "revised")).toBe(true);
    expect(reviews.every((r) => r.reviewerUserId === org.therapist.userId)).toBe(true);

    const reviewEvents = (await eventsFor(db, org.orgId, "ai.review")).filter(
      (e) => e.resourceId === genId,
    );
    const codes = reviewEvents.map((e) => e.detailCode);
    expect(codes[0]).toBe("revised");
    expect(codes.at(-1)).toBe("approved_with_edits");
    expect(codes).toHaveLength(reviews.length);
    const genEvents = (await eventsFor(db, org.orgId, "ai.generate")).filter(
      (e) => e.resourceId === genId,
    );
    expect(genEvents).toHaveLength(1);

    const again = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: current.currentRevisionId },
    });
    expect(again.json().error.code).toBe("ai_already_decided");
    const late = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: current.currentRevisionId,
        changes: [{ action: "restore", statementId: "s1" }],
      },
    });
    expect(late.json().error.code).toBe("ai_already_decided");
    const regen = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/regenerate`,
      payload: {},
    });
    expect(regen.json().error.code).toBe("ai_already_decided");
  });

  it("refuses to change a completed generation in the database", async () => {
    await expect(tryUpdateGeneration(db, genId)).rejects.toThrow();
  });
});

describe("Scenario F: SOAP note draft from a synthetic transcript", () => {
  let genId: string;
  let noteId: string;

  it("drafts from the encounter and shows the transcript side by side", async () => {
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/note-drafts`,
      payload: { encounterId },
    });
    expect(res.statusCode, res.body).toBe(201);
    const g = res.json();
    genId = g.id;
    expect(g).toMatchObject({
      kind: "note_draft",
      status: "succeeded",
      source: { kind: "encounter", encounterId },
    });
    expect(g.sections.map((s: { key: string }) => s.key)).toEqual([
      "subjective",
      "objective",
      "assessment",
      "plan",
    ]);
    const src = await therapist({
      method: "GET",
      url: `${base()}/ai/sources/encounter/${encounterId}`,
    });
    expect(src.statusCode).toBe(200);
    expect(src.json().syntheticTranscript).toBe(true);
    expect(src.json().transcript.length).toBeGreaterThan(4);
    expect(src.json().fields.some((f: { field: string }) => f.field === "transcript.turn.2")).toBe(
      true,
    );
  });

  it("approval creates a clinician-authored draft note; nothing is signed (AC-F8)", async () => {
    const ready = await prepare(therapist, genId);
    expect(ready.approval).toEqual({ allowed: true, blockers: [] });
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: ready.currentRevisionId },
    });
    expect(res.statusCode, res.body).toBe(200);
    noteId = res.json().decision.noteId;
    expect(noteId).toBeTruthy();
    const notes = await noteRows(db, org.patient.patientId);
    expect(notes.filter((n) => n.status === "signed")).toHaveLength(0);
    const note = notes.find((n) => n.id === noteId)!;
    expect(note).toMatchObject({
      status: "draft",
      signedAt: null,
      authorPractitionerId: org.therapist.practitionerId,
      encounterId,
    });
    expect(note.versions).toHaveLength(1);
    expect(note.versions[0]).toMatchObject({
      source: "ai_draft",
      aiGenerationId: genId,
      createdByUserId: org.therapist.userId,
    });
    const view = await therapist({ method: "GET", url: `${base()}/notes/${noteId}` });
    expect(view.json()).toMatchObject({ status: "draft", canSign: true, startedFromAiDraft: true });
  });

  it("only the author's explicit signature finalises the note; versions are append-only", async () => {
    const note = (await therapist({ method: "GET", url: `${base()}/notes/${noteId}` })).json();
    const v1 = note.currentVersionId;

    const coordinator = as(app, await login(app, org.coordinator.email));
    const c = await coordinator({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: v1 },
    });
    expect(c.statusCode).toBe(403);
    const otherT = as(app, await login(app, org.otherTherapist.email));
    const o = await otherT({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: v1 },
    });
    expect(o.statusCode).toBe(403);

    const edit = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/versions`,
      payload: {
        expectedVersionId: v1,
        subjective: note.currentVersion.subjective,
        objective: note.currentVersion.objective,
        assessment: "Clinician-written assessment (synthetic).",
        plan: note.currentVersion.plan,
      },
    });
    expect(edit.statusCode, edit.body).toBe(201);
    const v2 = edit.json().currentVersionId;
    expect(edit.json().versions.map((v: { source: string }) => v.source)).toEqual([
      "ai_draft",
      "clinician",
    ]);

    const stale = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: v1 },
    });
    expect(stale.json().error.code).toBe("draft_stale");
    const signed = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: v2 },
    });
    expect(signed.statusCode, signed.body).toBe(200);
    expect(signed.json()).toMatchObject({
      status: "signed",
      signedBy: { practitionerId: org.therapist.practitionerId },
      canSign: false,
    });
    const events = await auditEventsForRequest(db, signed.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toContain("note.sign");

    const twice = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: v2 },
    });
    expect(twice.json().error.code).toBe("invalid_transition");
    // A signed note takes no working versions; amendments are signed in one call (CR-8).
    const working = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/versions`,
      payload: { expectedVersionId: v2, subjective: "x", objective: "", assessment: "", plan: "" },
    });
    expect(working.json().error.code).toBe("invalid_transition");
    const noReason = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/amendments`,
      payload: { expectedVersionId: v2, subjective: "x", objective: "", assessment: "", plan: "" },
    });
    expect(noReason.statusCode).toBe(400);
    const empty = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/amendments`,
      payload: {
        expectedVersionId: v2,
        subjective: " ",
        objective: "",
        assessment: "",
        plan: "",
        reason: "Clearing everything.",
      },
    });
    expect(empty.json().error.code).toBe("note_empty");
    const notAuthor = await otherT({
      method: "POST",
      url: `${base()}/notes/${noteId}/amendments`,
      payload: {
        expectedVersionId: v2,
        subjective: "Amended.",
        objective: "",
        assessment: "",
        plan: "",
        reason: "Corrected the subjective section.",
      },
    });
    expect(notAuthor.statusCode).toBe(403);
    const amend = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/amendments`,
      payload: {
        expectedVersionId: v2,
        subjective: "Amended.",
        objective: "",
        assessment: "",
        plan: "",
        reason: "Corrected the subjective section.",
      },
    });
    expect(amend.statusCode, amend.body).toBe(201);
    expect(amend.json()).toMatchObject({
      status: "signed",
      canAmend: true,
      canMarkEnteredInError: true,
      currentVersion: {
        isAmendment: true,
        versionNumber: 3,
        amendmentReason: "Corrected the subjective section.",
      },
    });
    const amendEvents = await auditEventsForRequest(db, amend.headers["x-request-id"] as string);
    expect(amendEvents).toEqual([
      expect.objectContaining({ eventName: "note.sign", detailCode: "amendment" }),
    ]);

    // Entered in error: author or clinic administrator, reason required, irreversible.
    const coordinatorEie = await coordinator({
      method: "POST",
      url: `${base()}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Wrong patient." },
    });
    expect(coordinatorEie.statusCode).toBe(403);
    const admin = as(app, await login(app, org.admin.email));
    const noEieReason = await admin({
      method: "POST",
      url: `${base()}/notes/${noteId}/entered-in-error`,
      payload: { reason: "" },
    });
    expect(noEieReason.statusCode).toBe(400);
    const eie = await admin({
      method: "POST",
      url: `${base()}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Documented on the wrong visit." },
    });
    expect(eie.statusCode, eie.body).toBe(200);
    expect(eie.json()).toMatchObject({
      status: "entered_in_error",
      enteredInError: {
        reason: "Documented on the wrong visit.",
        by: { userId: org.admin.userId },
      },
      canMarkEnteredInError: false,
      canAmend: false,
    });
    const eieEvents = await auditEventsForRequest(db, eie.headers["x-request-id"] as string);
    expect(eieEvents.map((e) => e.eventName)).toEqual(["note.entered_in_error"]);
    const again2 = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/entered-in-error`,
      payload: { reason: "Again." },
    });
    expect(again2.json().error.code).toBe("invalid_transition");
    // The text stays readable.
    const read = await therapist({ method: "GET", url: `${base()}/notes/${noteId}` });
    expect(read.json().currentVersion.subjective).toBe("Amended.");
  });

  it("lists encounters with transcript and notes", async () => {
    const res = await therapist({ method: "GET", url: `${base()}/encounters` });
    expect(res.statusCode).toBe(200);
    const e = res.json().items.find((x: { id: string }) => x.id === encounterId);
    expect(e).toMatchObject({ hasTranscript: true, type: "follow_up", noteIds: [noteId] });
  });
});

describe("evidence: unsupported and cross-patient references (AC-F3)", () => {
  let probeApp: FastifyInstance;
  let t: Req;
  let genId: string;

  beforeAll(async () => {
    const provider = unsupportedProbe(new DeterministicProvider(), () => [
      {
        text: "Pain reached 9 out of 10 this week.",
        sourceRefs: [{ type: "check_in", id: otherCheckInId, field: "painScore" }],
      },
      { text: "Statement with no source.", sourceRefs: [] },
    ]);
    probeApp = await appWith(provider);
    t = as(probeApp, await login(probeApp, org.therapist.email));
  });
  afterAll(async () => probeApp.close());

  it("marks another patient's record unsupported and blocks approval until resolved", async () => {
    const res = await t({ method: "POST", url: `${base()}/ai/summaries`, payload: {} });
    expect(res.statusCode, res.body).toBe(201);
    const g = res.json();
    genId = g.id;
    expect(g.provider.label).toMatch(/test probe/);
    const items = g.sections.find((s: { key: string }) => s.key === "itemsForReview").statements;
    const cross = items.find((s: { text: string }) => s.text.startsWith("Pain reached 9"));
    const none = items.find((s: { text: string }) => s.text === "Statement with no source.");
    expect(cross).toMatchObject({
      support: "unsupported",
      unsupportedReason: "unresolved_source_ref",
      needsResolution: true,
      sourceRefs: [{ status: "out_of_scope", value: null }],
    });
    expect(none).toMatchObject({ support: "unsupported", unsupportedReason: "no_source_refs" });
    // Unresolved statements come first in their section.
    expect(items[0].needsResolution).toBe(true);
    expect(items[1].needsResolution).toBe(true);
    expect(g.verification).toMatchObject({ unsupportedCount: 2, needsResolutionCount: 2 });
    expect((await generationRow(db, genId)).unsupportedStatementCount).toBe(2);
    expect(g.approval.allowed).toBe(false);
    expect(g.approval.blockers[0]).toMatchObject({ code: "unsupported_unresolved" });
    expect(g.approval.blockers[0].statementIds.sort()).toEqual([cross.id, none.id].sort());

    const blocked = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: null },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().error.code).toBe("ai_approval_blocked");

    // The other patient's record cannot be opened through this patient's evidence route.
    const peek = await t({ method: "GET", url: `${base()}/ai/sources/check_in/${otherCheckInId}` });
    expect(peek.statusCode).toBe(404);
    const events = await auditEventsForRequest(db, peek.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toContain("security.access_denied");

    const short = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: null,
        changes: [{ action: "acknowledge", statementId: none.id, note: "" }],
      },
    });
    expect(short.statusCode).toBe(400);
    const unknown = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: { baseRevisionId: null, changes: [{ action: "remove", statementId: "s999" }] },
    });
    expect(unknown.statusCode).toBe(400);

    const r1 = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: null,
        changes: [
          { action: "remove", statementId: cross.id },
          {
            action: "acknowledge",
            statementId: none.id,
            note: "Checked with the patient by phone.",
          },
        ],
      },
    });
    expect(r1.statusCode, r1.body).toBe(200);
    expect(r1.json().approval.blockers.map((b: { code: string }) => b.code)).not.toContain(
      "unsupported_unresolved",
    );
    // Restoring brings the block back; resolving again clears it.
    const r2 = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: r1.json().currentRevisionId,
        changes: [{ action: "restore", statementId: cross.id }],
      },
    });
    expect(r2.json().approval.blockers[0].statementIds).toEqual([cross.id]);
    const r3 = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/revisions`,
      payload: {
        baseRevisionId: r2.json().currentRevisionId,
        changes: [
          { action: "edit", statementId: cross.id, text: "No pain report of 9 for this patient." },
        ],
      },
    });
    expect(r3.statusCode).toBe(200);
    const ready = await prepare(t, genId);
    const ok = await t({
      method: "POST",
      url: `${base()}/ai/generations/${genId}/approve`,
      payload: { revisionId: ready.currentRevisionId },
    });
    expect(ok.statusCode, ok.body).toBe(200);
    expect(ok.json().reviewState).toBe("approved_with_edits");
    expect(ok.json().revisions.length).toBeGreaterThanOrEqual(3);
  });
});

describe("design checkpoint requests (CR-7, CR-8, CR-16)", () => {
  it("lists undecided drafts on the overview, refuses approval after consent withdrawal, and records evidence opens", async () => {
    const o3 = await createOrgFixture(db);
    await createClinicalFixture(db, o3, NOW);
    const consentId = await grantAiConsent(db, o3.orgId, o3.patient.patientId);
    const t = as(app, await login(app, o3.therapist.email));
    const p = `/patients/${o3.patient.patientId}`;
    const g = (await t({ method: "POST", url: `${p}/ai/summaries`, payload: {} })).json();

    const overview = (await t({ method: "GET", url: "/overview" })).json();
    expect(overview.aiDraftsAwaitingReview).toEqual({
      count: 1,
      items: [
        expect.objectContaining({
          generationId: g.id,
          kind: "progress_summary",
          reviewState: "unreviewed",
          patient: expect.objectContaining({ id: o3.patient.patientId }),
        }),
      ],
    });

    // Evidence open: only for a source the statement cites.
    const st = g.sections.flatMap((x: { statements: unknown[] }) => x.statements)[0];
    const bad = await t({
      method: "POST",
      url: `${p}/ai/generations/${g.id}/evidence-opens`,
      payload: { statementId: st.id, sourceType: "check_in", sourceId: otherCheckInId },
    });
    expect(bad.statusCode).toBe(400);
    const opened = await t({
      method: "POST",
      url: `${p}/ai/generations/${g.id}/evidence-opens`,
      payload: {
        statementId: st.id,
        sourceType: st.sourceRefs[0].type,
        sourceId: st.sourceRefs[0].id,
      },
    });
    expect(opened.statusCode, opened.body).toBe(200);
    const after = opened.json();
    expect(after.revisions.at(-1).kind).toBe("evidence_opened");
    expect(
      after.sections
        .flatMap((x: { statements: { id: string; evidenceOpened: boolean }[] }) => x.statements)
        .find((x: { id: string }) => x.id === st.id).evidenceOpened,
    ).toBe(true);
    const listed = (await t({ method: "GET", url: "/overview" })).json();
    expect(listed.aiDraftsAwaitingReview.items[0].reviewState).toBe("in_review");

    await revokeConsent(db, consentId, new Date());
    const view = (await t({ method: "GET", url: `${p}/ai/generations/${g.id}` })).json();
    expect(view.approval.blockers.map((b: { code: string }) => b.code)).toContain(
      "consent_withdrawn",
    );
    const refused = await t({
      method: "POST",
      url: `${p}/ai/generations/${g.id}/approve`,
      payload: { revisionId: view.currentRevisionId },
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe("ai_consent_withdrawn");
    const events = await auditEventsForRequest(db, refused.headers["x-request-id"] as string);
    expect(events).toEqual([
      expect.objectContaining({ eventName: "ai.refused", detailCode: "consent_withdrawn" }),
    ]);
    const rej = await t({
      method: "POST",
      url: `${p}/ai/generations/${g.id}/reject`,
      payload: { reason: "Consent withdrawn." },
    });
    expect(rej.statusCode).toBe(200);
    const cleared = (await t({ method: "GET", url: "/overview" })).json();
    expect(cleared.aiDraftsAwaitingReview).toEqual({ count: 0, items: [] });
  });

  it("refuses to sign a note whose four sections are all empty", async () => {
    const enc = await createEncounter(
      db,
      org.orgId,
      org.patient.patientId,
      org.therapist.practitionerId,
      new Date(NOW.getTime() - 4 * 86_400_000),
      evalTranscript(4),
    );
    const { noteId } = await createGenerationAndNote(
      db,
      org.orgId,
      org.patient.patientId,
      org.therapist,
      enc,
      NOW,
    );
    const note = (await therapist({ method: "GET", url: `${base()}/notes/${noteId}` })).json();
    const blank = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/versions`,
      payload: {
        expectedVersionId: note.currentVersionId,
        subjective: "",
        objective: " ",
        assessment: "",
        plan: "",
      },
    });
    expect(blank.statusCode, blank.body).toBe(201);
    const sign = await therapist({
      method: "POST",
      url: `${base()}/notes/${noteId}/sign`,
      payload: { expectedVersionId: blank.json().currentVersionId },
    });
    expect(sign.json().error.code).toBe("note_empty");
  });
});

describe("consent and access", () => {
  it("refuses without ai_assisted_features consent, audits ai.refused and stores nothing (AC-F5)", async () => {
    const o2 = await createOrgFixture(db);
    const enc = await createEncounter(
      db,
      o2.orgId,
      o2.patient.patientId,
      o2.therapist.practitionerId,
      new Date(NOW.getTime() - 86_400_000),
      evalTranscript(2),
    );
    const t = as(app, await login(app, o2.therapist.email));
    for (const [url, payload] of [
      [`/patients/${o2.patient.patientId}/ai/summaries`, {}],
      [`/patients/${o2.patient.patientId}/ai/note-drafts`, { encounterId: enc }],
    ] as const) {
      const res = await t({ method: "POST", url, payload });
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ai_consent_required");
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events).toEqual([
        expect.objectContaining({
          eventName: "ai.refused",
          detailCode: "consent_required",
          patientId: o2.patient.patientId,
        }),
      ]);
    }
    expect(await generationsFor(db, o2.patient.patientId)).toHaveLength(0);
  });

  it("lets a clinician off the care team read but not generate; patients cannot read", async () => {
    const other = as(app, await login(app, org.otherTherapist.email));
    const gen = await other({ method: "POST", url: `${base()}/ai/summaries`, payload: {} });
    expect(gen.statusCode).toBe(403);
    expect(gen.json().error.code).toBe("not_on_care_team");
    expect((await other({ method: "GET", url: `${base()}/ai/generations` })).statusCode).toBe(200);
    const patient = as(app, await login(app, org.patient.email));
    expect((await patient({ method: "GET", url: `${base()}/ai/generations` })).statusCode).toBe(
      403,
    );
  });

  it("rejects a note-draft request for another patient's encounter", async () => {
    const otherEnc = await createEncounter(
      db,
      org.orgId,
      org.otherPatient.patientId,
      org.otherTherapist.practitionerId,
      new Date(NOW.getTime() - 2 * 86_400_000),
      evalTranscript(3),
    );
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/note-drafts`,
      payload: { encounterId: otherEnc },
    });
    expect(res.statusCode).toBe(404);
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toEqual(["security.access_denied"]);
  });

  it("refuses a visit with no transcript", async () => {
    const enc = await createEncounter(
      db,
      org.orgId,
      org.patient.patientId,
      org.therapist.practitionerId,
      new Date(NOW.getTime() - 3 * 86_400_000),
      null,
    );
    const res = await therapist({
      method: "POST",
      url: `${base()}/ai/note-drafts`,
      payload: { encounterId: enc },
    });
    expect(res.json().error.code).toBe("encounter_no_transcript");
  });
});

describe("failure paths (AC-F2, AC-F7)", () => {
  it("stores a failed generation, answers 502 with its location, and regenerates", async () => {
    const failApp = await appWith(failingProvider());
    try {
      const t = as(failApp, await login(failApp, org.therapist.email));
      const res = await t({ method: "POST", url: `${base()}/ai/summaries`, payload: {} });
      expect(res.statusCode).toBe(502);
      expect(res.json().error.code).toBe("ai_generation_failed");
      const id = res.json().error.details[0].issue as string;
      expect(res.headers["location"]).toBe(`${base()}/ai/generations/${id}`);

      const row = await generationRow(db, id);
      expect(row).toMatchObject({ status: "failed", output: null });
      expect(row.error).toMatch(/schema/);
      expect((row.input as { run: { calls: unknown[] } }).run.calls).toHaveLength(3);

      const g = (await t({ method: "GET", url: `${base()}/ai/generations/${id}` })).json();
      expect(g).toMatchObject({
        status: "failed",
        reviewState: "not_reviewable",
        failure: { code: "invalid_output" },
        sections: [],
        approval: { allowed: false, blockers: [] },
        usage: { attempts: 3 },
      });
      const approve = await t({
        method: "POST",
        url: `${base()}/ai/generations/${id}/approve`,
        payload: { revisionId: null },
      });
      expect(approve.json().error.code).toBe("ai_not_reviewable");
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events).toEqual([
        expect.objectContaining({
          eventName: "ai.generate",
          outcome: "minor_failure",
          detailCode: "invalid_output",
        }),
      ]);

      // Try again with the working provider: a new generation linked to the failed one.
      const retry = await therapist({
        method: "POST",
        url: `${base()}/ai/generations/${id}/regenerate`,
        payload: {},
      });
      expect(retry.statusCode, retry.body).toBe(201);
      expect(retry.json()).toMatchObject({ status: "succeeded", previousGenerationId: id });
      const old = (
        await therapist({ method: "GET", url: `${base()}/ai/generations/${id}` })
      ).json();
      expect(old.regeneratedById).toBe(retry.json().id);
    } finally {
      await failApp.close();
    }
  });

  it("times out each attempt, retries twice, then fails recoverably", async () => {
    const hanging: LLMProvider = {
      id: "deterministic",
      label: "Demo provider, rule-based",
      model: null,
      external: false,
      generate: () => new Promise(() => undefined),
    };
    const slow = await appWith(hanging, { timeoutMs: 30 });
    try {
      const t = as(slow, await login(slow, org.therapist.email));
      const res = await t({
        method: "POST",
        url: `${base()}/ai/note-drafts`,
        payload: { encounterId },
      });
      expect(res.statusCode).toBe(502);
      const id = res.json().error.details[0].issue as string;
      const g = (await t({ method: "GET", url: `${base()}/ai/generations/${id}` })).json();
      expect(g.failure.code).toBe("timeout");
      expect(g.usage.attempts).toBe(3);
    } finally {
      await slow.close();
    }
  });

  it("rate limits generations per user and audits the refusal", async () => {
    const limited = await appWith(undefined, { generationsPerMinute: 1 });
    try {
      const t = as(limited, await login(limited, org.therapist.email));
      expect(
        (await t({ method: "POST", url: `${base()}/ai/summaries`, payload: {} })).statusCode,
      ).toBe(201);
      const res = await t({ method: "POST", url: `${base()}/ai/summaries`, payload: {} });
      expect(res.statusCode).toBe(429);
      expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events).toEqual([
        expect.objectContaining({ eventName: "ai.refused", detailCode: "rate_limited" }),
      ]);
    } finally {
      await limited.close();
    }
  });
});

describe("reject and regenerate", () => {
  it("rejects with a reason, then regenerates a linked draft", async () => {
    const g = (
      await therapist({
        method: "POST",
        url: `${base()}/ai/summaries`,
        payload: { windowDays: 30 },
      })
    ).json();
    const noReason = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${g.id}/reject`,
      payload: { reason: "" },
    });
    expect(noReason.statusCode).toBe(400);
    const rej = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${g.id}/reject`,
      payload: { reason: "Window too long for this review." },
    });
    expect(rej.statusCode).toBe(200);
    expect(rej.json()).toMatchObject({
      reviewState: "rejected",
      decision: { decision: "rejected", reason: "Window too long for this review." },
    });
    const regen = await therapist({
      method: "POST",
      url: `${base()}/ai/generations/${g.id}/regenerate`,
      payload: {},
    });
    expect(regen.statusCode).toBe(201);
    expect(regen.json()).toMatchObject({
      previousGenerationId: g.id,
      source: { kind: "progress_window", windowDays: 30 },
      reviewState: "unreviewed",
    });
    const list = (
      await therapist({
        method: "GET",
        url: `${base()}/ai/generations?kind=progress_summary&limit=2`,
      })
    ).json();
    expect(list.items[0].id).toBe(regen.json().id);
    expect(list.items[1]).toMatchObject({
      id: g.id,
      reviewState: "rejected",
      regeneratedById: regen.json().id,
    });
  });
});

describe("SQL evidence resolver mirrors the in-memory reference", () => {
  it("loads every input record with exactly the fields the prompt was built from", async () => {
    const ctx = {
      requestId: "t",
      sessionId: therapistSession.sessionId,
      userId: org.therapist.userId,
      orgId: org.orgId,
      role: "physical_therapist" as const,
      permissions: new Set<never>(),
      patientId: null,
      practitionerId: org.therapist.practitionerId,
    };
    for (const req of [progressRequest(NOW, 30), { kind: "encounter" as const, encounterId }]) {
      const built = await buildInput(db, ctx, org.patient.patientId, req);
      const { INPUT_SCHEMAS } = await import("@carepath/ai");
      const parsed = INPUT_SCHEMAS[built.kind].parse(built.input);
      const records = sourceRecords(built.kind, parsed as never);
      expect(records.length).toBeGreaterThan(0);
      const loaded = await loadSources(db, ctx, records);
      for (const r of records) {
        const l = loaded.get(`${r.type}:${r.id}`);
        expect(l, `${r.type}:${r.id}`).toBeDefined();
        expect(l!.fields).toEqual(r.fields);
        expect(l!.patientId).toBe(r.patientId);
      }
    }
  });
});
