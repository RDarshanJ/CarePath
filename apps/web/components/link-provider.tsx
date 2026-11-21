"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { LinkProvider } from "@carepath/ui";

/** Makes every `@carepath/ui` Link and `Button href` use next/link for in-app navigation (CD-530). */
export function AppLinkProvider({ children }: { children: ReactNode }) {
  return <LinkProvider component={NextLink}>{children}</LinkProvider>;
}
