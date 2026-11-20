import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { OpenAPIV3_1 } from "openapi-types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { envelope } from "@carepath/shared/contracts";
import { as, login, testApp, type Session } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { createClinicalFixture, type ClinicalFixture } from "../support/fixtures/repo.js";
import { createConversation } from "../support/fixtures/messaging.js";
import { createSlots } from "../support/scheduling/repo.js";
import { createEncounter, createGenerationAndNote } from "../support/fixtures/ai.js";

/**
 * Checkpoint C1, M8 (hard gate for WP 3.1), AC-I1, AC-I2.
 *
 * Reads the OpenAPI document of the real app and calls every operation that has an id in its
 * path:
 *   1. with an organization B session and organization A ids: 404 with a security event (or 403
 *      `forbidden` when the role lacks the route permission); at least one B role must reach the
 *      scope check, so every route is scope-tested;
 *   2. as patient 2 with patient 1's ids, same organization: 404 or 403 `forbidden`, never 2xx;
 *   3. with patient 1's id and child ids (session, activity, check-in, task, version, consent,
 *      appointment)
 *      that belong to patient 2: 404 with a security event for at least one role, never 2xx.
 * A path parameter without a fixture, or a request body without one, fails the test, so a new
 * route cannot slip through unenumerated. Routes without path ids are checked to leak no
 * organization A id to organization B.
 */
const NOW = new Date("2026-11-19T16:00:00Z");
const db = createTestDb();
let app: FastifyInstance;
let doc: OpenAPIV3_1.Document;
let orgA: OrgFixture;
let orgB: OrgFixture;
let fxA: ClinicalFixture;

/** Ids of patient 1 (orgA.patient) and of patient 2 (orgA.otherPatient), same organization. */
type Ids = Record<string, string>;
let p1: Ids;
let p2: Ids;
let notFoundBody: string;

const methods = ["get", "post", "put", "patch", "delete"] as const;

