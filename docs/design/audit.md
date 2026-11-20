# CarePath baseline audit (DESIGN-BRIEF section 17)

Captured from the real app (worktree wp/design, API 4050, web 3050, seed anchor 2026-11-19T16:00Z, fixed clock). 235 files in `docs/design/baseline/`: `<role>-<screen>-<width>.png` at 375, 390, 768, 1024, 1440, 1920 (full-page, except dialogs, which are viewport-only), plus `_probe.json` (per screenshot: horizontal overflow, computed background colours, count of interactive elements smaller than 24 px, axe serious/critical at 1440).

Evidence rules: items marked (seen) come from looking at the PNG; items marked (probe) come from `_probe.json` or source files. Screens I did not open one by one are covered only by probe data and are labelled so. Screens whose filename role is `public` are sign-in and landing; `patient-onboarding-*` were captured signed out (steps 1 and 2) and as `patient.intake` (resume step).

Capture caveats: full-page captures draw the patient sticky bottom tab bar in the middle of the page at 375/390 (seen in `patient-today-session-persona-375.png`); that is a capture artefact, not a layout bug. Session player and discomfort screens use a rotating patient persona per width (demo, resume, flare, noai, org1.007, org1.009), so Today/plan content in `patient-today-session-persona-*` differs by width. Because the player and stop sheet end the session, later widths hit different states; `patient-session-paused-*` exists where the persona was paused.

## 1. Token inventory (`packages/ui/src/tokens/tokens.ts`, generated to `styles/tokens.css`)

Two themes: `patient` (Source Serif 4 headings, 17 px body, 48 px controls, 56 px rows) and `clinician` (IBM Plex Sans headings, 14 px body, 32/24 px controls, 36 px rows). Radius 6 (control) and 10 (container). One overlay shadow. 4 px spacing grid. Chart series are four greens/greys.

Shared colours (both themes): primary `#1E4D40` (hover `#173D33`, active `#0F2A22`, subtle `#E3EEE9`), border-control `#76817C`, focus `#0B5FA5`, success `#1E5A3A`/`#E5F1E8`, warning `#7A4A00`/`#FBF0D9`, error `#8E2A1E`/`#FBE9E5` (hover `#6E2016`), info `#1F4E6B`/`#E6F0F5`, neutral-ink `#3F4A45`, ai-rule `#76817C`, charts `#1E4D40 #55615C #8A938E #1B2622`, scrim `rgb(23 32 29 / 0.5)`.

Patient theme: bg `#F5F2EA`, surface `#FFFFFF`, surface-sunken `#ECE8DC`, ink `#1B2622`, ink-muted `#55615C`, border `#D8D3C4`, neutral-bg `#ECE8DC`, disabled-bg `#ECE8DC`, disabled-ink `#5F6A65`.
Clinician theme: bg `#F6F7F6`, surface `#FFFFFF`, surface-sunken `#ECEFED`, ink `#17201D`, ink-muted `#56625E`, border `#DADFDD`, neutral-bg `#ECEFED`, disabled-bg `#ECEFED`.

### Warm values that violate the brief

| Value | Token | Where it shows (seen/probe) |
|---|---|---|
| `#F5F2EA` | patient `bg` | Every patient page, sign-in, landing, onboarding. Also the `<body>` background on every screen of every role at 1440 (probe: `bodyBg rgb(245,242,234)` on all 40 screens at 1440), so it leaks around clinician and admin shells wherever the shell does not fill the viewport (see section 3, admin and schedule at 390). |
| `#ECE8DC` | patient `surface-sunken`, `neutral-bg`, `disabled-bg` | Demo banner strip on all roles including clinician (`clinician-overview-1440.png`, `admin-patients-390.png`), table header on patient Progress (`patient-progress-1440.png`), neutral chips, hover/pressed pain-scale button "2" in `patient-discomfort-pain-sheet-390.png`, disabled controls. Probe counts at 1440: clinician 13 elements, admin 3, patient 25. |
| `#D8D3C4` | patient `border` | Every patient hairline and card border (tan outline on cards in `patient-today-1440.png`). |
| `#FBF0D9` | shared `warning-bg` | Warning chips and banners (patient 2 elements at 1440). Cream-yellow tint. |
| `#7A4A00` | shared `warning-ink` | Brown text on `warning-bg`; reads as muted brown accent (for example the "Awaiting assignment" tag in `admin-patients-390.png`). |
| `#F5F2EA` baked into images | illustration paper | See below. |
| `#8E2A1E`, `#FBE9E5`, `#6E2016` | error set | Brick red on pink; not cream but warm. Flagged for review, not clearly a violation. |

