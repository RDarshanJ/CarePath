"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button, Table, TBody, Td, Th, THead, TextInput, Tr, Link, EmptyState } from "@carepath/ui";
import { AppointmentStatusTag, VisitType, isCancelled } from "../_components/appointments";
import { ListSkeleton, PageHeader, QueryError, Section } from "../_components/common";
import { useClinician } from "../_lib/context";
import {
  addDays,
  formatLongDay,
  formatTime,
  isLocalDate,
  plural,
  tzAbbreviation,
} from "../_lib/format";
import { keys, reads } from "../_lib/queries";

/**
 * The practitioner's day as a list (C2 section 6.4: no grid, no drag). The day is a clinic-zone
 * calendar day from the API; the zone is named on the page (REQ-APT-03).
 */
export function Schedule() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { session, timezone } = useClinician();
  const overview = useQuery({ queryKey: keys.overview, queryFn: reads.overview });
  const today = overview.data?.today;
  const requested = params.get("date");
  const date = isLocalDate(requested) ? requested : today;
  const practitionerId = session.practitionerId;

  function go(day: string) {
    const p = new URLSearchParams(params.toString());
    if (day === today) p.delete("date");
    else p.set("date", day);
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const agenda = useQuery({
    queryKey: keys.agenda(date ?? "", practitionerId ?? ""),
    queryFn: () => reads.agenda(date!, practitionerId!),
    enabled: !!date && !!practitionerId,
    refetchInterval: 60_000,
  });

  if (!practitionerId) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Schedule" />
        <EmptyState padded icon="calendar" title="No schedule for this account">
          Your account is not linked to a practitioner profile, so there is no calendar to show.
        </EmptyState>
      </div>
    );
  }
  if (!date) return <ListSkeleton rows={6} label="Loading schedule" />;

  const zoneText = `${timezone} (${tzAbbreviation(`${date}T12:00:00Z`, timezone)})`;
  const items = agenda.data?.items ?? [];
  const live = items.filter((a) => !isCancelled(a.status));
  const cancelled = items.length - live.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Schedule"
        description={
          <>
            Your visits for one day, in start order. Times are in the clinic's time zone, {zoneText}
            .
          </>
        }
      />
      <DayStepper date={date} today={today} onGo={go} />
      <Section
        id="agenda"
        title={`${formatLongDay(date)}${date === today ? ", today" : ""}`}
        {...(agenda.data ? { count: live.length } : {})}
        description={
          agenda.data
            ? `Visits with ${agenda.data.practitioner.name}${cancelled > 0 ? `. ${plural(cancelled, "cancelled visit")} listed below.` : ""}`
            : undefined
        }
      >
        {agenda.isError ? (
          <div className="p-4">
            <QueryError error={agenda.error} onRetry={() => void agenda.refetch()} />
          </div>
        ) : !agenda.data ? (
          <div className="p-4">
            <ListSkeleton rows={4} label="Loading visits" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState padded icon="calendar" title="No visits on this day">
            Nothing is booked with you on {formatLongDay(date)}. Visits appear here as soon as a
            patient or the care coordinator books one.
          </EmptyState>
        ) : (
          <div className="p-3">
            <Table caption={`Visits on ${formatLongDay(date)}`}>
              <THead>
                <Tr header>
                  <Th>Time</Th>
                  <Th>Patient</Th>
                  <Th>Visit</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                </Tr>
              </THead>
              <TBody>
                {items.map((a) => (
                  <Tr key={a.id} className={isCancelled(a.status) ? "text-ink-muted" : undefined}>
                    <Td>
                      <span className={isCancelled(a.status) ? "line-through" : undefined}>
                        {formatTime(a.startsAt, timezone)} to {formatTime(a.endsAt, timezone)}
                      </span>
                    </Td>
                    <Td>
                      <Link
                        href={`/patients/${a.patient.id}?tab=appointments`}
                        className="font-medium"
                      >
                        {a.patient.name}
                      </Link>
                    </Td>
                    <Td>
                      <VisitType type={a.type} />
                    </Td>
                    <Td className="max-w-72 truncate" title={a.reason ?? undefined}>
                      {a.reason ?? <span className="text-ink-muted">None given</span>}
                    </Td>
                    <Td>
                      <AppointmentStatusTag appointment={a} />
                      {a.status === "booked" ? <span className="sr-only">Booked</span> : null}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Section>
    </div>
  );
}

function DayStepper({
  date,
  today,
  onGo,
}: {
  date: string;
  today: string | undefined;
  onGo: (day: string) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <div role="group" aria-label="Choose a day" className="flex flex-wrap items-end gap-2">
      <Button variant="neutral" onClick={() => onGo(addDays(date, -1))}>
        Previous day
      </Button>
      <Button
        variant="neutral"
        disabled={!today || date === today}
        onClick={() => today && onGo(today)}
      >
        Today
      </Button>
      <Button variant="neutral" onClick={() => onGo(addDays(date, 1))}>
        Next day
      </Button>
      <div className="ml-2 flex flex-col gap-1.5">
        <label htmlFor="agenda-date" className="text-label font-medium text-ink">
          Go to date
        </label>
        <TextInput
          id="agenda-date"
          type="date"
          className="w-44"
          value={typed ?? date}
          onChange={(e) => {
            setTyped(e.target.value);
            if (isLocalDate(e.target.value)) {
              onGo(e.target.value);
              setTyped(null);
            }
          }}
        />
      </div>
    </div>
  );
}
