# CarePath component usage matrix

Facts from code read on 2026-11-20 (paths relative to repo root; `W` = `apps/web/app`, `UI` = `packages/ui/src/components`). Verdicts: keep / consolidate (duplicate of X) / replace (inappropriate for use case) / remove (unnecessary) / inaccessible. A verdict is a finding for the next research and design steps, not a decision. Items marked "unused in routes" were found only in `/design-system`.

## A. Components and patterns in use

### A1. From `packages/ui`

| Component | Where used | Use case | Data dependency | Verdict |
|---|---|---|---|---|
| `Button` | every route | actions | none | keep. Variant misuse listed in section G. |
| `IconButton` | `W/(clinician)/patients/[patientId]/plan/item-editor.tsx` (move up/down); inside `Dialog`, `DrawerContent`, `Toast` for close/dismiss | icon-only controls | label required | keep. See section D. |
| `Field`, `FieldGroup`, `TextInput`, `Textarea` | login, onboarding, check-in, cancel-visit, booking reason, publish dialog, builder details, queue NoteDialog, inbox composer (partly) | text entry | form state | keep; but builder, item-editor, library, filters bypass `Field` (A3). |
| `Select` | clinician directory, queue, library, admin | filters, rows per page | static option lists | keep. Used as filter control only; no form selects in patient app. |
| `Checkbox`, `Radio`, `RadioGroup`, `Switch` | onboarding, check-in, session dialogs, booking, consent, admin assign, item-editor | choices | form state | keep. |
| `PainScale` | check-in, onboarding (x3), session stop sheet | patient-reported pain 0-10 | number or null | keep. |
| `Tabs` | patient record (6 tabs, URL-driven), plan builder (3) | section switching | query param | keep. |
| `SideNav` | `apps/web/components/shells.tsx` | clinician and admin nav | route list, unread count | keep. |
| `BottomTabBar`, `CountBadge` | unused in routes (gallery only) | patient nav; counts | none | consolidate: patient nav re-implements both (A3). |
| `StatusChip`, `Tag` | see section C | status | various enums | keep components; fix usage (C). |
| `Banner` | all apps | inline messages | message strings | keep. Hand-built banners exist (A3). |
| `Table` family | consent, progress, clinician directory/queue/schedule/appointments/record tabs, admin | tabular data | lists | keep. Header row built two ways (A3). |
| `Panel` | booking confirm only | container | none | consolidate: clinician `Section`, patient bordered lists and cards repeat the same border/radius classes. |
| `EmptyState` | patient pages, admin, clinician via `Empty` wrapper | empty lists | none | keep. |
| `Skeleton`, `SkeletonGroup` | clinician `ListSkeleton`, booking, admin, context | loading | none | keep. |
| `Avatar` | staff shell footer | identity | name | keep. Only identity element in the product; no patient avatar or photo anywhere. |
| `Progress` | onboarding, session player, today | progress | counts | keep. |
| `Dialog`, `DialogContent` | cancel visit, contact care team, publish, assign, note dialog, library drawer | confirmations, forms | local state | keep. |
| `DrawerContent` | session skip/stop sheets (bottom), review task detail below xl (right), version drawer (right), plan library below wide (right) | secondary surfaces | selection | keep. |
| `Popover`, `DropdownMenu`, `Tooltip` | unused in routes (`TooltipProvider` mounted in `W/(clinician)/_lib/context.tsx`) | none | none | remove from the provider tree or use; currently dead weight. Cell `title` attributes are used instead of Tooltip (A3). |
| `AIDraftBlock`, `EvidenceRef` | unused in routes | AI output labelling | none | keep as specified; no product screen consumes them. API has modules for care plans and records but web has no AI or clinical-note route. |
| `ToastProvider`, `useToast` | clinician only (`context.tsx`) | feedback | message | keep; see section E. |
| `Link` | patient-frame tel link, onboarding header | text link | href | consolidate with `TextLink` and `AppLink` (A2). |
| `Heading`, `Muted`, `Mono`, `Prose` | widely | typography | none | keep. Several screens use raw `<h2>/<h3>/<h4>` with classes (queue, plan-view, item-editor, builder). |
| `DemoNotice` | root layout | persistent notice | none | keep. |
| `ThemeScope` | route group layouts | theme | none | keep. |

### A2. App-level shared components

