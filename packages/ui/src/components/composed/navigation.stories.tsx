import type { Meta, StoryObj } from "@storybook/react-vite";
import { Case, Cases } from "../../stories/helpers";
import { BottomTabBar, SideNav, type NavItem } from "./nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = { title: "Composed/Navigation" } satisfies Meta;
export default meta;
type Story = StoryObj;

const patientNav: NavItem[] = [
  { href: "#today", label: "Today", icon: "home", current: true },
  { href: "#progress", label: "Progress", icon: "activity" },
  { href: "#appointments", label: "Appointments", icon: "calendar" },
  { href: "#messages", label: "Messages", icon: "message", count: 2, countUnit: "unread" },
];

const clinicianNav: NavItem[] = [
  { href: "#overview", label: "Overview", icon: "home", current: true },
  { href: "#schedule", label: "Schedule", icon: "calendar" },
  { href: "#patients", label: "Patients", icon: "users" },
  { href: "#review", label: "Review queue", icon: "clipboard" },
  { href: "#messages", label: "Messages", icon: "message", count: 120, countUnit: "unread" },
];

export const BottomTabBarStory: Story = {
  name: "BottomTabBar",
  render: () => (
    <div className="max-w-md overflow-hidden rounded-container border border-border">
      <div className="h-24 bg-bg p-4 text-small text-ink-muted">Screen content</div>
      <BottomTabBar label="Patient example" items={patientNav} />
    </div>
  ),
};

export const SideNavStory: Story = {
  name: "SideNav",
  render: () => (
    <div className="grid grid-cols-[220px_1fr] overflow-hidden rounded-container border border-border">
      <SideNav label="Clinician example" items={clinicianNav} className="min-h-72" />
      <div className="bg-bg p-4 text-small text-ink-muted">Work list</div>
    </div>
  ),
};

export const TabsStory: Story = {
  name: "Tabs",
  render: () => (
    <Cases>
      <Case label="Record sections">
        <Tabs defaultValue="plan">
          <TabsList aria-label="Record sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plan">Care plan</TabsTrigger>
            <TabsTrigger value="history">Record history</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <h4 className="text-label font-semibold">Overview</h4>
            <p className="mt-1 text-body text-ink-muted">
              Pain, sessions and visits for the last four weeks.
            </p>
          </TabsContent>
          <TabsContent value="plan">
            <h4 className="text-label font-semibold">Care plan</h4>
            <p className="mt-1 text-body text-ink-muted">Version 3, published November 6.</p>
          </TabsContent>
          <TabsContent value="history">
            <h4 className="text-label font-semibold">Record history</h4>
            <p className="mt-1 text-body text-ink-muted">Every published version and every note.</p>
          </TabsContent>
        </Tabs>
      </Case>
    </Cases>
  ),
};
