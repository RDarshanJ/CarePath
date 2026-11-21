# DR-004: Design checkpoint D2 (foundation review before the screen slices)

Date: 2026-11-21. Decider: lead advisor. Status: decided.
Scope: `rebuild-plan.md` section 3, "Checkpoint D2". Foundation reviewed: D-WP-1, D-WP-2, D-WP-3, D-WP-5, D-WP-6, D-WP-7 as merged on `main` at `83e818e`.
Read against: `docs/DESIGN-BRIEF.md` sections 2, 10, 15, 19; `docs/COMPONENT-BRIEF.md`; DR-001, DR-002, DR-003; `design-tokens.md`; `audit.md`.

## 1. Verdict

**Go with fixes.** The screen slices may start once the D-WP-U batch in section 4 is merged. Nothing in the foundation has to be redone. Ten fixes change what every slice would otherwise inherit, so they are made once, first.

## 2. Evidence and its limits

Looked at as rendered images (not only probe data):

- `docs/design/after/d-wp-6/`: 41 shell captures across all six widths, 16 of them side by side with the matching `docs/design/baseline/` file. Patient: Today (two personas), session intro, session player, pain sheet, session stopped, booking, reschedule, appointments, messages, message thread, progress, plan, check-in, onboarding account, onboarding errors, onboarding resume step. Clinician: overview, patients, record overview, review queue, schedule, inbox thread, plan builder. Admin patients. Sign-in. Widths seen: 375 (5), 390 (17), 768 (4), 1024 (2), 1440 (11), 1920 (2).
- `docs/design/after/d-wp-5/` at 1440: generated drafts (whole page), identity, clinical data, planning and messaging (top third of each).
- The primitives gallery (`design-system-1440.png`): type, shape, icons, buttons.
- All 25 illustration files composited on `surface-sunken`.
- `_probe.json` of the D-WP-6 set, grouped by offending element.
- Source read where an image raised a question: `staff-shell.tsx`, `button.tsx`, `selection.tsx`, `charts.tsx`, `nav.tsx`, `e2e/fixtures.ts`, `labels/ai.ts`.

Limits. One reviewer, one pass. No patient, clinician or other participant saw anything. Not opened: the reduced-motion and 200 percent zoom gallery captures, the lower two thirds of four kit pages, patient consent, clinician record tabs other than overview, clinician inbox list, admin home and the assign dialog. Page content inside the shells is still the pre-rebuild layout, so layout findings from `audit.md` section 2 are still visible and are not held against the foundation.

## 3. What the rendered foundation shows

**It now reads as clinical software, not as a wellness template.** The warm paper is gone on every image seen and the probe finds no warm background outside status tokens. Navy ink on white with a cool canvas, one cobalt action colour, Plex Sans with Mono MRNs, and the graphite draft block give the clinician directory, review queue and patient banner the look of a real record system. The patient screens read calmer and more precise than the baseline.

**Plex Sans for patients (DR-001 untested assumption, rebuild-plan risk row): kept.** At 17/26 with 600-weight headings on Today, the player and booking at 390 it reads plain and exact, not cold. No token change.

**What still reads generic, and why.**

1. **Cobalt outline is used as the default second button.** `apps/web` has 75 `variant="secondary"` uses against 17 `neutral`. On the rendered screens this puts 11 blue "Mark reviewed" outlines beside 11 blue name links on Overview, 25 blue "Add" outlines in the builder library, about 14 blue time slots per booking screen, and a blue "Contact care team" outline in the header of every patient screen. The one filled action no longer stands out, which is the hierarchy DR-001 chose cobalt to protect. `design-tokens.md` section 3 already limits the cobalt outline to "the secondary action of a view"; the screens do not follow it.
2. **Page composition is unchanged**: equal-weight stacked sections on Today, a card grid with a dashed empty box on Overview, pills on every library row. This is slice work and is the reason the slices exist.

**Shell defects seen.**

