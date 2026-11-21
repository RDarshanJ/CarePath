/**
 * AI module repository (WP 5.2). Every query filters on the caller's organization; patient
 * scope is checked by the caller (routes) or, for evidence, by comparing the record's patient
 * with the generation's patient (ADR-6).
 */
import type { Prisma } from "@carepath/db/client";
import {
  parseTranscriptText,
  type FieldValue,
  type SourceRecord,
  type SourceRefType,
} from "@carepath/ai";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient, DbTx } from "../../core/db/repo.js";

type Org = Pick<RequestCtx, "orgId">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Encounter.typeCode as written by the seed and by CarePath; anything else reads as follow-up. */
export function encounterType(
  typeCode: string,
): "initial_evaluation" | "follow_up" | "video_follow_up" {
  if (typeCode === "PT-INIT-EVAL") return "initial_evaluation";
  if (typeCode === "PT-VIDEO-FOLLOW-UP") return "video_follow_up";
  return "follow_up";
}

/** Audit resource type for each evidence type. */
export const SOURCE_RESOURCE: Record<SourceRefType, string> = {
  check_in: "PatientCheckIn",
  exercise_session: "ExerciseSession",
  session_activity: "SessionActivity",
  message: "Message",
  appointment: "Appointment",
  care_plan_version: "CarePlanVersion",
  encounter: "Encounter",
  observation: "Observation",
};

export type MessageSenderRole = "patient" | "clinician" | "coordinator" | "system";

async function senderRoles(
  db: DbClient,
  ctx: Org,
  userIds: string[],
): Promise<Map<string, MessageSenderRole>> {
  if (userIds.length === 0) return new Map();
  const rows = await db.organizationMembership.findMany({
    where: { organizationId: ctx.orgId, userId: { in: [...new Set(userIds)] } },
    select: { userId: true, role: { select: { key: true } } },
  });
  const map = new Map<string, MessageSenderRole>();
  for (const r of rows) {
    map.set(
      r.userId,
      r.role.key === "patient"
        ? "patient"
        : r.role.key === "physical_therapist"
          ? "clinician"
          : "coordinator",
    );
  }
  return map;
}

// ---------------------------------------------------------------------------------------------
// Field mappers. One per evidence type, shared by the input assembly and the resolver, so a
// record cited by a generation resolves to exactly the fields the prompt was built from
// (the same field names as `sourceRecords()` in @carepath/ai).
// ---------------------------------------------------------------------------------------------

export const checkInFields = (c: {
  painScore: number;
  difficulty: string | null;
  notes: string | null;
  submittedAt: Date;
}): Record<string, FieldValue> => ({
  painScore: c.painScore,
  difficulty: c.difficulty,
  notes: c.notes,
  submittedAt: iso(c.submittedAt),
});

export const sessionFields = (s: {
  status: string;
  startedAt: Date;
  completedAt: Date | null;
}): Record<string, FieldValue> => ({
  status: s.status,
  startedAt: iso(s.startedAt),
  completedAt: iso(s.completedAt),
});

export const activityFields = (a: {
  status: string;
  discomfortReported: boolean;
  discomfortLevel: number | null;
  skipReason: string | null;
  assignment: { exercise: { name: string } };
}): Record<string, FieldValue> => ({
  status: a.status,
  exerciseName: a.assignment.exercise.name,
  discomfortReported: a.discomfortReported,
  discomfortLevel: a.discomfortLevel,
  skipReason: a.skipReason,
});

export const appointmentFields = (a: {
  type: string;
  status: string;
  startsAt: Date;
}): Record<string, FieldValue> => ({ type: a.type, status: a.status, startsAt: iso(a.startsAt) });

export const versionFields = (v: {
  title: string;
  versionNumber: number;
  publishedAt: Date;
  _count: { assignments: number };
}): Record<string, FieldValue> => ({
  title: v.title,
  versionNumber: v.versionNumber,
  publishedAt: iso(v.publishedAt),
  exerciseCount: v._count.assignments,
});

