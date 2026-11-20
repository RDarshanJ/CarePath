/** Plain class strings shared by live overlays and the gallery's static specimens. No "use client" so server code can read them. */
const surface = "border border-border-control bg-surface text-ink shadow-overlay";

export const overlayClasses = {
  surface,
  popover: `rounded-container p-4 text-body ${surface}`,
  menu: `rounded-control p-1 ${surface}`,
  menuItem:
    "relative flex min-h-target cursor-pointer select-none items-center gap-2 rounded-control py-1.5 pr-3 pl-8 text-label outline-none " +
    "data-[highlighted]:bg-primary-subtle data-[disabled]:cursor-not-allowed data-[disabled]:text-disabled-ink",
} as const;