| Component | Where defined / used | Use case | Verdict |
|---|---|---|---|
| `IllustrationFigure`, `MomentImage` | `apps/web/components/illustration.tsx`; patient plan, session, onboarding, clinician `PlanView`, empty states | exercise and body-area pictures; decorative moments | keep. |
| `SignOutButton` | `apps/web/components/sign-out-button.tsx` | sign out | keep. Error is hand-built alert (A3). |
| `SkipLink` | `shells.tsx` and `patient-frame.tsx` (two copies) | skip nav | consolidate (one copy in `components/`). Missing on `/onboarding`, `/login`. |
| `PatientFrame` (+ `BottomNav`, `HeaderNav`, `UnreadCount`, `ContactCareTeam`) | `(patient)/_components/patient-frame.tsx` | patient chrome | keep frame; consolidate `BottomNav` with `ui BottomTabBar` and `UnreadCount` with `CountBadge`. |
| `StaffShell` | `shells.tsx` | clinician and admin chrome | keep. |
| `ButtonLink` | `(patient)/_components/button-link.tsx` | link styled as button | consolidate to `ui` (clinician writes `<Button asChild><NextLink>` inline in `record.tsx`, `tabs.tsx`). |
| `TextLink` / `AppLink` / `ui Link` | `(patient)/_components/text-link.tsx`; `(clinician)/_components/common.tsx`; `UI/surfaces.tsx` | in-app text link | consolidate (three implementations with slightly different classes: `TextLink` adds `text-label font-medium`). Also hand-styled `NextLink` with the same classes in login page, patient-frame footer, patient-frame contact dialog, queue. |
| `PageHeader` | `(clinician)/_components/common.tsx` | page title, description, actions, eyebrow | keep; consolidate with the patient pattern `<header className="flex flex-col gap-1"><Heading level={1}>` copied on every patient page. |
| `Section` (clinician) | `common.tsx` | titled bordered region with count | keep; consolidate with `Panel`. |
| `Section` (patient Today) | `(patient)/(app)/today/page.tsx` | titled region with top rule | consolidate: same name, different component, different look; other patient pages repeat the markup inline (progress, plan, appointments). |
| `Empty` | `common.tsx` | `EmptyState` + padding + optional image | consolidate into `EmptyState` (add padding/image props). Admin and patient use `EmptyState` directly. |
| `QueryError` + `errorText` | `common.tsx` | API failure banner with retry | keep; patient app and admin hand-write equivalent Banners with different copy sources. |
| `ListSkeleton` | `common.tsx` | list loading | keep. |
| `PatientStatusTag` | `common.tsx` | patient enrolment status | keep; admin duplicates (C1). |
| `AppointmentStatusTag`, `VisitType`, text maps | `(clinician)/_components/appointments.tsx` | appointment status/type | consolidate with patient `scheduling.ts` maps (C3). |
| `PlanView` | `(clinician)/_components/plan-view.tsx` | read-only plan (current, version, preview) | keep; consolidate its diff block with `DiffList`. |
| `IntakeAnswerList` | `(clinician)/_components/intake.tsx` | intake answers | keep. |
| `DiffList` | `(patient)/_components/diff-list.tsx` | plan change summary | keep as the one implementation. |
| `TableToggle` | `(patient)/_components/table-toggle.tsx` | chart alternative | keep; clinician has no charts yet, so pattern not shared. |
| `WeeklyBars`, `PainLine`, `BarsLegend` | `(patient)/_components/charts.tsx` | progress charts, hand-built SVG | keep; patient-only, not in `ui`. |
| `ThreadView` message cards | `(patient)/_components/thread-view.tsx` | message list, composer | consolidate with clinician `messages.tsx` (A3). |
| `CancelVisit`, `PlanChangeNote`, `ConsentManager`, `CheckInForm`, `StartSession`, `SessionPlayer`, `BookingFlow`, `OnboardingFlow` | `(patient)/_components` | workflow components | keep; internals reuse local patterns listed in A3. |

### A3. Ad-hoc and one-off implementations

