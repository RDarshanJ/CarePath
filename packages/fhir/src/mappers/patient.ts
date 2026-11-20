import type { Identifier, Patient } from "@medplum/fhirtypes";
import { identifierSystem, SYSTEMS } from "../config.js";
import type { AdministrativeGender, PatientRecord } from "../types.js";
import { dateOnly, mapIssue, ref, type MapResult, type ToFhirContext } from "./common.js";

/**
 * Patient (US Core mandatory: identifier, name, gender). The MRN is an identifier, never the
 * resource id (research HD section 1.2). Credentials, intake answers and status are not exported.
 */
export function patientToFhir(p: PatientRecord, ctx: ToFhirContext): Patient {
  const telecom = [
    ...(p.phone ? [{ system: "phone" as const, value: p.phone }] : []),
    ...(p.email ? [{ system: "email" as const, value: p.email }] : []),
  ];
  return {
    resourceType: "Patient",
    id: p.id,
    identifier: [
      {
        type: {
          coding: [
            { system: SYSTEMS.v2IdentifierType, code: "MR", display: "Medical record number" },
          ],
        },
        system: identifierSystem(ctx.orgSlug, "mrn"),
        value: p.mrn,
      },
    ],
    active: p.active,
    name: [{ use: "official", family: p.familyName, given: [p.givenName] }],
    ...(telecom.length ? { telecom } : {}),
    gender: p.gender,
    birthDate: p.birthDate,
    communication: [
      { language: { coding: [{ system: SYSTEMS.bcp47, code: p.preferredLanguage }] } },
    ],
    managingOrganization: ref("Organization", ctx.organizationId),
  };
}

/**
 * The identifier CarePath keeps as the MRN: the organization's own MRN system first, then any
 * identifier typed MR, then the first identifier with a value. Import and duplicate detection
 * use the same choice, so re-importing a bundle finds the same key.
 */
export function chosenPatientIdentifier(r: Patient, orgSlug: string | null): Identifier | null {
  const ids = (r.identifier ?? []).filter((i) => i.value);
  return (
    (orgSlug ? ids.find((i) => i.system === identifierSystem(orgSlug, "mrn")) : undefined) ??
    ids.find((i) => /^urn:carepath:[a-z0-9-]+:mrn$/.test(i.system ?? "")) ??
    ids.find((i) => i.type?.coding?.some((c) => c.code === "MR")) ??
    ids[0] ??
    null
  );
}

const GENDERS: readonly AdministrativeGender[] = ["female", "male", "other", "unknown"];

export function patientFromFhir(
  r: Patient,
  orgSlug: string | null = null,
): MapResult<PatientRecord> {
  const issues = [];
  const id = chosenPatientIdentifier(r, orgSlug);
  const name = r.name?.find((n) => n.use === "official") ?? r.name?.[0];
  const birthDate = dateOnly(r.birthDate);
  if (!id?.value)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.patient.identifier",
        "Patient has no identifier value to keep as the MRN.",
        "identifier",
      ),
    );
  if (!name?.family || !name.given?.length)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.patient.name",
        "Patient needs a family name and a given name.",
        "name",
      ),
    );
  if (!birthDate)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.patient.birthDate",
        "CarePath requires a birth date for every patient.",
        "birthDate",
      ),
    );
  if (issues.length) return { record: null, issues };
  const gender = GENDERS.find((g) => g === r.gender) ?? "unknown";
  return {
    record: {
      id: r.id ?? "",
      mrn: id!.value!,
      givenName: name!.given!.join(" "),
      familyName: name!.family!,
      birthDate: birthDate!,
      gender,
      email: r.telecom?.find((t) => t.system === "email")?.value ?? null,
      phone: r.telecom?.find((t) => t.system === "phone")?.value ?? null,
      preferredLanguage:
        r.communication?.find((c) => c.preferred)?.language.coding?.[0]?.code ??
        r.communication?.[0]?.language.coding?.[0]?.code ??
        "en",
      active: r.active ?? true,
    },
    issues: [],
  };
}
