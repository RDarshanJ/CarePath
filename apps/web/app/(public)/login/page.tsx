import NextLink from "next/link";
import { redirect } from "next/navigation";
import { Banner, Heading } from "@carepath/ui";
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
    <main
      id="main"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-gutter py-10 md:py-16"
    >
      <div className="mb-8">
        <p className="font-heading text-h3 font-semibold text-primary">CarePath</p>
        <p className="text-body text-ink-muted">Physical therapy, at the clinic and at home.</p>
      </div>
      {notice ? (
        <Banner tone={notice.tone} title={notice.title} className="mb-8 max-w-measure">
          {notice.body}
        </Banner>
      ) : null}
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        <section aria-labelledby="signin-heading" className="flex flex-col gap-5">
          <Heading level={1} id="signin-heading">
            Sign in
          </Heading>
          <LoginForm next={safeNext(next)} section="form" />
          <p className="text-body text-ink-muted">
            New patient with an eligibility code?{" "}
            <NextLink
              href="/onboarding"
              className="rounded-control text-primary underline underline-offset-2 hover:decoration-2 focus-visible:focus-ring"
            >
              Start here
            </NextLink>
            .
          </p>
        </section>
        <section
          aria-labelledby="demo-heading"
          className="flex flex-col gap-4 border-t border-border pt-8 md:border-t-0 md:border-l md:pt-0 md:pl-14"
        >
          <div className="flex flex-col gap-1.5">
            <Heading level={2} id="demo-heading">
              Exploring the demo?
            </Heading>
            <p className="max-w-measure text-body text-ink-muted">
              Choose a role to sign in with its demo account. This is the same sign-in as the form,
              using the seeded logins in the repository docs, so you get a real session.
            </p>
          </div>
          <LoginForm next={safeNext(next)} section="demo" />
        </section>
      </div>
    </main>
  );
}
