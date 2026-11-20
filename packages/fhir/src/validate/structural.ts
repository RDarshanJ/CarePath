/**
 * Layer 1: base R4 structure and invariants through @medplum/core `validateResource`, against
 * the R4 StructureDefinitions shipped in @medplum/definitions. No profiles are loaded, so this
 * layer checks base R4 only. Its coverage is not documented by Medplum (research HD section 6.1);
 * the broken-resource fixtures measure what it catches (docs/evaluation/fhir-validation.md).
 */
import {
  indexStructureDefinitionBundle,
  OperationOutcomeError,
  validateResource,
} from "@medplum/core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Bundle, Resource } from "@medplum/fhirtypes";
import { issue, type FhirIssue, type IssueCode } from "../issues.js";

let loaded = false;

/**
 * The R4 definition files of @medplum/definitions, found from the package entry point. Its own
 * readJson() locates them from `__dirname` when that global exists, which picks the wrong folder
 * under some test runners, so the path is resolved here instead.
 */
function definitionFile(name: string): Bundle {
  const entry = createRequire(import.meta.url).resolve("@medplum/definitions");
  const file = path.join(path.dirname(entry), "..", "fhir", "r4", name);
  return JSON.parse(readFileSync(file, "utf8")) as Bundle;
}

/** Indexes the R4 type and resource definitions once per process (about half a second). */
export function loadDefinitions(): void {
  if (loaded) return;
  indexStructureDefinitionBundle(definitionFile("profiles-types.json"));
  indexStructureDefinitionBundle(definitionFile("profiles-resources.json"));
  loaded = true;
}

const CODES: readonly IssueCode[] = [
  "structure",
  "required",
  "value",
  "invariant",
  "invalid",
  "code-invalid",
  "not-found",
  "duplicate",
  "not-supported",
  "business-rule",
  "processing",
  "informational",
];

/**
 * Validates one resource. `prefix` replaces the resource type at the start of each Medplum
 * expression, so `Observation.status` becomes `Bundle.entry[2].resource.status`.
 */
export function validateStructure(resource: Resource, prefix: string): FhirIssue[] {
  loadDefinitions();
  let raw: {
    severity?: string;
    code?: string;
    details?: { text?: string };
    expression?: string[];
  }[];
  try {
    raw = validateResource(resource);
  } catch (err) {
    if (!(err instanceof OperationOutcomeError)) {
      return [
        issue(
          "structural",
          "error",
          "processing",
          "structural.exception",
          "The structural validator could not process this resource.",
          prefix,
        ),
      ];
    }
    raw = err.outcome.issue ?? [];
  }
  // Medplum cannot check the target type of a `urn:uuid:` reference without the bundle and warns
  // on each one. CarePath's reference layer checks those targets with the bundle, so the warning
  // is dropped here.
  raw = raw.filter(
    (i) =>
      !(
        i.severity === "warning" && /^Invalid reference: got "urn:uuid:/.test(i.details?.text ?? "")
      ),
  );
  return raw.map((i) => {
    const expr = i.expression?.[0] ?? resource.resourceType;
    const at = expr.startsWith(resource.resourceType)
      ? `${prefix}${expr.slice(resource.resourceType.length)}`
      : `${prefix}.${expr}`;
    const code = (CODES as readonly string[]).includes(i.code ?? "")
      ? (i.code as IssueCode)
      : "invalid";
    const severity =
      i.severity === "warning" || i.severity === "information" ? i.severity : "error";
    return issue(
      "structural",
      severity,
      code,
      `r4.${code}`,
      i.details?.text ?? "Structural problem.",
      at,
    );
  });
}
