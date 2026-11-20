/**
 * Import planning: validates a Bundle with the three layers, resolves references (inside the
 * bundle, Synthea-style conditional references, and existing records of the caller's
 * organization through `ImportLookup`), maps batch 1 resources to CarePath records, detects
 * duplicates, and returns what to create plus an itemised report. It writes nothing: the API
 * persists `plan.creates` in one transaction. Pure apart from the lookups it is given.
 *
 * HTTP outcome: 400 when the document or a resource is structurally invalid; 422 when it is
 * well formed but breaks CarePath's checks (required elements, references, organization
 * boundary, mapping); 409 when duplicates are found and the caller asked to reject them;
 * otherwise 201 (something created) or 200 (nothing new). Never 200 for a failure.
 */
import type { Bundle, Encounter, Reference, Resource } from "@medplum/fhirtypes";
import { parseIdentifierSystem, SYSTEMS } from "../config.js";
import { isError, issue, type FhirIssue } from "../issues.js";
import { chosenPatientIdentifier } from "../mappers/patient.js";
import { mappers, type MapperContext, type ResolvedRef } from "../mappers/index.js";
import { parseReference } from "../references.js";
import {
  isMappedType,
  type CarePlanRecord,
  type GoalRecord,
  type MappedType,
  type ObservationRecord,
  type PatientRecord,
  type PractitionerRecord,
  type RecordByType,
} from "../types.js";
import { BundleIndex, type IndexedEntry } from "../validate/bundle-index.js";
import {
  checkBundleRules,
  checkOrganizationBoundary,
  checkReferences,
  checkRequired,
} from "../validate/carepath.js";
import { naturalKey } from "../validate/duplicates.js";
import { validateStructure } from "../validate/structural.js";

/** Lookups inside the caller's organization. Every method is scoped to that organization. */
export interface ImportLookup {
  orgId: string;
  orgSlug: string;
  /** A record of this type and id exists in the organization (CarePlan: a version id). */
  exists(type: MappedType, id: string): Promise<boolean>;
  /** Id of an existing record with this business identifier, or null. */
  byIdentifier(type: MappedType, system: string | null, value: string): Promise<string | null>;
  /** Id of an existing record with the same natural key (validate/duplicates.ts), or null. */
  byNaturalKey<T extends MappedType>(
    type: T,
    key: string,
    record: RecordByType[T],
  ): Promise<string | null>;
  hasOpenCarePlan(patientId: string): Promise<boolean>;
  exerciseExists(slug: string): Promise<boolean>;
}

export interface ImportOptions {
  lookup: ImportLookup;
  /** reject (default): any duplicate fails the import with 409. skip: duplicates are reused. */
  onDuplicate: "reject" | "skip";
  newId: () => string;
  /** Default 5000. */
  maxEntries?: number;
}

export type EntryAction = "create" | "duplicate" | "skipped" | "organization" | "invalid";

export interface PlannedEntry {
  index: number;
  fullUrl: string | null;
  resourceType: string;
  action: EntryAction;
  /** CarePath id created or matched. */
  id: string | null;
}

export interface PlannedCarePlan {
  id: string;
  patientId: string;
  title: string;
  status: CarePlanRecord["status"];
  /** In version order, renumbered from 1. */
  versions: CarePlanRecord[];
}

export interface ImportPlan {
  status: 200 | 201 | 400 | 409 | 422;
  issues: FhirIssue[];
  entries: PlannedEntry[];
  creates: {
    practitioners: PractitionerRecord[];
    patients: PatientRecord[];
    carePlans: PlannedCarePlan[];
    goals: (GoalRecord & { carePlanId: string | null })[];
    observations: ObservationRecord[];
  };
  counts: Record<string, { created: number; duplicate: number; skipped: number; invalid: number }>;
}

/** Processing order: referenced types before the types that reference them. */
const ORDER: MappedType[] = ["Practitioner", "Patient", "Goal", "CarePlan", "Observation"];

