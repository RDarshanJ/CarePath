/**
 * Pure keyboard helpers. Components call these from their key handlers, and the unit tests exercise
 * them without a DOM (the package tests run in node). Real-browser keyboard behaviour is covered by the
 * gallery spec in apps/web/e2e/design-system.spec.ts.
 */

export type Orientation = "horizontal" | "vertical" | "both";

/**
 * Next index for a roving focus group (radio-like lists, tabs, row links), or null when the key does
 * not move focus. Arrow keys wrap when `loop` is true; Home and End jump to the ends.
 */
export function rovingIndex(
  key: string,
  index: number,
  count: number,
  { orientation = "both", loop = true }: { orientation?: Orientation; loop?: boolean } = {},
): number | null {
  if (count <= 0) return null;
  const next = orientation !== "vertical" ? ["ArrowRight"] : [];
  const prev = orientation !== "vertical" ? ["ArrowLeft"] : [];
  if (orientation !== "horizontal") {
    next.push("ArrowDown");
    prev.push("ArrowUp");
  }
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (next.includes(key)) {
    if (index + 1 < count) return index + 1;
    return loop ? 0 : index;
  }
  if (prev.includes(key)) {
    if (index - 1 >= 0) return index - 1;
    return loop ? count - 1 : index;
  }
  return null;
}

/** Enter and Space activate buttons and toggles. */
export const isActivationKey = (key: string): boolean => key === "Enter" || key === " ";

/**
 * Should a global "/" shortcut focus the search field? Not while the person is typing in another
 * control, and never with a modifier held.
 */
export function isSearchShortcut(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}): boolean {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return false;
  const tag = e.target?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return false;
  return !e.target?.isContentEditable;
}
