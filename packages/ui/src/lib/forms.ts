/**
 * Pure form rules shared by components and screens.
 */

/**
 * CD-522: a field is dirty when it differs from its initial value and is not empty after trim. An
 * overlay or route with no dirty field dismisses freely.
 */
export function isDirtyText(
  initial: string | null | undefined,
  current: string | null | undefined,
) {
  const now = (current ?? "").trim();
  return now !== "" && now !== (initial ?? "").trim();
}

/**
 * CD-107: an exclusive option ("None of these") in a checkbox group. Checking it clears the rest;
 * checking anything else clears it. Returns the new values and whether other choices were cleared, so
 * the caller can announce "Other choices cleared".
 */
export function toggleExclusive(
  values: readonly string[],
  value: string,
  checked: boolean,
  exclusive: string,
): { values: string[]; cleared: boolean } {
  if (!checked) return { values: values.filter((v) => v !== value), cleared: false };
  if (value === exclusive) {
    return { values: [exclusive], cleared: values.some((v) => v !== exclusive) };
  }
  const had = values.includes(exclusive);
  const rest = values.filter((v) => v !== exclusive && v !== value);
  return { values: [...rest, value], cleared: had };
}

/** "Error: " prefix for the document title while a form shows an error summary (CD-441). */
export function errorTitle(title: string, hasErrors: boolean): string {
  const bare = title.replace(/^Error: /, "");
  return hasErrors ? `Error: ${bare}` : bare;
}

/** Characters-left line for a counted field: shown only near the limit (CD-531). */
export function remainingCharacters(
  length: number,
  max: number,
  threshold = 0.8,
): { show: boolean; text: string; over: boolean } {
  const left = max - length;
  const over = left < 0;
  const text = over
    ? `${-left} ${-left === 1 ? "character" : "characters"} too many`
    : `${left} ${left === 1 ? "character" : "characters"} left`;
  return { show: length >= Math.floor(max * threshold), text, over };
}