export function encounterFields(e: {
  typeCode: string;
  transcript: string | null;
}): Record<string, FieldValue> {
  const fields: Record<string, FieldValue> = {
    type: encounterType(e.typeCode),
    // No body-region column on Encounter; the note-draft input sends null too.
    bodyRegion: null,
  };
  for (const t of parseTranscriptText(e.transcript ?? "")) {
    fields[`transcript.turn.${t.turn}`] = `${t.speaker}: ${t.text}`;
  }
  return fields;
}

export const observationFields = (o: {
  code: string;
  display: string;
  status: string;
  valueQuantity: Prisma.Decimal | null;
  valueUnit: string | null;
  valueString: string | null;
  effectiveAt: Date;
}): Record<string, FieldValue> => ({
  code: o.code,
  display: o.display,
  status: o.status,
  valueQuantity: o.valueQuantity === null ? null : Number(o.valueQuantity),
  valueUnit: o.valueUnit,
  valueString: o.valueString,
  effectiveAt: iso(o.effectiveAt),
});

const activitySelect = {
  id: true,
  status: true,
  discomfortReported: true,
  discomfortLevel: true,
  skipReason: true,
  assignment: { select: { exercise: { select: { name: true } } } },
} as const;

/** A source record plus when it happened, for the evidence panel. */
export interface LoadedSource extends SourceRecord {
  occurredAt: string | null;
}

/**
 * Loads records by type and id inside the caller's organization, whatever patient they belong
 * to: the resolver decides scope by comparing `patientId`. Ids that are not UUIDs, and records
 * of other organizations, are simply absent. Messages count only once delivered (`sent`), and
 * plan versions are published by construction.
 */
export async function loadSources(
  db: DbClient,
  ctx: Org,
  refs: { type: SourceRefType; id: string }[],
): Promise<Map<string, LoadedSource>> {
  const ids = (type: SourceRefType) => [
    ...new Set(refs.filter((r) => r.type === type && UUID.test(r.id)).map((r) => r.id)),
  ];
  const org = ctx.orgId;
  const out = new Map<string, LoadedSource>();
  const put = (
    type: SourceRefType,
    id: string,
    patientId: string,
    occurredAt: Date | null,
    fields: Record<string, FieldValue>,
  ) =>
    out.set(`${type}:${id}`, {
      type,
      id,
      organizationId: org,
      patientId,
      occurredAt: iso(occurredAt),
      fields,
    });

  const checkIns = ids("check_in");
  if (checkIns.length) {
    for (const c of await db.patientCheckIn.findMany({
      where: { organizationId: org, id: { in: checkIns } },
    }))
      put("check_in", c.id, c.patientId, c.submittedAt, checkInFields(c));
  }
  const sessions = ids("exercise_session");
  if (sessions.length) {
    for (const s of await db.exerciseSession.findMany({
      where: { organizationId: org, id: { in: sessions } },
    }))
      put("exercise_session", s.id, s.patientId, s.startedAt, sessionFields(s));
  }
  const activities = ids("session_activity");
  if (activities.length) {
    for (const a of await db.sessionActivity.findMany({
      where: { organizationId: org, id: { in: activities } },
      select: {
        ...activitySelect,
        completedAt: true,
        session: { select: { patientId: true, startedAt: true } },
      },
    }))
      put(
        "session_activity",
        a.id,
        a.session.patientId,
        a.completedAt ?? a.session.startedAt,
        activityFields(a),
      );
  }
  const messages = ids("message");
  if (messages.length) {
    const rows = await db.message.findMany({
      where: { organizationId: org, id: { in: messages }, status: "sent" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderUserId: true,
        conversation: { select: { patientId: true } },
      },
    });
    const roles = await senderRoles(
      db,
      ctx,
      rows.map((m) => m.senderUserId),
    );
    for (const m of rows)
      put("message", m.id, m.conversation.patientId, m.createdAt, {
        senderRole: roles.get(m.senderUserId) ?? "system",
        body: m.body,
        createdAt: iso(m.createdAt),
      });
  }
  const appointments = ids("appointment");
  if (appointments.length) {
    for (const a of await db.appointment.findMany({
      where: { organizationId: org, id: { in: appointments } },
    }))
      put("appointment", a.id, a.patientId, a.startsAt, appointmentFields(a));
  }
  const versions = ids("care_plan_version");
  if (versions.length) {
    for (const v of await db.carePlanVersion.findMany({
      where: { organizationId: org, id: { in: versions } },
      select: {
        id: true,
        title: true,
        versionNumber: true,
        publishedAt: true,
        _count: { select: { assignments: true } },
        carePlan: { select: { patientId: true } },
      },
    }))
      put("care_plan_version", v.id, v.carePlan.patientId, v.publishedAt, versionFields(v));
  }
  const encounters = ids("encounter");
  if (encounters.length) {
    for (const e of await db.encounter.findMany({
      where: { organizationId: org, id: { in: encounters } },
    }))
      put("encounter", e.id, e.patientId, e.startedAt, encounterFields(e));
  }
  const observations = ids("observation");
  if (observations.length) {
    for (const o of await db.observation.findMany({
      where: { organizationId: org, id: { in: observations } },
    }))
      put("observation", o.id, o.patientId, o.effectiveAt, observationFields(o));
  }
  return out;
}

