"use client";

import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type ElementType,
  type ReactNode,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./icons";
import { isExternalHref, useLinkComponent } from "./link";

/**
 * Button hierarchy (CD-420, design-tokens section 3):
 * - primary: the one main action of the current context (filled cobalt);
 * - secondary: outline, cobalt border and label, for the supporting action of a view;
 * - neutral: utility actions (Edit, Pause, Refresh), grey control border and ink label;
 * - quiet: tertiary, text only (Remove, Clear filters);
 * - danger: only the confirming button inside a destructive ConfirmDialog (CD-421, CD-521).
 * `tone="critical"` on secondary marks the control that starts a safety action ("Stop, this hurts"):
 * error-ink border and label plus the alert icon, never colour alone.
 */
export type ButtonVariant = "primary" | "secondary" | "neutral" | "quiet" | "danger";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-control border " +
  "text-label font-medium whitespace-nowrap motion-fast transition-[background-color,border-color,color,transform] focus-visible:focus-ring " +
  "active:scale-98 " +
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink disabled:active:scale-100 " +
  "aria-disabled:cursor-not-allowed aria-disabled:border-border aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink aria-disabled:active:scale-100";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-ink-inverse hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border-secondary-border bg-surface text-link hover:bg-secondary-hover-bg active:bg-primary-subtle active:text-primary-active",
  neutral:
    "border-border-control bg-surface text-ink hover:bg-surface-sunken active:bg-selected-bg",
  quiet:
    "border-transparent bg-transparent text-link hover:bg-primary-subtle active:bg-selected-bg active:text-primary-active",
  danger:
    "border-transparent bg-error-ink text-ink-inverse hover:bg-error-hover active:bg-error-hover",
};

const critical =
  "border-error-ink bg-surface text-error-ink hover:bg-error-bg active:bg-error-bg active:text-error-hover";

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: "critical";
  iconOnly?: boolean;
  /** Full width below 640 px, auto above (patient flows). */
  fullWidthOnPhone?: boolean;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  tone,
  iconOnly,
  fullWidthOnPhone,
}: ButtonClassOptions = {}): string {
  return cx(
    base,
    tone === "critical" ? critical : buttonVariants[variant],
    size === "sm" ? "h-control-sm" : "h-control",
    iconOnly ? (size === "sm" ? "w-control-sm" : "size-control") : "px-control",
    fullWidthOnPhone && "w-full whitespace-normal sm:w-auto",
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Only with `variant="secondary"`; for the control that starts a safety or destructive action. */
  tone?: "critical";
  /** Shows a spinner and the loading label (in words), and blocks repeat presses. */
  loading?: boolean;
  loadingLabel?: string;
  /**
   * Unavailable because of a state, not an input (not on the care team, nothing to publish): stays
   * focusable with `aria-disabled`, ignores presses. Pair it with a visible reason linked through
   * `aria-describedby` (CD-429).
   */
  unavailable?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  asChild?: boolean;
  /** Navigation that looks like a button (CD-530): renders the app's link element. */
  href?: string;
  linkAs?: ElementType;
  fullWidthOnPhone?: boolean;
  /** Square button with no horizontal padding. Use IconButton rather than setting this directly. */
  iconOnly?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    tone,
    loading = false,
    loadingLabel = "Working",
    unavailable = false,
    iconLeft,
    iconRight,
    asChild,
    href,
    linkAs,
    fullWidthOnPhone,
    iconOnly,
    className,
    disabled,
    children,
    type,
    ...rest
  },
  ref,
) {
  const Provided = useLinkComponent();
  const classes = cx(buttonClasses({ variant, size, tone, iconOnly, fullWidthOnPhone }), className);
  const leading = tone === "critical" && !iconLeft ? "alert-circle" : iconLeft;
  const content = (
    <>
      {leading ? <Icon name={leading} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} /> : null}
    </>
  );
  if (href !== undefined) {
    const Comp: ElementType = linkAs ?? (isExternalHref(href) ? "a" : Provided);
    const anchorRest = rest as Record<string, unknown>;
    return (
      <Comp ref={ref} href={href} className={classes} {...anchorRest}>
        {content}
      </Comp>
    );
  }
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...rest}>
        {children}
      </Slot>
    );
  }
  const { onClick, ...others } = rest;
  const blocked = loading || unavailable;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={unavailable || undefined}
      onClick={blocked ? (e) => e.preventDefault() : onClick}
      {...others}
    >
      {loading ? (
        <>
          <span
            className="cp-spinner inline-block size-4 rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        content
      )}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  ButtonProps,
  "iconLeft" | "iconRight" | "children" | "loadingLabel" | "href" | "tone"
> {
  /** Required accessible name, naming the object ("Close evidence panel", "Move Squat up"). */
  label: string;
  icon: IconName;
  /** The visible name appears as a tooltip on hover and keyboard focus (CD-426). Off for touch-only UI. */
  tooltip?: boolean;
}

/**
 * Icon-only control (CD-426): allowed only for close, dismiss, move up and down, evidence numbers and
 * labelled pagination chevrons. Never in the patient app except a dialog close. The tooltip repeats the
 * accessible name and never carries anything else.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    variant = "quiet",
    size = "md",
    tooltip = true,
    className,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const [shown, setShown] = useState(false);
  const button = (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      iconOnly
      className={className}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setShown(true);
        onPointerEnter?.(e);
      }}
      onPointerLeave={(e) => {
        setShown(false);
        onPointerLeave?.(e);
      }}
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) setShown(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setShown(false);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && shown) setShown(false);
        onKeyDown?.(e);
      }}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 20} />
    </Button>
  );
  if (!tooltip) return button;
  // The tooltip repeats the accessible name, so it is hidden from assistive technology (no double
  // reading). It appears on mouse hover and keyboard focus, and Escape hides it (WCAG 1.4.13).
  return (
    <span className="relative inline-flex">
      {button}
      {shown ? (
        <span
          aria-hidden="true"
          data-tooltip=""
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 rounded-control bg-ink px-2.5 py-1 text-small whitespace-nowrap text-ink-inverse shadow-overlay"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
});
