"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, cx, linkClasses } from "@carepath/ui";

/**
 * The previous in-app path, kept in memory only (DR-002 R1): set by `useTrackPreviousPath`, which every
 * shell calls once. It holds a pathname, never a query string, so a search term can never be read from it.
 */
let previousPath: string | null = null;
let currentPath: string | null = null;

/** Called once by each app shell: records the path before the current one on every in-app navigation. */
export function useTrackPreviousPath() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === currentPath) return;
    previousPath = currentPath;
    currentPath = pathname;
  }, [pathname]);
}

const isUnder = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/**
 * Back link (CD-505): one link named for its parent, before the `h1` and after the skip link, never beside
 * breadcrumbs. When the page before this one was the parent, the link goes back in history so the parent
 * returns in the state it was left in (filters, sort, page and scroll live in its URL or its layout store).
 * Otherwise it navigates to `href`. It is a real link either way: it works without script and opens in a
 * new tab like any other.
 */
export function BackLink({
  href,
  children,
  parentPrefix,
  className,
}: {
  /** Where the link goes when the parent is not the previous page. */
  href: string;
  /** Names the destination: "Back to Today", "All patients". Never a bare "Back". */
  children: ReactNode;
  /** Paths that count as the parent; defaults to the path of `href`. */
  parentPrefix?: string;
  className?: string;
}) {
  const router = useRouter();
  const prefix = parentPrefix ?? href.split("?")[0]!;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    if (previousPath && isUnder(previousPath, prefix)) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <NextLink
      href={href}
      onClick={onClick}
      className={cx(linkClasses.standalone, "gap-1 pr-1", className)}
    >
      <Icon name="chevron-left" size={18} className="shrink-0" />
      <span>{children}</span>
    </NextLink>
  );
}
