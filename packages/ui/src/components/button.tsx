"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-control border " +
  "text-label font-medium whitespace-nowrap motion-fast transition-colors focus-visible:focus-ring " +
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink";

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-ink-inverse hover:bg-primary-hover active:bg-primary-active",
  secondary:
    "border-border-control bg-surface text-ink hover:bg-surface-sunken active:bg-primary-subtle",
  quiet: "border-transparent text-primary hover:bg-primary-subtle active:bg-primary-subtle",
  danger:
    "border-transparent bg-error-ink text-ink-inverse hover:bg-error-hover active:bg-error-hover",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and the loading label, and blocks repeat presses. The button keeps its width. */
  loading?: boolean;
  loadingLabel?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
  asChild?: boolean;
  /** Square button with no horizontal padding. Use IconButton rather than setting this directly. */
  iconOnly?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingLabel = "Working",
    iconLeft,
    iconRight,
    asChild,
    iconOnly,
    className,
    disabled,
    children,
    type,
    ...rest
  },
  ref,
) {
  const classes = cx(
    base,
    variants[variant],
    size === "sm" ? "h-control-sm" : "h-control",
    iconOnly ? (size === "sm" ? "w-control-sm" : "size-control") : "px-control",
    className,
  );
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...rest}>
        {children}
      </Slot>
    );
  }
  const { onClick, ...others } = rest;
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={classes}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
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
        <>
          {iconLeft ? <Icon name={iconLeft} /> : null}
          {children}
          {iconRight ? <Icon name={iconRight} /> : null}
        </>
      )}
    </button>
  );
});

export interface IconButtonProps extends Omit<
  ButtonProps,
  "iconLeft" | "iconRight" | "children" | "loadingLabel"
> {
  /** Required accessible name. The icon is the only visible content. */
  label: string;
  icon: IconName;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = "quiet", size = "md", className, ...rest },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      iconOnly
      className={className}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 20} />
    </Button>
  );
});
