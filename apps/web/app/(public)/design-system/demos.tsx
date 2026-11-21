"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  ActiveFilterChips,
  Banner,
  BottomSheetContent,
  BottomTabBar,
  Button,
  Checkbox,
  ConfirmDialog,
  DateOfBirthField,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DrawerContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorSummary,
  Field,
  FieldGroup,
  FilterBar,
  FilterField,
  FilterPanel,
  IconButton,
  LeaveGuardDialog,
  Link,
  LoadMore,
  LoadingStatus,
  PainScale,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Radio,
  RadioGroup,
  SearchField,
  SegmentedControl,
  Select,
  SideNav,
  SidePanel,
  SlotButton,
  Switch,
  Table,
  TablePagination,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TBody,
  Td,
  TextInput,
  Textarea,
  THead,
  Th,
  Timer,
  ToastProvider,
  ToggleChip,
  ToggleChipGroup,
  Tr,
  checkDateOfBirth,
  isDirtyText,
  toggleExclusive,
  useAnnouncer,
  LiveRegion,
  useLeaveGuard,
  useToast,
  useUrlTab,
  type DateParts,
  type NavItem,
  type SummaryError,
} from "@carepath/ui";

/* All names and values below are synthetic. */

/* ------------------------------------------------------------ fields */

export function CountedNoteDemo() {
  const [text, setText] = useState("Knee felt stiff on the stairs this morning. ".repeat(4));
  return (
    <Field
      label="Note for your care team"
      requirement="optional"
      hint="Do not use this for emergencies."
      count={{ length: text.length, max: 200 }}
    >
      {(c) => (
        <Textarea {...c} value={text} maxLength={240} onChange={(e) => setText(e.target.value)} />
      )}
    </Field>
  );
}

/** Submit with errors: the summary takes focus, each line moves focus to its field (CD-441). */
export function ErrorSummaryDemo() {
  const id = useId();
  const [name, setName] = useState("");
  const [reps, setReps] = useState("140");
  const [errors, setErrors] = useState<SummaryError[]>([]);
  const [tries, setTries] = useState(0);
  const [saved, setSaved] = useState(false);
  const nameErr = errors.find((e) => e.targetId === `${id}-name`)?.message;
  const repsErr = errors.find((e) => e.targetId === `${id}-reps`)?.message;
  return (
    <form
      noValidate
      className="flex max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const next: SummaryError[] = [];
        if (!name.trim()) next.push({ targetId: `${id}-name`, message: "Enter the exercise name" });
        const n = Number(reps);
        if (!/^\d+$/.test(reps) || n < 1 || n > 100)
          next.push({ targetId: `${id}-reps`, message: "Enter repetitions from 1 to 100" });
        setErrors(next);
        setTries((t) => t + 1);
        setSaved(next.length === 0);
      }}
    >
      <ErrorSummary errors={errors} focusKey={tries} title="Fix these before you save" />
      {saved ? (
        <Banner tone="success" title="Saved">
          The exercise was added to the draft.
        </Banner>
      ) : null}
      <Field label="Exercise name" requirement="required" id={`${id}-name`} error={nameErr}>
        {(c) => <TextInput {...c} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field
        label="Repetitions"
        requirement="required"
        hint="From 1 to 100."
        id={`${id}-reps`}
        error={repsErr}
      >
        {(c) => (
          <TextInput
            {...c}
            inputMode="numeric"
            unit="reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="max-w-24"
          />
        )}
      </Field>
      <div>
        <Button type="submit">Save exercise</Button>
      </div>
    </form>
  );
}

