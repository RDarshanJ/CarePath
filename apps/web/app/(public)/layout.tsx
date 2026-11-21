import type { ReactNode } from "react";
import { DemoNotice, ThemeScope } from "@carepath/ui";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeScope theme="patient" className="flex flex-1 flex-col bg-bg">
      <DemoNotice />
      {children}
    </ThemeScope>
  );
}
