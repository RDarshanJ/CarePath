import type { Resource } from "@medplum/fhirtypes";
import type { MappedType, RecordByType } from "../types.js";
import { carePlanFromFhir, carePlanToFhir } from "./care-plan.js";
import type { FromFhirContext, MapResult, ToFhirContext } from "./common.js";
import { goalFromFhir, goalToFhir } from "./goal.js";
import { observationFromFhir, observationToFhir } from "./observation.js";
import { organizationFromFhir, organizationToFhir } from "./organization.js";
import { patientFromFhir, patientToFhir } from "./patient.js";
import { practitionerFromFhir, practitionerToFhir } from "./practitioner.js";

export * from "./common.js";
export { carePlanFromFhir, carePlanToFhir } from "./care-plan.js";
export { goalFromFhir, goalToFhir } from "./goal.js";
export { observationFromFhir, observationToFhir } from "./observation.js";
export { organizationFromFhir, organizationToFhir } from "./organization.js";
export { chosenPatientIdentifier, patientFromFhir, patientToFhir } from "./patient.js";
export { chosenStaffId, practitionerFromFhir, practitionerToFhir } from "./practitioner.js";

export interface MapperContext extends FromFhirContext {
  /** Slug of the importing organization, for choosing its own identifiers first. */
  orgSlug: string | null;
}

/**
 * One entry per mapped resource type. Batch 2 (Condition, Appointment, Encounter,
 * DocumentReference) adds rows here, a RecordByType member, required checks in
 * validate/carepath.ts and allowed targets in references.ts.
 */
export const mappers: {
  [T in MappedType]: {
    toFhir(record: RecordByType[T], ctx: ToFhirContext): Resource;
    fromFhir(resource: Resource, ctx: MapperContext): MapResult<RecordByType[T]>;
  };
} = {
  Organization: {
    toFhir: (r) => organizationToFhir(r),
    fromFhir: (r) => organizationFromFhir(r as never),
  },
  Patient: {
    toFhir: (r, c) => patientToFhir(r, c),
    fromFhir: (r, c) => patientFromFhir(r as never, c.orgSlug),
  },
  Practitioner: {
    toFhir: (r, c) => practitionerToFhir(r, c),
    fromFhir: (r, c) => practitionerFromFhir(r as never, c.orgSlug),
  },
  Goal: {
    toFhir: (r, c) => goalToFhir(r, c),
    fromFhir: (r, c) => goalFromFhir(r as never, c),
  },
  CarePlan: {
    toFhir: (r, c) => carePlanToFhir(r, c),
    fromFhir: (r, c) => carePlanFromFhir(r as never, c),
  },
  Observation: {
    toFhir: (r, c) => observationToFhir(r, c),
    fromFhir: (r, c) => observationFromFhir(r as never, c),
  },
};
