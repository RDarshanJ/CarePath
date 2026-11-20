"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClinicianOverview } from "@carepath/shared/contracts";
import { Button, StatusChip, Tag, useToast } from "@carepath/ui";
import {
  errorText,
  AppLink,
  Empty,
  ListSkeleton,
  PageHeader,
  QueryError,
  Section,
} from "../_components/common";
import { useClinician } from "../_lib/context";
import {
  formatAgeHours,
  formatDateTime,
  formatLocalDate,
  formatTime,
  fullName,
  localDayOf,
  plural,
  tzAbbreviation,
} from "../_lib/format";
import { keys, qs, reads, writes } from "../_lib/queries";

const COLLAPSED_ROWS = 6;

/** A list that shows its first rows and says how many there are. The count always equals the list length. */
function WorkList<T>({
  items,
  render,
  label,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, COLLAPSED_ROWS);
  return (
    <>
      <ul className="divide-y divide-border">{shown.map(render)}</ul>
      {items.length > COLLAPSED_ROWS ? (
        <div className="border-t border-border px-4 py-2">
          <Button variant="quiet" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? `Show first ${COLLAPSED_ROWS} ${label}` : `Show all ${items.length} ${label}`}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function patientHref(id: string, query = "") {
  return `/patients/${id}${query}`;
}

export function Overview() {
  const { timezone, session, can } = useClinician();
  const overview = useQuery({ queryKey: keys.overview, queryFn: reads.overview });

  if (overview.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Overview" />
        <QueryError error={overview.error} onRetry={() => void overview.refetch()} />
      </div>
    );
  }
  if (!overview.data) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Overview" />
        <ListSkeleton rows={6} label="Loading overview" />
      </div>
    );
  }
  const data = overview.data;
  const first = session.user.displayName.split(" ")[0] ?? session.user.displayName;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Overview"
        description={
          <>
            {first}, you have {plural(data.caseloadSize, "patient")} on your caseload. Lists below
            are as of {formatTime(data.generatedAt, timezone)}{" "}
            {tzAbbreviation(data.generatedAt, timezone)} on {formatLocalDate(data.today, true)}.
          </>
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => void overview.refetch()}>
            Refresh lists
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-3">
          <OpenTasks data={data} />
          <UnreviewedCheckIns data={data} canReview={can("clinical.write")} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
          <VisitsToday today={data.today} />
          <MissedActivity data={data} />
          <PlanUpdates data={data} />
        </div>
      </div>
    </div>
  );
}

