# 17. Light families: buttons and links, fields, filter bar, tabs, choice controls, feedback surfaces, progress, avatar, typography elements, icons

Status: provisional until advisor sign-off. Protocol: `docs/design/component-research/PROTOCOL.md`; brief: `docs/COMPONENT-BRIEF.md` sections 7, 8, 10, 13, 14, 18 and 21; scope from `docs/design/component-research/INDEX.md` ("Light"). Access date for every external source: 2026-11-20. No colours are chosen; semantic token roles only. Decision records: CD-530 to CD-540. These are conventional elements: per protocol item 5 the established pattern is reused and no invented alternatives are scored; where two real options exist they are named and the choice is justified. Tabs are decided in `14-navigation.md` (CD-504); overlays in `16-overlays.md`; typography sizes in `typography-exploration.md`; wording in `docs/design/microcopy-guidelines.md`.

Evidence labels: [Observed], [Prior], [Judgement], [Assumption]. No user testing has been run.

## 0. Source register

| Ref | Source | URL | Observation |
|---|---|---|---|
| S1 | GOV.UK Design System, button | https://design-system.service.gov.uk/components/button/ | [Observed] One primary per page; secondary for supporting actions, and many secondary buttons mean the page should be simplified; warning (destructive) only for irreversible actions, with a confirmation step, and not by red alone; sentence case; label names the specific action and matches behaviour ("Save and continue" versus "Continue"); links may be styled as buttons. |
| S2 | GOV.UK, select | https://design-system.service.gov.uk/components/select/ | [Observed] A select is a poor fit for long lists; ask a narrowing question first; use radios as the alternative; use checkboxes for multiple choice. |
| S3 | GOV.UK, error message | https://design-system.service.gov.uk/components/error-message/ | [Observed] Errors only for input the user can fix; say what is wrong and how to fix it; repeat the question's wording; same text in field and summary; hidden "Error:" prefix; message above the input after the hint; do not clear entered answers. |
| S4 | USWDS, button group (segmented) | https://designsystem.digital.gov/components/button-group/ | [Observed] Segmented group for closely related controls such as views of the same content; three or fewer; built from buttons; the current selection must be clear; group role on the container. |
| S5 | GOV.UK, notification banner | https://design-system.service.gov.uk/components/notification-banner/ | [Observed] For information not tied to the page task; not for validation errors and not beside an error summary; avoid several on one page; success banners confirm an action from a previous page; headings like "Success" so meaning does not rely on colour; placed before the main heading. |
| S6 | NHS Design System, warning callout | https://service-manual.nhs.uk/design-system/components/warning-callout | [Observed] For time-critical or health-significant information; not for telling people to contact a GP or seek help (care cards are for that; that page was not retrieved); short specific heading; at most two per page; headings favoured over exclamation icons. |
| S7 | WCAG 2.2: 1.4.1, 2.5.8, 3.3.2, 3.3.3 | https://www.w3.org/TR/WCAG22/ | [Prior, not re-fetched this session] Colour not the only cue, 24 px minimum target, visible labels, error suggestion. |
| M30 | Stripe, web, Customers list | https://mobbin.com/screens/c29c4c01-c175-4e9c-9511-0dcf4cddcf2d | [Observed] Search field above the table with a "1 filter" control, saved-view chips, "1 - 1 of 1 results" and previous and next arrows below the table. |
| M31 | Searchable, web, pages table | https://mobbin.com/screens/638377ec-b5ad-455f-a482-fefb307f2666 | [Observed] Search field, a "3 selected" pill with a clear control, bulk action button, sortable column headers. |
| M32 | Remote, web, dashboard | https://mobbin.com/screens/5378bb91-46ae-4aeb-ad4f-843e418be8d0 | [Observed] "You're all caught up" empty state with one explanatory sentence. |
| M33 | Plane, web, record requests | https://mobbin.com/screens/2baeae80-10a5-43cc-b18a-4db4fee5b1ff | [Observed] Empty state with an icon, "There're no requests to show yet.", a one-line explanation and one button. |
| Inside the repo | `docs/design-system/components.md`, `packages/ui/src/components/*`, `component-usage-matrix.md` | n/a | [Observed] Current components and their documented rules. |
| Not retrieved | CMS Design System, Material 3, Carbon, Fluent, Spectrum, Polaris, DHCW pages for these elements | not attempted or blocked | No claim rests on them. |

