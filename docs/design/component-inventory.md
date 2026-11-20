# CarePath component inventory (per screen)

Source: code read on 2026-11-20 in `apps/web/app/**`, `apps/web/components/**`, `packages/ui/src/**`, `docs/design-system/components.md`. Screenshots consulted: `docs/screenshots/3.3/review-queue-task-1440.png` (older than current code: it shows a list where the code now renders a `Table`, and an "Open" status chip that the code now hides). Baseline images in `docs/design/baseline/` were being captured while this was written; some listed files were not readable, so their content is not described here. Everything below is from code unless a screenshot is named.

Conventions: `ui` = `@carepath/ui` (`packages/ui/src/components/*`). "Patient shell" = `apps/web/app/(patient)/_components/patient-frame.tsx`. "Staff shell" = `apps/web/components/shells.tsx`. Typography tokens seen: `text-h1..h4`, `text-body`, `text-label`, `text-small`, `text-caption`, `font-heading`, `font-mono` (via `Mono`), `tabular-nums`, `max-w-measure`.

## 0. Shared frames and layout

| Frame | Where | Structure | Navigation | Notes |
|---|---|---|---|---|
| Root | `app/layout.tsx` | `DemoNotice` (role=note) above `QueryProvider` and all route groups | none | Only root-level shared element. No ToastProvider here. |
| Public | `(public)/layout.tsx` | `ThemeScope theme="patient"` | none | Used by `/login`, `/design-system`. |
| Patient app | `(patient)/(app)/layout.tsx` -> `PatientFrame variant="app"` | header (wordmark, `ContactCareTeam` dialog, `SignOutButton`), `main#main` max-w-3xl, footer ("Sharing and consent" link), skip link | md+: `HeaderNav` row under header; below md: sticky `BottomNav`. Four items: Today, Progress, Appointments, Messages. Unread count badge on Messages. | Hand-built nav in `patient-frame.tsx`, not `ui` `BottomTabBar`. |
| Patient session | `(patient)/(session)/layout.tsx` -> `PatientFrame variant="focus"` | header with back link "Today", `ContactCareTeam`; no nav, no footer, no sign out | back link only | Focus mode. |
| Onboarding | `(patient)/onboarding/page.tsx` | own header (wordmark + "Sign in" `Link`), `main` max-w-2xl | none | Bypasses `PatientFrame`. |
| Clinician | `(clinician)/layout.tsx` -> `ClinicianShell` -> `StaffShell` | left rail (md+) or top block; `main#main`; `ClinicianProviders` supplies timezone, permissions, `TooltipProvider`, `ToastProvider` | `ui SideNav`: Overview, Patients, Schedule, Messages (count), Review queue. Footer: `Avatar` + name + role + `SignOutButton`. | Skip link duplicated from patient shell. |
| Admin | `(admin)/layout.tsx` -> `AdminShell` -> `StaffShell` | same as clinician, clinician theme | `SideNav` with one item: Patients | No ToastProvider; feedback is Banner. |

---

## 1. Public

### /login  (`(public)/login/page.tsx`, `login-form.tsx`)
- Page structure: `main#main` max-w-5xl; brand block; optional notice Banner; two columns (sign-in form, demo role picker).
- Navigation: link "Start here" to /onboarding (hand-styled `NextLink`, not `ui Link`).
- Content sections: "Sign in" (h1), "Exploring the demo?" (h2).
- Primary action: "Sign in" `Button`. Secondary: demo role buttons.
- Inputs: `Field` + `TextInput` email (autoComplete username), password (current-password). Both "required" in words.
- Interactive: demo role picker is a list of hand-built `<button>` cards (`login-form.tsx:58`) with label, summary, email in `Mono`, chevron icon.
- Feedback: `Banner` error "Could not sign you in"; reason notices via query `?reason=` (expired = warning, required = info, signed-out = success).
- Status: none.
- Visual assets: none (text wordmark).
- Microcopy: "Email or password is incorrect. Check both and try again."; session limits stated (30 min idle, 12 h total).
- A11y: `noValidate` form, `Banner` role alert/status, buttons disabled while another sign-in pending.
- Edge cases: rate limited; API unreachable; already signed in (redirect unless `signed-out`); unsafe `next` param ignored.

