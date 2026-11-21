"use client";

import { useEffect, type RefObject } from "react";

/**
 * Keeps the focused control clear of a sticky bar (WCAG 2.4.11, CD-125). The browser scrolls a newly
 * focused element into view, but it does not know about a bar stuck to the top or bottom of the
 * viewport, so a control can land under it. When focus lands outside the bar on something the bar
 * covers, the page scrolls by the overlap plus a small margin.
 */
export function useFocusClearOf(bar: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const b = bar.current;
      if (!el || !b || b.contains(el) || !(el instanceof HTMLElement)) return;
      // A sheet or dialog sits above the page; the bar cannot cover what is inside it.
      if (el.closest('[role="dialog"], [role="alertdialog"]')) return;
      const r = el.getBoundingClientRect();
      const box = b.getBoundingClientRect();
      if (r.bottom <= box.top || r.top >= box.bottom) return;
      const gap = 16;
      const stuckBottom = box.bottom >= window.innerHeight - 1;
      window.scrollBy({
        top: stuckBottom ? r.bottom - box.top + gap : -(box.bottom - r.top + gap),
        behavior: "instant",
      });
    };
    document.addEventListener("focusin", onFocus);
    return () => document.removeEventListener("focusin", onFocus);
  }, [bar]);
}
