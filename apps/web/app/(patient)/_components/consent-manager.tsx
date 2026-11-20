"use client";

import { useState } from "react";
import {
  CONSENT_TEXT_VERSIONS,
  consentListSchema,
  consentSchema,
  type ConsentList,
} from "@carepath/shared/contracts";
import { Banner, Heading, Switch, Table, TBody, Td, Th, THead, Tr } from "@carepath/ui";
import { api } from "../../../lib/api/client";
import { ApiError } from "../../../lib/api/errors";
import { consentCopy } from "../_lib/consent-copy";
import { formatInstantDateTime } from "../_lib/format";

const typeTitle = (t: keyof typeof consentCopy) => consentCopy[t].title;

/** Sharing and consent (REQ-CON-01): each choice, when it changed, and how to change it. Only the optional choice is a switch here. */
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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setList(await api.get(`/patients/${patientId}/consents`, consentListSchema));
  }

  async function setAi(on: boolean) {
    const entry = list.types.find((t) => t.type === "ai_assisted_features");
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      if (on) {
        await api.post(`/patients/${patientId}/consents`, consentSchema, {
          type: "ai_assisted_features",
          textVersion: CONSENT_TEXT_VERSIONS.ai_assisted_features,
        });
      } else if (entry?.active) {
        await api.post(
          `/patients/${patientId}/consents/${entry.active.id}/revoke`,
          consentSchema,
          {},
        );
      }
      await reload();
      setStatus(
        on ? "Automated drafting tools are now on." : "Automated drafting tools are now off.",
      );
    } catch (e) {
      setError(
        e instanceof ApiError
          ? "That change was not saved, so your choice is as it was. Try again."
          : "Something went wrong and your choice is as it was. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {error ? (
        <Banner tone="error" title="Not saved">
          {error}
        </Banner>
      ) : null}
      <ul className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface">
        {list.types.map((t) => {
          const copy = consentCopy[t.type];
          const on = t.active !== null;
          return (
            <li key={t.type} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Heading level={4} as="h2">
                  {copy.title}
                </Heading>
                <span className="text-small font-medium text-ink-muted">{copy.requirement}</span>
              </div>
              <p className="max-w-measure text-body">{copy.summary}</p>
              <ul className="list-disc pl-5 text-small text-ink-muted">
                {copy.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              {t.type === "treatment_and_data_use" ? (
                <p className="text-body font-medium">
                  {on
                    ? `On. Agreed ${formatInstantDateTime(t.active!.grantedAt, timezone)}.`
                    : "Not agreed."}{" "}
                  <span className="font-normal text-ink-muted">
                    To withdraw, contact your clinic{clinicPhone ? ` on ${clinicPhone}` : ""}.
                  </span>
                </p>
              ) : t.grantable ? (
                <div>
                  <Switch
                    label="Allow automated drafting tools"
                    hint={
                      on
                        ? `On since ${formatInstantDateTime(t.active!.grantedAt, timezone)}. Switch off to stop it.`
                        : "Off. Switch on to allow it."
                    }
                    checked={on}
                    disabled={pending}
                    onCheckedChange={(v) => void setAi(v)}
                    id="consent-ai"
                  />
                </div>
              ) : (
                <p className="text-body font-medium">Off. Not available yet.</p>
              )}
            </li>
          );
        })}
      </ul>
      <p role="status" className="min-h-6 text-body font-medium">
        {status}
      </p>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <Heading level={3} id="history-heading">
          When your choices changed
        </Heading>
        {list.history.length === 0 ? (
          <p className="text-body text-ink-muted">No choices recorded yet.</p>
        ) : (
          <Table caption="Consent history, newest first">
            <THead>
              <Tr>
                <Th scope="col">Choice</Th>
                <Th scope="col">Result</Th>
                <Th scope="col">When</Th>
              </Tr>
            </THead>
            <TBody>
              {list.history.map((h) => (
                <Tr key={h.id}>
                  <Td>{typeTitle(h.type)}</Td>
                  <Td>{h.revokedAt ? "Turned off" : "Agreed"}</Td>
                  <Td>{formatInstantDateTime(h.revokedAt ?? h.grantedAt, timezone)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}