| Pattern | Location | Duplicates | Verdict |
|---|---|---|---|
| Toggle chip `<button aria-pressed>` and slot chip `<button>` (`chip/chipOn/chipOff`) | `(patient)/_components/booking-flow.tsx:86-89, 364, 474, 494, 567` | none in `ui` | consolidate into a `ui` ToggleChip / slot-button component. Slot chips have no pressed or selected state; selecting goes straight to step 2. |
| Demo role picker cards `<button>` | `(public)/login/login-form.tsx:58` | card-as-button | keep as page-local (demo only). |
| Error summary + `<button>` per error | `onboarding-flow.tsx:420-446` | `ui FieldGroup` error alert | replace with a `ui ErrorSummary` (also needed for builder, other forms). Only onboarding has a summary. |
| Inline error `<p role=alert><span sr-only>Error: </span>` | `check-in-form.tsx`, `plan-change-note.tsx`, `sign-out-button.tsx`, `item-editor.tsx`, `builder.tsx` (goal row), `assign-dialog.tsx`, `session-player.tsx`, `onboarding-flow.tsx` (`InlineError`) | `ui Field` error markup | consolidate into one `FieldError`/`InlineError` export. |
| `NumberField` and goal fields: raw `<label>` + `TextInput` | `plan/item-editor.tsx`, `plan/builder.tsx:740-790` | `ui Field` | consolidate: skips the required/optional word, why/hint, error wiring; optional marked "(optional)" inside the label text instead of the `requirement` prop. |
| Filter fields: `Filter` | `review-queue/queue.tsx` | `FilterField` (`patients/directory.tsx`), raw label+control in `plan/library.tsx` and `admin/patients/patients.tsx`, `DayStepper` in `schedule.tsx` | consolidate into one filter-bar pattern. |
| Pagination nav + Previous/Next + rows per page | `patients/directory.tsx` ~375-415, `admin/patients/patients.tsx` ~305-330 | each other | consolidate. |
| "Load more": five variants | `tabs.tsx` `LoadMore` (secondary sm), `appointments-tab.tsx` (quiet sm), `queue.tsx` (secondary sm), `library.tsx` (secondary sm), thread "Show earlier messages" (secondary md), booking "Show later days" | each other | consolidate wording and variant. |
| Message item (Sending / Sent / Not sent + Retry) | `(patient)/_components/thread-view.tsx:295-357`, `(clinician)/inbox/messages.tsx` ~282-330 | each other | consolidate. Differences: failed border 2 px error (patient) vs 1 px `border-error-ink` (clinician); patient adds "Your message is saved here." |
| Plan change list (added/removed/changed) | `DiffList` (patient), `plan-view.tsx:56-72`, `publish-dialog.tsx` | three copies | consolidate to `DiffList`. Patient maps field keys to words ("repetitions", "hold time"); clinician copies print raw `e.fields.join(", ")` (e.g. `holdSeconds`). |
| Exercise row | patient `plan/page.tsx`, patient `session/page.tsx`, clinician `plan-view.tsx`, `library.tsx`, `item-editor.tsx` | five layouts | consolidate to a shared `ExerciseSummary`, with editor variant. |
| Description-list grids `dl grid-cols-4` | `intake.tsx` (`Row`), `queue.tsx` detail, `booking-flow.tsx` confirm `dl` | each other | consolidate. |
| Table header row | `<tr>` raw in `queue.tsx`, `directory.tsx`, `appointments-tab.tsx`, `schedule.tsx`, `admin patients.tsx`; `Tr` in `consent-manager.tsx`, `progress/page.tsx` | `Tr` | consolidate (use `Tr`). |
| Clickable table rows `onClick` on `Tr` | `directory.tsx`, `queue.tsx` | none | inaccessible/risky: mouse-only whole-row target; the keyboard path is a separate link or button in cell 1. Acceptable only because the link exists; keep behaviour documented. |
| Truncated cells with `title` tooltip | `queue.tsx` (explanation, age), `appointments-tab.tsx` (reason) | `ui Tooltip` | inaccessible: `title` is not keyboard or touch reachable; full text unavailable on mobile. `queue.tsx` mitigates via detail pane. |
| Hand-built bordered list `ul.divide-y.rounded-container.border` | consent, plan, session overview, library, overview WorkList, review rows | `Panel` + list | consolidate into a `ui ListPanel`. |
| Bottom/header nav, `UnreadCount` | `patient-frame.tsx` | `BottomTabBar`, `CountBadge` | consolidate. `UnreadCount` is filled primary; `CountBadge` is outlined neutral, so the same count looks different in clinician and patient nav. `BottomNav` uses `flex-wrap min-w-20` instead of the grid, and comment in `UI/nav.tsx` says 56 px while the class `min-h-16` and docs say 64 px. |
| Plan change card (blue info card with Got it) | `plan-change-note.tsx` | `Banner tone=info` | consolidate: re-creates `Banner` markup (border, bg, icon, heading) with a bespoke acknowledge button; Banner `action` slot could carry it. |
| Hero card with top border | `today/page.tsx` | `Panel` | keep (single use) but fold into `Panel` variant. |
| Contact care team dialog | `patient-frame.tsx` | `Dialog` | keep. Warning box inside is hand-built (`bg-warning-bg` paragraph), not `Banner`. |
| `ViewHeading` focus heading | `session-player.tsx:37` | `Heading` | keep pattern; promote to `ui` (`Heading` with `focusOnMount`). `onboarding` and `booking` use `Heading tabIndex={-1}` instead. |
| Stop control styled as danger | `session-player.tsx` ("Stop, this hurts": `variant="secondary"` + `border-error-ink text-error-ink`) | `Button variant="danger"` | replace: ad-hoc danger look on a high-impact action; `danger` is documented for the confirming step only, so this needs a decision (research family "high-impact actions"). |
| Number squares in session overview | `session/page.tsx` | `ol` | keep; decorative, `aria-hidden`. |
| Native `<input type="date">` | `onboarding-flow.tsx` (DOB), `schedule.tsx`, `builder.tsx` goals | none | replace for DOB (no format hint, no validation of plausible range seen in markup); keep for schedule/goals pending research. |
| Hand-built SVG charts | `charts.tsx` | none | keep; text alternative present (role=img + table). |
| Select used for 3-5 item filters | `queue.tsx` ("Show": two options), directory | segmented control | replace candidate: "Show: Open and in review / Closed" is a two-state switch behind a dropdown. |
| `TooltipProvider` without tooltips | `context.tsx` | none | remove. |

