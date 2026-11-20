import type { Organization } from "@medplum/fhirtypes";
import { SYSTEMS } from "../config.js";
import type { OrganizationRecord } from "../types.js";
import { identifierValue, mapIssue, type MapResult } from "./common.js";

/** Organization (US Core mandatory: active, name). One tenant is one Organization. */
export function organizationToFhir(o: OrganizationRecord): Organization {
  return {
    resourceType: "Organization",
    id: o.id,
    identifier: [{ system: SYSTEMS.organization, value: o.slug }],
    active: o.active,
    name: o.name,
    ...(o.phone ? { telecom: [{ system: "phone", value: o.phone, use: "work" }] } : {}),
  };
}

export function organizationFromFhir(r: Organization): MapResult<OrganizationRecord> {
  const slug = identifierValue(r.identifier, SYSTEMS.organization);
  if (!r.name) {
    return {
      record: null,
      issues: [
        mapIssue("error", "required", "map.organization.name", "Organization has no name.", "name"),
      ],
    };
  }
  return {
    record: {
      id: r.id ?? "",
      name: r.name,
      slug: slug ?? "",
      active: r.active ?? true,
      phone: r.telecom?.find((t) => t.system === "phone")?.value ?? null,
    },
    issues: [],
  };
}
