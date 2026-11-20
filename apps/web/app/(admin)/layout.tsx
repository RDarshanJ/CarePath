import type { ReactNode } from "react";
import { ThemeScope } from "@carepath/ui";

// Route group layout. Navigation arrives in later work packages.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ThemeScope theme="clinician">{children}</ThemeScope>;
}
