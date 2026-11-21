"use client";

import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ClinicCard } from "@carepath/shared/contracts";
import {
  BottomTabBar,
  Button,
  CountBadge,
  Dialog,
  DialogContent,
  DialogTrigger,
  Icon,
  Link,
  cx,
  type IconName,
  type NavItem,
} from "@carepath/ui";
import { BackLink, useTrackPreviousPath } from "../../../components/back-link";
import { SignOutButton } from "../../../components/sign-out-button";
import { useUnreadTotal } from "../_lib/use-conversations";

/** The four patient destinations (CD-500, checkpoint C2 section 5). Plan is reached from Today. */
const destinations: { href: string; label: string; icon: IconName }[] = [
  { href: "/today", label: "Today", icon: "home" },
  { href: "/progress", label: "Progress", icon: "activity" },
  { href: "/appointments", label: "Appointments", icon: "calendar" },
  { href: "/messages", label: "Messages", icon: "message" },
];

/** One list for both navs; nested routes keep their destination current (`/messages/[id]` is Messages). */
function useNavItems(unread: number): NavItem[] {
  const pathname = usePathname();
  return destinations.map((d) => ({
    ...d,
    current: pathname === d.href || pathname.startsWith(`${d.href}/`),
    ...(d.href === "/messages" ? { count: unread, countUnit: "unread" } : {}),
  }));
}

/**
 * Header tab row from md (CD-500). The bottom bar below md is the ui `BottomTabBar` with the same items.
 * Only one of the two is displayed at any width, so assistive technology meets one "Patient" landmark.
 */
function HeaderTabs({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Patient" className="hidden md:block">
      <ul className="-mb-px flex gap-1">
        {items.map((it) => (
          <li key={it.href}>
            <NextLink
              href={it.href}
              aria-current={it.current ? "page" : undefined}
              className={cx(
                "relative flex min-h-target items-center gap-2 rounded-t-control px-3 text-label motion-fast transition-colors focus-visible:focus-ring",
                it.current
                  ? "font-semibold text-selected-ink"
                  : "font-medium text-ink-muted hover:bg-primary-subtle hover:text-ink",
              )}
            >
              <Icon name={it.icon} size={20} />
              <span>{it.label}</span>
              {it.count ? (
                <>
                  <span aria-hidden="true">
                    <CountBadge count={it.count} unit={it.countUnit ?? "unread"} />
                  </span>
                  <span className="sr-only">
                    , {it.count} {it.countUnit}
                  </span>
                </>
              ) : null}
              {it.current ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-selected-edge"
                />
              ) : null}
            </NextLink>
          </li>
        ))}
      </ul>
    </nav>
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
            <Link variant="standalone" href="/messages" onClick={() => setOpen(false)}>
              Send your care team a message
            </Link>
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
  /** The signed-in patient's display name (CD-205). Shown in the app header, not in the session. */
  displayName: string;
  clinic: ClinicCard;
  /** `app`: navigation and footer. `focus`: the guided session, which hides navigation to keep one task on screen. */
  variant: "app" | "focus";
  /** Unread messages at page load; the nav badge then follows the conversation poll. */
  unreadMessages?: number;
  children: ReactNode;
}

/**
 * Patient shell (CD-500, CD-205, CD-505, CD-507). Landmarks: one `banner` (brand, identity, Contact care
 * team, Sign out, and the tab row from md), `main#main`, a `contentinfo` footer and one "Patient"
 * navigation. The skip link and the demo notice come from the patient route-group layout, so onboarding
 * has them too. "Contact care team" keeps the same place in the header on every screen (WCAG 3.2.6).
 */
export function PatientFrame({
  organizationName,
  displayName,
  clinic,
  variant,
  unreadMessages = 0,
  children,
}: PatientFrameProps) {
  useTrackPreviousPath();
  const unread = useUnreadTotal(unreadMessages, variant === "app");
  const items = useNavItems(unread);
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 px-gutter pt-2 pb-1">
          {variant === "focus" ? (
            <BackLink href="/today">Back to Today</BackLink>
          ) : (
            <p className="flex min-h-target items-center gap-2 text-h4 font-semibold text-ink">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
              CarePath
            </p>
          )}
          {/* Same place on every screen: the top right (WCAG 3.2.6). */}
          <div className="ml-auto md:order-last md:ml-0">
            <ContactCareTeam clinic={clinic} />
          </div>
          {variant === "app" ? (
            // Below md this is the header's second row; from md it sits before Contact care team.
            <div className="flex w-full flex-wrap items-center justify-between gap-x-3 md:ml-auto md:w-auto md:justify-end">
              <p className="min-w-0 text-small text-ink-muted">
                Signed in as <span className="font-medium text-ink">{displayName}</span>
              </p>
              <SignOutButton variant="quiet" />
            </div>
          ) : null}
        </div>
        {variant === "app" ? (
          <div className="mx-auto w-full max-w-3xl px-gutter">
            <HeaderTabs items={items} />
          </div>
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-gutter py-6">
        {children}
      </main>
      {variant === "app" ? (
        <>
          <footer className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-2 px-gutter pb-6 text-small text-ink-muted">
            <p>{organizationName}.</p>
            <Link href="/consent" variant="standalone">
              Sharing and consent
            </Link>
          </footer>
          {/* Sticky in the page flow, not fixed, so it never rides above the on-screen keyboard (CD-500). */}
          <div data-sticky-bar className="sticky bottom-0 z-10 md:hidden">
            <BottomTabBar label="Patient" items={items} linkAs={NextLink} />
          </div>
        </>
      ) : null}
    </div>
  );
}
