/**
 * FHIR export reads, import lookups and import writes. Every query filters on the caller's
 * organization (ADR-8); ids from a bundle are only ever looked up inside it.
 */
import {
  encounterTypeColumn,
  encounterTypeFromColumn,
  identifierSystem,
  naturalKey,
  signedNoteDocuments,
  parseIdentifierSystem,
  SYSTEMS,
  type AppointmentRecord,
  type CarePlanRecord,
  type ConditionRecord,
  type EncounterRecord,
  type GoalRecord,
  type ImportLookup,
  type ImportPlan,
  type MappedType,
  type ObservationRecord,
  type PatientExport,
  type PatientRecord,
  type PractitionerRecord,
  type RecordByType,
} from "@carepath/fhir";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient, DbTx } from "../../core/db/repo.js";

type Scope = Pick<RequestCtx, "orgId">;

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (d: { toNumber(): number } | null) => (d === null ? null : d.toNumber());

const patientSelect = {
  id: true,
  mrn: true,
  givenName: true,
  familyName: true,
  birthDate: true,
  gender: true,
  email: true,
  phone: true,
  preferredLanguage: true,
  active: true,
} as const;
function toPatient(p: {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
  birthDate: Date;
  gender: PatientRecord["gender"];
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  active: boolean;
}): PatientRecord {
  return { ...p, birthDate: day(p.birthDate)! };
}

const practitionerSelect = {
  id: true,
  staffId: true,
  npi: true,
  givenName: true,
  familyName: true,
  credentials: true,
  active: true,
} as const;

const goalSelect = {
  id: true,
  patientId: true,
  carePlanId: true,
  description: true,
  lifecycleStatus: true,
  achievementStatus: true,
  measureSystem: true,
  measureCode: true,
  targetValue: true,
  targetUnit: true,
  startDate: true,
  dueDate: true,
  addressesConditionId: true,
} as const;
function toGoal(g: {
  id: string;
  patientId: string;
  description: string;
  lifecycleStatus: GoalRecord["lifecycleStatus"];
  achievementStatus: string | null;
  measureSystem: string | null;
  measureCode: string | null;
  targetValue: { toNumber(): number } | null;
  targetUnit: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  addressesConditionId: string | null;
}): GoalRecord {
  return {
    id: g.id,
    patientId: g.patientId,
    description: g.description,
    lifecycleStatus: g.lifecycleStatus,
    achievementStatus: g.achievementStatus,
    measureSystem: g.measureSystem,
    measureCode: g.measureCode,
    targetValue: num(g.targetValue),
    targetUnit: g.targetUnit,
    startDate: day(g.startDate),
    dueDate: day(g.dueDate),
    addressesConditionId: g.addressesConditionId,
  };
}

const observationSelect = {
  id: true,
  patientId: true,
  status: true,
  category: true,
  codeSystem: true,
  code: true,
  display: true,
  valueQuantity: true,
  valueUnit: true,
  valueString: true,
  dataAbsentReason: true,
  performerType: true,
  performerPractitionerId: true,
  encounterId: true,
  effectiveAt: true,
  recordedAt: true,
} as const;
function toObservation(o: {
  id: string;
  patientId: string;
  status: ObservationRecord["status"];
  category: ObservationRecord["category"];
  codeSystem: string;
  code: string;
  display: string;
  valueQuantity: { toNumber(): number } | null;
  valueUnit: string | null;
  valueString: string | null;
  dataAbsentReason: string | null;
  performerType: ObservationRecord["performerType"];
  performerPractitionerId: string | null;
  encounterId: string | null;
  effectiveAt: Date;
  recordedAt: Date;
}): ObservationRecord {
  return {
    ...o,
    valueQuantity: num(o.valueQuantity),
    effectiveAt: o.effectiveAt.toISOString(),
    recordedAt: o.recordedAt.toISOString(),
  };
}

const conditionSelect = {
  id: true,
  patientId: true,
  encounterId: true,
  codeSystem: true,
  code: true,
  display: true,
  category: true,
  clinicalStatus: true,
  verificationStatus: true,
  bodySite: true,
  onsetDate: true,
  abatementDate: true,
  recordedByPractitionerId: true,
  note: true,
  recordedAt: true,
} as const;
function toCondition(c: {
  id: string;
  patientId: string;
  encounterId: string | null;
  codeSystem: string;
  code: string;
  display: string;
  category: ConditionRecord["category"];
  clinicalStatus: ConditionRecord["clinicalStatus"];
  verificationStatus: ConditionRecord["verificationStatus"];
  bodySite: string | null;
  onsetDate: Date | null;
  abatementDate: Date | null;
  recordedByPractitionerId: string | null;
  note: string | null;
  recordedAt: Date;
}): ConditionRecord {
  return {
    ...c,
    onsetDate: day(c.onsetDate),
    abatementDate: day(c.abatementDate),
    recordedAt: c.recordedAt.toISOString(),
  };
}