---

## 1. Buttons and links (CD-530)

Current: four link implementations (`ui Link`, `AppLink`, `TextLink`, patient `ButtonLink`), hand-styled `NextLink`s with the same classes, five "load more" variants, and one danger look applied by class override on a secondary button [Prior: matrix A2, A3, G1].

- **Decision.** One text link (`ui Link`, with `linkAs` for Next), one button-styled link (`Button asChild` with `Link`, or `Button href`), one show-more control, one danger rule. Delete `AppLink`, `TextLink`, `ButtonLink` and the hand-styled `NextLink`s.
- **Hierarchy (S1 and brief section 8).** One primary button per screen region; secondary for supporting actions; quiet for the third tier; danger only for the confirming button inside a `ConfirmDialog` (CD-521). No button styles by class override; the "Stop, this hurts" treatment is decided in the high-impact family (interim: unchanged). Icon-only buttons only for dialog close, toast dismiss and move up or down, each with `IconButton label`; elsewhere a word.
- **Links.** Underlined at rest in running text and in lists; target at least 24 px high in the clinician theme and 48 px in the patient theme except inline in a sentence [S7, Prior]; link text names the destination ("Open the patient record", never "click here"); a link that goes to a different place than the visible text says is not allowed; external and `tel:` links show the number or domain as the text.
- **Link or button.** Navigation is a link; an action that changes data or opens an overlay is a button (S1 allows links styled as buttons for navigation actions such as "Open care plan builder").
- **Show more.** One pattern: secondary `sm` button reading "Show more {things}" (for example "Show more visits", "Show more tasks"), loading label "Loading", placed after the list, focus stays on the button and the first new item is announced through the list's status line ("5 more visits shown"). Chronological exception: "Show earlier messages" (CD-510) at the top of a thread. Replaces "Load more tasks", "Show later days" and the quiet and secondary variants in use.
- **Labels (S1).** Name the specific action: "Publish version 3", "Reschedule visit", "Send check-in", "Mark reviewed"; sentence case; matching behaviour ("Save draft" versus "Save and continue"). Wording rules live in the microcopy guidelines.
- **Disabled.** A disabled button is used only with a visible reason in text and `aria-describedby` (publish, builder, queue today); empty-input send buttons are not disabled (CD-511); previous or next page buttons that are at an end are either hidden or show the range text; "Today" in the day stepper is shown as current, not disabled.
- **Testing.** ESLint rule against raw `className` on `Button` that sets text or border colour; link text audit; axe; keyboard.

## 2. Text fields and textareas (CD-531)

Current: `ui Field` is adequate; `NumberField`, goal rows, filters and some labels bypass it, optional is written "(optional)" inside label text, and error markup is repeated in eight files [Prior: matrix A3].

- **Decision.** `Field` is the only label, hint and error wrapper; export `FieldError` (the markup with the hidden "Error:" prefix, S3) for the places that show an error without a full `Field` (summary, dialog row); fold `NumberField` and goal rows into `Field` + `TextInput` (numeric entry specifics belong to the clinical-inputs family).
- **Anatomy (existing).** Visible label; requirement word "required" or "optional" via the `requirement` prop, never inside the label string; optional "why we ask" line (patient and clinical fields); hint; control; error with icon. Error under the label and hint, above the input (S3).
- **Rules.** Placeholders are never labels and never carry format hints; the example or format goes in the hint. Errors say what is wrong and how to fix it, repeat the field's wording, keep entered text (S3). Counters appear only near the limit and are announced politely at thresholds. `autocomplete` tokens on identity fields; `inputMode` for numbers and phone. Textareas have a visible resize rule (vertical) and a default of 3 to 4 rows. Read-only fields use the sunken fill and keep the label.
- **States.** Default, hover, focus, filled, read-only, disabled (rare, with reason), invalid, loading (inline for async validation), long content, missing information.
- **Testing.** One test per state; `aria-describedby` order (hint, then error); axe.

## 3. Select and filter bar (CD-532)

Current: `Filter` (queue), `FilterField` (directory), raw label and control (library, admin), `DayStepper`; a two-option "Show" select; Radix `Select` as the only select [Prior: matrix A3, G].