### /  (`(public)/page.tsx`)
Redirect only (role home or /login). No UI.

### /design-system  (`(public)/design-system/page.tsx`, `demos.tsx`, `specimen.tsx`)
Component gallery, both themes, exempt from colour lint. Contains the only live uses of `AIDraftBlock`, `EvidenceRef`, `DropdownMenu`, `Popover`, `Tooltip`, `CountBadge`, `BottomTabBar`, `ToastSurface`. Not a product screen; used as the reference for the matrix.

### /onboarding  (`(patient)/onboarding/page.tsx`, `_components/onboarding-flow.tsx`, `_lib/onboarding.ts`)
- Page structure: own header, `main` max-w-2xl, one `OnboardingFlow` rendering one stage at a time.
- Navigation: `Progress` ("Step n of 11", `onboarding-flow.tsx:401`); Back/Continue buttons; resumes at first open step when signed in.
- Stages (from code): account, eligibility code, personal information, primary goal, body area, pain levels, activity limitations, clinician preferences, appointment availability, consent, review.
- Inputs: `TextInput` (text, email, password, date for birth date, tel), `Textarea` with manual "n of 500 characters" line, `RadioGroup`/`Radio` (language, body area, side, therapist gender and language), `Checkbox` lists (limitations, days, times, agreement), `PainScale` x3 (current, worst, best), `Switch` (optional automated drafting tools).
- Interactive: error summary box is hand-built (`onboarding-flow.tsx:420-446`) with a `<button>` per error that focuses the field; local `InlineError`.
- Data presentation: `ReviewStep` rows with "Change" actions per step.
- Visual assets: `IllustrationFigure` for chosen body area.
- Feedback: summary + inline errors, `role=status` line for saving, Banner for server banner.
- Status: step progress only.
- Microcopy: every field has `why` line ("This confirms your clinic invited you..."); pain note "These are your own ratings"; emergency notice.
- A11y: `data-field` anchors for focus, `autoComplete` tokens, summary receives focus on error.
- Edge cases: resume mid-flow; wrong role redirected; errors per field; consent-required text version shown; native date input for DOB (no format guidance beyond browser).

---

## 2. Patient app (`(patient)/(app)`)

### /today  (`today/page.tsx`)
- Structure: h1 Today + date/greeting; Hero card (top border primary); optional `PlanChangeNote`; sections Daily check-in, Next appointment, Messages, This week, Your care plan, Reminders. Page-local `Section` (not `ui`/clinician `Section`).
- Navigation: `ButtonLink`/`TextLink` to /session, /check-in, /appointments, /messages, /plan, /progress, /consent.
- Primary actions: "Start today's session" / "Continue session" / "Resume session" / "Add your check-in" (state-dependent). Secondary: "Check in", "Start a session anyway", "Review Sharing and consent".
- Data presentation: ordered exercise list in hero; `Progress` (sessions this week); sentence-style counts.
- Feedback/status: hero eyebrow text is the status ("Setting up", "No plan yet", "Today's session", "Rest day", "Session paused"). Check-in done shown with check-circle icon and text. No chips or tags.
- Visual assets: `MomentImage` (awaiting, done-for-today).
- Microcopy: "Your place is saved. Pick up where you stopped."; "Set by your care team."
- A11y: each section `aria-labelledby`; buttons full-width on mobile.
- Edge cases: awaiting assignment; no plan; session due / in progress / paused / done / rest day; no next visit; reminder only when visit today or tomorrow; version-1 plan note.

