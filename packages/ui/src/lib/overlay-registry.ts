"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Counts open modal overlays (dialogs, drawers, sheets). The toast region holds toasts while one is
 * open (CD-442 rule 3, CD-528), and the leave guard does not open over another overlay (CD-522).
 */
let open = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function overlayOpened(): () => void {
  open += 1;
  emit();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    open = Math.max(0, open - 1);
    emit();
  };
}

export const openOverlayCount = (): number => open;

export function useRegisterOverlay(active: boolean): void {
  useEffect(() => (active ? overlayOpened() : undefined), [active]);
}

export function useAnyOverlayOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open > 0,
    () => false,
  );
}
