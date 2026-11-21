import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { Banner } from "./banner";
import {
  BottomSheetContent,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogPanel,
  DialogTrigger,
  DrawerContent,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  LeaveGuardDialog,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  SidePanel,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./overlays";
import { overlayClasses } from "./overlay-classes";
import { Button, IconButton } from "../primitives/button";
import { Field } from "../primitives/field";
import { Textarea } from "../primitives/inputs";
import { Radio, RadioGroup } from "../primitives/choice";

/*
 * Overlays open on load so the story shows the open state, which is the state worth looking at and the
 * one axe must see. Radix portals mount in the document body; ThemeWrap re-applies the story's theme.
 */
const meta = { title: "Composed/Overlays" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const DialogStory: Story = {
  name: "Dialog",
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="secondary">Resolve with a note</Button>
      </DialogTrigger>
      <DialogContent
        title="Resolve this task"
        description="Your note, your name and the time are kept with the task."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button>Resolve task</Button>
          </>
        }
      >
        <Field label="Note" requirement="required">
          {(c) => <Textarea {...c} />}
        </Field>
      </DialogContent>
    </Dialog>
  ),
};

export const DialogPanelStory: Story = {
  name: "DialogPanel",
  render: () => (
    <div className={`rounded-container p-6 ${overlayClasses.surface}`}>
      <DialogPanel
        title="Publish version 3?"
        description="The patient sees version 3 from now on. Published versions cannot be changed."
        feedback={
          <Banner tone="error" title="Version 3 was not published">
            Your draft is unchanged. Check your connection and try again.
          </Banner>
        }
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Publish version 3</Button>
          </>
        }
      />
    </div>
  ),
};

export const DialogContentStory: Story = {
  name: "DialogContent",
  render: () => (
    <Dialog defaultOpen>
      <DialogContent
        title="Resolve this task"
        description="Your note, your name and the time are kept with the task."
        dirty
        discard={{ question: "Discard your note?", confirmLabel: "Discard note" }}
        feedback={
          <Banner tone="error" title="Not saved. Your note is still here.">
            The error stays inside the dialog, with the typed text kept.
          </Banner>
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button>Resolve task</Button>
          </>
        }
      >
        <Field label="Note" requirement="required">
          {(c) => <Textarea {...c} defaultValue="Called the patient. Stairs are still hard." />}
        </Field>
      </DialogContent>
    </Dialog>
  ),
};

export const ConfirmDialogStory: Story = {
  name: "ConfirmDialog",
  render: () => (
    <ConfirmDialog
      open
      onOpenChange={() => undefined}
      title="Cancel this visit?"
      description="Friday, November 20, 9:00 AM with Dana Whitfield, PT. The time is released to other patients."
      cancelLabel="Keep this visit"
      confirmLabel="Cancel visit"
      pendingLabel="Cancelling"
      tone="danger"
      feedback={
        <Banner tone="error" title="Your visit was not cancelled">
          It is still booked. Check your connection and try again.
        </Banner>
      }
      onConfirm={() => undefined}
    />
  ),
};

export const LeaveGuardDialogStory: Story = {
  name: "LeaveGuardDialog",
  render: () => (
    <LeaveGuardDialog
      guard={{ open: true, stay: () => undefined, leave: () => undefined }}
      description="Your last edits to the care plan draft were not saved."
    />
  ),
};

export const DrawerContentStory: Story = {
  name: "DrawerContent",
  render: () => (
    <Dialog defaultOpen>
      <DrawerContent
        title="Plan version 2"
        description="Published November 12 by Dana Whitfield, PT. Read only."
        closeLabel="Close plan version"
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        }
      >
        <p className="text-body">Sit to stand, 3 sets of 10. Hamstring stretch, hold 30 seconds.</p>
      </DrawerContent>
    </Dialog>
  ),
};

function SheetReasons() {
  const [reason, setReason] = useState("hurts");
  return (
    <RadioGroup aria-label="Why are you skipping it?" value={reason} onValueChange={setReason}>
      <Radio value="hurts" label="It hurts" />
      <Radio value="space" label="I do not have the space or equipment" />
      <Radio value="tired" label="I am too tired today" />
    </RadioGroup>
  );
}

export const BottomSheetContentStory: Story = {
  name: "BottomSheetContent",
  render: () => (
    <Dialog defaultOpen>
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
        <SheetReasons />
      </BottomSheetContent>
    </Dialog>
  ),
};

function PanelDemo() {
  const [open, setOpen] = useState(true);
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
          mode="inline"
        >
          <p className="text-body">Lower back, left side. Pain at worst 6 of 10.</p>
        </SidePanel>
      </div>
    </div>
  );
}

export const SidePanelStory: Story = {
  name: "SidePanel",
  render: () => <PanelDemo />,
};

export const PopoverStory: Story = {
  name: "Popover",
  render: () => (
    <div className="min-h-40">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="quiet">Why this appears</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-body">
            The clinic rule lists check-ins with pain of 7 or higher. Demo default. Not clinically
            reviewed.
          </p>
          <PopoverClose asChild>
            <Button variant="quiet" size="sm">
              Close
            </Button>
          </PopoverClose>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const TooltipStory: Story = {
  name: "Tooltip",
  render: () => (
    <Cases>
      <Case label="Shown on hover and keyboard focus; repeats the accessible name and adds nothing else">
        <div className="min-h-20">
          <TooltipProvider>
            <Tooltip defaultOpen>
              <TooltipTrigger asChild>
                <IconButton label="Close evidence panel" icon="x" tooltip={false} />
              </TooltipTrigger>
              <TooltipContent>Close evidence panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Case>
    </Cases>
  ),
};

export const DropdownMenuStory: Story = {
  name: "DropdownMenu",
  render: () => (
    <div className="min-h-64">
      {/* Non-modal in the story only: a modal menu marks the page behind it hidden while its trigger stays focusable, which axe reports; the menu itself is unchanged. */}
      <DropdownMenu defaultOpen modal={false}>
        <DropdownMenuTrigger asChild>
          <IconButton label="Actions for Avery Demopatient" icon="more" variant="neutral" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Avery Demopatient</DropdownMenuLabel>
          <DropdownMenuItem>Open record</DropdownMenuItem>
          <DropdownMenuItem>Open appointments</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked>Show earlier versions</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            Open care plan builder (only the care team can edit the plan)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};
