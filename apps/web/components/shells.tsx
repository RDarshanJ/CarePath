"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { SessionInfo } from "@carepath/shared/contracts";
import { Avatar, BottomTabBar, Muted, SideNav, type NavItem } from "@carepath/ui";
import { roleLabel } from "../lib/auth/roles";
import { SignOutButton } from "./sign-out-button";

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

function withCurrent(items: Omit<NavItem, "current">[], pathname: string): NavItem[] {
  return items.map((it) => ({
    ...it,
    current: pathname === it.href || pathname.startsWith(`${it.href}/`),
  }));
}

/** Patient destinations that work in this phase. Appointments and Messages arrive in Phase 4. */
const patientNav: Omit<NavItem, "current">[] = [
  { href: "/today", label: "Today", icon: "home" },
  { href: "/progress", label: "Progress", icon: "activity" },
];

/** Clinician destinations that work in this phase (checkpoint C1, section 5.6). */
const clinicianNav: Omit<NavItem, "current">[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/patients", label: "Patients", icon: "users" },
  { href: "/review-queue", label: "Review queue", icon: "clipboard" },
];

const adminNav: Omit<NavItem, "current">[] = [
  { href: "/admin", label: "Administration", icon: "settings" },
];

/**
 * Patient shell: a slim header with the organization and sign-out, the page, and the bottom tab bar
 * pinned below. The tab bar lists only destinations that work now. Theme comes from the route-group layout.
 */
export function PatientShell({ session, children }: { session: SessionInfo; children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <SkipLink />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-gutter py-3">
          <div className="min-w-0">
            <p className="font-heading text-h4 font-semibold text-ink">CarePath</p>
            <p className="text-small text-ink-muted">{session.organization.name}</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl flex-1 px-gutter py-6">
        {children}
      </main>
      <div className="sticky bottom-0 border-t border-border bg-surface">
        <BottomTabBar
          label="Patient"
          linkAs={NextLink}
          items={withCurrent(patientNav, pathname)}
          className="mx-auto w-full max-w-2xl border-t-0"
        />
      </div>
    </div>
  );
}

/** Clinician and administrative shell: left rail (a top block on narrow screens), identity and sign-out in its footer. */
function StaffShell({
  session,
  items,
  navLabel,
  children,
}: {
  session: SessionInfo;
  items: Omit<NavItem, "current">[];
  navLabel: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg md:flex-row">
      <SkipLink />
      <aside className="flex flex-col border-b border-border bg-surface md:w-60 md:shrink-0 md:border-b-0">
        <div className="px-4 pt-4 pb-2">
          <p className="font-heading text-h4 font-semibold text-ink">CarePath</p>
          <p className="text-small text-ink-muted">{session.organization.name}</p>
        </div>
        <SideNav
          label={navLabel}
          linkAs={NextLink}
          items={withCurrent(items, pathname)}
          className="flex-1 border-r-0 md:border-r"
          footer={
            <div className="flex flex-col gap-3 p-2">
              <div className="flex items-center gap-2.5">
                <Avatar name={session.user.displayName} />
                <div className="min-w-0">
                  <p className="truncate text-label font-medium text-ink">
                    {session.user.displayName}
                  </p>
                  <Muted className="text-small">{roleLabel[session.role]}</Muted>
                </div>
              </div>
              <SignOutButton />
            </div>
          }
        />
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-gutter py-6">
        {children}
      </main>
    </div>
  );
}

export function ClinicianShell(props: { session: SessionInfo; children: ReactNode }) {
  return <StaffShell {...props} items={clinicianNav} navLabel="Clinician" />;
}

export function AdminShell(props: { session: SessionInfo; children: ReactNode }) {
  return <StaffShell {...props} items={adminNav} navLabel="Administration" />;
}
