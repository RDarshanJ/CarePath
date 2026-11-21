"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import * as D from "@radix-ui/react-dialog";
import * as P from "@radix-ui/react-popover";
import * as TT from "@radix-ui/react-tooltip";
import * as M from "@radix-ui/react-dropdown-menu";
import { cx } from "../../lib/cx";
import { type LeaveGuardState } from "../../lib/leave-guard";
import { usePaneMode, type PaneMode } from "../../lib/media";
import { useRegisterOverlay } from "../../lib/overlay-registry";
import { Button, IconButton } from "../primitives/button";
import { Icon } from "../primitives/icons";
import { overlayClasses } from "./overlay-classes";
import { ThemeWrap } from "../primitives/theme";

/*
 * Overlay rules (CD-520 to CD-528):
 * - one overlay at a time; an overlay never opens another one;
 * - a visible title is the accessible name, a description when the action has consequences, a header
 *   close control, Esc closes unless there is unsaved text;
 * - focus moves in, is trapped and returns to the opener;
 * - feedback for an action taken in an overlay stays in the overlay (a Banner above the footer that
 *   takes focus); toasts wait until the overlay closes;
 * - background scroll is locked; the body scrolls; footer actions stay reachable at large text.
 */

const overlaySurface = overlayClasses.surface;

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/** Words for the in-place discard row (CD-522): "Discard your note?", "Discard note", "Keep editing". */
export interface DiscardText {
  question: string;
  confirmLabel: string;
  keepLabel?: string;
}

const defaultDiscard: DiscardText = {
  question: "Discard your changes?",
  confirmLabel: "Discard changes",
  keepLabel: "Keep editing",
};

/** Shared presentational body so the gallery can show an open dialog in place. */
export function DialogPanel({
  title,
  description,
  footer,
  feedback,
  children,
  onClose,
  titleAs: Title = "h2",
  descAs: Desc = "p",
}: {
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  feedback?: ReactNode;
  children?: ReactNode;
  onClose?: ReactNode;
  /** Radix Title and Description inside a live dialog; plain elements for static specimens. */
  titleAs?: ElementType;
  descAs?: ElementType;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <Title className="font-heading text-h3 font-semibold text-ink">{title}</Title>
        {onClose}
      </div>
      {description ? (
        <Desc className="mt-1.5 max-w-measure text-body text-ink-muted">{description}</Desc>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {feedback ? <div className="mt-4">{feedback}</div> : null}
      {footer ? (
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {footer}
        </div>
      ) : null}
    </>
  );
}

/** Mounted inside Radix Content, which exists only while open: counts the overlay as open. */
function OverlayMark() {
  useRegisterOverlay(true);
  return null;
}

/** The discard row that replaces a dirty overlay's footer (CD-522). */
function DiscardRow({ text, onKeep }: { text: DiscardText; onKeep: () => void }) {
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);
  return (
    <div
      role="group"
      aria-labelledby="cp-discard-q"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
    >
      <p id="cp-discard-q" className="text-label font-semibold text-ink sm:mr-auto">
        {text.question}
      </p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button ref={keep} variant="secondary" onClick={onKeep}>
          {text.keepLabel ?? "Keep editing"}
        </Button>
        <D.Close asChild>
          <Button variant="danger">{text.confirmLabel}</Button>
        </D.Close>
      </div>
    </div>
  );
}

/**
 * State for a dirty overlay: Esc, outside click and the close control do not close it; Esc and close
 * show the discard row instead. Focus goes back to where the person was typing on "Keep editing".
 */
function useDirtyDismiss(dirty: boolean) {
  const [confirming, setConfirming] = useState(false);
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!dirty) setConfirming(false);
  }, [dirty]);
  return {
    confirming,
    keep: () => {
      setConfirming(false);
      requestAnimationFrame(() => lastFocus.current?.focus());
    },
    contentProps: {
      onFocusCapture: (e: React.FocusEvent) => {
        const t = e.target as HTMLElement;
        if (t.matches("input, textarea, select, [contenteditable]")) lastFocus.current = t;
      },
      onEscapeKeyDown: (e: KeyboardEvent) => {
        if (!dirty) return;
        e.preventDefault();
        setConfirming(true);
      },
      onInteractOutside: (e: Event) => {
        if (dirty) e.preventDefault();
      },
    },
    onCloseClick: (e: React.MouseEvent) => {
      if (!dirty) return;
      e.preventDefault();
      setConfirming(true);
    },
  };
}

