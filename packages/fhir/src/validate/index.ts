import type { Bundle, Resource } from "@medplum/fhirtypes";
import { parseIdentifierSystem } from "../config.js";
import { isError, issue, type FhirIssue } from "../issues.js";
import { defaultFromContext } from "../mappers/common.js";
import { mappers } from "../mappers/index.js";
import { isMappedType, type MappedType } from "../types.js";
import { BundleIndex } from "./bundle-index.js";
import {
  checkBundleRules,
  checkOrganizationBoundary,
  checkReferences,
  checkRequired,
} from "./carepath.js";
import { naturalKey } from "./duplicates.js";
import { validateStructure } from "./structural.js";

export { BundleIndex } from "./bundle-index.js";
export * from "./carepath.js";
export { naturalKey } from "./duplicates.js";
export { loadDefinitions, validateStructure } from "./structural.js";

export interface BundleValidation {
  valid: boolean;
  issues: FhirIssue[];
  /** Errors per layer, for reporting which layer caught what. */
  errorsByLayer: Record<FhirIssue["layer"], number>;
}

export function summarize(issues: FhirIssue[]): BundleValidation {
  const errorsByLayer = { structural: 0, carepath: 0, duplicate: 0, import: 0 };
  for (const i of issues) if (isError(i)) errorsByLayer[i.layer] += 1;
  return { valid: !issues.some(isError), issues, errorsByLayer };
}

/**
 * Duplicate entries inside one bundle: the same type with the same identifier system and value,
 * or with the same natural key. Natural keys use references as written (default resolver), so a
 * Bundle is compared with itself only.
 */
export function inBundleDuplicates(index: BundleIndex, types: readonly string[]): FhirIssue[] {
  const out: FhirIssue[] = [];
  const seen = new Map<string, number>();
  for (const e of index.entries) {
    const type = e.resource.resourceType;
    if (!types.includes(type) || !isMappedType(type)) continue;
    const keys = new Set<string>();
    for (const id of e.resource.identifier ?? []) {
      // Versions of one care plan share the plan identifier; the version identifier is unique.
      if (type === "CarePlan" && parseIdentifierSystem(id.system)?.kind === "care-plan") continue;
      if (id.system && id.value) keys.add(`${type}|id|${id.system}|${id.value}`);
    }
    const mapped = mappers[type as MappedType].fromFhir(e.resource, {
      ...defaultFromContext,
      orgSlug: null,
    });
    if (mapped.record)
      keys.add(`${type}|nk|${naturalKey(type as MappedType, mapped.record as never)}`);
    for (const k of keys) {
      const first = seen.get(k);
      if (first !== undefined && first !== e.index) {
        const how = k.includes("|id|") ? "identifier" : "natural key";
        out.push(
          issue(
            "duplicate",
            "error",
            "duplicate",
            "dup.in-bundle",
            `Duplicates entry ${first} by ${how}.`,
            `Bundle.entry[${e.index}].resource`,
          ),
        );
        break;
      }
      seen.set(k, e.index);
    }
  }
  return out;
}

/**
 * The three layers over a whole Bundle, for exports and standalone checks (import uses
 * planImport, which adds lookups in the caller's organization):
 *   1. structural: @medplum/core validateResource on each batch 1 resource;
 *   2. carepath: bundle rules, required US Core elements, codes, references (every reference
 *      must resolve inside the bundle), allowed targets, organization boundary;
 *   3. duplicate: identifiers and natural keys repeated inside the bundle.
 */
export function validateBundle(bundle: unknown, options: { orgSlug: string }): BundleValidation {
  const shape = checkBundleRules(bundle, ["collection", "transaction", "batch"]);
  if (shape.some((i) => i.rule === "bundle.resource-type" || i.rule === "bundle.entry"))
    return summarize(shape);
  const b = bundle as Bundle;
  const index = new BundleIndex(b);
  const issues: FhirIssue[] = [...shape];
  for (const e of index.entries) {
    const at = `Bundle.entry[${e.index}].resource`;
    if (!isMappedType(e.resource.resourceType)) {
      issues.push(
        issue(
          "carepath",
          "error",
          "not-supported",
          "type.not-mapped",
          `${e.resource.resourceType} is not a resource type CarePath maps.`,
          at,
        ),
      );
      continue;
    }
    issues.push(...validateStructure(e.resource as Resource, at));
    issues.push(...checkRequired(e.resource as Resource, at));
    issues.push(
      ...checkReferences(index, e.index, { mode: "export", orgSlug: options.orgSlug }).issues,
    );
  }
  issues.push(...checkOrganizationBoundary(index, { mode: "export", orgSlug: options.orgSlug }));
  issues.push(
    ...inBundleDuplicates(
      index,
      index.entries.map((e) => e.resource.resourceType),
    ),
  );
  return summarize(issues);
}
