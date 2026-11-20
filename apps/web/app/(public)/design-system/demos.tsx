"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DrawerContent,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EvidenceRef,
  IconButton,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tr,
  StatusChip,
  Tag,
  Mono,
  useToast,
  ToastProvider,
  AIDraftBlock,
} from "@carepath/ui";

export function OverlayDemos() {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={200}>
        <OverlayButtons />
      </TooltipProvider>
    </ToastProvider>
  );
}

function OverlayButtons() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Open dialog</Button>
        </DialogTrigger>
        <DialogContent
          title="Cancel this appointment?"
          description="Your therapist will be told straight away. You can book another time from the Appointments tab."
          footer={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Keep appointment</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger">Cancel appointment</Button>
              </DialogClose>
            </>
          }
        />
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Open side panel</Button>
        </DialogTrigger>
        <DrawerContent
          title="Evidence 1 of 2"
          description="Source record for the highlighted claim."
          footer={
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          }
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
            <dt className="text-ink-muted">Record</dt>
            <dd>
              <Mono>CHK-2041</Mono> pain check-in
            </dd>
            <dt className="text-ink-muted">Recorded</dt>
            <dd>
              <Mono>2026-11-12 14:05 UTC</Mono>
            </dd>
            <dt className="text-ink-muted">Patient-reported pain</dt>
            <dd>
              <Mono>6</Mono> of 10, left knee
            </dd>
          </dl>
        </DrawerContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Open bottom sheet</Button>
        </DialogTrigger>
        <DrawerContent
          side="bottom"
          title="Stop this session?"
          description="Your progress so far is saved. Your therapist will see that you stopped."
        >
          <div className="flex flex-wrap gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Keep going</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Stop and log pain</Button>
            </DialogClose>
          </div>
        </DrawerContent>
      </Dialog>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" iconRight="chevron-down">
            Why we ask
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-label font-semibold">Why we ask for pain</p>
          <p className="mt-1 text-body text-ink-muted">
            Your care team uses it to adjust your plan. Only your therapist and clinic staff you are
            assigned to can see it.
          </p>
          <PopoverClose asChild>
            <Button variant="quiet" size="sm" className="mt-3">
              Got it
            </Button>
          </PopoverClose>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton label="Copy record ID" icon="link" variant="secondary" />
        </TooltipTrigger>
        <TooltipContent>Copy record ID</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" iconRight="chevron-down">
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Plan</DropdownMenuLabel>
          <DropdownMenuItem>Open record</DropdownMenuItem>
          <DropdownMenuItem>Message patient</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Show completed</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Archive (needs admin)</DropdownMenuItem>
          <DropdownMenuItem danger>Discharge patient</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "success",
            title: "Check-in sent",
            description: "Your therapist will see this.",
          })
        }
      >
        Show toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: "error",
            title: "Message not sent",
            description: "Your text is saved. Try again when you are online.",
          })
        }
      >
        Show error toast
      </Button>
    </div>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="plan">
      <TabsList aria-label="Patient record sections">
        <TabsTrigger value="plan">Plan</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="plan">
        <p className="max-w-measure text-body">
          Version 3 of the care plan. Published 12 Nov 2026 by the assigned therapist.
        </p>
      </TabsContent>
      <TabsContent value="notes">
        <p className="max-w-measure text-body">Notes are append-only. Edits create a new entry.</p>
      </TabsContent>
      <TabsContent value="history">
        <p className="max-w-measure text-body">
          Earlier plan versions stay available and are never overwritten.
        </p>
      </TabsContent>
    </Tabs>
  );
}

