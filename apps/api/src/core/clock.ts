/**
 * Fixed clock for gates and demos (checkpoint C1, ruling 3.8). The seeded world is fixed at one
 * instant; the server clock is not. End-to-end gates seed with the default anchor and start the
 * API with CAREPATH_FIXED_NOW=<anchor>, so "today" and "due" match the seeded data on any date.
 * Honoured only when NODE_ENV is not "production".
 */
export interface ClockSetting {
  now: () => Date;
  /** The fixed instant, or null when the real clock is used. */
  fixedAt: Date | null;
  /** One line for the startup log, or null when there is nothing to say. */
  warning: string | null;
}

export function clockFromEnv(env: NodeJS.ProcessEnv): ClockSetting {
  const raw = env["CAREPATH_FIXED_NOW"];
  const real: ClockSetting = { now: () => new Date(), fixedAt: null, warning: null };
  if (raw === undefined || raw === "") return real;
  if (env["NODE_ENV"] === "production") {
    return {
      ...real,
      warning: "CAREPATH_FIXED_NOW is ignored in production; using the real clock",
    };
  }
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) throw new Error("CAREPATH_FIXED_NOW must be an ISO 8601 instant");
  const fixedAt = new Date(ms);
  return {
    now: () => new Date(ms),
    fixedAt,
    warning: `CAREPATH_FIXED_NOW is set: the API clock is fixed at ${fixedAt.toISOString()} (not for production)`,
  };
}
