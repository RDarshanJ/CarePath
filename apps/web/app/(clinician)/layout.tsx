import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";
import { ClinicianShell } from "../../components/shells";
import { requireShell } from "../../lib/auth/guard";
import { ClinicianProviders } from "./_lib/context";

export default async function ClinicianLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("clinician");
  return (
    <ThemeScope theme="clinician" className="flex flex-1 flex-col">
      <style>{"html{scroll-padding-top:7rem}"}</style>
      <ClinicianShell session={session}>
        <ClinicianProviders session={session}>{children}</ClinicianProviders>
      </ClinicianShell>
    </ThemeScope>
  );
}
