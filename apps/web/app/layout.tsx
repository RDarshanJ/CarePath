import type { ReactNode } from "react";
import "@carepath/ui/fonts";
import "./globals.css";
import { QueryProvider } from "../lib/query/providers";
import { AppLinkProvider } from "../components/link-provider";

export const metadata = {
  title: "CarePath",
  description: "Demonstration product. Synthetic data. Not for clinical use.",
};

// The demo notice is rendered inside each route group (patient, clinician, admin, public), in that
// group's theme, beside its skip link (D-WP-6).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <QueryProvider>
          <AppLinkProvider>{children}</AppLinkProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
