"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import * as T from "@radix-ui/react-tabs";
import { cx } from "../../lib/cx";
import { useUrlParam } from "../../lib/url-state";

/*
 * Tabs (CD-504, CD-533). Radix tabs: one tab stop, arrow keys, Home and End. The record keeps its
 * section in the URL with a history entry per change (useUrlTab); the builder keeps tabs in memory.
 * No counts on triggers until server totals exist; repeat the section heading inside each panel.
 */

export const Tabs = T.Root;

export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof T.List>>(
  function TabsList({ className, children, ...rest }, ref) {
    const inner = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => inner.current as HTMLDivElement);
    const [scrolls, setScrolls] = useState(false);
    useEffect(() => {
      const el = inner.current;
      if (!el) return;
      const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1);
      check();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
      ro?.observe(el);
      return () => ro?.disconnect();
    }, []);
    return (
      <div className="min-w-0">
        <T.List
          ref={inner}
          className={cx("flex gap-1 overflow-x-auto border-b border-border", className)}
          {...rest}
        >
          {children}
        </T.List>
        {scrolls ? (
          <p className="mt-1 text-caption text-ink-muted">
            More sections: scroll the list sideways or use the arrow keys.
          </p>
        ) : null}
      </div>
    );
  },
);

/** Selected tab: `selected-edge` bar, semibold, `selected-ink`. Hover: `primary-subtle`. */
export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof T.Trigger>
>(function TabsTrigger({ className, ...rest }, ref) {
  return (
    <T.Trigger
      ref={ref}
      className={cx(
        "-mb-px inline-flex min-h-target shrink-0 items-center border-b-2 border-transparent px-control text-label font-medium whitespace-nowrap text-ink-muted motion-fast transition-colors",
        "hover:bg-primary-subtle hover:text-ink focus-visible:focus-ring",
        "data-[state=active]:border-selected-edge data-[state=active]:font-semibold data-[state=active]:text-selected-ink",
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

/**
 * The active tab as a URL parameter with a history entry per change, so Back returns to the previous
 * section and a link opens the right one. Values are restricted to `tabs`. Pass the server's value as
 * `initial` to keep hydration stable.
 */
export function useUrlTab<T extends string>(
  tabs: readonly T[],
  {
    param = "tab",
    defaultTab,
    initial,
  }: { param?: string; defaultTab?: T; initial?: string | null } = {},
): [T, (next: string) => void] {
  const fallback = defaultTab ?? tabs[0]!;
  const [value, set] = useUrlParam<T>(param, {
    allowed: tabs,
    defaultValue: fallback,
    initialValue: initial ?? null,
    history: "push",
  });
  return [value, (next: string) => set(next as T)];
}