interface EntryState {
  entry: IndexedEntry;
  type: string;
  action: EntryAction | null;
  finalId: string | null;
  /** References that resolved outside the bundle, keyed by the reference text. */
  external: Map<string, ResolvedRef>;
  blocked: boolean;
}

const at = (i: number) => `Bundle.entry[${i}].resource`;

function prefixed(issues: FhirIssue[], i: number): FhirIssue[] {
  return issues.map((x) => ({
    ...x,
    expression: x.expression ? `${at(i)}.${x.expression}` : at(i),
  }));
}

function emptyPlan(status: ImportPlan["status"], issues: FhirIssue[]): ImportPlan {
  return {
    status,
    issues,
    entries: [],
    creates: { practitioners: [], patients: [], carePlans: [], goals: [], observations: [] },
    counts: {},
  };
}

export async function planImport(bundle: unknown, options: ImportOptions): Promise<ImportPlan> {
  const { lookup } = options;
  const shape = checkBundleRules(bundle, ["collection", "transaction", "batch"]);
  if (shape.some(isError)) return emptyPlan(400, shape);
  const b = bundle as Bundle;
  if ((b.entry?.length ?? 0) > (options.maxEntries ?? 5000)) {
    return emptyPlan(400, [
      issue(
        "carepath",
        "error",
        "processing",
        "bundle.too-many-entries",
        `A bundle may have at most ${options.maxEntries ?? 5000} entries.`,
        "Bundle.entry",
      ),
    ]);
  }
  const index = new BundleIndex(b);
  const issues: FhirIssue[] = [];
  const states = new Map<number, EntryState>();
  for (const e of index.entries) {
    states.set(e.index, {
      entry: e,
      type: e.resource.resourceType,
      action: null,
      finalId: null,
      external: new Map(),
      blocked: false,
    });
  }

  // 1. Allow-list, organizations, structure, required elements, references.
  for (const s of states.values()) {
    const i = s.entry.index;
    if (!isMappedType(s.type)) {
      s.action = "skipped";
      issues.push(
        issue(
          "import",
          "information",
          "not-supported",
          "import.skipped-type",
          `${s.type} is not imported (allowed: ${["Organization", ...ORDER].join(", ")}).`,
          at(i),
        ),
      );
      continue;
    }
    if (s.type === "Organization") {
      const slug = s.entry.resource.identifier?.find(
        (x) => x.system === SYSTEMS.organization,
      )?.value;
      if (slug === lookup.orgSlug) {
        s.action = "organization";
        s.finalId = lookup.orgId;
      } else {
        s.action = "skipped";
        issues.push(
          issue(
            "import",
            "warning",
            "not-supported",
            "import.external-organization",
            "Organizations are not created by import; records join the importing organization.",
            at(i),
          ),
        );
      }
      continue;
    }
    const structural = validateStructure(s.entry.resource as Resource, at(i));
    const required = checkRequired(s.entry.resource as Resource, at(i));
    const refs = checkReferences(index, i, { mode: "import", orgSlug: lookup.orgSlug });
    issues.push(...structural, ...required, ...refs.issues);
    if ([...structural, ...required, ...refs.issues].some(isError)) s.blocked = true;
    for (const ext of refs.external) {
      const resolved = await resolveExternal(ext.reference, lookup);
      const where = `${at(i)}.${ext.path}`;
      if (resolved.kind === "found") s.external.set(ext.reference, resolved.ref);
      else if (resolved.kind === "dropped") {
        issues.push(
          issue(
            "import",
            "information",
            "not-supported",
            "import.reference-dropped",
            resolved.why,
            where,
          ),
        );
      } else {
        s.blocked = true;
        issues.push(
          issue(
            "carepath",
            "error",
            "not-found",
            "ref.unresolved",
            "Reference does not resolve in this bundle or in your organization.",
            where,
          ),
        );
      }
    }
  }
  issues.push(...checkOrganizationBoundary(index, { mode: "import", orgSlug: lookup.orgSlug }));
  for (const s of states.values()) {
    if (s.action === null) s.finalId = options.newId();
  }

  // 2. Map in dependency order, then duplicates.
  const resolver = (s: EntryState): MapperContext => ({
    orgSlug: lookup.orgSlug,
    resolve(r: Reference | undefined) {
      if (!r?.reference) return null;
      const ext = s.external.get(r.reference);
      if (ext) return ext;
      const res = index.resolve(r.reference);
      if (res.kind !== "entry") return null;
      const target = states.get(res.index)!;
      if (target.type === "Organization")
        return target.finalId ? { type: "Organization", id: target.finalId } : null;
      if (
        !isMappedType(target.type) ||
        target.blocked ||
        target.action === "invalid" ||
        !target.finalId
      )
        return null;
      if (target.action === "skipped") return null;
      return { type: target.type, id: target.finalId };
    },
  });

  const plan = emptyPlan(201, issues);
  const seenKeys = new Map<string, EntryState>();
  const records = new Map<number, RecordByType[MappedType]>();
  for (const type of ORDER) {
    for (const s of [...states.values()].filter((x) => x.type === type)) {
      const i = s.entry.index;
      if (s.blocked) {
        s.action = "invalid";
        continue;
      }
      let resource = s.entry.resource as Resource;
      const derived = await deriveFromEncounter(resource, index, states, lookup);
      if (derived) {
        resource = derived.resource;
        s.external.set(derived.reference, { type: "Practitioner", id: derived.practitionerId });
        issues.push(
          issue(
            "import",
            "information",
            "informational",
            "import.derived-practitioner",
            derived.message,
            `${at(i)}.${derived.field}`,
          ),
        );
      }
      const mapped = mappers[type].fromFhir(resource, resolver(s));
      const errors = mapped.issues.filter(isError);
      if (!mapped.record && errors.length > 0 && errors.every((x) => x.code === "not-supported")) {
        // A valid resource with a shape CarePath does not store (a laboratory result, a panel
        // with components only): skipped and reported, like a type outside the allow-list.
        s.action = "skipped";
        issues.push(
          ...prefixed(
            mapped.issues.map((x) =>
              isError(x) ? { ...x, severity: "warning" as const, rule: `${x.rule}.skipped` } : x,
            ),
            i,
          ),
        );
        continue;
      }
      issues.push(...prefixed(mapped.issues, i));
      if (!mapped.record) {
        s.action = "invalid";
        continue;
      }
      const record = { ...mapped.record } as RecordByType[MappedType];
      const extra = extraChecks(type, record);
      issues.push(...prefixed(extra, i));
      if (extra.some(isError)) {
        s.action = "invalid";
        continue;
      }
      const dup = await findDuplicate(type, s, record, seenKeys, lookup);
      if (dup) {
        s.action = "duplicate";
        s.finalId = dup.id;
        const sev = options.onDuplicate === "reject" ? "error" : "information";
        issues.push(issue("duplicate", sev, "duplicate", dup.rule, dup.message, at(i)));
        continue;
      }
      s.action = "create";
      setId(type, record, s.finalId!);
      records.set(i, record);
    }
  }

  // 3. Assemble creates.
  for (const type of ORDER) {
    for (const s of [...states.values()].filter((x) => x.type === type && x.action === "create")) {
      const r = records.get(s.entry.index)!;
      if (type === "Practitioner") plan.creates.practitioners.push(r as PractitionerRecord);
      if (type === "Patient") plan.creates.patients.push(r as PatientRecord);
      if (type === "Goal") plan.creates.goals.push({ ...(r as GoalRecord), carePlanId: null });
      if (type === "Observation") plan.creates.observations.push(r as ObservationRecord);
    }
  }
  await groupCarePlans(states, records, plan, issues, options);

  // 4. Report.
  plan.entries = [...states.values()]
    .sort((a, b2) => a.entry.index - b2.entry.index)
    .map((s) => ({
      index: s.entry.index,
      fullUrl: s.entry.fullUrl,
      resourceType: s.type,
      action: s.action ?? "invalid",
      id:
        s.action === "create" || s.action === "duplicate" || s.action === "organization"
          ? s.finalId
          : null,
    }));
  for (const e of plan.entries) {
    const c = (plan.counts[e.resourceType] ??= {
      created: 0,
      duplicate: 0,
      skipped: 0,
      invalid: 0,
    });
    if (e.action === "create") c.created += 1;
    else if (e.action === "duplicate") c.duplicate += 1;
    else if (e.action === "invalid") c.invalid += 1;
    else if (e.action === "skipped") c.skipped += 1;
  }
  plan.issues = issues;
  const errors = issues.filter(isError);
  const created = plan.entries.some((e) => e.action === "create");
  plan.status = errors.some((e) => e.layer === "structural")
    ? 400
    : errors.some((e) => e.layer !== "duplicate")
      ? 422
      : errors.length
        ? 409
        : created
          ? 201
          : 200;
  return plan;
}

