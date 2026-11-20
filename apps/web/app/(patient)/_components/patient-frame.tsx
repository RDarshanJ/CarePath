"use client";

import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ClinicCard } from "@carepath/shared/contracts";
import {
  BottomTabBar,
  Button,
  Dialog,
  DialogContent,
  DialogTrigger,
  Icon,
  Link,
  type NavItem,
} from "@carepath/ui";
import { SignOutButton } from "../../../components/sign-out-button";

/** Patient destinations that work in this phase. Appointments and Messages arrive in Phase 4. */
const tabs: Omit<NavItem, "current">[] = [
  { href: "/today", label: "Today", icon: "home" },
  { href: "/progress", label: "Progress", icon: "activity" },
];

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
 * "Contact care team" sits in the same header position on every patient screen (WCAG 3.2.6). Until
 * messaging arrives it opens the clinic's real contact card: phone, reply time and the emergency line.
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
  children: ReactNode;
}

export function PatientFrame({ organizationName, clinic, variant, children }: PatientFrameProps) {
  const pathname = usePathname();
  const items = tabs.map((t) => ({
    ...t,
    current: pathname === t.href || pathname.startsWith(`${t.href}/`),
  }));
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-gutter">
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
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-gutter"
      >
        {children}
      </main>
      {variant === "app" ? (
        <>
          <footer className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-gutter text-small text-ink-muted">
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
          <div className="sticky bottom-0 border-t border-border bg-surface">
            <BottomTabBar
              label="Patient"
              linkAs={NextLink}
              items={items}
              className="mx-auto w-full max-w-2xl border-t-0"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