const rows = [
  {
    id: "PT-1042",
    name: "Okafor, Adaeze",
    age: 58,
    pain: 6,
    adherence: 71,
    status: "review" as const,
    last: "2026-11-18 08:12",
  },
  {
    id: "PT-1017",
    name: "Lindqvist, Mats",
    age: 64,
    pain: 3,
    adherence: 92,
    status: "ok" as const,
    last: "2026-11-18 07:40",
  },
  {
    id: "PT-1088",
    name: "Reyes, Camila",
    age: 47,
    pain: 7,
    adherence: 38,
    status: "review" as const,
    last: "2026-11-16 19:03",
  },
  {
    id: "PT-1003",
    name: "Haddad, Yusuf",
    age: 71,
    pain: 2,
    adherence: 100,
    status: "none" as const,
    last: "2026-11-18 09:01",
  },
];

export function TableDemo() {
  const [dir, setDir] = useState<"ascending" | "descending">("descending");
  const [selected, setSelected] = useState("PT-1088");
  const sorted = [...rows].sort((a, b) =>
    dir === "ascending" ? a.pain - b.pain : b.pain - a.pain,
  );
  return (
    <Table caption="Synthetic review queue, sorted by patient-reported pain">
      <THead>
        <tr>
          <Th>Patient</Th>
          <Th>ID</Th>
          <Th numeric>Age</Th>
          <Th
            numeric
            sort={dir}
            onSort={() => setDir(dir === "ascending" ? "descending" : "ascending")}
          >
            Pain (0 to 10)
          </Th>
          <Th numeric>Adherence</Th>
          <Th>Status</Th>
          <Th>Intake</Th>
        </tr>
      </THead>
      <TBody>
        {sorted.map((r) => (
          <Tr key={r.id} selected={selected === r.id}>
            <Td>
              <button
                type="button"
                aria-pressed={selected === r.id}
                onClick={() => setSelected(r.id)}
                className="rounded-control text-left font-medium text-primary underline underline-offset-2 focus-visible:focus-ring"
              >
                {r.name}
              </button>
            </Td>
            <Td mono>{r.id}</Td>
            <Td numeric>{r.age}</Td>
            <Td numeric>{r.pain}</Td>
            <Td numeric>{r.adherence}%</Td>
            <Td>
              {r.status === "review" ? (
                <StatusChip tone="warning">Needs review</StatusChip>
              ) : r.status === "ok" ? (
                <StatusChip tone="success">On track</StatusChip>
              ) : (
                <StatusChip tone="neutral">No flags</StatusChip>
              )}
            </Td>
            <Td>
              {r.status === "none" ? (
                <Tag tone="warning">Intake incomplete</Tag>
              ) : (
                <Tag>Unscheduled</Tag>
              )}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}

export function ChoiceDemo() {
  const [a, setA] = useState<boolean | "indeterminate">(true);
  return (
    <div className="flex flex-col">
      <Checkbox
        label="Share my pain log with my therapist"
        hint="You can switch this off at any time in Settings."
        checked={a}
        onCheckedChange={setA}
      />
    </div>
  );
}

export function AIDraftDemo() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <AIDraftBlock
        provider="Demo provider, rule-based"
        actions={
          <>
            <Button size="sm">Approve</Button>
            <Button size="sm" variant="secondary">
              Edit
            </Button>
            <Button size="sm" variant="quiet">
              Discard
            </Button>
          </>
        }
      >
        Patient reports left knee pain of 6 out of 10 on 12 Nov
        <EvidenceRef n={1} onClick={() => setOpen(1)} />, down from 7 the week before
        <EvidenceRef n={2} onClick={() => setOpen(2)} />. Completed 5 of 7 planned sessions.
        <EvidenceRef n={3} onClick={() => setOpen(3)} />
      </AIDraftBlock>
      <p aria-live="polite" className="text-small text-ink-muted">
        {open
          ? `Evidence ${open} would open in the side panel.`
          : "Select a reference number to open its source record."}
      </p>
      <AIDraftBlock provider="Demo provider, rule-based" state="approved" reviewer="J. Alvarez, PT">
        Plan version 3: continue hamstring stretch and sit-to-stand, hold step-ups until pain is 4
        or lower.
      </AIDraftBlock>
      <AIDraftBlock provider="Demo provider, rule-based" state="rejected">
        Suggested adding single-leg squats this week.
      </AIDraftBlock>
    </div>
  );
}
