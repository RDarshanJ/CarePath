# 16. Overlays and contextual surfaces

Status: provisional until advisor sign-off. Protocol: `docs/design/component-research/PROTOCOL.md`; brief: `docs/COMPONENT-BRIEF.md` section 11 (also 14, 17, 21 to 23). Access date for every external source: 2026-11-20. No colours are chosen; semantic token roles only (`scrim`, `surface`, `border`, `error-ink`, `warning`, `primary`). Decision records: CD-520 to CD-528. Builds on `feature-research/H`, `K` (builder), `L` (queue, detail pane becomes a drawer below 1280 px), `G` and `J`. The confirmation wording and layout of the high-impact actions (stop session, publish, resolve, revoke consent) belong to the high-impact-actions family; this file decides which overlay carries them and the dismissal, focus and protection rules.

Evidence labels: [Observed], [Prior], [Judgement], [Assumption]. Scores are heuristic. No user testing has been run.

## 0. Source register

| Ref | Product, platform, screen | URL | Observation |
|---|---|---|---|
| M17 | Fresha, iOS, cancel booking | https://mobbin.com/screens/8e6f1129-17cd-44a6-b927-0d1c29502c03 | [Observed] A bottom sheet "Are you sure you want to cancel?" repeating the booking (service, date, time), stating the refund, "Not sure? Contact ... Call", with "Go back" and a red "Yes, cancel" at the bottom. |
| M18 | Public, iOS, cancel recurring deposits | https://mobbin.com/screens/f7ed551c-1689-40c8-9d04-d4670e4db052 | [Observed] Centred dialog: title restating the action, one sentence of consequence, "Not now" and "Confirm". Generic confirm label. |
| M19 | LinkedIn, iOS, delete event | https://mobbin.com/screens/a6527813-d47a-4016-8027-81c021efa98a | [Observed] Centred dialog stating the action is permanent and irreversible, with "Learn more", "Keep event", "Delete event" (red) stacked. |
| M20 | Spellbook, web, unsaved changes | https://mobbin.com/screens/93208797-f739-4fd7-85e2-f32d88bb353f | [Observed] "Unsaved Changes" dialog over the editor: asks if the user is sure they want to leave and abandon changes; "Cancel" and "Leave". |
| M21 | Browserbase, web, unsaved work | https://mobbin.com/screens/430d4569-2ed0-4452-a943-b5bae631e6a9 | [Observed] "Unsaved work will be lost" with "Cancel" and "Use template": the confirm label names the action. |
| M22 | Klaviyo, web, changes affect live tests | https://mobbin.com/screens/4bb085db-e123-4ee6-92a8-e387371e9afd | [Observed] A dialog with an explanation, two choice cards and Cancel/Continue: a consequence-bearing choice inside a confirmation; long for a dialog. |
| M23 | Revolut, web, account details | https://mobbin.com/screens/5e1ac4dc-599a-4dcb-a4fe-c27b5ca05884 | [Observed] A detail panel beside the list with an X; the list stays visible and unobscured (no scrim in the preview). |
| M24 | Productboard, web, opportunity panel | https://mobbin.com/screens/411137ab-c5a4-470c-a60f-f36bbcf62c11 | [Observed] A wide right panel next to a list with back, expand and close icons; the list stays visible. |
| M25 | Givingli, web, contact panel | https://mobbin.com/screens/ebc35a6b-d145-477a-8a0b-b99985a8490f | [Observed] Right panel over a dimmed table with Edit, an X and footer actions. |
| M26 | Remote, web, project drawer | https://mobbin.com/screens/a3cd6bab-cdfa-42fc-8477-08732d25d359 | [Observed] Right drawer with scrim over the page, a definition-style list of fields and a "Close" button at the foot. |
| M27 | OpenTable, iOS, seating option | https://mobbin.com/screens/aa8d3867-1a6a-4779-9337-0ec19cb30e00 | [Observed] Full-height sheet with X, two selectable rows and a "Continue" button. |
| M28 | Wolt Delivery, iOS, substitutions | https://mobbin.com/screens/c4b06ab7-913d-4f65-a91a-e25b07502fc6 | [Observed] Half-height sheet with a grabber, "Cancel" at left and "Save" at right, and a "Done" button at the foot. |
| M29 | Lightyear, iOS, sort by | https://mobbin.com/screens/77acd1db-d920-44c0-ada7-a878ff08e645 | [Observed] Bottom sheet with a grabber and three options, selected row tinted, "Apply" below. |
| D10 | Apple HIG, sheets | https://developer.apple.com/design/human-interface-guidelines/sheets (read via the `.md` version) | [Observed] Scoped task related to the current context; Cancel versus Done versus Back; one sheet at a time (close the first before showing another); swipe-to-dismiss with unsaved changes should ask; long or prolonged flows deserve a full-screen alternative; nonmodal sheets for supplementary controls. |
| D13 | W3C APG, modal dialog | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | [Observed] Tab wraps inside the dialog; Esc closes; a visible close or cancel control is recommended; focus goes into the dialog and, for irreversible actions, may go to the least destructive option; on close focus returns to the opener; label with `aria-labelledby`; set `aria-modal` only when outside content is truly blocked. |
| D14 | W3C APG, alert dialog | https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ | [Observed] For a modal that interrupts to deliver an important message and needs a response; label with the title and `aria-describedby` on the message. |
| D15 | NN/g, modal and nonmodal dialogs | https://www.nngroup.com/articles/modal-nonmodal-dialog/ | [Observed] Modals for critical warnings, required information and short staged tasks; they interrupt, can hide content the user needs, and should not carry non-essential content; nonmodals suit non-critical work and may become full-screen modals on mobile. |
| D12 | NN/g, confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Confirmations only for serious consequences; specific wording that restates the action; outcome-named buttons; no default "Yes"; overuse trains click-through; undo is preferred where possible. |
| D16 | Carbon, modal usage | https://carbondesignsystem.com/components/modal/usage/ | [Observed] Passive, transactional and danger types; keep modals for short infrequent tasks; use a toast or inline notification for non-critical messages; the page has no guidance on nested modals. |
| D17 | Atlassian, modal dialog usage | https://atlassian.design/components/modal-dialog/usage | [Observed] Avoid modals for complex interactions, large tables or multi-step flows; avoid opening a dialog from a dialog ("inaccessible and confusing"); show one at a time; a close button in the header is required; inline messages for task-critical alerts. |
| D11 | WCAG 2.2, Understanding 4.1.3 | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | [Observed] Dialogs that take focus are outside this criterion; results and errors that do not take focus must be programmatically announced. |
| Not retrieved | Material 3 side sheets, bottom sheets, dialogs (JavaScript-only pages returned no guidance); Polaris modal (fetch blocked); Fluent, Spectrum, NHS, GOV.UK (no modal component: not attempted for dialogs), CMS; WAI-ARIA 1.2 role pages | | No claim rests on them. |
| Not accessed | Healthcare clinician or patient apps on Mobbin for overlays | not searched | The overlay screens above are non-clinical. |

