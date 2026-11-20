import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";
import { AdminShell } from "../../components/shells";
import { requireShell } from "../../lib/auth/guard";
import { QueryProvider } from "../../lib/query/providers";

// Coordinators and clinic administrators. The admin app uses the clinician theme.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireShell("admin");
  return (
    <ThemeScope theme="clinician" className="flex flex-1 flex-col">
      <AdminShell session={session}>
        <QueryProvider>{children}</QueryProvider>
      </AdminShell>
    </ThemeScope>
  );
}
