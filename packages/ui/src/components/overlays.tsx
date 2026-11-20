"use client";

import { forwardRef, type ElementType, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import * as P from "@radix-ui/react-popover";
import * as TT from "@radix-ui/react-tooltip";
import * as M from "@radix-ui/react-dropdown-menu";
import { cx } from "../lib/cx";
import { IconButton } from "./button";
import { Icon } from "./icons";
import { overlayClasses } from "./overlay-classes";
import { ThemeWrap } from "./theme";

/** Shadows exist only on overlays: dialogs, drawers, popovers, menus and tooltips. */
const overlaySurface = overlayClasses.surface;

/* ---------- Dialog ---------- */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export interface DialogContentProps extends Omit<
  ComponentPropsWithoutRef<typeof D.Content>,
  "title"
> {
  title: string;
  description?: string;
  /** Action row, right-aligned. Put the primary action last. */
  footer?: ReactNode;
}

/** Shared presentational body so the gallery can show an open dialog in place. */
export function DialogPanel({
  title,
  description,
  footer,
  children,
  onClose,
  titleAs: Title = "h2",
  descAs: Desc = "p",
}: {
  title: string;
  description?: string;
  footer?: ReactNode;
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
      {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
    </>
  );
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { title, description, footer, children, className, ...rest },
  ref,
) {
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
          {...rest}
        >
          <DialogPanel
            title={title}
            description={description}
            footer={footer}
            titleAs={D.Title}
            descAs={D.Description}
            onClose={
              <D.Close asChild>
                <IconButton label="Close" icon="x" size="sm" className="-mt-1 -mr-2" />
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

/* ---------- Drawer (side panel; evidence inspector, filters) ---------- */

export interface DrawerContentProps extends Omit<
  ComponentPropsWithoutRef<typeof D.Content>,
  "title"
> {
  title: string;
  description?: string;
  /** right: clinician side panel. bottom: patient sheet. */
  side?: "right" | "bottom";
  footer?: ReactNode;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  { title, description, side = "right", footer, children, className, ...rest },
  ref,
) {
  return (
    <D.Portal>
      <ThemeWrap>
        <D.Overlay className="cp-scrim fixed inset-0 z-40 bg-scrim" />
        <D.Content
          ref={ref}
          className={cx(
            "fixed z-50 flex flex-col",
            overlaySurface,
            side === "right"
              ? "cp-drawer-right inset-y-0 right-0 w-full max-w-md border-y-0 border-r-0"
              : "cp-drawer-bottom inset-x-0 bottom-0 max-h-[85dvh] rounded-t-container border-x-0 border-b-0",
            className,
          )}
          {...rest}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-4">
            <div>
              <D.Title className="font-heading text-h3 font-semibold text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-small text-ink-muted">
                  {description}
                </D.Description>
              ) : null}
            </div>
            <D.Close asChild>
              <IconButton label="Close panel" icon="x" size="sm" />
            </D.Close>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {footer ? (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
              {footer}
            </footer>
          ) : null}
        </D.Content>
      </ThemeWrap>
    </D.Portal>
  );
});

/* ---------- Popover ---------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

const popoverClass = overlayClasses.popover;

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
          className={cx("cp-popover z-50 w-72 max-w-[calc(100vw-2rem)]", popoverClass, className)}
          {...rest}
        >
          {children}
        </P.Content>
      </ThemeWrap>
    </P.Portal>
  );
});

/* ---------- Tooltip: supplementary only; never the sole carrier of information ---------- */

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

/* ---------- Dropdown menu ---------- */

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;

const menuItem = overlayClasses.menuItem;

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
          className={cx("cp-menu z-50 min-w-48 rounded-control p-1", overlaySurface, className)}
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
    <M.Item ref={ref} className={cx(menuItem, danger && "text-error-ink", className)} {...rest} />
  );
});

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof M.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...rest }, ref) {
  return (
    <M.CheckboxItem ref={ref} className={cx(menuItem, className)} {...rest}>
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
