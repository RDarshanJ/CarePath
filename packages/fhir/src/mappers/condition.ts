import type { Condition } from "@medplum/fhirtypes";
import { identifierSystem, SYSTEMS } from "../config.js";
import {
  conditionCategoryFromFhir,
  conditionCategoryToFhir,
  conditionClinicalFromFhir,
  conditionVerificationFromFhir,
  conditionVerificationToFhir,
} from "../codes.js";
import type { FhirIssue } from "../issues.js";
import type { ConditionRecord } from "../types.js";
import {
  dateOnly,
  instantUtc,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

/**
 * Condition (US Core Problems and Health Concerns, Encounter Diagnosis: category, code, subject
 * mandatory; clinicalStatus, verificationStatus, onset, abatement, recordedDate Must Support).
 * con-5: no clinicalStatus when verificationStatus is entered-in-error. Codes keep the system
 * they came with (CarePath's synthetic codes, SNOMED CT from Synthea); no terminology is bundled.
 * Onset and abatement are dates (the column is a date), written as date-precision dateTimes.
 */
export function conditionToFhir(c: ConditionRecord, ctx: ToFhirContext): Condition {
  return {
    resourceType: "Condition",
    id: c.id,
    identifier: [{ system: identifierSystem(ctx.orgSlug, "condition"), value: c.id }],
    ...(c.clinicalStatus
      ? {
          clinicalStatus: {
            coding: [{ system: SYSTEMS.conditionClinical, code: c.clinicalStatus }],
          },
        }
      : {}),
    verificationStatus: {
      coding: [
        {
          system: SYSTEMS.conditionVerification,
          code: conditionVerificationToFhir(c.verificationStatus),
        },
      ],
    },
    category: [{ coding: [conditionCategoryToFhir(c.category)] }],
    code: { coding: [{ system: c.codeSystem, code: c.code, display: c.display }], text: c.display },
    ...(c.bodySite ? { bodySite: [{ text: c.bodySite }] } : {}),
    subject: ref("Patient", c.patientId),
    ...(c.encounterId ? { encounter: ref("Encounter", c.encounterId) } : {}),
    ...(c.onsetDate ? { onsetDateTime: c.onsetDate } : {}),
    ...(c.abatementDate ? { abatementDateTime: c.abatementDate } : {}),
    ...(c.recordedAt ? { recordedDate: c.recordedAt } : {}),
    ...(c.recordedByPractitionerId
      ? { recorder: ref("Practitioner", c.recordedByPractitionerId) }
      : {}),
    ...(c.note ? { note: [{ text: c.note }] } : {}),
  };
}

export function conditionFromFhir(r: Condition, ctx: FromFhirContext): MapResult<ConditionRecord> {
  const issues: FhirIssue[] = [];
  const categoryCode = r.category?.flatMap((c) => c.coding ?? []).find((c) => c.code)?.code;
  const category = conditionCategoryFromFhir(categoryCode);
  const coding = r.code?.coding?.find((c) => c.code && c.system);
  const subject = ctx.resolve(r.subject, "subject");
  const clinicalCode = r.clinicalStatus?.coding?.find(
    (c) => c.system === SYSTEMS.conditionClinical,
  )?.code;
  const clinical = r.clinicalStatus ? conditionClinicalFromFhir(clinicalCode) : null;
  const verificationCode = r.verificationStatus?.coding?.find(
    (c) => c.system === SYSTEMS.conditionVerification,
  )?.code;
  const verification = r.verificationStatus
    ? conditionVerificationFromFhir(verificationCode)
    : "unconfirmed";

  if (!category)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.condition.category",
        `Condition category "${categoryCode ?? ""}" is not one CarePath stores (problem-list-item, encounter-diagnosis, health-concern).`,
        "category",
      ),
    );
  if (!coding)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.condition.code",
        "Condition code needs a coding with a system and a code.",
        "code",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.condition.subject",
        "Condition subject must be a patient.",
        "subject",
      ),
    );
  if (r.clinicalStatus && !clinical)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.condition.clinicalStatus",
        `Condition clinicalStatus "${clinicalCode ?? ""}" is not a condition-clinical code.`,
        "clinicalStatus",
      ),
    );
  if (!verification)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.condition.verificationStatus",
        `Condition verificationStatus "${verificationCode ?? ""}" is not a condition-ver-status code.`,
        "verificationStatus",
      ),
    );
  if (!r.verificationStatus)
    issues.push(
      mapIssue(
        "information",
        "informational",
        "map.condition.verification-defaulted",
        "No verificationStatus; stored as unconfirmed.",
        "verificationStatus",
      ),
    );
  if (issues.some((i) => i.severity === "error")) return { record: null, issues };

  const encounter = r.encounter ? ctx.resolve(r.encounter, "encounter") : null;
  const recorder = r.recorder ? ctx.resolve(r.recorder, "recorder") : null;
  return {
    record: {
      id: r.id ?? "",
      patientId: subject!.id,
      encounterId: encounter?.type === "Encounter" ? encounter.id : null,
      codeSystem: coding!.system!,
      code: coding!.code!,
      display: coding!.display ?? r.code?.text ?? coding!.code!,
      category: category!,
      clinicalStatus: clinical,
      verificationStatus: verification!,
      bodySite: r.bodySite?.[0]?.text ?? r.bodySite?.[0]?.coding?.[0]?.display ?? null,
      onsetDate: dateOnly(r.onsetDateTime ?? r.onsetPeriod?.start),
      abatementDate: dateOnly(r.abatementDateTime ?? r.abatementPeriod?.start),
      recordedByPractitionerId: recorder?.type === "Practitioner" ? recorder.id : null,
      note: r.note?.map((n) => n.text).join("\n\n") || null,
      recordedAt: instantUtc(r.recordedDate),
    },
    issues,
  };
}
