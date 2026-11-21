"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatAgeCompact } from "@carepath/shared";
import {
  REVIEW_RULE_DEFAULTS_NOTICE,
  reviewRuleKeys,
  type ReviewTask,
} from "@carepath/shared/contracts";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DrawerContent,
  Field,
  Select,
  StatusChip,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tag,
  Textarea,
  Tr,
  useToast,
  Link,
  EmptyState,
  Banner,
  isDirtyText,
  LoadMore,
  FilterField,
} from "@carepath/ui";
import {
  ListSkeleton,
  NOT_ON_CARE_TEAM_REASON,
  PageHeader,
  QueryError,
  Section,
  errorText,
  taskStatusText,
} from "../_components/common";
import { moments } from "../../../lib/illustrations";
import { MomentImage } from "../../../components/illustration";
import { useClinician } from "../_lib/context";
import {
  formatAgeHours,
  formatDateTime,
  formatTime,
  fullName,
  tzAbbreviation,
} from "../_lib/format";
import { useMediaQuery } from "../_lib/media";
import { keys, qs, reads, writes } from "../_lib/queries";

const statusOptions = [
  { value: "active", label: "Open and in review" },
  { value: "closed", label: "Resolved and dismissed" },
];
const assignedOptions = [
  { value: "any", label: "Anyone" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];
const ruleOptions = [
  { value: "any", label: "Any rule" },
  ...reviewRuleKeys.map((k) => ({
    value: k,
    label: {
      reported_pain: "Reported pain",
      missed_sessions: "Missed sessions",
      unreviewed_checkin: "Unreviewed check-in",
      upcoming_followup: "Upcoming follow-up",
      missing_intake: "Missing intake",
    }[k],
  })),
];

/** "5 h" or "3 d" for a table cell; the full words are in the cell's title. */
const compactAge = formatAgeCompact;

/** Status is shown only when the task is not open; an open task is the default and needs no label. */
function TaskStatus({ task }: { task: ReviewTask }) {
  switch (task.status) {
    case "open":
      return null;
    case "in_review":
      return (
        <StatusChip tone="info" icon="clock">
          {taskStatusText["in_review"]}
        </StatusChip>
      );
    case "resolved":
      return <StatusChip tone="success">{taskStatusText["resolved"]}</StatusChip>;
    default:
      return <StatusChip tone="neutral">{taskStatusText["dismissed"]}</StatusChip>;
  }
}

export function ReviewQueue() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { timezone } = useClinician();
  const isWide = useMediaQuery("(min-width: 1280px)");
  const listRef = useRef<HTMLDivElement>(null);

  const status = params.get("status") === "closed" ? "closed" : "active";
  const assigned = params.get("assigned") ?? "any";
  const rule = params.get("rule") ?? "any";
  const selectedId = params.get("task");

  function update(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "any" || (k === "status" && v === "active")) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  const query = qs({
    status,
    assignedTo: assigned === "any" ? undefined : assigned,
    ruleKey: rule === "any" ? undefined : rule,
    limit: 50,
  });
  const list = useInfiniteQuery({
    queryKey: keys.tasks(query),
    queryFn: ({ pageParam }) =>
      reads.tasks(
        qs({
          status,
          assignedTo: assigned === "any" ? undefined : assigned,
          ruleKey: rule === "any" ? undefined : rule,
          limit: 50,
          cursor: pageParam,
        }),
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const tasks = list.data?.pages.flatMap((p) => p.items) ?? [];
  const lastPage = list.data?.pages[0];
  const total = lastPage?.total ?? tasks.length;
  const selected = tasks.find((t) => t.id === selectedId) ?? null;
  const filtersActive = assigned !== "any" || rule !== "any";

  // With no task chosen on a wide screen, open the first so the detail pane is never blank.
  useEffect(() => {
    if (isWide && !selectedId && tasks[0]) update({ task: tasks[0].id });
  }, [isWide, selectedId, tasks[0]?.id]);

  function onListKey(e: KeyboardEvent<HTMLTableSectionElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const buttons = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-task]"),
    );
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    buttons[
      Math.max(0, Math.min(buttons.length - 1, at + (e.key === "ArrowDown" ? 1 : -1)))
    ]?.focus();
  }

  /** After an action the task leaves the list: pick the neighbour and keep keyboard focus in the list. */
  function afterAction(taskId: string) {
    const index = tasks.findIndex((t) => t.id === taskId);
    const next = tasks[index + 1] ?? tasks[index - 1];
    update({ task: next && next.id !== taskId ? next.id : null });
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLButtonElement>("button[data-task]")?.focus(),
    );
  }

  const detail = selected ? (
    <TaskDetail key={selected.id} task={selected} onDone={afterAction} sticky={isWide} />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Review queue"
        description="Every task in the clinic, whoever's caseload it is on. Each says which rule created it, the value it read and where that came from. Rules are thresholds, not predictions: you decide what each one needs."
      />

      <form
        role="search"
        aria-label="Filter review tasks"
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-wrap items-end gap-3 rounded-container border border-border bg-surface p-3"
      >
        <FilterField label="Show" id="rq-status" className="min-w-44 md:w-auto">
          <Select
            id="rq-status"
            options={statusOptions}
            value={status}
            onValueChange={(v) => update({ status: v, task: null })}
          />
        </FilterField>
        <FilterField label="Assigned" id="rq-assigned" className="min-w-44 md:w-auto">
          <Select
            id="rq-assigned"
            options={assignedOptions}
            value={assigned}
            onValueChange={(v) => update({ assigned: v, task: null })}
          />
        </FilterField>
        <FilterField label="Rule" id="rq-rule" className="min-w-44 md:w-auto">
          <Select
            id="rq-rule"
            options={ruleOptions}
            value={rule}
            onValueChange={(v) => update({ rule: v, task: null })}
          />
        </FilterField>
        {filtersActive ? (
          <Button
            variant="quiet"
            onClick={() => update({ assigned: null, rule: null, task: null })}
          >
            Clear filters
          </Button>
        ) : null}
      </form>

      {list.isError ? (
        <QueryError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <ListSkeleton rows={6} label="Loading review tasks" />
      ) : tasks.length === 0 ? (
        <Section id="queue-empty" title="Review tasks">
          <EmptyState
            padded
            icon="check-circle"
            {...(!filtersActive && status !== "closed"
              ? { image: <MomentImage path={moments.nothingToReview} className="max-w-48" /> }
              : {})}
            title={
              filtersActive
                ? "No tasks match these filters"
                : status === "closed"
                  ? "No closed tasks yet"
                  : "Nothing needs attention"
            }
            {...(filtersActive
              ? {
                  action: (
                    <Button
                      variant="secondary"
                      onClick={() => update({ assigned: null, rule: null, task: null })}
                    >
                      Clear filters
                    </Button>
                  ),
                }
              : {})}
          >
            {filtersActive
              ? `No ${status === "closed" ? "resolved or dismissed" : "open"} tasks fit the filters you chose. Clear a filter to see the rest.`
              : status === "closed"
                ? "Nothing has been resolved or dismissed yet."
                : "No open review tasks in the clinic."}{" "}
            Last checked {formatTime(lastPage?.lastCheckedAt ?? new Date().toISOString(), timezone)}{" "}
            {tzAbbreviation(lastPage?.lastCheckedAt ?? new Date().toISOString(), timezone)}
            {lastPage?.rulesLastRunAt
              ? `. Time-based rules last ran at ${formatTime(lastPage.rulesLastRunAt, timezone)}.`
              : "."}
          </EmptyState>
        </Section>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-8">
          <Section
            className="xl:col-span-5"
            id="queue"
            title="Tasks"
            count={total}
            description={`Highest priority first, then oldest.${tasks.length < total ? ` Showing ${tasks.length} of ${total}.` : ""} Last checked ${formatTime(lastPage?.lastCheckedAt ?? "", timezone)}.`}
          >
            <div ref={listRef} className="p-2">
              <Table caption="Review tasks">
                <THead>
                  <Tr header>
                    <Th>Patient</Th>
                    <Th>Why it appeared</Th>
                    <Th numeric>Age</Th>
                    <Th>Assigned to</Th>
                  </Tr>
                </THead>
                <TBody onKeyDown={onListKey}>
                  {tasks.map((t) => (
                    <Tr
                      key={t.id}
                      selected={t.id === selectedId}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        update({ task: t.id });
                      }}
                    >
                      <Td className="font-medium">
                        <span className="flex items-center gap-2">
                          <button
                            type="button"
                            data-task="true"
                            aria-current={t.id === selectedId ? "true" : undefined}
                            onClick={() => update({ task: t.id })}
                            className="rounded-control text-left text-primary underline underline-offset-2 focus-visible:focus-ring"
                          >
                            {fullName(t.patient)}
                          </button>
                          <TaskStatus task={t} />
                          {t.kind === "administrative" ? <Tag>Administrative</Tag> : null}
                        </span>
                      </Td>
                      <Td className="max-w-48 truncate" title={t.explanation}>
                        {t.explanation}
                      </Td>
                      <Td
                        numeric
                        className="text-ink-muted"
                        title={`${formatAgeHours(t.ageHours)} old`}
                      >
                        {compactAge(t.ageHours)}
                      </Td>
                      <Td>
                        {t.assignedTo ? (
                          t.assignedTo.name.replace(/,.*$/, "")
                        ) : (
                          <span className="text-ink-muted">Unassigned</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            {list.hasNextPage ? (
              <div className="border-t border-border px-4 py-2">
                <LoadMore
                  label="Show more tasks"
                  noun="tasks"
                  hasMore={true}
                  loading={list.isFetchingNextPage}
                  shown={tasks.length}
                  onLoadMore={() => void list.fetchNextPage()}
                />
              </div>
            ) : null}
          </Section>

          {isWide ? (
            (detail ?? (
              <Section id="detail" title="Task" className="xl:col-span-3">
                <EmptyState padded icon="clipboard" title="Choose a task">
                  Select a task to see why it appeared and what you can do.
                </EmptyState>
              </Section>
            ))
          ) : (
            <Dialog open={!!selected} onOpenChange={(o) => !o && update({ task: null })}>
              <DrawerContent
                title={selected ? fullName(selected.patient) : "Task"}
                description="Why this task appeared and what you can do."
                className="max-w-xl"
              >
                {detail}
              </DrawerContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- detail */

type NoteAction = "resolve" | "dismiss";

function TaskDetail({
  task,
  onDone,
  sticky,
}: {
  task: ReviewTask;
  onDone: (taskId: string) => void;
  sticky: boolean;
}) {
  const { timezone, session, can } = useClinician();
  const qc = useQueryClient();
  const toast = useToast();
  const [noteAction, setNoteAction] = useState<NoteAction | null>(null);

  const active = task.status === "open" || task.status === "in_review";
  const mayAct =
    active &&
    (task.kind === "clinical" ? can("review_task.resolve") : can("review_task.resolve_admin"));
  const mine = !!task.assignedTo && task.assignedTo.userId === session.user.id;
  const checkInSource = task.sources.find((s) => s.type === "PatientCheckIn");
  // CR-2: assigning and reviewing need care-team membership; closing needs it for clinical tasks only.
  const teamBlocked = !task.onCareTeam;
  const closeBlocked = teamBlocked && task.kind === "clinical";
  const blockedDescribedBy = teamBlocked ? { "aria-describedby": "team-reason" } : {};

  const refresh = () => qc.invalidateQueries({ queryKey: ["clinician"] });
  // CD-442: a failed action is shown above the action group and stays until the next attempt.
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);
  const fail = (e: unknown) => setFailure(errorText(e));

  const assign = useMutation({
    mutationFn: (practitionerId: string | null) =>
      writes.assignTask(task.patient.id, task.id, practitionerId),
    onMutate: () => setFailure(null),
    onSuccess: (_t, practitionerId) => {
      toast({
        tone: "success",
        title: practitionerId ? "Task assigned to you" : "Task unassigned",
      });
      void refresh();
    },
    onError: fail,
  });
  const acknowledge = useMutation({
    mutationFn: () => writes.reviewCheckIn(task.patient.id, checkInSource?.id ?? ""),
    onMutate: () => setFailure(null),
    onSuccess: () => {
      toast({
        tone: "success",
        title: "Check-in marked reviewed",
        description: "The task stays open until you resolve or dismiss it.",
      });
      void refresh();
    },
    onError: fail,
  });

  return (
    <Section
      className={sticky ? "xl:sticky xl:top-4 xl:col-span-3" : ""}
      id="detail"
      title={fullName(task.patient)}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono tabular-nums">{task.patient.mrn}</span>
          <TaskStatus task={task} />
          {task.kind === "administrative" ? <Tag>Administrative</Tag> : null}
        </span>
      }
      actions={<Link href={`/patients/${task.patient.id}`}>Open patient record</Link>}
    >
      <div className="flex flex-col gap-5 p-4">
        <section aria-labelledby="why-heading" className="flex flex-col gap-2">
          <h3 id="why-heading" className="text-label font-semibold text-ink">
            Why this appeared
          </h3>
          <p className="max-w-prose text-h4 font-medium text-ink">{task.explanation}</p>
          <dl className="grid grid-cols-4 gap-x-3 gap-y-1 text-body">
            <dt className="col-span-1 text-ink-muted">Rule</dt>
            <dd className="col-span-3">{task.rule.name}</dd>
            {task.value !== null ? (
              <>
                <dt className="col-span-1 text-ink-muted">Value read</dt>
                <dd className="col-span-3 tabular-nums">
                  {task.value}
                  {task.unit ? ` ${task.unit}` : ""}
                </dd>
              </>
            ) : null}
            {task.threshold !== null ? (
              <>
                <dt className="col-span-1 text-ink-muted">Clinic threshold</dt>
                <dd className="col-span-3 tabular-nums">
                  {task.threshold}
                  {task.unit ? ` ${task.unit}` : ""}
                </dd>
              </>
            ) : null}
            <dt className="col-span-1 text-ink-muted">Created</dt>
            <dd className="col-span-3 tabular-nums">
              {formatDateTime(task.createdAt, timezone)} ({formatAgeHours(task.ageHours)} ago)
            </dd>
            {task.dueAt ? (
              <>
                <dt className="col-span-1 text-ink-muted">Due</dt>
                <dd className="col-span-3 tabular-nums">{formatDateTime(task.dueAt, timezone)}</dd>
              </>
            ) : null}
            <dt className="col-span-1 text-ink-muted">Assigned to</dt>
            <dd className="col-span-3">{task.assignedTo ? task.assignedTo.name : "Unassigned"}</dd>
          </dl>
          <p className="max-w-prose text-small text-ink-muted">{REVIEW_RULE_DEFAULTS_NOTICE}</p>
        </section>

        <section aria-labelledby="source-heading" className="flex flex-col gap-1.5">
          <h3 id="source-heading" className="text-label font-semibold text-ink">
            Source
          </h3>
          <ul className="flex flex-col gap-1 text-body">
            {task.sources.map((s) => (
              <li key={`${s.type}-${s.id}`}>
                {s.type === "PatientCheckIn" ? (
                  <Link href={`/patients/${task.patient.id}?tab=check-ins&checkIn=${s.id}`}>
                    Open the check-in this came from
                  </Link>
                ) : s.type === "CarePlanVersion" ? (
                  <Link href={`/patients/${task.patient.id}?tab=plan`}>
                    Open the care plan version
                  </Link>
                ) : s.type === "Appointment" ? (
                  <span>Appointment record, read for its start time.</span>
                ) : (
                  <span>Intake record, read for missing answers.</span>
                )}
              </li>
            ))}
            {task.sources.length === 0 ? (
              <li className="text-ink-muted">No source record is linked.</li>
            ) : null}
          </ul>
        </section>

        {active ? (
          <section aria-labelledby="actions-heading" className="flex flex-col gap-2">
            <h3 id="actions-heading" className="text-label font-semibold text-ink">
              What you can do
            </h3>
            {failure ? (
              <Banner tone="error" title={failure.title} focusOnMount>
                {failure.body}
              </Banner>
            ) : null}
            {mayAct ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {mine ? (
                    <Button
                      variant="secondary"
                      loading={assign.isPending}
                      loadingLabel="Updating"
                      disabled={teamBlocked}
                      {...blockedDescribedBy}
                      onClick={() => assign.mutate(null)}
                    >
                      Unassign
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      loading={assign.isPending}
                      loadingLabel="Assigning"
                      disabled={!session.practitionerId || teamBlocked}
                      {...blockedDescribedBy}
                      onClick={() => assign.mutate(session.practitionerId)}
                    >
                      Assign to me
                    </Button>
                  )}
                  {checkInSource && can("clinical.write") ? (
                    <Button
                      variant="secondary"
                      loading={acknowledge.isPending}
                      loadingLabel="Marking"
                      disabled={teamBlocked}
                      {...blockedDescribedBy}
                      onClick={() => acknowledge.mutate()}
                    >
                      Mark check-in reviewed
                    </Button>
                  ) : null}
                  <Button
                    disabled={closeBlocked}
                    {...(closeBlocked ? { "aria-describedby": "team-reason" } : {})}
                    onClick={() => setNoteAction("resolve")}
                  >
                    Resolve with a note
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={closeBlocked}
                    {...(closeBlocked ? { "aria-describedby": "team-reason" } : {})}
                    onClick={() => setNoteAction("dismiss")}
                  >
                    Dismiss with a note
                  </Button>
                </div>
                {teamBlocked ? (
                  <p id="team-reason" className="max-w-prose text-body text-ink-muted">
                    {closeBlocked
                      ? "Assigning, marking the check-in reviewed, resolving and dismissing are unavailable."
                      : "Assigning is unavailable."}{" "}
                    {NOT_ON_CARE_TEAM_REASON}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="max-w-prose text-body text-ink-muted">
                {task.kind === "administrative"
                  ? "This is an administrative task. Coordinators and administrators resolve these."
                  : "You can read this task, but your role does not include resolving it."}
              </p>
            )}
          </section>
        ) : (
          <section aria-labelledby="outcome-heading" className="flex flex-col gap-1">
            <h3 id="outcome-heading" className="text-label font-semibold text-ink">
              {task.status === "resolved"
                ? taskStatusText["resolved"]
                : taskStatusText["dismissed"]}
            </h3>
            <p className="text-body">
              {task.resolvedBy?.name ?? "Someone on the care team"}
              {task.resolvedAt ? `, ${formatDateTime(task.resolvedAt, timezone)}` : ""}
            </p>
            {task.resolutionNote ? (
              <p className="max-w-prose text-body">Note: {task.resolutionNote}</p>
            ) : null}
          </section>
        )}
      </div>

      <NoteDialog
        action={noteAction}
        task={task}
        onClose={() => setNoteAction(null)}
        onSaved={() => {
          setNoteAction(null);
          void refresh();
          toast({
            tone: "success",
            title: noteAction === "dismiss" ? "Task dismissed" : "Task resolved",
            description: "It moved to the closed list with your note.",
          });
          onDone(task.id);
        }}
      />
    </Section>
  );
}

function NoteDialog({
  action,
  task,
  onClose,
  onSaved,
}: {
  action: NoteAction | null;
  task: ReviewTask;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // CD-449 and CD-528: a failed save is shown inside the dialog; the typed note stays.
  const [failure, setFailure] = useState<{ title: string; body: string } | null>(null);
  const save = useMutation({
    mutationFn: (text: string) =>
      action === "dismiss"
        ? writes.dismissTask(task.patient.id, task.id, text)
        : writes.resolveTask(task.patient.id, task.id, text),
    onMutate: () => setFailure(null),
    onSuccess: () => {
      setNote("");
      onSaved();
    },
    onError: (e) => setFailure(errorText(e)),
  });
  const verb = action === "dismiss" ? "Dismiss" : "Resolve";
  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          setFailure(null);
          onClose();
        }
      }}
    >
      <DialogContent
        title={`${verb} this task`}
        dirty={isDirtyText("", note)}
        discard={{ question: "Discard your note?", confirmLabel: "Discard note" }}
        feedback={
          failure ? (
            <Banner tone="error" title="Not saved. Your note is still here." focusOnMount>
              {failure.body}
            </Banner>
          ) : null
        }
        description={
          action === "dismiss"
            ? "Dismiss when the task needs no action. Your note is kept with the task."
            : "Say what you did or decided. Your note, your name and the time are kept with the task."
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              loading={save.isPending}
              loadingLabel="Saving"
              onClick={() => {
                if (!note.trim()) {
                  setError("Write a short note before you continue.");
                  return;
                }
                setError(null);
                save.mutate(note.trim());
              }}
            >
              {verb} task
            </Button>
          </>
        }
      >
        <Field label="Note" requirement="required" {...(error ? { error } : {})}>
          {(control) => (
            <Textarea
              {...control}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
      </DialogContent>
    </Dialog>
  );
}
