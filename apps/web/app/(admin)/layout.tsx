import type { ReactNode } from "react";
import { Avatar, DemoNotice, SkipLink, ThemeScope } from "@carepath/ui";
import { SignOutButton } from "../../components/sign-out-button";
import { requireShell } from "../../lib/auth/guard";
import { roleLabel } from "../../lib/auth/roles";
import { QueryProvider } from "../../lib/query/providers";
import { StaffSearchProvider } from "../(clinician)/_components/staff-search";

/**
 * Coordinators and clinic administrators, in the clinician theme. One destination today (Patients), so
 * there is no navigation element at all (CD-502): a banner with the brand, organisation, the signed-in
 * identity and Sign out, then `main`. When a second destination ships (DR-002 N), this gains `SideNav`
 * and `BottomTabBar` with the admin items, as the clinician shell does. The staff search store (DR-002 I)
 * holds the patient-list search term in memory; a reload or sign-out drops it. Header and main stop at
 * 1440 px and stay left-aligned, as in the clinician shell (DR-004 U2).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("admin");
  return (
    <ThemeScope theme="clinician" className="flex flex-1 flex-col bg-bg">
      <SkipLink />
      <DemoNotice />
      <header className="border-b border-border bg-surface">
        <div className="flex w-full max-w-staff flex-wrap items-center justify-between gap-x-6 gap-y-2 px-gutter py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-h4 font-semibold text-ink">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              CarePath
              <span className="font-normal text-ink-muted">Administration</span>
            </p>
            <p className="text-small text-ink-muted">{session.organization.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={session.user.displayName} />
              <div className="min-w-0">
                <p className="text-label font-medium break-words text-ink">
                  {session.user.displayName}
                </p>
                <p className="text-small text-ink-muted">{roleLabel[session.role]}</p>
              </div>
            </div>
            <SignOutButton variant="neutral" />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="w-full max-w-staff min-w-0 flex-1 px-gutter py-6">
        <QueryProvider>
          <StaffSearchProvider>{children}</StaffSearchProvider>
        </QueryProvider>
      </main>
    </ThemeScope>
  );
}
