"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as T from "@radix-ui/react-tabs";
import { cx } from "../lib/cx";

export const Tabs = T.Root;

export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof T.List>>(
  function TabsList({ className, ...rest }, ref) {
    return (
      <T.List
        ref={ref}
        className={cx("flex gap-1 overflow-x-auto border-b border-border", className)}
        {...rest}
      />
    );
  },
);

/** Selected tab: 2 px bar, semibold weight and ink colour. Not colour alone. */
export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof T.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <T.Trigger
      ref={ref}
      className={cx(
        "-mb-px inline-flex h-control shrink-0 items-center border-b-2 border-transparent px-control text-label font-medium text-ink-muted motion-fast transition-colors",
        "hover:bg-surface-sunken hover:text-ink focus-visible:focus-ring data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-ink",
        "disabled:cursor-not-allowed disabled:text-disabled-ink",
        className,
      )}
      {...rest}
    />
  );
});

export const TabsContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof T.Content>>(
  function TabsContent({ className, ...rest }, ref) {
    return (
      <T.Content ref={ref} className={cx("pt-4 focus-visible:focus-ring", className)} {...rest} />
    );
  },
);
