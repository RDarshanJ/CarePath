"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CarePlanVersionDetail, Exercise } from "@carepath/shared/contracts";
import {
  Banner,
  Button,
  Dialog,
  DrawerContent,
  Field,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextInput,
  Textarea,
  useToast,
} from "@carepath/ui";
import { ApiError } from "../../../../../lib/api/errors";
import {
  AppLink,
  Empty,
  ListSkeleton,
  PageHeader,
  QueryError,
  Section,
} from "../../../_components/common";
import { PlanView } from "../../../_components/plan-view";
import { useClinician } from "../../../_lib/context";
import { formatTime, fullName } from "../../../_lib/format";
import { useMediaQuery } from "../../../_lib/media";
import { keys, reads, writes } from "../../../_lib/queries";
import { VersionDrawer, VersionList } from "../tabs";
import {
  emptyDraft,
  fromContent,
  fromPlanView,
  itemFromExercise,
  metaFromView,
  move,
  newGoalKey,
  validate,
  type DraftState,
  type ExerciseMeta,
  type Problems,
} from "./builder-state";
import { ItemEditor } from "./item-editor";
import { ExerciseLibrary } from "./library";
import { PublishDialog } from "./publish-dialog";

type SaveState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "invalid"; message: string }
  | { kind: "stale" }
  | { kind: "forbidden" }
  | { kind: "error" };

export function PlanBuilder({ patientId }: { patientId: string }) {
  const header = useQuery({
    queryKey: keys.header(patientId),
    queryFn: () => reads.header(patientId),
  });
  const plan = useQuery({ queryKey: keys.plan(patientId), queryFn: () => reads.plan(patientId) });
  const draft = useQuery({
    queryKey: keys.draft(patientId),
    queryFn: () => reads.draft(patientId),
    retry: false,
    staleTime: Infinity,
    refetchOnMount: "always",
  });
  const noDraft = draft.error instanceof ApiError && draft.error.code === "not_found";
  const preview = useQuery({
    queryKey: keys.preview(patientId),
    queryFn: () => reads.preview(patientId),
    enabled: draft.isSuccess,
    staleTime: Infinity,
    refetchOnMount: "always",
  });

  // The form starts from the first complete read and is never rebuilt: later cache changes (the first save
  // creates the draft) must not reset what the clinician is typing.
  const initialRef = useRef<Initial | null>(null);
  const patientName = header.data ? fullName(header.data) : "this patient";
  const crumbs = (
    <span className="flex flex-wrap items-center gap-2">
      <AppLink href="/patients">All patients</AppLink>
      <span aria-hidden="true">/</span>
      <AppLink href={`/patients/${patientId}?tab=plan`}>{patientName}</AppLink>
    </span>
  );

  if (header.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Care plan builder" eyebrow={crumbs} />
        <QueryError error={header.error} onRetry={() => void header.refetch()} />
      </div>
    );
  }
  if (draft.isError && !noDraft) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Care plan builder" eyebrow={crumbs} />
        <QueryError error={draft.error} onRetry={() => void draft.refetch()} />
      </div>
    );
  }
  if (plan.isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Care plan builder" eyebrow={crumbs} />
        <QueryError error={plan.error} onRetry={() => void plan.refetch()} />
      </div>
    );
  }
  const ready = header.data && plan.data && (draft.isSuccess ? !!preview.data : noDraft);
  if (!initialRef.current && ready) {
    initialRef.current = draft.data
      ? {
          state: fromContent(draft.data.content),
          updatedAt: draft.data.updatedAt,
          nextVersion: draft.data.nextVersionNumber,
          hasDraft: true,
          meta: {
            ...(plan.data.plan ? metaFromView(plan.data.plan) : {}),
            ...(preview.data?.plan ? metaFromView(preview.data.plan) : {}),
          },
        }
      : {
          state: plan.data.plan ? fromPlanView(plan.data.plan) : emptyDraft,
          updatedAt: null,
          nextVersion: plan.data.plan ? plan.data.plan.version.number + 1 : 1,
          hasDraft: false,
          meta: plan.data.plan ? metaFromView(plan.data.plan) : {},
        };
  }
  const initial = initialRef.current;
  if (!initial) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Care plan builder" eyebrow={crumbs} />
        <ListSkeleton rows={8} label="Loading care plan builder" />
      </div>
    );
  }

  return (
    <Builder
      patientId={patientId}
      patientName={patientName}
      crumbs={crumbs}
      currentVersion={plan.data?.plan?.version.number ?? null}
      initial={initial}
    />
  );
}

