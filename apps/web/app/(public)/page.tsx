import { redirect } from "next/navigation";
import { getSession } from "../../lib/auth/session";
import { homeForRole } from "../../lib/auth/roles";

// The front door: signed in goes to the role's home, everyone else to sign-in.
export default async function HomePage() {
  const result = await getSession();
  redirect(result.status === "signed_in" ? homeForRole(result.session.role) : "/login");
}
