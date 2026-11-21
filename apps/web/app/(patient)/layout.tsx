import type { ReactNode } from "react";
import { DemoNotice, SkipLink, ThemeScope } from "@carepath/ui";

/**
 * Patient route group. The theme applies to everything here, including onboarding, which a signed-out
 * visitor can open. The skip link (the first Tab stop, CD-507) and the demo notice are rendered once here,
 * so the app, the guided session and onboarding all carry exactly one of each. The role guard lives in the
 * (app) and (session) layouts, not here.
 */
export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeScope theme="patient" className="flex flex-1 flex-col">
      <SkipLink />
      <DemoNotice />
      {children}
    </ThemeScope>
  );
}
