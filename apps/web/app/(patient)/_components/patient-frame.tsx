"use client";

import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ClinicCard } from "@carepath/shared/contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Icon,
  Link,
  cx,
  type IconName,
} from "@carepath/ui";
import { SignOutButton } from "../../../components/sign-out-button";
import { useUnreadTotal } from "../_lib/use-conversations";

/** The four patient destinations (checkpoint C2, section 5): tabs on a phone, the header from md up. */
const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/today", label: "Today", icon: "home" },
  { href: "/progress", label: "Progress", icon: "activity" },
  { href: "/appointments", label: "Appointments", icon: "calendar" },
  { href: "/messages", label: "Messages", icon: "message" },
];

function UnreadCount({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-control border border-primary bg-primary px-1.5 text-caption font-semibold tabular-nums text-ink-inverse">
      {count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

/**
 * One nav element for each width, never both at once: the other is `display: none`, so assistive
 * technology and axe see a single "Patient" landmark. Phone: bottom tabs. md and up: a row in the
 * header (checkpoint C2, section 1.5 item 6).
 */
function useNavItems(unread: number) {
  const pathname = usePathname();
  return tabs.map((t) => ({
    ...t,
    current: pathname === t.href || pathname.startsWith(`${t.href}/`),
    count: t.href === "/messages" ? unread : 0,
  }));
}

function BottomNav({ unread }: { unread: number }) {
  const items = useNavItems(unread);
  return (
    <nav
      aria-label="Patient"
      className="sticky bottom-0 z-10 border-t border-border bg-surface md:hidden"
    >
      <ul className="mx-auto grid w-full max-w-3xl grid-cols-4">
        {items.map((it) => (
          <li key={it.href}>
            <NextLink
              href={it.href}
              aria-current={it.current ? "page" : undefined}
              className={cx(
                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 py-2 text-small motion-fast transition-colors focus-visible:focus-ring",
                it.current
                  ? "font-semibold text-primary"
                  : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {it.current ? (
                <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
              ) : null}
              <span className="relative">
                <Icon name={it.icon} size={22} />
                {it.count > 0 ? (
                  <span className="absolute -right-3 -top-2">
                    <UnreadCount count={it.count} />
                  </span>
                ) : null}
              </span>
              <span>{it.label}</span>
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HeaderNav({ unread }: { unread: number }) {
  const items = useNavItems(unread);
  return (
    <nav aria-label="Patient" className="hidden border-t border-border md:block">
      <ul className="mx-auto flex w-full max-w-3xl gap-1 px-gutter">
        {items.map((it) => (
          <li key={it.href}>
            <NextLink
              href={it.href}
              aria-current={it.current ? "page" : undefined}
              className={cx(
                "relative flex min-h-target items-center gap-2 rounded-control px-3 text-label motion-fast transition-colors focus-visible:focus-ring",
                it.current
                  ? "font-semibold text-primary"
                  : "font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <Icon name={it.icon} size={20} />
              <span>{it.label}</span>
              <UnreadCount count={it.count} />
              {it.current ? (
                <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-primary" />
              ) : null}
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-control bg-surface px-3 py-2 text-label font-medium text-primary focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus-visible:focus-ring"
    >
      Skip to main content
    </a>
  );
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * "Contact care team" sits in the same header position on every patient screen (WCAG 3.2.6). It opens
 * the clinic's real contact card: phone, reply time, the emergency line and a link to Messages.
 */
export function ContactCareTeam({ clinic }: { clinic: ClinicCard }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Contact care team
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Contact your care team"
        description={`${clinic.name}`}
        footer={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {clinic.phone ? (
            <p className="text-body">
              Call the clinic on{" "}
              <Link href={telHref(clinic.phone)} className="font-medium">
                {clinic.phone}
              </Link>
              .
            </p>
          ) : (
            <p className="text-body">
              The clinic has not set a phone number. Ask your care team how to reach them at your
              next visit.
            </p>
          )}
          {clinic.replyTimeText ? (
            <p className="text-body text-ink-muted">{clinic.replyTimeText}</p>
          ) : null}
          <p>
            <NextLink
              href="/messages"
              onClick={() => setOpen(false)}
              className="rounded-control text-label font-medium text-primary underline underline-offset-2 focus-visible:focus-ring"
            >
              Send your care team a message
            </NextLink>
          </p>
          <p className="flex items-start gap-2 rounded-control bg-warning-bg p-3 text-label font-medium text-warning-ink">
            <Icon name="alert-triangle" size={18} className="mt-0.5 shrink-0" />
            <span>{clinic.emergencyNotice}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface PatientFrameProps {
  organizationName: string;
  clinic: ClinicCard;
  /** `app`: tab bar and footer. `focus`: the guided session, which hides navigation to keep one task on screen. */
  variant: "app" | "focus";
  /** Unread messages at page load; the nav badge then follows the conversation poll. */
  unreadMessages?: number;
  children: ReactNode;
}

export function PatientFrame({
  organizationName,
  clinic,
  variant,
  unreadMessages = 0,
  children,
}: PatientFrameProps) {
  const unread = useUnreadTotal(unreadMessages, variant === "app");
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-gutter">
          {variant === "focus" ? (
            <NextLink
              href="/today"
              className="inline-flex min-h-target items-center gap-1.5 rounded-control text-label font-medium text-primary focus-visible:focus-ring"
            >
              <Icon name="chevron-right" size={18} className="rotate-180" />
              Today
            </NextLink>
          ) : (
            <p className="font-heading text-h4 font-semibold text-ink">CarePath</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ContactCareTeam clinic={clinic} />
            {variant === "app" ? <SignOutButton /> : null}
          </div>
        </div>
        {variant === "app" ? <HeaderNav unread={unread} /> : null}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-gutter"
      >
        {children}
      </main>
      {variant === "app" ? (
        <>
          <footer className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-gutter text-small text-ink-muted">
            <p>
              {organizationName}.{" "}
              <NextLink
                href="/consent"
                className="rounded-control text-primary underline underline-offset-2 focus-visible:focus-ring"
              >
                Sharing and consent
              </NextLink>
            </p>
          </footer>
          <BottomNav unread={unread} />
        </>
      ) : null}
    </div>
  );
}
