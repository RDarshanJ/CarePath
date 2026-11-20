import type { Metadata } from "next";
import {
  Avatar,
  Banner,
  BottomTabBar,
  Button,
  Checkbox,
  CountBadge,
  DialogPanel,
  EmptyState,
  Field,
  FieldGroup,
  Heading,
  Icon,
  IconButton,
  Link,
  Mono,
  PainScale,
  Panel,
  Progress,
  Radio,
  RadioGroup,
  Select,
  SideNav,
  Skeleton,
  SkeletonGroup,
  StatusChip,
  Switch,
  Tag,
  TextInput,
  Textarea,
  ThemeScope,
  ToastSurface,
  colours,
  contrastPairs,
  contrastRatio,
  elevation,
  iconNames,
  motion,
  overlayClasses,
  radius,
  type NavItem,
  type ThemeName,
} from "@carepath/ui";
import { AIDraftDemo, ChoiceDemo, OverlayDemos, TableDemo, TabsDemo } from "./demos";
import { Label, Row, Section, Specimen } from "./specimen";

export const metadata: Metadata = {
  title: "Design system | CarePath",
  description: "Tokens and components in the patient and clinician themes.",
};

const sections = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["shape", "Shape and depth"],
  ["icons", "Icons"],
  ["buttons", "Buttons"],
  ["fields", "Fields"],
  ["choices", "Choices"],
  ["pain", "Pain scale"],
  ["nav", "Navigation"],
  ["status", "Status and messages"],
  ["surfaces", "Surfaces and states"],
  ["table", "Table"],
  ["ai", "AI draft"],
  ["overlays", "Overlays"],
] as const;

const patientNav: NavItem[] = [
  { href: "#nav", label: "Today", icon: "home", current: true },
  { href: "#nav", label: "Plan", icon: "clipboard" },
  { href: "#nav", label: "Messages", icon: "message" },
  { href: "#nav", label: "Appointments", icon: "calendar" },
];

const clinicianNav: NavItem[] = [
  { href: "#nav", label: "Review queue", icon: "list", current: true, count: 12 },
  { href: "#nav", label: "Patients", icon: "users" },
  { href: "#nav", label: "Messages", icon: "message", count: 3 },
  { href: "#nav", label: "Appointments", icon: "calendar" },
  { href: "#nav", label: "Settings", icon: "settings" },
];

const swatchOrder = [
  "bg",
  "surface",
  "surface-sunken",
  "ink",
  "ink-muted",
  "ink-subtle",
  "primary",
  "primary-hover",
  "primary-subtle",
  "link",
  "selected-bg",
  "selected-ink",
  "border",
  "border-control",
  "focus",
  "success-ink",
  "success-bg",
  "warning-ink",
  "warning-bg",
  "error-ink",
  "error-bg",
  "critical-solid",
  "critical-subtle-bg",
  "info-ink",
  "info-bg",
  "neutral-ink",
  "neutral-bg",
  "ai-bg",
  "ai-ink",
  "ai-rule",
  "accent",
  "accent-subtle",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
] as const;

function Swatches({ theme }: { theme: ThemeName }) {
  const c = colours[theme];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {swatchOrder.map((k) => (
        <li key={k} className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-control border border-border-control"
            style={{ background: `var(--cp-${k})` }}
          />
          <span className="min-w-0 text-caption leading-tight">
            <span className="block truncate font-medium text-ink">{k}</span>
            <Mono className="text-ink-muted">{c[k]}</Mono>
          </span>
        </li>
      ))}
    </ul>
  );
}

