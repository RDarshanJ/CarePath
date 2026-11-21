import { redirect } from "next/navigation";
import { Banner, Heading, Link, SkipLink } from "@carepath/ui";
import { getSession } from "../../../lib/auth/session";
import { homeForRole, safeNext } from "../../../lib/auth/roles";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in | CarePath" };

const notices = {
  expired: {
    tone: "warning",
    title: "Your session ended",
    body: "CarePath signs you out after 30 minutes without activity, and after 12 hours in total. Nothing you were typing was saved. Sign in again to continue.",
  },
  required: {
    tone: "info",
    title: "Sign in to continue",
    body: "That page needs an account. Sign in and you will go straight back to it.",
  },
  "signed-out": {
    tone: "success",
    title: "You are signed out",
    body: "Your session has ended on this device.",
  },
} as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; next?: string }>;
}) {
  const { reason, next } = await searchParams;
  const result = await getSession();
  if (result.status === "signed_in" && reason !== "signed-out") {
    redirect(safeNext(next) ?? homeForRole(result.session.role));
  }
  const notice = reason && reason in notices ? notices[reason as keyof typeof notices] : null;

  return (
    <>
      <SkipLink />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-x-16 gap-y-10 px-gutter py-8 md:py-14 lg:grid-cols-12"
      >
        <div className="flex flex-col gap-8 lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="flex items-center gap-2 text-h3 font-semibold text-ink">
                <span aria-hidden="true" className="size-3 rounded-full bg-accent" />
                CarePath
              </p>
              <p className="text-body text-ink-muted">
                Physical therapy, at the clinic and at home.
              </p>
            </div>
            {/* Below the two-column width the demo accounts sit after the form; this says they exist. */}
            <Link href="#demo-heading" variant="standalone" className="lg:hidden">
              Exploring the demo? Choose a role
            </Link>
          </div>
          {notice ? (
            <Banner tone={notice.tone} title={notice.title} className="max-w-measure">
              {notice.body}
            </Banner>
          ) : null}
          <section
            aria-labelledby="signin-heading"
            className="flex flex-col gap-6 rounded-container border border-border bg-surface p-5 sm:p-8"
          >
            <div className="flex flex-col gap-1.5">
              <Heading level={1} id="signin-heading">
                Sign in
              </Heading>
              <p className="text-body text-ink-muted">
                Patients and clinic staff use the same sign-in.
              </p>
            </div>
            <LoginForm next={safeNext(next)} section="form" />
            <div className="flex flex-col gap-1 border-t border-border pt-5">
              <p className="text-body text-ink-muted">New patient with an eligibility code?</p>
              <p>
                <Link href="/onboarding" variant="standalone">
                  Create your account
                </Link>
              </p>
            </div>
          </section>
        </div>
        <section
          aria-labelledby="demo-heading"
          className="flex flex-col gap-4 lg:col-span-5 lg:pt-28"
        >
          <div className="flex flex-col gap-1.5">
            <Heading level={2} id="demo-heading" tabIndex={-1}>
              Exploring the demo?
            </Heading>
            <p className="max-w-measure text-small text-ink-muted">
              Choose a role to sign in with its seeded demo account. Each button uses the same
              sign-in as the form, so you get a real session with synthetic data.
            </p>
          </div>
          <LoginForm next={safeNext(next)} section="demo" />
        </section>
      </main>
    </>
  );
}