- Staff sidebar is `min-h-dvh` below the 29 px demo notice, so every clinician page is 29 px taller than the window and "Sign out" is cut at the fold on load (seen at 768, 1024, 1440; every short clinician capture is 929 px tall in a 900 px window).
- At 768 the 240 px sidebar takes 31 percent of the width; the review queue shows two columns of five and the directory is cut. At 1024 the directory is still cut after "Care plan".
- Patient bottom bar at 375 and 390 breaks "Appoint / ments" mid-word. The count badge sits on top of the Messages and Review queue icons.
- At 1920 clinician content runs the full 1,680 px.
- Sign-in: the demo chooser is now secondary in position but its four 17 px cobalt titles are the loudest text on the page. One of its lines promises screens that "arrive in a later phase".

**Illustrations.** The 12 exercise pictures and 3 moment pictures are consistent, cool and transparent. The 10 `area-*` fallback pictures are tight crops; at player and overview size "Shoulder blade squeeze" shows a headless torso (`patient-session-player-390.png`, `patient-session-intro-390.png`), next to full-figure pictures for other exercises in the same plan.

**Kit and shells agree** on colour, type, radius, focus ring and tag forms. The kit is ahead of the screens in three places the slices must adopt, not re-invent: neutral disclosure buttons, body area and category as plain text (no pills), and the patient banner.

**Colour discipline.** Status is not brand blue anywhere seen; warning, error and success keep their own hues with an icon and words. The draft block is graphite with a dashed rule and turns to a solid cobalt rule only after approval, as DR-001 intended. Two notes: the four stacked header lines of the draft block are all weight 600, so the label, the provider and the demo notice outrank the draft text; and the block is only clearly separate from its surroundings on white, not on the canvas.

**Accessibility signals.** One skip link per page, visible focus ring with halo, error summary with linked items, selected state shown with a check as well as fill, zero axe serious or critical findings at 375, 768 and 1440, zero horizontal overflow on 278 images. Open: targets (section 6.5).

## 4. Foundation fixes before the slices (owner: D-WP-U, opus)

One batch, one gate (`gate-wp-d2.sh`, `gate-wp-d5.sh` and `gate-wp-d6.sh` re-run, then `pnpm verify`). For this batch only, D-WP-U also owns the shell files of D-WP-6, `(public)/login/**`, `apps/web/components/illustration.tsx`, `apps/web/scripts/design-capture.mjs` and `apps/web/e2e/fixtures.ts`. Priority order.

