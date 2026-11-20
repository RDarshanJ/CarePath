import type { ReactNode } from "react";

export const metadata = {
  title: "CarePath",
  description: "Demonstration product. Synthetic data. Not for clinical use.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <p role="note">Demonstration product. Synthetic data. Not for clinical use.</p>
        {children}
      </body>
    </html>
  );
}
