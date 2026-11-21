"use client";

import { useId, useState } from "react";
import * as R from "@radix-ui/react-radio-group";
import { PAIN_ANCHOR_HIGH, PAIN_ANCHOR_LOW, painChosenLine } from "@carepath/shared";
import { cx } from "../../lib/cx";
import { FieldError } from "../primitives/field";
import { Icon } from "../primitives/icons";

/** "0 No pain" gives "no pain": the anchor words without the number, for the item's name. */
const anchorWords = (anchor: string) => anchor.replace(/^\d+\s+/, "").toLowerCase();

/** Accessible name of item `n`: "4 of 10"; the ends add their anchor words. */
export function painItemLabel(n: number, low = PAIN_ANCHOR_LOW, high = PAIN_ANCHOR_HIGH): string {
  if (n === 0) return `0 of 10, ${anchorWords(low)}`;
  if (n === 10) return `10 of 10, ${anchorWords(high)}`;
  return `${n} of 10`;
}

export interface PainScaleProps {
  /** The question, visible: "How much does it hurt right now?" */
  label?: string;
  hint?: string;
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  /** "Choose a pain number from 0 to 10 before you send this." */
  error?: string;
  /** Id of the first item, so an error summary can move focus to it. */
  id?: string;
  /** The number given when a session was stopped, shown as a note when it is preselected. */
  stoppedAt?: number | null;
  className?: string;
}

/**
 * 0 to 10 patient-reported pain (CD-100, CD-101). A radio group: one tab stop, arrow keys move and select,
 * each item is named "n of 10" and the ends carry the anchors "0 No pain" and "10 Worst pain imaginable"
 * (constants from @carepath/shared, DR-002 R3). The anchors are visible and in the accessibility tree.
 * The live line states only the number: no band word, no colour change, no praise (R4).
 * Items stay at least 48 px: one row of eleven when it fits, 0 to 5 and 6 to 10 on a phone, three rows
 * at 320 px. Selected: fill plus a check mark plus the live line.
 */
export function PainScale({
  label = "How much does it hurt right now?",
  hint,
  value,
  defaultValue = null,
  onValueChange,
  disabled,
  error,
  id: fixedId,
  stoppedAt = null,
  className,
}: PainScaleProps) {
  const auto = useId();
  const id = fixedId ?? `${auto}-0`;
  const base = fixedId ? `${fixedId}-scale` : auto;
  const [inner, setInner] = useState<number | null>(defaultValue);
  const current = value === undefined ? inner : value;
  const describedBy = [hint ? `${base}-h` : null, error ? `${base}-e` : null, `${base}-a`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cx("@container flex flex-col gap-2", className)}>
      <span id={`${base}-l`} className="text-label font-medium text-ink">
        {label}
      </span>
      {hint ? (
        <p id={`${base}-h`} className="text-small text-ink-muted">
          {hint}
        </p>
      ) : null}
      {stoppedAt !== null && current === stoppedAt ? (
        <p className="text-small text-ink-muted">You told us {stoppedAt} when you stopped.</p>
      ) : null}
      {error ? <FieldError id={`${base}-e`}>{error}</FieldError> : null}
      <R.Root
        aria-labelledby={`${base}-l`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        value={current === null ? "" : String(current)}
        disabled={disabled}
        orientation="horizontal"
        onValueChange={(v) => {
          const n = Number(v);
          setInner(n);
          onValueChange?.(n);
        }}
        className="grid grid-cols-4 gap-1 @min-[19.5rem]:grid-cols-6 @min-[36rem]:grid-cols-11"
      >
        {Array.from({ length: 11 }, (_, n) => (
          <R.Item
            key={n}
            id={n === 0 ? id : undefined}
            value={String(n)}
            aria-label={painItemLabel(n)}
            className={cx(
              "group relative inline-flex h-control min-w-target items-center justify-center gap-1 rounded-control border border-border-control bg-surface text-body font-medium tabular-nums text-ink motion-fast transition-colors",
              "hover:bg-primary-subtle focus-visible:focus-ring",
              "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-ink-inverse",
              "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink",
              "disabled:data-[state=checked]:bg-disabled-ink disabled:data-[state=checked]:text-ink-inverse",
              error && "border-2 border-error-ink",
            )}
          >
            <Icon
              name="check"
              size={16}
              strokeWidth={2.5}
              className="hidden shrink-0 group-data-[state=checked]:inline"
            />
            {n}
          </R.Item>
        ))}
      </R.Root>
      <p id={`${base}-a`} className="flex justify-between gap-4 text-small text-ink-muted">
        <span>{PAIN_ANCHOR_LOW}</span>
        <span className="text-right">{PAIN_ANCHOR_HIGH}</span>
      </p>
      <p className="min-h-6 text-small font-medium text-ink" aria-live="polite">
        {current === null ? "Choose a number from 0 to 10." : painChosenLine(current)}
      </p>
    </div>
  );
}