export interface DialogContentProps extends Omit<
  ComponentPropsWithoutRef<typeof D.Content>,
  "title"
> {
  title: string;
  description?: ReactNode;
  /** Action row. Safe action first, the confirming action last (it renders last on the right). */
  footer?: ReactNode;
  /** In-overlay feedback, usually an error Banner with `focusOnMount`, shown above the footer. */
  feedback?: ReactNode;
  /** Unsaved text: blocks outside click, and Esc or close shows the discard row (CD-522). */
  dirty?: boolean;
  discard?: DiscardText;
  closeLabel?: string;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  {
    title,
    description,
    footer,
    feedback,
    dirty = false,
    discard = defaultDiscard,
    closeLabel = "Close",
    children,
    className,
    onEscapeKeyDown,
    onInteractOutside,
    ...rest
  },
  ref,
) {
  const d = useDirtyDismiss(dirty);
  return (
    <D.Portal>
      <ThemeWrap>
        <D.Overlay className="cp-scrim fixed inset-0 z-40 bg-scrim" />
        <D.Content
          ref={ref}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cx(
            "cp-dialog fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-container p-6",
            overlaySurface,
            className,
          )}
          onFocusCapture={d.contentProps.onFocusCapture}
          onEscapeKeyDown={(e) => {
            onEscapeKeyDown?.(e);
            d.contentProps.onEscapeKeyDown(e);
          }}
          onInteractOutside={(e) => {
            onInteractOutside?.(e);
            d.contentProps.onInteractOutside(e);
          }}
          {...rest}
        >
          <OverlayMark />
          <DialogPanel
            title={title}
            description={description}
            feedback={feedback}
            footer={d.confirming ? <DiscardRow text={discard} onKeep={d.keep} /> : footer}
            titleAs={D.Title}
            descAs={D.Description}
            onClose={
              <D.Close asChild>
                <IconButton
                  label={closeLabel}
                  icon="x"
                  tooltip={false}
                  className="-mt-1 -mr-2"
                  onClick={d.onCloseClick}
                />
              </D.Close>
            }
          >
            {children}
          </DialogPanel>
        </D.Content>
      </ThemeWrap>
    </D.Portal>
  );
});

/* ---------- ConfirmDialog: the alert dialog (CD-521) ---------- */

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The action restated as a question: "Cancel this visit?" */
  title: string;
  /** The consequence in one or two sentences: who is affected, what cannot be undone. */
  description: ReactNode;
  /** Optional fields (a reason). With a required field, initial focus goes to the field. */
  children?: ReactNode;
  /** Names the outcome and repeats the opener's verb: "Cancel visit", "Publish version 3". */
  confirmLabel: string;
  /** "Keep this visit" when cancelling or removing something, otherwise "Cancel". Never "No". */
  cancelLabel: string;
  onConfirm: () => void;
  /** `danger` only for a destructive or irreversible outcome. */
  tone?: "default" | "danger";
  /** The confirm shows loading words and both buttons are inert until the server answers. */
  pending?: boolean;
  pendingLabel?: string;
  /** An error Banner (with `focusOnMount`) when the action failed; the dialog stays open. */
  feedback?: ReactNode;
  dirty?: boolean;
  discard?: DiscardText;
  /** Focus a field first instead of the safe button (the person must act there). */
  initialFocus?: "safe" | "content";
}

