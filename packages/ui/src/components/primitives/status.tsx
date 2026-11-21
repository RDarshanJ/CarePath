import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./icons";

/*
 * Status presentation rules (CD-230):
 * - an expected state is plain text (no badge for "Completed" on every past row);
 * - an administrative state is a Tag: outlined, text only, no icon;
 * - a state that needs attention or is live is a StatusChip: filled tint, icon and words;
 * - no standalone dots, and the words are always visible (never only for screen readers).
 * `critical` is for the few items that must be seen first (a session stopped for discomfort, a failed
 * clinical save); an administrative priority is not a medical risk and does not use it.
 */
export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";
export type ChipTone = StatusTone | "critical";

const chipTone: Record<ChipTone, { chip: string; icon: IconName }> = {
  success: { chip: "bg-success-bg text-success-ink", icon: "check-circle" },
  warning: { chip: "bg-warning-bg text-warning-ink", icon: "alert-triangle" },
  error: { chip: "bg-error-bg text-error-ink", icon: "alert-circle" },
  info: { chip: "bg-info-bg text-info-ink", icon: "info" },
  neutral: { chip: "bg-neutral-bg text-neutral-ink", icon: "clock" },
  critical: { chip: "bg-critical-subtle-bg text-critical-subtle-ink", icon: "alert-octagon" },
};

export const tagTone: Record<StatusTone, string> = {
  success: "border-success-ink text-success-ink",
  warning: "border-warning-ink text-warning-ink",
  error: "border-error-ink text-error-ink",
  info: "border-info-ink text-info-ink",
  neutral: "border-border-control text-neutral-ink",
};

export const statusIcon = (tone: ChipTone): IconName => chipTone[tone].icon;
export const chipToneClass = (tone: ChipTone): string => chipTone[tone].chip;

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone: ChipTone;
  children: ReactNode;
  icon?: IconName;
}

/** Needs attention or live (discomfort reported, not yet reviewed, message not sent): tint, icon, words. */
export function StatusChip({ tone: t, icon, className, children, ...rest }: StatusChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-label font-medium whitespace-nowrap",
        chipTone[t].chip,
        className,
      )}
      {...rest}
    >
      <Icon name={icon ?? chipTone[t].icon} size={14} className="shrink-0" />
      {children}
    </span>
  );
}

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  children: ReactNode;
}

/** Administrative state (intake incomplete, current version, cancelled): outlined, text only, no icon. */
export function Tag({ tone: t = "neutral", className, children, ...rest }: TagProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-control border bg-transparent px-2 py-px text-caption font-medium whitespace-nowrap",
        tagTone[t],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

/** "99+" above 99; the accessible text always carries the full value and the unit (CD-508). */
export function countBadgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/**
 * The one count badge (CD-508): one filled look in every app and nav, tabular figures, hidden at zero.
 * `unit` gives the accessible text ("3 unread", "12 open"); the number shown may be capped at 99+.
 * Show a badge only where the API returns a true total.
 */
export function CountBadge({
  count,
  unit,
  className,
}: {
  count: number;
  unit: string;
  className?: string;
}) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return (
    <span
      className={cx(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-control bg-primary px-1.5 text-caption font-semibold tabular-nums text-ink-inverse",
        className,
      )}
    >
      <span aria-hidden="true">{countBadgeText(count)}</span>
      <span className="sr-only">
        {count} {unit}
      </span>
    </span>
  );
}
