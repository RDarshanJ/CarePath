"use client";

import { useId, useState } from "react";
import * as R from "@radix-ui/react-radio-group";
import { cx } from "../lib/cx";

const words = [
  "No pain",
  "Mild",
  "Mild",
  "Mild",
  "Moderate",
  "Moderate",
  "Moderate",
  "Severe",
  "Severe",
  "Severe",
  "Worst pain",
];

export interface PainScaleProps {
  label?: string;
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 0 to 10 numeric rating for patient-reported pain. A radio group, so arrow keys work and the screen reader
 * hears "4 of 10". The chosen value is also spelled out in words below the scale.
 */
export function PainScale({
  label = "How much does it hurt right now?",
  value,
  defaultValue = null,
  onValueChange,
  disabled,
  className,
}: PainScaleProps) {
  const id = useId();
  const [inner, setInner] = useState<number | null>(defaultValue);
  const current = value === undefined ? inner : value;
  return (
    <div className={cx("@container flex flex-col gap-2", className)}>
      <span id={`${id}-l`} className="text-label font-medium text-ink">
        {label}
      </span>
      <R.Root
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        value={current === null ? "" : String(current)}
        disabled={disabled}
        orientation="horizontal"
        onValueChange={(v) => {
          const n = Number(v);
          setInner(n);
          onValueChange?.(n);
        }}
        className="grid grid-cols-6 gap-1 @xl:grid-cols-11"
      >
        {words.map((_, n) => (
          <R.Item
            key={n}
            value={String(n)}
            aria-label={`${n} of 10`}
            className={cx(
              "h-control min-w-target rounded-control border border-border-control bg-surface text-body font-medium tabular-nums text-ink motion-fast transition-colors",
              "hover:bg-surface-sunken focus-visible:focus-ring",
              "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-ink-inverse",
              "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink",
            )}
          >
            {n}
          </R.Item>
        ))}
      </R.Root>
      <div className="flex justify-between text-small text-ink-muted" aria-hidden="true">
        <span>0 No pain</span>
        <span>10 Worst pain</span>
      </div>
      <p id={`${id}-d`} className="min-h-6 text-small font-medium text-ink" aria-live="polite">
        {current === null
          ? "Choose a number from 0 to 10."
          : `You chose ${current} of 10: ${words[current]!.toLowerCase()}.`}
      </p>
    </div>
  );
}
