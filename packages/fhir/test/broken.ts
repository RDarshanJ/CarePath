import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  isError,
  planImport,
  validateBundle,
  type FhirIssue,
  type ImportLookup,
} from "../src/index.js";
import { ORG_SLUG } from "./samples.js";

export interface BrokenFixture {
  name: string;
  description: string;
  mode: "validate" | "import";
  expect: { rule: string; layer: string; status?: number };
  lookup?: { existingPatientMrn?: string };
  bundle: unknown;
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "broken");

export function brokenFixtures(): BrokenFixture[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({
      name: f.replace(/\.json$/, ""),
      ...JSON.parse(readFileSync(path.join(dir, f), "utf8")),
    }));
}

/** A lookup for an empty organization, optionally holding one patient MRN. */
export function stubLookup(options: { existingPatientMrn?: string } = {}): ImportLookup {
  return {
    orgId: "0b6c2f6e-0000-4000-8000-0000000000ff",
    orgSlug: "importing-clinic",
    exists: async () => false,
    byIdentifier: async (type, _system, value) =>
      type === "Patient" && value === options.existingPatientMrn
        ? "0b6c2f6e-0000-4000-8000-0000000000fe"
        : null,
    byNaturalKey: async () => null,
    hasOpenCarePlan: async () => false,
    exerciseExists: async () => true,
  };
}

export async function runFixture(
  f: BrokenFixture,
): Promise<{ issues: FhirIssue[]; status: number | null }> {
  if (f.mode === "import") {
    const plan = await planImport(f.bundle, {
      lookup: stubLookup(f.lookup),
      onDuplicate: "reject",
      newId: randomUUID,
    });
    return { issues: plan.issues, status: plan.status };
  }
  return { issues: validateBundle(f.bundle, { orgSlug: ORG_SLUG }).issues, status: null };
}

export function errorsByLayer(issues: FhirIssue[]) {
  const out: Record<string, number> = { structural: 0, carepath: 0, duplicate: 0, import: 0 };
  for (const i of issues.filter(isError)) out[i.layer] = (out[i.layer] ?? 0) + 1;
  return out;
}
