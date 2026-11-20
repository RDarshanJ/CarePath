import type { ReactNode } from "react";
import { DemoNotice } from "@carepath/ui";
import "@carepath/ui/fonts";
import "./globals.css";

export const metadata = {
  title: "CarePath",
  description: "Demonstration product. Synthetic data. Not for clinical use.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DemoNotice />
        {children}
      </body>
    </html>
  );
}