function ContrastTable({ theme }: { theme: ThemeName }) {
  const c = colours[theme];
  return (
    <div
      className="max-h-[28rem] overflow-auto rounded-container border border-border bg-surface"
      role="region"
      aria-label={`Contrast pairs, ${theme} theme`}
      tabIndex={0}
    >
      <table className="w-full border-collapse text-table tabular-nums">
        <caption className="sr-only">
          Foreground and background token pairs with WCAG contrast ratios, {theme} theme
        </caption>
        <thead className="sticky top-0 bg-surface-sunken">
          <tr>
            <th scope="col" className="px-2 py-1.5 text-left text-label font-semibold">
              Sample
            </th>
            <th scope="col" className="px-2 py-1.5 text-left text-label font-semibold">
              Pair
            </th>
            <th scope="col" className="px-2 py-1.5 text-right text-label font-semibold">
              Ratio
            </th>
            <th scope="col" className="px-2 py-1.5 text-left text-label font-semibold">
              Needs
            </th>
          </tr>
        </thead>
        <tbody>
          {contrastPairs.map((p) => {
            const ratio = contrastRatio(c[p.fg], c[p.bg]);
            const need = p.rule === "text" ? 4.5 : 3;
            return (
              <tr key={`${p.fg}-${p.bg}`} className="border-t border-border">
                <td className="px-2 py-1">
                  <span
                    className="inline-flex h-6 min-w-12 items-center justify-center rounded-control border border-border px-2 text-caption font-semibold"
                    style={{ background: c[p.bg], color: c[p.fg] }}
                  >
                    Aa 12
                  </span>
                </td>
                <td className="px-2 py-1 text-caption">
                  <Mono>{p.fg}</Mono> on <Mono>{p.bg}</Mono>
                </td>
                <td className="px-2 py-1 text-right font-medium">{ratio.toFixed(2)}:1</td>
                <td className="px-2 py-1 text-caption">
                  {need}:1 {p.rule === "text" ? "text" : "UI"}{" "}
                  <span className="font-medium">{ratio >= need ? "pass" : "FAIL"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <ThemeScope theme="clinician" className="min-h-screen">
      <header className="border-b border-border bg-surface px-gutter py-6">
        <div className="mx-auto max-w-[1400px]">
          <p className="text-caption font-semibold text-ink-muted">CarePath / design system</p>
          <Heading level={1} className="mt-1">
            Tokens and components
          </Heading>
          <p className="mt-2 max-w-3xl text-body text-ink-muted">
            One token set, two themes. Every component below is rendered in the patient theme and
            the clinician theme, with its states. Hover, focus and pressed states are forced with a
            demo attribute so they can be seen at rest; the real controls respond to the real
            interactions. Synthetic content only.
          </p>
          <nav aria-label="Sections" className="mt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <Link href={`#${id}`}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1400px] flex-col gap-10 px-gutter py-8">
        <Section
          id="colour"
          title="Colour"
          intro="Semantic roles, not raw values. Cobalt is for actions, links and selection. Status colours are never cobalt. Generated content is graphite. No purple or magenta, no warm neutrals, no gradients."
        >
          <Specimen title="Roles">{(t) => <Swatches theme={t} />}</Specimen>
          <Specimen title="Contrast, computed from the tokens by the unit test">
            {(t) => <ContrastTable theme={t} />}
          </Specimen>
        </Section>

        <Section
          id="type"
          title="Type"
          intro="IBM Plex Sans 400, 500 and 600, with 400 italic, for all text and headings in both themes. IBM Plex Mono 400 for identifiers. The themes differ in size and density, not typeface. Numerals are tabular in tables and charts."
        >
          <Specimen>
            <div className="flex flex-col gap-3">
              <Heading level={1}>Today</Heading>
              <Heading level={2}>Your plan this week</Heading>
              <Heading level={3}>Knee strengthening</Heading>
              <Heading level={4}>Before you start</Heading>
              <p className="max-w-measure text-body">
                Body text. Sit on a firm chair with both feet flat. Stop if the pain gets worse than
                you can manage, and tell your therapist afterwards.
              </p>
              <p className="max-w-measure text-small text-ink-muted">
                Small text for hints and secondary lines.
              </p>
              <p className="text-caption text-ink-muted">Caption for metadata and timestamps.</p>
              <p className="text-body">
                Record <Mono>PT-1042</Mono> logged <Mono>2026-11-18 08:12 UTC</Mono>, hold{" "}
                <Mono>30 s</Mono> x <Mono>3</Mono>.
              </p>
              <p className="text-caption text-ink-muted">
                Tabular numerals: <span className="tabular-nums">1111 / 0000 / 8888</span>
              </p>
            </div>
          </Specimen>
        </Section>

        <Section
          id="shape"
          title="Shape and depth"
          intro="4 px grid. Radius 6 for controls and 10 for containers, nothing larger. Borders separate surfaces. A shadow appears only on dialogs, drawers, popovers, menus and tooltips."
        >
          <Specimen>
            <Row label="Spacing, multiples of 4 px">
              {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                <span
                  key={n}
                  className="flex flex-col items-center gap-1 text-caption text-ink-muted"
                >
                  <span className="block bg-primary" style={{ width: n * 4, height: 16 }} />
                  {n * 4}
                </span>
              ))}
            </Row>
            <Row label={`Radius ${radius.control} and ${radius.container}`}>
              <span className="flex h-12 w-24 items-center justify-center rounded-control border border-border-control bg-surface text-caption">
                control
              </span>
              <span className="flex h-12 w-32 items-center justify-center rounded-container border border-border-control bg-surface text-caption">
                container
              </span>
            </Row>
            <Row label="Depth: border on surface, shadow only on overlays">
              <span className="flex h-16 w-36 items-center justify-center rounded-container border border-border bg-surface text-caption">
                Panel, border only
              </span>
              <span className="flex h-16 w-36 items-center justify-center rounded-container border border-border-control bg-surface text-caption shadow-overlay">
                Overlay
              </span>
            </Row>
            <p className="max-w-measure text-small text-ink-muted">
              Motion: {motion.fast} ms and {motion.base} ms ease-out on overlays and state changes.
              None on list entry. All durations are set to 0 under prefers-reduced-motion. Overlay
              shadow: <Mono>{elevation.overlay}</Mono>
            </p>
          </Specimen>
        </Section>

        <Section
          id="icons"
          title="Icons"
          intro="Drawn for CarePath on a 24 px grid with a 1.75 px square stroke. They support a label and never replace one, except in IconButton, which requires an accessible name."
        >
          <Specimen>
            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {iconNames.map((n) => (
                <li
                  key={n}
                  className="flex flex-col items-center gap-1 text-caption text-ink-muted"
                >
                  <Icon name={n} size={22} className="text-ink" />
                  <span className="max-w-full truncate">{n}</span>
                </li>
              ))}
            </ul>
          </Specimen>
        </Section>

        <Section
          id="buttons"
          title="Buttons"
          intro="One primary action per screen. Loading keeps the button width and says what is happening in words. Disabled controls stay legible."
        >
          <Specimen>
            {(["primary", "secondary", "quiet", "danger"] as const).map((v) => (
              <Row key={v} label={v}>
                <Button variant={v}>Start session</Button>
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
            ))}
            <Row label="With icon, small, and icon only">
              <Button iconLeft="play">Start today&apos;s session</Button>
              <Button variant="secondary" iconRight="chevron-right">
                Next
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
              <IconButton label="Close" icon="x" />
              <IconButton label="More actions" icon="more" variant="secondary" />
              <IconButton label="Search" icon="search" variant="secondary" size="sm" />
              <IconButton label="Search, disabled" icon="search" variant="secondary" disabled />
            </Row>
          </Specimen>
        </Section>

        <Section
          id="fields"
          title="Fields"
          intro="Every field says required or optional in words and, where it asks for something clinical, why and who sees it. Errors say what is wrong and what to do, with an icon."
        >
          <Specimen>
            <Field
              label="Preferred name"
              requirement="required"
              why="Your care team uses this name when they message you."
            >
              {(c) => <TextInput {...c} defaultValue="Adaeze" autoComplete="off" />}
            </Field>
            <Field
              label="Phone"
              requirement="optional"
              hint="Only used for appointment reminders you turn on."
            >
              {(c) => <TextInput {...c} placeholder="(555) 010-0199" inputMode="tel" />}
            </Field>
            <Field
              label="Date of birth"
              requirement="required"
              error="Enter a date that has already passed, for example 14 03 1962."
            >
              {(c) => <TextInput {...c} defaultValue="14 03 2062" />}
            </Field>
            <Field label="Clinic" requirement="required">
              {(c) => (
                <TextInput {...c} defaultValue="Northside Physical Therapy (demo)" readOnly />
              )}
            </Field>
            <Field label="Referral code" requirement="optional">
              {(c) => <TextInput {...c} defaultValue="Not available" disabled />}
            </Field>
            <Row label="Forced states: hover, focus">
              <TextInput
                aria-label="Hover state"
                data-demo="hover"
                defaultValue="Hover"
                className="max-w-40"
              />
              <TextInput
                aria-label="Focus state"
                data-demo="focus"
                defaultValue="Focus"
                className="max-w-40"
              />
            </Row>
            <Field label="Which side?" requirement="required">
              {(c) => (
                <Select
                  {...c}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                    { value: "both", label: "Both" },
                    { value: "na", label: "Not applicable", disabled: true },
                  ]}
                />
              )}
            </Field>
            <Field label="Side, with a choice made" requirement="optional">
              {(c) => (
                <Select
                  {...c}
                  defaultValue="left"
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                />
              )}
            </Field>
            <Field
              label="Anything else your therapist should know?"
              requirement="optional"
              hint="This goes in your record. Do not use it for emergencies."
            >
              {(c) => <Textarea {...c} />}
            </Field>
          </Specimen>
        </Section>

        <Section
          id="choices"
          title="Choices"
          intro="The whole row is the hit area. Switches also say On or Off in words. Optional sharing defaults to off."
        >
          <Specimen>
            <ChoiceDemo />
            <FieldGroup
              legend="Reminders"
              requirement="optional"
              hint="Reminders never include details about your care."
            >
              <div className="flex flex-col">
                <Checkbox checked={false} label="Unchecked" />
                <Checkbox checked label="Checked" />
                <Checkbox checked="indeterminate" label="Some selected" />
                <Checkbox checked disabled label="Checked, disabled" />
                <Checkbox checked={false} disabled label="Unchecked, disabled" />
              </div>
            </FieldGroup>
            <FieldGroup
              legend="Contact method"
              requirement="required"
              error="Choose how we should contact you."
            >
              <RadioGroup defaultValue="">
                <Radio value="app" label="In the app" hint="Replies appear in Messages." />
                <Radio value="email" label="By email" />
                <Radio
                  value="phone"
                  label="Phone call"
                  disabled
                  hint="Not available at your clinic."
                />
              </RadioGroup>
            </FieldGroup>
            <RadioGroup defaultValue="app" aria-label="Contact method, one selected">
              <Radio value="app" label="In the app" />
              <Radio value="email" label="By email" />
            </RadioGroup>
            <div className="flex flex-col">
              <Switch label="Appointment reminders" hint="Sent the day before." />
              <Switch label="Share my pain log" defaultChecked />
              <Switch label="Quiet hours" disabled hint="Set by your clinic." />
            </div>
          </Specimen>
        </Section>

        <Section
          id="pain"
          title="Pain scale"
          intro="Pain logging takes seconds. The result is spelled out in words and the chart title elsewhere reads &ldquo;Patient-reported pain&rdquo;. This is a self-report scale and is not a diagnosis."
        >
          <Specimen>
            <PainScale />
            <PainScale label="Pain right now, after the session" defaultValue={4} />
            <PainScale label="Pain right now (locked after submit)" defaultValue={7} disabled />
          </Specimen>
        </Section>

        <Section
          id="nav"
          title="Navigation and tabs"
          intro="Patients get a bottom tab bar with four text-labelled destinations. Clinicians and admins get a left rail with work-list counts. The current page is marked by a bar and weight, not colour alone."
        >
          <Specimen
            patient={
              <>
                <div className="overflow-hidden rounded-container border border-border">
                  <div className="h-24 bg-bg p-4 text-small text-ink-muted">Screen content</div>
                  <BottomTabBar label="Patient" items={patientNav} />
                </div>
                <TabsDemo />
              </>
            }
            clinician={
              <>
                <div className="grid grid-cols-[220px_1fr] overflow-hidden rounded-container border border-border">
                  <SideNav
                    label="Clinician"
                    items={clinicianNav}
                    className="min-h-72"
                    footer={<p className="px-2 py-1 text-caption text-ink-muted">J. Alvarez, PT</p>}
                  />
                  <div className="bg-bg p-4 text-small text-ink-muted">Work list</div>
                </div>
                <TabsDemo />
              </>
            }
          />
        </Section>

        <Section
          id="status"
          title="Status and messages"
          intro="Clinical statuses are filled chips with an icon. Administrative statuses are outlined tags with no icon or fill. Never colour alone."
        >
          <Specimen>
            <Row label="Clinical: filled chip with icon">
              <StatusChip tone="warning">Discomfort reported</StatusChip>
              <StatusChip tone="error">Needs review</StatusChip>
              <StatusChip tone="success">On track</StatusChip>
              <StatusChip tone="info">New message</StatusChip>
              <StatusChip tone="neutral">No flags</StatusChip>
            </Row>
            <Row label="Administrative: outlined tag">
              <Tag tone="warning">Intake incomplete</Tag>
              <Tag>Unscheduled</Tag>
              <Tag tone="info">Invited</Tag>
              <Tag tone="success">Enrolled</Tag>
              <Tag tone="error">Access ended</Tag>
            </Row>
            <Row label="Counts">
              <span className="inline-flex items-center gap-2 text-label">
                To review <CountBadge count={12} unit="to review" />
              </span>
              <span className="inline-flex items-center gap-2 text-label">
                Unread <CountBadge count={3} unit="unread" />
              </span>
            </Row>
            <Banner tone="info" title="Messages are not monitored for emergencies">
              If you need urgent help, call your clinic or local emergency number.
            </Banner>
            <Banner tone="success" title="Plan published">
              Your patient sees version 4 from tomorrow.
            </Banner>
            <Banner
              tone="warning"
              title="Two sessions were missed this week"
              action={
                <Button size="sm" variant="secondary">
                  Message patient
                </Button>
              }
            >
              The rule that flagged this is set by your clinic and can be changed in Settings.
            </Banner>
            <Banner
              tone="error"
              title="We could not save your check-in"
              action={
                <Button size="sm" variant="secondary">
                  Try again
                </Button>
              }
            >
              Your answers are kept on this device and nothing was lost.
            </Banner>
          </Specimen>
        </Section>

        <Section
          id="surfaces"
          title="Surfaces and states"
          intro="Panels use a border and radius 10, with no shadow. Empty states explain why and what fills them. Skeletons mirror the final layout and do not animate."
        >
          <Specimen>
            <Panel>
              <Heading level={4} as="h3">
                Today&apos;s session
              </Heading>
              <p className="mt-1 max-w-measure text-body text-ink-muted">
                Knee strengthening, 12 minutes, 6 exercises. Set by your care team.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name="Jordan Alvarez" />
                <p className="text-body">
                  <span className="font-medium">Jordan Alvarez</span>
                  <span className="block text-small text-ink-muted">
                    Physical therapist. Usually replies within one working day.
                  </span>
                </p>
              </div>
            </Panel>
            <Progress label="Session progress" value={3} max={6} valueText="3 of 6 exercises" />
            <Progress label="Weekly sessions" value={0} max={5} valueText="0 of 5 sessions" />
            <Progress label="Plan complete" value={5} max={5} valueText="5 of 5 sessions" />
            <EmptyState
              icon="calendar"
              title="No appointments yet"
              action={<Button variant="secondary">Find a time</Button>}
            >
              Appointments you book with your therapist appear here, with a reminder the day before.
            </EmptyState>
            <SkeletonGroup label="Loading your plan">
              <Panel className="flex flex-col gap-2">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-1 h-control w-40" />
              </Panel>
            </SkeletonGroup>
          </Specimen>
        </Section>

        <Section
          id="table"
          title="Table"
          intro="Dense by design in the clinician theme: 36 px rows, 13/18 type, tabular numerals, sortable headers that announce direction, a selected row marked by a bar as well as tint. Charts get a table alternative like this one."
        >
          <Specimen>
            <TableDemo />
          </Specimen>
        </Section>

        <Section
          id="ai"
          title="AI draft"
          intro="Generated content is a labelled draft: dashed left rule, the fixed label and the provider name. Approval, edit and rejection are logged elsewhere; nothing here leaves the clinic. No sparkle icons."
        >
          <Specimen>
            <AIDraftDemo />
          </Specimen>
        </Section>

        <Section
          id="overlays"
          title="Overlays"
          intro="Dialogs, side panels, bottom sheets, popovers, menus, tooltips and toasts. These are the only places a shadow appears. Live triggers first, then static specimens of the open surfaces."
        >
          <Specimen>
            <OverlayDemos />
            <Label>Static specimens (open state)</Label>
            <div className={`rounded-container p-6 ${overlayClasses.surface}`}>
              <DialogPanel
                title="Discard this draft?"
                description="The draft is removed from your queue. The discard is recorded in the audit log."
                footer={
                  <>
                    <Button variant="secondary">Keep draft</Button>
                    <Button variant="danger">Discard draft</Button>
                  </>
                }
              />
            </div>
            <div className={`${overlayClasses.popover} max-w-72`}>
              <p className="text-label font-semibold">Popover</p>
              <p className="mt-1 text-body text-ink-muted">
                Short, optional explanation that does not block the page.
              </p>
            </div>
            <div className={`max-w-56 ${overlayClasses.menu}`}>
              <div className={`${overlayClasses.menuItem} bg-primary-subtle`}>Open record</div>
              <div className={overlayClasses.menuItem}>Message patient</div>
              <div className={`${overlayClasses.menuItem} text-disabled-ink`}>
                Archive (needs admin)
              </div>
            </div>
            <span className="inline-block max-w-64 rounded-control bg-ink px-2.5 py-1.5 text-small text-ink-inverse shadow-overlay">
              Tooltip, supplementary only
            </span>
            <ToastSurface
              tone="success"
              title="Check-in sent"
              description="Your therapist will see this."
            />
            <ToastSurface
              tone="error"
              title="Message not sent"
              description="Your text is saved. Try again when you are online."
            />
          </Specimen>
        </Section>
      </main>
    </ThemeScope>
  );
}
