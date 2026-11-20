import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";

/**
 * Patient route group. The theme applies to everything here, including onboarding, which a
 * signed-out visitor can open. The role guard lives in the (app) and (session) layouts, not here.
 */
export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeScope theme="patient" className="flex flex-1 flex-col">
      {children}
    </ThemeScope>
  );
}