/**
 * Confirmation of a consequential, hard-to-undo decision. `role="alertdialog"`, outcome-named buttons,
 * initial focus on the safe button, outside click does nothing, Esc equals the safe action unless a
 * field has text. Centred at every width: a confirmation is an interruption, not a task sheet.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone = "default",
  pending = false,
  pendingLabel = "Working",
  feedback,
  dirty = false,
  discard = defaultDiscard,
  initialFocus = "safe",
}: ConfirmDialogProps) {
  return (
    <D.Root open={open} onOpenChange={(o) => (pending ? undefined : onOpenChange(o))}>
      {open ? (
        <ConfirmBody
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          onConfirm={onConfirm}
          tone={tone}
          pending={pending}
          pendingLabel={pendingLabel}
          feedback={feedback}
          dirty={dirty}
          discard={discard}
          initialFocus={initialFocus}
        >
          {children}
        </ConfirmBody>
      ) : null}
    </D.Root>
  );
}

function ConfirmBody({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  tone,
  pending,
  pendingLabel,
  feedback,
  dirty,
  discard,
  initialFocus,
}: Omit<ConfirmDialogProps, "open" | "onOpenChange">) {
  const safe = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const d = useDirtyDismiss(!!dirty);
  return (
    <D.Portal>
      <ThemeWrap>
        <D.Overlay className="cp-scrim fixed inset-0 z-40 bg-scrim" />
        <D.Content
          role="alertdialog"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            if (initialFocus === "content") {
              const field = body.current?.querySelector<HTMLElement>(
                "input, textarea, select, [role=radio]",
              );
              if (field) return field.focus();
            }
            safe.current?.focus();
          }}
          onFocusCapture={d.contentProps.onFocusCapture}
          onEscapeKeyDown={(e) => {
            if (pending) return e.preventDefault();
            d.contentProps.onEscapeKeyDown(e);
          }}
          onInteractOutside={(e) => e.preventDefault()}
          className={cx(
            "cp-dialog fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-container p-6",
            overlaySurface,
          )}
        >
          <OverlayMark />
          <div ref={body}>
            <DialogPanel
              title={title}
              description={description}
              feedback={feedback}
              titleAs={D.Title}
              descAs={D.Description}
              onClose={
                <D.Close asChild>
                  <IconButton
                    label="Close"
                    icon="x"
                    tooltip={false}
                    className="-mt-1 -mr-2"
                    disabled={pending}
                    onClick={d.onCloseClick}
                  />
                </D.Close>
              }
              footer={
                d.confirming && discard ? (
                  <DiscardRow text={discard} onKeep={d.keep} />
                ) : (
                  <>
                    <D.Close asChild>
                      <Button
                        ref={safe}
                        variant="secondary"
                        disabled={pending}
                        onClick={d.onCloseClick}
                      >
                        {cancelLabel}
                      </Button>
                    </D.Close>
                    <Button
                      variant={tone === "danger" ? "danger" : "primary"}
                      loading={pending}
                      loadingLabel={pendingLabel}
                      onClick={onConfirm}
                    >
                      {confirmLabel}
                    </Button>
                  </>
                )
              }
            >
              {children}
            </DialogPanel>
          </div>
        </D.Content>
      </ThemeWrap>
    </D.Portal>
  );
}

/** "Leave without saving?" for a route with unsaved work (CD-306, CD-522). */
export function LeaveGuardDialog({
  guard,
  description = "Your last edits were not saved.",
}: {
  guard: LeaveGuardState;
  description?: string;
}) {
  return (
    <ConfirmDialog
      open={guard.open}
      onOpenChange={(o) => (o ? undefined : guard.stay())}
      title="Leave without saving?"
      description={description}
      cancelLabel="Stay on this page"
      confirmLabel="Leave page"
      tone="danger"
      onConfirm={guard.leave}
    />
  );
}

/* ---------- Drawer and bottom sheet ---------- */

export interface DrawerContentProps extends Omit<
  ComponentPropsWithoutRef<typeof D.Content>,
  "title"
