"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { checkInReviewLabel, ofTotal, sessionStatusLabels } from "@carepath/shared";
import type { CheckIn, ReviewTask, TimelineItem } from "@carepath/shared/contracts";
import {
  Button,
  Dialog,
  DrawerContent,
  Progress,
  StatusChip,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tag,
  Tr,
  useToast,
} from "@carepath/ui";
import { ApiError } from "../../../../lib/api/errors";
import {
  AppLink,
  Empty,
  ListSkeleton,
  PainText,
  QueryError,
  ReviewedChip,
  Section,
  NOT_ON_CARE_TEAM_REASON,
  errorText,
  taskStatusText,
} from "../../_components/common";
import { IntakeSection } from "../../_components/intake";
import { PlanView } from "../../_components/plan-view";
import { useClinician } from "../../_lib/context";
import {
  formatAgeHours,
  formatDate,
  formatDateTime,
  formatLocalDate,
  plural,
} from "../../_lib/format";
import { keys, reads, writes } from "../../_lib/queries";

function usePaged<T>(
  key: QueryKey,
  fetcher: (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>,
) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetcher(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

function LoadMore({
  hasNext,
  loading,
  onClick,
  what,
}: {
  hasNext: boolean;
  loading: boolean;
  onClick: () => void;
  what: string;
}) {
  if (!hasNext) return null;
  return (
    <div className="border-t border-border px-4 py-2">
      <Button
        variant="secondary"
        size="sm"
        loading={loading}
        loadingLabel="Loading"
        onClick={onClick}
      >
        Load more {what}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

export function OverviewTab({ patientId }: { patientId: string }) {
  const { timezone } = useClinician();
  const plan = useQuery({ queryKey: keys.plan(patientId), queryFn: () => reads.plan(patientId) });
  const progress = useQuery({
    queryKey: keys.progress(patientId),
    queryFn: () => reads.progress(patientId),
  });
  const checkIns = useQuery({
    queryKey: [...keys.checkIns(patientId), "latest"],
    queryFn: () => reads.checkIns(patientId),
  });
  const tasks = useQuery({
    queryKey: keys.patientTasks(patientId),
    queryFn: () => reads.patientTasks(patientId),
  });
  const timeline = usePaged<TimelineItem>(keys.timeline(patientId), (c) =>
    reads.timeline(patientId, c),
  );

  const week = progress.data?.weeks.at(-1);
  const latest = checkIns.data?.items[0];
  const openTasks = (tasks.data?.items ?? []).filter(
    (t) => t.status === "open" || t.status === "in_review",
  );

  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label="Summary"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-container border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
      >
        <Fact title="Care plan" loading={plan.isPending} error={plan.error}>
          {plan.data?.plan ? (
            <>
              <p className="text-body font-medium text-ink">{plan.data.plan.title}</p>
              <p className="text-small text-ink-muted">
                Version {plan.data.plan.version.number},{" "}
                {plural(plan.data.plan.items.length, "exercise")}
                {plan.data.plan.version.publishedAt
                  ? `, published ${formatDate(plan.data.plan.version.publishedAt, timezone)}`
                  : ""}
              </p>
              <AppLink href={`/patients/${patientId}?tab=plan`} className="text-small">
                See the plan
              </AppLink>
            </>
          ) : (
            <p className="text-body text-ink-muted">No plan has been published yet.</p>
          )}
        </Fact>
        <Fact title="This week" loading={progress.isPending} error={progress.error}>
          {week ? (
            <>
              <Progress
                label="Sessions completed"
                value={week.completedSessions}
                max={Math.max(week.assignedSessions, 1)}
                valueText={`${week.completedSessions} of ${week.assignedSessions} assigned`}
              />
              <p className="text-small text-ink-muted">
                Week of {formatLocalDate(week.weekStart)}.{" "}
                {week.stoppedSessions > 0
                  ? `${plural(week.stoppedSessions, "session")} stopped for discomfort.`
                  : ""}
              </p>
            </>
          ) : null}
        </Fact>
        <Fact title="Latest check-in" loading={checkIns.isPending} error={checkIns.error}>
          {latest ? (
            <>
              <p className="text-body font-medium text-ink">
                <PainText score={latest.painScore} />
              </p>
              <p className="text-small text-ink-muted">
                Submitted {formatDateTime(latest.submittedAt, timezone)}.{" "}
                {checkInReviewLabel(latest.reviewedAt)}.
              </p>
              <AppLink
                href={`/patients/${patientId}?tab=check-ins&checkIn=${latest.id}`}
                className="text-small"
              >
                Open check-in
              </AppLink>
            </>
          ) : (
            <p className="text-body text-ink-muted">No check-ins yet.</p>
          )}
        </Fact>
        <Fact title="Open review tasks" loading={tasks.isPending} error={tasks.error}>
          {openTasks.length === 0 ? (
            <p className="text-body text-ink-muted">Nothing needs attention for this patient.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {openTasks.slice(0, 3).map((t) => (
                <li key={t.id} className="text-small">
                  <AppLink href={`/review-queue?task=${t.id}`}>{t.rule.name}</AppLink>
                  <span className="text-ink-muted">, {formatAgeHours(t.ageHours)} old</span>
                </li>
              ))}
              {openTasks.length > 3 ? (
                <li className="text-small text-ink-muted">
                  and {openTasks.length - 3} more in the review queue
                </li>
              ) : null}
            </ul>
          )}
        </Fact>
      </div>

      <IntakeSection patientId={patientId} />

      <Section
        id="timeline"
        title="Timeline"
        description="Plan versions, sessions, check-ins and review tasks, newest first. Built from the record's own rows."
      >
        {timeline.isError ? (
          <div className="p-4">
            <QueryError error={timeline.error} onRetry={() => void timeline.refetch()} />
          </div>
        ) : !timeline.data ? (
          <div className="p-4">
            <ListSkeleton rows={5} label="Loading timeline" />
          </div>
        ) : (
          <>
            <ol className="flex flex-col">
              {timeline.data.pages
                .flatMap((p) => p.items)
                .map((item) => (
                  <TimelineRow key={`${item.kind}-${item.id}`} item={item} patientId={patientId} />
                ))}
            </ol>
            {timeline.data.pages[0]?.items.length === 0 ? (
              <Empty icon="clock" title="Nothing on the timeline yet">
                Published plans, sessions and check-ins appear here as they happen.
              </Empty>
            ) : null}
            <LoadMore
              hasNext={!!timeline.hasNextPage}
              loading={timeline.isFetchingNextPage}
              onClick={() => void timeline.fetchNextPage()}
              what="events"
            />
          </>
        )}
      </Section>
    </div>
  );
}

function Fact({
  title,
  loading,
  error,
  children,
}: {
  title: string;
  loading: boolean;
  error: unknown;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-3">
      <h2 className="text-label font-semibold text-ink-muted">{title}</h2>
      {error ? (
        <QueryError error={error} />
      ) : loading ? (
        <ListSkeleton rows={2} label={`Loading ${title}`} />
      ) : (
        children
      )}
    </section>
  );
}

const sessionStatusText: Record<string, string> = Object.fromEntries(
  Object.entries(sessionStatusLabels).map(([k, v]) => [k, v.label]),
);

function TimelineRow({ item, patientId }: { item: TimelineItem; patientId: string }) {
  const { timezone } = useClinician();
  let label: string;
  let body: React.ReactNode;
  let chip: React.ReactNode = null;
  switch (item.kind) {
    case "plan_version":
      label = "Plan version";
      body = (
        <>
          <AppLink href={`/patients/${patientId}?tab=plan`}>
            Version {item.versionNumber} published
          </AppLink>{" "}
          by {item.publishedBy.name}
          {item.changeNoteForPatient ? (
            <span className="block text-small text-ink-muted">
              Note to patient: {item.changeNoteForPatient}
            </span>
          ) : null}
        </>
      );
      break;
    case "session":
      label = "Session";
      body = (
        <>
          <AppLink href={`/patients/${patientId}?tab=activity`}>
            Session on version {item.versionNumber}
          </AppLink>
          : {item.completedActivities} of {item.totalActivities} exercises done
          {item.skippedActivities > 0 ? `, ${item.skippedActivities} skipped` : ""}
        </>
      );
      chip = item.stoppedForDiscomfort ? (
        <StatusChip tone="warning">{sessionStatusLabels.stopped_discomfort.label}</StatusChip>
      ) : (
        <Tag>{sessionStatusText[item.status] ?? item.status}</Tag>
      );
      break;
    case "check_in":
      label = "Check-in";
      body = (
        <AppLink href={`/patients/${patientId}?tab=check-ins&checkIn=${item.id}`}>
          <PainText score={item.painScore} />
        </AppLink>
      );
      chip = <ReviewedChip reviewedAt={item.reviewedAt} />;
      break;
    case "review_task":
      label = "Review task";
      body = <AppLink href={`/review-queue?task=${item.id}`}>{item.explanation}</AppLink>;
      chip = <Tag>{taskStatusText[item.status] ?? "Unknown"}</Tag>;
      break;
  }
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0">
      <time dateTime={item.at} className="w-36 shrink-0 text-small text-ink-muted tabular-nums">
        {formatDateTime(item.at, timezone)}
      </time>
      <span className="w-24 shrink-0 text-small font-medium text-ink-muted">{label}</span>
      <div className="min-w-64 flex-1 text-body text-ink">{body}</div>
      <div>{chip}</div>
    </li>
  );
}

/* ---------------------------------------------------------------------- plan */

export function PlanTab({ patientId }: { patientId: string }) {
  const { timezone, can } = useClinician();
  const plan = useQuery({ queryKey: keys.plan(patientId), queryFn: () => reads.plan(patientId) });
  const draft = useQuery({
    queryKey: keys.draft(patientId),
    queryFn: () => reads.draft(patientId),
    retry: false,
  });
  const versions = useQuery({
    queryKey: keys.versions(patientId),
    queryFn: () => reads.versions(patientId),
  });
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  if (plan.isError) return <QueryError error={plan.error} onRetry={() => void plan.refetch()} />;
  if (!plan.data) return <ListSkeleton rows={6} label="Loading care plan" />;

  return (
    <div className="flex flex-col gap-5">
      {draft.data ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-container border border-border bg-info-bg p-3 text-info-ink">
          <p className="text-body">
            An unpublished draft was saved {formatDateTime(draft.data.updatedAt, timezone)} by{" "}
            {draft.data.author.name}. The patient does not see it.
          </p>
          {can("clinical.write") ? (
            <Button variant="secondary" size="sm" asChild>
              <NextLink href={`/patients/${patientId}/plan`}>Continue editing the draft</NextLink>
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Section
          className="xl:col-span-3"
          id="current-plan"
          title="Current plan"
          description="What the patient sees today."
          actions={
            can("clinical.write") ? (
              <Button variant="secondary" size="sm" asChild>
                <NextLink href={`/patients/${patientId}/plan`}>
                  {plan.data.plan ? "Edit plan" : "Create plan"}
                </NextLink>
              </Button>
            ) : undefined
          }
        >
          <div className="p-4">
            {plan.data.plan ? (
              <PlanView plan={plan.data.plan} />
            ) : (
              <Empty icon="file" title="No care plan yet">
                This patient has no published plan. Build one from the exercise library; the patient
                sees it once you publish.
              </Empty>
            )}
          </div>
        </Section>

        <Section
          className="xl:col-span-2"
          id="versions"
          title="Version history"
          {...(versions.data ? { count: versions.data.items.length } : {})}
          description="Published versions cannot be edited. A change is a new version."
        >
          {versions.isError ? (
            <div className="p-4">
              <QueryError error={versions.error} onRetry={() => void versions.refetch()} />
            </div>
          ) : !versions.data ? (
            <div className="p-4">
              <ListSkeleton rows={3} label="Loading versions" />
            </div>
          ) : versions.data.items.length === 0 ? (
            <Empty icon="file" title="No versions yet">
              The first published version appears here.
            </Empty>
          ) : (
            <VersionList items={versions.data.items} onOpen={setOpenVersion} />
          )}
        </Section>
      </div>

      <VersionDrawer
        patientId={patientId}
        versionId={openVersion}
        onClose={() => setOpenVersion(null)}
      />
    </div>
  );
}

export function VersionList({
  items,
  onOpen,
}: {
  items: {
    id: string;
    number: number;
    publishedAt: string;
    publishedBy: { name: string };
    changeNoteForPatient: string | null;
    isCurrent: boolean;
  }[];
  onOpen: (id: string) => void;
}) {
  const { timezone } = useClinician();
  return (
    <ul className="divide-y divide-border">
      {items.map((v) => (
        <li key={v.id} className="flex flex-col gap-1 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-label font-semibold text-ink">
              Version {v.number}{" "}
              {v.isCurrent ? <StatusChip tone="success">Current</StatusChip> : null}
            </p>
            <Button
              variant="quiet"
              size="sm"
              aria-label={`View version ${v.number}`}
              onClick={() => onOpen(v.id)}
            >
              View
            </Button>
          </div>
          <p className="text-small text-ink-muted">
            {formatDateTime(v.publishedAt, timezone)} by {v.publishedBy.name}
          </p>
          {v.changeNoteForPatient ? (
            <p className="max-w-prose text-small text-ink">
              Note to patient: {v.changeNoteForPatient}
            </p>
          ) : (
            <p className="text-small text-ink-muted">No note to the patient.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function VersionDrawer({
  patientId,
  versionId,
  onClose,
}: {
  patientId: string;
  versionId: string | null;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: keys.version(patientId, versionId ?? "none"),
    queryFn: () => reads.version(patientId, versionId ?? ""),
    enabled: versionId !== null,
  });
  return (
    <Dialog open={versionId !== null} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent
        title={detail.data ? `Version ${detail.data.version.number}` : "Plan version"}
        description="Read only. Published versions are never edited."
        className="max-w-2xl"
      >
        {detail.isError ? (
          <QueryError error={detail.error} onRetry={() => void detail.refetch()} />
        ) : detail.data ? (
          <PlanView plan={detail.data} />
        ) : (
          <ListSkeleton rows={6} label="Loading version" />
        )}
      </DrawerContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ activity */

export function ActivityTab({ patientId }: { patientId: string }) {
  const { timezone } = useClinician();
  const progress = useQuery({
    queryKey: keys.progress(patientId),
    queryFn: () => reads.progress(patientId),
  });
  if (progress.isError)
    return <QueryError error={progress.error} onRetry={() => void progress.refetch()} />;
  if (!progress.data) return <ListSkeleton rows={6} label="Loading activity" />;
  const d = progress.data;
  const weeks = [...d.weeks].reverse();
  const pain = [...d.pain.points].reverse();
  return (
    <div className="flex flex-col gap-5">
      <Section
        id="weekly"
        title="Weekly sessions"
        description="Assigned by the plan version in force each day, against sessions the patient completed. Counts come from the same rows the patient sees."
      >
        <div className="p-3">
          <Table caption="Weekly sessions, assigned and completed">
            <THead>
              <tr>
                <Th>Week of</Th>
                <Th numeric>Assigned</Th>
                <Th numeric>Completed</Th>
                <Th numeric>{sessionStatusLabels.stopped_discomfort.label}</Th>
                <Th numeric>Exercises done</Th>
                <Th numeric>Exercises skipped</Th>
              </tr>
            </THead>
            <TBody>
              {weeks.map((w) => (
                <Tr key={w.weekStart}>
                  <Td>
                    {formatLocalDate(w.weekStart)} to {formatLocalDate(w.weekEnd)}
                  </Td>
                  <Td numeric>{w.assignedSessions}</Td>
                  <Td numeric>{w.completedSessions}</Td>
                  <Td numeric>{w.stoppedSessions}</Td>
                  <Td numeric>{w.completedActivities}</Td>
                  <Td numeric>{w.skippedActivities}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Section id="sessions" title="Sessions" count={d.sessions.length}>
          <div className="p-3">
            {d.sessions.length === 0 ? (
              <Empty icon="activity" title="No sessions yet">
                Sessions the patient starts from Today appear here.
              </Empty>
            ) : (
              <Table caption="Sessions in the last weeks">
                <THead>
                  <tr>
                    <Th>Started</Th>
                    <Th>Outcome</Th>
                    <Th numeric>Plan</Th>
                    <Th numeric>Done</Th>
                    <Th numeric>Skipped</Th>
                  </tr>
                </THead>
                <TBody>
                  {[...d.sessions].reverse().map((s) => (
                    <Tr key={s.id}>
                      <Td>{formatDateTime(s.startedAt, timezone)}</Td>
                      <Td>
                        {s.status === "stopped_discomfort" ? (
                          <StatusChip tone="warning">
                            {sessionStatusLabels.stopped_discomfort.label}
                          </StatusChip>
                        ) : (
                          <Tag>{sessionStatusText[s.status] ?? s.status}</Tag>
                        )}
                      </Td>
                      <Td numeric>v{s.versionNumber}</Td>
                      <Td numeric>{s.completedActivities}</Td>
                      <Td numeric>{s.skippedActivities}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </Section>

        <Section
          id="pain"
          title="Patient-reported pain"
          description="Scale 0 to 10, as the patient entered it. Shown as a table so every value is readable."
        >
          <div className="p-3">
            {pain.length === 0 ? (
              <Empty icon="activity" title="No pain reports yet">
                Pain the patient reports in a check-in appears here.
              </Empty>
            ) : (
              <Table caption="Patient-reported pain, 0 to 10">
                <THead>
                  <tr>
                    <Th>Reported</Th>
                    <Th numeric>Pain (0 to 10)</Th>
                  </tr>
                </THead>
                <TBody>
                  {pain.map((p) => (
                    <Tr key={p.checkInId}>
                      <Td>{formatDateTime(p.submittedAt, timezone)}</Td>
                      <Td numeric>{p.painScore}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </Section>
      </div>

      {d.goals.length > 0 ? (
        <Section id="goals" title="Goals in the current plan" count={d.goals.length}>
          <ul className="divide-y divide-border">
            {d.goals.map((g, i) => (
              <li key={g.id ?? i} className="px-4 py-2.5 text-body">
                {g.description}
                <span className="text-ink-muted">
                  {g.targetValue !== null
                    ? ` (target ${g.targetValue}${g.targetUnit ? ` ${g.targetUnit}` : ""}`
                    : " ("}
                  {g.dueDate
                    ? `${g.targetValue !== null ? ", " : ""}by ${formatLocalDate(g.dueDate, true)}`
                    : ""}
                  {")"}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- check-ins */

const difficultyText = {
  easier: "Easier than expected",
  as_expected: "As expected",
  harder: "Harder than expected",
} as const;

export function CheckInsTab({
  patientId,
  highlight,
}: {
  patientId: string;
  highlight: string | null;
}) {
  const { timezone, can } = useClinician();
  const qc = useQueryClient();
  const toast = useToast();
  const list = usePaged<CheckIn>(keys.checkIns(patientId), (c) => reads.checkIns(patientId, c));
  const header = useQuery({
    queryKey: keys.header(patientId),
    queryFn: () => reads.header(patientId),
  });
  // CR-2: reviewing a check-in is a clinical write, so it needs care-team membership.
  const notOnTeam = header.data?.onCareTeam === false;
  const review = useMutation({
    mutationFn: (checkInId: string) => writes.reviewCheckIn(patientId, checkInId),
    onSuccess: () => {
      toast({ tone: "success", title: "Check-in marked reviewed" });
      void qc.invalidateQueries({ queryKey: ["clinician"] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "already_exists") {
        toast({
          tone: "info",
          title: "Already reviewed",
          description: "Someone on the care team reviewed it first.",
        });
        void qc.invalidateQueries({ queryKey: keys.checkIns(patientId) });
        return;
      }
      const t = errorText(e);
      toast({ tone: "error", title: t.title, description: t.body });
    },
  });
  const rowRef = useRef<HTMLTableRowElement | null>(null);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const found = highlight !== null && items.some((c) => c.id === highlight);
  useEffect(() => {
    if (found) rowRef.current?.scrollIntoView({ block: "center" });
  }, [found]);
  // The linked check-in may be on a later page; keep loading until it is found.
  useEffect(() => {
    if (highlight && !found && list.hasNextPage && !list.isFetchingNextPage)
      void list.fetchNextPage();
  }, [highlight, found, list]);

  if (list.isError) return <QueryError error={list.error} onRetry={() => void list.refetch()} />;
  if (!list.data) return <ListSkeleton rows={5} label="Loading check-ins" />;

  return (
    <Section
      id="check-ins"
      title="Check-ins"
      description="Reported by the patient after a session or on their own. Pain is on a scale of 0 to 10."
    >
      {items.length === 0 ? (
        <Empty icon="clipboard" title="No check-ins yet">
          Check-ins appear here after the patient submits one from Today.
        </Empty>
      ) : (
        <div className="p-3">
          {notOnTeam ? (
            <p id="check-in-team-reason" className="mb-2 text-small text-ink-muted">
              Marking a check-in reviewed is unavailable. {NOT_ON_CARE_TEAM_REASON}
            </p>
          ) : null}
          <Table caption="Check-ins, newest first">
            <THead>
              <tr>
                <Th>Submitted</Th>
                <Th numeric>Pain (patient-reported)</Th>
                <Th>Difficulty</Th>
                <Th>Notes</Th>
                <Th>Review</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((c) => (
                <Tr
                  key={c.id}
                  selected={c.id === highlight}
                  {...(c.id === highlight ? { ref: rowRef as never } : {})}
                  id={`check-in-${c.id}`}
                >
                  <Td>{formatDateTime(c.submittedAt, timezone)}</Td>
                  <Td numeric>{ofTotal(c.painScore, 10)}</Td>
                  <Td>
                    {c.difficulty ? (
                      difficultyText[c.difficulty]
                    ) : (
                      <span className="text-ink-muted">Not given</span>
                    )}
                  </Td>
                  <Td className="max-w-md truncate whitespace-normal">
                    {c.notes ?? <span className="text-ink-muted">No note</span>}
                  </Td>
                  <Td>
                    {c.reviewedAt ? (
                      <span className="flex items-center gap-2">
                        <ReviewedChip reviewedAt={c.reviewedAt} />
                        <span className="text-small text-ink-muted">
                          {c.reviewedBy?.name.replace(/,.*$/, "")},{" "}
                          {formatDate(c.reviewedAt, timezone)}
                        </span>
                      </span>
                    ) : can("clinical.write") ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`Mark reviewed: check-in from ${formatDateTime(c.submittedAt, timezone)}`}
                        loading={review.isPending && review.variables === c.id}
                        loadingLabel="Marking"
                        disabled={notOnTeam}
                        {...(notOnTeam ? { "aria-describedby": "check-in-team-reason" } : {})}
                        onClick={() => review.mutate(c.id)}
                      >
                        Mark reviewed
                      </Button>
                    ) : (
                      <ReviewedChip reviewedAt={null} />
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <LoadMore
        hasNext={!!list.hasNextPage}
        loading={list.isFetchingNextPage}
        onClick={() => void list.fetchNextPage()}
        what="check-ins"
      />
    </Section>
  );
}

/* ------------------------------------------------------------------- history */

const historyKind: Record<string, string> = {
  intake_submitted: "Intake submitted",
  consent_granted: "Consent granted",
  consent_revoked: "Consent revoked",
  care_team_member_added: "Care team member added",
  plan_version_published: "Plan version published",
  check_in_reviewed: "Check-in reviewed",
  review_task_resolved: "Review task resolved",
  review_task_dismissed: "Review task dismissed",
};

export function HistoryTab({ patientId }: { patientId: string }) {
  const { timezone } = useClinician();
  const list = usePaged(keys.history(patientId), (c) => reads.history(patientId, c));
  if (list.isError) return <QueryError error={list.error} onRetry={() => void list.refetch()} />;
  if (!list.data) return <ListSkeleton rows={6} label="Loading record history" />;
  const items = list.data.pages.flatMap((p) => p.items);
  return (
    <Section
      id="history"
      title="Record history"
      description="Changes to this record, built from the records themselves: who did what and when."
    >
      {items.length === 0 ? (
        <Empty icon="file" title="No record changes yet">
          Plan publications, reviews and consent changes are listed here.
        </Empty>
      ) : (
        <div className="p-3">
          <Table caption="Record history, newest first">
            <THead>
              <tr>
                <Th>When</Th>
                <Th>Change</Th>
                <Th>Detail</Th>
                <Th>By</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((h) => (
                <Tr key={`${h.kind}-${h.resourceId}-${h.at}`}>
                  <Td>{formatDateTime(h.at, timezone)}</Td>
                  <Td>{historyKind[h.kind] ?? h.kind}</Td>
                  <Td className="whitespace-normal">{h.detail}</Td>
                  <Td>
                    {h.actor?.name.replace(/,.*$/, "") ?? (
                      <span className="text-ink-muted">System</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <LoadMore
        hasNext={!!list.hasNextPage}
        loading={list.isFetchingNextPage}
        onClick={() => void list.fetchNextPage()}
        what="history"
      />
    </Section>
  );
}

export type { ReviewTask };