const encounterSelect = {
  id: true,
  patientId: true,
  practitionerId: true,
  appointmentId: true,
  class: true,
  typeCode: true,
  typeDisplay: true,
  status: true,
  startedAt: true,
  endedAt: true,
} as const;
function toEncounter(e: {
  id: string;
  patientId: string;
  practitionerId: string;
  appointmentId: string | null;
  class: EncounterRecord["class"];
  typeCode: string;
  typeDisplay: string;
  status: EncounterRecord["status"];
  startedAt: Date;
  endedAt: Date | null;
}): EncounterRecord {
  return {
    id: e.id,
    patientId: e.patientId,
    practitionerId: e.practitionerId,
    appointmentId: e.appointmentId,
    class: e.class,
    ...encounterTypeFromColumn(e.typeCode),
    typeDisplay: e.typeDisplay,
    status: e.status,
    startedAt: e.startedAt.toISOString(),
    endedAt: e.endedAt?.toISOString() ?? null,
  };
}

/**
 * One patient's record (batches 1 and 2). Every published version of every plan becomes a CarePlan; the
 * plan's goals are listed on its latest version. Every condition, appointment and encounter of
 * the patient is included; clinical notes only as their signed versions (signedNoteDocuments),
 * so drafts never leave CarePath. Only practitioners that another record names are included, so
 * the bundle has no unreferenced clinicians.
 */
