/**
 * Resolves the --anchor argument. "now" means the current instant rounded down to the hour,
 * for hand demos (checkpoint C1, ruling 3.8); the caller supplies the clock reading, so the
 * generator itself never reads the wall clock. Anything else must be an ISO instant.
 */
import { DEFAULT_ANCHOR } from "./profiles.js";

const HOUR_MS = 3_600_000;

export function resolveAnchor(arg: string | undefined, nowMs: number): string {
  if (arg === undefined) return DEFAULT_ANCHOR;
  if (arg === "now") return new Date(Math.floor(nowMs / HOUR_MS) * HOUR_MS).toISOString();
  const ms = Date.parse(arg);
  if (Number.isNaN(ms)) throw new Error(`invalid --anchor "${arg}"; use an ISO instant or "now"`);
  return new Date(ms).toISOString();
}