### /plan  (`plan/page.tsx`)
- Structure: h1, plan sentence, instructions (`Prose`), Exercises ordered list in bordered ul, Goals, Plan history. Empty state when none.
- Data: per exercise name (h4 style), `Tag` body area, dose, schedule, therapist note, `IllustrationFigure`. History list plain text; `DiffList`.
- Status: "(current)" plain text on version; `Tag` only for body area.
- Edge cases: no plan; goals without target/date; v1 has no diff.

### /progress  (`progress/page.tsx`, `_components/charts.tsx`, `table-toggle.tsx`)
- Structure: h1; "This week" big sentence; weekly bars chart; pain line chart; Sessions list (mobile) or `Table` (sm+); Goals.
- Data presentation: hand-built SVG `WeeklyBars` and `PainLine` (role=img with text summary), each paired with `TableToggle` ("Show ... as a table", aria-expanded). Sessions as `<ul>` below sm, `Table` above.
- Status: session result words (Completed / Stopped for discomfort / Not finished) as plain text.
- Edge cases: nothing yet (EmptyState); no check-ins (EmptyState); four-week window; no sessions.
- A11y: chart summary label, table alternative, legend shape not colour (outline vs solid).

### /appointments  (`appointments/page.tsx`, `_components/cancel-visit.tsx`)
- Structure: h1 + zone line; Banners (booked/moved, cancelled, reminder); "Book a visit"; Upcoming and Past lists of visit cards.
- Actions: "Book a visit" (`ButtonLink`), per card "Reschedule" (`ButtonLink` sm), "Cancel visit" (opens `Dialog` with required reason `Field`+`Textarea`, danger confirm "Cancel visit", secondary "Keep this visit").
- Status: `StatusChip` info for checked in / in progress; plain bold text for ended states; nothing for booked.
- Feedback: success Banners driven by query string (`?booked`, `?moved`, `?cancelled`).
- Edge cases: cannot book until therapist assigned (empty copy); past list truncated message; invalid transition on cancel.
- A11y: sr-only suffix on repeated buttons ("on {date}").

### /appointments/book and /appointments/[id]/reschedule  (`_components/booking-flow.tsx`, `_lib/scheduling.ts`)
- Structure: two-step flow in one component. Step 1: therapist `RadioGroup`, visit type `RadioGroup` with hints, filters (Days, Time of day), open times grouped by day. Step 2: confirm `Panel` with `dl`, optional reason `Field`.
- Selection controls: hand-built toggle chips (`<button aria-pressed>`, class `chip/chipOn/chipOff` at `booking-flow.tsx:86-89`) for day and time-of-day filters; hand-built time-slot chips (`<button>`) for each open time; same chips used for "closest open times" after a conflict.
- Feedback: error Banner on conflict ("That time was just taken") with alternatives; load error Banner with retry; `aria-live=polite` region; `SkeletonGroup`.
- Data: slots by day (`Heading` h3 per day), "Show later days" pagination.
- Edge cases: slot taken; no open times; filters match none (reset button); no therapist; reschedule keeps current visit unchanged on failure.
- A11y gap noted: slot chips are plain buttons with sr-only date prefix; no calendar semantics.

### /check-in  (`check-in/page.tsx`, `_components/check-in-form.tsx`)
- Inputs: `PainScale` (0-10 radio group, no slider), `RadioGroup` difficulty (optional), `Textarea` notes (optional, maxLength 1000).
- Actions: "Send check-in" (loading "Sending"). After send: "Back to Today".
- Feedback: inline alert for missing pain; Banner for send error; success view with `role=status`; warning Banner when pain at/above clinic threshold with emergency notice.
- Microcopy: "Your therapist will see this." (twice on form, once on result).
- Edge cases: session_closed (check-in belongs to earlier day); network failure keeps input.

