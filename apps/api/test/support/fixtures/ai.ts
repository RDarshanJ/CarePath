/**
 * Fixtures for the WP 5.2 AI and note tests, written straight to Postgres (a repo.ts-style
 * fixture file). Transcripts come from the reviewed synthetic evaluation cases in
 * packages/ai/evals/data, rendered one turn per line as `Encounter.transcript` stores them.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "../../../src/core/db/repo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const evalData = path.resolve(here, "../../../../../packages/ai/evals/data");

/** A synthetic evaluation transcript as `Encounter.transcript` text ("Clinician: ..."). */
export function evalTranscript(caseNumber: number): string {
  const file = path.join(evalData, `case-${String(caseNumber).padStart(2, "0")}.json`);
  const c = JSON.parse(readFileSync(file, "utf8")) as {
    transcript: { speaker: string; text: string }[];
  };
  const who = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return c.transcript.map((t) => `${who(t.speaker)}: ${t.text}`).join("\n");
}

export async function grantAiConsent(db: Db, orgId: string, patientId: string): Promise<string> {
  const row = await db.consent.create({
    data: {
      organizationId: orgId,
      patientId,
      type: "ai_assisted_features",
      status: "active",
      policyVersion: "2026-11-01",
      policyUri: "/consent/ai_assisted_features/2026-11-01",
    },
    select: { id: true },
  });
  return row.id;
}

export async function revokeConsent(db: Db, consentId: string, at: Date): Promise<void> {
  await db.consent.update({
    where: { id: consentId },
    data: { status: "inactive", revokedAt: at },
  });
}

export async function createEncounter(
  db: Db,
  orgId: string,
  patientId: string,
  practitionerId: string,
  startedAt: Date,
  transcript: string | null,
): Promise<string> {
  const row = await db.encounter.create({
    data: {
      organizationId: orgId,
      patientId,
      practitionerId,
      class: "AMB",
      typeCode: "PT-FOLLOW-UP",
      typeDisplay: "Physical therapy follow-up visit",
      status: "finished",
      startedAt,
      endedAt: new Date(startedAt.getTime() + 45 * 60_000),
      transcript,
    },
    select: { id: true },
  });
  return row.id;
}

/** A succeeded generation and a draft note for a patient, without going through the API. */
export async function createGenerationAndNote(
  db: Db,
  orgId: string,
  patientId: string,
  therapist: { userId: string; practitionerId: string },
  encounterId: string,
  at: Date,
): Promise<{ generationId: string; noteId: string }> {
  const draft = {
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
  };
  const g = await db.aIGeneration.create({
    data: {
      organizationId: orgId,
      patientId,
      kind: "note_draft",
      provider: "deterministic",
      providerLabel: "Demo provider, rule-based",
      promptKey: "note_draft",
      promptVersion: "fixture",
      status: "succeeded",
      input: {
        schema: "carepath.ai.generation-input.v1",
        request: { kind: "encounter", encounterId },
        inputRefs: [],
        run: { calls: [], costLabel: "fixture", errorCode: null },
      },
      output: { schema: "carepath.ai.generation-output.v1", draft, verification: null },
      requestedByUserId: therapist.userId,
      createdAt: at,
      completedAt: at,
    },
    select: { id: true },
  });
  const note = await db.clinicalNote.create({
    data: {
      organizationId: orgId,
      patientId,
      encounterId,
      authorPractitionerId: therapist.practitionerId,
    },
    select: { id: true },
  });
  const v = await db.clinicalNoteVersion.create({
    data: {
      organizationId: orgId,
      noteId: note.id,
      versionNumber: 1,
      subjective: "Fixture.",
      objective: "",
      assessment: "",
      plan: "",
      source: "ai_draft",
      aiGenerationId: g.id,
      createdByUserId: therapist.userId,
    },
    select: { id: true },
  });
  await db.clinicalNote.update({ where: { id: note.id }, data: { currentVersionId: v.id } });
  return { generationId: g.id, noteId: note.id };
}

export async function generationRow(db: Db, id: string) {
  return db.aIGeneration.findUniqueOrThrow({ where: { id } });
}

export async function reviewRows(db: Db, generationId: string) {
  return db.aIReview.findMany({ where: { generationId }, orderBy: { createdAt: "asc" } });
}

export async function noteRows(db: Db, patientId: string) {
  return db.clinicalNote.findMany({
    where: { patientId },
    include: { versions: { orderBy: { versionNumber: "asc" } } },
  });
}

export async function generationsFor(db: Db, patientId: string) {
  return db.aIGeneration.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } });
}

export async function eventsFor(db: Db, orgId: string, eventName: string) {
  return db.auditEvent.findMany({
    where: { organizationId: orgId, eventName },
    orderBy: { occurredAt: "asc" },
  });
}

export async function tryUpdateGeneration(db: Db, id: string) {
  return db.aIGeneration.update({ where: { id }, data: { error: "changed" } });
}
