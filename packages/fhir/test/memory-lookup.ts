/**
 * In-memory organization for import tests: it applies an ImportPlan the way the API repository
 * does and answers ImportLookup from what it holds. Same semantics as apps/api/src/modules/fhir.
 */
import {
  identifierSystem,
  naturalKey,
  parseIdentifierSystem,
  SYSTEMS,
  type CarePlanRecord,
  type ConditionRecord,
  type EncounterRecord,
  type GoalRecord,
  type ImportLookup,
  type ImportPlan,
  type MappedType,
  type ObservationRecord,
  type PatientRecord,
  type PractitionerRecord,
} from "../src/index.js";

export class MemoryOrg implements ImportLookup {
  patients: PatientRecord[] = [];
  practitioners: PractitionerRecord[] = [];
  goals: (GoalRecord & { carePlanId: string | null })[] = [];
  versions: CarePlanRecord[] = [];
  plans: { id: string; patientId: string; status: string }[] = [];
  observations: ObservationRecord[] = [];
  encounters: EncounterRecord[] = [];
  conditions: ConditionRecord[] = [];
  exercises = new Set<string>(["quad-sets", "walk"]);

  constructor(
    readonly orgId: string,
    readonly orgSlug: string,
  ) {}

  apply(plan: ImportPlan) {
    this.practitioners.push(...plan.creates.practitioners);
    this.patients.push(...plan.creates.patients);
    this.goals.push(...plan.creates.goals);
    this.observations.push(...plan.creates.observations);
    this.encounters.push(...plan.creates.encounters);
    this.conditions.push(...plan.creates.conditions);
    for (const p of plan.creates.carePlans) {
      this.plans.push({ id: p.id, patientId: p.patientId, status: p.status });
      this.versions.push(...p.versions);
    }
  }

  async exists(type: MappedType, id: string) {
    const list: { id?: string; versionId?: string }[] =
      type === "Patient"
        ? this.patients
        : type === "Practitioner"
          ? this.practitioners
          : type === "Goal"
            ? this.goals
            : type === "Observation"
              ? this.observations
              : type === "CarePlan"
                ? this.versions
                : type === "Encounter"
                  ? this.encounters
                  : type === "Condition"
                    ? this.conditions
                    : [];
    return list.some((r) => (r.id ?? r.versionId) === id);
  }

  async byIdentifier(type: MappedType, system: string | null, value: string) {
    if (type === "Patient") return this.patients.find((p) => p.mrn === value)?.id ?? null;
    if (type === "Practitioner") {
      return (
        (system === SYSTEMS.npi
          ? this.practitioners.find((p) => p.npi === value)
          : this.practitioners.find((p) => p.staffId === value)
        )?.id ?? null
      );
    }
    const parsed = parseIdentifierSystem(system ?? undefined);
    if (!parsed || system !== identifierSystem(this.orgSlug, parsed.kind)) return null;
    return (await this.exists(type, value)) ? value : null;
  }

  async byNaturalKey<T extends MappedType>(type: T, key: string) {
    const table: Record<string, { id: string; rec: unknown }[]> = {
      Patient: this.patients.map((r) => ({ id: r.id, rec: r })),
      Practitioner: this.practitioners.map((r) => ({ id: r.id, rec: r })),
      Goal: this.goals.map((r) => ({ id: r.id, rec: r })),
      Observation: this.observations.map((r) => ({ id: r.id, rec: r })),
      CarePlan: this.versions.map((r) => ({ id: r.versionId, rec: r })),
      Encounter: this.encounters.map((r) => ({ id: r.id, rec: r })),
      Condition: this.conditions.map((r) => ({ id: r.id, rec: r })),
    };
    return (table[type] ?? []).find((x) => naturalKey(type, x.rec as never) === key)?.id ?? null;
  }

  async hasOpenCarePlan(patientId: string) {
    return this.plans.some(
      (p) => p.patientId === patientId && ["draft", "active", "on_hold"].includes(p.status),
    );
  }

  async exerciseExists(slug: string) {
    return this.exercises.has(slug);
  }
}
