"use client";

import {
  createContext,
  forwardRef,
  useContext,
  type AnchorHTMLAttributes,
  type ElementType,
  type ReactNode,
} from "react";
import { cx } from "../../lib/cx";

/**
 * The element used for in-app links. The app sets it once (`LinkProvider` with next/link) so this package
 * does not depend on Next; without a provider a plain `a` is used.
 */
const LinkContext = createContext<ElementType>("a");

export function LinkProvider({
  component,
  children,
}: {
  component: ElementType;
  children: ReactNode;
}) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

export const useLinkComponent = (): ElementType => useContext(LinkContext);

/** True for links that leave the app (other origin, tel:, mailto:). Those use a plain `a`. */
export const isExternalHref = (href: string): boolean => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);

/*
 * Hit areas (DR-004 U5, ruling 6.5). `inline` adds 4 px of vertical padding: on an inline box it grows the
 * hit and focus area without moving the line, so a 13 px clinician link is 25 px tall in a 36 px row.
 * `standalone` is the theme's full target (48 px patient, 32 px clinician) in both directions.
 */
export const linkClasses = {
  inline:
    "rounded-control py-1 text-link underline underline-offset-2 hover:text-primary-hover hover:decoration-2 focus-visible:focus-ring",
  standalone:
    "inline-flex min-h-target min-w-target items-center rounded-control text-label font-medium text-link underline underline-offset-2 hover:text-primary-hover hover:decoration-2 focus-visible:focus-ring",
} as const;

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /**
   * `inline` inside a sentence (no minimum height); `standalone` for a link on its own line, in a list,
   * a header or a table cell, which gets the theme's minimum target height (CD-530, CD-121).
   */
  variant?: keyof typeof linkClasses;
  /** Override the element for this link only. */
  linkAs?: ElementType;
  children?: ReactNode;
}

/**
 * The one text link (CD-530). Underlined at rest. Link text names the destination. External, `tel:` and
 * `mailto:` links render a plain anchor and should show the number or domain as their text.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, variant = "inline", linkAs, className, ...rest },
  ref,
) {
  const Provided = useLinkComponent();
  const Comp: ElementType = linkAs ?? (isExternalHref(href) ? "a" : Provided);
  return <Comp ref={ref} href={href} className={cx(linkClasses[variant], className)} {...rest} />;
});
