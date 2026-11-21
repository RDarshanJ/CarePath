"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Appointment } from "@carepath/shared/contracts";
import { Table, TBody, Td, Th, THead, Tr, EmptyState, LoadMore } from "@carepath/ui";
import { AppointmentStatusTag, VisitType, isCancelled } from "../../_components/appointments";
import { ListSkeleton, QueryError, Section } from "../../_components/common";
import { useClinician } from "../../_lib/context";
import { formatDayShort, formatTime, tzAbbreviation } from "../../_lib/format";
import { keys, reads } from "../../_lib/queries";

function AppointmentTable({
  caption,
  items,
  showCancellation,
}: {
  caption: string;
  items: Appointment[];
  showCancellation: boolean;
}) {
  const { timezone } = useClinician();
  return (
    <div className="p-3">
      <Table caption={caption}>
        <THead>
          <Tr header>
            <Th>Day</Th>
            <Th>Time</Th>
            <Th>Visit</Th>
            <Th>With</Th>
            <Th>{showCancellation ? "Reason or note" : "Reason for visit"}</Th>
            <Th>Status</Th>
          </Tr>
        </THead>
        <TBody>
          {items.map((a) => (
            <Tr key={a.id} className={isCancelled(a.status) ? "text-ink-muted" : undefined}>
              <Td>{formatDayShort(a.startsAt, timezone)}</Td>
              <Td>
                {formatTime(a.startsAt, timezone)} {tzAbbreviation(a.startsAt, timezone)}
              </Td>
              <Td>
                <VisitType type={a.type} />
              </Td>
              <Td>{a.practitioner.name.replace(/,.*$/, "")}</Td>
              <Td
                className="max-w-72 truncate"
                title={a.cancellationReason ?? a.reason ?? undefined}
              >
                {isCancelled(a.status) && a.cancellationReason
                  ? `Cancelled: ${a.cancellationReason}`
                  : (a.reason ?? <span className="text-ink-muted">None given</span>)}
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
  );
}

function AppointmentList({ patientId, when }: { patientId: string; when: "upcoming" | "past" }) {
  const { timezone } = useClinician();
  const list = useInfiniteQuery({
    queryKey: keys.appointments(patientId, when),
    queryFn: ({ pageParam }) => reads.appointments(patientId, when, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const upcoming = when === "upcoming";
  const title = upcoming ? "Upcoming visits" : "Past and cancelled visits";
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Section
      id={`appointments-${when}`}
      title={title}
      {...(list.data && !list.hasNextPage ? { count: items.length } : {})}
      description={
        upcoming
          ? `Soonest first, in clinic time (${timezone}). Visits are booked by the patient or the care coordinator.`
          : "Newest first. Includes visits that were cancelled or not attended."
      }
    >
      {list.isError ? (
        <div className="p-4">
          <QueryError error={list.error} onRetry={() => void list.refetch()} />
        </div>
      ) : !list.data ? (
        <div className="p-4">
          <ListSkeleton rows={2} label={`Loading ${title.toLowerCase()}`} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          padded
          icon="calendar"
          title={upcoming ? "No upcoming visits" : "No past visits"}
        >
          {upcoming
            ? "This patient has nothing booked. The patient or the care coordinator can book a visit."
            : "No visit has ended or been cancelled for this patient yet."}
        </EmptyState>
      ) : (
        <AppointmentTable caption={title} items={items} showCancellation={!upcoming} />
      )}
      {list.hasNextPage ? (
        <div className="border-t border-border px-4 py-2">
          <LoadMore
            label="Show more visits"
            noun="visits"
            hasMore={true}
            loading={list.isFetchingNextPage}
            shown={items.length}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </div>
      ) : null}
    </Section>
  );
}

export function AppointmentsTab({ patientId }: { patientId: string }) {
  return (
    <div className="flex flex-col gap-5">
      <AppointmentList patientId={patientId} when="upcoming" />
      <AppointmentList patientId={patientId} when="past" />
    </div>
  );
}
