import { type EvidenceResolver, type GenerationKind, type ResolvedRef } from "@carepath/ai";
import type {
  AiGeneration,
  AiGenerationSummary,
  AiReviewState,
  AiSourceRef,
} from "@carepath/shared/contracts";
import { userRef } from "../../core/people.js";
import type { GenerationRow, ReviewRow } from "./repo.js";
import {
  approvalBlockers,
  emptyState,
  parseDraft,
  parseInputJson,
  parseState,
  statementViews,
  verifyStored,
  type StatementView,
} from "./review-state.js";

const FAILURE_CODES = new Set([
  "timeout",
  "provider_error",
  "invalid_output",
  "invalid_input",
  "redaction_failed",
  "not_configured",
]);

type Kind = AiGenerationSummary["kind"];
type SectionKey = AiGeneration["sections"][number]["key"];

const SECTIONS: Record<Kind, SectionKey[]> = {
  progress_summary: ["summary", "reportedChanges", "engagementObservations", "itemsForReview"],
  note_draft: ["subjective", "objective", "assessment", "plan"],
};

const personOf = (u: { user: Parameters<typeof userRef>[0] } | null) => userRef(u?.user ?? null);

export function reviewStateOf(
  status: string,
  facts: { revisions: number; decision: string | null },
): AiReviewState {
  if (status !== "succeeded") return "not_reviewable";
  if (facts.decision === "approved" || facts.decision === "approved_with_edits")
    return facts.decision;
  if (facts.decision === "rejected") return "rejected";
  return facts.revisions > 0 ? "in_review" : "unreviewed";
}

export function toSummary(
  g: GenerationRow,
  facts: { revisions: number; decision: string | null },
): AiGenerationSummary {
  const input = parseInputJson(g.input);
  const req = input.request;
  return {
    id: g.id,
    patientId: g.patientId,
    kind: g.kind as Kind,
    status: g.status,
    reviewState: reviewStateOf(g.status, facts),
    provider: {
      id: g.provider,
      label: g.providerLabel,
      model: g.model,
      isDemo: g.provider !== "anthropic",
    },
    promptKey: g.promptKey,
    promptVersion: g.promptVersion,
    source: !req
      ? null
      : req.kind === "progress_window"
        ? { kind: "progress_window", windowDays: req.windowDays, from: req.from, to: req.to }
        : { kind: "encounter", encounterId: req.encounterId, encounterStartedAt: null },
    requestedBy: personOf(g.requestedBy),
    createdAt: g.createdAt.toISOString(),
    completedAt: g.completedAt?.toISOString() ?? null,
    previousGenerationId: g.previousGenerationId,
    regeneratedById: g.regenerations[0]?.id ?? null,
    unsupportedStatementCount: g.unsupportedStatementCount,
  };
}

function refView(r: ResolvedRef): AiSourceRef {
  return {
    type: r.ref.type,
    id: r.ref.id,
    field: r.ref.field,
    status: r.status,
    value: r.status === "resolved" ? (r.value ?? null) : null,
    inInput: r.inInput ?? null,
  };
}

/**
 * The full generation view. Statements are verified again now through the database resolver,
 * so a reference to another patient's record reads as unsupported whatever was stored.
 */
