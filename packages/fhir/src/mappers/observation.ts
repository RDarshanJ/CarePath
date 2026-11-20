import type { Observation } from "@medplum/fhirtypes";
import { identifierSystem, SYSTEMS } from "../config.js";
import {
  FHIR_CODES,
  observationCategoryFromFhir,
  observationCategoryToFhir,
  observationStatusFromFhir,
  observationStatusToFhir,
} from "../codes.js";
import type { FhirIssue } from "../issues.js";
import type { ObservationRecord } from "../types.js";
import {
  instantUtc,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

/**
 * Observation (US Core mandatory: status, category, code, subject). Pain uses LOINC 72514-3
 * with category survey. A value or a dataAbsentReason, never both (obs-6). Numeric values carry
 * UCUM. Observation.encounter names the visit the observation was captured in (batch 2).
 */
export function observationToFhir(o: ObservationRecord, ctx: ToFhirContext): Observation {
  const dar = o.dataAbsentReason;
  return {
    resourceType: "Observation",
    id: o.id,
    identifier: [{ system: identifierSystem(ctx.orgSlug, "observation"), value: o.id }],
    status: observationStatusToFhir(o.status) as Observation["status"],
    category: [
      {
        coding: [
          { system: SYSTEMS.observationCategory, code: observationCategoryToFhir(o.category) },
        ],
      },
    ],
    code: { coding: [{ system: o.codeSystem, code: o.code, display: o.display }], text: o.display },
    subject: ref("Patient", o.patientId),
    ...(o.encounterId ? { encounter: ref("Encounter", o.encounterId) } : {}),
    effectiveDateTime: o.effectiveAt,
    issued: o.recordedAt,
    performer: [
      o.performerType === "patient"
        ? ref("Patient", o.patientId)
        : ref("Practitioner", o.performerPractitionerId ?? ""),
    ],
    ...(o.valueQuantity !== null
      ? {
          valueQuantity: {
            value: o.valueQuantity,
            ...(o.valueUnit ? { unit: o.valueUnit, system: SYSTEMS.ucum, code: o.valueUnit } : {}),
          },
        }
      : {}),
    ...(o.valueString !== null ? { valueString: o.valueString } : {}),
    ...(dar !== null
      ? {
          dataAbsentReason: (FHIR_CODES.dataAbsentReason as readonly string[]).includes(dar)
            ? { coding: [{ system: SYSTEMS.dataAbsentReason, code: dar }] }
            : { text: dar },
        }
      : {}),
  };
}

export function observationFromFhir(
  r: Observation,
  ctx: FromFhirContext,
): MapResult<ObservationRecord> {
  const issues: FhirIssue[] = [];
  const status = observationStatusFromFhir(r.status);
  const categoryCode = r.category?.flatMap((c) => c.coding ?? []).find((c) => c.code)?.code;
  const category = observationCategoryFromFhir(categoryCode);
  const coding = r.code?.coding?.find((c) => c.code && c.system);
  const subject = ctx.resolve(r.subject, "subject");
  const performer = r.performer?.[0] ? ctx.resolve(r.performer[0], "performer[0]") : null;
  // An encounter that is not stored (an emergency visit, say) leaves the link empty.
  const encounter = r.encounter ? ctx.resolve(r.encounter, "encounter") : null;
  const effective = instantUtc(r.effectiveDateTime) ?? instantUtc(r.effectivePeriod?.start);
  const valueString =
    r.valueString ??
    r.valueCodeableConcept?.text ??
    r.valueCodeableConcept?.coding?.[0]?.display ??
    null;

  if (!status)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.observation.status",
        `Observation status "${r.status ?? ""}" is not one CarePath stores.`,
        "status",
      ),
    );
  if (!category)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.observation.category",
        `Observation category "${categoryCode ?? ""}" is not one CarePath stores (survey, activity, exam, vital-signs).`,
        "category",
      ),
    );
  if (!coding)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.observation.code",
        "Observation code needs a coding with a system and a code.",
        "code",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.observation.subject",
        "Observation subject must be a patient.",
        "subject",
      ),
    );
  if (!performer || (performer.type !== "Patient" && performer.type !== "Practitioner"))
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.observation.performer",
        "CarePath records who performed every observation: a patient or a practitioner.",
        "performer",
      ),
    );
  else if (performer.type === "Patient" && subject && performer.id !== subject.id)
    issues.push(
      mapIssue(
        "error",
        "business-rule",
        "map.observation.performer-patient",
        "A patient can only report observations about themselves.",
        "performer[0]",
      ),
    );
  if (!effective)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.observation.effective",
        "Observation needs an effectiveDateTime with a time.",
        "effectiveDateTime",
      ),
    );
  if (r.valueQuantity === undefined && valueString === null && !r.dataAbsentReason)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.observation.value",
        "Observation has no value CarePath stores (Quantity, string or coded text) and no dataAbsentReason.",
        "value[x]",
      ),
    );
  if (r.valueQuantity !== undefined && typeof r.valueQuantity.value !== "number")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.observation.valueQuantity",
        "valueQuantity has no number.",
        "valueQuantity.value",
      ),
    );
  if (issues.length) return { record: null, issues };

  const dar = r.dataAbsentReason
    ? (r.dataAbsentReason.coding?.[0]?.code ?? r.dataAbsentReason.text ?? "unknown")
    : null;
  const hasQuantity = r.valueQuantity !== undefined;
  return {
    record: {
      id: r.id ?? "",
      patientId: subject!.id,
      status: status!,
      category: category!,
      codeSystem: coding!.system!,
      code: coding!.code!,
      display: coding!.display ?? r.code.text ?? coding!.code!,
      valueQuantity: hasQuantity ? r.valueQuantity!.value! : null,
      valueUnit: hasQuantity ? (r.valueQuantity!.code ?? r.valueQuantity!.unit ?? null) : null,
      valueString: hasQuantity || dar !== null ? null : valueString,
      dataAbsentReason: hasQuantity ? null : dar,
      performerType: performer!.type === "Patient" ? "patient" : "practitioner",
      performerPractitionerId: performer!.type === "Practitioner" ? performer!.id : null,
      encounterId: encounter?.type === "Encounter" ? encounter.id : null,
      effectiveAt: effective!,
      recordedAt: instantUtc(r.issued) ?? effective!,
    },
    issues: [],
  };
}
