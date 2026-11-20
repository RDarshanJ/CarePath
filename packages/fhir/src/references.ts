/**
 * Reference parsing, discovery and the allowed-target table (research HD section 4, "Key
 * reference rules", restricted to the fields CarePath writes or reads for batch 1; batch 2
 * resources add their rows here).
 */

export type ParsedReference =
  | { kind: "uuid"; value: string }
  | { kind: "relative"; type: string; id: string; versioned: boolean }
  | { kind: "conditional"; type: string; system: string | null; value: string }
  | { kind: "absolute"; url: string; type: string | null; id: string | null }
  | { kind: "contained"; id: string }
  | { kind: "invalid"; raw: string };

const RESOURCE_TYPE = /^[A-Z][A-Za-z]+$/;
const FHIR_ID = /^[A-Za-z0-9\-.]{1,64}$/;

export function parseReference(raw: string): ParsedReference {
  if (raw.startsWith("urn:uuid:")) {
    const value = raw.slice("urn:uuid:".length);
    return /^[0-9a-fA-F-]{36}$/.test(value)
      ? { kind: "uuid", value: value.toLowerCase() }
      : { kind: "invalid", raw };
  }
  if (raw.startsWith("#")) return { kind: "contained", id: raw.slice(1) };
  const q = raw.indexOf("?");
  if (q > 0) {
    const type = raw.slice(0, q);
    const params = new URLSearchParams(raw.slice(q + 1));
    const ident = params.get("identifier");
    if (!RESOURCE_TYPE.test(type) || ident === null || [...params.keys()].length !== 1) {
      return { kind: "invalid", raw };
    }
    const bar = ident.indexOf("|");
    return bar >= 0
      ? {
          kind: "conditional",
          type,
          system: ident.slice(0, bar) || null,
          value: ident.slice(bar + 1),
        }
      : { kind: "conditional", type, system: null, value: ident };
  }
  if (/^https?:\/\//.test(raw)) {
    const m = /\/([A-Z][A-Za-z]+)\/([A-Za-z0-9\-.]{1,64})(\/_history\/[^/]+)?$/.exec(raw);
    return { kind: "absolute", url: raw, type: m?.[1] ?? null, id: m?.[2] ?? null };
  }
  const m = /^([A-Z][A-Za-z]+)\/([^/]+)(\/_history\/([^/]+))?$/.exec(raw);
  if (m && FHIR_ID.test(m[2]!)) {
    return { kind: "relative", type: m[1]!, id: m[2]!, versioned: m[3] !== undefined };
  }
  return { kind: "invalid", raw };
}

export interface FoundReference {
  /** FHIRPath-style path relative to the resource, with indices: `performer[0]`. */
  path: string;
  /** Same path without indices, used for the allowed-target table: `performer`. */
  field: string;
  reference: string;
  /** Reference.type when present. */
  type: string | null;
}

/** Every `Reference.reference` string inside a resource, skipping contained resources. */
export function findReferences(resource: Record<string, unknown>): FoundReference[] {
  const out: FoundReference[] = [];
  const walk = (node: unknown, path: string, field: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${path}[${i}]`, field));
      return;
    }
    if (node === null || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (typeof obj["reference"] === "string" && path !== "") {
      out.push({
        path,
        field,
        reference: obj["reference"],
        type: typeof obj["type"] === "string" ? obj["type"] : null,
      });
    }
    for (const [k, v] of Object.entries(obj)) {
      if (k === "contained" && path === "") continue;
      if (k === "reference" && typeof v === "string") continue;
      walk(v, path ? `${path}.${k}` : k, field ? `${field}.${k}` : k);
    }
  };
  walk(resource, "", "");
  return out;
}

/**
 * Allowed target types per referencing field (R4 cardinality pages, research HD section 4).
 * Only fields CarePath maps are listed. A reference in an unlisted field of a mapped resource is
 * still checked for resolution; its target type is not restricted here.
 */
export const ALLOWED_TARGETS: Record<string, Record<string, readonly string[]>> = {
  Patient: {
    managingOrganization: ["Organization"],
    generalPractitioner: ["Organization", "Practitioner", "PractitionerRole"],
    "link.other": ["Patient", "RelatedPerson"],
  },
  Practitioner: {
    "qualification.issuer": ["Organization"],
  },
  Organization: {
    partOf: ["Organization"],
  },
  CarePlan: {
    subject: ["Patient", "Group"],
    author: [
      "Patient",
      "Practitioner",
      "PractitionerRole",
      "Device",
      "RelatedPerson",
      "Organization",
      "CareTeam",
    ],
    contributor: [
      "Patient",
      "Practitioner",
      "PractitionerRole",
      "Device",
      "RelatedPerson",
      "Organization",
      "CareTeam",
    ],
    careTeam: ["CareTeam"],
    goal: ["Goal"],
    addresses: ["Condition"],
    replaces: ["CarePlan"],
    basedOn: ["CarePlan"],
    partOf: ["CarePlan"],
    encounter: ["Encounter"],
    "activity.detail.performer": [
      "Practitioner",
      "PractitionerRole",
      "Organization",
      "RelatedPerson",
      "Patient",
      "CareTeam",
      "HealthcareService",
      "Device",
    ],
  },
  Goal: {
    subject: ["Patient", "Group", "Organization"],
    expressedBy: ["Patient", "Practitioner", "PractitionerRole", "RelatedPerson"],
    addresses: [
      "Condition",
      "Observation",
      "MedicationStatement",
      "NutritionOrder",
      "ServiceRequest",
      "RiskAssessment",
    ],
    outcomeReference: ["Observation"],
  },
  Observation: {
    subject: ["Patient", "Group", "Device", "Location"],
    encounter: ["Encounter"],
    performer: [
      "Practitioner",
      "PractitionerRole",
      "Organization",
      "CareTeam",
      "Patient",
      "RelatedPerson",
    ],
    basedOn: [
      "CarePlan",
      "DeviceRequest",
      "ImmunizationRecommendation",
      "MedicationRequest",
      "NutritionOrder",
      "ServiceRequest",
    ],
    hasMember: ["Observation", "QuestionnaireResponse", "MolecularSequence"],
    derivedFrom: [
      "DocumentReference",
      "ImagingStudy",
      "Media",
      "QuestionnaireResponse",
      "Observation",
      "MolecularSequence",
    ],
  },
};

/** CarePath's own narrower rule: these fields must point at a Patient. */
export const PATIENT_SUBJECT_FIELDS: Record<string, string> = {
  CarePlan: "subject",
  Goal: "subject",
  Observation: "subject",
};
