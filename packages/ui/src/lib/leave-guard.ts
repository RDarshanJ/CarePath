"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openOverlayCount } from "./overlay-registry";

/**
 * Leave guard for routes with unsaved work (CD-306, CD-522).
 *
 * While `when` is true:
 * - `beforeunload` asks before a reload or tab close (the browser shows its own wording);
 * - a capturing click handler on the document intercepts in-app links (`a[href]`, same origin, no
 *   modifier keys, no `target`, not a download) before Next's Link handler sees them;
 * - the browser Back button is caught with one extra history entry for the same URL: Back pops that
 *   entry, the guard puts it back and asks.
 * The caller renders `LeaveGuardDialog` with the returned state. "Leave page" continues the navigation
 * that was stopped; "Stay on this page" closes the dialog and keeps everything.
 *
 * Limitations (the App Router has no route-change blocking API): `router.push` calls made by code are
 * not intercepted, so a screen with a guard must not navigate programmatically while dirty; Forward
 * after Back is not intercepted; the guard never opens while another overlay is open, because that
 * overlay handles its own unsaved state first. Nothing is written to browser storage.
 */

type Pending = { kind: "link"; anchor: HTMLAnchorElement; href: string } | { kind: "back" };

const MARK = "__cpLeaveGuard";

function isGuardedAnchor(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return null;
  }
  const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.hasAttribute("download") || (a.target && a.target !== "_self")) return null;
  if (a.dataset.leaveGuard === "off") return null;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const here = new URL(window.location.href);
  if (url.pathname === here.pathname && url.search === here.search) return null; // hash or same page
  return a;
}

export interface LeaveGuardState {
  open: boolean;
  stay: () => void;
  leave: () => void;
}

export function useLeaveGuard(when: boolean): LeaveGuardState {
  const [pending, setPending] = useState<Pending | null>(null);
  const active = useRef(when);
  active.current = when;
  const bypass = useRef(false);

  // beforeunload
  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypass.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  // In-app links.
  useEffect(() => {
    if (!when) return;
    const onClick = (e: MouseEvent) => {
      if (bypass.current || openOverlayCount() > 0) return;
      const a = isGuardedAnchor(e);
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ kind: "link", anchor: a, href: a.href });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [when]);

  // Back button: one sentinel entry for the same URL.
  useEffect(() => {
    if (!when) return;
    const state = (window.history.state ?? {}) as Record<string, unknown>;
    if (!state[MARK])
      window.history.pushState({ ...state, [MARK]: true }, "", window.location.href);
    const onPop = () => {
      if (bypass.current || !active.current) return;
      const now = (window.history.state ?? {}) as Record<string, unknown>;
      if (now[MARK]) return;
      window.history.pushState({ ...now, [MARK]: true }, "", window.location.href);
      if (openOverlayCount() > 0) return;
      setPending({ kind: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Became clean while still on the page: drop the sentinel so Back works in one press.
      const now = (window.history.state ?? {}) as Record<string, unknown>;
      if (!active.current && !bypass.current && now[MARK]) {
        window.history.back();
      }
    };
  }, [when]);

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    const p = pending;
    setPending(null);
    bypass.current = true;
    if (!p) return;
    if (p.kind === "back") {
      window.history.go(-2);
    } else if (p.anchor.isConnected) {
      p.anchor.click();
    } else {
      window.location.assign(p.href);
    }
  }, [pending]);

  return { open: pending !== null, stay, leave };
}