## B. Duplicates between `(clinician)/_components`, `(patient)/_components` and `packages/ui`

| Concept | `ui` | clinician | patient | Differences |
|---|---|---|---|---|
| Text link | `Link` | `AppLink` | `TextLink` | `AppLink`/`Link` same classes; `TextLink` adds `text-label font-medium`. |
| Link as button | `Button asChild` | inline `Button asChild` + NextLink | `ButtonLink` | patient wrapper only. |
| Page header | none | `PageHeader` | inline per page | patient shows description with `text-body text-ink-muted`; clinician `max-w-3xl`. |
| Section/panel | `Panel` | `Section` | local `Section` (Today) + inline | border-top vs bordered box. |
| Empty state | `EmptyState` | `Empty` (wrapper) | `EmptyState` | clinician adds padding and image slot. |
| Count/badge | `CountBadge` | `SideNav` count | `UnreadCount` | filled vs outlined. |
| Nav | `BottomTabBar`, `SideNav` | `SideNav` via shell | hand-built | see A3. |
| Error banner | `Banner` | `QueryError` | direct `Banner` | copy sources differ. |
| Skip link | none | `SkipLink` in shells | `SkipLink` in patient-frame | identical. |
| Status maps | none | `appointments.tsx`, `common.tsx`, `tabs.tsx` | `scheduling.ts`, `progress/page.tsx`, `session-player.tsx` | wording differs (section C). |
| Plan view/diff | none | `PlanView`, inline diff | `plan/page.tsx`, `DiffList` | see A3. |
| Message thread | none | `messages.tsx` | `thread-view.tsx` | see A3. |
| Formatters | none | `(clinician)/_lib/format.ts` (`plural`, `formatLocalDate`, `doseText`...) | `(patient)/_lib/format.ts`, `scheduling.ts` | same names, same purpose, separate files. |
| Consent/AI wording | `AIDraftBlock` label strings | none | `consent-copy.ts` ("automated drafting tools") | the AI feature has three names (section C8). |

## C. Status vocabulary by domain

Rule in `docs/design-system/components.md`: `StatusChip` (filled, icon, words) for clinical status; `Tag` (outlined, text only) for administrative status.

