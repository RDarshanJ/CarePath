import { plural } from "./number.js";

/** Prose duration: "45 seconds", "2 minutes 30 seconds". */
export function secondsText(total: number): string {
  if (total < 60) return plural(total, "second");
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? plural(m, "minute") : `${plural(m, "minute")} ${plural(s, "second")}`;
}

/** "00:45", for a running timer only. */
export function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Prose age from whole hours: "under an hour", "19 hours", "2 days". */
export function formatAgeHours(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 48) return plural(hours, "hour");
  return plural(Math.floor(hours / 24), "day");
}

/**
 * Compact age for a narrow column: "5 h", "3 d". Relative time only in compact columns, and always
 * with the absolute time in the detail (microcopy guidelines section 5).
 */
export function formatAgeCompact(hours: number): string {
  if (hours < 1) return "under 1 h";
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}