export async function toGenerationView(
  g: GenerationRow,
  reviews: ReviewRow[],
  resolver: EvidenceResolver,
  extra: {
    orgId: string;
    encounterStartedAt: Date | null;
    noteId: string | null;
    consentActive: boolean;
  },
): Promise<AiGeneration> {
  const scope = { organizationId: extra.orgId, patientId: g.patientId };
  const revisions = reviews.filter((r) => r.decision === "revised");
  const decisionRow = reviews.find((r) => r.decision !== "revised") ?? null;
  const summary = toSummary(g, {
    revisions: revisions.length,
    decision: decisionRow?.decision ?? null,
  });
  if (summary.source?.kind === "encounter")
    summary.source.encounterStartedAt = extra.encounterStartedAt?.toISOString() ?? null;
  const input = parseInputJson(g.input);
  const kind = g.kind as GenerationKind;
  const draft = g.status === "succeeded" ? parseDraft(kind, g.output) : null;
  const latest = decisionRow ?? revisions[revisions.length - 1] ?? null;
  const state = latest ? parseState(latest.editedOutput) : emptyState();

  let views: StatementView[] = [];
  let refsByStatement = new Map<string, AiSourceRef[]>();
  let notices: AiGeneration["notices"] = [];
  let verification: AiGeneration["verification"] = null;
  if (draft) {
    const result = await verifyStored(kind, draft, resolver, scope, input.inputRefs);
    views = statementViews(kind, draft, state, result);
    refsByStatement = new Map(views.map((s) => [s.id, s.verdict.refs.map(refView)]));
    const resolveNotice = async (refs: { type: string; id: string; field: string }[]) =>
      (await resolver.resolve(refs as never, scope)).map(refView);
    notices = await Promise.all(
      draft.notices.map(async (n) => ({
        code: n.code,
        sourceRefs: await resolveNotice(n.sourceRefs),
      })),
    );
    verification = {
      statementCount: result.statementCount,
      supportedCount: result.supportedCount,
      unsupportedCount: result.unsupportedCount,
      needsResolutionCount: views.filter((s) => s.needsResolution).length,
    };
  }

  const sections = SECTIONS[g.kind as Kind].map((key) => {
    const list = views.filter((s) => s.section === key);
    const ordered = [
      ...list.filter((s) => s.needsResolution),
      ...list.filter((s) => !s.needsResolution),
    ];
    return {
      key,
      statements: ordered.map((s) => ({
        id: s.id,
        section: key,
        text: s.text,
        originalText: s.originalText,
        resolution: s.resolution,
        note: s.note,
        support: s.verdict.status,
        unsupportedReason: s.verdict.reason,
        needsResolution: s.needsResolution,
        evidenceOpened: s.evidenceOpened,
        sourceRefs: refsByStatement.get(s.id) ?? [],
      })),
    };
  });

  const missingInformation = draft
    ? draft.missingInformation.map((m) => ({
        item: m.item,
        section: ("section" in m ? m.section : null) as SectionKey | null,
        label: m.label,
        acknowledged: state.acknowledgedMissing.includes(m.item),
      }))
    : [];

  const decided = decisionRow !== null;
  const blockers = draft
    ? approvalBlockers(kind, draft, state, views, extra.consentActive)
    : [{ code: "empty_output" as const, statementIds: [], items: [] }];
  const failureCode =
    input.errorCode && FAILURE_CODES.has(input.errorCode) ? input.errorCode : null;

  return {
    ...summary,
    usage: {
      attempts: input.attempts,
      inputTokens: g.inputTokens,
      outputTokens: g.outputTokens,
      costMicroUsd: g.costMicroUsd,
      costLabel: input.costLabel,
      latencyMs: g.latencyMs,
    },
    failure:
      g.status === "failed"
        ? {
            code: (failureCode ?? "provider_error") as NonNullable<AiGeneration["failure"]>["code"],
            message: g.error ?? "Generation failed.",
          }
        : null,
    verification,
    sections: draft ? sections : [],
    missingInformation,
    notices,
    revisions: revisions.map((r, i) => ({
      id: r.id,
      number: i + 1,
      kind: parseState(r.editedOutput).change,
      createdAt: r.createdAt.toISOString(),
      by: personOf(r.reviewer),
    })),
    currentRevisionId: revisions[revisions.length - 1]?.id ?? null,
    decision: decisionRow
      ? {
          decision: decisionRow.decision as "approved" | "approved_with_edits" | "rejected",
          reason: decisionRow.reason,
          reviewer: personOf(decisionRow.reviewer),
          decidedAt: decisionRow.createdAt.toISOString(),
          noteId: extra.noteId,
        }
      : null,
    approval: {
      allowed: g.status === "succeeded" && !decided && blockers.length === 0,
      blockers: g.status === "succeeded" && !decided ? blockers : [],
    },
  };
}