- **Decision.** One `FilterBar` pattern and a `SegmentedControl` for two to three exclusive options.
- **Choosing the control.** Two to three exclusive options that change the list immediately: segmented control (S4: closely related controls, three or fewer). Four to about twelve options: `Select` (Radix, type-ahead). More than about twelve or a need to search: combobox, researched per use (therapist pickers are small today, so none). Several independent options: checkboxes or toggle chips (CD-534). S2 says a long select is a poor fit and radios are the alternative for short lists.
- **`FilterBar` anatomy.** A `form` with `role="search"` and an accessible name; the text search first (visible label, helper text "Press / to search" if the shortcut exists); one labelled control per filter; a result-count status line (`role="status"`, "12 patients"); "Clear filters" text button shown only when a filter is active; applied filters are visible in the controls themselves (selected values), so no separate chip row is needed at this scale.
- **Behaviour.** Defaults stated in the control ("All statuses"); changing a control updates the list at once without a submit button (selects) and after a short pause for typing; filters and search are in the URL and survive reload and the back link (CD-505); reset clears every filter and keeps the sort; empty results show a filtered-empty message with a clear action; loading keeps the previous rows with `aria-busy`. Sorting stays in column headers (complex tables family).
- **Replace.** The queue's "Show: Open and in review / Closed" select becomes a segmented control with the same two options.
- **Responsive.** Fields wrap; below md the bar shows search plus a "Filters" button opening a modal drawer (CD-524) when more than two filters exist; the count and clear remain visible outside the drawer.
- **Testing.** URL sync; clear; keyboard through every control; 320 px wrap; axe on the segmented group (radio group semantics).
- **Note.** `SegmentedControl` is built as a Radix radio group so arrow keys and a single tab stop work; S4's note about buttons applies to toolbars, and these are selection controls.

## 4. Tabs (CD-533)

Decided in `14-navigation.md` section 7 (CD-504): Radix tabs, section in the URL for the record with a history entry per change, no counts on triggers until server totals exist, heading repeated inside each panel. Builder tabs keep state in memory. No further decision here.

## 5. Checkbox, radio, switch and chips (CD-534)

Current rules exist in `components.md` (switch applies immediately, checkbox for form choices). Gaps: hand-built toggle chips and slot chips in booking [Prior: matrix A3].

- **Usage rule (documented).** Radio: one choice from two to about six visible options, always with a group legend. Checkbox: one or many choices submitted with a form; indeterminate only for "select all". Switch: a setting that takes effect immediately, with On or Off text beside it and a status line stating the result; if the change has consequences (revoking consent) the confirmation rule applies (family 15, high impact). More than six options: `Select`.
- **Toggle chip.** One `ToggleChip` in `ui`, built as a styled checkbox (a real `input type="checkbox"` inside a label) in a `fieldset` with legend, so the group gets native semantics, keyboard and form behaviour; used for the day and time-of-day filters in booking. Selected state is shown by fill plus a check icon plus the native checked state, not by colour alone. Replaces `<button aria-pressed>`.
- **Slot buttons.** Choosing a time slot is a choice that advances the flow; its pattern (list, group, selected state, calendar) is decided in the appointment scheduling family. This file only requires that whatever replaces the hand-built chips lives in `ui` and has a visible selected state.
- **Selection cards** for intake questions are decided in the clinical inputs family; none in this file.
- **Targets.** 24 px box or circle in the patient and clinician themes with the row as the hit area at least the theme target height.

## 6. Banner, inline error, empty state, skeleton (CD-535)

- **Banner.** One `Banner` (info, success, warning, error) with an optional action slot. Use it for messages tied to the page or region: errors, results, notices (S5 says to put task-related information in the main content, not in a detached notification). Page-level banners sit directly before the page `h1`; region banners sit at the top of their region. At most one page-level banner and one region banner at a time; combine or rank messages (S5). Success wording starts with "Saved" or "Done" style headings so colour is not the only cue. Never beside an error summary for the same problem. Hand-built banners (plan change note, contact warning box, sign-out error, onboarding summary) become `Banner`, `EmergencyNotice` (CD-513) or `FieldError`. `PlanChangeNote` uses the Banner `action` slot for its acknowledge button.
- **Warnings for health information.** S6 limits warning callouts to two per page and favours a specific heading over an exclamation icon; CarePath keeps its icon (consistency, text beside it) and applies the rest: specific headings, few per page.
- **Inline error.** `FieldError` as in CD-531.
- **Empty state.** Merge clinician `Empty` into `EmptyState` (props for padding and image). Anatomy: icon or illustration, heading saying what is empty, one sentence saying why and what fills it, at most one action (M32 and M33 show the same structure). Filtered-empty, closed-empty and first-use differ in copy, not in layout.
- **Skeleton.** `Skeleton` and `SkeletonGroup` mirror the final layout, static (no shimmer), `role="status"` with a visually hidden label; used for loads over about one second only [Judgement]; no skeleton for failures.
- **Spec notes.** Banners are not dismissible unless the information is not important (S5 says dismissal guidance is unresolved); error Banners are `role="alert"`, others `role="status"`; text never relies on colour; icon plus heading plus sentence.

