import type { PersonRef } from "@carepath/shared/contracts";

/** Display name of a practitioner: "Given Family", with credentials when recorded. */
export function practitionerName(p: {
  givenName: string;
  familyName: string;
  credentials?: string | null;
}): string {
  const name = `${p.givenName} ${p.familyName}`;
  return p.credentials ? `${name}, ${p.credentials}` : name;
}

export function practitionerRef(p: {
  id: string;
  userId: string | null;
  givenName: string;
  familyName: string;
  credentials?: string | null;
}): PersonRef {
  return { userId: p.userId, practitionerId: p.id, name: practitionerName(p) };
}

/** A staff member or patient known only by user account (reviewers, resolvers). */
export function userRef(
  u: { id: string; displayName: string; practitioner?: { id: string } | null } | null,
): PersonRef | null {
  if (!u) return null;
  return { userId: u.id, practitionerId: u.practitioner?.id ?? null, name: u.displayName };
}
