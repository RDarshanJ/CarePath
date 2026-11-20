import type { Bundle, Resource } from "@medplum/fhirtypes";
import { carePlanToFhir } from "./mappers/care-plan.js";
import type { ToFhirContext } from "./mappers/common.js";
import { goalToFhir } from "./mappers/goal.js";
import { observationToFhir } from "./mappers/observation.js";
import { organizationToFhir } from "./mappers/organization.js";
import { patientToFhir } from "./mappers/patient.js";
import { practitionerToFhir } from "./mappers/practitioner.js";
import type {
  CarePlanRecord,
  GoalRecord,
  ObservationRecord,
  OrganizationRecord,
  PatientRecord,
  PractitionerRecord,
} from "./types.js";

export interface PatientExport {
  organization: OrganizationRecord;
  patient: PatientRecord;
  /** Every practitioner the plans and observations name; others are left out. */
  practitioners: PractitionerRecord[];
  carePlans: CarePlanRecord[];
  goals: GoalRecord[];
  observations: ObservationRecord[];
}

/**
 * One patient's record as a `collection` Bundle (research HD section 5): no entry.request
 * (bdl-3), fullUrl `urn:uuid:<id>` on every entry and every reference written the same way, and
 * referenced entries ordered before the entries that reference them. Pure: the caller passes the
 * timestamp. Validate the result with validateBundle(..., { mode: "export" }).
 */
export function buildPatientBundle(data: PatientExport, timestamp: string): Bundle {
  const ctx: ToFhirContext = {
    orgSlug: data.organization.slug,
    organizationId: data.organization.id,
  };
  const resources: Resource[] = [
    organizationToFhir(data.organization),
    ...data.practitioners.map((p) => practitionerToFhir(p, ctx)),
    patientToFhir(data.patient, ctx),
    ...data.goals.map((g) => goalToFhir(g, ctx)),
    ...[...data.carePlans]
      .sort((a, b) => a.versionNumber - b.versionNumber)
      .map((c) => carePlanToFhir(c, ctx)),
    ...data.observations.map((o) => observationToFhir(o, ctx)),
  ];
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp,
    entry: resources.map((resource) => ({ fullUrl: `urn:uuid:${resource.id}`, resource })),
  };
}