Synthesis: confirmations restate what will happen and name the outcome in the button (M17, M19, M21; D12), the weak ones say "Confirm" (M18); a bottom sheet appears for phone confirmations and selections (M17, M27 to M29), while desktop confirmations are centred; supplementary detail on desktop sits beside the list (M23, M24) or over it with a scrim (M25, M26); unsaved-changes dialogs have two outcome buttons (M20, M21); long or branching content in a dialog (M22) is the pattern D15 and D17 warn about.

## 1. Current overlays in the product (code)

| Where | Overlay today | Notes from the code |
|---|---|---|
| Patient header "Contact care team" | `Dialog` | passive information with links and a hand-built warning box |
| Patient cancel visit | `Dialog` with required reason field | opener and confirm both read "Cancel visit"; dismiss "Keep this visit"; `onOpenChange` resets errors; Escape and outside click close it and discard the typed reason |
| Patient session skip and stop | `DrawerContent side="bottom"` | stop sheet holds `PainScale` and a text field; bottom sheet spans the full width at every breakpoint |
| Clinician publish plan | `Dialog` | change list, required note |
| Admin assign therapist | `Dialog` with radio list | |
| Review queue detail below xl | `DrawerContent` right | inside it `TaskDetail` renders `NoteDialog` (a `Dialog`): **a modal opened from a modal** |
| Review queue note | `NoteDialog` | the mutation error goes to a toast; the toast is not shown above the open dialog, and Escape or outside click discards the typed note (read in `queue.tsx`) |
| Record version view | `DrawerContent` right | read-only |
| Builder intake ("See intake") | `DrawerContent` right | modal, so the therapist cannot read intake while editing the plan |
| Builder library below the wide breakpoint | `DrawerContent` right | prolonged repeated-add task in a modal |
| Unused in routes | `Popover`, `DropdownMenu`, `Tooltip` | `TooltipProvider` mounted for nothing; cell `title` attributes used instead |
| Builder leave guard | `beforeunload` only | fires for reload and tab close, not for in-app navigation |

## 2. Decision: which overlay for which job (CD-520)

