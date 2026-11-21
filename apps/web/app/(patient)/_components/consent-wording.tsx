"use client";

import { CONSENT_TEXT_VERSIONS } from "@carepath/shared/contracts";
import { Heading } from "@carepath/ui";
import { consentCopy, type OfferedConsent } from "../_lib/consent-copy";

/**
 * One consent in words (CD-143): title, the word Required or Optional, the plain summary and the short
 * list, always on screen, then the full wording behind one disclosure. Used by the onboarding consent
 * step and by Sharing and consent, so the two cannot drift apart. `open` lets a banner open the
 * full wording ("Read the new wording", CD-145).
 */
export function ConsentWording({
  type,
  headingId,
  open,
  onToggle,
  children,
}: {
  type: OfferedConsent;
  headingId: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const copy = consentCopy[type];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Heading level={4} as="h2" id={headingId}>
          {copy.title}
        </Heading>
        <span className="text-small font-medium text-ink-muted">{copy.requirement}</span>
      </div>
      <p className="max-w-measure text-body">{copy.summary}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink-muted">
        {copy.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <details
        id={`wording-${type}`}
        open={open}
        onToggle={onToggle ? (e) => onToggle(e.currentTarget.open) : undefined}
        className="group"
      >
        <summary className="inline-flex min-h-target cursor-pointer items-center rounded-control text-label font-medium text-link underline underline-offset-2 hover:text-primary-hover focus-visible:focus-ring">
          Read the full wording
        </summary>
        <div className="mt-2 flex flex-col gap-2 border-l-2 border-border pl-4">
          <p className="text-small text-ink-muted">Wording version {CONSENT_TEXT_VERSIONS[type]}</p>
          {copy.fullWording.map((p) => (
            <p key={p} className="max-w-measure text-body">
              {p}
            </p>
          ))}
        </div>
      </details>
      {children}
    </div>
  );
}