export async function loadPatientExport(
  db: DbClient,
  ctx: Scope,
  patientId: string,
): Promise<PatientExport | null> {
  const [org, patient] = await Promise.all([
    db.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, slug: true, active: true, phone: true },
    }),
    db.patient.findFirst({
      where: { id: patientId, organizationId: ctx.orgId },
      select: patientSelect,
    }),
  ]);
  if (!org || !patient) return null;
  const [plans, goals, observations, conditions, appointments, encounters, notes] =
    await Promise.all([
      db.carePlan.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          status: true,
          versions: {
            orderBy: { versionNumber: "asc" },
            select: {
              id: true,
              versionNumber: true,
              title: true,
              instructions: true,
              changeNoteForPatient: true,
              publishedByPractitionerId: true,
              publishedAt: true,
              assignments: {
                orderBy: { position: "asc" },
                select: {
                  sets: true,
                  reps: true,
                  holdSeconds: true,
                  durationSeconds: true,
                  restSeconds: true,
                  daysOfWeek: true,
                  timesPerDay: true,
                  instructions: true,
                  exercise: { select: { slug: true, name: true } },
                },
              },
            },
          },
        },
      }),
      db.goal.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: goalSelect,
      }),
      db.observation.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ effectiveAt: "asc" }, { id: "asc" }],
        select: observationSelect,
      }),
      db.condition.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
        select: conditionSelect,
      }),
      db.appointment.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          patientId: true,
          practitionerId: true,
          type: true,
          status: true,
          startsAt: true,
          endsAt: true,
          bookedTimezone: true,
          reason: true,
          cancellationReason: true,
          createdAt: true,
        },
      }),
      db.encounter.findMany({
        where: { organizationId: ctx.orgId, patientId },
        orderBy: [{ startedAt: "asc" }, { id: "asc" }],
        select: encounterSelect,
      }),
      // Signed notes only (checkpoint C3, ruling 4.1): drafts and notes marked entered in error
      // are not read at all.
      db.clinicalNote.findMany({
        where: { organizationId: ctx.orgId, patientId, status: "signed", signedAt: { not: null } },
        orderBy: [{ signedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          patientId: true,
          encounterId: true,
          authorPractitionerId: true,
          noteType: true,
          status: true,
          signedAt: true,
          signedByPractitionerId: true,
          versions: {
            orderBy: { versionNumber: "asc" },
            select: {
              id: true,
              versionNumber: true,
              subjective: true,
              objective: true,
              assessment: true,
              plan: true,
              isAmendment: true,
              amendmentReason: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);
  const appointmentRecords: AppointmentRecord[] = appointments.map((a) => ({
    ...a,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
  }));
  const documents = notes.flatMap((n) =>
    signedNoteDocuments({
      ...n,
      signedAt: n.signedAt?.toISOString() ?? null,
      versions: n.versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    }),
  );
  const carePlans: CarePlanRecord[] = plans.flatMap((plan) =>
    plan.versions.map((v, i) => {
      const latest = i === plan.versions.length - 1;
      return {
        versionId: v.id,
        carePlanId: plan.id,
        patientId,
        versionNumber: v.versionNumber,
        title: v.title,
        instructions: v.instructions,
        changeNoteForPatient: v.changeNoteForPatient,
        status: latest ? plan.status : "revoked",
        authorPractitionerId: v.publishedByPractitionerId,
        publishedAt: v.publishedAt.toISOString(),
        replacesVersionId: i > 0 ? plan.versions[i - 1]!.id : null,
        goalIds: latest ? goals.filter((g) => g.carePlanId === plan.id).map((g) => g.id) : [],
        activities: v.assignments.map((a) => ({
          exerciseSlug: a.exercise.slug,
          exerciseName: a.exercise.name,
          sets: a.sets,
          reps: a.reps,
          holdSeconds: a.holdSeconds,
          durationSeconds: a.durationSeconds,
          restSeconds: a.restSeconds,
          daysOfWeek: a.daysOfWeek,
          timesPerDay: a.timesPerDay,
          instructions: a.instructions,
        })),
      };
    }),
  );
  const practitionerIds = new Set<string>([
    ...carePlans.map((c) => c.authorPractitionerId),
    ...observations.flatMap((o) => (o.performerPractitionerId ? [o.performerPractitionerId] : [])),
    ...conditions.flatMap((c) => (c.recordedByPractitionerId ? [c.recordedByPractitionerId] : [])),
    ...appointments.map((a) => a.practitionerId),
    ...encounters.map((e) => e.practitionerId),
    ...documents.flatMap((d) => [d.authorPractitionerId, d.signerPractitionerId]),
  ]);
  const practitioners = await db.practitioner.findMany({
    where: { organizationId: ctx.orgId, id: { in: [...practitionerIds] } },
    orderBy: [{ familyName: "asc" }, { id: "asc" }],
    select: practitionerSelect,
  });
  return {
    organization: org,
    patient: toPatient(patient),
    practitioners,
    carePlans,
    goals: goals.map(toGoal),
    observations: observations.map(toObservation),
    conditions: conditions.map(toCondition),
    appointments: appointmentRecords,
    encounters: encounters.map(toEncounter),
    documents,
  };
}

/**
 * ImportLookup over the caller's organization. Natural-key matches load candidate rows and
 * compare them with the same naturalKey() the importer uses, so both sides agree by construction.
 */
export function importLookup(db: DbClient, ctx: Scope, orgSlug: string): ImportLookup {
  const where = { organizationId: ctx.orgId };
  return {
    orgId: ctx.orgId,
    orgSlug,
    async exists(type: MappedType, id: string) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
      const by = { ...where, id };
      switch (type) {
        case "Patient":
          return (await db.patient.count({ where: by })) > 0;
        case "Practitioner":
          return (await db.practitioner.count({ where: by })) > 0;
        case "Goal":
          return (await db.goal.count({ where: by })) > 0;
        case "Observation":
          return (await db.observation.count({ where: by })) > 0;
        case "CarePlan":
          return (await db.carePlanVersion.count({ where: by })) > 0;
        case "Encounter":
          return (await db.encounter.count({ where: by })) > 0;
        case "Condition":
          return (await db.condition.count({ where: by })) > 0;
        case "Organization":
          return id === ctx.orgId;
        default:
          // Appointment and DocumentReference are export only; import never looks them up.
          return false;
      }
    },
    async byIdentifier(type, system, value) {
      if (type === "Patient") {
        return (
          (await db.patient.findFirst({ where: { ...where, mrn: value }, select: { id: true } }))
            ?.id ?? null
        );
      }
      if (type === "Practitioner") {
        const row = await db.practitioner.findFirst({
          where: system === SYSTEMS.npi ? { ...where, npi: value } : { ...where, staffId: value },
          select: { id: true },
        });
        return row?.id ?? null;
      }
      if (type === "Organization") {
        return system === SYSTEMS.organization && value === orgSlug ? ctx.orgId : null;
      }
      // Goal, CarePlan (version) and Observation identifiers carry the internal id under the
      // organization's own system; another organization's system never matches here.
      const parsed = parseIdentifierSystem(system ?? undefined);
      if (!parsed || system !== identifierSystem(orgSlug, parsed.kind)) return null;
      return (await this.exists(type, value)) ? value : null;
    },
    async byNaturalKey<T extends MappedType>(type: T, key: string, record: RecordByType[T]) {
      const match = <R>(rows: R[], id: (r: R) => string, rec: (r: R) => unknown) => {
        const hit = rows.find((r) => naturalKey(type, rec(r) as never) === key);
        return hit ? id(hit) : null;
      };
      switch (type) {
        case "Patient": {
          const p = record as PatientRecord;
          const rows = await db.patient.findMany({
            where: { ...where, birthDate: new Date(`${p.birthDate}T00:00:00Z`) },
            select: patientSelect,
          });
          return match(rows, (r) => r.id, toPatient);
        }
        case "Practitioner": {
          const p = record as PractitionerRecord;
          const rows = await db.practitioner.findMany({
            where: { ...where, familyName: { equals: p.familyName, mode: "insensitive" } },
            select: practitionerSelect,
          });
          return match(
            rows,
            (r) => r.id,
            (r) => r,
          );
        }
        case "Goal": {
          const g = record as GoalRecord;
          const rows = await db.goal.findMany({
            where: { ...where, patientId: g.patientId },
            select: goalSelect,
          });
          return match(rows, (r) => r.id, toGoal);
        }
        case "Observation": {
          const o = record as ObservationRecord;
          const rows = await db.observation.findMany({
            where: {
              ...where,
              patientId: o.patientId,
              code: o.code,
              effectiveAt: new Date(o.effectiveAt),
            },
            select: observationSelect,
          });
          return match(rows, (r) => r.id, toObservation);
        }
        case "CarePlan": {
          const c = record as CarePlanRecord;
          const rows = await db.carePlanVersion.findMany({
            where: {
              ...where,
              carePlan: { patientId: c.patientId },
              publishedAt: new Date(c.publishedAt),
            },
            select: { id: true, title: true, versionNumber: true, publishedAt: true },
          });
          return match(
            rows,
            (r) => r.id,
            (r) => ({
              ...c,
              title: r.title,
              versionNumber: r.versionNumber,
              publishedAt: r.publishedAt.toISOString(),
            }),
          );
        }
        case "Encounter": {
          const e = record as EncounterRecord;
          const rows = await db.encounter.findMany({
            where: { ...where, patientId: e.patientId, startedAt: new Date(e.startedAt) },
            select: encounterSelect,
          });
          return match(rows, (r) => r.id, toEncounter);
        }
        case "Condition": {
          const c = record as ConditionRecord;
          const rows = await db.condition.findMany({
            where: { ...where, patientId: c.patientId, code: c.code },
            select: conditionSelect,
          });
          return match(rows, (r) => r.id, toCondition);
        }
        default:
          return null;
      }
    },
    async hasOpenCarePlan(patientId: string) {
      return (
        (await db.carePlan.count({
          where: { ...where, patientId, status: { in: ["draft", "active", "on_hold"] } },
        })) > 0
      );
    },
    async exerciseExists(slug: string) {
      return (await db.exercise.count({ where: { ...where, slug } })) > 0;
    },
  };
}

export async function organizationSlug(db: DbClient, ctx: Scope): Promise<string> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: ctx.orgId },
    select: { slug: true },
  });
  return org.slug;
}

