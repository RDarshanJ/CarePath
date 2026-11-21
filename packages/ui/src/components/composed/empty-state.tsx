import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../primitives/icons";
import { Heading } from "../primitives/text";

/**
 * The one empty state (CD-535, CD-336): icon or picture, a heading saying what is empty, one sentence
 * saying why and what fills it, at most one action. No data, filtered-empty, search-empty and
 * closed-empty differ in copy, not layout. A search term may be echoed on screen, never in the URL or
 * the document title.
 */
export function EmptyState({
  icon = "list",
  title,
  children,
  action,
  image,
  padded = false,
  headingAs = "h3",
  className,
}: {
  icon?: IconName;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /** A decorative picture beside the text (the app passes its own image element). */
  image?: ReactNode;
  /** Inset inside a list or panel (was the clinician `Empty` wrapper). */
  padded?: boolean;
  headingAs?: "h2" | "h3" | "h4" | "p";
  className?: string;
}) {
  const state = (
    <div
      className={cx(
        "flex flex-col items-start gap-3 rounded-container border border-dashed border-border-control p-6",
        image ? "min-w-0 flex-1" : null,
        className,
      )}
    >
      <Icon name={icon} size={24} className="text-ink-muted" />
      <Heading level={4} as={headingAs}>
        {title}
      </Heading>
      <p className="max-w-measure text-body text-ink-muted">{children}</p>
      {action}
    </div>
  );
  const body = image ? (
    <div className="flex flex-wrap items-center gap-4">
      {state}
      {image}
    </div>
  ) : (
    state
  );
  return padded ? <div className="p-4">{body}</div> : body;
}
