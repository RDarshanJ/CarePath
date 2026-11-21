import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases, Row } from "../../stories/helpers";
import { CountBadge, StatusChip, Tag } from "./status";

const meta = { title: "Primitives/Status" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const StatusChipStory: Story = {
  name: "StatusChip",
  render: () => (
    <Case label="Needs attention or live: filled tint, icon and words">
      <Row>
        <StatusChip tone="warning">Discomfort reported</StatusChip>
        <StatusChip tone="critical">Stopped for discomfort</StatusChip>
        <StatusChip tone="error">Not sent</StatusChip>
        <StatusChip tone="info">In progress today</StatusChip>
        <StatusChip tone="success">Reviewed</StatusChip>
        <StatusChip tone="neutral">Not yet reviewed</StatusChip>
      </Row>
    </Case>
  ),
};

export const TagStory: Story = {
  name: "Tag",
  render: () => (
    <Case label="Administrative: outlined, text only">
      <Row>
        <Tag tone="warning">Intake incomplete</Tag>
        <Tag tone="success">Current</Tag>
        <Tag>Earlier version</Tag>
        <Tag tone="info">Preview, not published</Tag>
        <Tag tone="error">Cancelled by the patient</Tag>
      </Row>
    </Case>
  ),
};

export const CountBadgeStory: Story = {
  name: "CountBadge",
  render: () => (
    <Cases>
      <Case label="Hidden at zero, 99+ above 99, unit in the accessible text">
        <Row>
          <span className="inline-flex items-center gap-2 text-label">
            Messages <CountBadge count={3} unit="unread" />
          </span>
          <span className="inline-flex items-center gap-2 text-label">
            Review queue <CountBadge count={120} unit="open" />
          </span>
          <span className="inline-flex items-center gap-2 text-label">
            Nothing new <CountBadge count={0} unit="unread" />
          </span>
        </Row>
      </Case>
    </Cases>
  ),
};