## 7. Progress (CD-536)

Keep `Progress`: always a visible label and value text ("3 of 6 exercises", "Step 4 of 11"); never a bare percentage and never a progress bar for clinical recovery (brief section 12: activity completion is not recovery). The onboarding step count is feature A's decision. Timers use `role="timer"` and are separate from `Progress`. Test: label and value present, `aria-valuenow` correct.

## 8. Avatar (CD-537)

Keep the square-cornered initials `Avatar`, `aria-hidden`, always beside a text name and role, used only in the staff footer. No patient avatars or photos in this release (no photo data; initials collide across patients with similar names and add wrong-patient risk in identity surfaces). No sender avatars in message threads (name, role and time carry identity, CD-510). Patient identity presentation belongs to the patient identity family.

## 9. Typography elements (CD-538)

- All headings use `Heading` (levels h1 to h4) or `PageHeader`; raw `<h1>` to `<h4>` with `font-heading text-h*` classes are removed (queue, plan view, item editor, builder, common). Add an ESLint rule against raw heading tags with those classes.
- `PageHeader` moves from the clinician folder to `apps/web/components/` and is used by patient pages (replacing the copied `<header className="flex flex-col gap-1">` block) and the admin app; theme tokens supply the differences. One `h1` per page; `Section` titles are `h2`; the focus target on view change is the `h1` (`Heading focusOnMount`, replacing `ViewHeading` and `tabIndex={-1}` variants).
- Sizes come from the tokens in `typography-exploration.md` (patient 15 to 40, clinician 12 to 24); nothing below the theme minimum; numbers use tabular figures (`tabular-nums`); identifiers (MRN, IDs) use `Mono` only; measure about 60 characters for patient prose and 70 for staff notes; sentence case everywhere; no all-caps eyebrow except where the scale defines an overline (avoid; use a heading).
- No ellipsis truncation of clinical text without a way to read the whole value (CD-527).

## 10. Icons (CD-539)

- **Library.** The in-house `Icon` set (24 px grid, stroke 1.75, square caps, mitre joins; 34 names today). No third-party icon package without advisor approval; new icons are drawn on the same grid and stroke.
- **Rules (brief section 18).** An icon appears only where it improves recognition: navigation (home, activity, calendar, message, users, clipboard), status (check-circle, alert-triangle, alert-circle, info, clock), and control affordances (chevrons, plus, x, search). No icon beside every heading. Status icons are always paired with words. Icon-only controls use `IconButton label` and have the 24 px or 48 px target. Decorative icons are `aria-hidden` (existing). Sizes: 14 and 16 inline with `small` text, 18 and 20 with `label`, 22 in navigation; never scaled by `className`.
- **Same icon, different meaning.** `home` serves Today (patient) and Overview (clinician); `clipboard` serves Review queue; keep, because the label carries meaning.
- **Additions needed.** `chevron-left` (back links today rotate `chevron-right`, which is an extra transform and a source of inconsistency; CD-505). No sparkle or AI icon (brief section 16).
- **Testing.** A story listing every icon with its name and stroke check; axe for icon-only buttons.

## 11. Microcopy guidelines adopted (CD-540)

`docs/design/microcopy-guidelines.md` is the reference for page titles, headings, labels, placeholders, helper text, buttons, validation, tooltips, empty states, confirmations, clinical terminology, formats and icon rules, and records the wording mismatches from the usage matrix with the chosen wording.

## 12. Not decided here

Pagination and tables, date and time inputs, selection cards, slot buttons, error summary, retry patterns, patient identity banner content, status vocabulary (families listed in `INDEX.md`).