1. **Task.** Choose the surface type from the job, not from what is easy to render. Brief examples are candidates, not decisions.
2. **Constraints.** Healthcare: entered clinical text must not be lost silently; context (the evidence) must stay visible when a decision is made; patient flows happen on phones, often with one hand.
3. **Examples and guidance.** M17 to M29; D10, D12, D13 to D17.
4. **Alternatives (structurally different).** The ten surfaces in the brief: modal, confirmation, alert dialog, side drawer, bottom sheet, popover, dropdown, inline expansion, full page, split pane. Selection rules below are per job.

| Job | Selected surface | Why (job properties) | Where used |
|---|---|---|---|
| Confirm a consequential, short decision | Alert dialog (centred, modal), CD-521 | must interrupt; one decision; context fits in two sentences | cancel visit, publish plan (type only), revoke consent, resolve-with-warning cases |
| Collect one short input tied to the page behind | Dialog (modal) if input is a single field and the page is not evidence for it; otherwise inline expansion | modal hides the evidence the note refers to | assign therapist (dialog); task note (inline, CD-523) |
| Show detail of a selected row while keeping the list | Split pane from xl; modal right drawer below xl, CD-524 and CD-526 | supplementary content to a list | review queue, overview |
| Reference material while working on something else | Non-modal right panel from xl; modal drawer below xl, CD-524 | user must read and edit at the same time | builder intake |
| Read-only history item | Modal right drawer | short, occasional, no edit | plan version |
| Phone sheet for a scoped task or option pick | Bottom sheet below md, centred dialog from md, CD-525 | thumb reach; a few options or one field | session skip and stop, contact care team |
| Multi-step or long task | Full page (route) | many fields or steps; needs its own back link and URL | onboarding, booking, builder, session |
| Short explanatory text for a field | Inline text (always visible), not a popover | patients need it every time | "why we ask" lines stay inline |
| Reveal more of what is already on screen | Inline expansion (button with `aria-expanded`) | no context switch | "Show more" in work lists, chart table, exercise instructions |
| Secondary actions on a row | Visible buttons; dropdown only for three or more secondary actions on a dense row | brief: do not hide frequent actions | none today |
| Short non-essential hint on an icon-only control | Tooltip as supplement only; the control keeps `aria-label` | must never carry information alone | none today (see CD-527) |

5. **Gates.** An overlay that cannot trap and restore focus, close with Esc, or label itself fails. Nested modals fail. A modal that hides the evidence required to make the decision it asks for fails the safety gate (D15, D17).
6. **Selected and rejected.** The table above. Rejected as defaults: popover for patient explanatory text; dropdown menus for visible actions; tooltips for truncated content; modals for the queue note; modal intake panel on wide screens.
7. **Evaluation.** Per-surface scoring is in the per-decision tables below.
8. **Global rules (spec).**
   - One overlay at a time. An overlay never opens another overlay. If a flow needs a second step it happens inside the same overlay (swap the body, keep the title and close control) or on a page. Existing violation: `NoteDialog` inside the queue drawer (fixed by CD-523).
   - Every overlay has a visible title as its accessible name, a description when the action has consequences, a header close control labelled "Close", and Esc closes it unless content is dirty (CD-522).
   - Focus: moves in on open (rules per type below), is trapped, and returns to the opener on close; when the opener no longer exists (a task leaves the list), focus goes to the next row, then to the list heading (existing queue behaviour is kept).
   - Scrim from the token role; no overlay stacks with the toast region (CD-528). Motion 120 to 200 ms and removed under `prefers-reduced-motion`; nothing essential depends on motion.
   - Background scroll locked while a modal is open; the overlay body scrolls; footer actions stay visible (sticky) on phones and when text is enlarged.
   - Overlay height never relies on a fixed pixel height; at 200 percent text and 400 percent zoom the body scrolls and the title and actions remain reachable.
   - Titles are sentences naming the action or object ("Cancel this visit?", "Intake for Jane Doe"); the `h2` inside the overlay is the title element.

---

## 3. Decision: confirmation and alert dialog (CD-521)

