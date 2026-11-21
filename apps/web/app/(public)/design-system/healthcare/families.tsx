import type { ReactNode } from "react";
import { Heading, Link, SkipLink, ThemeScope } from "@carepath/ui";

export const families = [
  {
    slug: "records",
    title: "Patient identity, visits and consent",
    nav: "Identity, visits, consent",
    summary: "Patient banner, list rows, appointment record, consent status line.",
  },
  {
    slug: "data",
    title: "Clinical data",
    nav: "Clinical data",
    summary:
      "Pain over time, weekly sessions, the week strip, equal tables, missing and stale data.",
  },
  {
    slug: "planning",
    title: "Treatment planning",
    nav: "Planning",
    summary:
      "Exercise rows, the dose editor with move buttons, plan changes, versions and plan state.",
  },
  {
    slug: "messaging",
    title: "Messaging",
    nav: "Messaging",
    summary: "Thread, composer, delivery state, the emergency and urgent lines.",
  },
  {
    slug: "ai",
    title: "Generated drafts",
    nav: "Generated drafts",
    summary:
      "Draft block in six states, provenance, evidence references, statement support, decision bar.",
  },
] as const;

export type FamilySlug = (typeof families)[number]["slug"];

export function HealthcareIndex() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {families.map((f) => (
        <li key={f.slug} className="rounded-container border border-border bg-surface p-4">
          <Link href={`/design-system/healthcare/${f.slug}`} variant="standalone">
            {f.title}
          </Link>
          <p className="mt-1 text-small text-ink-muted">{f.summary}</p>
        </li>
      ))}
    </ul>
  );
}

/** Frame of one healthcare family page: header, family navigation, main. */
export function FamilyPage({
  slug,
  heading,
  intro,
  children,
}: {
  /** The family page shown; the index page passes none. */
  slug?: FamilySlug;
  heading?: string;
  intro: string;
  children: ReactNode;
}) {
  const family = families.find((f) => f.slug === slug);
  return (
    <ThemeScope theme="clinician" className="min-h-screen">
      <SkipLink />
      <header className="border-b border-border bg-surface px-gutter py-6">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-caption font-semibold text-ink-muted">
            <Link href="/design-system" className="inline-flex min-h-6 items-center">
              CarePath design system
            </Link>{" "}
            / healthcare components
          </p>
          <Heading level={1} className="mt-1">
            {heading ?? family?.title}
          </Heading>
          <p className="mt-2 max-w-3xl text-body text-ink-muted">{intro}</p>
          <nav aria-label="Healthcare families" className="mt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label">
              {families.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/design-system/healthcare/${f.slug}`}
                    variant="standalone"
                    aria-current={f.slug === slug ? "page" : undefined}
                    className={f.slug === slug ? "font-semibold no-underline" : undefined}
                  >
                    {f.nav}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-[1400px] flex-col gap-10 px-gutter py-8 focus:outline-none"
      >
        {children}
        <p className="border-t border-border pt-6 text-small text-ink-muted">
          Demonstration product. Synthetic data. Not for clinical use.
        </p>
      </main>
    </ThemeScope>
  );
}