### C1. Enrolment (patient status)
| Place | Form | Words |
|---|---|---|
| `(clinician)/_components/common.tsx` `PatientStatusTag` (directory, record header) | Tag; success for active, warning for intake incomplete / awaiting assignment, neutral otherwise | Active, Inactive, Discharged, Intake incomplete, Awaiting assignment |
| `(admin)/admin/patients/patients.tsx` | Tag with local `statusTone` (same mapping, own copy) + own `statusLabel` | same five words |
| admin Intake column | plain text | "Missing: intake not started", "Missing: intake started, not submitted", "Submitted", "Submitted and reviewed" |
| admin Action column | text | "Waiting for the patient to finish intake" |
| patient `/today` hero | eyebrow text | "Setting up" (awaiting assignment), "No plan yet" |
| onboarding | `Progress` | "Step n of 11" |
Mismatch: duplicated tone logic; admin and clinician show different intake wording ("Intake incomplete" vs "Missing: ...").

### C2. Care plan
| Place | Form | Words |
|---|---|---|
| directory "Care plan" column | plain text via `planStageText` | "No plan", "Version n, draft changes", "Draft only", "Version n published", "Published" |
| `PlanView` header | StatusChip info "Preview, not published"; StatusChip success "Current version"; Tag "Earlier version" | |
| `VersionList` | StatusChip success | "Current" |
| patient plan history | plain text | "Version n (current)" |
| builder save line | `role=status` text | "Draft saved at ...", "Not saved: ..." |
Mismatch: "Current" vs "Current version" vs "(current)"; plan version state is administrative yet uses `StatusChip` (success) in two places and `Tag` for its sibling "Earlier version" in the same slot, so one slot alternates chip and tag.

### C3. Appointment
| Place | Form | Words |
|---|---|---|
| clinician `appointments.tsx` | Tag (booked hidden; cancelled and no-show warning, completed success, others info) | Requested, Booked, Checked in, In progress, Completed, Cancelled by the patient, Cancelled by the clinic, Did not attend |
| patient `scheduling.ts` `statusLabels` | StatusChip info only for checked in / in progress; plain text for ended; nothing for booked | same set except: "Cancelled by you", "Missed" (vs "Did not attend") |
| types | clinician "Video follow-up"; patient "Follow-up by video" | |
| clinician tables | "Booked" as sr-only text | |
Mismatch: three presentations of one status (tag, chip, plain text) and two wordings for no-show, patient cancellation and video visits. Patient `statusLabels` includes no-show as "Missed".

### C4. Review task (clinical review)
| Place | Form | Words |
|---|---|---|
| `queue.tsx` `TaskStatus` | StatusChip (in review info+clock, resolved success, dismissed neutral); open hidden | "In review", "Resolved", "Dismissed" |
| overview open tasks | StatusChip info+clock for in review only | "In review" |
| record timeline | `Tag` | `taskStatusText` (Open, In review, Resolved, Dismissed) |
| kind | `Tag` "Administrative" (queue, overview, detail) | |
| screenshot `3.3/review-queue-task-1440.png` | warning chip "Open" | stale: code now hides it |
Mismatch: same status is a chip in queue/overview and a tag in the patient timeline, and "Open" is hidden in lists but listed in the timeline. Priority (numeric in contract) is never shown; lists say "Highest priority first" with no visible priority marker.

### C5. Review of check-in and session (clinical)
| Place | Form | Words |
|---|---|---|
| `ReviewedChip` (overview n/a; timeline, check-ins tab) | StatusChip success / warning+clock | "Reviewed" / "Not yet reviewed" |
| `tabs.tsx` sessions | warning StatusChip "Stopped for discomfort"; other statuses Tag | Completed, In progress, Paused, Ended without finishing, Stopped for discomfort |
| patient progress | plain text | Completed, Stopped for discomfort, Not finished |
| patient session list | plain text | Done, Skipped, current |
Mismatch: "Ended without finishing" (clinician) vs "Not finished" (patient); `sessionStatusText` is local to `tabs.tsx`, the patient maps are local to `progress/page.tsx` and `session-player.tsx`.

### C6. Message delivery
| Place | Form | Words |
|---|---|---|
| patient thread and clinician thread | icon + text | Sending, Sent, "Not sent. {reason}", Retry sending / Retrying |
| clinician thread toast | toast info | "Trying to send again" |
| patient list | icon + bold text | "n unread messages", "n of your messages were not sent" |
| clinician list | StatusChip info / error | "n unread", "n messages not sent" |
| nav | filled count badge (patient), outlined `CountBadge` (clinician) | number + sr-only "unread" (patient) |
Mismatch: same data as chip vs icon+text; wording "n of your messages" vs "n messages".

