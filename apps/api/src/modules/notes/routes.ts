import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { FastifyRequest } from "fastify";
import {
  clinicalNotePageSchema,
  clinicalNoteSchema,
  createNoteVersionSchema,
  cursorQuerySchema,
  encounterListSchema,
  noteIdParamsSchema,
  patientIdParamsSchema,
  markNoteEnteredInErrorSchema,
  signNoteAmendmentSchema,
  signNoteSchema,
  type ClinicalNote,
  type ClinicalNotePage,
  type ClinicalNoteSummary,
  type EncounterList,
} from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { withTx } from "../../core/db/tx.js";
import { AppError, errorResponses } from "../../core/errors.js";
import { decodeCursor, pageFrom } from "../../core/pagination.js";
import { practitionerRef, userRef } from "../../core/people.js";
import {
  denyOutOfScope,
  recordPhiRead,
  requirePatientRead,
  requirePatientWrite,
} from "../../core/scope/patient-scope.js";
import { encounterType } from "../ai/repo.js";
import {
  findNote,
  insertVersion,
  listEncounters,
  listNotes,
  listVersions,
  lockNote,
  markEnteredInError,
  nextTime,
  isOneSignedPerEncounterViolation,
  signedNoteForEncounter,
  signNote,
  type NoteRow,
} from "./repo.js";

function toSummary(n: NoteRow): ClinicalNoteSummary {
  return {
    id: n.id,
    patientId: n.patientId,
    encounterId: n.encounterId,
    noteType: n.noteType,
    status: n.status,
    author: practitionerRef(n.author),
    signedAt: n.signedAt?.toISOString() ?? null,
    signedBy: n.signedBy ? practitionerRef(n.signedBy) : null,
    currentVersionId: n.currentVersionId,
    currentVersionNumber: n.currentVersion?.versionNumber ?? null,
    startedFromAiDraft: n.versions.some((v) => v.source === "ai_draft"),
    enteredInError: n.enteredInErrorAt
      ? {
          at: n.enteredInErrorAt.toISOString(),
          by: userRef(n.enteredInErrorBy?.user ?? null),
          reason: n.enteredInErrorReason ?? "",
        }
      : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

const isAuthor = (ctx: RequestCtx, n: NoteRow) =>
  ctx.practitionerId !== null &&
  ctx.practitionerId === n.authorPractitionerId &&
  ctx.permissions.has("note.sign");

const allEmpty = (v: { subjective: string; objective: string; assessment: string; plan: string }) =>
  [v.subjective, v.objective, v.assessment, v.plan].every((t) => t.trim() === "");

/** May mark a signed note entered in error: its author, or a holder of the permission (C3 4.3). */
const mayMarkEnteredInError = (ctx: RequestCtx, n: NoteRow) =>
  isAuthor(ctx, n) || ctx.permissions.has("note.mark_entered_in_error");

/**
 * The full note. A caller without `clinical.read` (a clinic administrator marking a note entered
 * in error) gets the header only: no version and no SOAP text (checkpoint C3, ruling 4.3).
 */
async function toNote(db: DbClient, ctx: RequestCtx, n: NoteRow): Promise<ClinicalNote> {
  const readsText = ctx.permissions.has("clinical.read");
  const versions = readsText
    ? (await listVersions(db, ctx, n.id)).map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        subjective: v.subjective,
        objective: v.objective,
        assessment: v.assessment,
        plan: v.plan,
        source: v.source,
        aiGenerationId: v.aiGenerationId,
        isAmendment: v.isAmendment,
        amendmentReason: v.amendmentReason,
        createdBy: userRef(v.createdBy.user),
        createdAt: v.createdAt.toISOString(),
      }))
    : [];
  return {
    ...toSummary(n),
    currentVersion: versions.find((v) => v.id === n.currentVersionId) ?? null,
    versions,
    canSign: isAuthor(ctx, n) && n.status === "draft",
    canAmend: isAuthor(ctx, n) && n.status === "signed",
    canMarkEnteredInError: n.status === "signed" && mayMarkEnteredInError(ctx, n),
  };
}