Near-neutral but warm-tinted greys: clinician `bg #F6F7F6`, `surface-sunken #ECEFED`, `border #DADFDD` and `ink-muted #55615C` carry a slight green cast; acceptable, but they do not match any of the brief's Directions A to C canvases (`#F5F7FA`, `#F4F7F8`, `#F6F8FC`).

### Illustration paper background
The 18 exercise, body-area and "moment" illustrations in `apps/web/public/assets/illustrations/*.webp` (960 by 720, plus 480 variants) have an opaque paper fill of `#F5F2EA` (corner samples `#F5F2EA` / `#F5F2EC`), the same cream as the page background. `moment-nothing-to-review.webp` is transparent (RGBA). They are rendered inside a `bg-bg` box with a border (`apps/web/components/illustration.tsx`), so on white cards they show as cream rectangles (seen: `patient-today-1440.png`, `patient-session-player-390.png`). They must be regenerated or re-exported with transparent or white backgrounds. Stroke colour is dark forest green with brown skin and tan accents.

## 2. Findings that apply to every screen

Inconsistent colours / warm surfaces
- Cream page background and tan borders on all patient and public screens (all `patient-*` and `public-*` files).
- Clinician and admin shells are themed `clinician` but the root and `<body>` still use the patient cream (probe). Visible as cream behind admin at 390/375/768 and beside the schedule at 390 (`admin-patients-390.png`, `clinician-schedule-390.png`).
- Demo banner is tan on every role (`clinician-overview-1440.png`).
- Two heading typefaces: serif for patient, sans for clinician. Brand mark "CarePath" appears as serif green text with no logo or mark, in patient header and sign-in; plain sans text in clinician sidebar.

Generic layouts
- Patient Today is a single column of stacked sections divided by hairlines (Daily check-in, Next appointment, Messages, This week, Your care plan, Reminders), all the same visual weight (`patient-today-1440.png`). At 1440 the content column is about 640 px wide, centred, with large empty margins.
- Clinician Overview is a two-column grid of bordered cards with dashed empty-state boxes ("No unread messages", "No plan versions published this week") that take as much room as real content (`clinician-overview-1440.png`).
- Sign-in at 1440 puts a demo-account chooser (four large cards listing emails) next to the form with equal weight (`public-sign-in-1440.png`).

Unnecessary components
- Reminders section repeats the next appointment already shown above it (`patient-today-1440.png`).
- Dashed empty-state cards on the clinician Overview for two zero-count sections.
- Demo-account chooser on the production sign-in route (needed for demos, but visually primary).

Weak hierarchy
- Patient Today: the primary action (start session / add check-in) is a card at top, but every following section uses the same h2 size and rule, so nothing ranks. Pain check-in prompt on a day with a completed session is plain text with no button (seen: "Daily check-in ... Tell us how it went", no action visible; the button appears above in the session card).
- Clinician Overview: review tasks, check-ins and missed activity all use the same card and row style; priority (pain 8 of 10) is not distinguished beyond text and an "In review" chip.
- Page titles are a modest 24 px (clinician) with no page-level actions grouped; "Refresh lists" floats top right.