export function DateOfBirthDemo({ error }: { error?: boolean }) {
  const [value, setValue] = useState<DateParts>(
    error ? { day: "18", month: "", year: "1962" } : { day: "", month: "", year: "" },
  );
  const [line, setLine] = useState("");
  const check = error ? checkDateOfBirth(value, "2026-11-19") : null;
  return (
    <div className="flex flex-col gap-2">
      <DateOfBirthField
        why="The clinic uses it to match you to your record."
        value={value}
        onChange={setValue}
        today="2026-11-19"
        onCheck={(iso) => setLine(iso ? `Stored as ${iso}.` : "")}
        {...(check?.error ? { error: check.error, errorParts: check.parts } : {})}
      />
      <p className="text-small text-ink-muted" aria-live="polite">
        {line}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ choices */

const limitations = ["Kneeling", "Stairs", "Lifting", "None of these"] as const;

export function ChoiceDemo() {
  const [picked, setPicked] = useState<string[]>(["Stairs"]);
  const { message, announce } = useAnnouncer();
  return (
    <div className="flex flex-col gap-6">
      <FieldGroup
        legend="Movements that are hard for you"
        requirement="optional"
        hint="Select all that apply."
      >
        <div className="flex flex-col">
          {limitations.map((l) => (
            <Checkbox
              key={l}
              label={l}
              checked={picked.includes(l)}
              onCheckedChange={(v) => {
                const r = toggleExclusive(picked, l, v === true, "None of these");
                setPicked(r.values);
                if (r.cleared) announce("Other choices cleared");
              }}
            />
          ))}
        </div>
        <LiveRegion message={message} />
      </FieldGroup>
      <FieldGroup legend="Which side?" requirement="required" error="Select a side">
        <RadioGroup aria-label="Which side?">
          <Radio value="left" label="Left side" />
          <Radio value="right" label="Right side" />
          <Radio value="both" label="Both sides" />
          <Radio value="na" label="Does not apply" disabled hint="Not available for this area." />
        </RadioGroup>
      </FieldGroup>
      <div className="flex flex-col">
        <Switch label="Appointment reminders" hint="Sent the day before." />
        <Switch label="Share my pain log" defaultChecked />
        <Switch label="Quiet hours" disabled hint="Set by your clinic." />
      </div>
      <Field label="Rows per page" requirement="optional">
        {(c) => (
          <Select
            {...c}
            defaultValue="25"
            options={[
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
          />
        )}
      </Field>
    </div>
  );
}

export function SegmentedDemo() {
  const [v, setV] = useState<"open" | "closed">("open");
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        label="Show"
        value={v}
        onValueChange={setV}
        options={[
          { value: "open", label: "Open and in review" },
          { value: "closed", label: "Closed" },
        ]}
      />
      <p className="text-small text-ink-muted">
        Showing {v === "open" ? "open and in-review" : "closed"} tasks.
      </p>
    </div>
  );
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function ToggleChipDemo() {
  const [on, setOn] = useState<Set<string>>(new Set(["Monday", "Wednesday"]));
  return (
    <ToggleChipGroup legend="Days" requirement="optional" hint="Leave all off to see every day.">
      {days.map((d) => (
        <ToggleChip
          key={d}
          label={d}
          shortLabel={d.slice(0, 3)}
          pressed={on.has(d)}
          onPressedChange={(p) => {
            const next = new Set(on);
            if (p) next.add(d);
            else next.delete(d);
            setOn(next);
          }}
        />
      ))}
    </ToggleChipGroup>
  );
}

export function SlotDemo() {
  const [chosen, setChosen] = useState<string | null>(null);
  const slots = ["9:00 AM", "9:30 AM", "11:00 AM", "2:15 PM"];
  return (
    <section aria-labelledby="slot-day" className="flex flex-col gap-2">
      <h4 id="slot-day" className="text-label font-semibold">
        Friday, November 20 (Mountain Time)
      </h4>
      <ul className="flex flex-wrap gap-2">
        {slots.map((t) => (
          <li key={t}>
            <SlotButton
              time={t}
              fullLabel={`Friday, November 20, ${t}`}
              selected={chosen === t}
              onClick={() => setChosen(t)}
            />
          </li>
        ))}
        <li>
          <SlotButton time="3:00 PM" fullLabel="Friday, November 20, 3:00 PM" disabled />
        </li>
      </ul>
      <p className="text-small text-ink-muted" aria-live="polite">
        {chosen ? `You chose ${chosen}. The next step confirms it.` : "Choose a time."}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------ pain */

export function PainDemo() {
  const [v, setV] = useState<number | null>(null);
  return <PainScale value={v} onValueChange={setV} hint="0 means no pain at all." />;
}

/* ------------------------------------------------------------ feedback */

export function BannerFocusDemo() {
  const [n, setN] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="neutral" onClick={() => setN((x) => x + 1)}>
          Try to save, and fail
        </Button>
      </div>
      {n > 0 ? (
        <Banner
          tone="error"
          title="Your note was not saved"
          focusOnMount
          focusKey={n}
          action={
            <Button variant="neutral" size="sm" onClick={() => setN((x) => x + 1)}>
              Retry saving note
            </Button>
          }
        >
          Your text is still here. Nothing else changed.
        </Banner>
      ) : null}
    </div>
  );
}

export function LoadingDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="neutral" onClick={() => setLoading((l) => !l)}>
          {loading ? "Stop loading" : "Start loading"}
        </Button>
      </div>
      <LoadingStatus
        label="Loading open times"
        loading={loading}
        retry={
          <Button variant="quiet" size="sm" onClick={() => setLoading(false)}>
            Try loading times again
          </Button>
        }
      />
      {!loading ? <p className="text-small text-ink-muted">Nothing is loading.</p> : null}
    </div>
  );
}

export function TimerDemo() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-start gap-3">
      <Timer label="Hold" seconds={30} running={running} onDone={() => setDone(true)} noun="Hold" />
      <div className="flex gap-2">
        <Button variant="neutral" onClick={() => setRunning((r) => !r)} disabled={done}>
          {running ? "Pause" : "Start hold"}
        </Button>
        {done ? <Button>Continue</Button> : null}
      </div>
    </div>
  );
}

export function ToastDemo() {
  return (
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>
  );
}

function ToastButtons() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="neutral"
        onClick={() =>
          toast({ tone: "success", title: "Link copied", description: "Paste it in a message." })
        }
      >
        Show a toast
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="neutral">Open a dialog, toast waits</Button>
        </DialogTrigger>
        <DialogContent
          title="Toasts wait for this dialog"
          description="A toast raised now is shown after the dialog closes."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => toast({ tone: "info", title: "Shown after the dialog closed" })}
              >
                Raise a toast
              </Button>
              <DialogClose asChild>
                <Button>Close dialog</Button>
              </DialogClose>
            </>
          }
        />
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------ overlays */

