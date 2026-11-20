import type { RoleKey } from "@carepath/shared/contracts";

/** The three app shells (route groups). Route groups add no URL segment, so each has its own paths. */
export type Shell = "patient" | "clinician" | "admin";

/**
 * Which shell a role works in. Coordinators and administrators have no clinical read permission
 * (checkpoint C1, ruling 3.7), so they use the administrative shell, not the clinician one. Their
 * one working screen is the patient list with therapist assignment (checkpoint C2, F1).
 */
export const shellForRole: Record<RoleKey, Shell> = {
  patient: "patient",
  physical_therapist: "clinician",
  care_coordinator: "admin",
  clinic_admin: "admin",
};

export const homeForShell: Record<Shell, string> = {
  patient: "/today",
  clinician: "/overview",
  admin: "/admin/patients",
};

export const roleLabel: Record<RoleKey, string> = {
  patient: "Patient",
  physical_therapist: "Physical therapist",
  care_coordinator: "Care coordinator",
  clinic_admin: "Clinic administrator",
};

export const homeForRole = (role: RoleKey): string => homeForShell[shellForRole[role]];

/** A return path is used only if it stays on this site: one leading slash, no scheme, no backslash. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (next.startsWith("/login")) return null;
  return next;
}

export type SignInReason = "expired" | "required" | "signed-out";

export function loginUrl(reason: SignInReason, next?: string | null): string {
  const params = new URLSearchParams({ reason });
  const safe = safeNext(next);
  if (safe) params.set("next", safe);
  return `/login?${params.toString()}`;
}