/** The encounter's raw transcript, for the evidence panel's side-by-side view. */
export async function encounterTranscript(
  db: DbClient,
  ctx: Org,
  patientId: string,
  encounterId: string,
): Promise<string | null> {
  const row = await db.encounter.findFirst({
    where: { id: encounterId, organizationId: ctx.orgId, patientId },
    select: { transcript: true },
  });
  return row?.transcript ?? null;
}

// ---------------------------------------------------------------------------------------------
// Generation inputs
// ---------------------------------------------------------------------------------------------

export async function aiConsentStatus(
  db: DbClient,
  ctx: Org,
  patientId: string,
): Promise<"active" | "none"> {
  const row = await db.consent.findFirst({
    where: {
      organizationId: ctx.orgId,
      patientId,
      type: "ai_assisted_features",
      status: "active",
    },
    select: { id: true },
  });
  return row ? "active" : "none";
}

const personNames = (given: string, family: string) => [given, family, `${given} ${family}`];

/**
 * Identifiers the redactor must remove before any external call: the patient's own, and the
 * names of the staff a transcript or message can mention (checkpoint C3, B5): every member of
 * the patient's care team, past or present, the people who sent the messages in the input
 * (`senderUserIds`) and the practitioners named on the input records (`practitionerIds`, the
 * visit's clinician for a note draft).
 */
export async function patientIdentifiers(
  db: DbClient,
  ctx: Org,
  patientId: string,
  people: { senderUserIds?: readonly string[]; practitionerIds?: readonly string[] } = {},
) {
  const p = await db.patient.findFirstOrThrow({
    where: { id: patientId, organizationId: ctx.orgId },
    select: {
      userId: true,
      givenName: true,
      familyName: true,
      birthDate: true,
      email: true,
      phone: true,
      mrn: true,
    },
  });
  const members = await db.careTeamMember.findMany({
    where: { organizationId: ctx.orgId, careTeam: { patientId, organizationId: ctx.orgId } },
    select: { userId: true },
  });
  const userIds = [
    ...new Set([...members.map((m) => m.userId), ...(people.senderUserIds ?? [])]),
  ].filter((id) => id !== p.userId);
  const users = userIds.length
    ? await db.organizationMembership.findMany({
        where: { organizationId: ctx.orgId, userId: { in: userIds } },
        select: {
          user: {
            select: {
              displayName: true,
              practitioner: { select: { givenName: true, familyName: true } },
            },
          },
        },
      })
    : [];
  const practitioners = people.practitionerIds?.length
    ? await db.practitioner.findMany({
        where: { organizationId: ctx.orgId, id: { in: [...people.practitionerIds] } },
        select: { givenName: true, familyName: true },
      })
    : [];
  const staffNames = [
    ...users.flatMap(({ user }) => [
      user.displayName,
      ...(user.practitioner
        ? personNames(user.practitioner.givenName, user.practitioner.familyName)
        : []),
    ]),
    ...practitioners.flatMap((x) => personNames(x.givenName, x.familyName)),
  ];
  const names = [...new Set([...personNames(p.givenName, p.familyName), ...staffNames])].filter(
    (n) => n.trim().length > 0,
  );
  return {
    names,
    birthDates: [p.birthDate.toISOString().slice(0, 10)],
    emails: p.email ? [p.email] : [],
    phones: p.phone ? [p.phone] : [],
    addresses: [],
    otherIdentifiers: [p.mrn],
  };
}