| # | Fix | Where | Measure |
|---|---|---|---|
| U1 | Sidebar height. Remove the forced scroll. | `(clinician)/_components/staff-shell.tsx:91` | Sidebar height is the window minus the demo notice (put the notice inside the scrolling column or subtract its height through a CSS variable). On a page shorter than the window, `document.scrollHeight === innerHeight` and "Sign out" is fully visible at 768, 1024, 1440. Add to `shells.spec.ts`. |
| U2 | Sidebar starts at 1024, not 768. Below 1024 the staff shell is the short top bar plus the labelled bottom bar. This amends CD-501 and the D-WP-6 row. | `staff-shell.tsx`, sticky-offset tokens, `shells.spec.ts` | At 768 the main column is the full 768 px. Clinician and admin `main` content is capped at 1440 px, left-aligned, so 1920 stops stretching. |
| U3 | Neutral is the default second button. No token changes. `SlotButton` unselected becomes `border-control` + `ink`, hover `primary-subtle`; selected stays `selected-bg` + `selected-edge` + check. `ExerciseSummary` library "Add", `MessageItem` "Retry sending", `ReviewDecisionBar` "Reject draft" and the patient header "Contact care team" become `neutral`. The `button.tsx` doc comment and `design-tokens.md` section 3 gain the rule in section 5.1. | `primitives/selection.tsx:216`, `healthcare/plan.tsx`, `messaging.tsx`, `ai.tsx`, `(patient)/_components/patient-frame.tsx` | Gallery recapture; no cobalt outline left in the kit except where a specimen shows the `secondary` variant itself. |
| U4 | Bottom bar label and badge. New text role `nav-label` 13/16, weight 500, for bottom-bar labels in both themes (the only patient text below 15, as tab labels beside an icon). Remove the `<wbr>` in "Appointments". Badge anchored to the icon's top-right corner with its centre outside the icon box. | `tokens.ts` (`textExtra`), `composed/nav.tsx`, `patient-frame.tsx`, token test | "Appointments" on one line at 375 with four tabs; the Messages and Review queue icons fully visible with a badge; bar stays 64 px. |
| U5 | Targets. Links and name buttons inside `Td` and list rows get a 24 px minimum hit height (`inline-flex min-h-6 items-center`) with the 36 px row unchanged. Patient-theme inline "Sign in" style links used alone on a line use the `standalone` variant (48 px). | `primitives/link.tsx`, `composed/table.tsx`, `healthcare/identity.tsx` | See ruling 6.5. |
| U6 | Probe counts real targets only. Exclude `.sr-only` elements that are not focused, native `select` elements of 1 px, and measure a checkbox, radio or switch by its label box. Then add `targets` to `PROBE_FAIL_ON`. | `apps/web/scripts/design-capture.mjs` | D-WP-6 recapture reports only content targets; the count is written into `docs/PROGRESS.md`. |
| U7 | Unsupported-statement wording, one source (ruling 6.4). | `packages/shared/src/labels/ai.ts`, `healthcare/ai-text.ts`, tests | Kit calls the shared helper; no second string. |
| U8 | Draft block header weight. State label stays 600. "Provider: ..." and `DEMO_PROVIDER_NOTICE` become weight 400 in `ink-muted` at the small size, still on every block. | `healthcare/ai.tsx` | The draft text is the heaviest body text in the block. |
| U9 | Illustration fallback. `exerciseIllustration` returns no picture for the `hero` and `overview` sizes when the exercise has no picture of its own; `area-*` files appear only as tiles of 64 px or less (library, plan rows). | `apps/web/components/illustration.tsx`, manifest note | No `area-*` file rendered wider than 64 px in any capture. Generating more pictures is not approved here. |
| U10 | Sign-in chooser. Row titles in `ink` weight 500 (the row and its chevron are the link); form panel capped at 26rem. | `(public)/login/**` | "Sign in" is the only cobalt-filled or cobalt-text control above the fold at 1440. |

Also in the batch, no design effect: CD-201, CD-311, CD-335, CD-501, CD-530 and CD-534 are edited to match section 6, and the D-WP-6 capture set is re-recorded as `docs/design/after/d-wp-u/`.

## 5. Guidance every slice follows

### 5.1 All slices (D-WP-8 to 16, WP 5.3, WP 6.2)

1. **Buttons.** One `primary` per view. `secondary` (cobalt outline) at most once per view, and only for the single supporting action that sits beside or stands in for the primary. Everything repeated per row or per card, and every utility (Refresh, Pause, Skip, day navigation, Got it, Reschedule, Cancel visit, Mark reviewed, Add, Assign, table toggles) is `neutral`. Remove and Clear are `quiet`. Each gate greps its owned paths: more than one `variant="secondary"` per route file needs a comment naming the view it belongs to.
2. **No pills for attributes.** `Tag` is for a lifecycle status that is not the default; `StatusChip` is for something that needs attention. Body area, category, visit type and role are plain text. The default state (patient "Active", plan "Published", task "Open") is plain text in lists; the patient banner keeps its Tag.
3. **Surfaces.** Page canvas `bg`; content on `surface` panels with `border` and radius 10; no panel inside a panel (use a `border` rule or `surface-sunken` header row). `AIDraftBlock` always sits on `surface`. `Banner` holds one or two sentences and at most one action; longer content is a panel.
4. **Empty states.** Inside a panel, an empty list is one line of `ink-muted` text. The dashed `EmptyState` box is for a whole page or a whole main column only.
5. **Rhythm.** Patient: 32 px between sections, 16 px inside, one column capped at 45rem, charts passed a `width` that fills it. Clinician and admin: 24 px between panels, 16 px panel padding, 36 px rows, tables at 13/18.
6. **Tables below 768** are stacked lists (CD-339); nothing scrolls sideways inside a box at 375 or 390. At 768 and 1024 drop columns by priority before truncating; no ellipsis on a cell while the table has free width.
7. **Pictures.** After U9, an exercise without its own picture gets a text-first layout, not an empty tile.
8. **Gate.** Capture with `PROBE_FAIL_ON=warm,overflow,axe,targets` at the six widths. Axe runs through `expectNoAxeViolations` only (ruling 6.6).

