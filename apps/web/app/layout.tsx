import type { ReactNode } from "react";
import { DemoNotice } from "@carepath/ui";
import "@carepath/ui/fonts";
import "./globals.css";
import { QueryProvider } from "../lib/query/providers";

export const metadata = {
  title: "CarePath",
  description: "Demonstration product. Synthetic data. Not for clinical use.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <DemoNotice />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
