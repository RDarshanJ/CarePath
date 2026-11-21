"use client";

import { forwardRef, useId, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as C from "@radix-ui/react-checkbox";
import * as R from "@radix-ui/react-radio-group";
import * as W from "@radix-ui/react-switch";
import { cx } from "../../lib/cx";
import { Icon } from "./icons";

/*
 * The label is the hit area (DR-004 U6): at least the theme's target tall, with the first line centred
 * on it, and the 24 px box centred on that line, in both themes.
 */
const row = "group flex items-start gap-3";
const labelBlock =
  "block min-h-target min-w-0 flex-1 py-[calc((var(--cp-target-min)-var(--cp-text-body-lh))/2)]";
const boxOffset = "mt-[calc((var(--cp-target-min)-24px)/2)]";
const labelText = "text-body text-ink";
const hintText = "block text-small text-ink-muted";

const box =
  "inline-flex size-6 shrink-0 items-center justify-center border border-border-control bg-surface text-ink-inverse " +
  "motion-fast transition-colors hover:border-ink-muted focus-visible:focus-ring " +
  "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary " +
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink disabled:data-[state=checked]:border-disabled-ink disabled:data-[state=checked]:bg-disabled-ink disabled:data-[state=checked]:text-ink-inverse aria-[invalid=true]:border-2 aria-[invalid=true]:border-error-ink";

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<typeof C.Root>, "children"> {
  label: ReactNode;
  hint?: ReactNode;
}

/** The box and its label are the hit area; the label is at least the theme's minimum target tall. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { label, hint, className, id, disabled, ...rest },
  ref,
) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className={cx(row, className)}>
      <C.Root
        ref={ref}
        id={cid}
        disabled={disabled}
        className={cx(box, boxOffset, "rounded-control")}
        {...rest}
      >
        <C.Indicator>
          <Icon
            name={rest.checked === "indeterminate" ? "minus" : "check"}
            size={16}
            strokeWidth={2.5}
          />
        </C.Indicator>
      </C.Root>
      <label
        htmlFor={cid}
        className={cx(
          labelBlock,
          "cursor-pointer",
          disabled && "cursor-not-allowed text-disabled-ink",
        )}
      >
        <span className={cx(labelText, disabled && "text-disabled-ink")}>{label}</span>
        {hint ? <span className={hintText}>{hint}</span> : null}
      </label>
    </div>
  );
});

export const RadioGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof R.Root>>(
  function RadioGroup({ className, ...rest }, ref) {
    return <R.Root ref={ref} className={cx("flex flex-col", className)} {...rest} />;
  },
);

export interface RadioProps extends Omit<ComponentPropsWithoutRef<typeof R.Item>, "children"> {
  label: ReactNode;
  hint?: ReactNode;
}

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  { label, hint, className, id, disabled, ...rest },
  ref,
) {
  const auto = useId();
  const rid = id ?? auto;
  return (
    <div className={cx(row, className)}>
      <R.Item
        ref={ref}
        id={rid}
        disabled={disabled}
        className={cx(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border-control bg-surface",
          boxOffset,
          "motion-fast transition-colors hover:border-ink-muted focus-visible:focus-ring data-[state=checked]:border-2 data-[state=checked]:border-primary",
          "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg",
        )}
        {...rest}
      >
        <R.Indicator className="block size-3 rounded-full bg-primary" />
      </R.Item>
      <label
        htmlFor={rid}
        className={cx(labelBlock, "cursor-pointer", disabled && "cursor-not-allowed")}
      >
        <span className={cx(labelText, disabled && "text-disabled-ink")}>{label}</span>
        {hint ? <span className={hintText}>{hint}</span> : null}
      </label>
    </div>
  );
});

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<typeof W.Root>, "children"> {
  label: ReactNode;
  hint?: ReactNode;
  /** Words shown beside the switch so state never relies on position or colour alone. */
  onText?: string;
  offText?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    label,
    hint,
    onText = "On",
    offText = "Off",
    className,
    id,
    disabled,
    checked,
    defaultChecked,
    onCheckedChange,
    ...rest
  },
  ref,
) {
  const auto = useId();
  const sid = id ?? auto;
  const [inner, setInner] = useState(defaultChecked ?? false);
  const on = checked ?? inner;
  return (
    <div className={cx("flex items-start justify-between gap-4", className)}>
      <label htmlFor={sid} className={cx(labelBlock, "cursor-pointer")}>
        <span className={cx(labelText, disabled && "text-disabled-ink")}>{label}</span>
        {hint ? <span className={hintText}>{hint}</span> : null}
      </label>
      <div className="mt-[calc((var(--cp-target-min)-28px)/2)] flex items-center gap-2">
        <span aria-hidden="true" className="w-7 text-right text-small font-medium text-ink-muted">
          {on ? onText : offText}
        </span>
        <W.Root
          ref={ref}
          id={sid}
          disabled={disabled}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={(v) => {
            setInner(v);
            onCheckedChange?.(v);
          }}
          className={cx(
            "inline-flex h-7 w-12 shrink-0 items-center rounded-control border border-border-control bg-surface-sunken p-0.5 motion-fast transition-colors",
            "focus-visible:focus-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary",
            "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg",
          )}
          {...rest}
        >
          <W.Thumb className="block size-5 rounded-control border border-border-control bg-surface motion-fast transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:border-surface" />
        </W.Root>
      </div>
    </div>
  );
});
