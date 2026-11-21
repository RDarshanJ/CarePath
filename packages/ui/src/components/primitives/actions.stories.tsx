import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases, Row } from "../../stories/helpers";
import { Button, IconButton } from "./button";
import { Link, LinkProvider } from "./link";

const meta = { title: "Primitives/Actions" } satisfies Meta;
export default meta;
type Story = StoryObj;

const variants = ["primary", "secondary", "neutral", "quiet", "danger"] as const;

export const ButtonStory: Story = {
  name: "Button",
  render: () => (
    <Cases>
      {variants.map((v) => (
        <Case key={v} label={v}>
          <Row>
            <Button variant={v}>Save draft</Button>
            <Button variant={v} data-demo="hover">
              Hover
            </Button>
            <Button variant={v} data-demo="focus">
              Focus
            </Button>
            <Button variant={v} data-demo="active">
              Pressed
            </Button>
            <Button variant={v} disabled>
              Disabled
            </Button>
            <Button variant={v} loading loadingLabel="Saving">
              Save
            </Button>
          </Row>
        </Case>
      ))}
      <Case label="Critical tone: starts a safety action">
        <Row>
          <Button variant="secondary" tone="critical">
            Stop, this hurts
          </Button>
        </Row>
      </Case>
      <Case label="Unavailable: stays focusable, the reason is in text">
        <Row>
          <Button unavailable aria-describedby="story-publish-reason">
            Review and publish version 2
          </Button>
          <p id="story-publish-reason" className="text-small text-ink-muted">
            Add at least one exercise to publish.
          </p>
        </Row>
      </Case>
      <Case label="Small, with icons">
        <Row>
          <Button size="sm" variant="secondary" iconLeft="plus">
            Add exercise
          </Button>
          <Button size="sm" variant="neutral" iconRight="chevron-right">
            Next
          </Button>
        </Row>
      </Case>
      <Case label="Navigation that looks like a button, full width on a phone">
        <Row>
          <Button href="#today" fullWidthOnPhone>
            Start today&apos;s session
          </Button>
          <Button href="#plan" variant="secondary">
            Open care plan builder
          </Button>
        </Row>
      </Case>
    </Cases>
  ),
};

export const IconButtonStory: Story = {
  name: "IconButton",
  render: () => (
    <Cases>
      <Case label="Close, dismiss and move. The name shows on hover and keyboard focus.">
        <Row>
          <IconButton label="Close evidence panel" icon="x" />
          <IconButton label="Move Sit to stand up" icon="arrow-up" variant="neutral" />
          <IconButton label="Move Sit to stand down" icon="arrow-down" variant="neutral" />
          <IconButton
            label="Actions for Avery Demopatient"
            icon="more"
            variant="neutral"
            size="sm"
          />
        </Row>
      </Case>
      <Case label="Unavailable at the end of a list">
        <Row>
          <IconButton
            label="Move Bridge up, unavailable: first exercise"
            icon="arrow-up"
            unavailable
          />
        </Row>
      </Case>
    </Cases>
  ),
};

export const LinkStory: Story = {
  name: "Link",
  render: () => (
    <Cases>
      <Case label="Inline, inside a sentence">
        <p className="max-w-measure text-body">
          <Link href="#sharing">Read how your data is shared</Link>, or call the clinic on{" "}
          <Link href="tel:5550100199">(555) 010-0199</Link>.
        </p>
      </Case>
      <Case label="Standalone, with the theme's target height">
        <Row>
          <Link href="#progress" variant="standalone">
            See all progress
          </Link>
          <Link href="#progress" variant="standalone" data-demo="hover">
            Hover
          </Link>
          <Link href="#progress" variant="standalone" data-demo="focus">
            Focus
          </Link>
        </Row>
      </Case>
      <Case label="The app sets its router link once with LinkProvider; in-app links then use it">
        <LinkProvider component="a">
          <Link href="#plan" variant="standalone">
            Open the care plan
          </Link>
        </LinkProvider>
      </Case>
    </Cases>
  ),
};
