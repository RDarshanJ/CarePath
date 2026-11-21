"use client";

import { forwardRef, useId, useState, type ReactNode } from "react";
import { DEMO_PROVIDER_NOTICE, aiDraftStateLabels, type AIDraftState } from "@carepath/shared";
import type { AiSourceType, AiStatement } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Banner } from "../composed/banner";
import { Popover, PopoverContent, PopoverTrigger } from "../composed/overlays";
import { Button } from "../primitives/button";
import { Field } from "../primitives/field";
import { Icon } from "../primitives/icons";
import { Textarea } from "../primitives/inputs";
import { StatusChip } from "../primitives/status";
import { Mono } from "../primitives/text";
import {
  APPROVED_NOT_SIGNED,
  DECISION_LABELS,
  PROVIDER_NOT_RECORDED,
  approvalUnavailableText,
  blockerPhrase,
  evidenceRefLabel,
  provenanceText,
  statementSupportKind,
  statementSupportWords,
  type AiBlocker,
  type AiProvider,
  type ProvenanceInput,
} from "./ai-text";

/*
 * Generated content (CD-236, CD-400 to CD-407; DR-002 M amended by checkpoint C3 3.1). Words carry
 * provenance: the state label, the provider label as received, and `DEMO_PROVIDER_NOTICE` on every
 * block whose provider is the demo. Graphite tint and a dashed rule are secondary cues only. No sparkle,
 * no confidence figure, no strike-through on rejected text (CD-406).
 */

export type { AIDraftState };

