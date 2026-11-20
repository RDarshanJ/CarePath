/** Numbers and counts (microcopy guidelines section 5). Digits for counts, correct plurals. */

/** "1 visit", "2 visits". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Thousands separator from 1,000, no trailing zeros. */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 }).format(n);
}

/** "7 of 10": scores always say "of", never a slash. */
export function ofTotal(value: number, total: number): string {
  return `${formatCount(value)} of ${formatCount(total)}`;
}

/** Spoken-sentence form: "7 out of 10". Used only inside patient sentences. */
export function outOfTotal(value: number, total: number): string {
  return `${formatCount(value)} out of ${formatCount(total)}`;
}

/** "Monday, Wednesday and Friday". */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
