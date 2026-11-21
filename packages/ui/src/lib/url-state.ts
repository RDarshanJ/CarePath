"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * One query parameter as state (CD-504, CD-533, CD-333). Writes go through `window.history`, which the
 * Next.js App Router keeps in sync with `useSearchParams`, so this package needs no Next import.
 * `push` adds a history entry (record section tabs: Back returns to the previous tab); `replace` does not.
 *
 * Never put a patient name, MRN, birth date or search text in a parameter (DR-002 R2). Values are
 * restricted to the `allowed` list so a hand-edited URL cannot inject one.
 */

const listeners = new Set<() => void>();
let patched = false;

function notify() {
  for (const l of listeners) l();
}

function ensurePatched() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  window.addEventListener("popstate", notify);
}

function subscribe(listener: () => void) {
  ensurePatched();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readParam(search: string, name: string): string | null {
  return new URLSearchParams(search).get(name);
}

/** The URL after setting (or, for the default value, removing) one parameter. Hash is kept. */
export function withParam(href: string, name: string, value: string | null): string {
  const url = new URL(href, "http://x");
  if (value === null || value === "") url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
}

export function useUrlParam<T extends string>(
  name: string,
  {
    allowed,
    defaultValue,
    initialValue,
    history = "push",
  }: {
    allowed: readonly T[];
    defaultValue: T;
    /** The value the server rendered with (from the page's searchParams), so hydration matches. */
    initialValue?: string | null;
    history?: "push" | "replace";
  },
): [T, (next: T) => void] {
  const coerce = (v: string | null | undefined): T =>
    v && (allowed as readonly string[]).includes(v) ? (v as T) : defaultValue;
  const value = useSyncExternalStore(
    subscribe,
    () => coerce(readParam(window.location.search, name)),
    () => coerce(initialValue),
  );
  const set = useCallback(
    (next: T) => {
      const href = withParam(
        window.location.href,
        name,
        next === defaultValue ? null : (next as string),
      );
      const state = window.history.state as unknown;
      if (history === "push") window.history.pushState(state, "", href);
      else window.history.replaceState(state, "", href);
      notify();
    },
    [name, defaultValue, history],
  );
  return [value, set];
}
