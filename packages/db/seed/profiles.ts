/**
 * Seed profiles. `small` is the default and what `pnpm verify` runs. `full` carries the targets
 * of docs/BRIEF.md section 18 (development targets, not claims about real people) and is tuned
 * and timed by WP 6.3. A "clinic" in the brief is one Organization here (the tenant boundary).
 */
export interface SeedProfile {
  name: string;
  /** Organizations (clinics). */
  orgs: number;
  /** Physical therapists (Practitioner rows) per organization. */
  therapistsPerOrg: number;
  /** Patients over all organizations, personas included. */
  patients: number;
  /** Appointment rows over all organizations, cancelled ones included. */
  appointments: number;
  /** Encounters (visits that took place) over all organizations. */
  encounters: number;
  /**
   * SessionActivity rows over all organizations. null means no cap: every generated session is
   * kept. When set, sessions are kept in order of a deterministic score until the cap is reached.
   */
  activityRecords: number | null;
  /** Days of history before the anchor. */
  historyDays: number;
  /** Days of availability and bookings after the anchor. */
  futureDays: number;
}

export const profiles = {
  small: {
    name: "small",
    orgs: 2,
    therapistsPerOrg: 3,
    patients: 40,
    appointments: 90,
    encounters: 8,
    activityRecords: null,
    historyDays: 56,
    futureDays: 21,
  },
  full: {
    name: "full",
    orgs: 5,
    therapistsPerOrg: 6,
    patients: 1000,
    appointments: 2000,
    encounters: 50,
    activityRecords: 10000,
    historyDays: 90,
    futureDays: 21,
  },
} as const satisfies Record<string, SeedProfile>;

export type ProfileName = keyof typeof profiles;

export function isProfileName(value: string): value is ProfileName {
  return Object.prototype.hasOwnProperty.call(profiles, value);
}

/**
 * Fixed "now" of the seeded world: Thursday 2026-11-19 16:00 UTC (09:00 in Phoenix). Nothing
 * reads the wall clock, so history and bookings sit at the same offsets from this instant on
 * every run. Override with --anchor only when a different fixed instant is needed.
 */
export const DEFAULT_ANCHOR = "2026-11-19T16:00:00.000Z";
export const DEFAULT_SEED = "carepath-seed-1";
