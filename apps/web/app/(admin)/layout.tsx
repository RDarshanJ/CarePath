import type { ReactNode } from "react";

// Route group layout. Navigation and theme tokens arrive in later work packages.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div data-theme="clinician">{children}</div>;
}
