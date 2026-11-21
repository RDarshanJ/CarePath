"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";
import { useAnyOverlayOpen } from "../../lib/overlay-registry";
import {
  emptyToastQueue,
  toastQueue,
  type ToastInput,
  type ToastTone,
} from "../../lib/toast-queue";
import { IconButton } from "../primitives/button";
import { Icon, type IconName } from "../primitives/icons";

export type { ToastTone, ToastInput } from "../../lib/toast-queue";

/*
 * Toast policy (CD-442, CD-440, CD-528):
 * - success and info only; there is no error tone. Errors go in the place of the action (field error,
 *   error summary, a Banner above the action group or inside the open dialog, or the row).
 * - a toast is a supplement for an outcome with no other visible state; it never holds the only copy
 *   of something the person must act on;
 * - one visible at a time, duplicates merge, up to three wait;
 * - held while a dialog, drawer or sheet is open, shown after it closes;
 * - 7 seconds, paused while hovered or focused and while the window is in the background, always with
 *   a dismiss button; polite announcement. The patient app does not use toasts.
 */

export const TOAST_MS = 7000;

const icons: Record<ToastTone, IconName> = { success: "check-circle", info: "info" };
const toneClass: Record<ToastTone, string> = {
  success: "text-success-ink",
  info: "text-info-ink",
};

const Ctx = createContext<((t: ToastInput) => void) | null>(null);

export function useToast(): (t: ToastInput) => void {
  const fn = useContext(Ctx);
  if (!fn) throw new Error("useToast must be used inside ToastProvider");
  return fn;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const held = useAnyOverlayOpen();
  const [state, dispatch] = useReducer(toastQueue, emptyToastQueue);
  const heldRef = useRef(held);
  heldRef.current = held;
  const push = useCallback(
    (toast: ToastInput) => dispatch({ type: "push", toast, held: heldRef.current }),
    [],
  );
  useEffect(() => {
    if (!held) dispatch({ type: "release" });
  }, [held]);
  const current = held ? null : state.visible;
  return (
    <Ctx.Provider value={push}>
      {children}
      {/*
        The region never takes pointer events itself (only a toast does), and it sits above any sticky
        bottom bar (the sticky-offset token), so an empty region never covers the tab bar.
      */}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed right-0 bottom-[var(--cp-sticky-bottom)] z-30 flex w-full max-w-sm flex-col gap-2 p-4"
      >
        <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-auto">
          {current ? (
            <ToastItem
              key={current.id}
              tone={current.tone}
              title={current.title}
              description={current.description}
              onDismiss={() => dispatch({ type: "dismiss", id: current.id, held: heldRef.current })}
            />
          ) : null}
        </div>
      </section>
    </Ctx.Provider>
  );
}

function ToastItem({
  tone,
  title,
  description,
  onDismiss,
}: {
  tone: ToastTone;
  title: string;
  description?: string;
  onDismiss: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" && document.visibilityState === "hidden",
  );
  const left = useRef(TOAST_MS);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden" || !document.hasFocus());
    window.addEventListener("blur", onVis);
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onVis);
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const paused = hover || focus || hidden;
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const id = setTimeout(() => dismiss.current(), left.current);
    return () => {
      clearTimeout(id);
      left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [paused]);

  return (
    <div
      data-paused={paused || undefined}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
      className="cp-toast-enter flex items-start gap-3 rounded-container border border-border-control bg-surface p-4 shadow-overlay"
    >
      <Icon name={icons[tone]} size={20} className={cx("mt-0.5 shrink-0", toneClass[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
      </div>
      <IconButton
        label="Dismiss notification"
        icon="x"
        tooltip={false}
        className="-mt-1 -mr-1"
        onClick={onDismiss}
      />
    </div>
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
    <div className="flex items-start gap-3 rounded-container border border-border-control bg-surface p-4 shadow-overlay">
      <Icon name={icons[tone]} size={20} className={cx("mt-0.5 shrink-0", toneClass[tone])} />
      <div className="min-w-0 flex-1">
        <p className="text-label font-semibold text-ink">{title}</p>
        {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
      </div>
    </div>
  );
}