Accessibility
- axe serious/critical at 1440: zero violations on every screen scanned (probe). Status is conveyed with text and icons, not colour alone (seen).
- Interactive elements under 24 px in either dimension (probe, at 390): clinician-overview 21, clinician-patients 29, clinician-record-overview 26, clinician-review-queue 23; patient Today 5; one on nearly every patient screen (likely the skip link or a visually small link; not identified). Clinician controls are 32 px high by token and row links are text links.
- Pain scale buttons (0 to 10) are 40 to 56 px, fine; the selected state is dark green and the hover/pressed state is cream, which reads as "selected" in `patient-discomfort-pain-sheet-390.png` (the "2" button is tan while "8" is selected).
- Text links in clinician tables (patient names) use underlined 13 px green; low differentiation from body text but underlined.

Navigation
- Patient: top header with CarePath, "Contact care team" and "Sign out" buttons plus a four-item tab row (Today, Progress, Appointments, Messages). Plan, Check-in and Consent are not in the nav; they are reached through links in Today. At 390 the tab bar becomes a sticky bottom bar.
- Clinician: left sidebar of five items (Overview, Patients, Schedule, Messages, Review queue). At 375/390 the sidebar becomes a full-width stacked block above content that takes about 280 px of the first screen before the page title (`clinician-schedule-390.png`, `clinician-overview-390.png`); no collapsed menu.
- Admin: a one-item sidebar (Patients) at 1440; "Settings, metrics and audit screens arrive in a later phase" is stated on the sign-in card (`public-sign-in-1440.png`), i.e. admin is a single screen.

## 3. Per screen

### Public
- `public-sign-in-*` (seen at 1440): cream page, serif "Sign in", two inputs, one primary button, "Start here" link for new patients. Form column is half-width with empty space under it while the demo cards fill the right column. Hierarchy between the two columns is flat. `public-sign-in-errors-*`: captured after an empty submit; not opened individually (probe only).
- `public-landing-*`: probe only (cream body, no axe violations at 1440).

### Patient
- `patient-onboarding-1-account-*`, `-errors-*`, `-2-code-*`, `-resume-step-*`: probe only; cream background, 11-step flow with a progress bar (from source and e2e spec: "Step 1 of 11"). One element under 24 px at 390.
- `patient-today-*` (seen 375, 1440): see section 2. At 375 the plan-changed info panel (blue-tinted `#E6F0F5`) and the "Got it" button push Daily check-in, Appointment and the rest far down; page is 2730 px tall at 375. Today is the longest patient screen by a wide margin.
- `patient-today-session-persona-*`: seen at 375 (session due state with numbered exercise list and a full-width dark green "Start today's session" button, strong hierarchy there).
- `patient-session-paused-*`, `patient-session-intro-*`, `patient-session-player-*` (seen at 390): serif exercise title, progress bar, framed cream illustration with caption "Illustration only", dose card, steps text, then a stack: primary "Done with set 1", side-by-side "Pause" and "Skip exercise", full-width red-outline "Stop, this hurts", an "Up next" line, a full exercise list and a disclaimer. Illustration is about 40 percent of the first screen at 390 and the primary button sits below the fold at 844 px height (button at y about 1085). Cream illustration box on cream page.
- `patient-discomfort-confirm-*`, `-pain-sheet-*`, `-stopped-*`: pain-sheet seen at 390: bottom sheet with 0 to 10 scale in two rows of six and five buttons (uneven wrap), anchor labels, a live "You chose 8 of 10: severe" line, optional note and Keep going / Stop session actions. Works; wrap of 0 to 10 at 390 leaves an incomplete second row; hover tint is warm. `-confirm` and `-stopped` not opened individually.
- `patient-check-in-*`, `patient-plan-*`, `patient-appointments-*`, `patient-booking-*`, `patient-reschedule-*`, `patient-messages-*`, `patient-message-thread-*`, `patient-consent-*`: probe only (cream backgrounds, no axe violations, no horizontal overflow at any width).
- `patient-progress-*` (seen 1440): bar chart and line chart render only about 290 px wide inside a 600 px column at 1440, with empty space to their right; charts do not scale with the container. Bar chart uses outline versus solid for assigned versus completed (not colour alone). Table header is `#ECE8DC`. Charts are hidden behind "Show ... as a table" buttons while the page also lists the full sessions table, so the same data appears twice. The Sessions table has 14 rows at 46 px each, long and low density.

