"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import * as T from "@radix-ui/react-toast";
import { cx } from "../lib/cx";
import { IconButton } from "./button";
import { Icon, type IconName } from "./icons";

export type ToastTone = "success" | "info" | "error";
interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

const icons: Record<ToastTone, IconName> = {
  success: "check-circle",
  info: "info",
  error: "alert-circle",
};
const toneClass: Record<ToastTone, string> = {
  success: "text-success-ink",
  info: "text-info-ink",
  error: "text-error-ink",
};

const Ctx = createContext<((t: Omit<ToastItem, "id">) => void) | null>(null);

export function useToast() {
  const fn = useContext(Ctx);
  if (!fn) throw new Error("useToast must be used inside ToastProvider");
  return fn;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback(
    (t: Omit<ToastItem, "id">) =>
      setItems((cur) => [...cur, { ...t, id: Date.now() + Math.random() }]),
    [],
  );
  return (
    <Ctx.Provider value={push}>
      <T.Provider swipeDirection="right" duration={7000} label="Notifications">
        {children}
        {items.map((it) => (
          <T.Root
            key={it.id}
            onOpenChange={(open) => !open && setItems((cur) => cur.filter((c) => c.id !== it.id))}
            className="cp-toast flex items-start gap-3 rounded-container border border-border-control bg-surface p-4 shadow-overlay"
          >
            <Icon
              name={icons[it.tone]}
              size={20}
              className={cx("mt-0.5 shrink-0", toneClass[it.tone])}
            />
            <div className="min-w-0 flex-1">
              <T.Title className="text-label font-semibold text-ink">{it.title}</T.Title>
              {it.description ? (
                <T.Description className="mt-0.5 text-small text-ink-muted">
                  {it.description}
                </T.Description>
              ) : null}
            </div>
            <T.Close asChild>
              <IconButton label="Dismiss notification" icon="x" size="sm" className="-mt-1 -mr-1" />
            </T.Close>
          </T.Root>
        ))}
        <T.Viewport className="fixed right-0 bottom-0 z-50 m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
      </T.Provider>
    </Ctx.Provider>
  );
}

/** Static specimen of the toast surface for documentation. Live toasts come from useToast. */
export function ToastSurface({
  tone,
  title,
  description,
}: {
  tone: ToastTone;
  title: string;
  description?: string;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-container border border-border-control bg-surface p-4 shadow-overlay"
    >
      <Icon name={icons[tone]} size={20} className={cx("mt-0.5 shrink-0", toneClass[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
      </div>
    </div>
  );
}
