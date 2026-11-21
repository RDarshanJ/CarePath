import type { ReactNode } from "react";

/** Layout helpers shared by the stories. Not exported from the package. */

/** A labelled group inside a story: the label names the state shown below it. */
export function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-caption font-semibold text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

/** Vertical stack of cases. */
export function Cases({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

/** Wrapping row for small controls. */
export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