type External =
  { kind: "found"; ref: ResolvedRef } | { kind: "dropped"; why: string } | { kind: "unresolved" };

async function resolveExternal(raw: string, lookup: ImportLookup): Promise<External> {
  const p = parseReference(raw);
  if (p.kind === "contained")
    return {
      kind: "dropped",
      why: "Contained resources are not imported; the reference is dropped.",
    };
  if (p.kind === "relative" || p.kind === "conditional") {
    if (!isMappedType(p.type) || p.type === "Organization") {
      return { kind: "dropped", why: `${p.type} is not imported; the reference is dropped.` };
    }
    const id =
      p.kind === "relative"
        ? (await lookup.exists(p.type, p.id))
          ? p.id
          : null
        : await lookup.byIdentifier(p.type, p.system, p.value);
    return id ? { kind: "found", ref: { type: p.type, id } } : { kind: "unresolved" };
  }
  return { kind: "unresolved" };
}

/**
 * Synthea writes no Observation.performer and no CarePlan.author. When the resource names an
 * Encounter in the bundle whose participant resolves to a CarePath practitioner (in the bundle,
 * or through a conditional reference such as `Practitioner?identifier=<npi system>|<npi>`), that
 * practitioner is used and the report says so. Otherwise the mapper reports the missing field.
 */
