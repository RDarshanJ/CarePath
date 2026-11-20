import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "./icons";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const tone: Record<StatusTone, { chip: string; tag: string; icon: IconName }> = {
  success: {
    chip: "bg-success-bg text-success-ink",
    tag: "border-success-ink text-success-ink",
    icon: "check-circle",
  },
  warning: {
    chip: "bg-warning-bg text-warning-ink",
    tag: "border-warning-ink text-warning-ink",
    icon: "alert-triangle",
  },
  error: {
    chip: "bg-error-bg text-error-ink",
    tag: "border-error-ink text-error-ink",
    icon: "alert-circle",
  },
  info: { chip: "bg-info-bg text-info-ink", tag: "border-info-ink text-info-ink", icon: "info" },
  neutral: {
    chip: "bg-neutral-bg text-neutral-ink",
    tag: "border-border-control text-neutral-ink",
    icon: "dot",
  },
};

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  children: ReactNode;
  icon?: IconName;
}

/**
 * Clinical status (discomfort reported, needs review): FILLED tint, an icon and words.
 * Never use for administrative state; use Tag for that.
 */
export function StatusChip({ tone: t, icon, className, children, ...rest }: StatusChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-label font-medium whitespace-nowrap",
        tone[t].chip,
        className,
      )}
      {...rest}
    >
      <Icon name={icon ?? tone[t].icon} size={14} />
      {children}
    </span>
  );
}

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  children: ReactNode;
}

/** Administrative status (intake incomplete, unscheduled): OUTLINED, text only, no fill and no icon. */
export function Tag({ tone: t = "neutral", className, children, ...rest }: TagProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-control border bg-transparent px-2 py-px text-caption font-medium whitespace-nowrap",
        tone[t].tag,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export interface BannerProps {
  tone: Exclude<StatusTone, "neutral">;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const bannerRole = {
  error: "alert",
  warning: "status",
  success: "status",
  info: "status",
} as const;

/** Inline message: icon, bold title, plain sentence. Errors state what happened, whether data is safe, and one next step. */
export function Banner({ tone: t, title, children, action, className }: BannerProps) {
  return (
    <div
      role={bannerRole[t]}
      className={cx(
        "flex items-start gap-3 rounded-container border border-current p-4",
        tone[t].chip,
        className,
      )}
    >
      <Icon name={tone[t].icon} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold">{title}</p>
        {children ? <div className="mt-0.5 max-w-measure text-body">{children}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2 text-ink">{action}</div> : null}
      </div>
    </div>
  );
}