### /consent  (`consent/page.tsx`, `_components/consent-manager.tsx`)
- Structure: h1, intro, bordered list of consent types, status line, history `Table` ("When your choices changed").
- Controls: `Switch` "Allow automated drafting tools" (only optional consent); required consent is text with "To withdraw, contact your clinic"; ungrantable consent is text "Off. Not available yet."
- Feedback: `role=status` line ("Automated drafting tools are now on."), error Banner "Not saved".
- Status: "On. Agreed {date}." / "Not agreed." plain text; history result "Agreed" / "Turned off".
- Edge cases: no history; revoke; switch disabled during request.

### /messages  (`messages/page.tsx`, `_components/conversation-list.tsx`, `_lib/use-conversations.ts`)
- Structure: h1, reply-time sentence, list of conversation cards (whole card is a link).
- Status: unread = primary icon + bold text + "N unread messages"; failures = error icon + "N of your messages were not sent". No chips.
- Edge cases: none yet (EmptyState); 30 s poll.

### /messages/[conversationId]  (`_components/thread-view.tsx`)
- Structure: h1 subject; `role=log` list of message cards; composer `<form aria-label="Write a message">` with `Field`+`Textarea`, Send `Button`.
- Message states: Sending (clock icon) / Sent (check icon) / Not sent + reason + "Retry sending" (when `canRetry`); failed card has 2 px error border; "New" marker text.
- Feedback: Banner "Not sent" (composer), Banner "Still not sent" (after retry).
- Actions: "Show earlier messages".
- Edge cases: 404/400 -> notFound; failed with `canRetry` false (no retry button, reason only); queued messages.

---

## 3. Patient session (`(patient)/(session)`)

### /session  (`session/page.tsx`, `_components/start-session.tsx`)
- Structure: eyebrow "Before you start", h1, notice box (`plan.contentNotice`), numbered exercise list with hand-built number squares, "If something hurts" section, actions.
- Actions: "Begin session" (primary), "Not now" (quiet `ButtonLink`).
- Feedback: Banner "Session not started". Redirects if a session is open or no plan.

### /session/[sessionId]  (`_components/session-player.tsx`, `use-timers.ts`)
- Structure: one view per state: active exercise, paused, stopped_discomfort, completed, abandoned. `ViewHeading` (local h1/h2 that takes focus after first render).
- Active view: `Progress` ("Session progress"), `IllustrationFigure`, dose, therapist note, "how" text, hold timer and rest timer (`role=timer`, `aria-live=off`), primary "Done with set n", secondary Pause, Skip exercise, and "Stop, this hurts" (secondary `Button` with `border-error-ink text-error-ink` classes, icon alert-circle).
- Dialogs (bottom `DrawerContent`): "Skip this exercise?" (RadioGroup of reasons + "Other" Textarea), "Stop this session?" (`PainScale` + "What happened?" Textarea, danger confirm).
- Status: list "All exercises" with words Done / Skipped / current; session stop view uses Banner warning "Contact your clinic if you are worried" plus embedded `CheckInForm`.
- Feedback: `role=status` sr-only live region; Banner "Not saved"; sessionStorage restores timers.
- Edge cases: paused; stopped; completed with skipped list; abandoned; open session on another device.

---

## 4. Clinician (`(clinician)`)

Shared building blocks: `_components/common.tsx` (`PageHeader`, `Section`, `Empty`, `AppLink`, `QueryError`, `ListSkeleton`, `PatientStatusTag`, `PainText`, `ReviewedChip`, `EmptyDirectory`, `taskStatusText`, `planStageText`), `_components/appointments.tsx` (`VisitType`, `AppointmentStatusTag`, text maps), `_components/plan-view.tsx`, `_components/intake.tsx`.