function OpenTasks({ data }: { data: ClinicianOverview }) {
  const { timezone } = useClinician();
  const list = data.openTasks;
  return (
    <Section
      id="tasks"
      title="Review queue"
      count={list.count}
      description="Open and in-review tasks across the clinic, highest priority first. Each one is created by a clinic rule, and you decide what it needs."
      actions={<AppLink href="/review-queue">Open the clinic review queue</AppLink>}
    >
      {list.items.length === 0 ? (
        <Empty icon="clipboard" title="Nothing needs attention">
          No open review tasks in the clinic. Checked at {formatTime(data.generatedAt, timezone)}.
        </Empty>
      ) : (
        <WorkList
          items={list.items}
          label="tasks"
          render={(t) => (
            <li key={t.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-label font-medium text-ink">
                  <AppLink href={`/review-queue?task=${t.id}`}>{fullName(t.patient)}</AppLink>{" "}
                  <span className="font-normal text-ink-muted">{t.rule.name}</span>
                </p>
                <p className="text-small text-ink-muted">{t.explanation}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-small text-ink-muted">
                {t.kind === "administrative" ? <Tag>Administrative</Tag> : null}
                {t.status === "in_review" ? (
                  <StatusChip tone="info" icon="clock">
                    In review
                  </StatusChip>
                ) : (
                  <StatusChip tone="warning">Open</StatusChip>
                )}
                <span className="tabular-nums">{formatAgeHours(t.ageHours)} old</span>
              </div>
            </li>
          )}
        />
      )}
    </Section>
  );
}

function UnreviewedCheckIns({ data, canReview }: { data: ClinicianOverview; canReview: boolean }) {
  const { timezone } = useClinician();
  const qc = useQueryClient();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const review = useMutation({
    mutationFn: ({ patientId, checkInId }: { patientId: string; checkInId: string }) =>
      writes.reviewCheckIn(patientId, checkInId),
    onSuccess: () => {
      toast({ tone: "success", title: "Check-in marked reviewed" });
      void qc.invalidateQueries({ queryKey: keys.overview });
    },
    onError: (e) => {
      const t = errorText(e);
      toast({ tone: "error", title: t.title, description: t.body });
    },
    onSettled: () => setPendingId(null),
  });
  const list = data.unreviewedCheckIns;
  return (
    <Section
      id="checkins"
      title="Check-ins not yet reviewed"
      count={list.count}
      description="Patient-reported check-ins, oldest first. Marking one reviewed records that you read it."
    >
      {list.items.length === 0 ? (
        <Empty icon="check-circle" title="Every check-in has been reviewed">
          New check-ins from your patients appear here until someone on the care team reviews them.
        </Empty>
      ) : (
        <WorkList
          items={list.items}
          label="check-ins"
          render={(c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-label font-medium">
                  <AppLink href={patientHref(c.patient.id, `?tab=check-ins&checkIn=${c.id}`)}>
                    {fullName(c.patient)}
                  </AppLink>
                </p>
                <p className="text-small text-ink-muted tabular-nums">
                  Pain {c.painScore} of 10 (patient-reported), submitted{" "}
                  {formatDateTime(c.submittedAt, timezone)}
                </p>
              </div>
              {canReview ? (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label={`Mark reviewed: ${fullName(c.patient)}, check-in from ${formatDateTime(c.submittedAt, timezone)}`}
                  loading={pendingId === c.id}
                  loadingLabel="Marking"
                  onClick={() => {
                    setPendingId(c.id);
                    review.mutate({ patientId: c.patient.id, checkInId: c.id });
                  }}
                >
                  Mark reviewed
                </Button>
              ) : null}
            </li>
          )}
        />
      )}
    </Section>
  );
}

/** Visits today come from the patient directory (next visit on today's date in the clinic zone). */
function VisitsToday({ today }: { today: string }) {
  const { timezone, session } = useClinician();
  const query = qs({
    clinicianId: session.practitionerId,
    hasUpcomingAppointment: "true",
    sort: "name",
    limit: 100,
  });
  const visits = useQuery({
    queryKey: keys.directory(`visits-today${query}`),
    queryFn: () => reads.directory(query),
  });
  const rows = (visits.data?.items ?? []).flatMap((r) =>
    r.view === "clinical" &&
    r.nextAppointmentAt &&
    localDayOf(r.nextAppointmentAt, timezone) === today
      ? [{ ...r, at: r.nextAppointmentAt }]
      : [],
  );
  rows.sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Section id="visits" title="Visits today" {...(visits.data ? { count: rows.length } : {})}>
      {visits.isError ? (
        <div className="p-4">
          <QueryError error={visits.error} onRetry={() => void visits.refetch()} />
        </div>
      ) : !visits.data ? (
        <div className="p-4">
          <ListSkeleton rows={2} label="Loading visits" />
        </div>
      ) : rows.length === 0 ? (
        <Empty icon="calendar" title="No visits today">
          None of your patients has a visit booked for {formatLocalDate(today)}.
        </Empty>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <AppLink href={patientHref(r.id)} className="text-label font-medium">
                {fullName(r)}
              </AppLink>
              <span className="text-small text-ink-muted tabular-nums">
                {formatTime(r.at, timezone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function MissedActivity({ data }: { data: ClinicianOverview }) {
  const list = data.missedActivity;
  return (
    <Section
      id="missed"
      title="Missed activity"
      count={list.count}
      description="Active patients with fewer completed sessions than the plan assigned over the last 7 days."
    >
      {list.items.length === 0 ? (
        <Empty icon="activity" title="No missed sessions">
          Every active patient on your caseload completed the sessions their plan assigned.
        </Empty>
      ) : (
        <WorkList
          items={list.items}
          label="patients"
          render={(m) => (
            <li key={m.patient.id} className="px-4 py-2.5">
              <p className="text-label font-medium">
                <AppLink href={patientHref(m.patient.id, "?tab=activity")}>
                  {fullName(m.patient)}
                </AppLink>
              </p>
              <p className="text-small text-ink-muted tabular-nums">
                Completed {m.completedSessions} of {m.assignedSessions} assigned sessions,{" "}
                {formatLocalDate(m.windowStart)} to {formatLocalDate(m.windowEnd)}
              </p>
            </li>
          )}
        />
      )}
    </Section>
  );
}

function PlanUpdates({ data }: { data: ClinicianOverview }) {
  const { timezone } = useClinician();
  const list = data.recentPublishes;
  return (
    <Section
      id="plans"
      title="Plan updates"
      count={list.count}
      description="Versions published in the last 7 days."
    >
      {list.items.length === 0 ? (
        <Empty icon="file" title="No plan versions published this week">
          Publishing a new version from a patient's care plan lists it here for 7 days.
        </Empty>
      ) : (
        <WorkList
          items={list.items}
          label="updates"
          render={(p) => (
            <li key={p.versionId} className="px-4 py-2.5">
              <p className="text-label font-medium">
                <AppLink href={patientHref(p.patient.id, "?tab=plan")}>
                  {fullName(p.patient)}
                </AppLink>{" "}
                <span className="font-normal text-ink-muted">version {p.versionNumber}</span>
              </p>
              <p className="text-small text-ink-muted">
                Published by {p.publishedBy.name}, {formatDateTime(p.publishedAt, timezone)}
              </p>
            </li>
          )}
        />
      )}
    </Section>
  );
}