### 5.2 Per slice

| Slice | Must follow |
|---|---|
| D-WP-8 Onboarding | Form column capped at 32rem on `surface` from 768. Availability days and limitations are `Checkbox` groups, not `ToggleChip` (ruling 6.1). Header "Sign in" link at the 48 px target. Error summary items evenly spaced at 8 px. |
| D-WP-9 Today, plan, progress | The session panel is the only panel with a filled button; drop the 3 px cobalt top edge. "Your plan changed" becomes a panel with a `neutral` "Got it", shorter than the session panel at 390, never an info `Banner`. Sections below it are rows with one link each, not equal-weight headed blocks. Charts fill the 45rem column at 1440. |
| D-WP-10 Player and pain | Order at 390: exercise name, dose, primary action, then picture and steps. Primary visible without scrolling at 375 by 667 with or without a picture. Pause and Skip `neutral`; Stop keeps `tone="critical"`. Pain scale selected stays cobalt with a check; no value colouring. |
| D-WP-11 Scheduling | Slots use the U3 neutral `SlotButton`, three per row at 375 with equal widths. Day and time-of-day filters stay `ToggleChip`. One primary ("Book a visit" or the confirm). Reminder is one line with an icon. |
| D-WP-12 Messaging | Kit `MessageThread` and `MessageComposer` only. Staff composer shows neither patient notice (the current staff page shows both). Own messages `selected-bg` without border; failed message keeps the 2 px `error-ink` border. |
| D-WP-13 Directory and queue | No Tag for Active. "Why it appeared" wraps to two lines and is not truncated at 1024 and wider. High-priority tasks carry the CR-9 tag in `critical-subtle`; nothing else in the queue is red. The detail pane has one primary (Resolve) and `neutral` for the rest. |
| D-WP-14 Overview and schedule | No dashed boxes; a zero-count group is one header line. "Mark reviewed" `neutral`. Each row is name, one reason line, age right-aligned in tabular digits. Schedule day navigation is one row of `neutral` controls at 390. |
| D-WP-15 Record | Kit `PatientBanner`, with age. "Open care plan builder" is the page's one primary. Summary strip stays one bordered row of four at 1024 and wider, two by two below. Timeline status column uses Tag and StatusChip per 5.1.2. |
| D-WP-16 Builder | Kit `ExerciseSummary` library rows (text attributes, `neutral` Add) and `DoseEditorRow` collapsed by default. "Review and publish" is the one primary and stays visible while scrolling. |
| WP 5.3 AI review | One `AIDraftBlock` per draft on `surface`; Approve is the only primary; Reject `neutral`. The cobalt rule appears only on approved blocks. No cobalt tint anywhere on unreviewed generated text. |
| WP 6.2 Admin | Removes the sign-in sentence "Settings, metrics and audit screens arrive in a later phase" when those screens exist. Metric tiles are numbers with their window and denominator in text, no coloured tiles. "Registered" shown as a clinic-zone date without "(UTC)". Adds admin navigation in the shell only when there is more than one destination (CD-502). |

## 6. Rulings

**6.1 ToggleChip: `aria-pressed` button stands (CD-311 wins), with a scope.** A `ToggleChip` is a filter that takes effect at once (booking days and time of day, queue rule chips). It is a button with `aria-pressed`, inside a group with a visible label, selected shown by fill plus check. A choice that is a form value saved on submit (onboarding limitations and availability, plan schedule days) is a `Checkbox` group in a `fieldset`. No chip-styled checkbox is built. CD-534's "Rejected: button aria-pressed chips" is narrowed to form values.

