"use client";

import { forwardRef } from "react";
import * as S from "@radix-ui/react-select";
import { cx } from "../lib/cx";
import { Icon } from "./icons";
import { overlayClasses } from "./overlay-classes";
import { ThemeWrap } from "./theme";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
}

const surfaceOverlay = overlayClasses.surface;

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    placeholder = "Choose one",
    className,
    id,
    disabled,
    name,
    value,
    defaultValue,
    onValueChange,
    ...aria
  },
  ref,
) {
  return (
    <S.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <S.Trigger
        ref={ref}
        id={id}
        className={cx(
          "flex h-control w-full items-center justify-between gap-2 rounded-control border border-border-control bg-surface px-control text-left text-body text-ink",
          "motion-fast transition-colors hover:border-ink-muted focus-visible:focus-ring data-[placeholder]:text-ink-muted",
          "aria-[invalid=true]:border-2 aria-[invalid=true]:border-error-ink",
          "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled-bg disabled:text-disabled-ink",
          className,
        )}
        {...aria}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <Icon name="chevron-down" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <ThemeWrap>
          <S.Content
            position="popper"
            sideOffset={4}
            className={cx(
              "cp-menu z-50 max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-control",
              surfaceOverlay,
            )}
          >
            <S.Viewport className="p-1">
              {options.map((o) => (
                <S.Item
                  key={o.value}
                  value={o.value}
                  disabled={o.disabled}
                  className={cx(
                    "relative flex min-h-target cursor-pointer select-none items-center rounded-control py-1.5 pr-3 pl-8 text-body outline-none",
                    "data-[highlighted]:bg-primary-subtle data-[state=checked]:font-medium data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled-ink",
                  )}
                >
                  <S.ItemIndicator className="absolute left-2.5 inline-flex">
                    <Icon name="check" size={16} />
                  </S.ItemIndicator>
                  <S.ItemText>{o.label}</S.ItemText>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </ThemeWrap>
      </S.Portal>
    </S.Root>
  );
});