### Clinician
- `clinician-overview-*` (seen 1440, 390): see section 2. At 390 the page is 3050 px tall; sidebar occupies the top 280 px; lists are single-column and rows wrap long rule text ("Not reviewed for 70 hours. Clinic rule: 48.") onto several lines. Probe: 21 interactive elements under 24 px at 390.
- `clinician-patients-*`: probe only (29 small targets at 390, no overflow at 390 for this screen).
- `clinician-record-overview-*`, `-plan-*`, `-activity-*`, `-appointments-*`, `-check-ins-*`, `-history-*`: probe only, except appointments: horizontal overflow of 253 px at 375, 238 at 390, 100 at 768 (probe).
- `clinician-plan-builder-*` (seen 1440): two columns, library on the left (25 of more exercises, search, filters, Add buttons per row) and the editable plan on the right with Build / Patient preview / Versions tabs. Each exercise card repeats six numeric fields, a seven-checkbox weekly schedule and a large instructions textarea, so four exercises take about 1,100 px; the library column is a fixed-height scroll box cut off mid-row at the page fold. Inputs are narrow relative to the card; "Review and publish version 4" is a small dark chip at the top right. Move up/down arrow buttons and "Remove" text link are small. Goal 1 text input truncates ("...without needing to").
- `clinician-review-queue-*`: probe only (23 small targets at 390).
- `clinician-schedule-*` (seen 390): the day table overflows the viewport; the "Visit type" column is cut off at 390 and the document is 635 px wide at 390 (probe overflow 245 px at 390, 260 at 375, 107 at 768), leaving a cream strip to the right of the layout (`clinician-schedule-390.png`). Day navigation (Previous day / Today / Next day / date) is four stacked controls at 390.
- `clinician-inbox-*`, `clinician-inbox-thread-*`: probe only.

### Admin
- `admin-home-*`, `admin-patients-*`, `admin-assign-dialog-*` (seen `admin-patients-390.png`): horizontal overflow at 375 (401 px), 390 (386 px) and 768 (248 px) (probe, identical on all three screens). At 390 the page lays out at 776 px wide, so the header, filters and table are cut at the 390 viewport edge and the rest is cream; the table shows Patient, MRN and a truncated Status ("Awaiting"). Pagination wraps into three separate stacked buttons. At 1440 the shell shows one nav item. Assign dialog captured viewport-only; not opened individually.

## 4. Responsiveness summary (probe)
- Overflow-free at all six widths: public, all patient screens, clinician overview, patients, plan builder, review queue, inbox, inbox thread, record tabs other than appointments.
- Horizontal overflow: `clinician-record-appointments` (375/390/768), `clinician-schedule` (375/390/768), all three admin screens (375/390/768).
- 1920: the layouts stay as at 1440 (patient column and clinician grid do not use the extra width); not opened individually, inferred from the fixed column widths seen at 1440.

## 5. Incomplete interactions and functional notes
- Nothing seen failed functionally: sign-in for patient, therapist and coordinator worked, onboarding steps 1 and 2 validated and advanced, session start, pause/resume, stop and the pain sheet worked, plan builder loaded drafts, and the assign dialog opened (seen via the capture script succeeding at every step).
- Admin is a single screen; settings, metrics and audit are described as "arrive in a later phase" on the sign-in demo card (`public-sign-in-1440.png`).
- Charts on Progress are non-interactive (no hover detail) but have a table alternative.
- Onboarding step 2 after a valid step 1 submit created no account until the code step; not otherwise exercised beyond step 2.
- No visible regressions against the e2e spec were observed; no e2e suite was run in this audit.
