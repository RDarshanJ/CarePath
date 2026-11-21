import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";
import { ClinicianShell } from "./_components/staff-shell";
import { requireShell } from "../../lib/auth/guard";
import { ClinicianProviders } from "./_lib/context";

export default async function ClinicianLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("clinician");
  return (
    // data-sticky-layout sets the scroll padding from the sticky-offset tokens (CD-125).
    <ThemeScope
      theme="clinician"
      className="flex flex-1 flex-col"
      data-sticky-layout="staff staff-bar"
    >
      <ClinicianShell session={session}>
        <ClinicianProviders session={session}>{children}</ClinicianProviders>
      </ClinicianShell>
    </ThemeScope>
  );
}
