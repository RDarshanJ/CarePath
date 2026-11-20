import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionInfo } from "@carepath/shared/contracts";
import { getSession } from "./session";
import { homeForRole, loginUrl, shellForRole, type Shell } from "./roles";

/**
 * Server-side role guard for a route-group layout. Signed out or expired: sign-in with the page to
 * return to. Signed in with another role: redirected to that role's own home, so a patient asking for
 * a clinician page never sees it. The API enforces the same rules on every request; this keeps the
 * wrong shell from rendering at all.
 */
export async function requireShell(shell: Shell): Promise<SessionInfo> {
  const result = await getSession();
  if (result.status !== "signed_in") {
    const path = (await headers()).get("x-cp-path");
    redirect(loginUrl(result.status === "expired" ? "expired" : "required", path));
  }
  if (shellForRole[result.session.role] !== shell) redirect(homeForRole(result.session.role));
  return result.session;
}