/**
 * Writes an import plan inside the caller's transaction, referenced rows first: practitioners,
 * patients, care plans, encounters, conditions, goals, observations. Plans are inserted as drafts, given
 * their versions in order, then moved through the status trigger (draft -> active -> final
 * status) the way the seed does. Closed plans go first because the database allows one open plan
 * per patient. Imported patients have no login and no care team yet, so their status is
 * awaiting_assignment (inactive when FHIR says active = false).
 */
export async function persistImport(tx: DbTx, ctx: Scope, plan: ImportPlan): Promise<void> {
  const org = ctx.orgId;
  const c = plan.creates;
  if (c.practitioners.length) {
    await tx.practitioner.createMany({
      data: c.practitioners.map((p) => ({ ...p, organizationId: org })),
    });
  }
  if (c.patients.length) {
    await tx.patient.createMany({
      data: c.patients.map((p) => ({
        ...p,
        organizationId: org,
        birthDate: new Date(`${p.birthDate}T00:00:00Z`),
        status: p.active ? ("awaiting_assignment" as const) : ("inactive" as const),
      })),
    });
  }
  const slugs = [
    ...new Set(
      c.carePlans.flatMap((p) =>
        p.versions.flatMap((v) => v.activities.map((a) => a.exerciseSlug)),
      ),
    ),
  ];
  const exercises = new Map(
    (
      await tx.exercise.findMany({
        where: { organizationId: org, slug: { in: slugs } },
        select: { id: true, slug: true },
      })
    ).map((e) => [e.slug, e.id]),
  );
  const open = (s: string) => s === "active" || s === "on_hold";
  for (const p of [...c.carePlans].sort(
    (a, b) => Number(open(a.status)) - Number(open(b.status)),
  )) {
    const first = p.versions[0]!;
    const last = p.versions[p.versions.length - 1]!;
    await tx.carePlan.create({
      data: {
        id: p.id,
        organizationId: org,
        patientId: p.patientId,
        title: p.title,
        status: "draft",
        createdByPractitionerId: first.authorPractitionerId,
        createdAt: new Date(first.publishedAt),
      },
    });
    for (const v of p.versions) {
      await tx.carePlanVersion.create({
        data: {
          id: v.versionId,
          organizationId: org,
          carePlanId: p.id,
          versionNumber: v.versionNumber,
          title: v.title,
          instructions: v.instructions,
          changeNoteForPatient: v.changeNoteForPatient,
          publishedByPractitionerId: v.authorPractitionerId,
          publishedAt: new Date(v.publishedAt),
        },
      });
      if (v.activities.length) {
        await tx.exerciseAssignment.createMany({
          data: v.activities.map((a, position) => ({
            organizationId: org,
            carePlanVersionId: v.versionId,
            exerciseId: exercises.get(a.exerciseSlug)!,
            position,
            sets: a.sets,
            reps: a.reps,
            holdSeconds: a.holdSeconds,
            durationSeconds: a.durationSeconds,
            restSeconds: a.restSeconds,
            daysOfWeek: a.daysOfWeek,
            timesPerDay: a.timesPerDay,
            instructions: a.instructions,
          })),
        });
      }
    }
    if (p.status === "draft") continue;
    if (p.status === "revoked" || p.status === "entered_in_error") {
      await tx.carePlan.update({ where: { id: p.id }, data: { currentVersionId: last.versionId } });
      await tx.carePlan.update({ where: { id: p.id }, data: { status: p.status } });
      continue;
    }
    await tx.carePlan.update({
      where: { id: p.id },
      data: { status: "active", currentVersionId: last.versionId },
    });
    if (p.status !== "active")
      await tx.carePlan.update({ where: { id: p.id }, data: { status: p.status } });
  }
  if (c.encounters.length) {
    await tx.encounter.createMany({
      data: c.encounters.map((e) => ({
        id: e.id,
        organizationId: org,
        patientId: e.patientId,
        practitionerId: e.practitionerId,
        appointmentId: e.appointmentId,
        class: e.class,
        typeCode: encounterTypeColumn(e),
        typeDisplay: e.typeDisplay,
        status: e.status,
        startedAt: new Date(e.startedAt),
        endedAt: e.endedAt ? new Date(e.endedAt) : null,
      })),
    });
  }
  if (c.conditions.length) {
    await tx.condition.createMany({
      data: c.conditions.map((x) => ({
        ...x,
        organizationId: org,
        onsetDate: x.onsetDate ? new Date(`${x.onsetDate}T00:00:00Z`) : null,
        abatementDate: x.abatementDate ? new Date(`${x.abatementDate}T00:00:00Z`) : null,
        // No recordedDate in the source: the database records the import time.
        recordedAt: x.recordedAt ? new Date(x.recordedAt) : undefined,
      })),
    });
  }
  if (c.goals.length) {
    await tx.goal.createMany({
      data: c.goals.map((g) => ({
        id: g.id,
        organizationId: org,
        patientId: g.patientId,
        carePlanId: g.carePlanId,
        description: g.description,
        lifecycleStatus: g.lifecycleStatus,
        achievementStatus: g.achievementStatus,
        measureSystem: g.measureSystem,
        measureCode: g.measureCode,
        targetValue: g.targetValue,
        targetUnit: g.targetUnit,
        startDate: g.startDate ? new Date(`${g.startDate}T00:00:00Z`) : null,
        dueDate: g.dueDate ? new Date(`${g.dueDate}T00:00:00Z`) : null,
        addressesConditionId: g.addressesConditionId,
      })),
    });
  }
  if (c.observations.length) {
    await tx.observation.createMany({
      data: c.observations.map((o) => ({
        ...o,
        organizationId: org,
        effectiveAt: new Date(o.effectiveAt),
        recordedAt: new Date(o.recordedAt),
      })),
    });
  }
}