### /overview  (`overview/overview.tsx`)
- Structure: `PageHeader` (caseload sentence, "Refresh lists"), 5-column grid: left (Your review tasks, Check-ins not yet reviewed), right (Visits today, Unread messages, Missed activity, Plan updates). All `Section`s with count.
- Data presentation: divided lists via local `WorkList` (first 6 rows, expand button with aria-expanded); one list uses a plain `ul` (visits).
- Actions: "Mark reviewed" per check-in (secondary sm, `aria-label` with patient and time, loading); links "Open the clinic review queue", "Open the schedule", "Open messages".
- Status: `Tag` "Administrative"; `StatusChip` info "In review"; appointment `Tag` via `AppointmentStatusTag`; age text "n h old".
- Feedback: toast success "Check-in marked reviewed"; toast error from `errorText`; `QueryError`; `ListSkeleton`.
- Edge cases: account without practitioner profile; cancelled visits excluded with count note; every list has an `Empty`.

### /patients  (`patients/directory.tsx`)
- Structure: `PageHeader`, filter form (`role=search`) with search, five `Select`s, "Clear filters"; `Table` "Patients"; pagination `nav`.
- Controls: `TextInput` search (placeholder "Press / to search"), `Select` x5, rows-per-page `Select`.
- Table: sortable `Th` on Patient, Status, Last activity (`aria-sort`); columns MRN (mono), Status (`PatientStatusTag`), Clinician, Care plan (text), Next visit, Open reviews (text "n open"/"None"). Row is clickable (`router.push`) plus real link in first cell.
- Pagination: cursor based, Previous/Next buttons (disabled at ends), `role=status` range text.
- Edge cases: empty vs filtered-empty (`EmptyDirectory`), `aria-busy` while refetching, `keepPreviousData`.

### /patients/[patientId]  (`[patientId]/record.tsx`, `tabs.tsx`, `appointments-tab.tsx`)
- Structure: sticky `RecordHeader` (back link, name, MRN mono, birth date, `PatientStatusTag`, time zone, care team, "Open care plan builder"); `Tabs` with 6 URL-driven tabs: Overview, Plan, Activity, Appointments, Check-ins, History.
- Primary action: "Open care plan builder" (link as Button; rendered `disabled` with visible reason when the clinician is not on the care team).
- Overview tab: `Fact` panels (plan, latest pain via `PainText`, open tasks) and a timeline list (`TimelineRow`: time, kind label, body link, chip). Chip rules: stopped session = warning `StatusChip`; other sessions = `Tag`; check-in = `ReviewedChip`; review task = `Tag`.
- Plan tab: current plan via `PlanView`, version list (`VersionList`, "View version n" button, "Current" success chip), `VersionDrawer` (right `DrawerContent`).
- Activity tab: `Table` weekly sessions, sessions (chip/tag), patient-reported pain table, goals. No charts.
- Appointments tab: two `Section`s each with `Table` (status `Tag`, "Booked" sr-only); `Show more visits` button.
- Check-ins tab: `Table` with `ReviewedChip` and "Mark reviewed" button (disabled with reason paragraph for non-care-team); toast feedback.
- History tab: `Table` "Record history, newest first".
- Also `IntakeAnswerList` (dl grid) used in builder.
- Edge cases: header error (QueryError + back link); not on care team; checkIn query param highlights a row; paged lists.

### /patients/[patientId]/plan  (`plan/builder.tsx`, `item-editor.tsx`, `library.tsx`, `publish-dialog.tsx`, `builder-state.ts`)
- Structure: breadcrumb-like header, save status line, action row, banners, two-pane layout: Exercise library (aside at wide, drawer when narrow) and `Tabs` Build / Patient preview / Versions.
- Build tab: plan details (`Field` title, instructions), exercise `ol` of `ItemEditor` cards, goals editor rows.
- Inputs: local `NumberField` (label + `TextInput type=number`, sr-only hint) for sets, repetitions, hold, duration, rest; weekday `Checkbox` row; times per day number input; goal rows built from raw `label` + `TextInput` (description, target, unit, date).
- Library: search input, two `Select`s, results list with `Tag` body area and category, "Add" button (becomes "In the plan" with `aria-disabled`).
- Actions: "Review and publish version n" (disabled with visible reason when empty); "Add exercises" (narrow); move up/down `IconButton`s; "Remove" buttons.
- Publish: `Dialog` with change list (re-implemented diff), required "Note to the patient" (required from v2), "Publish version n".
- Feedback: autosave status line (`role=status`: Saving draft / Draft saved at / Not saved...), "Try saving again", Banners (not ready, saved elsewhere with "Load the saved draft", cannot save), toast on publish, `beforeunload` guard.
- Edge cases: no draft, stale draft (409), no exercise, first version (note optional), preview shows last saved draft only.