1. **Task and journey.** Confirm a decision that is hard or impossible to undo: cancel a visit (patient), stop a session, publish a plan version, revoke consent (the last two owned by the high-impact family for wording).
2. **Business and healthcare.** Fewer accidental cancellations and publishes without training click-through (D12); records are append-only, so some actions cannot be undone on the server. Patient cancellation releases a slot for others.
3. **Examples.** M17 (outcome buttons, restates booking, offers a call), M19 (states irreversibility, "Keep" wording), M18 (generic "Confirm" is the weak case) [Observed].
4. **Guidance.** D14: alert dialog interrupts for an important response; D13: for irreversible actions focus may start on the least destructive option; D12: restate the action, outcome labels, no default yes, undo preferred where possible; D16: danger type replaces the primary with a danger button.
5. **Alternatives.** A alert dialog built on `Dialog`: `role="alertdialog"`, outcome-named buttons, initial focus on the safe button, no outside-click dismiss; B the current Radix `Dialog` defaults; C undo toast instead of confirm; D a full-page confirmation.
6. **Gates.** Safety: C fails for actions the server cannot reverse (publish creates an immutable version; stop ends the session; cancel releases a slot to others) → ineligible for those; usable only for reversible actions such as "Mark reviewed" if undo existed (it does not). Accessibility: B passes but gives focus to the first control (the close button) and lets an accidental outside click close it.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Alert dialog from Dialog: outcome labels, safe focus, no outside dismiss (selected) | 4 | 5 | 5 | 4 | 4 | 4 | 4.45 |
| B Current Dialog (Radix defaults) | 4 | 4 | 3 | 3 | 4 | 5 | 3.70 |
| C Undo toast instead of confirm | 4 | 3 | 3 | 3 | 5 | 3 | 3.45 |
| D Full page confirm | 3 | 4 | 5 | 2 | 2 | 3 | 3.40 |

