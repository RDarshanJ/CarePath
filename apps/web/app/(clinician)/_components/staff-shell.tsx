"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { SessionInfo } from "@carepath/shared/contracts";
import { Avatar, BottomTabBar, DemoNotice, SideNav, SkipLink, type NavItem } from "@carepath/ui";
import { useTrackPreviousPath } from "../../../components/back-link";
import { SignOutButton } from "../../../components/sign-out-button";
import { roleLabel } from "../../../lib/auth/roles";
import { keys, qs, reads } from "../_lib/queries";
import { useUnreadTotal } from "../_lib/unread";
import { StaffSearchProvider, useClearStaffSearch } from "./staff-search";

/**
 * Clinician destinations in DR-002 H order (amends CD-501): the day first (Overview, Schedule), then
 * people, then the two inboxes side by side so their badges sit together. One array to change.
 */
const clinicianNav: Omit<NavItem, "current" | "count" | "countUnit">[] = [
  { href: "/overview", label: "Overview", icon: "home" },
  { href: "/schedule", label: "Schedule", icon: "calendar" },
  { href: "/patients", label: "Patients", icon: "users" },
  { href: "/review-queue", label: "Review queue", icon: "clipboard" },
  { href: "/inbox", label: "Messages", icon: "message" },
];

/** The review queue's default view (open and in review) asked for one row: `total` is the API's count. */
export const REVIEW_BADGE_QUERY = qs({ status: "active", limit: 1 });

/**
 * Open review tasks for the Review queue badge (CD-501, CD-508). The number is the API's `total` for the
 * same filter the queue opens with, never the length of a loaded page. The key sits under
 * `["clinician", ...]`, so every queue action that refreshes the clinician cache refreshes the badge.
 * Undefined (no badge) until known, on error, or without permission to read the queue.
 */
function useOpenReviewTotal(enabled: boolean): number | undefined {
  const q = useQuery({
    queryKey: keys.tasks(REVIEW_BADGE_QUERY),
    queryFn: () => reads.tasks(REVIEW_BADGE_QUERY),
    refetchInterval: 60_000,
    retry: false,
    enabled,
  });
  return q.data?.total;
}

const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

function Brand({ organization }: { organization: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-h4 font-semibold text-ink">
        <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
        CarePath
      </p>
      <p className="text-small text-ink-muted">{organization}</p>
    </div>
  );
}

function ShellBody({ session, children }: { session: SessionInfo; children: ReactNode }) {
  useTrackPreviousPath();
  const pathname = usePathname();
  const clearSearch = useClearStaffSearch();
  const unread = useUnreadTotal();
  const openTasks = useOpenReviewTotal(session.permissions.includes("review_task.read"));
  const items: NavItem[] = clinicianNav.map((it) => ({
    ...it,
    current: isCurrent(pathname, it.href),
    ...(it.href === "/inbox" && unread !== undefined ? { count: unread, countUnit: "unread" } : {}),
    ...(it.href === "/review-queue" && openTasks !== undefined
      ? { count: openTasks, countUnit: "open" }
      : {}),
  }));
  const role = roleLabel[session.role];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <SkipLink />
      <DemoNotice />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/*
          One banner. From 768 px it is the 240 px sidebar: brand, the Clinician navigation and the signed-in
          identity, sticky to the window so navigation and sign-out stay in reach on a long page. Below 768 px
          it is a short top bar (brand, organisation, identity, Sign out) and the navigation moves to the
          labelled bottom bar (CD-501).
        */}
        <header className="border-b border-border bg-surface md:w-60 md:shrink-0 md:border-r md:border-b-0">
          <div className="flex flex-col md:sticky md:top-0 md:max-h-dvh md:min-h-dvh md:overflow-y-auto">
            <div className="px-gutter pt-2.5 pb-1 md:px-4 md:pt-4 md:pb-3">
              <Brand organization={session.organization.name} />
            </div>
            <SideNav
              label="Clinician"
              linkAs={NextLink}
              items={items}
              className="hidden flex-1 border-r-0 bg-transparent px-2 md:flex"
            />
            {/*
              One identity block (CD-206): a compact row under the brand below 768 px, the sidebar footer with
              the avatar from 768 px. The name wraps rather than truncating.
            */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-gutter pb-2.5 md:flex-col md:items-stretch md:gap-3 md:border-t md:border-border md:p-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="hidden md:block">
                  <Avatar name={session.user.displayName} />
                </span>
                <p className="min-w-0 text-small text-ink-muted">
                  <span className="block text-label font-medium break-words text-ink">
                    {session.user.displayName}
                  </span>
                  {role}
                </p>
              </div>
              <SignOutButton variant="neutral" onSignedOut={clearSearch} />
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-gutter py-6">
          {children}
        </main>
      </div>
      {/* Sticky in the page flow (not fixed), so it never sits over the on-screen keyboard. */}
      <div data-sticky-bar className="sticky bottom-0 z-10 overflow-x-clip md:hidden">
        <BottomTabBar label="Clinician" items={items} linkAs={NextLink} />
      </div>
    </div>
  );
}

/** Clinician shell (CD-501, CD-506, CD-507, CD-508) with the staff search store of DR-002 I. */
export function ClinicianShell({
  session,
  children,
}: {
  session: SessionInfo;
  children: ReactNode;
}) {
  return (
    <StaffSearchProvider>
      <ShellBody session={session}>{children}</ShellBody>
    </StaffSearchProvider>
  );
}