### /schedule  (`schedule/schedule.tsx`)
- Structure: `PageHeader`, `DayStepper` (group: Previous day, Today, Next day, "Go to date" native date input), `Section` with `Table` of one day.
- Status: `AppointmentStatusTag`; cancelled rows muted with strike-through time.
- Feedback: 60 s refetch; `QueryError`; `Empty`.
- Edge cases: no practitioner profile; empty day; timezone shown.
- Note: day list, not a calendar grid (stated in code comment).

### /inbox  (`inbox/messages.tsx`)
- Structure: two panes: conversation list (`Section`) and thread (`Section`), `role=log` thread, composer.
- Status: conversation row `StatusChip` info "n unread" and error "n messages not sent"; message rows Sending / Sent / "Not sent. {reason}" with Retry.
- Feedback: toast info "Trying to send again", toast error on retry failure, Banner on send failure.
- Disabled: Send disabled when text empty (no reason).
- Edge cases: none selected (Empty "Choose a conversation"); no conversations; poll while queued.

### /review-queue  (`review-queue/queue.tsx`)
- Structure: `PageHeader`; filter form (`role=search`: Show, Assigned, Rule `Select`s, Clear filters); split view: `Table` "Review tasks" (xl:col-span-5) and `TaskDetail` `Section` (sticky, xl) or right `DrawerContent` below xl.
- Table: columns Patient (button styled as link), Why it appeared (truncated, `title`), Age (compact "5 h"/"3 d", `title` full), Assigned to. Row selection via `aria-selected`; ArrowUp/Down moves between row buttons.
- Detail: Why this appeared (`dl`: rule, value read, threshold, created, due, assigned), Source links, What you can do: Assign to me/Unassign, Mark check-in reviewed, Resolve with a note, Dismiss with a note. `NoteDialog` with required `Textarea`.
- Status: `TaskStatus` chip only when not open (info in review, success resolved, neutral dismissed); `Tag` "Administrative".
- Disabled: all four actions disabled for non-care-team with visible `#team-reason` paragraph via `aria-describedby`.
- Feedback: toasts for assign, unassign, reviewed, resolved, dismissed, and every error (including errors inside `NoteDialog`).
- Edge cases: empty / filtered-empty / closed-empty (with image), role cannot resolve, administrative vs clinical, load more, first task auto-selected on wide screens.
- Note: numeric `priority` exists in the contract (`packages/shared/src/contracts/review.ts`) and sorts the list but is not shown anywhere.

---

## 5. Admin (`(admin)`)

### /admin  -> redirect to /admin/patients.

### /admin/patients  (`admin/patients/patients.tsx`, `assign-dialog.tsx`)
- Structure: `Heading`, filter form (`role=search`: search `TextInput`, status `Select`, Clear), `Table` "Patients", pagination `nav`.
- Table: Patient, MRN, Status (`Tag` using local `statusTone`), Intake (text "Missing: intake not started"), Therapist, Registered (UTC), Action column ("Assign therapist" button with `aria-label`, or text "Waiting for the patient to finish intake").
- Dialog: `AssignDialog` with `RadioGroup` of therapists (with caseload hint), error Banner, retry Banner, skeleton.
- Feedback: success Banner "Therapist assigned" (focusable, role status); no toast.
- Edge cases: no therapists; load error; empty/filtered-empty (`EmptyState` direct, not clinician `Empty`).
- Note: dates are UTC here, clinician screens use clinic zone.
