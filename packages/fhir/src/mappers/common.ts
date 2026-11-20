import type { CodeableConcept, Identifier, Reference, Resource } from "@medplum/fhirtypes";
import { issue, type FhirIssue, type IssueCode } from "../issues.js";
import { parseReference } from "../references.js";

/** Export context: the organization whose identifier systems the resources carry. */
export interface ToFhirContext {
  orgSlug: string;
  organizationId: string;
}

/** A reference that fromFhir resolved to a CarePath id. */
export interface ResolvedRef {
  type: string;
  id: string;
}

export interface FromFhirContext {
  /**
   * Maps a reference to the CarePath id of its target. The default reads `urn:uuid:<id>` and
   * `Type/<id>`; import passes a resolver that knows the bundle and the existing records.
   */
  resolve(ref: Reference | undefined, path: string): ResolvedRef | null;
}

export interface MapResult<T> {
  record: T | null;
  issues: FhirIssue[];
}

/** Every exported reference is `urn:uuid:<id>`, matching the entry fullUrl. */
export function ref<T extends Resource = Resource>(
  type: T["resourceType"],
  id: string,
): Reference<T> {
  return { reference: `urn:uuid:${id}`, type };
}

export const defaultFromContext: FromFhirContext = {
  resolve(r) {
    if (!r?.reference) return null;
    const p = parseReference(r.reference);
    if (p.kind === "uuid") return r.type ? { type: r.type, id: p.value } : null;
    if (p.kind === "relative") return { type: p.type, id: p.id };
    return null;
  },
};

export function mapIssue(
  severity: "error" | "warning" | "information",
  code: IssueCode,
  rule: string,
  message: string,
  expression: string,
): FhirIssue {
  return issue("import", severity, code, rule, message, expression);
}

export function identifierValue(ids: Identifier[] | undefined, system: string): string | null {
  return ids?.find((i) => i.system === system && i.value)?.value ?? null;
}

export function firstCoding(cc: CodeableConcept | undefined, system?: string) {
  return cc?.coding?.find((c) => (system ? c.system === system : true) && c.code);
}

/** `YYYY-MM-DD` of a FHIR date or dateTime; null when absent or malformed. */
export function dateOnly(v: string | undefined): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v ?? "");
  return m ? m[1]! : null;
}

/** ISO 8601 UTC of a FHIR instant/dateTime with a time; null when absent or date-only. */
export function instantUtc(v: string | undefined): string | null {
  if (!v || !/T/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export function escapeXhtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function narrative(lines: string[]) {
  return {
    status: "generated" as const,
    div: `<div xmlns="http://www.w3.org/1999/xhtml">${lines.map((l) => `<p>${escapeXhtml(l)}</p>`).join("")}</div>`,
  };
}