async function deriveFromEncounter(
  resource: Resource,
  index: BundleIndex,
  states: Map<number, EntryState>,
  lookup: ImportLookup,
): Promise<{
  resource: Resource;
  reference: string;
  practitionerId: string;
  field: string;
  message: string;
} | null> {
  const field =
    resource.resourceType === "Observation" &&
    !(resource as { performer?: unknown[] }).performer?.length
      ? "performer"
      : resource.resourceType === "CarePlan" && !(resource as { author?: unknown }).author
        ? "author"
        : null;
  if (!field) return null;
  const encRef = (resource as { encounter?: Reference }).encounter?.reference;
  if (!encRef) return null;
  const enc = index.resolve(encRef);
  if (enc.kind !== "entry" || enc.type !== "Encounter") return null;
  const encounter = index.entry(enc.index)!.resource as Encounter;
  for (const p of encounter.participant ?? []) {
    const raw = p.individual?.reference;
    if (!raw) continue;
    let practitionerId: string | null = null;
    const inBundle = index.resolve(raw);
    if (inBundle.kind === "entry" && inBundle.type === "Practitioner") {
      const t = states.get(inBundle.index)!;
      practitionerId = t.blocked ? null : t.finalId;
    } else {
      const parsed = parseReference(raw);
      if (parsed.kind === "conditional" && parsed.type === "Practitioner") {
        practitionerId = await lookup.byIdentifier("Practitioner", parsed.system, parsed.value);
      }
    }
    if (!practitionerId) continue;
    const reference = `Practitioner/${practitionerId}`;
    const value: Reference = { reference, type: "Practitioner" };
    return {
      resource: { ...resource, [field]: field === "performer" ? [value] : value } as Resource,
      reference,
      practitionerId,
      field,
      message: `${field} taken from the practitioner of the referenced Encounter (${raw}).`,
    };
  }
  return null;
}

