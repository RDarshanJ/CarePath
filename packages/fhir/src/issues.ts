import type { OperationOutcome, OperationOutcomeIssue } from "@medplum/fhirtypes";
import { SYSTEMS } from "./config.js";

/**
 * One finding from any validation layer or from import. `expression` is a FHIRPath-style
 * location inside the submitted document, for example `Bundle.entry[3].resource.subject`.
 */
export type IssueLayer = "structural" | "carepath" | "duplicate" | "import";
export type IssueSeverity = "fatal" | "error" | "warning" | "information";
/** FHIR IssueType codes used here (http://hl7.org/fhir/issue-type). */
export type IssueCode =
  | "structure"
  | "required"
  | "value"
  | "invariant"
  | "invalid"
  | "code-invalid"
  | "not-found"
  | "duplicate"
  | "not-supported"
  | "business-rule"
  | "processing"
  | "informational";

export interface FhirIssue {
  severity: IssueSeverity;
  code: IssueCode;
  layer: IssueLayer;
  /** Stable machine id, for example `ref.dangling` or `uscore.patient.identifier`. */
  rule: string;
  message: string;
  expression: string;
}

export function issue(
  layer: IssueLayer,
  severity: IssueSeverity,
  code: IssueCode,
  rule: string,
  message: string,
  expression: string,
): FhirIssue {
  return { layer, severity, code, rule, message, expression };
}

export const isError = (i: FhirIssue) => i.severity === "error" || i.severity === "fatal";

export function toOperationOutcome(issues: readonly FhirIssue[]): OperationOutcome {
  const list: OperationOutcomeIssue[] = issues.map((i) => ({
    severity: i.severity,
    code: i.code,
    details: {
      coding: [{ system: SYSTEMS.checkRule, code: i.rule }],
      text: i.message,
    },
    diagnostics: `layer: ${i.layer}`,
    expression: [i.expression],
  }));
  if (list.length === 0) {
    list.push({ severity: "information", code: "informational", details: { text: "No issues." } });
  }
  return { resourceType: "OperationOutcome", issue: list };
}