export function NoteDialogDemo() {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [fail, setFail] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setNote("");
          setFail(0);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="neutral">Resolve with a note</Button>
      </DialogTrigger>
      <DialogContent
        title="Resolve this task"
        description="Your note, your name and the time are kept with the task."
        dirty={isDirtyText("", note)}
        discard={{ question: "Discard your note?", confirmLabel: "Discard note" }}
        feedback={
          fail > 0 ? (
            <Banner
              tone="error"
              title="Not saved. Your note is still here."
              focusOnMount
              focusKey={fail}
            >
              The demo always fails, so you can see the error inside the dialog.
            </Banner>
          ) : null
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={() => setFail((f) => f + 1)}>Resolve task</Button>
          </>
        }
      >
        <Field label="Note" requirement="required">
          {(c) => <Textarea {...c} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDemo() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Button variant="neutral" onClick={() => setOpen(true)}>
        Cancel visit
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setFailed(false);
        }}
        title="Cancel this visit?"
        description="Friday, November 20, 9:00 AM with Terry Demotherapist. The time is released to other patients."
        cancelLabel="Keep this visit"
        confirmLabel="Cancel visit"
        pendingLabel="Cancelling"
        tone="danger"
        pending={pending}
        feedback={
          failed ? (
            <Banner tone="error" title="Your visit was not cancelled" focusOnMount>
              It is still booked. Check your connection and try again.
            </Banner>
          ) : null
        }
        onConfirm={() => {
          setPending(true);
          setTimeout(() => {
            setPending(false);
            setFailed(true);
          }, 600);
        }}
      />
    </>
  );
}

export function DrawerDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="neutral">Open side drawer</Button>
        </DialogTrigger>
        <DrawerContent
          title="Plan version 2"
          description="Published November 12 by Terry Demotherapist. Read only."
          closeLabel="Close plan version"
          footer={
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          }
        >
          <p className="text-body">
            Sit to stand, 3 sets of 10. Hamstring stretch, hold 30 seconds.
          </p>
        </DrawerContent>
      </Dialog>
    </div>
  );
}

export function SheetDemo() {
  const [reason, setReason] = useState("");
  return (
    <Dialog onOpenChange={(o) => (!o ? setReason("") : undefined)}>
      <div>
        <DialogTrigger asChild>
          <Button variant="neutral">Skip this exercise</Button>
        </DialogTrigger>
      </div>
      <BottomSheetContent
        title="Why are you skipping it?"
        description="Your care team sees the reason."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Keep going</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Skip exercise</Button>
            </DialogClose>
          </>
        }
      >
        <RadioGroup aria-label="Why are you skipping it?" value={reason} onValueChange={setReason}>
          <Radio value="hurts" label="It hurts" />
          <Radio value="space" label="I do not have the space or equipment" />
          <Radio value="tired" label="I am too tired today" />
        </RadioGroup>
      </BottomSheetContent>
    </Dialog>
  );
}

