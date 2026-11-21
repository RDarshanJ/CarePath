import type { Metadata } from "next";
import {
  Banner,
  Button,
  CountBadge,
  DialogPanel,
  EmptyState,
  Field,
  Heading,
  Icon,
  IconButton,
  Link,
  Mono,
  PainScale,
  Panel,
  Progress,
  Skeleton,
  SkipLink,
  SkeletonGroup,
  StatusChip,
  Tag,
  TextInput,
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
  type ThemeName,
} from "@carepath/ui";
import {
  BannerFocusDemo,
  ChoiceDemo,
  ConfirmDemo,
  CountedNoteDemo,
  DateOfBirthDemo,
  DrawerDemo,
  ErrorSummaryDemo,
  LeaveGuardDemo,
  LoadMoreDemo,
  LoadingDemo,
  NavDemo,
  NoteDialogDemo,
  PainDemo,
  PopoverMenuDemo,
  SegmentedDemo,
  SheetDemo,
  SidePanelDemo,
  SlotDemo,
  TableDemo,
  TimerDemo,
  ToastDemo,
  ToggleChipDemo,
  UrlTabsDemo,
} from "./demos";
import { HealthcareIndex } from "./healthcare/families";
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
  ["buttons", "Buttons and links"],
  ["fields", "Fields"],
  ["choices", "Choices"],
  ["pain", "Pain scale"],
  ["status", "Status"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["nav", "Navigation"],
  ["table", "Tables"],
  ["healthcare", "Healthcare components"],
] as const;

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
                  {p.rule === "ui" ? (
                    // UI pairs (borders, fills, marks) are judged at 3:1 as non-text: a swatch, not text.
                    <span
                      aria-hidden="true"
                      className="inline-flex h-6 min-w-12 items-center justify-center rounded-control border border-border px-2"
                      style={{ background: c[p.bg] }}
                    >
                      <span className="block h-0.5 w-6" style={{ background: c[p.fg] }} />
                    </span>
                  ) : (
                    <span
                      className="inline-flex h-6 min-w-12 items-center justify-center rounded-control border border-border px-2 text-caption font-semibold"
                      style={{ background: c[p.bg], color: c[p.fg] }}
                    >
                      Aa 12
                    </span>
                  )}
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
      <SkipLink />
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
                  <Link href={`#${id}`} variant="standalone">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex max-w-[1400px] flex-col gap-10 px-gutter py-8 focus:outline-none"
      >
        <Section
          id="colour"
          title="Colour"
          intro="Semantic roles, not raw values. Cobalt is for actions, links and selection. Status colours are never cobalt. Generated content is graphite. No purple or magenta, no warm neutrals, no gradients."
        >
          <Specimen id="colour-roles" title="Roles">
            {(t) => <Swatches theme={t} />}
          </Specimen>
          <Specimen
            id="colour-contrast"
            title="Contrast, computed from the tokens by the unit test"
          >
            {(t) => <ContrastTable theme={t} />}
          </Specimen>
        </Section>

        <Section
          id="type"
          title="Type"
          intro="IBM Plex Sans 400, 500 and 600, with 400 italic, for all text and headings in both themes. IBM Plex Mono 400 for identifiers. The themes differ in size and density, not typeface. Numerals are tabular in tables and charts."
        >
          <Specimen id="type-scale">
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
          <Specimen id="shape-depth">
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
          <Specimen id="icon-set">
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
          title="Buttons and links"
          intro="One primary per context. Secondary is the cobalt outline for the supporting action; neutral is for utility actions such as Pause or Refresh; quiet is the third tier. Danger appears only as the confirming button of a destructive dialog. The control that starts a safety action uses the critical tone with its icon and words. Navigation is a link, also when it looks like a button."
        >
          <Specimen id="button-variants">
            {(["primary", "secondary", "neutral", "quiet", "danger"] as const).map((v) => (
              <Row key={v} label={v}>
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
            ))}
          </Specimen>
          <Specimen id="button-critical-unavailable">
            {(t) => (
              <>
                <Row label="Critical tone: starts a safety action">
                  <Button variant="secondary" tone="critical">
                    Stop, this hurts
                  </Button>
                  <Button variant="secondary" tone="critical" data-demo="hover">
                    Hover
                  </Button>
                </Row>
                <Row label="Unavailable: stays focusable, reason in text">
                  <Button unavailable aria-describedby={`${t}-publish-reason`}>
                    Review and publish version 2
                  </Button>
                  <p id={`${t}-publish-reason`} className="text-small text-ink-muted">
                    Add at least one exercise to publish.
                  </p>
                </Row>
                <Row label="Link that looks like a button, full width on a phone">
                  <Button href="#buttons" fullWidthOnPhone>
                    Start today&apos;s session
                  </Button>
                  <Button href="#buttons" variant="secondary">
                    Open care plan builder
                  </Button>
                </Row>
                <Row label="Icon only: close, dismiss, move; the name shows on hover and focus">
                  <IconButton label="Close evidence panel" icon="x" />
                  <IconButton label="Move Sit to stand up" icon="arrow-up" variant="neutral" />
                  <IconButton label="Move Sit to stand down" icon="arrow-down" variant="neutral" />
                </Row>
              </>
            )}
          </Specimen>
          <Specimen id="links">
            <p className="max-w-measure text-body">
              Inline links sit in a sentence:{" "}
              <Link href="#links">read how your data is shared</Link>. Phone numbers show the
              number: <Link href="tel:5550100199">(555) 010-0199</Link>.
            </p>
            <Row label="Standalone links get the theme's target height">
              <Link href="#links" variant="standalone">
                See all progress
              </Link>
              <Link href="#links" variant="standalone" data-demo="hover">
                Hover
              </Link>
              <Link href="#links" variant="standalone" data-demo="focus">
                Focus
              </Link>
            </Row>
          </Specimen>
        </Section>

        <Section
          id="fields"
          title="Fields and validation"
          intro="Field is the only label, hint and error wrapper. Required or optional is said in words. The error sits above the control and repeats the field's wording. On submit, an error summary takes focus and each line moves focus to its field; the page title starts with Error."
        >
          <Specimen id="field-states">
            <Field
              label="Preferred name"
              requirement="required"
              why="Your care team uses this name when they message you."
            >
              {(c) => <TextInput {...c} defaultValue="Avery" autoComplete="given-name" />}
            </Field>
            <Field label="Phone" requirement="optional" hint="For example, (555) 010-0199.">
              {(c) => <TextInput {...c} inputMode="tel" autoComplete="tel" />}
            </Field>
            <Field
              label="Hold time"
              requirement="required"
              hint="From 5 to 120."
              error="Enter a hold time from 5 to 120 seconds"
            >
              {(c) => <TextInput {...c} defaultValue="300" inputMode="numeric" unit="seconds" />}
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
            <CountedNoteDemo />
          </Specimen>
          <Specimen id="error-summary" title="Error summary, live">
            <ErrorSummaryDemo />
          </Specimen>
          <Specimen id="date-of-birth" title="Date of birth" only="patient">
            <DateOfBirthDemo />
            <DateOfBirthDemo error />
          </Specimen>
        </Section>

        <Section
          id="choices"
          title="Choices and selection"
          intro="Radios for one choice among a few, checkboxes for many, a switch for a setting that applies at once. Two or three exclusive options that change a list use a segmented control. Filters are toggle chips; a time slot is a button that moves the booking on. Selected states show a fill and a check mark, never fill alone."
        >
          <Specimen id="choice-controls">
            <ChoiceDemo />
          </Specimen>
          <Specimen id="segmented-control" only="clinician">
            <SegmentedDemo />
          </Specimen>
          <Specimen id="toggle-chips-slots" only="patient">
            <ToggleChipDemo />
            <SlotDemo />
          </Specimen>
        </Section>

        <Section
          id="pain"
          title="Pain scale"
          intro="Patient-reported pain from 0 to 10. The ends read 0 No pain and 10 Worst pain imaginable, and both are read by screen readers. The line under the scale states only the number. Items stay at least 48 px: 0 to 5 and 6 to 10 on a phone, one row when there is room."
        >
          <Specimen id="pain-scale" only="patient">
            <PainDemo />
            <PainScale label="Pain right now, after the session" defaultValue={8} stoppedAt={8} />
            <PainScale
              label="How much does it hurt right now?"
              error="Choose a pain number from 0 to 10 before you send this"
            />
            <PainScale label="Pain right now (sending)" defaultValue={7} disabled />
          </Specimen>
        </Section>

        <Section
          id="status"
          title="Status and counts"
          intro="An expected state is plain text. An administrative state is an outlined tag with no icon. A state that needs attention or is live is a filled chip with an icon and words. Counts use one filled badge whose accessible text carries the unit; it is hidden at zero and shows 99+ above 99."
        >
          <Specimen id="status-chips-tags">
            <Row label="Needs attention or live: chip">
              <StatusChip tone="warning">Discomfort reported</StatusChip>
              <StatusChip tone="critical">Stopped for discomfort</StatusChip>
              <StatusChip tone="error">Not sent</StatusChip>
              <StatusChip tone="info">In progress today</StatusChip>
              <StatusChip tone="success">Reviewed</StatusChip>
              <StatusChip tone="neutral">Not yet reviewed</StatusChip>
            </Row>
            <Row label="Administrative: tag">
              <Tag tone="warning">Intake incomplete</Tag>
              <Tag tone="success">Current</Tag>
              <Tag>Earlier version</Tag>
              <Tag tone="info">Preview, not published</Tag>
              <Tag tone="warning">Cancelled by the patient</Tag>
            </Row>
            <Row label="Counts">
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
          </Specimen>
        </Section>

        <Section
          id="feedback"
          title="Feedback, empty and loading"
          intro="Messages tied to a place are banners in that place: an error says what happened, whether data is safe and one next step, and takes focus after an action. Toasts are for low-priority success with no other visible state; there is no error toast, one shows at a time, and they wait while a dialog is open. Skeletons mirror the layout and do not move; long loads say so."
        >
          <Specimen id="banners">
            <Banner tone="info" title="Your plan changed">
              Version 3, published November 18 by Terry Demotherapist.
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
                <Button size="sm" variant="neutral">
                  Retry sending check-in
                </Button>
              }
            >
              Your answers are kept on this page.
            </Banner>
            <BannerFocusDemo />
          </Specimen>
          <Specimen id="empty-loading">
            <EmptyState
              icon="calendar"
              title="No visits booked"
              action={<Button variant="neutral">Book a visit</Button>}
            >
              Visits you book with your therapist appear here.
            </EmptyState>
            <EmptyState icon="search" title="No patients match" padded>
              Try fewer filters, or check the spelling.
            </EmptyState>
            <SkeletonGroup label="Loading your plan">
              <Panel className="flex flex-col gap-2">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </Panel>
            </SkeletonGroup>
            <LoadingDemo />
            <Progress label="Session" value={3} max={6} valueText="Exercise 3 of 6" />
            <Progress label="Onboarding" value={4} max={11} valueText="Step 4 of 11" />
          </Specimen>
          <Specimen id="timer" only="patient">
            <TimerDemo />
          </Specimen>
          <Specimen id="toasts" only="clinician">
            <ToastDemo />
            <div className="flex max-w-sm flex-col gap-2">
              <ToastSurface
                tone="success"
                title="Version 3 published"
                description="Patients see it now."
              />
              <ToastSurface tone="info" title="Link copied" />
            </div>
          </Specimen>
        </Section>

        <Section
          id="overlays"
          title="Overlays"
          intro="One overlay at a time. Each has a visible title, a close control and Esc, unless there is typed text: then outside clicks do nothing and Esc or close asks to discard, in place. A confirmation is an alert dialog with outcome-named buttons and focus on the safe one. Errors from an action stay inside the overlay. Side-by-side work starts at 1280 px; below it the panel is a drawer, below 768 px a full screen. The patient sheet is a centred dialog from 768 px."
        >
          <Specimen id="dialogs">
            <Row>
              <NoteDialogDemo />
              <ConfirmDemo />
              <DrawerDemo />
              <PopoverMenuDemo />
            </Row>
            <Label>Static specimen of an open dialog</Label>
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
          </Specimen>
          <Specimen id="sheet" only="patient">
            <SheetDemo />
          </Specimen>
          <Specimen
            id="side-panel"
            only="clinician"
            title="Side panel (resize the window: 1280, 768)"
          >
            <SidePanelDemo />
          </Specimen>
          <Specimen id="leave-guard" only="clinician" title="Leave guard">
            <LeaveGuardDemo />
          </Specimen>
        </Section>

        <Section
          id="nav"
          title="Navigation and tabs"
          intro="The current page is marked by the selected fill, an edge bar, weight and aria-current. Record sections keep the tab in the address with a history entry per change, so Back returns to the previous section. A skip link is the first stop on every shell."
        >
          <Specimen id="navigation">{(t) => <NavDemo theme={t} />}</Specimen>
          <Specimen id="url-tabs" only="clinician">
            <UrlTabsDemo />
          </Specimen>
          <Specimen id="skip-link">
            <p className="text-small text-ink-muted">
              Press Tab from the top of any app page; the first stop is the link below, shown here
              in its focused state.
            </p>
            <div>
              <a
                href="#main"
                data-demo="focus"
                className="inline-flex min-h-target items-center rounded-control bg-surface px-3 py-2 text-label font-medium text-link underline focus-visible:focus-ring"
              >
                Skip to main content
              </a>
            </div>
          </Specimen>
        </Section>

        <Section
          id="table"
          title="Tables, paging and filters"
          intro="A native table with a caption and one header row. Only columns the API can sort have sort buttons, and they say their direction. The selected row has a fill and an edge bar. Tables page with Previous and Next, hidden at the ends; feeds use one Show more control. The filter bar is a named search landmark; the search text never goes in the address."
        >
          <Specimen id="data-table" only="clinician">
            <TableDemo />
          </Specimen>
          <Specimen id="load-more" only="clinician">
            <LoadMoreDemo />
          </Specimen>
        </Section>

        <Section
          id="healthcare"
          title="Healthcare components"
          intro="The healthcare layer (patient identity, clinical data, planning, visits, messages, generated drafts and consent) has its own pages, one per family, with every state on synthetic content."
        >
          <div data-specimen="healthcare-index">
            <HealthcareIndex />
          </div>
        </Section>
      </main>
    </ThemeScope>
  );
}
