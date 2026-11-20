import type { ReactNode } from "react";
import { Heading, Mono, ThemeScope, density, type ThemeName } from "@carepath/ui";

const meta: Record<ThemeName, string> = {
  patient: `Patient theme. Body ${density.patient.text.body.join("/")}, targets ${density.patient["target-min"]} px, IBM Plex Sans headings.`,
  clinician: `Clinician and admin theme. Body ${density.clinician.text.body.join("/")}, tables ${density.clinician.text.table.join("/")}, targets ${density.clinician["target-min"]} px, rows ${density.clinician["row-h"]} px.`,
};

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-16 border-t border-border pt-8"
    >
      <Heading level={2} id={`${id}-h`}>
        {title}
      </Heading>
      {intro ? <p className="mt-2 max-w-3xl text-body text-ink-muted">{intro}</p> : null}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

export function Pane({ theme, children }: { theme: ThemeName; children: ReactNode }) {
  return (
    <ThemeScope theme={theme} className="min-w-0 rounded-container border border-border-control">
      <div
        data-theme="clinician"
        className="rounded-t-container border-b border-border bg-surface px-4 py-2 text-caption text-ink-muted"
      >
        <Mono>data-theme="{theme}"</Mono> <span className="px-1">/</span> {meta[theme]}
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-5">{children}</div>
    </ThemeScope>
  );
}

function render(c: ReactNode | ((t: ThemeName) => ReactNode), t: ThemeName): ReactNode {
  return typeof c === "function" ? c(t) : c;
}

/** Shows the same content in both themes. Pass `patient` and `clinician` for pieces that exist in one theme only. */
export function Specimen({
  children,
  patient,
  clinician,
  title,
}: {
  children?: ReactNode | ((theme: ThemeName) => ReactNode);
  patient?: ReactNode;
  clinician?: ReactNode;
  title?: string;
}) {
  return (
    <div>
      {title ? (
        <Heading level={3} className="mb-3">
          {title}
        </Heading>
      ) : null}
      <div className="grid gap-4 min-[1100px]:grid-cols-2">
        <Pane theme="patient">{patient ?? render(children, "patient")}</Pane>
        <Pane theme="clinician">{clinician ?? render(children, "clinician")}</Pane>
      </div>
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="text-caption font-semibold text-ink-muted">{children}</p>;
}

export function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <Label>{label}</Label> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