export function SidePanelDemo({ mode }: { mode?: "inline" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button variant="neutral" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide intake" : "See intake"}
        </Button>
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 rounded-container border border-border bg-surface p-4 text-body">
          Plan draft: sit to stand, 3 sets of 10.
        </div>
        <SidePanel
          open={open}
          onOpenChange={setOpen}
          title="Intake for Avery Demopatient"
          description="Submitted November 2."
          closeLabel="Close intake"
          {...(mode ? { mode } : {})}
        >
          <p className="text-body">Lower back, left side. Pain at worst 6 of 10.</p>
        </SidePanel>
      </div>
    </div>
  );
}

export function PopoverMenuDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="quiet">Why this appears</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-body">
            The clinic rule lists check-ins with pain of 7 or higher. Demo default. Not clinically
            reviewed.
          </p>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label="Actions for Avery Demopatient" icon="more" variant="neutral" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Avery Demopatient</DropdownMenuLabel>
          <DropdownMenuItem>Open record</DropdownMenuItem>
          <DropdownMenuItem>Open appointments</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            Open care plan builder (only the care team can edit the plan)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function LeaveGuardDemo() {
  const [text, setText] = useState("");
  const guard = useLeaveGuard(isDirtyText("", text));
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Field
        label="Draft message"
        requirement="optional"
        hint="Type something, then follow the link or press Back."
      >
        {(c) => <Textarea {...c} rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
      </Field>
      <p className="text-body">
        <Link href="/design-system?visited=colour#colour">Go to the colour section</Link>
      </p>
      <LeaveGuardDialog guard={guard} />
    </div>
  );
}

/* ------------------------------------------------------------ navigation */

const sections = ["overview", "plan", "history"] as const;

export function UrlTabsDemo() {
  const [tab, setTab] = useUrlTab(sections, { param: "gallery-tab" });
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Record sections">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="plan">Care plan</TabsTrigger>
        <TabsTrigger value="history">Record history</TabsTrigger>
      </TabsList>
      {sections.map((s) => (
        <TabsContent key={s} value={s}>
          <h4 className="text-label font-semibold">
            {s === "overview" ? "Overview" : s === "plan" ? "Care plan" : "Record history"}
          </h4>
          <p className="mt-1 text-body text-ink-muted">
            The section is in the address as gallery-tab, with a history entry per change, so Back
            returns to the previous section.
          </p>
        </TabsContent>
      ))}
    </Tabs>
  );
}

const patientNav: NavItem[] = [
  { href: "#nav", label: "Today", icon: "home", current: true },
  { href: "#nav", label: "Progress", icon: "activity" },
  { href: "#nav", label: "Appointments", icon: "calendar" },
  { href: "#nav", label: "Messages", icon: "message", count: 2, countUnit: "unread" },
];

const clinicianNav: NavItem[] = [
  { href: "#nav", label: "Overview", icon: "home", current: true },
  { href: "#nav", label: "Schedule", icon: "calendar" },
  { href: "#nav", label: "Patients", icon: "users" },
  { href: "#nav", label: "Review queue", icon: "clipboard" },
  { href: "#nav", label: "Messages", icon: "message", count: 120, countUnit: "unread" },
];

export function NavDemo({ theme }: { theme: "patient" | "clinician" }) {
  return theme === "patient" ? (
    <div className="overflow-hidden rounded-container border border-border">
      <div className="h-24 bg-bg p-4 text-small text-ink-muted">Screen content</div>
      <BottomTabBar label="Patient example" items={patientNav} />
    </div>
  ) : (
    <div className="grid grid-cols-[220px_1fr] overflow-hidden rounded-container border border-border">
      <SideNav label="Clinician example" items={clinicianNav} className="min-h-72" />
      <div className="bg-bg p-4 text-small text-ink-muted">Work list</div>
    </div>
  );
}

/* ------------------------------------------------------------ table, paging, filters */

const firstNames = ["Avery", "Blake", "Casey", "Dana", "Ellis", "Frankie", "Gray", "Harper"];
const statuses = ["Active", "Intake incomplete", "Awaiting assignment", "Inactive"] as const;
const rows = Array.from({ length: 57 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `${firstNames[i % firstNames.length]} Demopatient${i + 1}`,
  mrn: `MRN-${String(10400 + i * 7).padStart(6, "0")}`,
  status: statuses[i % statuses.length]!,
  pain: (i * 3) % 11,
  last: `Nov ${19 - (i % 18)}`,
}));

