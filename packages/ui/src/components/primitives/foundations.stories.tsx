import { createPortal } from "react-dom";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases, Row } from "../../stories/helpers";
import { Icon, iconNames } from "./icons";
import { Heading, Mono, Muted, Prose } from "./text";
import { ThemeScope, ThemeWrap } from "./theme";
import { Avatar, DemoNotice, Panel, Skeleton, SkeletonGroup, SkipLink } from "./surfaces";
import { Progress } from "./progress";
import { LiveRegion } from "../../lib/live-region";

const meta = { title: "Primitives/Foundations" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const IconStory: Story = {
  name: "Icon",
  render: () => (
    <Cases>
      <Case label="Every icon, 24 px grid, 1.75 px stroke">
        <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
          {iconNames.map((n) => (
            <li key={n} className="flex flex-col items-center gap-1 text-caption text-ink-muted">
              <Icon name={n} size={22} className="text-ink" />
              <span className="max-w-full truncate">{n}</span>
            </li>
          ))}
        </ul>
      </Case>
      <Case label="With a title, when the icon carries meaning on its own">
        <Row>
          <Icon name="alert-triangle" size={24} title="Warning" className="text-warning-ink" />
        </Row>
      </Case>
    </Cases>
  ),
};

export const HeadingStory: Story = {
  name: "Heading",
  render: () => (
    <Cases>
      <Case label="Levels 1 to 4 from the active theme's scale">
        <div className="flex flex-col gap-3">
          <Heading level={1}>Today</Heading>
          <Heading level={2}>Your plan this week</Heading>
          <Heading level={3}>Knee strengthening</Heading>
          <Heading level={4}>Before you start</Heading>
        </div>
      </Case>
      <Case label="Long text wraps">
        <Heading level={2} as="h3">
          Side-lying hip abduction with resistance band above the knees and a slow return
        </Heading>
      </Case>
    </Cases>
  ),
};

export const MonoStory: Story = {
  name: "Mono",
  render: () => (
    <p className="text-body">
      Record <Mono>CP-204718</Mono> logged <Mono>2026-11-18 08:12 UTC</Mono>, hold <Mono>30 s</Mono>{" "}
      x <Mono>3</Mono>. Tabular numerals: <Mono>1111 / 0000 / 8888</Mono>.
    </p>
  ),
};

export const ProseStory: Story = {
  name: "Prose",
  render: () => (
    <Prose>
      <p>
        Sit on a firm chair with both feet flat. Stop if the pain gets worse than you can manage,
        and tell your therapist afterwards.
      </p>
      <p>
        Your therapist reviews each check-in. If something feels wrong, call the clinic rather than
        waiting for a reply.
      </p>
    </Prose>
  ),
};

export const MutedStory: Story = {
  name: "Muted",
  render: () => (
    <p className="text-body">
      Next visit Friday, November 20 <Muted>(Mountain Time, 45 minutes)</Muted>
    </p>
  ),
};

export const ThemeScopeStory: Story = {
  name: "ThemeScope",
  render: () => (
    <Cases>
      <Case label="The same tokens in two densities, set with data-theme">
        <div className="grid gap-4 md:grid-cols-2">
          {(["patient", "clinician"] as const).map((t) => (
            <ThemeScope
              key={t}
              theme={t}
              className="rounded-container border border-border bg-bg p-4"
            >
              <Heading level={3}>{t === "patient" ? "Patient theme" : "Clinician theme"}</Heading>
              <p className="mt-1 text-body text-ink-muted">
                Same tokens, different density. Set with <Mono>data-theme=&quot;{t}&quot;</Mono>.
              </p>
            </ThemeScope>
          ))}
        </div>
      </Case>
      <Case label="ThemeWrap re-applies the theme to content mounted outside the scope, as overlays are">
        <ThemeScope theme="clinician">
          <p className="text-body text-ink-muted">
            The note below is mounted in the document body and still reads in the clinician theme.
          </p>
          {createPortal(
            <ThemeWrap>
              <p className="p-4 text-small text-ink-muted">
                Portalled content, themed through ThemeWrap.
              </p>
            </ThemeWrap>,
            document.body,
          )}
        </ThemeScope>
      </Case>
    </Cases>
  ),
};

export const PanelStory: Story = {
  name: "Panel",
  render: () => (
    <Panel>
      <Heading level={3}>Plan version 3</Heading>
      <p className="mt-1 text-body text-ink-muted">Published November 6 by Dana Whitfield, PT.</p>
    </Panel>
  ),
};

export const SkeletonStory: Story = {
  name: "Skeleton",
  render: () => (
    <Panel className="flex flex-col gap-2">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </Panel>
  ),
};

export const SkeletonGroupStory: Story = {
  name: "SkeletonGroup",
  render: () => (
    <SkeletonGroup label="Loading your plan">
      <Panel className="flex flex-col gap-2">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </Panel>
    </SkeletonGroup>
  ),
};

export const AvatarStory: Story = {
  name: "Avatar",
  render: () => (
    <Row>
      <span className="inline-flex items-center gap-2 text-body">
        <Avatar name="Dana Whitfield" /> Dana Whitfield, primary therapist
      </span>
      <span className="inline-flex items-center gap-2 text-body">
        <Avatar name="Maria" /> Maria
      </span>
    </Row>
  ),
};

export const DemoNoticeStory: Story = {
  name: "DemoNotice",
  render: () => <DemoNotice />,
};

export const SkipLinkStory: Story = {
  name: "SkipLink",
  render: () => (
    <Cases>
      <Case label="First stop on every shell. Press Tab to see it; hidden until focused.">
        <SkipLink />
        <main id="main" tabIndex={-1} className="text-body text-ink-muted focus:outline-none">
          Main content starts here.
        </main>
      </Case>
    </Cases>
  ),
};

export const ProgressStory: Story = {
  name: "Progress",
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <Progress label="Session" value={3} max={6} valueText="Exercise 3 of 6" />
      <Progress label="Onboarding" value={4} max={11} valueText="Step 4 of 11" />
      <Progress label="Not started" value={0} max={6} />
    </div>
  ),
};

export const LiveRegionStory: Story = {
  name: "LiveRegion",
  render: () => (
    <Cases>
      <Case label="Visible status line">
        <LiveRegion visible message="Saved at 9:12 AM" />
      </Case>
      <Case label="Assertive, for an error that does not move focus">
        <LiveRegion visible politeness="assertive" message="Your note was not saved." />
      </Case>
    </Cases>
  ),
};