**6.2 LoadMore: focus moves to the first new item (CD-335 wins).** It is the later and specific record, and it puts a keyboard or screen-reader user where the new content starts. Conditions: the item receives focus without landing under a sticky bar; a polite status gives "Showing N of M"; on failure focus stays on the button with the inline error and Retry; at the end the button is replaced by the end text. CD-530 gains this as its one exception.

**6.3 Birth date reads "Born Mar 3, 1989 (37 years)": accepted.** One date formatter for the product, and `microcopy-guidelines.md` section 5 already uses month-first. CD-201 is corrected. The age stays in the banner.

**6.4 Unsupported statements: "No supporting record", in the shared helper.** The chip reads "No supporting record" and the count reads "1 statement has no supporting record" or "N statements have no supporting record". "Found" is dropped because the check confirms a cited record exists and does not search. "No source" is dropped because it can be read as the draft having no input at all. `unsupportedStatementsText` is changed and the kit calls it (U7).

**6.5 Sub-minimum targets: fix in the kit, then gate.** The 13 px table links (17 px tall) sit in 36 px rows, so WCAG 2.5.8's spacing exception is met and this is not an axe failure. The project's own G5 rule is stricter (24 px clinician, 48 px patient) and stands. U5 fixes the shared link once and U6 removes the three false positives (hidden skip link, 1 px native select, bare checkbox input), after which `targets` joins `PROBE_FAIL_ON` for every slice. Slices do not fix link height locally.

**6.6 Axe with sticky bars in the page flow: accepted, with two conditions.** The finding it removes depended on the scroll offset left by the previous page, not on the design. Conditions: `withStickyBarsInFlow` in `e2e/fixtures.ts` is the only place that changes layout for axe; and every slice with a sticky bar keeps a G6 keyboard pass asserting that each focused control's box does not intersect the bar. Real obscuring is caught there.

**6.7 Possible `auth.spec` flake (axe `document-title` on `/admin/patients` after sign-in): not masked.** No retry is added. The test waits for the page `h1` before running axe. If it fails again with the heading present, that is a product defect (a navigation that leaves the title empty) and is fixed in the shell, with the failing run pasted into `docs/PROGRESS.md`.

**6.8 Also accepted from the package notes:** DR-002 H order over CD-501's; 48 px patient floor for `SlotButton` and the pain scale over CD-311's 44 px; rejected draft text without strike-through; provider name in Plex Sans; the `pending` draft state built but not shown by WP 5.3; chart table above the chart until the figure is 56rem wide.

## 7. Slice order

Unchanged from `rebuild-plan.md` section 4, with one insertion and one condition.

| Wave | Runs | Note |
|---|---|---|
| 3.5 | **D-WP-U (section 4)**, alone on `packages/ui` and the shells | D-WP-8 and D-WP-10 may begin on their route folders at the same time, but record no captures and run no gate until they are rebased on the merged batch |
| 4 | D-WP-8 with D-WP-10, then D-WP-9 with D-WP-11, then D-WP-12 with D-WP-P | then D-WP-U, **D3** |
| 5 | D-WP-13, then D-WP-14 with D-WP-15, then D-WP-16 | then D-WP-U |
| 6 | WP 5.3 with WP 6.2 | |
| 7, 8 | D-WP-18, D-WP-19 | **D4** |

D3 additionally checks section 5.1 rule 1 on the patient set by count: filled and cobalt-outline buttons per captured screen.

## 8. Open, stated as open

- Whether patients find cobalt on white approachable, and whether clinicians read the graphite block as "not yet mine", remain untested (DR-001 section 4).
- U2 moves tablet portrait to a bottom bar on judgement from four captures; no staff user was asked.
- The `nav-label` role at 13 px is an exception to the patient scale, taken on judgement.
