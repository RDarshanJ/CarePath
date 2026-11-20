/**
 * Layer 2: CarePath's defined checks. Bundle rules (bdl-3, bdl-7, bdl-8), required US Core
 * elements for batch 1 (US Core 6.1.0 pinned; the lists were read from 7.0.0 to 9.0.0 pages, so
 * differences against 6.1.0 are unverified), required-binding codes, and reference rules:
 * resolution, allowed target types, Reference.type agreement and the organization boundary.
 */
import type {
  Bundle,
  CarePlan,
  Goal,
  Observation,
  Organization,
  Patient,
  Practitioner,
  Resource,
} from "@medplum/fhirtypes";
import { parseIdentifierSystem, SYSTEMS } from "../config.js";
import { FHIR_CODES, isValidNpi } from "../codes.js";
import { issue, type FhirIssue } from "../issues.js";
import { ALLOWED_TARGETS, findReferences, PATIENT_SUBJECT_FIELDS } from "../references.js";
import type { BundleIndex } from "./bundle-index.js";

const err = (rule: string, code: FhirIssue["code"], message: string, expression: string) =>
  issue("carepath", "error", code, rule, message, expression);
const warn = (rule: string, code: FhirIssue["code"], message: string, expression: string) =>
  issue("carepath", "warning", code, rule, message, expression);

/** Shape and Bundle-level rules. Any error here is a malformed document (HTTP 400). */
export function checkBundleRules(bundle: unknown, allowedTypes: readonly string[]): FhirIssue[] {
  if (
    typeof bundle !== "object" ||
    bundle === null ||
    (bundle as Resource).resourceType !== "Bundle"
  ) {
    return [
      err("bundle.resource-type", "structure", "The document is not a FHIR Bundle.", "Bundle"),
    ];
  }
  const b = bundle as Bundle;
  const out: FhirIssue[] = [];
  if (!b.type || !(FHIR_CODES.bundleType as readonly string[]).includes(b.type)) {
    out.push(
      err(
        "bundle.type",
        "code-invalid",
        "Bundle.type is missing or not a Bundle type code.",
        "Bundle.type",
      ),
    );
  } else if (!allowedTypes.includes(b.type)) {
    out.push(
      err(
        "bundle.type-not-accepted",
        "not-supported",
        `Bundle type "${b.type}" is not accepted here (${allowedTypes.join(", ")}).`,
        "Bundle.type",
      ),
    );
  }
  if (!Array.isArray(b.entry) || b.entry.length === 0) {
    out.push(err("bundle.entry", "required", "Bundle has no entries.", "Bundle.entry"));
    return out;
  }
  const seen = new Map<string, number>();
  b.entry.forEach((e, i) => {
    const at = `Bundle.entry[${i}]`;
    if (
      !e.resource ||
      typeof e.resource !== "object" ||
      typeof e.resource.resourceType !== "string"
    ) {
      out.push(
        err(
          "bundle.entry.resource",
          "required",
          "Entry has no resource with a resourceType.",
          `${at}.resource`,
        ),
      );
    }
    const needsRequest = b.type === "transaction" || b.type === "batch" || b.type === "history";
    if (!needsRequest && e.request) {
      out.push(
        err(
          "bdl-3",
          "invariant",
          "entry.request is only allowed in batch, transaction and history bundles (bdl-3).",
          `${at}.request`,
        ),
      );
    }
    if (e.fullUrl) {
      if (e.fullUrl.includes("/_history/")) {
        out.push(
          err(
            "bdl-8",
            "invariant",
            "fullUrl cannot be a version-specific reference (bdl-8).",
            `${at}.fullUrl`,
          ),
        );
      }
      const key = `${e.fullUrl.toLowerCase()}|${(e.resource as Resource | undefined)?.meta?.versionId ?? ""}`;
      const first = seen.get(key);
      if (first !== undefined) {
        out.push(
          err(
            "bdl-7",
            "invariant",
            `fullUrl repeats entry ${first} (bdl-7: fullUrl must be unique).`,
            `${at}.fullUrl`,
          ),
        );
      } else seen.set(key, i);
    } else if (b.type === "collection") {
      out.push(
        err(
          "bundle.fullUrl",
          "required",
          "Every entry of a collection needs a fullUrl so references can resolve.",
          `${at}.fullUrl`,
        ),
      );
    }
  });
  return out;
}

