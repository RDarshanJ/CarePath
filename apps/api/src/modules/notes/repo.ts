/**
 * Encounters and clinical notes (WP 5.2). Notes are a header plus append-only versions; the
 * database enforces version numbering, amendment rules, signer = author and the frozen signed
 * header (constraints and phase3_alignment migrations).
 */
import type { Prisma } from "@carepath/db/client";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient, DbTx } from "../../core/db/repo.js";

type Org = Pick<RequestCtx, "orgId">;

const practitionerSelect = {
  id: true,
  userId: true,
  givenName: true,
  familyName: true,
  credentials: true,
} as const;

export async function listEncounters(db: DbClient, ctx: Org, patientId: string) {
  return db.encounter.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      typeCode: true,
      class: true,
      status: true,
      startedAt: true,
      endedAt: true,
      transcript: true,
      practitioner: { select: practitionerSelect },
      clinicalNotes: { select: { id: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
}

const userSelect = {
  id: true,
  displayName: true,
  practitioner: { select: { id: true } },
} as const;

const versionSelect = {
  id: true,
  versionNumber: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  source: true,
  aiGenerationId: true,
  isAmendment: true,
  amendmentReason: true,
  createdAt: true,
  createdBy: { select: { user: { select: userSelect } } },
} as const;

const noteSelect = {
  id: true,
  patientId: true,
  encounterId: true,
  noteType: true,
  status: true,
  authorPractitionerId: true,
  signedAt: true,
  enteredInErrorAt: true,
  enteredInErrorReason: true,
  enteredInErrorBy: { select: { user: { select: userSelect } } },
  currentVersionId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: practitionerSelect },
  signedBy: { select: practitionerSelect },
  currentVersion: { select: { versionNumber: true } },
  versions: { select: { source: true } },
} as const;

export type NoteRow = Prisma.ClinicalNoteGetPayload<{ select: typeof noteSelect }>;
export type VersionRow = Prisma.ClinicalNoteVersionGetPayload<{ select: typeof versionSelect }>;

export async function listNotes(
  db: DbClient,
  ctx: Org,
  patientId: string,
  offset: number,
  take: number,
): Promise<NoteRow[]> {
  return db.clinicalNote.findMany({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: noteSelect,
  });
}

export async function findNote(
  db: DbClient,
  ctx: Org,
  patientId: string,
  noteId: string,
): Promise<NoteRow | null> {
  return db.clinicalNote.findFirst({
    where: { id: noteId, organizationId: ctx.orgId, patientId },
    select: noteSelect,
  });
}

export async function listVersions(db: DbClient, ctx: Org, noteId: string): Promise<VersionRow[]> {
  return db.clinicalNoteVersion.findMany({
    where: { organizationId: ctx.orgId, noteId },
    orderBy: { versionNumber: "asc" },
    select: versionSelect,
  });
}

export async function lockNote(tx: DbTx, ctx: Org, noteId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "ClinicalNote" WHERE id = ${noteId}::uuid AND "organizationId" = ${ctx.orgId}::uuid FOR UPDATE`;
}

export async function insertVersion(
  tx: DbTx,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  v: {
    noteId: string;
    versionNumber: number;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    amendmentReason: string | null;
    at: Date;
  },
): Promise<string> {
  // A new version moves the note's current version; for a signed note this is an amendment.
  const row = await tx.clinicalNoteVersion.create({
    data: {
      organizationId: ctx.orgId,
      noteId: v.noteId,
      versionNumber: v.versionNumber,
      subjective: v.subjective,
      objective: v.objective,
      assessment: v.assessment,
      plan: v.plan,
      source: "clinician",
      isAmendment: v.amendmentReason !== null,
      amendmentReason: v.amendmentReason,
      createdByUserId: ctx.userId,
      createdAt: v.at,
    },
    select: { id: true },
  });
  await tx.clinicalNote.update({
    where: { id: v.noteId },
    data: { currentVersionId: row.id, updatedAt: v.at },
  });
  return row.id;
}

export async function signNote(
  tx: DbTx,
  ctx: Org,
  n: { noteId: string; practitionerId: string; at: Date },
): Promise<void> {
  await tx.clinicalNote.update({
    where: { id: n.noteId, organizationId: ctx.orgId },
    data: {
      status: "signed",
      signedAt: n.at,
      signedByPractitionerId: n.practitionerId,
      updatedAt: n.at,
    },
  });
}

/** Version times strictly after the note's last change, so history order holds under a fixed clock. */
export function nextTime(last: Date, now: Date): Date {
  return now > last ? now : new Date(last.getTime() + 1);
}

export async function markEnteredInError(
  tx: DbTx,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  n: { noteId: string; reason: string; at: Date },
): Promise<void> {
  await tx.clinicalNote.update({
    where: { id: n.noteId, organizationId: ctx.orgId },
    data: {
      status: "entered_in_error",
      enteredInErrorAt: n.at,
      enteredInErrorReason: n.reason,
      enteredInErrorByUserId: ctx.userId,
      updatedAt: n.at,
    },
  });
}
