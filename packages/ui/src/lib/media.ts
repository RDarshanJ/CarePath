"use client";

import { useSyncExternalStore } from "react";

/**
 * Layout breakpoints that change which surface a component renders (not only its styling).
 * DR-002 R6: side-by-side work from 1280 px; below it the second pane is a drawer; below 768 px it is a
 * full screen. The patient bottom sheet becomes a centred dialog from 768 px (CD-525).
 */
export const breakpoints = { md: 768, side: 1280 } as const;

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (l) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", l);
      return () => m.removeEventListener("change", l);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** "inline" from 1280, "drawer" from 768, "screen" below (R6). */
export type PaneMode = "inline" | "drawer" | "screen";

export function paneModeFor(width: number): PaneMode {
  if (width >= breakpoints.side) return "inline";
  if (width >= breakpoints.md) return "drawer";
  return "screen";
}

export function usePaneMode(serverValue: PaneMode = "inline"): PaneMode {
  const wide = useMediaQuery(`(min-width: ${breakpoints.side}px)`, serverValue === "inline");
  const md = useMediaQuery(`(min-width: ${breakpoints.md}px)`, serverValue !== "screen");
  return wide ? "inline" : md ? "drawer" : "screen";
}