### C7. Pain, reviewed, and read states
`PainText` in `common.tsx` prints "Pain 7 of 10 (patient-reported)"; `overview.tsx` repeats the string inline instead of calling it; patient check-in result says "pain of 7 out of 10". Intake rows say "Pain (patient-reported)". Consistent intent, three renderings.

### C8. AI generation and clinical notes
No route renders AI generation state or clinical notes. `AIDraftBlock` labels ("Draft, generated, not reviewed", "Generated, reviewed and approved", "Draft rejected, not used") exist only in `UI/ai-draft.tsx` and the gallery. The only AI-related UI is consent: title from `consent-copy.ts`, switch label "Allow automated drafting tools", status text "Automated drafting tools are now on." Record changes appear as a "Record history" table in the History tab. Vocabulary gap to resolve before building those screens: consent calls it "automated drafting tools", the design system calls it "generated".

### C9. Admin priority
No admin priority concept in UI. `priority` is a number on review tasks (`packages/shared/src/contracts/review.ts:90,149`), used for ordering only.

## D. Icon-only buttons and icon-dependent controls

| Control | Location | Accessible name | Notes / verdict |
|---|---|---|---|
| Move exercise up | `item-editor.tsx` `IconButton` | "Move {name} up" | keep; disabled at first item with no reason (F). Arrow icons only, no tooltip. |
| Move exercise down | same | "Move {name} down" | same. |
| Dialog close | `UI/overlays.tsx:93` | "Close" | keep. |
| Drawer close | `UI/overlays.tsx:148` | "Close panel" | keep. |
| Toast dismiss | `UI/toast.tsx` | "Dismiss notification" | keep; sm target 24 px in clinician theme, 48 px in patient theme (no toast in patient app). |
| `EvidenceRef` numeric button | `UI/ai-draft.tsx` (unused) | "Open evidence n" | keep; 24 px target. |
| Chevron-only affordance on demo cards | `login-form.tsx` | whole button text | not icon-only. |
| Buttons with a visible word and a longer `aria-label` | "Remove" (`item-editor.tsx`, `builder.tsx`), library "Add"/"In the plan", admin "Assign therapist", overview/tab "Mark reviewed", version "View version n" | label contains the visible text | acceptable for label-in-name; keep. |
Pattern note: there is no icon-only button in the patient app. Small icon-only `size="sm"` buttons in the clinician theme are 24 px, the documented minimum.

## E. Places where a toast is the only feedback

All toasts are clinician-only (`useToast`, 7 s, polite, dismissible).
| Action | File | Other feedback | Verdict |
|---|---|---|---|
| Assign to me / Unassign | `queue.tsx` | detail pane "Assigned to" updates after refetch | acceptable; success is also visible in data. |
| Mark check-in reviewed (task detail) | `queue.tsx` | none beyond toast; task stays open, button stays | replace: toast is the only confirmation; add persistent reviewed state in detail. |
| Mark reviewed (overview) | `overview.tsx` | row disappears from list | acceptable. |
| Mark reviewed (record check-ins tab) | `tabs.tsx` | chip changes to "Reviewed" | acceptable. |
| Resolve / dismiss task | `queue.tsx` | task leaves list, focus moves to neighbour | acceptable; toast only way to see the note was saved. |
| Publish plan version | `builder.tsx` | route changes to Plan tab | acceptable. |
| Retry message | `messages.tsx` | thread updates | toast info "Trying to send again" is redundant with the in-row "Retrying" label (remove or keep as live region only). |
| Every error from queue actions, overview mark reviewed, record mark reviewed, retry, `NoteDialog` | `queue.tsx`, `overview.tsx`, `tabs.tsx`, `messages.tsx` | none | replace: errors disappear after 7 s and, for `NoteDialog`, appear behind a modal that is still open and holds the user's text; the design system says errors state whether input was kept. Use in-context Banner. |
Patient app and admin use no toasts: they use Banner and `role=status` lines (check-in, consent, appointments query-string banners, admin "Therapist assigned").

## F. Disabled controls and whether a reason is shown

