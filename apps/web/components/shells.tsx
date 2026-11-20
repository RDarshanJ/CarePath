"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { SessionInfo } from "@carepath/shared/contracts";
import { Avatar, Muted, SideNav, type NavItem } from "@carepath/ui";
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

/** Clinician destinations that work in this phase (checkpoint C1, section 5.6). */
const clinicianNav: Omit<NavItem, "current">[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/patients", label: "Patients", icon: "users" },
  { href: "/review-queue", label: "Review queue", icon: "clipboard" },
];

const adminNav: Omit<NavItem, "current">[] = [
  { href: "/admin/patients", label: "Patients", icon: "users" },
];

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
      {/*
        The aside stretches the full height of the page and carries the border. Inside it, the rail sticks to
        the top of the window and never grows past it, so navigation and sign-out stay in reach on a long page.
      */}
      <aside className="flex flex-col border-b border-border bg-surface md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex min-h-0 flex-1 flex-col md:sticky md:top-0 md:h-full md:max-h-dvh md:overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <p className="font-heading text-h4 font-semibold text-ink">CarePath</p>
            <p className="text-small text-ink-muted">{session.organization.name}</p>
          </div>
          <SideNav
            label={navLabel}
            linkAs={NextLink}
            items={withCurrent(items, pathname)}
            className="flex-1 border-r-0"
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
        </div>
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