> {
  title: string;
  description?: ReactNode;
  /**
   * right: side drawer (modal), full width below 640 px.
   * bottom: patient bottom sheet below 768 px and a centred dialog from 768 px (CD-525).
   * screen: full screen (the R6 pane below 768 px).
   */
  side?: "right" | "bottom" | "screen";
  /** Right drawer width: md 28 rem, lg 36 rem (review queue detail). */
  size?: "md" | "lg";
  footer?: ReactNode;
  feedback?: ReactNode;
  dirty?: boolean;
  discard?: DiscardText;
  /** Names the object: "Close evidence panel". */
  closeLabel?: string;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  {
    title,
    description,
    side = "right",
    size = "md",
    footer,
    feedback,
    dirty = false,
    discard = defaultDiscard,
    closeLabel = "Close",
    children,
    className,
    onEscapeKeyDown,
    onInteractOutside,
    ...rest
  },
  ref,
) {
  const d = useDirtyDismiss(dirty);
  return (
    <D.Portal>
      <ThemeWrap>
        <D.Overlay className="cp-scrim fixed inset-0 z-40 bg-scrim" />
        <D.Content
          ref={ref}
          {...(description ? {} : { "aria-describedby": undefined })}
          onFocusCapture={d.contentProps.onFocusCapture}
          onEscapeKeyDown={(e) => {
            onEscapeKeyDown?.(e);
            d.contentProps.onEscapeKeyDown(e);
          }}
          onInteractOutside={(e) => {
            onInteractOutside?.(e);
            d.contentProps.onInteractOutside(e);
          }}
          className={cx(
            "fixed z-50 flex flex-col",
            overlaySurface,
            side === "right" &&
              cx(
                "cp-drawer-right inset-y-0 right-0 w-full border-y-0 border-r-0",
                size === "lg" ? "sm:max-w-xl" : "sm:max-w-md",
              ),
            side === "screen" && "cp-dialog inset-0 w-full border-0",
            side === "bottom" &&
              "cp-drawer-bottom inset-x-0 bottom-0 max-h-[85dvh] rounded-t-container border-x-0 border-b-0 " +
                "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[calc(100dvh-2rem)] md:w-[calc(100vw-2rem)] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-container md:border",
            className,
          )}
          {...rest}
        >
          <OverlayMark />
          <header className="flex items-start justify-between gap-4 border-b border-border p-4">
            <div className="min-w-0">
              <D.Title className="font-heading text-h3 font-semibold text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-small text-ink-muted">
                  {description}
                </D.Description>
              ) : null}
            </div>
            <D.Close asChild>
              <IconButton label={closeLabel} icon="x" tooltip={false} onClick={d.onCloseClick} />
            </D.Close>
          </header>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
            {feedback ? <div className="mt-4">{feedback}</div> : null}
          </div>
          {footer || d.confirming ? (
            <footer
              className={cx(
                "flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:flex-wrap sm:justify-end",
                side === "bottom" && "pb-[max(1rem,env(safe-area-inset-bottom))]",
              )}
            >
              {d.confirming ? <DiscardRow text={discard} onKeep={d.keep} /> : footer}
            </footer>
          ) : null}
        </D.Content>
      </ThemeWrap>
    </D.Portal>
  );
});

/** Patient bottom sheet: a bottom sheet below 768 px and a centred dialog above (CD-525). */
export const BottomSheetContent = forwardRef<
  HTMLDivElement,
  Omit<DrawerContentProps, "side" | "size">
>(function BottomSheetContent(props, ref) {
  return <DrawerContent ref={ref} side="bottom" {...props} />;
});

/* ---------- SidePanel: the 1280 rule (DR-002 R6, CD-524, CD-526) ---------- */

export interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Inline pane width from 1280 px; never covers the work beside it (at most 28 rem at 1280). */
  className?: string;
  size?: "md" | "lg";
  /** Server render guess; the client corrects it on mount. */
  serverMode?: PaneMode;
  /** Force one mode (the gallery shows all three side by side). */
  mode?: PaneMode;
  closeLabel?: string;
}