| Control | Location | Reason shown? |
|---|---|---|
| "Review and publish version n" | `plan/builder.tsx` ~420 | yes: visible text "Add at least one exercise to publish." + `aria-describedby`. |
| "Open care plan builder" (not on care team) | `record.tsx` | yes: visible paragraph + `aria-describedby`. |
| Assign / Unassign / Mark check-in reviewed / Resolve / Dismiss | `queue.tsx` | yes: `#team-reason` paragraph + `aria-describedby`. Assign also disabled when no practitioner id: reason paragraph not shown for that case. |
| "Mark reviewed" (check-ins tab) | `tabs.tsx` ~795 | yes: paragraph above table (line ~746); not linked via `aria-describedby`. |
| Library "Add" | `library.tsx` | yes: label changes to "In the plan", `aria-disabled`. |
| Move up / Move down | `item-editor.tsx` | no (first/last position is implied). |
| Send (inbox) | `messages.tsx:468` | no (empty text). |
| Previous page / Next page | `directory.tsx`, `admin patients.tsx` | no. |
| "Today" in day stepper | `schedule.tsx:175` | no (already today). |
| Demo role buttons, Sign in | `login-form.tsx` | no (another sign-in pending; transient). |
| Pause / Skip / Stop | `session-player.tsx` | no (busy; transient). |
| Back, Cancel, Keep this visit | onboarding, booking, cancel-visit | no (pending; transient). |
| Consent `Switch` | `consent-manager.tsx` | no while pending; "Off. Not available yet." replaces the switch when not grantable (reason partly given). |
Gap: patient app has no permanently-disabled control without text; clinician has two disabled controls (move, send) without reason.

## G. Other inconsistencies and accessibility findings

1. Danger styling: "Stop, this hurts" is a secondary button with error colour classes; confirming dialogs use `variant="danger"`. See A3.
2. Clinician and patient pages build headings two ways: `Heading` vs raw `<h2>/<h3>` with `font-heading text-h4` classes (`common.tsx` Section, `queue.tsx`, `plan-view.tsx`, `item-editor.tsx`).
3. Time display: clinician uses clinic timezone with abbreviation; admin shows "Registered (UTC)"; patient shows clinic zone name. Three conventions.
4. Pagination: clinician directory and admin use cursor pages with Previous/Next that need a cursor stack; review queue, library, tabs use "Load more". Two paging models on comparable lists.
5. Truncated table cells rely on `title` (A3).
6. Skip link missing on `/login` and `/onboarding`; `main` focus target exists on all shells.
7. Shared `Section`/`PageHeader` live in `(clinician)/_components`, so admin imports nothing from them and re-implements headers with `Heading` only.
8. Charts: only patient has charts; clinician shows the same data as tables only. No chart in `packages/ui`.
9. `Tr` row click handlers (`directory.tsx`, `queue.tsx`) make rows look interactive to pointer users only; first-cell link/button carries keyboard access.
10. Patient plan page repeats "Set by your care team." per exercise and in the clinician `PlanView`, where the same sentence reads as if addressed to the patient (`plan-view.tsx`). Intentional per code comment (same serializer) but the label is wrong for the clinician audience.
11. Date of birth uses a native date input in onboarding; tel, email and autocomplete attributes are set.
12. `BottomNav` comment in `UI/nav.tsx` says 56 px, class is 64 px; docs say 64 px.

## H. Consolidation plan for treatment planning, scheduling and tables (research families 3, 4 and 9)

Added 2026-11-20 from `component-research/03-treatment-planning.md`, `04-scheduling-calendar.md` and `09-tables-search-filter.md`. Each row names the one component that should replace the duplicates. These are decisions proposed in the linked records (status: proposed, pending advisor sign-off), not code changes. Section A to G verdicts for these rows now read "consolidate, see H".