export function TableDemo() {
  const id = useId();
  const caption = useRef<HTMLElement | null>(null);
  const [sort, setSort] = useState<"ascending" | "descending">("descending");
  const [selected, setSelected] = useState("p2");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () =>
      rows
        .filter((r) => (status === "all" ? true : r.status === status))
        .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (sort === "ascending" ? a.pain - b.pain : b.pain - a.pain)),
    [q, status, sort],
  );
  const start = page * size;
  const shown = filtered.slice(start, start + size);
  const active = status !== "all" ? 1 : 0;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        label="Search and filter patients"
        resultText={filtered.length === 0 ? "No patients match" : `${filtered.length} patients`}
        activeCount={active + (q ? 1 : 0)}
        onClear={() => {
          setQ("");
          setStatus("all");
          setPage(0);
        }}
      >
        <SearchField
          label="Search patients"
          placeholder="Name or MRN"
          value={q}
          onSearch={(v) => {
            setQ(v);
            setPage(0);
          }}
        />
        <FilterPanel activeCount={active}>
          <FilterField label="Status" id={`${id}-status`}>
            <Select
              id={`${id}-status`}
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
              options={[
                { value: "all", label: "All statuses" },
                ...statuses.map((s) => ({ value: s, label: s })),
              ]}
            />
          </FilterField>
        </FilterPanel>
      </FilterBar>
      <ActiveFilterChips
        filters={
          status !== "all"
            ? [{ id: "status", label: `Status: ${status}`, onRemove: () => setStatus("all") }]
            : []
        }
      />
      <Table
        caption="Patients"
        captionId={`${id}-caption`}
        captionHelp="Sorted by reported pain. Synthetic data."
      >
        <THead>
          <Tr header>
            <Th>Patient</Th>
            <Th>MRN</Th>
            <Th>Status</Th>
            <Th
              numeric
              sort={sort}
              sortWords={{ ascending: "lowest first", descending: "highest first" }}
              onSort={() => setSort(sort === "ascending" ? "descending" : "ascending")}
            >
              Reported pain
            </Th>
            <Th>Last activity</Th>
          </Tr>
        </THead>
        <TBody>
          {shown.map((r) => (
            <Tr key={r.id} selected={r.id === selected} onClick={() => setSelected(r.id)}>
              <Td>
                <button
                  type="button"
                  className="rounded-control text-link underline underline-offset-2 focus-visible:focus-ring"
                  aria-current={r.id === selected ? "true" : undefined}
                  onClick={() => setSelected(r.id)}
                >
                  {r.name}
                </button>
              </Td>
              <Td mono>{r.mrn}</Td>
              <Td>{r.status}</Td>
              <Td numeric>{r.pain} of 10</Td>
              <Td>{r.last}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <TablePagination
        noun="Patients"
        start={filtered.length ? start + 1 : 0}
        end={start + shown.length}
        total={filtered.length}
        hasPrevious={page > 0}
        hasNext={start + size < filtered.length}
        onPrevious={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        pageSize={size}
        onPageSizeChange={(n) => {
          setSize(n);
          setPage(0);
        }}
        pageSizes={[10, 25, 50]}
        focusTarget={() => {
          caption.current = document.getElementById(`${id}-caption`);
          return caption.current;
        }}
      />
      {filtered.length === 0 ? (
        <EmptyState icon="search" title="No patients match">
          Try fewer filters, or check the spelling.
        </EmptyState>
      ) : null}
    </div>
  );
}

const tasks = Array.from(
  { length: 23 },
  (_, i) => `Check-in from ${firstNames[i % 8]} Demopatient${i + 1}`,
);

export function LoadMoreDemo() {
  const list = useRef<HTMLUListElement>(null);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <ul
        ref={list}
        className="flex flex-col divide-y divide-border rounded-container border border-border bg-surface"
      >
        {tasks.slice(0, count).map((t) => (
          <li key={t} className="px-3 py-2">
            <Link href="#table" variant="standalone">
              {t}
            </Link>
          </li>
        ))}
      </ul>
      <LoadMore
        label="Show more tasks"
        noun="tasks"
        hasMore={count < tasks.length}
        loading={loading}
        shown={Math.min(count, tasks.length)}
        total={tasks.length}
        listRef={list}
        onLoadMore={() => {
          setLoading(true);
          setTimeout(() => {
            setCount((c) => c + 5);
            setLoading(false);
          }, 300);
        }}
      />
    </div>
  );
}