/** Records for a progress summary over [from, to]. Field values match `loadSources`. */
export async function progressRecords(
  db: DbClient,
  ctx: Org,
  patientId: string,
  from: Date,
  to: Date,
) {
  const org = ctx.orgId;
  const plan = await db.carePlan.findFirst({
    where: { organizationId: org, patientId, currentVersionId: { not: null } },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      currentVersion: {
        select: {
          id: true,
          title: true,
          versionNumber: true,
          publishedAt: true,
          _count: { select: { assignments: true } },
        },
      },
    },
  });
  const sessions = await db.exerciseSession.findMany({
    where: { organizationId: org, patientId, startedAt: { gte: from, lte: to } },
    orderBy: [{ startedAt: "asc" }, { id: "asc" }],
    take: 60,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      activities: { select: activitySelect, orderBy: { id: "asc" } },
    },
  });
  const checkIns = await db.patientCheckIn.findMany({
    where: { organizationId: org, patientId, submittedAt: { gte: from, lte: to } },
    orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
    take: 60,
  });
  const messages = await db.message.findMany({
    where: {
      organizationId: org,
      status: "sent",
      createdAt: { gte: from, lte: to },
      conversation: { patientId, organizationId: org },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 60,
    select: { id: true, body: true, createdAt: true, senderUserId: true },
  });
  const roles = await senderRoles(
    db,
    ctx,
    messages.map((m) => m.senderUserId),
  );
  const appointments = await db.appointment.findMany({
    where: { organizationId: org, patientId, startsAt: { gte: from } },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: 30,
  });
  return {
    carePlan: plan?.currentVersion ?? null,
    sessions,
    checkIns,
    messages: messages.map((m) => ({ ...m, senderRole: roles.get(m.senderUserId) ?? "system" })),
    appointments,
  };
}

export async function findEncounter(db: DbClient, ctx: Org, patientId: string, id: string) {
  return db.encounter.findFirst({
    where: { id, organizationId: ctx.orgId, patientId },
    select: { id: true, typeCode: true, transcript: true, startedAt: true, practitionerId: true },
  });
}

// ---------------------------------------------------------------------------------------------
// Generations and reviews
// ---------------------------------------------------------------------------------------------

export interface NewGeneration {
  patientId: string;
  kind: "progress_summary" | "note_draft";
  provider: string;
  providerLabel: string;
  model: string | null;
  promptKey: string;
  promptVersion: string;
  status: "succeeded" | "failed";
  input: Prisma.InputJsonValue;
  output: Prisma.InputJsonValue | null;
  error: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costMicroUsd: number | null;
  latencyMs: number;
  unsupportedStatementCount: number | null;
  previousGenerationId: string | null;
  createdAt: Date;
  completedAt: Date;
}

export async function insertGeneration(
  tx: DbTx,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  g: NewGeneration,
): Promise<string> {
  const row = await tx.aIGeneration.create({
    data: {
      organizationId: ctx.orgId,
      requestedByUserId: ctx.userId,
      ...g,
      output: g.output === null ? undefined : g.output,
    },
    select: { id: true },
  });
  return row.id;
}

