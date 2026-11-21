"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Focus helpers for view and state changes (CD-120). One implementation for every flow: the new view's
 * heading takes focus on a step change, an error summary takes focus on a failed submit, and focus goes
 * back to the opener (or the next sensible element) when an overlay closes or a row disappears.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(container: ParentNode | null | undefined): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true",
  );
}

/** Focuses an element that is not normally focusable (a heading, a banner) without a scroll jump. */
export function focusStatic(el: HTMLElement | null | undefined): void {
  if (!el) return;
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: false });
}

/**
 * Focuses the first element that still exists among the candidates. Used after a row is removed: try
 * the next row, then the previous one, then the list heading (CD-120, CD-520).
 */
export function focusFirstAvailable(
  candidates: Array<HTMLElement | null | undefined | (() => HTMLElement | null | undefined)>,
): HTMLElement | null {
  for (const c of candidates) {
    const el = typeof c === "function" ? c() : c;
    if (el && el.isConnected) {
      focusStatic(el);
      return el;
    }
  }
  return null;
}

/**
 * Moves focus to `ref` whenever `key` changes, but not on the first render of a page (the browser's own
 * focus is right there). Pass `onMount: true` for elements that mount as the result of an action (a
 * banner after a failed save, a confirmation view).
 */
export function useFocusOnChange(
  ref: RefObject<HTMLElement | null>,
  key: unknown,
  { onMount = false, enabled = true }: { onMount?: boolean; enabled?: boolean } = {},
): void {
  const first = useRef(true);
  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      if (!onMount) return;
    }
    focusStatic(ref.current);
    // `key` is the trigger by design.
  }, [key, enabled]);
}
