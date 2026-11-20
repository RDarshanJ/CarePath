import type { Scope } from "./inputs.js";
import { UNSUPPORTED_LABEL } from "./labels.js";
import {
  listStatements,
  type GenerationKind,
  type ProgressSummaryOutput,
  type SoapNoteDraftOutput,
  type SourceRef,
} from "./schemas.js";
import { refKey, type FieldValue, type SourceRecord } from "./sources.js";

/**
 * Evidence verifier (ADR-6, AC-F3). The verifier is pure; looking records up is the resolver's job.
 * WP 5.2 implements `EvidenceResolver` against the database through its scoped repositories:
 * a ref resolves only when the record exists in `scope.organizationId`, belongs to
 * `scope.patientId`, and the named field holds a value. A record of another patient or another
 * organization must not resolve (return `out_of_scope` or `not_found`; both are unsupported).
 */
export type RefResolution = "resolved" | "not_found" | "out_of_scope" | "field_missing";

export interface ResolvedRef {
  ref: SourceRef;
  status: RefResolution;
  /** The cited value when resolved, for the evidence panel. */
  value?: FieldValue;
}

export interface EvidenceResolver {
  /** Called once per verification with the distinct refs of the whole output. Same order back. */
  resolve(refs: SourceRef[], scope: Scope): Promise<ResolvedRef[]>;
}

export type StatementSupport = "supported" | "unsupported";

export interface StatementVerdict {
  statementId: string;
  section: string;
  status: StatementSupport;
  /** Null when supported. */
  reason: null | "no_source_refs" | "unresolved_source_ref";
  /** Shown beside an unsupported statement. */
  label: string | null;
  refs: ResolvedRef[];
}

export interface VerificationResult {
  statements: StatementVerdict[];
  statementCount: number;
  supportedCount: number;
  unsupportedCount: number;
  /** unsupported / statements; null when there are no statements. */
  unsupportedRate: number | null;
}

const fullKey = (r: SourceRef) => `${r.type}:${r.id}:${r.field}`;

export async function verifyOutput(
  kind: GenerationKind,
  output: ProgressSummaryOutput | SoapNoteDraftOutput,
  resolver: EvidenceResolver,
  scope: Scope,
): Promise<VerificationResult> {
  const items = listStatements(kind, output);
  const distinct = new Map<string, SourceRef>();
  for (const { statement } of items)
    for (const r of statement.sourceRefs) distinct.set(fullKey(r), r);
  const refs = [...distinct.values()];
  const resolved = refs.length ? await resolver.resolve(refs, scope) : [];
  if (resolved.length !== refs.length)
    throw new Error("resolver returned a different number of refs");
  const byKey = new Map(resolved.map((r, i) => [fullKey(refs[i]!), r]));

  const statements: StatementVerdict[] = items.map(({ section, statement }) => {
    const rs = statement.sourceRefs.map((r) => byKey.get(fullKey(r))!);
    const reason =
      rs.length === 0
        ? "no_source_refs"
        : rs.some((r) => r.status !== "resolved")
          ? "unresolved_source_ref"
          : null;
    return {
      statementId: statement.id,
      section,
      status: reason ? "unsupported" : "supported",
      reason,
      label: reason ? UNSUPPORTED_LABEL : null,
      refs: rs,
    };
  });
  const unsupportedCount = statements.filter((s) => s.status === "unsupported").length;
  return {
    statements,
    statementCount: statements.length,
    supportedCount: statements.length - unsupportedCount,
    unsupportedCount,
    unsupportedRate: statements.length ? unsupportedCount / statements.length : null,
  };
}

/**
 * Resolver over records held in memory: the reference behaviour WP 5.2 mirrors in SQL, and the
 * resolver the tests and `pnpm ai:eval` use.
 */
export function createInMemoryResolver(records: SourceRecord[]): EvidenceResolver {
  const index = new Map(records.map((r) => [refKey(r), r]));
  return {
    async resolve(refs, scope) {
      return refs.map((ref): ResolvedRef => {
        const rec = index.get(refKey(ref));
        if (!rec) return { ref, status: "not_found" };
        if (rec.organizationId !== scope.organizationId || rec.patientId !== scope.patientId) {
          return { ref, status: "out_of_scope" };
        }
        const value = Object.prototype.hasOwnProperty.call(rec.fields, ref.field)
          ? rec.fields[ref.field]
          : undefined;
        if (value === undefined || value === null || value === "")
          return { ref, status: "field_missing" };
        return { ref, status: "resolved", value };
      });
    },
  };
}
