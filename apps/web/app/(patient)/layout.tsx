import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";
import { PatientShell } from "../../components/shells";
import { requireShell } from "../../lib/auth/guard";

export default async function PatientLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("patient");
  return (
    <ThemeScope theme="patient" className="flex flex-1 flex-col">
      <PatientShell session={session}>{children}</PatientShell>
    </ThemeScope>
  );
}
