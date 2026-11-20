/**
 * FHIR configuration constants (advisor plan revision 1, FHIR amendments).
 *
 * One US Core version for export and import. CarePath writes US Core-aligned shapes and checks
 * them with its own rules; it does not claim profile conformance, so `meta.profile` is never
 * written. Mandatory-element lists were read from US Core 7.0.0 to 9.0.0 pages (research HD
 * section 4); differences against 6.1.0 are unverified.
 */
export const FHIR_VERSION = "4.0.1";
export const US_CORE_VERSION = "6.1.0";

/** Code systems and identifier systems used by the mappers. */
export const SYSTEMS = {
  loinc: "http://loinc.org",
  ucum: "http://unitsofmeasure.org",
  npi: "http://hl7.org/fhir/sid/us-npi",
  bcp47: "urn:ietf:bcp:47",
  v2IdentifierType: "http://terminology.hl7.org/CodeSystem/v2-0203",
  observationCategory: "http://terminology.hl7.org/CodeSystem/observation-category",
  dataAbsentReason: "http://terminology.hl7.org/CodeSystem/data-absent-reason",
  carePlanCategory: "http://hl7.org/fhir/us/core/CodeSystem/careplan-category",
  conditionClinical: "http://terminology.hl7.org/CodeSystem/condition-clinical",
  conditionVerification: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
  conditionCategory: "http://terminology.hl7.org/CodeSystem/condition-category",
  /** US Core's code system for `health-concern`; not in the R4 definitions here, so unverified. */
  usCoreConditionCategory: "http://hl7.org/fhir/us/core/CodeSystem/condition-category",
  v3ActCode: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  appointmentCancellationReason:
    "http://terminology.hl7.org/CodeSystem/appointment-cancellation-reason",
  /** US Core DocumentReference category (`clinical-note`); not in the R4 definitions, unverified. */
  usCoreDocumentReferenceCategory:
    "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category",
  /** Local code systems: CarePath appointment and visit types (no verified standard codes). */
  appointmentType: "urn:carepath:appointment-type",
  encounterType: "urn:carepath:encounter-type",
  /** Local code system for exercises in the organization library (no verified standard codes). */
  exercise: "urn:carepath:exercise",
  /** Organization identifiers: value is the organization slug. */
  organization: "urn:carepath:organization",
  /** Rule ids in OperationOutcome.issue.details.coding. */
  checkRule: "urn:carepath:fhir-check",
} as const;

/** Business identifier systems scoped to one organization: urn:carepath:<org-slug>:<kind>. */
export type IdentifierKind =
  | "mrn"
  | "staff"
  | "care-plan"
  | "care-plan-version"
  | "goal"
  | "observation"
  | "condition"
  | "appointment"
  | "encounter"
  | "clinical-note"
  | "clinical-note-version";

export function identifierSystem(orgSlug: string, kind: IdentifierKind): string {
  return `urn:carepath:${orgSlug}:${kind}`;
}

/** Parses urn:carepath:<slug>:<kind>; null for any other system. */
export function parseIdentifierSystem(
  system: string | undefined,
): { orgSlug: string; kind: IdentifierKind } | null {
  const m = /^urn:carepath:([a-z0-9]+(?:-[a-z0-9]+)*):([a-z-]+)$/.exec(system ?? "");
  if (!m) return null;
  const kinds: IdentifierKind[] = [
    "mrn",
    "staff",
    "care-plan",
    "care-plan-version",
    "goal",
    "observation",
    "condition",
    "appointment",
    "encounter",
    "clinical-note",
    "clinical-note-version",
  ];
  const kind = kinds.find((k) => k === m[2]);
  return kind ? { orgSlug: m[1]!, kind } : null;
}

/** CarePath extensions. Local URNs: they are not published StructureDefinitions. */
export const EXTENSIONS = {
  carePlanVersionNumber: "urn:carepath:extension:care-plan-version-number",
  exerciseDose: "urn:carepath:extension:exercise-dose",
  bookedTimezone: "urn:carepath:extension:booked-timezone",
  noteVersionNumber: "urn:carepath:extension:clinical-note-version-number",
  amendmentReason: "urn:carepath:extension:amendment-reason",
} as const;