export interface AIDraftBlockProps {
  state: AIDraftState;
  /** `provider` from the generation. Null shows "Provider not recorded". */
  provider: AiProvider | null;
  /** Block heading ("Progress summary, last 14 days"). */
  title?: string;
  titleAs?: "h2" | "h3" | "h4";
  /** Approved: "by J. Alvarez, PT, Nov 19, 9:14 AM MST"; rejected: the reason. */
  decisionLine?: string;
  /** Approved but not yet in a signed note: shows "Approved. Not yet part of a signed note." */
  notSigned?: boolean;
  /** Failed: the fixed pipeline message. */
  failureMessage?: string;
  /** The provenance line (`ProvenanceLine`). */
  provenance?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

const ruleClass: Record<AIDraftState, string> = {
  pending: "border-dashed border-ai-rule",
  unreviewed: "border-dashed border-ai-rule",
  approved: "border-solid border-primary",
  approved_with_edits: "border-solid border-primary",
  rejected: "border-dashed border-border-control",
  failed: "border-solid border-error-ink",
};

/** The six states of a generated draft, each with its fixed label (CD-236). */
export function AIDraftBlock({
  state,
  provider,
  title,
  titleAs: TitleTag = "h3",
  decisionLine,
  notSigned = false,
  failureMessage,
  provenance,
  children,
  actions,
  className,
}: AIDraftBlockProps) {
  const label = aiDraftStateLabels[state];
  const labelId = useId();
  const approved = state === "approved" || state === "approved_with_edits";
  return (
    <section
      aria-labelledby={labelId}
      aria-busy={state === "pending" || undefined}
      data-ai-state={state}
      className={cx(
        "flex flex-col gap-2 border-l-4 py-3 pr-4 pl-4",
        state === "failed"
          ? "bg-error-bg"
          : state === "rejected"
            ? "bg-surface-sunken"
            : "bg-ai-bg",
        ruleClass[state],
        className,
      )}
    >
      <header className="flex flex-col gap-0.5">
        {title ? <TitleTag className="text-h4 font-h4 text-ink">{title}</TitleTag> : null}
        <p
          id={labelId}
          className="flex flex-wrap items-center gap-x-2 text-label font-semibold text-ai-ink"
        >
          {state === "failed" ? (
            <Icon name="alert-circle" size={16} className="text-error-ink" />
          ) : null}
          {state === "pending" ? (
            <span
              className="cp-spinner inline-block size-3.5 rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
          ) : null}
          <span className={state === "failed" ? "text-error-ink" : undefined}>{label.label}</span>
          {decisionLine ? <span className="font-normal text-ink">{decisionLine}</span> : null}
        </p>
        <p className="text-small text-ink-muted">
          Provider:{" "}
          <Mono className="text-small text-ink">
            {provider?.label.trim() ? provider.label : PROVIDER_NOT_RECORDED}
          </Mono>
        </p>
        {provider?.isDemo ? (
          <p data-demo-provider="" className="text-small font-medium text-ink">
            {DEMO_PROVIDER_NOTICE}
          </p>
        ) : null}
      </header>
      {label.explanation ? <p className="text-small text-ink">{label.explanation}</p> : null}
      {state === "failed" && failureMessage ? (
        <p className="text-small text-ink">{failureMessage}</p>
      ) : null}
      {children && state !== "pending" && state !== "failed" ? (
        <div className="max-w-measure text-notes text-ink">{children}</div>
      ) : null}
      {approved && notSigned ? (
        <p className="text-small font-medium text-ink">{APPROVED_NOT_SIGNED}</p>
      ) : null}
      {provenance}
      {actions ? <div className="mt-1 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}

/**
 * The provenance line (CD-404): what produced the draft, from which records, when; then who edited and
 * approved it. Caption size, muted, no icon. "How this draft was made" adds the method in a popover and
 * is never the only carrier.
 */
export function ProvenanceLine({
  input,
  edited,
  reviewed,
}: {
  input: ProvenanceInput;
  edited?: string | null;
  reviewed?: string | null;
}) {
  return (
    <div className="flex flex-col gap-0.5 text-caption text-ink-muted" data-provenance="">
      <p>{provenanceText(input)}</p>
      {edited ? <p>{edited}</p> : null}
      {reviewed ? <p>{reviewed}</p> : null}
      <Popover>
        <PopoverTrigger className="self-start rounded-control text-caption font-medium text-link underline underline-offset-2 hover:text-primary-hover focus-visible:focus-ring">
          How this draft was made
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex flex-col gap-2 text-small text-ink">
            <p className="font-semibold">How this draft was made</p>
            <p>
              The draft was built from{" "}
              {input.recordCount === 1 ? "1 record" : `${input.recordCount} records`} in this
              patient&apos;s file.
            </p>
            <p>
              Each statement is checked for a cited record that exists for this patient. The check
              does not judge whether a statement is correct.
            </p>
            {input.provider?.isDemo ? <p className="font-medium">{DEMO_PROVIDER_NOTICE}</p> : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export interface EvidenceRefProps {
  n: number;
  sourceType: AiSourceType;
  /** When the cited record happened, for the accessible name. */
  occurredAt?: string | null;
  timezone?: string;
  /** The reviewer opened this source (recorded through evidence-opens). Says "opened", never "checked". */
  opened?: boolean;
  /** This ref is the one shown in the evidence panel now. */
  selected?: boolean;
  onOpen?: () => void;
}

/** A numbered source reference that opens the evidence panel (CD-400). The name says what it opens. */
export const EvidenceRef = forwardRef<HTMLButtonElement, EvidenceRefProps>(function EvidenceRef(
  { n, sourceType, occurredAt, timezone, opened = false, selected = false, onOpen },
  ref,
) {
  const name = `${evidenceRefLabel(n, sourceType, occurredAt, timezone)}${opened ? ", opened" : ""}`;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={name}
      aria-pressed={selected || undefined}
      data-opened={opened || undefined}
      className={cx(
        "mx-0.5 inline-flex h-6 min-w-6 items-center justify-center gap-0.5 rounded-control border px-1 align-baseline font-mono text-caption tabular-nums focus-visible:focus-ring",
        selected
          ? "border-selected-edge bg-selected-bg text-selected-ink"
          : "border-border-control bg-surface text-link hover:bg-primary-subtle",
      )}
    >
      {n}
      {opened ? <Icon name="check" size={12} /> : null}
    </button>
  );
});

/** Where a statement has no ref: words, not a disabled control (CD-400). */
export function NoSupportingRecord() {
  return (
    <span className="text-small font-medium text-warning-ink">No supporting record found</span>
  );
}

/**
 * Statement support in words (CD-405, DR-002 M(d), C3): unsupported is a warning chip; an edited
 * statement reads "Edited, not re-checked" and never shows the supported mark; kept statements say who
 * kept them.
 */
export function StatementSupport({
  statement,
  noteBy,
}: {
  statement: Pick<AiStatement, "support" | "resolution" | "note">;
  /** Name of the clinician who kept the statement with a note. */
  noteBy?: string;
}) {
  const kind = statementSupportKind(statement);
  if (kind === "unsupported") {
    return <StatusChip tone="warning">{statementSupportWords.unsupported}</StatusChip>;
  }
  if (kind === "supported") {
    return (
      <span className="inline-flex items-center gap-1 text-small text-success-ink">
        <Icon name="check" size={14} />
        {statementSupportWords.supported}
      </span>
    );
  }
  return (
    <span className="text-small text-ink">
      {statementSupportWords[kind]}
      {kind === "kept"
        ? `${noteBy ? `. Note by ${noteBy}` : ""}${statement.note ? `: ${statement.note}` : ""}`
        : ""}
    </span>
  );
}

export interface ReviewDecisionBarProps {
  /** `approval.blockers` from the generation. Empty and `allowed` means Approve can be pressed. */
  blockers: AiBlocker[];
  allowed: boolean;
  /** Any edit exists: the approve label becomes "Approve draft with edits". */
  hasEdits: boolean;
  /** Counts line above the actions (`reviewSummaryText`). */
  summary: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  pending?: "approve" | "reject" | null;
  /** The decision could not be saved. */
  error?: string | null;
  offline?: boolean;
  /** Not a therapist on the care team: the bar is replaced by a line. */
  canDecide?: boolean;
  /** Jump-link target for a blocker's first statement. */
  statementHref?: (statementId: string) => string;
  /** Jump-link target for the missing-information section. */
  missingHref?: string;
  sticky?: boolean;
  className?: string;
}

/**
 * The decision bar (CD-407) as a shell: counts, the reason Approve is unavailable with jump links, one
 * approve label, and Reject with an inline required reason. Approve stays focusable (`aria-disabled`)
 * so the reason is reachable. The review screen owns the data and the requests.
 */
export function ReviewDecisionBar({
  blockers,
  allowed,
  hasEdits,
  summary,
  onApprove,
  onReject,
  pending = null,
  error,
  offline = false,
  canDecide = true,
  statementHref,
  missingHref,
  sticky = true,
  className,
}: ReviewDecisionBarProps) {
  const reasonId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  if (!canDecide) {
    return (
      <p
        className={cx(
          "rounded-container border border-border bg-surface p-3 text-small text-ink",
          className,
        )}
      >
        Only a therapist on this patient&apos;s care team can review generated drafts.
      </p>
    );
  }
  const unavailable = !allowed || offline || pending !== null;
  const reasonText = offline
    ? "You are offline. Your edits are kept on this page. Reconnect to approve."
    : !allowed
      ? approvalUnavailableText(blockers)
      : null;
  const links = blockers
    .map((b) => {
      const href =
        b.code === "missing_unacknowledged"
          ? missingHref
          : b.statementIds[0] && statementHref
            ? statementHref(b.statementIds[0])
            : undefined;
      return href ? { href, text: blockerPhrase(b), code: b.code } : null;
    })
    .filter((l): l is { href: string; text: string; code: AiBlocker["code"] } => l !== null);
  const submitReject = () => {
    if (reason.trim().length < 3) {
      setReasonError("Say why this draft is not being used, in at least 3 characters.");
      return;
    }
    setReasonError(null);
    onReject(reason.trim());
  };
  return (
    <div
      data-sticky-bar={sticky ? "" : undefined}
      className={cx(
        "flex flex-col gap-3 border-t border-border bg-surface p-3",
        sticky && "sticky bottom-0 z-10",
        className,
      )}
    >
      {error ? (
        <Banner tone="error" title="The decision was not saved">
          Your edits are still here. {error}
        </Banner>
      ) : null}
      <p role="status" className="text-small text-ink">
        {summary}
      </p>
      {reasonText ? (
        <div id={reasonId} className="flex flex-col gap-1 text-small text-ink">
          <p className="flex items-start gap-1.5">
            <Icon name="info" size={16} className="mt-0.5 shrink-0 text-ink-muted" />
            {reasonText}
          </p>
          {!offline && links.length ? (
            <ul className="flex flex-col gap-0.5 pl-6">
              {links.map((l) => (
                <li key={l.code}>
                  <a
                    href={l.href}
                    className="rounded-control text-link underline underline-offset-2 focus-visible:focus-ring"
                  >
                    Go to: {l.text}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {rejecting ? (
        <div className="flex flex-col gap-2">
          <Field
            label="Why is this draft not being used?"
            requirement="required"
            error={reasonError ?? undefined}
          >
            {(c) => (
              <Textarea
                {...c}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={submitReject}
              loading={pending === "reject"}
              loadingLabel="Rejecting"
            >
              {DECISION_LABELS.reject}
            </Button>
            <Button variant="quiet" onClick={() => setRejecting(false)}>
              Keep reviewing
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            unavailable={unavailable && pending !== "approve"}
            loading={pending === "approve"}
            loadingLabel="Approving"
            aria-describedby={reasonText ? reasonId : undefined}
            onClick={onApprove}
          >
            {hasEdits ? DECISION_LABELS.approveWithEdits : DECISION_LABELS.approve}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setRejecting(true)}
            unavailable={pending !== null}
          >
            {DECISION_LABELS.reject}
          </Button>
        </div>
      )}
    </div>
  );
}