/**
 * Encounters and clinical notes (WP 5.2). A note started from an AI draft is created by
 * approving the draft (`/ai/generations/:id/approve`); it is a clinician-authored draft until its
 * author signs it here. Versions are append-only; a signed note takes amendments only.
 */
export const noteRoutes: FastifyPluginAsyncZod = async (app) => {
  const { db, config, now } = app.deps;
  const rateLimit = { max: config.ai.routesPerMinute, timeWindow: 60_000 };

  async function requireNote(
    request: FastifyRequest,
    ctx: RequestCtx,
    patientId: string,
    noteId: string,
  ) {
    const n = await findNote(db, ctx, patientId, noteId);
    if (!n) return denyOutOfScope(request, "ClinicalNote", noteId, patientId);
    return n;
  }

  app.get(
    "/patients/:patientId/encounters",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "listEncounters",
        tags: ["notes"],
        summary:
          "Visits that took place, newest first, with whether a synthetic transcript exists and the notes written for each.",
        params: patientIdParamsSchema,
        response: { 200: encounterListSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<EncounterList> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const rows = await listEncounters(db, ctx, patientId);
      await recordPhiRead(request, patientId, "Encounter", patientId);
      return {
        items: rows.map((e) => ({
          id: e.id,
          type: encounterType(e.typeCode),
          class: e.class,
          status: e.status,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString() ?? null,
          practitioner: practitionerRef(e.practitioner),
          hasTranscript: !!e.transcript && e.transcript.trim().length > 0,
          noteIds: e.clinicalNotes.map((n) => n.id),
        })),
      };
    },
  );

  app.get(
    "/patients/:patientId/notes",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "listClinicalNotes",
        tags: ["notes"],
        summary: "Clinical notes of a patient, newest first, drafts and signed.",
        params: patientIdParamsSchema,
        querystring: cursorQuerySchema,
        response: { 200: clinicalNotePageSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<ClinicalNotePage> => {
      const { patientId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const offset = decodeCursor(request.query.cursor);
      const rows = await listNotes(db, ctx, patientId, offset, request.query.limit + 1);
      const page = pageFrom(rows, offset, request.query.limit);
      await recordPhiRead(request, patientId, "ClinicalNote", patientId);
      return { items: page.items.map(toSummary), nextCursor: page.nextCursor };
    },
  );

  app.get(
    "/patients/:patientId/notes/:noteId",
    {
      config: { access: { permission: "clinical.read" } },
      schema: {
        operationId: "getClinicalNote",
        tags: ["notes"],
        summary: "One clinical note with every version, oldest first.",
        params: noteIdParamsSchema,
        response: { 200: clinicalNoteSchema, ...errorResponses(400, 401, 403, 404, 429) },
      },
    },
    async (request): Promise<ClinicalNote> => {
      const { patientId, noteId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const n = await requireNote(request, ctx, patientId, noteId);
      await recordPhiRead(request, patientId, "ClinicalNote", n.id);
      return toNote(db, ctx, n);
    },
  );

  app.post(
    "/patients/:patientId/notes/:noteId/versions",
    {
      config: { access: { permission: "note.write" }, rateLimit },
      schema: {
        operationId: "createClinicalNoteVersion",
        tags: ["notes"],
        summary:
          "Append a working version to a draft note, by its author. Earlier versions are never changed. Signed notes take amendments only (amendments route).",
        params: noteIdParamsSchema,
        body: createNoteVersionSchema,
        response: { 201: clinicalNoteSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId, noteId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const n = await requireNote(request, ctx, patientId, noteId);
      if (ctx.practitionerId !== n.authorPractitionerId) throw new AppError("not_note_author");
      const body = request.body;
      // A signed note takes amendments only, and those are signed in one call (CR-8).
      if (n.status !== "draft") throw new AppError("invalid_transition");
      await withTx(request, async ({ tx, audit }) => {
        await lockNote(tx, ctx, n.id);
        const fresh = (await findNote(tx, ctx, patientId, n.id))!;
        if (fresh.currentVersionId !== body.expectedVersionId) throw new AppError("draft_stale");
        if (fresh.status !== n.status) throw new AppError("draft_stale");
        const versionId = await insertVersion(tx, ctx, {
          noteId: n.id,
          // Versions are numbered 1..n without gaps (ClinicalNoteVersion_next_number).
          versionNumber: fresh.versions.length + 1,
          subjective: body.subjective,
          objective: body.objective,
          assessment: body.assessment,
          plan: body.plan,
          amendmentReason: null,
          at: nextTime(fresh.updatedAt, now()),
        });
        await audit({
          eventName: "note.version",
          action: "C",
          outcome: "success",
          resourceType: "ClinicalNote",
          resourceId: n.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "draft_version",
          metadata: { versionId },
        });
      });
      return reply
        .code(201)
        .send(await toNote(db, ctx, (await findNote(db, ctx, patientId, n.id))!));
    },
  );

  app.post(
    "/patients/:patientId/notes/:noteId/sign",
    {
      config: { access: { permission: "note.sign" }, rateLimit },
      schema: {
        operationId: "signClinicalNote",
        tags: ["notes"],
        summary:
          "The author signs the version they read. The only way a note becomes signed; approval of a generated draft never signs. A visit has at most one signed note: signing a second answers 409 encounter_already_documented until the first is marked entered in error.",
        params: noteIdParamsSchema,
        body: signNoteSchema,
        response: { 200: clinicalNoteSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request): Promise<ClinicalNote> => {
      const { patientId, noteId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const n = await requireNote(request, ctx, patientId, noteId);
      if (!ctx.practitionerId || ctx.practitionerId !== n.authorPractitionerId)
        throw new AppError("not_note_author");
      await withTx(request, async ({ tx, audit }) => {
        await lockNote(tx, ctx, n.id);
        const fresh = (await findNote(tx, ctx, patientId, n.id))!;
        if (fresh.status !== "draft") throw new AppError("invalid_transition");
        if (fresh.currentVersionId !== request.body.expectedVersionId)
          throw new AppError("draft_stale");
        const current = (await listVersions(tx, ctx, n.id)).find(
          (v) => v.id === fresh.currentVersionId,
        );
        // CR-8 (demo rule): empty sections warn in the UI; all four empty cannot be signed.
        if (!current || allEmpty(current)) throw new AppError("note_empty");
        // C3 B4: one signed note per encounter. The check gives the readable error; the partial
        // unique index ClinicalNote_one_signed_per_encounter_key is the guarantee under a race.
        if (fresh.encounterId && (await signedNoteForEncounter(tx, ctx, fresh.encounterId, n.id)))
          throw new AppError("encounter_already_documented");
        try {
          await signNote(tx, ctx, {
            noteId: n.id,
            practitionerId: ctx.practitionerId!,
            at: nextTime(fresh.updatedAt, now()),
          });
        } catch (err) {
          if (isOneSignedPerEncounterViolation(err))
            throw new AppError("encounter_already_documented");
          throw err;
        }
        await audit({
          eventName: "note.sign",
          action: "U",
          outcome: "success",
          resourceType: "ClinicalNote",
          resourceId: n.id,
          patientId,
          purposeOfUse: "treatment",
          metadata: { versionId: request.body.expectedVersionId },
        });
      });
      return toNote(db, ctx, (await findNote(db, ctx, patientId, n.id))!);
    },
  );

  app.post(
    "/patients/:patientId/notes/:noteId/amendments",
    {
      config: { access: { permission: "note.sign" }, rateLimit },
      schema: {
        operationId: "signClinicalNoteAmendment",
        tags: ["notes"],
        summary:
          "Amend a signed note: the author creates and signs the amendment in one call, with a reason (CR-8, demo rule). The current version of a signed note is always signed.",
        params: noteIdParamsSchema,
        body: signNoteAmendmentSchema,
        response: { 201: clinicalNoteSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request, reply) => {
      const { patientId, noteId } = request.params;
      const ctx = await requirePatientWrite(request, patientId, { careTeamOnly: true });
      const n = await requireNote(request, ctx, patientId, noteId);
      if (!isAuthor(ctx, n)) throw new AppError("not_note_author");
      const body = request.body;
      if (allEmpty(body)) throw new AppError("note_empty");
      await withTx(request, async ({ tx, audit }) => {
        await lockNote(tx, ctx, n.id);
        const fresh = (await findNote(tx, ctx, patientId, n.id))!;
        if (fresh.status !== "signed") throw new AppError("invalid_transition");
        if (fresh.currentVersionId !== body.expectedVersionId) throw new AppError("draft_stale");
        const versionId = await insertVersion(tx, ctx, {
          noteId: n.id,
          versionNumber: fresh.versions.length + 1,
          subjective: body.subjective,
          objective: body.objective,
          assessment: body.assessment,
          plan: body.plan,
          amendmentReason: body.reason,
          at: nextTime(fresh.updatedAt, now()),
        });
        await audit({
          eventName: "note.sign",
          action: "U",
          outcome: "success",
          resourceType: "ClinicalNote",
          resourceId: n.id,
          patientId,
          purposeOfUse: "treatment",
          detailCode: "amendment",
          metadata: { versionId },
        });
      });
      return reply
        .code(201)
        .send(await toNote(db, ctx, (await findNote(db, ctx, patientId, n.id))!));
    },
  );

  app.post(
    "/patients/:patientId/notes/:noteId/entered-in-error",
    {
      // The author (note.sign) or a holder of note.mark_entered_in_error (clinic administrators,
      // checkpoint C3 ruling 4.3). The handler decides by permission, never by role name.
      config: {
        access: { permission: ["note.sign", "note.mark_entered_in_error"] },
        rateLimit,
      },
      schema: {
        operationId: "markClinicalNoteEnteredInError",
        tags: ["notes"],
        summary:
          "Mark a signed note entered in error, with a reason, by its author or a holder of note.mark_entered_in_error (CR-8, CR-18, demo rule). Irreversible. The note leaves the FHIR export and the visit may be documented by a new signed note. A caller without clinical.read gets the note header only, with no versions and no text.",
        params: noteIdParamsSchema,
        body: markNoteEnteredInErrorSchema,
        response: { 200: clinicalNoteSchema, ...errorResponses(400, 401, 403, 404, 409, 429) },
      },
    },
    async (request): Promise<ClinicalNote> => {
      const { patientId, noteId } = request.params;
      const ctx = await requirePatientRead(request, patientId);
      const n = await requireNote(request, ctx, patientId, noteId);
      const asAuthor = isAuthor(ctx, n);
      if (!asAuthor && !ctx.permissions.has("note.mark_entered_in_error"))
        throw new AppError("not_note_author");
      await withTx(request, async ({ tx, audit }) => {
        await lockNote(tx, ctx, n.id);
        const fresh = (await findNote(tx, ctx, patientId, n.id))!;
        if (fresh.status !== "signed") throw new AppError("invalid_transition");
        await markEnteredInError(tx, ctx, {
          noteId: n.id,
          reason: request.body.reason,
          at: nextTime(fresh.updatedAt, now()),
        });
        await audit({
          eventName: "note.entered_in_error",
          action: "U",
          outcome: "success",
          resourceType: "ClinicalNote",
          resourceId: n.id,
          patientId,
          purposeOfUse: asAuthor ? "treatment" : "operations",
          detailCode: asAuthor ? "author" : "mark_entered_in_error_permission",
        });
      });
      return toNote(db, ctx, (await findNote(db, ctx, patientId, n.id))!);
    },
  );
};