Arithmetic: A = (25x4 + 25x5 + 20x5 + 15x4 + 10x4 + 5x4) / 100 = 4.45; B = (25x4 + 25x4 + 20x3 + 15x3 + 10x4 + 5x5) / 100 = 3.70; C = (25x4 + 25x3 + 20x3 + 15x3 + 10x5 + 5x3) / 100 = 3.45; D = (25x3 + 25x4 + 20x5 + 15x2 + 10x2 + 5x3) / 100 = 3.40. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Rejected: B (kept as the base primitive), C (no server undo today), D (heavy for one decision).
9. **Spec: `ConfirmDialog`** (composition over `Dialog`; no new dependency; the Radix alert-dialog package would be a new dependency and needs advisor approval, so the role and behaviours are applied to the existing `Dialog.Content`).
   - Anatomy: title restating the action as a question; description with the consequence in one or two sentences (who is affected, what cannot be undone); optional fields; footer with a safe action first and the confirming action last ("Keep this visit", "Cancel visit"); header close control.
   - Content rules: confirm label names the outcome and repeats the verb of the opener; dismiss label is "Keep …" when the dialog is about cancelling or removing something, otherwise "Cancel"; never "OK", "Yes", "Confirm" alone (D12, the brief's section 8). The cancel-visit dialog keeps its labels (opener "Cancel visit" opens the dialog titled "Cancel this visit?"; confirm "Cancel visit"; dismiss "Keep this visit"), because the repeated verb is the same action.
   - Variants: `default` (primary confirm) and `danger` (error-role confirm, only for destructive or irreversible outcomes). One danger button per dialog. Sizes: max width 32 rem; full-width stacked buttons on phones.
   - Behaviour: `role="alertdialog"`, `aria-labelledby` the title, `aria-describedby` the description. Outside click and drag do not dismiss; Esc dismisses (equals the safe action) unless a required field has content, in which case the in-dialog discard row appears (CD-522). Initial focus: the safe button; if the dialog contains a required field, the field (the user must act there first) with the safe button next in order. Focus returns to the opener.
   - Pending: the confirm shows loading text ("Cancelling"), both buttons inert; the dialog stays open until the server confirms (brief section 14: never show success before the server confirms).
   - Errors: shown inside the dialog as an error Banner with what happened, whether the action took effect ("Your visit was not cancelled and is still booked"), and one next step; focus moves to the Banner heading. No toast (CD-528).
   - Success: close, then page-level confirmation as a Banner or live status on the page (existing query-string Banners remain), focus to the changed item or page heading.
   - Keyboard: Tab wraps; Esc; Enter activates the focused button only. Screen reader: dialog name, description, then the first focus target.
   - Responsive: centred at all widths for confirmations (phones included): a confirmation is an interruption, not a task sheet (CD-525).
   - Testing: focus start and return; outside click does nothing; Esc with and without typed reason; error keeps typed text; axe with the dialog open; screen-reader pass.

---

## 4. Decision: unsaved-change protection and dismissal (CD-522)

1. **Task.** Never lose clinical or patient-entered text through an accidental dismissal or navigation.
2. **Constraints.** Radix closes on Esc and outside click by default. The builder autosaves and has a `beforeunload` guard for pending, saving, invalid and error states only; in-app link clicks bypass `beforeunload`. Patient forms are short, and the booking and check-in forms keep input after a network failure.
3. **Examples.** M20 and M21: two outcome buttons ("Cancel"/"Leave", "Cancel"/"Use template") [Observed]. D10: swipe-to-dismiss with unsaved changes should ask. D12: confirm only when it matters.
4. **Alternatives.** A defence in depth: dirty overlays confirm inside themselves; routes with unsaved state guard in-app navigation and `beforeunload`; B nothing beyond Radix defaults (current outside the builder); C autosave every form so there is nothing to lose.
5. **Gates.** Safety: B fails (a typed task note disappears on a stray outside click, and a note is a clinical record entry). C is out of scope for patient forms (autosaving partial check-ins or messages creates records or persists health text on shared devices).
6. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A In-overlay discard row plus beforeunload plus in-app link guard (selected) | 4 | 5 | 5 | 4 | 3 | 2 | 4.25 |
| B Nothing, Radix defaults (current except builder beforeunload) | 2 | 3 | 1 | 2 | 5 | 5 | 2.50 |
| C Always autosave drafts everywhere | 4 | 4 | 4 | 4 | 5 | 1 | 3.95 |

Arithmetic: A = (25x4 + 25x5 + 20x5 + 15x4 + 10x3 + 5x2) / 100 = 4.25; B = (25x2 + 25x3 + 20x1 + 15x2 + 10x5 + 5x5) / 100 = 2.50; C = (25x4 + 25x4 + 20x4 + 15x4 + 10x5 + 5x1) / 100 = 3.95. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

7. **Selected: A.** Rejected: B (fails gate), C (cost and privacy).
8. **Spec.**
   - Dirty means a field changed from its initial value and is not empty after trim. Empty overlays dismiss freely.
   - Dirty overlay: outside click and swipe do nothing; clicking the header close or pressing Esc replaces the footer with an in-place discard row: text "Discard your note?" with buttons "Keep editing" (focused) and "Discard note". No second dialog (CD-520). Typed text is kept in the component until discarded.
   - Routes with unsaved work (builder states pending, saving, invalid, error; a non-empty message draft; check-in or booking reason fields when changed): `beforeunload` registered only while dirty; an in-app navigation guard intercepts clicks on in-app links and the browser back button and shows one "Leave without saving?" alert dialog ("Your last edits were not saved." "Stay on this page" focused, "Leave page"). Saved or saving-complete drafts leave silently; pending autosave is flushed first. The guard never opens while another overlay is open (the overlay handles its own dirty state first).
   - Draft retention: in memory for the session; nothing is written to browser storage for health text (see CD-511).
   - Feasibility note: the Next.js App Router has no route-change blocking API, so the in-app guard is implemented as a capturing click handler on `a[href]` plus a `popstate` handler; limitations are documented in the component and tested.
   - Testing: type a note, click outside (nothing), Esc (discard row), choose Keep editing (text kept, focus returns to the field); builder edit in error state then click a sidebar link; reload with a draft; axe on the discard row.
   - Prototype spec: `docs/design/design-alternatives/prototypes/overlay-queue-note.md` covers the queue note case.

---

## 5. Decision: task note in the review queue (CD-523)

1. **Task.** Resolve or dismiss a review task with a required note, while the reason the task appeared (rule, value, threshold, source) stays in sight.
2. **Constraints.** The note is written to an append-only record with person and time; the action cannot be undone on the server. Detail is a split pane from xl and a drawer below xl.
3. **Examples.** M24 and M23 keep the list visible beside a detail panel [Observed]; M28 uses an in-sheet form with Cancel and Save [Observed].
4. **Guidance.** D15 and D17: do not use a modal when the user needs information the modal hides; avoid dialog-in-dialog (D17); D16: modals for short infrequent tasks, inline notifications for task-critical alerts.
5. **Alternatives.** A inline expansion inside the detail pane: pressing "Resolve with a note" or "Dismiss with a note" reveals a labelled field with Save and Cancel under the buttons; B a dialog from the pane (current); C a separate page.
6. **Gates.** Safety: B fails below xl (modal opened from a modal) and hides the evidence at every width; its error toast is not visible above the open dialog and disappears in 7 s while the note text is still at risk. A passes.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Inline expansion in the detail pane (selected) | 5 | 5 | 5 | 4 | 4 | 4 | 4.70 |
| B Dialog from the pane (current) | 3 | 2 | 2 | 3 | 3 | 5 | 2.65 |
| C Separate page | 2 | 4 | 3 | 2 | 2 | 3 | 2.75 |

Arithmetic: A = (25x5 + 25x5 + 20x5 + 15x4 + 10x4 + 5x4) / 100 = 4.70; B = (25x3 + 25x2 + 20x2 + 15x3 + 10x3 + 5x5) / 100 = 2.65; C = (25x2 + 25x4 + 20x3 + 15x2 + 10x2 + 5x3) / 100 = 2.75. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Rejected: B (fails gates), C (loses the pane context and costs a page change).
9. **Spec: `ActionNote` (inline expansion inside the detail).**
   - Anatomy: the action buttons stay; activating one inserts, directly below them, a `form` with heading ("Resolve this task" or "Dismiss this task"), the sentence from today's dialog description, `Field` "Note" (required, 2000 characters), and "Resolve task" (primary) / "Cancel" (secondary). The other action buttons are inert while the form is open (reason stated by the form heading, not hidden).
   - Behaviour: focus moves to the field; Esc or Cancel with an empty field closes; with text the discard row appears (CD-522). Save shows "Saving", errors appear as a Banner inside the form with the typed text kept and focus to the Banner; success removes the task from the list, shows a status line in the pane ("Resolved. Your note was saved.") and moves focus to the next row, as today. The success toast becomes redundant and is removed (matrix E).
   - Closing the drawer (below xl) while the form is dirty triggers the discard row inside the drawer.
   - Keyboard: no new shortcuts. Screen reader: the form is a labelled group; the heading announces on focus; the Banner uses `role="alert"`.
   - Testing: below and above xl; no nested dialog in the DOM; text kept after an API failure; axe.

---

## 6. Decision: side drawer and reference panel (CD-524)

1. **Task.** Inspect or reference supplementary content (task detail, plan version, intake, exercise library) without leaving the page.
2. **Constraints.** Wide screens have room for non-modal panels; narrow screens do not. Intake is read while editing the plan; the library is used repeatedly; versions are read-only.
3. **Examples.** M23, M24 (list beside a panel), M25, M26 (panel with scrim), M11 (side panel over a list) [Observed]; D15 nonmodal for non-critical activity; D10 on nonmodal sheets for supplementary controls.
4. **Alternatives.** A modal right drawer below xl and an in-place pane (split pane or non-modal panel) from xl, chosen by job as in CD-520; B a non-modal side panel at every width; C a full page for every detail.
5. **Gates.** Accessibility: B on narrow screens covers content with no way to read both and fails focus-not-obscured risk (WCAG 2.4.11 [Prior, not re-fetched]); C passes; A passes with the focus rules.
6. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Modal right drawer below xl, in-place pane at xl and up (selected) | 4 | 4 | 4 | 4 | 4 | 4 | 4.00 |
| B Non-modal side panel at every width | 4 | 3 | 4 | 4 | 4 | 2 | 3.65 |
| C Full page for every detail | 3 | 4 | 4 | 2 | 2 | 3 | 3.20 |

Arithmetic: A = (25x4 + 25x4 + 20x4 + 15x4 + 10x4 + 5x4) / 100 = 4.00; B = (25x4 + 25x3 + 20x4 + 15x4 + 10x4 + 5x2) / 100 = 3.65; C = (25x3 + 25x4 + 20x4 + 15x2 + 10x2 + 5x3) / 100 = 3.20. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

7. **Selected: A.** Rejected: B (runner-up by score; cost and narrow-screen obscuring), C (right for the plan version if it ever needs to be linked or printed).
8. **Spec: `Drawer`.**
   - Modal variant (below xl, and for the plan version view at all widths): `DrawerContent side="right"`, `max-w-md` (queue detail `max-w-xl`), full width below 640 px; header with title, description, close; body scrolls; sticky footer for actions.
   - Reference variant (builder intake, from xl): `Dialog modal={false}` without scrim: no focus trap, background stays interactive, Esc closes only when focus is inside, the panel is labelled `complementary`, opens beside the builder and pushes or overlays the right edge without covering the exercise being edited (width at most 28 rem at 1280); a visible "Hide intake" toggle button stays at the same place in the action row (button label switches "See intake" / "Hide intake", `aria-expanded`). Below xl it becomes the modal variant.
   - Library below the wide breakpoint: modal drawer; header description "Add exercises. 3 in the plan." as a live status updated on add (the user cannot see the plan behind the scrim); footer "Done" button; closing returns focus to "Add exercises".
   - Focus: initial focus on the title (non-actionable content) or first control for forms; returns to the opener.
   - Responsive: width as above; at 400 percent zoom the drawer is full width.
   - States: loading (skeleton, `aria-busy`), error (Banner with retry inside the drawer), empty, long content, permission restricted, stale (timestamp line when data is older than the poll).
   - Testing: Playwright at 1024 and 1440 for the variant switch; focus return; scrim click closes only a clean modal drawer.

---

## 7. Decision: patient bottom sheet (CD-525)

1. **Task.** On a phone: pick a reason to skip, report discomfort and stop, read contact details; later possibly choose from a short list.
2. **Constraints.** One-handed use, sometimes mid-exercise; patient theme targets 48 px; no swipe library in the repo and no new dependency without approval.
3. **Examples.** M27 to M29 (sheets with a close or Cancel control and a primary button), M17 (confirmation as sheet) [Observed]; D10: grabber and swipe belong with resizable sheets, a visible Cancel or Close must exist, one sheet at a time, ask before discarding on swipe.
4. **Alternatives.** A bottom sheet below md and a centred dialog from md; B bottom sheet at every width (current: full-width bar at the bottom of a desktop window); C centred dialog at every width.
5. **Gates.** Accessibility: all pass with a close control and focus rules; a sheet that cannot be dismissed without a gesture fails, so swipe is optional and never the only way.
6. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Bottom sheet below md, centred dialog from md (selected) | 4 | 4 | 4 | 4 | 4 | 3 | 3.95 |
| B Bottom sheet at every width (current) | 3 | 3 | 4 | 3 | 3 | 5 | 3.30 |
| C Centred dialog at every width | 3 | 4 | 4 | 3 | 3 | 5 | 3.55 |

Arithmetic: A = (25x4 + 25x4 + 20x4 + 15x4 + 10x4 + 5x3) / 100 = 3.95; B = (25x3 + 25x3 + 20x4 + 15x3 + 10x3 + 5x5) / 100 = 3.30; C = (25x3 + 25x4 + 20x4 + 15x3 + 10x3 + 5x5) / 100 = 3.55. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

7. **Selected: A.** Rejected: B (a full-width strip on a wide window is unanchored), C (runner-up; reachable but top-centred on a tall phone).
8. **Spec.** `DrawerContent side="bottom"` gets `md:` classes so it renders as a centred dialog from 768 px with the same content and focus rules (call sites do not branch). Below md: rounded top corners, max 85 dvh, body scrolls, footer actions stacked full width with the primary last (above the safe-area inset), header close "Close". No grabber and no swipe in this release (no gesture dependency; a grabber that does not work would be a dead control); revisit if the advisor approves a gesture dependency. Confirmations are not sheets (CD-521). Content in a sheet is one task: if it grows beyond one screen of controls it moves to a page. Initial focus on the title for read-only sheets, on the first field or option for input sheets; the stop sheet's wording and pain scale are specified in the high-impact family. Testing: 375, 390, 768; enlarged text; keyboard open with the textarea focused (footer still reachable).

---

## 8. Decision: split pane (CD-526)

1. **Task.** Work through a list and see detail or a thread beside it (queue, overview, staff messages, builder library).
2. **Examples.** M12 to M16 two or three panes; M23 and M24 list plus panel [Observed]. H and L already select split view for overview and queue.
3. **Alternatives.** A split pane from xl when the second pane is supplementary to a list; when the second pane is the destination (a thread, a record) the narrow form is a separate screen with a back link; B always a drawer; C always a split.
4. **Gates.** C fails below xl: two columns at 1024 px with a 240 px sidebar leave panes too narrow, and at 200 percent zoom the effective width falls to phone size.
5. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Split pane when the second pane is supplementary; separate screen when it is the destination (selected) | 5 | 4 | 4 | 4 | 5 | 3 | 4.30 |
| B Always drawer | 3 | 4 | 4 | 3 | 3 | 4 | 3.50 |
| C Always split | 3 | 2 | 3 | 3 | 4 | 3 | 2.85 |

Arithmetic: A = (25x5 + 25x4 + 20x4 + 15x4 + 10x5 + 5x3) / 100 = 4.30; B = (25x3 + 25x4 + 20x4 + 15x3 + 10x3 + 5x4) / 100 = 3.50; C = (25x3 + 25x2 + 20x3 + 15x3 + 10x4 + 5x3) / 100 = 2.85. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

6. **Selected: A.** Rejected: B (hides a thread that is the destination), C.
7. **Spec: `SplitPane` layout** (layout primitive, not a visual component). Breakpoint xl (1280 px content-plus-sidebar). Pane widths: list 5 of 12 columns (queue) or about 320 px (inbox); detail fills. Both panes are landmarks (`region` with names); the selected row has `aria-selected` or `aria-current` and a text marker; selection and focus differ; Esc in the detail returns focus to the selected row; selection is in the URL (`?task=`) so reload and back work. Below xl: supplementary detail becomes a modal drawer (CD-524); destination detail becomes its own screen. Sticky detail uses `top` offset below the sticky page header; sticky regions never cover focus (scroll-padding). Testing: 1024, 1280, 1440; keyboard order list, detail; zoom 200 percent.

---

## 9. Decision: popover, dropdown, tooltip and inline expansion policy (CD-527)

1. **Task.** Prevent decorative or hidden-information overlays.
2. **Constraints.** `Popover`, `DropdownMenu` and `Tooltip` exist in `ui` but no route uses them; `TooltipProvider` is mounted in the clinician context for nothing; truncated cells rely on the `title` attribute, which keyboard and touch users cannot reach [Prior: matrix A3].
3. **Examples and guidance.** D15 and D17 (inline messages and popups for small amounts of information alongside controls). Brief section 18: do not hide essential information behind tooltips.
4. **Alternatives.** A policy: keep the three components, use none by default, define the only permitted uses; B delete them; C use them widely for explanations and row actions.
5. **Selected: A.** Rejected: C (hides information from touch and screen-reader users; patients need explanatory lines every time), B (runner-up; delete if still unused after the first rebuild, because dead code has a cost).
6. **Spec (usage rules).**
   - `title` attributes: not used for information. Truncated text gets the full value in the detail pane or an inline "Show more" (CD-520); table cells show a full sentence or a short value plus the pane.
   - Tooltip: only as a supplement on an icon-only `IconButton` that already has an accessible name; appears on hover and focus, dismissible with Esc, never holds interactive content; not used on touch. Remove `TooltipProvider` until used.
   - Popover: a short optional explanation reached from a visible text control ("Why this appears"), content under 40 words, no form fields, not for patients' field help (that stays inline).
   - Dropdown menu: three or more secondary actions on one dense staff row, items at least the theme target height, a disabled item names its reason in its label. No overflow ("more") menu hides a frequent action.
   - Inline expansion: `button` with `aria-expanded` and `aria-controls` controlling a region (the pattern in `TableToggle`), promoted to a `ui Disclosure`; native `details` is acceptable for static content. Never animates height with a fixed pixel value.
   (Conventional elements: reuse established patterns, no further alternatives per protocol item 5.)

---

## 10. Decision: feedback inside overlays (CD-528)

1. **Task.** Make sure the result of an action taken in an overlay is seen where the user is looking.
2. **Constraints.** Toasts are clinician-only, last 7 s, announce politely, and render under open dialogs. Errors from `NoteDialog` go to a toast while the typed text is still in the dialog [Prior: matrix E; code].
3. **Guidance.** D16: use a toast or inline notification only for non-critical messages; D17: inline messages for task-critical alerts; D11: results and errors must be announced; the brief section 14: do not use toasts as the only way to communicate important clinical record errors.
4. **Alternatives.** A feedback for an overlay action stays inside the overlay (Banner), and the page gets its own status after close; B toasts for everything (current in the clinician app).
5. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Feedback for an overlay action stays in the overlay (selected) | 4 | 5 | 5 | 4 | 4 | 5 | 4.50 |
| B Toast for everything (current in clinician app) | 2 | 2 | 1 | 3 | 4 | 5 | 2.30 |

Arithmetic: A = (25x4 + 25x5 + 20x5 + 15x4 + 10x4 + 5x5) / 100 = 4.50; B = (25x2 + 25x2 + 20x1 + 15x3 + 10x4 + 5x5) / 100 = 2.30. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

6. **Selected: A.** Rejected: B (fails the error-visibility gate).
7. **Spec.** Errors inside an overlay: Banner `tone="error"` at the top of the overlay body, `role="alert"`, text states what happened, whether anything was saved and the next step; focus moves to the Banner heading; typed input stays. Success: the overlay closes and the page shows a status (Banner or `role="status"` line, or the changed data) and moves focus to the affected element. Toasts are limited to low-priority, self-resolving page-level information when no overlay is open; the toast region sits above overlays in the stacking order only if it is kept for that purpose, and an error toast is never the only record of a failed save. The full error-recovery pattern belongs to that family; this rule is the overlay boundary.

---

## 11. Not decided here

- Wording and layout of the stop-session, publish and consent-revoke confirmations (high-impact actions family).
- Whether to add a gesture dependency for swipe on sheets (needs advisor approval).
- Table row selection and pagination (complex tables family).
