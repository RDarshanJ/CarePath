"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "../primitives/icons";
import { chipToneClass, statusIcon, type StatusTone } from "../primitives/status";

export type BannerTone = Exclude<StatusTone, "neutral">;

const bannerRole: Record<BannerTone, "alert" | "status"> = {
  error: "alert",
  warning: "status",
  success: "status",
  info: "status",
};

export interface BannerProps {
  tone: BannerTone;
  /** Specific heading: what happened ("Your note was not saved"), not "Error". */
  title: string;
  /** Whether data is safe and the state things are in ("Your text is still here."). */
  children?: ReactNode;
  /** One next step (a button) and, if needed, a way out (CD-449). */
  action?: ReactNode;
  /**
   * Move focus to the banner heading when it appears: for an error after a submit or inside an
   * overlay (CD-449, CD-528). Re-focuses when `focusKey` changes (a second failure).
   */
  focusOnMount?: boolean;
  focusKey?: unknown;
  /** A heading element when the banner starts a section of the page ("Your plan changed"). */
  titleAs?: "p" | "h2" | "h3" | "h4";
  titleId?: string;
  className?: string;
}

/**
 * The one banner (CD-443, CD-535): icon, bold title, plain sentence, optional action. Error banners are
 * `role="alert"`, others `role="status"`. Not dismissible, except an information banner whose action
 * acknowledges it. At most one per scope: rank messages instead of stacking banners.
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    tone: t,
    title,
    children,
    action,
    focusOnMount = false,
    focusKey,
    titleAs: TitleTag = "p",
    titleId,
    className,
  },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useImperativeHandle(ref, () => root.current as HTMLDivElement);
  useEffect(() => {
    if (focusOnMount) heading.current?.focus();
  }, [focusOnMount, focusKey]);
  return (
    <div
      ref={root}
      role={bannerRole[t]}
      className={cx(
        "flex items-start gap-3 rounded-container border border-current p-4",
        chipToneClass(t),
        className,
      )}
    >
      <Icon name={statusIcon(t)} size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <TitleTag
          ref={heading}
          id={titleId}
          tabIndex={focusOnMount ? -1 : undefined}
          className="text-label font-semibold focus:outline-none"
        >
          {title}
        </TitleTag>
        {children ? <div className="mt-0.5 max-w-measure text-body">{children}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2 text-ink">{action}</div> : null}
      </div>
    </div>
  );
});