/** A valid body per operation (validation runs before scope, so it must pass the schema). */
function bodyFor(ids: Ids): Record<string, unknown> {
  const item = {
    exerciseId: fxA.exerciseIds[0],
    position: 0,
    dose: { sets: 1, reps: 5, holdSeconds: null, durationSeconds: null, restSeconds: 30 },
    schedule: { daysOfWeek: [1], timesPerDay: 1 },
    instructions: null,
  };
  return {
    "POST /patients/{patientId}/care-plan/versions/{versionId}/acknowledge": {},
    "PUT /patients/{patientId}/care-plan/draft": {
      title: "Probe",
      instructions: "",
      items: [item],
      goals: [],
      expectedUpdatedAt: null,
    },
    "POST /patients/{patientId}/care-plan/publish": {
      changeNoteForPatient: "probe",
      expectedUpdatedAt: NOW.toISOString(),
    },
    "POST /patients/{patientId}/sessions": {},
    "POST /patients/{patientId}/sessions/{sessionId}/pause": {
      currentPosition: 0,
      elapsedSeconds: 1,
    },
    "POST /patients/{patientId}/sessions/{sessionId}/resume": {},
    "PUT /patients/{patientId}/sessions/{sessionId}/activities/{activityId}": {
      status: "skipped",
      skipReason: "probe",
    },
    "POST /patients/{patientId}/sessions/{sessionId}/stop": {
      activityId: ids["activityId"],
      discomfortLevel: 5,
    },
    "POST /patients/{patientId}/sessions/{sessionId}/complete": {
      currentPosition: 0,
      elapsedSeconds: 1,
    },
    "POST /patients/{patientId}/check-ins": { sessionId: null, painScore: 1 },
    "POST /patients/{patientId}/check-ins/{checkInId}/review": {},
    "POST /patients/{patientId}/review-tasks/{taskId}/assign": { practitionerId: null },
    "POST /patients/{patientId}/review-tasks/{taskId}/resolve": { note: "probe" },
    "POST /patients/{patientId}/review-tasks/{taskId}/dismiss": { note: "probe" },
    "PUT /review-rules/{ruleId}": { enabled: true, params: { threshold: 7 } },
    "PUT /patients/{patientId}/intake/steps/{step}": { answers: { goal: "probe" } },
    "POST /patients/{patientId}/intake/submit": {},
    "POST /patients/{patientId}/consents": {
      type: "ai_assisted_features",
      textVersion: "2026-11-01",
    },
    "POST /patients/{patientId}/consents/{consentId}/revoke": {},
    "POST /conversations/{conversationId}/messages": { body: "probe" },
    "POST /conversations/{conversationId}/read": {},
    "POST /conversations/{conversationId}/messages/{messageId}/retry": {},
    "POST /patients/{patientId}/care-team/assignments": {
      practitionerId: orgA.therapist.practitionerId,
    },
    // WP 4.1 scheduling.
    "POST /patients/{patientId}/appointments": { slotId: ids["slotId"], type: "follow_up" },
    "POST /patients/{patientId}/appointments/{appointmentId}/cancel": { reason: "probe" },
    "POST /patients/{patientId}/appointments/{appointmentId}/reschedule": {
      slotId: ids["slotId"],
    },
    // WP 5.2 AI and notes.
    "POST /patients/{patientId}/ai/summaries": {},
    "POST /patients/{patientId}/ai/note-drafts": { encounterId: ids["encounterId"] },
    "POST /patients/{patientId}/ai/generations/{generationId}/revisions": {
      baseRevisionId: null,
      changes: [{ action: "remove", statementId: "s1" }],
    },
    "POST /patients/{patientId}/ai/generations/{generationId}/evidence-opens": {
      statementId: "s1",
      sourceType: "check_in",
      sourceId: ids["sourceId"],
    },
    "POST /patients/{patientId}/ai/generations/{generationId}/approve": { revisionId: null },
    "POST /patients/{patientId}/ai/generations/{generationId}/reject": { reason: "probe" },
    "POST /patients/{patientId}/ai/generations/{generationId}/regenerate": {},
    "POST /patients/{patientId}/notes/{noteId}/versions": {
      expectedVersionId: ids["noteId"],
      subjective: "probe",
      objective: "",
      assessment: "",
      plan: "",
    },
    "POST /patients/{patientId}/notes/{noteId}/sign": { expectedVersionId: ids["noteId"] },
    "POST /patients/{patientId}/notes/{noteId}/amendments": {
      expectedVersionId: ids["noteId"],
      subjective: "probe",
      objective: "",
      assessment: "",
      plan: "",
      reason: "probe",
    },
    "POST /patients/{patientId}/notes/{noteId}/entered-in-error": { reason: "probe" },
  };
}

interface Op {
  key: string;
  method: (typeof methods)[number];
  path: string;
  params: string[];
  hasBody: boolean;
}

function operations(): Op[] {
  return Object.entries(doc.paths ?? {}).flatMap(([path, item]) =>
    methods.flatMap((method) => {
      const op = item?.[method];
      if (!op) return [];
      return [
        {
          key: `${method.toUpperCase()} ${path}`,
          method,
          path,
          params: [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!),
          hasBody: op.requestBody !== undefined,
        },
      ];
    }),
  );
}

/** Builds the URL and body; throws when a fixture is missing (the route fails the test). */
function request(op: Op, ids: Ids) {
  let url = op.path;
  for (const p of op.params) {
    const value = ids[p];
    if (!value) throw new Error(`${op.key}: no fixture for path parameter {${p}}`);
    url = url.replace(`{${p}}`, value);
  }
  let payload: Record<string, unknown> | undefined;
  if (op.hasBody) {
    const bodies = bodyFor(ids);
    if (!(op.key in bodies)) throw new Error(`${op.key}: no request body fixture`);
    payload = bodies[op.key] as Record<string, unknown>;
  }
  return { method: op.method.toUpperCase() as "GET", url, payload };
}

async function denied(res: LightMyRequestResponse): Promise<"scoped" | "forbidden" | "other"> {
  if (res.statusCode === 403 && res.json().error.code === "forbidden") return "forbidden";
  if (res.statusCode !== 404) return "other";
  const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
  const scoped =
    res.body === notFoundBody && events.some((e) => e.eventName === "security.access_denied");
  return scoped ? "scoped" : "other";
}

