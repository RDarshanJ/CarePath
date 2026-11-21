"use client";

import { useId } from "react";
import {
  AI_CONSENT_NAME,
  formatDate,
  formatTime,
  tzAbbreviation,
  type Audience,
} from "@carepath/shared";
import type { Consent, ConsentList, ConsentType } from "@carepath/shared/contracts";
import { cx } from "../../lib/cx";
import { Icon } from "../primitives/icons";

/*
 * Consent state in words (CD-140, CD-144, CD-146). The state line is the same on the patient's Sharing
 * and consent page and on the clinician's record; the clinician side is read only (no control, no
 * revoke). The motion-tracking consent cannot be granted and is not shown at all (checkpoint C3 item 5,
 * R7): the line renders nothing for a type that is not grantable.
 */

export type ConsentEntry = ConsentList["types"][number];

/** Titles per audience. The patient wording stays "Automated drafting tools" (DR-002 M, C3 3.1). */
export const consentTitles: Record<Audience, Record<ConsentType, string>> = {
  patient: {
    treatment_and_data_use: "Treatment and data use",
    ai_assisted_features: "Automated drafting tools",
    motion_tracking: "Camera movement tracking",
  },
  staff: {
    treatment_and_data_use: "Treatment and data use",
    ai_assisted_features: AI_CONSENT_NAME,
    motion_tracking: "Camera movement tracking",
  },
};

/** Staff screens where a draft depends on the optional consent (CD-146, CD-408). */
export const AI_CONSENT_BLOCKED_TEXT =
  "AI-assisted drafting is off for this patient, so a draft cannot be generated. The patient or the clinic can change this consent.";

function when(iso: string, tz: string, withTime: boolean): string {
  return withTime
    ? `${formatDate(iso, tz)}, ${formatTime(iso, tz)} ${tzAbbreviation(iso, tz)}`
    : formatDate(iso, tz);
}

export interface ConsentState {
  /** "Agreed", "Allowed", "Withdrawn", "Not agreed", "Not allowed". */
  kind: "agreed" | "allowed" | "withdrawn" | "not_agreed" | "not_allowed";
  text: string;
  /** The wording version the active agreement names, and whether it is older than the current one. */
  version: string | null;
  wordingChanged: boolean;
}

/**
 * CD-144 words: required "Agreed on {date}" / "Not agreed" / "Withdrawn on {date}"; optional "Allowed
 * since {date, time}" / "Not allowed". `history` is newest first (`ConsentList.history`).
 */
export function consentState(
  entry: ConsentEntry,
  history: Consent[],
  tz: string,
): ConsentState | null {
  if (!entry.grantable) return null;
  const a = entry.active;
  if (a && a.status === "active") {
    const wordingChanged = a.textVersion !== entry.currentTextVersion;
    return entry.required
      ? {
          kind: "agreed",
          text: `Agreed on ${when(a.grantedAt, tz, false)}`,
          version: a.textVersion,
          wordingChanged,
        }
      : {
          kind: "allowed",
          text: `Allowed since ${when(a.grantedAt, tz, true)}`,
          version: a.textVersion,
          wordingChanged,
        };
  }
  const last = history.find((h) => h.type === entry.type && h.revokedAt);
  if (entry.required) {
    return last?.revokedAt
      ? {
          kind: "withdrawn",
          text: `Withdrawn on ${when(last.revokedAt, tz, false)}`,
          version: null,
          wordingChanged: false,
        }
      : { kind: "not_agreed", text: "Not agreed", version: null, wordingChanged: false };
  }
  return { kind: "not_allowed", text: "Not allowed", version: null, wordingChanged: false };
}

export interface ConsentStatusLineProps {
  entry: ConsentEntry;
  history?: Consent[];
  timezone: string;
  id?: string;
  className?: string;
}

/** The state line: words, the date, and the wording version (CD-140, CD-144). Never colour alone. */
export function ConsentStatusLine({
  entry,
  history = [],
  timezone,
  id,
  className,
}: ConsentStatusLineProps) {
  const s = consentState(entry, history, timezone);
  if (!s) return null;
  const on = s.kind === "agreed" || s.kind === "allowed";
  return (
    <div id={id} data-consent-state={s.kind} className={cx("flex flex-col gap-0.5", className)}>
      <p className="flex items-center gap-1.5 text-label font-medium text-ink">
        <Icon
          name={on ? "check-circle" : "minus"}
          size={16}
          className={on ? "text-success-ink" : "text-ink-muted"}
        />
        {s.text}
      </p>
      {s.version ? (
        <p className="text-small text-ink-muted">
          Wording version {s.version}
          {s.wordingChanged
            ? `. The wording changed since then; the current version is ${entry.currentTextVersion}.`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Clinician-side consent display (CD-146): read-only text per consent with state, date and wording
 * version, and the reason when generated drafts are blocked. No switch, no button.
 */
export function ConsentSummary({
  list,
  timezone,
  headingAs: H = "h3",
}: {
  list: ConsentList;
  timezone: string;
  headingAs?: "h2" | "h3" | "h4";
}) {
  const entries = list.types.filter((t) => t.grantable);
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <H id={id} className="text-h4 font-h4 text-ink">
        Consent
      </H>
      <dl className="flex flex-col gap-3">
        {entries.map((e) => {
          const s = consentState(e, list.history, timezone);
          return (
            <div key={e.type} className="flex flex-col gap-1">
              <dt className="text-small text-ink-muted">
                {consentTitles.staff[e.type]} ({e.required ? "required" : "optional"})
              </dt>
              <dd>
                <ConsentStatusLine entry={e} history={list.history} timezone={timezone} />
                {e.type === "ai_assisted_features" && s && s.kind !== "allowed" ? (
                  <p className="mt-1 text-small text-ink">{AI_CONSENT_BLOCKED_TEXT}</p>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-small text-ink-muted">
        The patient changes the optional consent in Sharing and consent. The required consent is
        withdrawn through the clinic.
      </p>
    </section>
  );
}
