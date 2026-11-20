import type { RoleKey } from "@carepath/shared/contracts";

/**
 * The seeded demo logins listed in docs/demo-accounts.md. Demo mode on the sign-in page submits
 * these to the real login endpoint, so it is ordinary authentication with a known password, not a bypass.
 * The password belongs to synthetic data on a local demonstration only.
 */
export const DEMO_PASSWORD = "CarePath-Demo-2026";

export interface DemoAccount {
  role: RoleKey;
  label: string;
  email: string;
  /** What the account's seeded data holds, from docs/demo-accounts.md. */
  summary: string;
}

export const demoAccounts: readonly DemoAccount[] = [
  {
    role: "patient",
    label: "Patient",
    email: "patient.demo@carepath.test",
    summary: "An active plan with three versions, session and check-in history.",
  },
  {
    role: "physical_therapist",
    label: "Physical therapist",
    email: "therapist.demo@carepath.test",
    summary: "A review queue, draft and signed notes, and a care team caseload.",
  },
  {
    role: "care_coordinator",
    label: "Care coordinator",
    email: "coordinator.demo@carepath.test",
    summary: "Enrollment, assignment and scheduling work. Screens arrive in a later phase.",
  },
  {
    role: "clinic_admin",
    label: "Clinic administrator",
    email: "admin.demo@carepath.test",
    summary: "Settings, metrics and audit. Screens arrive in a later phase.",
  },
];