interface Initial {
  state: DraftState;
  updatedAt: string | null;
  nextVersion: number;
  hasDraft: boolean;
  meta: Record<string, ExerciseMeta>;
}

function Builder({
  patientId,
  patientName,
  crumbs,
  currentVersion,
  initial,
}: {
  patientId: string;
  patientName: string;
  crumbs: React.ReactNode;
  currentVersion: number | null;
  initial: Initial;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { timezone } = useClinician();
  const isWide = useMediaQuery("(min-width: 1280px)");

  const [state, setState] = useState<DraftState>(initial.state);
  const [meta, setMeta] = useState<Record<string, ExerciseMeta>>(initial.meta);
  const [nextVersion, setNextVersion] = useState(initial.nextVersion);
  const [saveState, setSaveState] = useState<SaveState>(
    initial.hasDraft && initial.updatedAt
      ? { kind: "saved", at: initial.updatedAt }
      : { kind: "idle" },
  );
  const [problems, setProblems] = useState<Problems | null>(null);
  const [announce, setAnnounce] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBlock, setPublishBlock] = useState<string | null>(null);
  const [tab, setTab] = useState("build");
  const [openVersion, setOpenVersion] = useState<string | null>(null);

  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef(state);
  const updatedAtRef = useRef<string | null>(initial.updatedAt);
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Save the current form as the draft. Resolves true only when the stored draft equals the form. */
  const save = useCallback(
    async function run(): Promise<boolean> {
      clearTimeout(timerRef.current);
      if (savingRef.current) {
        dirtyRef.current = true;
        return false;
      }
      const result = validate(stateRef.current);
      if (!result.ok) {
        setProblems(result.problems);
        const first =
          result.problems.title ??
          Object.values(result.problems.items)[0] ??
          Object.values(result.problems.goals)[0] ??
          result.problems.other[0] ??
          "Check the plan";
        setSaveState({ kind: "invalid", message: first });
        return false;
      }
      setProblems(null);
      savingRef.current = true;
      dirtyRef.current = false;
      setSaveState({ kind: "saving" });
      try {
        const saved = await writes.saveDraft(patientId, {
          ...result.content,
          expectedUpdatedAt: updatedAtRef.current,
        });
        updatedAtRef.current = saved.updatedAt;
        setNextVersion(saved.nextVersionNumber);
        qc.setQueryData(keys.draft(patientId), saved);
        void qc.invalidateQueries({ queryKey: keys.preview(patientId) });
        void qc.invalidateQueries({ queryKey: ["clinician", "directory"] });
        savingRef.current = false;
        if (dirtyRef.current) return await run();
        setSaveState({ kind: "saved", at: saved.updatedAt });
        return true;
      } catch (e) {
        savingRef.current = false;
        if (e instanceof ApiError && e.code === "draft_stale") setSaveState({ kind: "stale" });
        else if (e instanceof ApiError && (e.code === "not_on_care_team" || e.code === "forbidden"))
          setSaveState({ kind: "forbidden" });
        else setSaveState({ kind: "error" });
        return false;
      }
    },
    [patientId, qc],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Leaving with unsaved edits asks first; saved drafts leave silently.
  const unsaved =
    saveState.kind === "pending" ||
    saveState.kind === "saving" ||
    saveState.kind === "invalid" ||
    saveState.kind === "error";
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [unsaved]);

  function edit(fn: (s: DraftState) => DraftState) {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    setSaveState({ kind: "pending" });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), 900);
  }

  function addExercise(e: Exercise) {
    if (stateRef.current.items.some((i) => i.exerciseId === e.id)) return;
    setMeta((m) => ({
      ...m,
      [e.id]: {
        name: e.name,
        bodyArea: e.bodyArea,
        category: e.category,
        description: e.description,
      },
    }));
    edit((s) => ({ ...s, items: [...s.items, itemFromExercise(e)] }));
    setAnnounce(`${e.name} added at position ${stateRef.current.items.length}.`);
  }

  function moveItem(index: number, by: -1 | 1) {
    const item = stateRef.current.items[index];
    if (!item) return;
    edit((s) => ({ ...s, items: move(s.items, index, by) }));
    const name = meta[item.exerciseId]?.name ?? "Exercise";
    setAnnounce(`${name} moved to position ${index + by + 1} of ${stateRef.current.items.length}.`);
    // Keep keyboard focus on the same control after the list reorders.
    requestAnimationFrame(() => {
      const target = index + by;
      const atEdge = by === -1 ? target === 0 : target === stateRef.current.items.length - 1;
      const id = atEdge
        ? `move-${by === -1 ? "down" : "up"}-${item.exerciseId}`
        : `move-${by === -1 ? "up" : "down"}-${item.exerciseId}`;
      document.getElementById(id)?.focus();
    });
  }

  function removeItem(index: number) {
    const item = stateRef.current.items[index];
    if (!item) return;
    const name = meta[item.exerciseId]?.name ?? "Exercise";
    edit((s) => ({ ...s, items: s.items.filter((_, i) => i !== index) }));
    setAnnounce(`${name} removed from the plan.`);
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("[data-builder-title]")?.focus(),
    );
  }

  async function openPublish() {
    setPublishBlock(null);
    if (stateRef.current.items.length === 0) {
      setPublishBlock("Add at least one exercise before publishing.");
      return;
    }
    const ok = await save();
    if (!ok) {
      setPublishBlock("The draft is not saved yet. Fix the problem shown above, then try again.");
      return;
    }
    setPublishOpen(true);
  }

  function published(version: CarePlanVersionDetail) {
    setPublishOpen(false);
    stateRef.current = state;
    setSaveState({ kind: "idle" });
    toast({
      tone: "success",
      title: `Version ${version.version.number} published`,
      description: `${patientName} sees it on their next visit to Today.`,
    });
    void qc.invalidateQueries({ queryKey: ["clinician"] });
    router.push(`/patients/${patientId}?tab=plan`);
  }

  async function reloadDraft() {
    const latest = await reads.draft(patientId).catch(() => null);
    if (!latest) return;
    updatedAtRef.current = latest.updatedAt;
    qc.setQueryData(keys.draft(patientId), latest);
    const next = fromContent(latest.content);
    stateRef.current = next;
    setState(next);
    setNextVersion(latest.nextVersionNumber);
    setSaveState({ kind: "saved", at: latest.updatedAt });
    setProblems(null);
    const pv = await reads.preview(patientId).catch(() => null);
    if (pv?.plan) setMeta((m) => ({ ...m, ...metaFromView(pv.plan!) }));
  }

  const inPlan = new Set(state.items.map((i) => i.exerciseId));
  const library = <ExerciseLibrary inPlan={inPlan} onAdd={addExercise} />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={crumbs}
        title={`Care plan for ${patientName}`}
        description={
          currentVersion
            ? `The patient sees version ${currentVersion} until you publish version ${nextVersion}. Edits save automatically as a draft that only clinicians can see.`
            : "This patient has no published plan yet. Edits save automatically as a draft that only clinicians can see."
        }
      />

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-container border border-border bg-surface px-4 py-2">
        <SaveStatus state={saveState} timezone={timezone} onRetry={() => void save()} />
        <div className="flex items-center gap-2">
          {!isWide ? (
            <Button variant="secondary" iconLeft="plus" onClick={() => setLibraryOpen(true)}>
              Add exercises
            </Button>
          ) : null}
          <Button ref={publishButtonRef} onClick={() => void openPublish()}>
            Review and publish version {nextVersion}
          </Button>
        </div>
      </div>
      {publishBlock ? (
        <Banner tone="warning" title="Not ready to publish">
          {publishBlock}
        </Banner>
      ) : null}
      {saveState.kind === "stale" ? (
        <Banner
          tone="error"
          title="This draft was saved somewhere else"
          action={
            <Button variant="secondary" size="sm" onClick={() => void reloadDraft()}>
              Load the saved draft
            </Button>
          }
        >
          Someone saved the draft after you opened it, so your latest edits were not saved. Loading
          the saved draft replaces what is on screen.
        </Banner>
      ) : null}
      {saveState.kind === "forbidden" ? (
        <Banner tone="error" title="You cannot save changes to this plan">
          Only members of this patient&apos;s care team can edit the plan. Nothing was saved. Ask
          the primary therapist to add you to the care team.
        </Banner>
      ) : null}

      <div aria-live="polite" role="status" className="sr-only">
        {announce}
      </div>

      <div className={isWide ? "flex items-start gap-5" : "flex flex-col gap-5"}>
        {isWide ? (
          <aside
            aria-label="Exercise library"
            className="sticky top-16 w-88 shrink-0 overflow-y-auto rounded-container"
            style={{ maxHeight: "calc(100dvh - 6rem)" }}
          >
            <a
              href="#main"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector<HTMLElement>("[data-builder-title]")?.focus();
              }}
              className="sr-only rounded-control bg-surface px-3 py-2 text-label font-medium text-primary focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-10 focus-visible:focus-ring"
            >
              Skip the library and go to the plan
            </a>
            <Section id="library" title="Exercise library">
              <div className="p-3">{library}</div>
            </Section>
          </aside>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="min-w-0 flex-1">
          <TabsList aria-label="Plan builder views">
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="preview">Patient preview</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="build">
            <div className="flex flex-col gap-5">
              <Section id="details" title="Plan details">
                <div className="flex flex-col gap-4 p-4">
                  <Field
                    label="Plan title"
                    requirement="required"
                    {...(problems?.title ? { error: problems.title } : {})}
                  >
                    {(control) => (
                      <TextInput
                        {...control}
                        data-builder-title="true"
                        value={state.title}
                        maxLength={200}
                        onChange={(e) => edit((s) => ({ ...s, title: e.target.value }))}
                      />
                    )}
                  </Field>
                  <Field
                    label="Plan instructions"
                    requirement="optional"
                    why="Shown to the patient at the top of the plan."
                  >
                    {(control) => (
                      <Textarea
                        {...control}
                        value={state.instructions}
                        maxLength={4000}
                        rows={3}
                        onChange={(e) => edit((s) => ({ ...s, instructions: e.target.value }))}
                      />
                    )}
                  </Field>
                </div>
              </Section>

              <Section
                id="exercises"
                title="Exercises"
                count={state.items.length}
                description="In the order the patient does them. Use the move buttons to reorder."
              >
                <div className="p-4">
                  {state.items.length === 0 ? (
                    <Empty
                      icon="list"
                      title="No exercises yet"
                      action={
                        !isWide ? (
                          <Button
                            variant="secondary"
                            iconLeft="plus"
                            onClick={() => setLibraryOpen(true)}
                          >
                            Add exercises
                          </Button>
                        ) : undefined
                      }
                    >
                      {isWide
                        ? "Search the library on the left and add exercises. Each one gets a dose and a weekly schedule here."
                        : "Open the library and add exercises. Each one gets a dose and a weekly schedule here."}
                    </Empty>
                  ) : (
                    <ol aria-label="Exercises in this plan" className="flex flex-col gap-3">
                      {state.items.map((item, i) => (
                        <ItemEditor
                          key={item.exerciseId}
                          index={i}
                          count={state.items.length}
                          item={item}
                          meta={meta[item.exerciseId]}
                          error={problems?.items[i]}
                          onChange={(patch) =>
                            edit((s) => ({
                              ...s,
                              items: s.items.map((it, n) => (n === i ? { ...it, ...patch } : it)),
                            }))
                          }
                          onMove={(by) => moveItem(i, by)}
                          onRemove={() => removeItem(i)}
                        />
                      ))}
                    </ol>
                  )}
                </div>
              </Section>

              <Section
                id="goals"
                title="Goals"
                count={state.goals.length}
                description="What the plan is working toward. Optional."
              >
                <div className="flex flex-col gap-3 p-4">
                  {state.goals.map((g, i) => (
                    <GoalRow
                      key={g.key}
                      index={i}
                      goal={g}
                      error={problems?.goals[i]}
                      onChange={(patch) =>
                        edit((s) => ({
                          ...s,
                          goals: s.goals.map((x, n) => (n === i ? { ...x, ...patch } : x)),
                        }))
                      }
                      onRemove={() => {
                        edit((s) => ({ ...s, goals: s.goals.filter((_, n) => n !== i) }));
                        setAnnounce("Goal removed.");
                      }}
                    />
                  ))}
                  <div>
                    <Button
                      variant="secondary"
                      iconLeft="plus"
                      onClick={() =>
                        edit((s) => ({
                          ...s,
                          goals: [
                            ...s.goals,
                            {
                              key: newGoalKey(),
                              id: null,
                              description: "",
                              targetValue: "",
                              targetUnit: "",
                              dueDate: "",
                            },
                          ],
                        }))
                      }
                    >
                      Add a goal
                    </Button>
                  </div>
                </div>
              </Section>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <PreviewPane patientId={patientId} saveState={saveState} flush={save} />
          </TabsContent>

          <TabsContent value="versions">
            <VersionsPane patientId={patientId} onOpen={setOpenVersion} />
          </TabsContent>
        </Tabs>
      </div>

      {!isWide ? (
        <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
          <DrawerContent
            title="Exercise library"
            description="Add exercises to the plan. Close this panel when you are done."
          >
            {library}
          </DrawerContent>
        </Dialog>
      ) : null}

      <PublishDialog
        patientId={patientId}
        patientName={patientName}
        open={publishOpen}
        versionNumber={nextVersion}
        getUpdatedAt={() => updatedAtRef.current}
        onOpenChange={setPublishOpen}
        onPublished={published}
        returnFocusTo={() => publishButtonRef.current}
      />
      <VersionDrawer
        patientId={patientId}
        versionId={openVersion}
        onClose={() => setOpenVersion(null)}
      />
    </div>
  );
}

