import type { Practitioner } from "@medplum/fhirtypes";
import { identifierSystem, SYSTEMS } from "../config.js";
import { isValidNpi } from "../codes.js";
import type { PractitionerRecord } from "../types.js";
import { identifierValue, mapIssue, type MapResult, type ToFhirContext } from "./common.js";

/**
 * Practitioner (US Core mandatory: identifier, name). Only clinicians have a Practitioner row,
 * so administrative staff are never exported as clinical actors. The NPI identifier is written
 * only when the row has one that passes the check digit (us-core-17): a stored value that fails
 * it is not an NPI, so it is left out rather than sent under the NPI system (WP 5.4b found the
 * seed's fictitious `9…` values fail it; the staff identifier still identifies the clinician).
 */
export function practitionerToFhir(p: PractitionerRecord, ctx: ToFhirContext): Practitioner {
  return {
    resourceType: "Practitioner",
    id: p.id,
    identifier: [
      { system: identifierSystem(ctx.orgSlug, "staff"), value: p.staffId },
      ...(p.npi && isValidNpi(p.npi) ? [{ system: SYSTEMS.npi, value: p.npi }] : []),
    ],
    active: p.active,
    name: [{ use: "official", family: p.familyName, given: [p.givenName] }],
    ...(p.credentials ? { qualification: [{ code: { text: p.credentials } }] } : {}),
  };
}

/** staffId: the organization's staff identifier, else any CarePath staff identifier, else NPI, else the first. */
export function chosenStaffId(r: Practitioner, orgSlug: string | null): string | null {
  const ids = (r.identifier ?? []).filter((i) => i.value);
  return (
    (orgSlug ? identifierValue(ids, identifierSystem(orgSlug, "staff")) : null) ??
    ids.find((i) => /^urn:carepath:[a-z0-9-]+:staff$/.test(i.system ?? ""))?.value ??
    identifierValue(ids, SYSTEMS.npi) ??
    ids[0]?.value ??
    null
  );
}

export function practitionerFromFhir(
  r: Practitioner,
  orgSlug: string | null = null,
): MapResult<PractitionerRecord> {
  const issues = [];
  const staffId = chosenStaffId(r, orgSlug);
  const name = r.name?.find((n) => n.use === "official") ?? r.name?.[0];
  if (!staffId)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.practitioner.identifier",
        "Practitioner has no identifier value.",
        "identifier",
      ),
    );
  if (!name?.family || !name.given?.length)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.practitioner.name",
        "Practitioner needs a family name and a given name.",
        "name",
      ),
    );
  if (issues.length) return { record: null, issues };
  const npi = identifierValue(r.identifier, SYSTEMS.npi);
  return {
    record: {
      id: r.id ?? "",
      staffId: staffId!,
      npi: npi && /^\d{10}$/.test(npi) ? npi : null,
      givenName: name!.given!.join(" "),
      familyName: name!.family!,
      credentials:
        r.qualification?.[0]?.code.text ?? r.qualification?.[0]?.code.coding?.[0]?.display ?? null,
      active: r.active ?? true,
    },
    issues: [],
  };
}
