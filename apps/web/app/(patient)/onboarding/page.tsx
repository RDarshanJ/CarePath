import { redirect } from "next/navigation";
import { Link } from "@carepath/ui";
import { OnboardingFlow } from "./_components/onboarding-flow";
import { getClinic, getIntake } from "../_lib/data";
import { emptyForm, formFromIntake } from "./_lib/onboarding";
import { getSession } from "../../../lib/auth/session";
import { homeForRole } from "../../../lib/auth/roles";

export const metadata = { title: "Join CarePath | CarePath" };

/**
 * Onboarding is the one patient page a signed-out visitor can open: it starts with the eligibility code.
 * A signed-in patient who has not submitted sees a summary and resumes at the first step still open
 * (AC-A1); one who has submitted goes to Today; any other role goes to its own home.
 */
export default async function OnboardingPage() {
  const result = await getSession();
  let flow: React.ComponentProps<typeof OnboardingFlow> = {
    patientId: null,
    completed: [],
    form: emptyForm(),
    email: "",
    clinicPhone: null,
  };

  if (result.status === "signed_in") {
    const { session } = result;
    if (session.role !== "patient" || !session.patientId) redirect(homeForRole(session.role));
    const [intake, clinic] = await Promise.all([
      getIntake(session.patientId),
      getClinic(session.patientId),
    ]);
    if (intake.status !== "in_progress") redirect("/today");
    flow = {
      patientId: session.patientId,
      completed: intake.steps.filter((s) => s.complete).map((s) => s.step),
      form: formFromIntake(intake),
      email: session.user.email,
      clinicPhone: clinic.phone,
    };
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-gutter py-2 md:px-0">
          <p className="font-heading text-h4 font-semibold text-ink">CarePath</p>
          {result.status !== "signed_in" ? (
            <Link href="/login" variant="standalone">
              Sign in
            </Link>
          ) : null}
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 px-gutter py-6 md:py-10">
        <OnboardingFlow {...flow} />
      </main>
    </div>
  );
}