/**
 * Supplementary detail beside a list or reference beside an editor. From 1280 px it renders in place as
 * a labelled `complementary` region (no scrim, no focus trap, the page stays usable); from 768 px it is
 * a modal right drawer; below 768 px a full screen. Callers place it where the inline pane belongs.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
  serverMode = "inline",
  mode: forced,
  closeLabel = "Close panel",
}: SidePanelProps) {
  const auto = usePaneMode(serverMode);
  const mode = forced ?? auto;
  const headingId = useId();
  if (!open) return null;
  if (mode === "inline") {
    return (
      <aside
        aria-labelledby={headingId}
        className={cx(
          "flex max-w-md min-w-0 flex-col rounded-container border border-border bg-surface",
          className,
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange(false);
        }}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id={headingId} className="font-heading text-h3 font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-small text-ink-muted">{description}</p> : null}
          </div>
          <IconButton label={closeLabel} icon="x" onClick={() => onOpenChange(false)} />
        </header>
        <div className="flex-1 p-4">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    );
  }
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        title={title}
        description={description}
        side={mode === "drawer" ? "right" : "screen"}
        size={size}
        footer={footer}
        closeLabel={closeLabel}
      >
        {children}
      </DrawerContent>
    </D.Root>
  );
}

/* ---------- Popover: short optional explanation from a visible text control (CD-527) ---------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export const PopoverContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof P.Content>
>(function PopoverContent({ className, sideOffset = 6, children, ...rest }, ref) {
  return (
    <P.Portal>
      <ThemeWrap>
        <P.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx(
            "cp-popover z-50 w-72 max-w-[calc(100vw-2rem)] origin-[var(--radix-popover-content-transform-origin)]",
            overlayClasses.popover,
            className,
          )}
          {...rest}
        >
          {children}
        </P.Content>
      </ThemeWrap>
    </P.Portal>
  );
});

/* ---------- Tooltip: a supplement only, never the sole carrier of information ---------- */

export const TooltipProvider = TT.Provider;
export const Tooltip = TT.Root;
export const TooltipTrigger = TT.Trigger;

export const TooltipContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TT.Content>
>(function TooltipContent({ className, sideOffset = 6, children, ...rest }, ref) {
  return (
    <TT.Portal>
      <ThemeWrap>
        <TT.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx(
            "z-50 max-w-64 rounded-control bg-ink px-2.5 py-1.5 text-small text-ink-inverse shadow-overlay",
            className,
          )}
          {...rest}
        >
          {children}
        </TT.Content>
      </ThemeWrap>
    </TT.Portal>
  );
});

/* ---------- Dropdown menu: three or more infrequent secondary actions on a dense staff row ---------- */

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, ...rest }, ref) {
  return (
    <M.Portal>
      <ThemeWrap>
        <M.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx(
            "cp-menu z-50 min-w-48 origin-[var(--radix-dropdown-menu-content-transform-origin)] rounded-control p-1",
            overlaySurface,
            className,
          )}
          {...rest}
        />
      </ThemeWrap>
    </M.Portal>
  );
});

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.Item> & { danger?: boolean }
>(function DropdownMenuItem({ className, danger, ...rest }, ref) {
  return (
    <M.Item
      ref={ref}
      className={cx(overlayClasses.menuItem, danger && "text-error-ink", className)}
      {...rest}
    />
  );
});

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...rest }, ref) {
  return (
    <M.CheckboxItem ref={ref} className={cx(overlayClasses.menuItem, className)} {...rest}>
      <M.ItemIndicator className="absolute left-2.5 inline-flex">
        <Icon name="check" size={16} />
      </M.ItemIndicator>
      {children}
    </M.CheckboxItem>
  );
});

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.Label>
>(function DropdownMenuLabel({ className, ...rest }, ref) {
  return (
    <M.Label
      ref={ref}
      className={cx("px-2 py-1.5 text-caption font-semibold text-ink-muted", className)}
      {...rest}
    />
  );
});

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.Separator>
>(function DropdownMenuSeparator({ className, ...rest }, ref) {
  return <M.Separator ref={ref} className={cx("my-1 h-px bg-border", className)} {...rest} />;
});