const userSelect = {
  id: true,
  displayName: true,
  practitioner: { select: { id: true } },
} as const;

const generationSelect = {
  id: true,
  patientId: true,
  kind: true,
  provider: true,
  providerLabel: true,
  model: true,
  promptKey: true,
  promptVersion: true,
  status: true,
  input: true,
  output: true,
  error: true,
  inputTokens: true,
  outputTokens: true,
  costMicroUsd: true,
  latencyMs: true,
  unsupportedStatementCount: true,
  previousGenerationId: true,
  createdAt: true,
  completedAt: true,
  requestedBy: { select: { user: { select: userSelect } } },
  regenerations: {
    select: { id: true },
    // Creation times are strictly increasing per patient (latestGenerationTime).
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} as const;

export type GenerationRow = Prisma.AIGenerationGetPayload<{ select: typeof generationSelect }>;

const reviewSelect = {
  id: true,
  decision: true,
  editedOutput: true,
  reason: true,
  createdAt: true,
  reviewer: { select: { user: { select: userSelect } } },
} as const;

export type ReviewRow = Prisma.AIReviewGetPayload<{ select: typeof reviewSelect }>;

/** A generation of this patient in the caller's organization (kinds this API serves only). */
export async function findGeneration(
  db: DbClient,
  ctx: Org,
  patientId: string,
  id: string,
): Promise<GenerationRow | null> {
  return db.aIGeneration.findFirst({
    where: {
      id,
      organizationId: ctx.orgId,
      patientId,
      kind: { in: ["progress_summary", "note_draft"] },
    },
    select: generationSelect,
  });
}

export async function listGenerations(
  db: DbClient,
  ctx: Org,
  patientId: string,
  kind: "progress_summary" | "note_draft" | undefined,
  offset: number,
  take: number,
): Promise<GenerationRow[]> {
  return db.aIGeneration.findMany({
    where: {
      organizationId: ctx.orgId,
      patientId,
      kind: kind ?? { in: ["progress_summary", "note_draft"] },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: offset,
    take,
    select: generationSelect,
  });
}

/** Reviews of a generation, oldest first. */
export async function listReviews(
  db: DbClient,
  ctx: Org,
  generationId: string,
): Promise<ReviewRow[]> {
  return db.aIReview.findMany({
    where: { organizationId: ctx.orgId, generationId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: reviewSelect,
  });
}

/** Decisions per generation for a page of summaries (review state without loading revisions). */
export async function reviewFacts(
  db: DbClient,
  ctx: Org,
  generationIds: string[],
): Promise<Map<string, { revisions: number; decision: string | null }>> {
  const rows = generationIds.length
    ? await db.aIReview.findMany({
        where: { organizationId: ctx.orgId, generationId: { in: generationIds } },
        select: { generationId: true, decision: true },
      })
    : [];
  const map = new Map<string, { revisions: number; decision: string | null }>();
  for (const id of generationIds) map.set(id, { revisions: 0, decision: null });
  for (const r of rows) {
    const f = map.get(r.generationId)!;
    if (r.decision === "revised") f.revisions += 1;
    else f.decision = r.decision;
  }
  return map;
}

/**
 * Locks the generation row for the rest of the transaction, so revisions and the decision of
 * one generation are serialised (the stale-revision check depends on it).
 */
export async function lockGeneration(tx: DbTx, ctx: Org, id: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "AIGeneration" WHERE id = ${id}::uuid AND "organizationId" = ${ctx.orgId}::uuid FOR UPDATE`;
}

export async function insertReview(
  tx: DbTx,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  r: {
    generationId: string;
    decision: "approved" | "approved_with_edits" | "rejected" | "revised";
    editedOutput: Prisma.InputJsonValue | null;
    reason: string | null;
    createdAt: Date;
  },
): Promise<string> {
  const row = await tx.aIReview.create({
    data: {
      organizationId: ctx.orgId,
      reviewerUserId: ctx.userId,
      generationId: r.generationId,
      decision: r.decision,
      editedOutput: r.editedOutput === null ? undefined : r.editedOutput,
      reason: r.reason,
      createdAt: r.createdAt,
    },
    select: { id: true },
  });
  return row.id;
}

/** The note created when a generation's draft was approved, if any. */
export async function noteFromGeneration(
  db: DbClient,
  ctx: Org,
  generationId: string,
): Promise<string | null> {
  const row = await db.clinicalNoteVersion.findFirst({
    where: { organizationId: ctx.orgId, aiGenerationId: generationId },
    orderBy: { createdAt: "asc" },
    select: { noteId: true },
  });
  return row?.noteId ?? null;
}

/** Approval of a note draft: a clinician-authored draft note with one ai_draft version. */
export async function createDraftNoteFromGeneration(
  tx: DbTx,
  ctx: Pick<RequestCtx, "orgId" | "userId">,
  n: {
    patientId: string;
    encounterId: string;
    authorPractitionerId: string;
    noteType: "progress_note" | "initial_evaluation";
    generationId: string;
    soap: { subjective: string; objective: string; assessment: string; plan: string };
    at: Date;
  },
): Promise<string> {
  const note = await tx.clinicalNote.create({
    data: {
      organizationId: ctx.orgId,
      patientId: n.patientId,
      encounterId: n.encounterId,
      authorPractitionerId: n.authorPractitionerId,
      noteType: n.noteType,
      status: "draft",
      createdAt: n.at,
      updatedAt: n.at,
    },
    select: { id: true },
  });
  const version = await tx.clinicalNoteVersion.create({
    data: {
      organizationId: ctx.orgId,
      noteId: note.id,
      // A new note: its first version (checked by ClinicalNoteVersion_next_number).
      versionNumber: 1,
      ...n.soap,
      source: "ai_draft",
      aiGenerationId: n.generationId,
      createdByUserId: ctx.userId,
      createdAt: n.at,
    },
    select: { id: true },
  });
  await tx.clinicalNote.update({
    where: { id: note.id },
    data: { currentVersionId: version.id, updatedAt: n.at },
  });
  return note.id;
}

/**
 * Times are strictly increasing per patient (generations) and per generation (reviews), so the
 * order of records holds under a fixed clock (CAREPATH_FIXED_NOW) as well as a real one.
 */
export async function latestGenerationTime(
  db: DbClient,
  ctx: Org,
  patientId: string,
  now: Date,
): Promise<Date> {
  const last = await db.aIGeneration.findFirst({
    where: { organizationId: ctx.orgId, patientId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last && last.createdAt >= now ? new Date(last.createdAt.getTime() + 1) : now;
}

export async function nextReviewTime(
  db: DbClient,
  ctx: Org,
  generationId: string,
  now: Date,
): Promise<Date> {
  const last = await db.aIReview.findFirst({
    where: { organizationId: ctx.orgId, generationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last && last.createdAt >= now ? new Date(last.createdAt.getTime() + 1) : now;
}

/**
 * Overview work list (CR-16): succeeded generations of these patients with no decision and no
 * regeneration, oldest first, with how many revisions each has.
 */
export async function draftsAwaitingReview(
  db: DbClient,
  ctx: Org,
  patientIds: string[],
  take: number,
) {
  if (patientIds.length === 0) return [];
  return db.aIGeneration.findMany({
    where: {
      organizationId: ctx.orgId,
      patientId: { in: patientIds },
      status: "succeeded",
      kind: { in: ["progress_summary", "note_draft"] },
      reviews: { none: { decision: { in: ["approved", "approved_with_edits", "rejected"] } } },
      regenerations: { none: {} },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      kind: true,
      createdAt: true,
      unsupportedStatementCount: true,
      patient: { select: { id: true, givenName: true, familyName: true, mrn: true } },
      _count: { select: { reviews: true } },
    },
  });
}