const roles = ["patient", "therapist", "coordinator", "admin"] as const;
function email(org: OrgFixture, role: (typeof roles)[number]) {
  return {
    patient: org.patient,
    therapist: org.therapist,
    coordinator: org.coordinator,
    admin: org.admin,
  }[role].email;
}

beforeAll(async () => {
  app = await testApp(db, { now: () => NOW });
  doc = app.swagger() as OpenAPIV3_1.Document;
  orgA = await createOrgFixture(db);
  orgB = await createOrgFixture(db);
  fxA = await createClinicalFixture(db, orgA, NOW);
  await createClinicalFixture(db, orgB, NOW);
  // The byte-identical body of a missing record (AC-I6).
  notFoundBody = JSON.stringify(envelope("not_found"));

  // Open slots of orgA.therapist: one booked per patient below, one left open for body fixtures.
  const day = 86_400_000;
  const slotIds = await createSlots(db, orgA.orgId, orgA.therapist.practitionerId, [
    new Date(NOW.getTime() + 3 * day),
    new Date(NOW.getTime() + 4 * day),
    new Date(NOW.getTime() + 5 * day),
  ]);
  let nextSlot = 0;

  // Real child rows for both patients, made through the API.
  async function children(
    patientEmail: string,
    patientId: string,
    userIds: string[],
  ): Promise<Ids> {
    const s = as(app, await login(app, patientEmail));
    // Patient 1 books with their care-team therapist; patient 2 has no care team, so the
    // coordinator books for them.
    const booker =
      patientId === orgA.patient.patientId ? s : as(app, await login(app, orgA.coordinator.email));
    const appointment = (
      await booker({
        method: "POST",
        url: `/patients/${patientId}/appointments`,
        payload: { slotId: slotIds[nextSlot++], type: "follow_up" },
      })
    ).json();
    const base = `/patients/${patientId}`;
    const session = (await s({ method: "POST", url: `${base}/sessions`, payload: {} })).json();
    const checkIn = (
      await s({
        method: "POST",
        url: `${base}/check-ins`,
        payload: { sessionId: null, painScore: 9 },
      })
    ).json();
    const consent = (
      await s({
        method: "POST",
        url: `${base}/consents`,
        payload: { type: "treatment_and_data_use", textVersion: "2026-11-01" },
      })
    ).json();
    const therapist = as(app, await login(app, orgA.therapist.email));
    const tasks = (await therapist({ method: "GET", url: `${base}/review-tasks` })).json();
    const versions = (await therapist({ method: "GET", url: `${base}/care-plan/versions` })).json();
    // WP 4.2: a conversation of this patient with one message, for the {conversationId} routes.
    const conversationId = await createConversation(db, orgA, { patientId, userIds });
    const message = (
      await s({
        method: "POST",
        url: `/conversations/${conversationId}/messages`,
        payload: { body: "fixture" },
      })
    ).json();
    // WP 5.2: an encounter, an AI generation and a draft note of this patient.
    const author = patientId === orgA.patient.patientId ? orgA.therapist : orgA.otherTherapist;
    const encounterId = await createEncounter(
      db,
      orgA.orgId,
      patientId,
      author.practitionerId,
      new Date(NOW.getTime() - day),
      "Clinician: How is the knee?\nPatient: Better, about 3 out of 10.",
    );
    const ai = await createGenerationAndNote(db, orgA.orgId, patientId, author, encounterId, NOW);
    const ids = {
      patientId,
      conversationId,
      encounterId,
      generationId: ai.generationId,
      noteId: ai.noteId,
      sourceType: "check_in",
      sourceId: checkIn.checkIn?.id,
      messageId: message.id,
      sessionId: session.id,
      activityId: session.activities?.[0]?.id,
      checkInId: checkIn.checkIn?.id,
      taskId: tasks.items?.[0]?.id,
      versionId: versions.items?.[0]?.id,
      consentId: consent.id,
      ruleId: fxA.ruleIds["reported_pain"]!,
      step: "primary_goal",
      appointmentId: appointment.id,
      practitionerId: orgA.therapist.practitionerId,
      slotId: slotIds[2]!,
    };
    for (const [k, v] of Object.entries(ids)) {
      if (!v) throw new Error(`fixture ${k} missing for ${patientEmail}`);
    }
    return ids;
  }
  p1 = await children(orgA.patient.email, orgA.patient.patientId, [
    orgA.patient.userId,
    orgA.therapist.userId,
  ]);
  p2 = await children(orgA.otherPatient.email, orgA.otherPatient.patientId, [
    orgA.otherPatient.userId,
    orgA.otherTherapist.userId,
  ]);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("M8: OpenAPI enumeration of tenant-scoped routes", () => {
  it("covers a known set of routes, each with fixtures", () => {
    const scoped = operations().filter((o) => o.params.length > 0);
    expect(scoped.length).toBeGreaterThanOrEqual(39);
    for (const op of scoped) expect(() => request(op, p1)).not.toThrow();
  });

  it("answers 404 with a security event to organization B for every organization A id (AC-I1)", async () => {
    const sessions: Record<string, Session> = {};
    for (const r of roles) sessions[r] = await login(app, email(orgB, r));
    const problems: string[] = [];
    let checked = 0;
    for (const op of operations().filter((o) => o.params.length > 0)) {
      const outcomes: string[] = [];
      for (const r of roles) {
        const res = await as(app, sessions[r]!)(request(op, p1));
        const outcome = await denied(res);
        outcomes.push(outcome);
        if (outcome === "other")
          problems.push(`${op.key} as B ${r}: ${res.statusCode} ${res.body.slice(0, 120)}`);
      }
      if (!outcomes.includes("scoped"))
        problems.push(`${op.key}: no organization B role reached the scope check`);
      checked += 1;
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(39);
  });

  it("answers 404 or 403 to patient 2 for patient 1's ids (AC-I2)", async () => {
    const s = await login(app, orgA.otherPatient.email);
    const problems: string[] = [];
    // Conversation routes carry no patient id; patient 2 must still be refused patient 1's thread.
    for (const op of operations().filter(
      (o) => o.params.includes("patientId") || o.params.includes("conversationId"),
    )) {
      const res = await as(app, s)(request(op, p1));
      const outcome = await denied(res);
      if (outcome === "other")
        problems.push(`${op.key}: ${res.statusCode} ${res.body.slice(0, 120)}`);
    }
    expect(problems).toEqual([]);
  });

  it("finds child ids only under their own patient", async () => {
    const sessions: Record<string, Session> = {};
    for (const r of roles) sessions[r] = await login(app, email(orgA, r));
    const childParams = [
      "sessionId",
      "activityId",
      "checkInId",
      "taskId",
      "versionId",
      "consentId",
      "appointmentId",
      "generationId",
      "noteId",
      "sourceId",
    ];
    // Patient 1's path with patient 2's child ids.
    const mixed: Ids = { ...p2, patientId: p1.patientId! };
    const problems: string[] = [];
    for (const op of operations().filter((o) => o.params.some((p) => childParams.includes(p)))) {
      const outcomes: string[] = [];
      for (const r of roles) {
        const res = await as(app, sessions[r]!)(request(op, mixed));
        const outcome = await denied(res);
        outcomes.push(outcome);
        if (outcome === "other")
          problems.push(`${op.key} as A ${r}: ${res.statusCode} ${res.body.slice(0, 120)}`);
      }
      if (!outcomes.includes("scoped"))
        problems.push(`${op.key}: no role reached the child scope check`);
    }
    expect(problems).toEqual([]);
  });

  it("leaks no organization A id through routes without path ids", async () => {
    const sessions: Record<string, Session> = {};
    for (const r of roles) sessions[r] = await login(app, email(orgB, r));
    const secrets = [
      orgA.patient.patientId,
      orgA.otherPatient.patientId,
      ...Object.values(p1),
      ...Object.values(p2),
    ].filter((v) => v !== "primary_goal" && v !== "check_in" && v !== fxA.ruleIds["reported_pain"]);
    const problems: string[] = [];
    for (const op of operations().filter((o) => o.params.length === 0 && o.method === "get")) {
      for (const r of roles) {
        const res = await as(app, sessions[r]!)({ method: "GET", url: op.path });
        for (const id of secrets) {
          if (res.body.includes(id)) problems.push(`${op.key} as B ${r} leaks ${id}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
