import { redirect } from "next/navigation";

// The one working administrative screen is the patient list; Phase 6 adds the rest.
export default function AdminHomePage() {
  redirect("/admin/patients");
}