function SaveStatus({
  state,
  timezone,
  onRetry,
}: {
  state: SaveState;
  timezone: string;
  onRetry: () => void;
}) {
  let text: string;
  switch (state.kind) {
    case "idle":
      text = "No changes yet. Your edits save automatically as a draft.";
      break;
    case "pending":
      text = "Unsaved changes. Saving automatically.";
      break;
    case "saving":
      text = "Saving draft";
      break;
    case "saved":
      text = `Draft saved at ${formatTime(state.at, timezone)}`;
      break;
    case "invalid":
      text = `Not saved yet: ${state.message} It saves as soon as this is fixed.`;
      break;
    case "stale":
      text = "Not saved: the draft changed elsewhere.";
      break;
    case "forbidden":
      text = "Not saved: you are not on this patient's care team.";
      break;
    default:
      text = "Not saved: the draft could not be reached.";
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p role="status" aria-live="polite" className="text-body text-ink">
        {text}
      </p>
      {state.kind === "error" ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try saving again
        </Button>
      ) : null}
    </div>
  );
}

function GoalRow({
  index,
  goal,
  error,
  onChange,
  onRemove,
}: {
  index: number;
  goal: DraftState["goals"][number];
  error: string | undefined;
  onChange: (patch: Partial<DraftState["goals"][number]>) => void;
  onRemove: () => void;
}) {
  const id = `goal-${goal.key}`;
  return (
    <div
      role="group"
      aria-label={`Goal ${index + 1} fields`}
      className="flex flex-col gap-2 rounded-container border border-border p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor={`${id}-desc`} className="text-small font-medium text-ink">
            Goal {index + 1}
          </label>
          <TextInput
            id={`${id}-desc`}
            value={goal.description}
            maxLength={500}
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-value`} className="text-small font-medium text-ink">
            Target
          </label>
          <TextInput
            id={`${id}-value`}
            type="number"
            inputMode="decimal"
            value={goal.targetValue}
            onChange={(e) => onChange({ targetValue: e.target.value })}
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-unit`} className="text-small font-medium text-ink">
            Unit
          </label>
          <TextInput
            id={`${id}-unit`}
            value={goal.targetUnit}
            maxLength={40}
            onChange={(e) => onChange({ targetUnit: e.target.value })}
            className="w-28"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-due`} className="text-small font-medium text-ink">
            Due date
          </label>
          <TextInput
            id={`${id}-due`}
            type="date"
            value={goal.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="w-40"
          />
        </div>
        <Button variant="quiet" aria-label={`Remove goal ${index + 1}`} onClick={onRemove}>
          Remove
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-small font-medium text-error-ink">
          <span className="sr-only">Error: </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PreviewPane({
  patientId,
  saveState,
  flush,
}: {
  patientId: string;
  saveState: SaveState;
  flush: () => Promise<boolean>;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void flush().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Flush once when the preview opens, so it shows the latest saved draft.
  }, []);
  const preview = useQuery({
    queryKey: [...keys.preview(patientId), "pane"],
    queryFn: () => reads.preview(patientId),
    enabled: ready,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const none = preview.error instanceof ApiError && preview.error.code === "not_found";
  return (
    <Section
      id="preview"
      title="Patient preview"
      description="The plan as the patient will see it, rendered by the same code that serves their own plan."
    >
      <div className="flex flex-col gap-4 p-4">
        {saveState.kind === "invalid" ||
        saveState.kind === "error" ||
        saveState.kind === "stale" ||
        saveState.kind === "forbidden" ? (
          <Banner tone="warning" title="The preview shows the last saved draft">
            Your latest edits are not saved yet, so they are not in this preview.
          </Banner>
        ) : null}
        {!ready || preview.isPending ? (
          none ? null : (
            <ListSkeleton rows={5} label="Loading preview" />
          )
        ) : none ? (
          <Empty icon="file" title="Nothing to preview yet">
            Give the plan a title and add an exercise. The preview appears once the draft has saved.
          </Empty>
        ) : preview.isError ? (
          <QueryError error={preview.error} onRetry={() => void preview.refetch()} />
        ) : preview.data?.plan ? (
          <PlanView plan={preview.data.plan} />
        ) : null}
      </div>
    </Section>
  );
}

function VersionsPane({ patientId, onOpen }: { patientId: string; onOpen: (id: string) => void }) {
  const versions = useQuery({
    queryKey: keys.versions(patientId),
    queryFn: () => reads.versions(patientId),
  });
  return (
    <Section
      id="versions"
      title="Version history"
      description="Published versions are never edited. Publishing creates the next one."
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
          The first version you publish is listed here with your note to the patient.
        </Empty>
      ) : (
        <VersionList items={versions.data.items} onOpen={onOpen} />
      )}
    </Section>
  );
}