function setId(type: MappedType, record: RecordByType[MappedType], id: string) {
  if (type === "CarePlan") (record as CarePlanRecord).versionId = id;
  else (record as { id: string }).id = id;
}

function extraChecks(type: MappedType, r: RecordByType[MappedType]): FhirIssue[] {
  const out: FhirIssue[] = [];
  const bad = (rule: string, message: string, expression: string) =>
    out.push(issue("import", "error", "business-rule", rule, message, expression));
  if (type === "Patient") {
    const p = r as PatientRecord;
    if (p.birthDate < "1900-01-01")
      bad("import.patient.birthDate", "CarePath stores birth dates from 1900 onward.", "birthDate");
  }
  if (type === "Goal") {
    const g = r as GoalRecord;
    if (g.startDate && g.dueDate && g.dueDate < g.startDate)
      bad("import.goal.dates", "Goal due date is before its start date.", "target[0].dueDate");
    if (g.targetValue !== null && Math.abs(g.targetValue) >= 1e8)
      bad(
        "import.goal.target",
        "Goal target value is out of range.",
        "target[0].detailQuantity.value",
      );
  }
  if (type === "Observation") {
    const o = r as ObservationRecord;
    if (o.valueQuantity !== null && Math.abs(o.valueQuantity) >= 1e8)
      bad("import.observation.value", "Observation value is out of range.", "valueQuantity.value");
  }
  return out;
}

async function findDuplicate(
  type: MappedType,
  s: EntryState,
  record: RecordByType[MappedType],
  seen: Map<string, EntryState>,
  lookup: ImportLookup,
): Promise<{ id: string; rule: string; message: string } | null> {
  const res = s.entry.resource;
  const idKeys: { system: string | null; value: string }[] = [];
  if (type === "Patient") {
    const chosen = chosenPatientIdentifier(res as never, lookup.orgSlug);
    if (chosen?.value) idKeys.push({ system: chosen.system ?? null, value: chosen.value });
  } else if (type === "Practitioner") {
    for (const id of res.identifier ?? [])
      if (id.value) idKeys.push({ system: id.system ?? null, value: id.value });
  } else {
    for (const id of res.identifier ?? []) {
      const kind = parseIdentifierSystem(id.system)?.kind;
      const own = type === "CarePlan" ? kind === "care-plan-version" : kind !== undefined;
      if (own && id.value) idKeys.push({ system: id.system!, value: id.value });
    }
  }
  const nk = naturalKey(type, record as never);
  const keys = [
    ...idKeys.map((k) => `${type}|id|${k.system ?? ""}|${k.value}`),
    `${type}|nk|${nk}`,
  ];
  for (const k of keys) {
    const first = seen.get(k);
    if (first && first !== s) {
      return {
        id: first.finalId!,
        rule: "dup.in-bundle",
        message: `Duplicates entry ${first.entry.index} of this bundle by ${k.includes("|id|") ? "identifier" : "natural key"}.`,
      };
    }
  }
  for (const k of keys) seen.set(k, s);
  for (const k of idKeys) {
    const id = await lookup.byIdentifier(type, k.system, k.value);
    if (id)
      return {
        id,
        rule: "dup.existing",
        message: `Duplicate of existing ${type} ${id} by identifier.`,
      };
  }
  const id = await lookup.byNaturalKey(type, nk, record as never);
  if (id)
    return {
      id,
      rule: "dup.existing",
      message: `Duplicate of existing ${type} ${id} by natural key.`,
    };
  return null;
}

/**
 * CarePlan resources of one CarePath plan (same care-plan identifier) become one plan with its
 * versions in order; any other CarePlan is a plan of its own. CarePath keeps one open plan per
 * patient and does not import drafts, so such plans are skipped with a warning.
 */
