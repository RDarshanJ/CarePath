import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases, Row } from "../../stories/helpers";
import { Banner } from "./banner";
import { EmptyState } from "./empty-state";
import { ErrorSummary } from "./error-summary";
import { LoadingStatus, Spinner } from "./loading";
import { Timer } from "./timer";
import { ToastProvider, ToastSurface, useToast } from "./toast";
import { Button } from "../primitives/button";
import { Field } from "../primitives/field";
import { TextInput } from "../primitives/inputs";
import type { SummaryError } from "./error-summary";

const meta = { title: "Composed/Feedback" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const BannerStory: Story = {
  name: "Banner",
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Banner tone="info" title="Your plan changed">
        Version 3, published November 18 by Dana Whitfield, PT.
      </Banner>
      <Banner tone="success" title="Saved">
        Version 4 is published. Your patient sees it from now on.
      </Banner>
      <Banner tone="warning" title="This page may be out of date">
        Last updated 9:02 AM.
      </Banner>
      <Banner
        tone="error"
        title="Your check-in was not sent"
        action={
          <Button size="sm" variant="secondary">
            Retry sending check-in
          </Button>
        }
      >
        Your answers are kept on this page.
      </Banner>
    </div>
  ),
};

export const EmptyStateStory: Story = {
  name: "EmptyState",
  render: () => (
    <div className="flex max-w-2xl flex-col gap-4">
      <EmptyState
        icon="calendar"
        title="No visits booked"
        action={<Button variant="secondary">Book a visit</Button>}
      >
        Visits you book with your therapist appear here.
      </EmptyState>
      <EmptyState icon="search" title="No patients match" padded>
        Try fewer filters, or check the spelling.
      </EmptyState>
    </div>
  ),
};

function SummaryForm() {
  const id = useId();
  const [errors] = useState<SummaryError[]>([
    { targetId: `${id}-name`, message: "Enter the exercise name" },
    { targetId: `${id}-reps`, message: "Enter repetitions from 1 to 100" },
  ]);
  return (
    <form noValidate className="flex max-w-md flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={0} title="Fix these before you save" />
      <Field
        label="Exercise name"
        requirement="required"
        id={`${id}-name`}
        error={errors[0]?.message}
      >
        {(c) => <TextInput {...c} />}
      </Field>
      <Field
        label="Repetitions"
        requirement="required"
        hint="From 1 to 100."
        id={`${id}-reps`}
        error={errors[1]?.message}
      >
        {(c) => (
          <TextInput
            {...c}
            inputMode="numeric"
            unit="reps"
            defaultValue="140"
            className="max-w-24"
          />
        )}
      </Field>
    </form>
  );
}

export const ErrorSummaryStory: Story = {
  name: "ErrorSummary",
  render: () => <SummaryForm />,
};

export const SpinnerStory: Story = {
  name: "Spinner",
  render: () => (
    <Row>
      <span className="inline-flex items-center gap-2 text-body">
        <Spinner /> Saving your note
      </span>
    </Row>
  ),
};

export const LoadingStatusStory: Story = {
  name: "LoadingStatus",
  render: () => (
    <Cases>
      <Case label="Loading. After ten seconds the line says it is taking longer and offers a retry.">
        <LoadingStatus
          label="Loading open times"
          retry={
            <Button variant="quiet" size="sm">
              Try loading times again
            </Button>
          }
        />
      </Case>
    </Cases>
  ),
};

export const TimerStory: Story = {
  name: "Timer",
  render: () => (
    <Cases>
      <Case label="Hold, paused at 30 seconds">
        <Timer label="Hold" seconds={30} running={false} noun="Hold" />
      </Case>
      <Case label="Rest, 45 seconds">
        <Timer label="Rest" seconds={45} running={false} noun="Rest" />
      </Case>
    </Cases>
  ),
};

function ToastButtons() {
  const toast = useToast();
  return (
    <Button
      variant="neutral"
      onClick={() =>
        toast({ tone: "success", title: "Link copied", description: "Paste it in a message." })
      }
    >
      Show a toast
    </Button>
  );
}

export const ToastSurfaceStory: Story = {
  name: "ToastSurface",
  render: () => (
    <Cases>
      <Case label="Static surfaces. There is no error toast: errors are banners in place.">
        <div className="flex max-w-sm flex-col gap-2">
          <ToastSurface
            tone="success"
            title="Version 3 published"
            description="Patients see it now."
          />
          <ToastSurface tone="info" title="Link copied" />
        </div>
      </Case>
      <Case label="Live toast through the provider">
        <ToastProvider>
          <ToastButtons />
        </ToastProvider>
      </Case>
    </Cases>
  ),
};
