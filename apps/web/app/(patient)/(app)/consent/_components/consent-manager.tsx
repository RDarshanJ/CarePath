"use client";

import { useRef, useState } from "react";
import {
  CONSENT_TEXT_VERSIONS,
  consentListSchema,
  consentSchema,
  type Consent,
  type ConsentList,
} from "@carepath/shared/contracts";
import {
  Banner,
  Button,
  ConsentStatusLine,
  Heading,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@carepath/ui";
import { api } from "../../../../../lib/api/client";
import { ApiError } from "../../../../../lib/api/errors";
import { ConsentWording } from "../../../_components/consent-wording";
import { consentCopy, isOfferedConsent, type OfferedConsent } from "../../../_lib/consent-copy";
import { formatInstantDateTime } from "../../../_lib/format";

const AI = "ai_assisted_features" as const;

interface HistoryEvent {
  key: string;
  type: OfferedConsent;
  /** CD-144 words: Agreed, Allowed, Stopped allowing, Withdrawn. */
  result: "Agreed" | "Allowed" | "Stopped allowing" | "Withdrawn";
  at: string;
  version: string;
}

/** One line per change, newest first: a consent that was granted and later stopped gives two lines. */
function historyEvents(history: Consent[]): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  for (const h of history) {
    if (!isOfferedConsent(h.type)) continue;
    const required = h.type === "treatment_and_data_use";
    events.push({
      key: `${h.id}-on`,
      type: h.type,
      result: required ? "Agreed" : "Allowed",
      at: h.grantedAt,
      version: h.textVersion,
    });
    if (h.revokedAt)
      events.push({
        key: `${h.id}-off`,
        type: h.type,
        result: required ? "Withdrawn" : "Stopped allowing",
        at: h.revokedAt,
        version: h.textVersion,
      });
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/**
 * Sharing and consent (REQ-CON-01, CD-140, CD-141, CD-143 to CD-145). Each consent is shown in words with its
 * state line. The optional one has an explicit action, "Allow ..." or "Stop allowing ...", that takes
 * effect at once and leaves a result line and a history entry. There is no switch. The required consent
 * is withdrawn through the clinic, so that card offers a call and a message instead.
 */
export function ConsentManager({
  patientId,
  initial,
  timezone,
  clinicPhone,
}: {
  patientId: string;
  initial: ConsentList;
  timezone: string;
  clinicPhone: string | null;
}) {
  const [list, setList] = useState(initial);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wordingOpen, setWordingOpen] = useState<Record<string, boolean>>({});
  const reloadedAt = useRef<string | null>(null);

  async function change(allow: boolean) {
    const entry = list.types.find((t) => t.type === AI);
    setPending(true);
    setError(null);
    try {
      if (allow) {
        await api.post(`/patients/${patientId}/consents`, consentSchema, {
          type: AI,
          textVersion: CONSENT_TEXT_VERSIONS[AI],
        });
      } else if (entry?.active) {
        await api.post(
          `/patients/${patientId}/consents/${entry.active.id}/revoke`,
          consentSchema,
          {},
        );
      }
      const fresh = await api.get(`/patients/${patientId}/consents`, consentListSchema);
      setList(fresh);
      const latest = fresh.history.find((h) => h.type === AI);
      const at = allow ? latest?.grantedAt : latest?.revokedAt;
      reloadedAt.current = at ?? null;
      setResult(
        `${consentCopy[AI].title} ${allow ? "are now allowed" : "are no longer allowed"}.${
          at ? ` Saved ${formatInstantDateTime(at, timezone)}.` : ""
        }`,
      );
    } catch (e) {
      setResult(null);
      setError(
        e instanceof ApiError
          ? "That change was not saved, so your choice is as it was. Try again."
          : "Something went wrong and your choice is as it was. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const entries = list.types.filter((t) => t.grantable && isOfferedConsent(t.type));
  const stale = entries.find((t) => t.active && t.active.textVersion !== t.currentTextVersion);
  const events = historyEvents(list.history);
  const phoneHref = clinicPhone ? `tel:${clinicPhone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <Banner tone="error" title="Not saved" focusOnMount focusKey={error}>
          {error}
        </Banner>
      ) : null}
      {stale && isOfferedConsent(stale.type) ? (
        <Banner
          tone="info"
          title="The wording changed"
          action={
            <Button
              variant="neutral"
              onClick={() => {
                setWordingOpen((o) => ({ ...o, [stale.type]: true }));
                document
                  .getElementById(`wording-${stale.type}`)
                  ?.scrollIntoView({ block: "start" });
              }}
            >
              Read the new wording
            </Button>
          }
        >
          You agreed to {consentCopy[stale.type].title.toLowerCase()} under version{" "}
          {stale.active?.textVersion}. The current version is {stale.currentTextVersion}. Your
          earlier choice stands until you change it.
        </Banner>
      ) : null}

      <div className="flex flex-col gap-8 rounded-container border border-border bg-surface p-4 md:p-6">
        {entries.map((t, i) => {
          if (!isOfferedConsent(t.type)) return null;
          const type = t.type;
          const on = t.active !== null;
          return (
            <section
              key={type}
              aria-labelledby={`h-${type}`}
              className={i > 0 ? "border-t border-border pt-8" : undefined}
            >
              <ConsentWording
                type={type}
                headingId={`h-${type}`}
                open={wordingOpen[type] ?? false}
                onToggle={(o) => setWordingOpen((w) => ({ ...w, [type]: o }))}
              >
                <ConsentStatusLine entry={t} history={list.history} timezone={timezone} />
                {type === "treatment_and_data_use" ? (
                  <div className="flex flex-col gap-3">
                    <p className="max-w-measure text-body text-ink-muted">
                      To withdraw this, contact your clinic so your care team knows. You cannot
                      withdraw it here.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {phoneHref ? (
                        <Button variant="neutral" href={phoneHref} fullWidthOnPhone>
                          Call {clinicPhone}
                        </Button>
                      ) : null}
                      <Button variant="neutral" href="/messages" fullWidthOnPhone>
                        Message your care team
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex">
                      <Button
                        variant={on ? "neutral" : "primary"}
                        loading={pending}
                        loadingLabel="Saving"
                        onClick={() => void change(!on)}
                        fullWidthOnPhone
                      >
                        {on
                          ? "Stop allowing automated drafting tools"
                          : "Allow automated drafting tools"}
                      </Button>
                    </div>
                    <p role="status" className="min-h-6 text-body font-medium">
                      {result}
                    </p>
                  </div>
                )}
              </ConsentWording>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <Heading level={3} id="history-heading">
          When your choices changed
        </Heading>
        {events.length === 0 ? (
          <p className="text-body text-ink-muted">No choices recorded yet.</p>
        ) : (
          <>
            <ul
              aria-label="Consent history, newest first"
              className="flex flex-col divide-y divide-border border-y border-border md:hidden"
            >
              {events.map((h) => (
                <li key={h.key} className="flex flex-col gap-0.5 py-3">
                  <span className="text-body font-medium">
                    {h.result}: {consentCopy[h.type].title}
                  </span>
                  <span className="text-small text-ink-muted">
                    {formatInstantDateTime(h.at, timezone)}. Wording version {h.version}.
                  </span>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table caption="Consent history, newest first">
                <THead>
                  <Tr>
                    <Th scope="col">Choice</Th>
                    <Th scope="col">Result</Th>
                    <Th scope="col">When</Th>
                    <Th scope="col">Wording version</Th>
                  </Tr>
                </THead>
                <TBody>
                  {events.map((h) => (
                    <Tr key={h.key}>
                      <Td>{consentCopy[h.type].title}</Td>
                      <Td>{h.result}</Td>
                      <Td>{formatInstantDateTime(h.at, timezone)}</Td>
                      <Td>{h.version}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