async function groupCarePlans(
  states: Map<number, EntryState>,
  records: Map<number, RecordByType[MappedType]>,
  plan: ImportPlan,
  issues: FhirIssue[],
  options: ImportOptions,
) {
  const groups = new Map<string, EntryState[]>();
  for (const s of states.values()) {
    if (s.type !== "CarePlan" || s.action !== "create") continue;
    const id = s.entry.resource.identifier?.find(
      (x) => parseIdentifierSystem(x.system)?.kind === "care-plan",
    );
    const key = id?.value ? `${id.system}|${id.value}` : `entry:${s.entry.index}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const openPlanned = new Set<string>();
  const skip = (
    members: EntryState[],
    rule: string,
    message: string,
    severity: "warning" | "error" = "warning",
  ) => {
    for (const m of members) {
      m.action = severity === "error" ? "invalid" : "skipped";
      issues.push(issue("import", severity, "business-rule", rule, message, at(m.entry.index)));
    }
  };
  for (const members of groups.values()) {
    const versions = members
      .map((m) => ({ m, r: records.get(m.entry.index) as CarePlanRecord }))
      .sort(
        (a, b) =>
          a.r.versionNumber - b.r.versionNumber || a.r.publishedAt.localeCompare(b.r.publishedAt),
      );
    const latest = versions[versions.length - 1]!.r;
    if (latest.status === "draft") {
      skip(
        members,
        "import.careplan.draft",
        "Draft care plans are not imported; only published versions are.",
      );
      continue;
    }
    const missingNote = versions.findIndex((v, k) => k > 0 && !v.r.changeNoteForPatient?.trim());
    if (missingNote >= 0) {
      skip(
        members,
        "import.careplan.change-note",
        "Every version after the first needs a patient-facing change note (CarePlan.note).",
        "error",
      );
      continue;
    }
    const open = latest.status === "active" || latest.status === "on_hold";
    if (
      open &&
      (openPlanned.has(latest.patientId) ||
        (await options.lookup.hasOpenCarePlan(latest.patientId)))
    ) {
      skip(
        members,
        "import.careplan.open-exists",
        "The patient already has an open care plan; CarePath keeps one open plan per patient.",
      );
      continue;
    }
    if (open) openPlanned.add(latest.patientId);
    const planId = options.newId();
    const out: CarePlanRecord[] = [];
    for (const [k, { m, r }] of versions.entries()) {
      const activities = [];
      for (const [ai, a] of r.activities.entries()) {
        const where = `${at(m.entry.index)}.activity[${ai}]`;
        const doseOk =
          (a.reps ?? a.durationSeconds ?? a.holdSeconds) !== null &&
          [a.sets, a.reps, a.holdSeconds, a.durationSeconds].every((v) => v === null || v >= 1) &&
          a.restSeconds >= 0 &&
          a.restSeconds <= 600 &&
          a.timesPerDay >= 1 &&
          a.timesPerDay <= 6;
        if (!(await options.lookup.exerciseExists(a.exerciseSlug))) {
          issues.push(
            issue(
              "import",
              "warning",
              "not-found",
              "import.careplan.exercise-missing",
              `Exercise "${a.exerciseSlug}" is not in this organization's library; the activity is not imported.`,
              where,
            ),
          );
        } else if (!doseOk) {
          issues.push(
            issue(
              "import",
              "warning",
              "business-rule",
              "import.careplan.dose",
              "Activity dose is outside CarePath's limits; the activity is not imported.",
              where,
            ),
          );
        } else activities.push(a);
      }
      out.push({ ...r, carePlanId: planId, versionNumber: k + 1, activities });
      if (r.versionNumber !== k + 1) {
        issues.push(
          issue(
            "import",
            "information",
            "informational",
            "import.careplan.renumbered",
            `Version ${r.versionNumber} is stored as version ${k + 1}.`,
            at(m.entry.index),
          ),
        );
      }
    }
    plan.creates.carePlans.push({
      id: planId,
      patientId: latest.patientId,
      title: latest.title,
      status: latest.status,
      versions: out,
    });
    const goalIds = new Set(latest.goalIds);
    for (const g of plan.creates.goals) if (goalIds.has(g.id)) g.carePlanId = planId;
  }
}
