import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";
import { ClinicianShell } from "../../components/shells";
import { requireShell } from "../../lib/auth/guard";

export default async function ClinicianLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("clinician");
  return (
    <ThemeScope theme="clinician" className="flex flex-1 flex-col">
      <ClinicianShell session={session}>{children}</ClinicianShell>
    </ThemeScope>
  );
}