function hasCode(list: readonly string[], v: string | undefined) {
  return v !== undefined && list.includes(v);
}

/** Required elements and required-binding codes for one resource of a batch 1 type. */
export function checkRequired(resource: Resource, at: string): FhirIssue[] {
  const out: FhirIssue[] = [];
  switch (resource.resourceType) {
    case "Patient": {
      const r = resource as Patient;
      if (!r.identifier?.some((i) => i.system && i.value))
        out.push(
          err(
            "uscore.patient.identifier",
            "required",
            "US Core Patient needs an identifier with system and value.",
            `${at}.identifier`,
          ),
        );
      if (!r.name?.some((n) => n.family || n.given?.length))
        out.push(
          err(
            "uscore.patient.name",
            "required",
            "US Core Patient needs a name with a family or given part.",
            `${at}.name`,
          ),
        );
      if (!r.gender)
        out.push(
          err("uscore.patient.gender", "required", "US Core Patient needs gender.", `${at}.gender`),
        );
      else if (!hasCode(FHIR_CODES.administrativeGender, r.gender))
        out.push(
          err(
            "code.patient.gender",
            "code-invalid",
            `Gender "${r.gender}" is not an AdministrativeGender code.`,
            `${at}.gender`,
          ),
        );
      if (!r.birthDate)
        out.push(
          warn(
            "uscore.patient.birthDate",
            "required",
            "birthDate is Must Support in US Core and required by CarePath on import.",
            `${at}.birthDate`,
          ),
        );
      break;
    }
    case "Practitioner": {
      const r = resource as Practitioner;
      if (!r.identifier?.some((i) => i.system && i.value))
        out.push(
          err(
            "uscore.practitioner.identifier",
            "required",
            "US Core Practitioner needs an identifier with system and value.",
            `${at}.identifier`,
          ),
        );
      if (!r.name?.some((n) => n.family))
        out.push(
          err(
            "uscore.practitioner.name",
            "required",
            "US Core Practitioner needs a name with a family part.",
            `${at}.name`,
          ),
        );
      r.identifier?.forEach((i, k) => {
        if (i.system === SYSTEMS.npi && !isValidNpi(i.value ?? "")) {
          out.push(
            err(
              "us-core-17",
              "invariant",
              "An NPI must be 10 digits with a valid check digit (us-core-16, us-core-17).",
              `${at}.identifier[${k}].value`,
            ),
          );
        }
      });
      break;
    }
    case "Organization": {
      const r = resource as Organization;
      if (typeof r.active !== "boolean")
        out.push(
          err(
            "uscore.organization.active",
            "required",
            "US Core Organization needs active.",
            `${at}.active`,
          ),
        );
      if (!r.name)
        out.push(
          err(
            "uscore.organization.name",
            "required",
            "US Core Organization needs a name.",
            `${at}.name`,
          ),
        );
      break;
    }
    case "CarePlan": {
      const r = resource as CarePlan;
      if (!hasCode(FHIR_CODES.carePlanStatus, r.status))
        out.push(
          err(
            "code.careplan.status",
            "code-invalid",
            "CarePlan.status is missing or not a RequestStatus code.",
            `${at}.status`,
          ),
        );
      if (!hasCode(FHIR_CODES.carePlanIntent, r.intent))
        out.push(
          err(
            "code.careplan.intent",
            "code-invalid",
            "CarePlan.intent is missing or not a CarePlanIntent code.",
            `${at}.intent`,
          ),
        );
      if (!r.subject)
        out.push(
          err("uscore.careplan.subject", "required", "CarePlan needs a subject.", `${at}.subject`),
        );
      if (
        !r.category?.some((c) =>
          c.coding?.some((x) => x.system === SYSTEMS.carePlanCategory && x.code === "assess-plan"),
        )
      ) {
        out.push(
          err(
            "uscore.careplan.category",
            "required",
            "US Core CarePlan needs the assess-plan category.",
            `${at}.category`,
          ),
        );
      }
      r.activity?.forEach((a, k) => {
        if (a.reference && a.detail)
          out.push(
            err(
              "cpl-3",
              "invariant",
              "An activity has either a reference or a detail, not both (cpl-3).",
              `${at}.activity[${k}]`,
            ),
          );
        if (a.detail && !hasCode(FHIR_CODES.carePlanActivityStatus, a.detail.status))
          out.push(
            err(
              "code.careplan.activity.status",
              "code-invalid",
              "activity.detail.status is missing or not a CarePlanActivityStatus code.",
              `${at}.activity[${k}].detail.status`,
            ),
          );
      });
      break;
    }
    case "Goal": {
      const r = resource as Goal;
      if (!hasCode(FHIR_CODES.goalLifecycleStatus, r.lifecycleStatus))
        out.push(
          err(
            "code.goal.lifecycleStatus",
            "code-invalid",
            "Goal.lifecycleStatus is missing or not a GoalLifecycleStatus code.",
            `${at}.lifecycleStatus`,
          ),
        );
      if (!r.description?.text && !r.description?.coding?.length)
        out.push(
          err(
            "uscore.goal.description",
            "required",
            "Goal needs a description.",
            `${at}.description`,
          ),
        );
      if (!r.subject)
        out.push(err("uscore.goal.subject", "required", "Goal needs a subject.", `${at}.subject`));
      if (!r.startDate && !r.target?.some((t) => t.dueDate))
        out.push(
          warn(
            "uscore.goal.date",
            "required",
            "US Core expects a start date or a target due date (Must Support).",
            `${at}.startDate`,
          ),
        );
      break;
    }
    case "Observation": {
      const r = resource as Observation;
      if (!hasCode(FHIR_CODES.observationStatus, r.status))
        out.push(
          err(
            "code.observation.status",
            "code-invalid",
            "Observation.status is missing or not an ObservationStatus code.",
            `${at}.status`,
          ),
        );
      if (!r.category?.length)
        out.push(
          err(
            "uscore.observation.category",
            "required",
            "US Core Observation needs a category.",
            `${at}.category`,
          ),
        );
      if (!r.code?.coding?.length && !r.code?.text)
        out.push(
          err("uscore.observation.code", "required", "Observation needs a code.", `${at}.code`),
        );
      if (!r.subject)
        out.push(
          err(
            "uscore.observation.subject",
            "required",
            "US Core Observation needs a subject.",
            `${at}.subject`,
          ),
        );
      const hasValue = Object.keys(r).some((k) => k.startsWith("value"));
      if (!hasValue && !r.dataAbsentReason && !r.component?.length && !r.hasMember?.length) {
        out.push(
          err(
            "us-core-2",
            "invariant",
            "An Observation without components or members needs a value or a dataAbsentReason.",
            `${at}.value[x]`,
          ),
        );
      }
      const pain = r.code?.coding?.some((c) => c.system === SYSTEMS.loinc && c.code === "72514-3");
      const v = r.valueQuantity?.value;
      if (pain && typeof v === "number" && (v < 0 || v > 10)) {
        out.push(
          err(
            "carepath.pain-nrs-range",
            "value",
            "Pain severity on the 0 to 10 scale (LOINC 72514-3) must be between 0 and 10.",
            `${at}.valueQuantity.value`,
          ),
        );
      }
      if (r.valueQuantity?.code && r.valueQuantity.system !== SYSTEMS.ucum) {
        out.push(
          warn(
            "uscore.observation.ucum",
            "value",
            "Numeric values should use UCUM units.",
            `${at}.valueQuantity.system`,
          ),
        );
      }
      break;
    }
  }
  return out;
}