| Duplicate | Where it is today | Replace with | Decision | Notes |
|---|---|---|---|---|
| Pagination nav, Previous and Next, rows per page (two near copies) | `W/(clinician)/patients/directory.tsx` ~375-415; `W/(admin)/admin/patients/patients.tsx` ~305-330 | `TablePagination` in `ui`: labelled nav, range line, Previous and Next hidden at the ends, rows per page, focus to the table caption after a page change | CD-334 | Cursor API, so no numbered pages. Cursor stack and page index move into a URL token (CD-333). |
| "Load more" in five variants and four wordings | `tabs.tsx` `LoadMore` (secondary sm); `appointments-tab.tsx` "Show more visits" (quiet sm); `queue.tsx` (secondary sm); `library.tsx` (secondary sm); `thread-view.tsx` "Show earlier messages" (secondary md); booking "Show later days" | One `LoadMore` in `ui`: secondary, medium, direction in the label, count line, focus to first new item, text end state, inline retry | CD-335 | Booking "Show later days" uses the same component. |
| Filter fields, five constructions | `Filter` (`queue.tsx`); `FilterField` (`directory.tsx`); raw label and control (`library.tsx`, `admin patients.tsx`); `DayStepper` (`schedule.tsx`) | One `FilterBar` with `FilterField`, view pills, inline Filters panel and removable chips; `DayStepper` stays a distinct date control | CD-331, CD-332, CD-343 | Replaces the six-select wrap; adds the missing `hasUpcomingAppointment` control. |
| Exercise row, five layouts | patient `plan/page.tsx`; patient `session/page.tsx`; clinician `plan-view.tsx`; `library.tsx`; `item-editor.tsx` | `ExerciseSummary` with variants library, plan, editor, session-overview | CD-300, CD-301 | Also one shared dose formatter in place of the duplicate `doseText` in two `format.ts` files. `NumberField` folds into `ui Field`. |
| Plan diff, three copies | `DiffList` (patient); `plan-view.tsx:56-72`; `publish-dialog.tsx` | One `PlanDiff` with `audience` | CD-304 | The clinician copies print raw keys such as `holdSeconds`. |
| Plan version state, three forms | `PlanView` chip and tag; `VersionList` chip; patient "(current)" text; directory plan stage text | `PlanStateLine` with four words: Draft, Published version N, Draft differs from version N, Earlier version | CD-305 | One slot, one component, no chip or tag alternation. |
| Version list, two renderings | `VersionList` plus drawer in `tabs.tsx`; patient plan history text | One `VersionList` with change note and inline `PlanDiff` | CD-303 | |
| Slot and toggle chips, five class sets | `booking-flow.tsx:86-89, 364, 474, 494, 567` | `SlotButton` and `ToggleChip` in `ui` | CD-311 | Slot chips gain a text selected state when the step is revisited. |
| Appointment status and wording, three presentations | clinician `appointments.tsx`; patient `scheduling.ts`; overview and record tabs | `AppointmentRecord` with one `Tag` status map | CD-317 | Wording to agree once: Did not attend, Cancelled by you (patient) or by the patient (staff), Video follow-up. Needs content sign-off. |
| Time formatting and zone naming, three conventions | clinician clinic zone with abbreviation; admin "Registered (UTC)"; patient zone name | One `formatVisitTime` | CD-314 | Audit and registration timestamps may stay UTC, labelled. |
| Table header row, raw `<tr>` in five tables | `queue.tsx`, `directory.tsx`, `appointments-tab.tsx`, `schedule.tsx`, `admin patients.tsx` | `Tr` header | CD-338 | |
| Truncated cells with `title` | `queue.tsx`, `appointments-tab.tsx` | Wrapped visible text up to two lines; full text in detail | CD-341 | |
| Clickable `Tr` rows | `directory.tsx`, `queue.tsx` | Keep as pointer convenience with first-cell link; row menu for secondary actions | CD-337 | First use of `DropdownMenu`. |
| Two-option "Show" select | `queue.tsx` | Segmented control | CD-341 | |
| Unsaved-change handling in the builder | `builder.tsx` autosave and `beforeunload` | Add in-app guard for pending or failed saves | CD-306 | |
| Cancel visit dialog with required reason | `cancel-visit.tsx` | Optional reason, equal-weight Keep | CD-318 | Contract already makes the reason optional. |

### H1. New findings from this research

1. **Search text reaches the URL.** `directory.tsx` and `admin patients.tsx` write `q` to the query string. A patient name or MRN can then appear in browser history, server logs, referrers and shared screens. Feature research I stated the URL holds no names; that statement is incorrect for searches. Proposed fix in CD-333.
2. Directory page position (cursor stack and page index) is held in component state, not the URL, so Back restores filters and sort but not the page.
3. The API plan diff covers exercises only and carries field names, not old and new values. A change to a goal, the title or plan instructions does not appear in the publish dialog summary. Requested of the API owner (CD-304).
4. `DiffList` maps one field to "your therapist's note", which reads wrongly in a clinician screen.
5. Availability management has permissions (`availability.manage`, `availability.manage_own`) but no write route was found in `apps/api/src/modules` and there is no `admin` module there; the admin availability screen cannot ship until that is confirmed (CD-313).
6. The directory's silent drop of administrative rows (`r.view === "clinical"` filter) leaves a coordinator with an empty table (carried from feature research I; unchanged by this research).
