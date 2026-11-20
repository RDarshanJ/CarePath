import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";

// Route group layout. Navigation arrives in later work packages.
export default function PatientLayout({ children }: { children: ReactNode }) {
  return <ThemeScope theme="patient">{children}</ThemeScope>;
}