export interface ReferenceCheckOptions {
  /** export: every reference must resolve inside the bundle (zero dangling references). */
  mode: "export" | "import";
  /** Slug of the organization the bundle belongs to (export) or is imported into. */
  orgSlug: string;
}

/**
 * Reference rules for one entry against the bundle. In export mode every reference must resolve
 * to an entry. In import mode references that do not resolve in the bundle are returned in
 * `external` for the importer to look up inside the caller's organization.
 */
export function checkReferences(
  index: BundleIndex,
  entryIndex: number,
  options: ReferenceCheckOptions,
): { issues: FhirIssue[]; external: { path: string; field: string; reference: string }[] } {
  const e = index.entry(entryIndex);
  if (!e) return { issues: [], external: [] };
  const at = `Bundle.entry[${entryIndex}].resource`;
  const type = e.resource.resourceType;
  const issues: FhirIssue[] = [];
  const external: { path: string; field: string; reference: string }[] = [];
  for (const r of findReferences(e.resource as unknown as Record<string, unknown>)) {
    const where = `${at}.${r.path}`;
    const res = index.resolve(r.reference);
    let targetType: string | null = null;
    if (res.kind === "ambiguous") {
      issues.push(
        err(
          "ref.ambiguous",
          "invalid",
          `Reference matches ${res.count} entries in the bundle.`,
          where,
        ),
      );
      continue;
    }
    if (res.kind === "entry") targetType = res.type;
    else if (options.mode === "export") {
      issues.push(
        err(
          "ref.dangling",
          "not-found",
          "Reference does not resolve to an entry in this bundle.",
          where,
        ),
      );
      continue;
    } else {
      external.push({ path: r.path, field: r.field, reference: r.reference });
      // The type is checked from the reference text when it names one.
      const m = /^(?:urn:uuid:.*|#.*)$/.test(r.reference)
        ? null
        : /^([A-Z][A-Za-z]+)[/?]/.exec(r.reference);
      targetType = m?.[1] ?? null;
    }
    if (targetType) {
      const allowed = ALLOWED_TARGETS[type]?.[r.field];
      if (allowed && !allowed.includes(targetType)) {
        issues.push(
          err(
            "ref.target-type",
            "invalid",
            `${type}.${r.field} cannot point at ${targetType} (allowed: ${allowed.join(", ")}).`,
            where,
          ),
        );
      } else if (PATIENT_SUBJECT_FIELDS[type] === r.field && targetType !== "Patient") {
        issues.push(
          err(
            "ref.subject-patient",
            "business-rule",
            `CarePath requires ${type}.${r.field} to be a Patient.`,
            where,
          ),
        );
      }
      if (r.type && r.type !== targetType) {
        issues.push(
          err(
            "ref.type-mismatch",
            "invalid",
            `Reference.type "${r.type}" does not match the target ${targetType}.`,
            `${where}.type`,
          ),
        );
      }
    }
  }
  return { issues, external };
}

/**
 * Organization boundary inside one bundle: every CarePath identifier names the same
 * organization, and in export mode Patient.managingOrganization is that organization.
 */
export function checkOrganizationBoundary(
  index: BundleIndex,
  options: ReferenceCheckOptions,
): FhirIssue[] {
  const out: FhirIssue[] = [];
  for (const e of index.entries) {
    const at = `Bundle.entry[${e.index}].resource`;
    if (options.mode === "export") {
      e.resource.identifier?.forEach((id, k) => {
        const parsed = parseIdentifierSystem(id.system);
        if (parsed && parsed.orgSlug !== options.orgSlug) {
          out.push(
            err(
              "org.boundary.identifier",
              "business-rule",
              "Identifier belongs to another organization.",
              `${at}.identifier[${k}]`,
            ),
          );
        }
      });
      if (e.resource.resourceType === "Organization") {
        const slug = e.resource.identifier?.find((i) => i.system === SYSTEMS.organization)?.value;
        if (slug !== options.orgSlug)
          out.push(
            err(
              "org.boundary.organization",
              "business-rule",
              "The bundle contains an organization other than the exporting one.",
              at,
            ),
          );
      }
    }
    if (e.resource.resourceType === "Patient") {
      const mo = (e.resource as Patient).managingOrganization?.reference;
      if (!mo) {
        if (options.mode === "export")
          out.push(
            err(
              "org.boundary.managing",
              "required",
              "Exported patients name their managing organization.",
              `${at}.managingOrganization`,
            ),
          );
        continue;
      }
      const res = index.resolve(mo);
      if (res.kind !== "entry") continue;
      const org = index.entry(res.index)!.resource;
      const slug = org.identifier?.find((i) => i.system === SYSTEMS.organization)?.value;
      if (slug !== options.orgSlug) {
        if (options.mode === "export")
          out.push(
            err(
              "org.boundary.managing",
              "business-rule",
              "Patient is managed by a different organization than the exporting one.",
              `${at}.managingOrganization`,
            ),
          );
        else
          out.push(
            issue(
              "import",
              "warning",
              "business-rule",
              "import.managing-organization",
              "Patient names another managing organization; imported patients belong to the importing organization.",
              `${at}.managingOrganization`,
            ),
          );
      }
    }
  }
  return out;
}
