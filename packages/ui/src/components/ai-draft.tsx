import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Mono } from "./text";

export type AIDraftState = "draft" | "approved" | "rejected";

export interface AIDraftBlockProps {
  /** Provider name exactly as stored on the generation, for example "Demo provider, rule-based". */
  provider: string;
  state?: AIDraftState;
  /** For state "approved": who reviewed it. */
  reviewer?: string;
  children: ReactNode;
  /** Review actions and the evidence control. */
  actions?: ReactNode;
  className?: string;
}

const labels: Record<AIDraftState, string> = {
  draft: "Draft, generated, not reviewed",
  approved: "Generated, reviewed and approved",
  rejected: "Draft rejected, not used",
};

/**
 * Generated content is always labelled. Draft: dashed left rule, the fixed label and the provider name.
 * No sparkle icons, no decoration. Approved content keeps the provider and gains a solid rule.
 */
export function AIDraftBlock({
  provider,
  state = "draft",
  reviewer,
  children,
  actions,
  className,
}: AIDraftBlockProps) {
  return (
    <section
      aria-label={labels[state]}
      className={cx(
        "border-l-[3px] bg-ai-bg py-3 pr-4 pl-4",
        state === "approved" ? "border-solid border-primary" : "border-dashed border-ai-rule",
        className,
      )}
    >
      <header className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-label">
        <span className="font-semibold text-ink">
          {labels[state]}
          {state === "approved" && reviewer ? ` by ${reviewer}` : ""}
        </span>
        <span className="text-ink-muted">
          Provider: <Mono className="text-caption">{provider}</Mono>
        </span>
      </header>
      <div
        className={cx(
          "max-w-measure text-body text-ink",
          state === "rejected" && "line-through decoration-1",
        )}
      >
        {children}
      </div>
      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}

/** Inline reference to a source record. Opens the evidence panel; the number is not the only label. */
export function EvidenceRef({
  n,
  onClick,
  label,
}: {
  n: number;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? `Open evidence ${n}`}
      className="mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-control border border-border-control bg-surface px-1 align-baseline font-mono text-caption tabular-nums text-primary hover:bg-primary-subtle focus-visible:focus-ring"
    >
      {n}
    </button>
  );
}
