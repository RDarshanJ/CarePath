# 08. High-impact actions and button hierarchy

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` section 8 (also 11, 16, 18, 22). Decision records: `docs/design/component-decisions/CD-420` to `CD-430`. Evidence for the current state: `docs/design/component-usage-matrix.md` sections A3, D, F, G1 and the button inventory taken from the code on 2026-11-20 (section 3 below). Access date for every source: 2026-11-20. Scores are heuristic; no user test has been run. Colours are not chosen; token roles only (`primary`, `error-ink`, `border-control`, `surface`).

## 0. Findings from the code that drive this file

1. **One danger rule is broken.** "Stop, this hurts" (`session-player.tsx` line 535) is a `secondary` button with `border-error-ink text-error-ink` classes added by hand; confirming steps use `variant="danger"`. The design-system rule says `danger` is for the confirming step only (`components.md` line 8).
2. **Confirm patterns vary.** Cancel visit (dialog with reason), publish version (dialog), resolve or dismiss task (dialog with required note), assign therapist (dialog), skip or stop exercise (bottom drawer), review-task detail (drawer below xl), "Mark reviewed" (no confirmation, toast), consent switch (revokes immediately; usage matrix G1).
3. **Same label, different act.** "Cancel visit" is both the trigger (`secondary`) and the confirming `danger` button in the same dialog (`cancel-visit.tsx` lines 80 and 93). "Cancel" closes three different dialogs with different consequences (typed text is lost in two of them). Two labels exist for starting a session ("Start today's session", "Begin session") and for opening the plan builder ("Open care plan builder", "Edit plan", "Create plan", "Continue editing the draft").
4. **Load-more variants** (five) and **retry variants** ("Try again", "Try saving again", "Retry sending", "Refresh lists", "Load the saved draft").
5. **Disabled controls** mostly carry a visible reason (usage matrix F); two do not (move up and down, Send). Reasons are not always linked with `aria-describedby` ("Mark reviewed" on the check-ins tab).
6. **No split button, FAB, dropdown action menu or bulk action exists in any route** (`DropdownMenu` and `Popover` are unused, matrix A1).
7. **Icon-only buttons** exist only in the clinician app (move up and down) plus close and dismiss controls.

## 1. Production examples and guidance used

| Source | Where | Observation |
|---|---|---|
| NHS design system, Buttons | https://service-manual.nhs.uk/design-system/components/buttons | [Observed] One primary per page; secondary for less prominent actions; warning (destructive) buttons only for serious, hard-to-undo consequences and only as the final step after a confirmation; do not rely on red alone (hidden "Warning" text); disabled buttons are poor for contrast and clarity, use only if research shows they help; button text and context should make clear what will happen. The fetch covered the first 100,000 of about 125,000 characters; later sections were not read. |
| Atlassian, Button examples | https://atlassian.design/components/button/examples | [Observed] Primary for the main action, one per area; subtle for secondary actions in toolbars; warning for significant change; danger for final confirmation of irreversible actions; disabled buttons leave the tab order, so avoid them and use other cues; loading replaces the label with a spinner and blocks interaction. The page gives no split-button or icon-only guidance (the component root URL only redirected). |
| NN/g, confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Reserve confirmations for serious or irreversible actions; overuse trains click-through; offer undo where possible; name the item and the outcome; avoid generic "Are you sure"; do not pre-select the affirmative. |
| W3C APG, alertdialog | https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ | [Observed] Alert dialog is a modal that interrupts for an important message; needs a name and a described message; the page itself does not say where focus goes (deferred to the modal dialog pattern). The initial-focus rule used below is therefore CarePath's own judgement. |
| Carbon, data table usage (batch actions) | https://carbondesignsystem.com/components/data-table/usage/ | [Observed] Selecting a row reveals a batch action bar at the top of the table; header checkbox has an indeterminate state; row-level icon actions and overflow menus are disabled while batch mode is active; the page lists no specific allowed actions. |
| Mobbin, delete and cancel dialogs | Productboard https://mobbin.com/screens/5458e827-8fe8-4b9c-b879-b7e1268b8338 ; Canva https://mobbin.com/screens/0e3a20e0-2bae-4f21-a39a-e863020dbf85 ; Subframe https://mobbin.com/screens/f10fc37a-6c2c-4a01-b68a-0ce62d97d51d ; Plane https://mobbin.com/screens/e65c98ae-dfe1-4f31-afeb-a452a24c2152 | [Observed] Dialogs name the object ("Delete this reply?", "Delete Design guidelines?"), state the consequence ("can't be undone"), and use a red confirming button labelled "Delete" or "Delete reply" beside a neutral "Cancel"; Subframe stacks full-width Delete over Cancel. None is clinical. |
| Mobbin, typed confirmation | Braintrust https://mobbin.com/screens/4049c16f-efb4-4a46-b850-52aabe69d58b ; Railway https://mobbin.com/screens/0ab1b8cb-1532-4cdb-82fa-59bbd466ced5 ; Featurebase https://mobbin.com/screens/14a68be5-356a-403c-9dd9-4a9f4d9a0fde | [Observed] Typed-name confirmation is used for deleting whole projects or workspaces (largest-scope actions). [Assumption] CarePath has no equivalent scope; none is selected. |
| Mobbin, cancel with reason | Contra https://mobbin.com/screens/c52a1774-86d9-4922-96d5-79e9d5ca7c54 | [Observed] "Cancel this project" dialog with a reasons field and Cancel / Submit buttons; an error toast "Project cannot be cancelled." sits outside the dialog while the dialog stays open. Illustrates both generic "Submit" and the error-outside-modal problem (family 10). |
| Mobbin, restore after delete | Base44 https://mobbin.com/screens/16b4c24e-92fc-45c6-b12e-bb33a2b69f5f | [Observed] A "Recently deleted" page with Restore buttons and a "days left to restore" line, plus a success toast "App restored". Relevant to recoverability by time window (CD-422). |
| CarePath feature research | C (session) lines 192 to 202 and 238 | [Observed] Pin one primary action; Pause, Skip, "Stop, this hurts" in fixed positions; Stop is never hidden behind a menu; CR-C1 to make the pain level optional so Stop ends the session immediately. |
| CarePath feature research | H, K, L | [Observed] "Mark reviewed has no undo on the server; the pane must say what it records before writing" (H); "Honest state names" for plans (K); queue actions A with single primary (L). |
| Not retrieved | | Material 3 buttons and FAB, Apple HIG buttons and alerts (the page returned only a description; points from memory were not used), Fluent, Polaris, Carbon button page, USWDS, GOV.UK button page (the NHS page was read instead), Linear, Stripe, Slack, Gmail screens. No claims are made from them. |

---

## 2. Decisions

### 8.1 Button hierarchy and variants (CD-420)

Conventional element: reuse the established pattern; no invented alternatives.

**Mapping (brief names to existing component).**

| Brief term | CarePath component | Use |
|---|---|---|
| Primary | `Button variant="primary"` | The one main action of the current state. One per context. |
| Secondary | `Button variant="secondary"` | Other actions of equal importance class but lower priority. |
| Tertiary | `Button variant="quiet"` (docs rename to "tertiary" in prose, component name unchanged) | Low-emphasis in-context actions (Remove, Reset timer, Clear filters). |
| Text button / link | `Link` (one implementation, consolidating `TextLink`, `AppLink`, `ButtonLink`) | Navigation. A link never looks like a button unless it is the primary action of a page (then `ButtonLink`). |
| Icon-only | `IconButton` | See CD-426. |
| Destructive | `Button variant="danger"` | Only the confirming step of a destructive dialog (NHS and Atlassian agree); the initiating control is secondary or critical-tone (CD-421). |
| Split, dropdown | none | CD-425. |
| Sticky bar | layout pattern | CD-424. |
| FAB | none | CD-425. |
| Inline | tertiary buttons and links inside rows | Keep visible; no row overflow menu (CD-425). |
| Bulk | none now | CD-427. |

**Rules.** One primary per context, where context means a dialog, a drawer, a card in a master-detail pane or a page region; the primary is chosen by state, not left always on (CD-430). A group never mixes sizes (NHS). Loading state replaces nothing but adds the spinner and `aria-busy`, label stays (current `loadingLabel` text is announced). Pressed and hover per `components.md`. Buttons wrap text at 320 px and 200 percent zoom; full width below `sm` in patient flows (existing `w-full sm:w-auto`). Target size: patient 48 px, clinician 24 px minimum with 32 px preferred for frequently used (WCAG 2.5.8 requires 24; the clinician `sm` size is already at the minimum, so `sm` is limited to dense tables and toolbars).

**Verified from the code (not yet from rendered screens).** No state of a patient screen shows two primaries together: Today uses Start, Continue and "Add your check-in" under mutually exclusive states; the session player's "Done with set" and "Skip rest" appear in different phases. This must be confirmed in the browser step.

### 8.2 Critical-tone action and the Stop control (CD-421)

**Task.** A patient in pain must end a session immediately and unmistakably. "Stop, this hurts" must be visible at all times, never in a menu (C research), must not be mistaken for the primary "Done with set", and must not look like a destructive deletion.

**Alternatives.**

| | Model |
|---|---|
| A. Status quo | `secondary` plus ad-hoc error-ink border and text classes |
| B. Solid `danger` button, always visible | Loud red fill beside the primary |
| C. `secondary` with a documented `tone="critical"` modifier | Outline and text in `error-ink`, an alert icon and the words, same size and position every time; confirm sheet stays |
| D. Overflow menu item | Hidden behind a menu |

**Gates.** D fails safety (the control must be visible; C feature research, brief section 8). A passes in function but depends on classes whose contrast and focus-ring behaviour are not guaranteed by the component. B passes but makes a red fill compete with the primary (brief: no multiple equal prominence) and reuses the confirming-step colour for an initiating action.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 4 | 1 |
| Accessibility and usability (25) | 3 | 4 | 4 | 2 |
| Error prevention and trust (20) | 3 | 3 | 4 | 1 |
| Business and operational (15) | 3 | 3 | 3 | 2 |
| Interaction efficiency (10) | 4 | 4 | 4 | 2 |
| Implementation cost (5) | 5 | 3 | 4 | 5 |
| **Weighted** | 3.45 | 3.60 | **3.85** | 1.70 (gate fail) |

**Selected: C.** One documented modifier replaces the ad-hoc classes; it is restricted to initiating a safety or destructive action and is never used for navigation. **Rejected:** A (undocumented, not guaranteed accessible), B (competes with the primary, confusing with confirm), D (fails the gate). Trade-off: one new prop on `Button`, justified because the pattern already exists in code as hand-written classes.

**Spec.** `Button variant="secondary" tone="critical"`: visible words ("Stop, this hurts" keeps the patient's own phrase), icon `alert-circle` before the text, border and text in `error-ink`, never colour alone (icon and words), focus ring as other buttons, same position and width in every phase (C research rule 1). The confirm sheet keeps "Keep going" (secondary, initial focus) and "Stop session" (`danger`, the confirming step). After CR-C1 the pain rating becomes optional and asked after stopping; until then the sheet requires it and says why in text ("Your care team sees this number"). NHS hidden-text practice: add visually hidden "Warning" is not needed because the words and icon already carry the meaning. Keyboard: reachable in the tab order after "Skip exercise". Tests: contrast of `error-ink` on `surface` at both themes (automated token check); position stable between phases (visual regression); `danger` unused outside confirming steps (lint or grep rule).

### 8.3 Which actions need confirmation (CD-422)

**Alternatives.**

| | Model |
|---|---|
| A. Confirm every consequential action | Dialog for each |
| B. Tiered policy | Tier 0 none; Tier 1 consequence line; Tier 2 recoverable via undo; Tier 3 focused dialog; Tier 4 dialog with a required reason |
| C. Undo only | No dialogs; undo within a window |
| D. Typed confirmation for high-impact actions | Type a word to proceed |

**Gates.** C fails for actions that cannot be undone on the server (publish, sign, cancel visit, mark reviewed: the server has no undo, H research). D passes but belongs to deleting an entire account or project (Mobbin observations) and CarePath has no such action; over-friction on routine clinical actions is a trust risk (NN/g).

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 4 | 3 | 2 |
| Accessibility and usability (25) | 3 | 4 | 4 | 2 |
| Error prevention and trust (20) | 2 | 4 | 2 | 5 |
| Business and operational (15) | 2 | 4 | 4 | 2 |
| Interaction efficiency (10) | 1 | 4 | 5 | 1 |
| Implementation cost (5) | 4 | 3 | 2 | 3 |
| **Weighted** | 2.50 | **3.95** | 3.35 (gate fail on server-irreversible actions) | 2.55 |

**Selected: B.** **Rejected:** A, C as the whole policy (undo kept for client-held changes, CD-445), D (no scope that justifies it; revisit if account or organisation deletion is added).

**Policy by action (every action found in the code, plus the documentation and AI actions designed in 06 and 07).**

| Action | Who | Affects clinical record | Reversible | Tier and pattern | Stays visible on scroll |
|---|---|---|---|---|---|
| Stop session ("Stop, this hurts") | patient | creates stop record, notifies care team | no | Tier 3 short sheet; critical-tone trigger (CD-421) | yes (pinned bar) |
| Skip exercise | patient | session record | no | Tier 3 sheet with reason | yes |
| Pause / resume session | patient | session state | yes | Tier 0 | yes |
| Send check-in | patient | creates pain Observation | no (can add another) | Tier 1 consequence line above button ("Your care team sees this. Pain is saved as your own rating.") | in form footer (CD-424) |
| Book visit | patient | appointment | by cancelling | Tier 3 review step already exists; confirmation only after server (CD-448) | yes on narrow screens |
| Reschedule visit | patient | appointment | atomic; original kept on failure | existing review step; consequence line "Your current visit stays booked until the new time is confirmed" | yes |
| Cancel visit | patient | appointment, frees a slot | partly (slot may be taken) | Tier 4 dialog with reason (existing); confirm "Cancel this visit" (danger); keep action first in DOM and initially focused | n/a (dialog) |
| Turn AI-assisted drafting off or on | patient | consent record | yes (can change again) | Tier 0 plus Tier 1: immediate effect, persistent status "Off since {date}. You can turn it on again here." No confirmation; withdrawing must be as easy as granting [principle; no source retrieved] | n/a |
| Mark plan change as read | patient | acknowledgement | n/a | Tier 0 | n/a |
| Send message | both | message | no | Tier 0, delivery state in row (not toast) | composer sticky (CD-424) |
| Assign to me / Unassign task | clinician | task ownership (administrative) | yes (inverse) | Tier 0, persistent "Assigned to" | detail header |
| Mark check-in reviewed | clinician | review state on a clinical record | not by the UI | Tier 1: consequence line "Records your name and the time on this check-in." then persistent "Reviewed by {name}, {time}" | in the detail pane |
| Resolve / Dismiss task with a note | clinician | task state and note | no | Tier 4 dialog with required note (existing; note is the friction) | n/a |
| Remove exercise or goal from draft | clinician | draft only | yes | Tier 2: Undo (CD-445), no dialog | n/a |
| Reorder exercise | clinician | draft only | yes | Tier 0 | n/a |
| Publish version | clinician | patient-visible plan | no (new version supersedes) | Tier 3 dialog with change list and note (existing) | builder header action (sticky) |
| Approve / Approve with edits (AI draft) | clinician | approved summary | no | the gated decision bar (CD-407) is the confirmation; no extra dialog | decision bar sticky |
| Reject draft | clinician | review row | no | Tier 4 inline required reason | decision bar |
| Discard unsaved AI edits | clinician | local | no | Tier 3 only if edits exist | n/a |
| Sign note | clinician | immutable record | amendment only | Tier 3 dialog (CD-411) | footer sticky |
| Save amendment | clinician | new current version | next amendment only | Tier 3 dialog with reason (CD-412) | footer sticky |
| Mark note as entered in error | clinician | note status | not by UI | Tier 4: dialog with required reason; confirming button `danger` "Mark as entered in error" | n/a |
| Assign therapist (admin) | admin | care team | yes (reassign) | Tier 3 dialog (existing), confirm "Assign {name}" | n/a |
| Sign out | all | none | yes | Tier 0 | header |

**Dialog rules.** Title names the object and act ("Cancel this visit?"), description states the consequence, buttons are specific verbs, "Keep ..." or "Back to ..." is first in DOM and takes initial focus for irreversible acts (CarePath judgement; APG gives no rule). A dialog never contains a workflow longer than one form (brief section 11). Errors during confirm stay inside the dialog (CD-449).

### 8.4 Actions that change clinical records (CD-423)

**Task.** A clinician records a state on someone's chart quickly and must know exactly what was recorded and by whom.

| | Model |
|---|---|
| A. Consequence line under the action plus a persistent result state | Words before ("Records your name and the time"), words after ("Reviewed by Jordan Lee, 9:12 AM") |
| B. Dialog for each | Confirm every record-writing action |
| C. Toast after | Transient message only |

**Gate.** C fails: toast-only confirmation of a clinical record change (brief section 14; usage matrix E).

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 2 |
| Accessibility and usability (25) | 4 | 3 | 3 |
| Error prevention and trust (20) | 4 | 4 | 1 |
| Business and operational (15) | 4 | 3 | 3 |
| Interaction efficiency (10) | 5 | 2 | 5 |
| Implementation cost (5) | 5 | 4 | 5 |
| **Weighted** | **4.15** | 3.40 | 2.65 (gate fail) |

**Selected: A.** Label names the object (see CD-428). The result is a persistent line or `StatusChip` in the record, plus optional toast (CD-442). Applies to queue "Mark check-in reviewed" (fix for usage matrix section E), the overview and record check-ins "Mark reviewed" buttons (rename to the same label), resolve and dismiss. Audit: every such action writes a record-history row (CD-413).

### 8.5 Sticky action bars and what stays visible (CD-424)

| | Model |
|---|---|
| A. Selective sticky bars | Only where the action must stay reachable while content scrolls |
| B. All primary actions sticky | Every page |
| C. None sticky | Actions at the end of content |
| D. Floating action button | A fixed circular control |

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 2 | 2 |
| Accessibility and usability (25) | 4 | 3 | 4 | 2 |
| Error prevention and trust (20) | 4 | 3 | 3 | 2 |
| Business and operational (15) | 4 | 3 | 3 | 2 |
| Interaction efficiency (10) | 4 | 4 | 2 | 3 |
| Implementation cost (5) | 3 | 4 | 5 | 3 |
| **Weighted** | **3.95** | 3.15 | 3.00 | 2.15 |

**Selected: A.** **Rejected:** B (covers content, steals vertical space, fails 2.4.11 risk), C (patients lose the primary during long forms and the pinned session actions), D (CD-425).

| Surface | Sticky? | Contents |
|---|---|---|
| Session player (patient) | Yes, bottom bar | One primary; Pause, Skip, "Stop, this hurts" in fixed positions |
| Onboarding and check-in forms (patient) below 768 px | Yes, bottom bar | Back and the single primary |
| Booking review step (patient) below 768 px | Yes | "Book this visit" and "Choose a different time" |
| Messages composer | Yes | Composer and Send |
| Plan builder (clinician) | Yes, header | Save status line and "Review and publish version n" |
| AI review decision bar | Yes, bottom | CD-407 |
| Note editor footer | Yes, bottom | Save line and "Sign note" |
| Review queue detail pane | Pane header stays; action group scrolls with the pane | Actions (CD-430) |
| Lists, tables, record tabs | No | Row actions inline |

Rules: a sticky bar never covers the focused element (scroll padding equals bar height); it reflows to full width below 768 px; at 200 percent zoom or 320 px width the bar may become non-sticky if it would cover more than a third of the viewport (WCAG 1.4.10 reflow safeguard); the bar is a landmark-free `div` with a labelled group where it contains more than one control; only one sticky bar per view.

### 8.6 FAB, split and dropdown actions, row overflow (CD-425)

Conventional elements; the established pattern for CarePath is to have none. No alternatives were invented.

- **FAB:** not used. The patient app has four tab destinations and "Add your check-in" and "Send message" are page-level primary actions with words; a FAB would add a fifth competing target and has no label. Clinician pages have no single global create action. Material guidance was not retrieved; the reason is CarePath's own.
- **Split button:** not used. Atlassian lists the component without guidance; no CarePath action has a default-plus-variants shape. The only candidate, Approve versus Approve with edits, is resolved by relabelling the single button by state (CD-407).
- **Dropdown action button and row overflow (three-dot menus):** not used for frequent or safety-relevant actions (brief section 8). Allowed only when a row has three or more secondary actions that are infrequent and none is clinical-record-changing (for example future export or copy link actions). `DropdownMenu` is then used (Radix; typeahead and arrow keys), the trigger is an `IconButton` with a visible name on hover and focus, disabled items carry the reason in their label (`components.md` line 79). Until such a case exists the unused `DropdownMenu`, `Popover` and `TooltipProvider` stay out of product trees (usage matrix A1).

### 8.7 Icon-only buttons (CD-426)

| | Model |
|---|---|
| A. Visible text with icon where space allows; icon-only only for universally understood controls | Words first |
| B. Icon-only everywhere dense | Icons with tooltips |
| C. Overflow menu for secondary actions | Hidden |

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 5 | 3 | 2 |
| Accessibility and usability (25) | 5 | 2 | 3 |
| Error prevention and trust (20) | 4 | 3 | 3 |
| Business and operational (15) | 4 | 3 | 2 |
| Interaction efficiency (10) | 4 | 4 | 2 |
| Implementation cost (5) | 4 | 5 | 4 |
| **Weighted** | **4.50** | 2.95 | 2.55 |

**Selected: A.** Allowed icon-only controls: close (dialog, drawer, toast), move up and down (until a drag-free alternative with words replaces them; they stay because they already are the non-drag alternative), evidence reference number, and pagination chevrons only if labelled. Every one has `IconButton label` as the accessible name; the visible label appears as a tooltip on hover and keyboard focus (the unused `Tooltip` is brought into use here; the tooltip never carries information that is not also in the name). Names include the object: "Close evidence panel" instead of "Close panel"; "Move Squat to position 2 of 5" instead of "Move Squat up". Targets: 24 px minimum clinician (`sm`), 48 px patient; adjacent icon-only targets keep at least 8 px spacing. Disabled move controls show the reason when the list has one item or at the ends only through the position text ("Position 1 of 5") announced by the live region, resolving usage matrix F's gap. Patient app: none today and none added.

### 8.8 Bulk actions (CD-427)

| | Model |
|---|---|
| A. None now; spec an assign-only bulk bar for the review queue for when load requires it | Checkbox column, batch bar at the top of the table (Carbon pattern), single bulk action "Assign to me" |
| B. Bulk resolve, dismiss and mark reviewed | Full bulk workflow |
| C. Per-row only | Never bulk |

**Gates.** B fails safety: resolving and dismissing require a per-task note and judgement; "Mark reviewed" is a clinical statement about one patient's check-in. C passes.

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 3 |
| Accessibility and usability (25) | 4 | 3 | 5 |
| Error prevention and trust (20) | 5 | 1 | 4 |
| Business and operational (15) | 3 | 4 | 2 |
| Interaction efficiency (10) | 3 | 5 | 1 |
| Implementation cost (5) | 4 | 3 | 5 |
| **Weighted** | **3.95** | 2.95 (gate fail) | 3.45 |

**Selected: A** (nothing built now; no evidence of queue volume that needs it, and the queue spec in L has no bulk). **Rejected:** B. Spec for when needed: row checkboxes (native input, labelled "Select task for {patient}"), header checkbox with indeterminate state, bar with selected count in `role="status"` and "Assign to me" and "Clear selection"; row-level actions disabled while selection is active (Carbon); selection resets on filter change; failures reported per task in an inline summary ("3 assigned, 1 not assigned: ..."), not a toast.

### 8.9 Action label wording (CD-428)

Principle: the label names the act and, where the screen has more than one object, the object; it states the result rather than the step; no "Submit", "OK", "Confirm" or "Yes" alone; paired buttons use the contrasting verbs ("Keep this visit" and "Cancel this visit"). Brief section 8 examples are the model.

**Every current label found in the code that is generic, duplicated, or ambiguous, with its replacement.** Labels not listed were judged specific enough and are kept: Sign in, Sign out, Send message, Send check-in, Create account, Book a visit, Start timer, Reset timer, Pause timer, Skip rest, Done with set n, Finish session, Keep going, Keep exercise, Stop session, Contact care team, Show every day and time, Show later days, Choose a different time, Resolve with a note, Dismiss with a note, Review and publish version n, Add exercises, Clear filters, Reset to awaiting assignment, Previous page, Next page, Previous day, Today, Next day, Refresh lists, Review Sharing and consent, Show first n / Show all n, Back to Today, Back, Close (on the plain contact dialog only).

| Where (file) | Current label | Problem | Replacement |
|---|---|---|---|
| Patient cancel visit dialog confirm (`cancel-visit.tsx`) | "Cancel visit" (also the trigger label) | Same words for opening and confirming; "Cancel" ambiguous | Trigger stays "Cancel visit" (sr-only suffix kept); confirming `danger` button becomes "Cancel this visit"; "Keep this visit" kept |
| Patient reschedule on appointments (`appointments/page.tsx`) | "Reschedule" + sr-only | Generic first word | "Reschedule visit" (sr-only date suffix kept) |
| Patient booking confirm (`booking-flow.tsx`) | "Confirm booking" / "Confirm new time" | Generic "Confirm"; also risks implying confirmation before the server | "Book this visit" / "Reschedule visit"; the confirmation text appears only after the server responds (CD-448) |
| Patient booking retry | "Try again" | Which action? | "Load times again" |
| Patient Today check-in | "Check in" and "Add your check-in" | Two labels for one destination | "Add your check-in" |
| Patient Today session | "Begin session" (`start-session.tsx`) vs "Start today's session" | Two labels for one act | "Start today's session" everywhere; "Resume session" and "Continue session" unify to "Resume session" when paused, "Continue session" when in progress and not paused (existing state-based, kept) |
| Patient session start | "Not now" | Unclear outcome | "Not now, back to Today" |
| Patient message retry | "Retry sending" | Which message? | "Retry sending message" (the failed row also names it in the accessible name) |
| Patient plan change note | "Got it" | Casual, unclear effect | "Mark as read" |
| Patient onboarding next | "Continue" | Generic | "Continue to {next step title}", for example "Continue to personal information"; existing specific labels kept for the end states ("Create account", "Save and return to review", "Send to the clinic" becomes "Send my details to the clinic") |
| Patient onboarding change links | "Change" + `aria-label` "Change {label}" | Visible label alone is ambiguous out of context | Keep as is (visible word is contained in the accessible name, label-in-name satisfied); acceptable |
| Patient contact dialog close | "Close" | Acceptable for an information-only dialog | Keep; the icon "Close panel" gets the dialog title |
| Clinician publish dialog cancel | "Cancel" | Loses typed note | "Back to the draft" |
| Clinician queue note dialog cancel | "Cancel" | Loses typed note | "Keep task open" |
| Clinician queue note dialog confirm | "{verb} task" (Resolve task, Dismiss task) | Object ok, but note not named | "Resolve task with note", "Dismiss task with note" |
| Admin assign dialog cancel | "Cancel" | Generic | "Close without assigning" |
| Admin assign dialog confirm | "Assign therapist" (also the row button) | Same label for open and confirm; names nobody | Row button stays "Assign therapist"; confirm becomes "Assign {therapist name}" |
| Clinician "Mark reviewed" (overview, check-ins tab) | "Mark reviewed" | Object missing; differs from queue label | "Mark check-in reviewed" (with the consequence line, CD-423) |
| Clinician queue | "Unassign" | Unassigns whom? | "Unassign task" |
| Clinician record header and tabs | "Open care plan builder", "Edit plan", "Create plan", "Continue editing the draft" | Four labels for one destination | "Edit care plan" (plan exists), "Create care plan" (none), "Continue draft" (draft in progress) |
| Plan builder library | "Add" (+ aria name) | Visible word lacks object | "Add {exercise name}" with the name visually hidden only if width forces it; `aria-label` already contains it |
| Plan builder remove | "Remove" (exercise and goal) | Object missing in text | "Remove exercise" and "Remove goal" (name in accessible name, undo available, CD-445) |
| Plan version row | "View" | Object missing | "View version {n}" |
| Plan builder save error | "Try saving again" | Fine but inconsistent with retry vocabulary | "Save draft again" |
| Plan builder stale draft | "Load the saved draft" | Clear | Keep |
| Intake | "See intake" | Vague | "View intake answers" |
| All retry buttons (`QueryError`, overview, inbox, admin) | "Try again" | Which action? | "Retry loading {noun}", for example "Retry loading messages" (single `QueryError` prop `noun`) |
| Load more variants (`tabs.tsx`, `queue.tsx`, `library.tsx`, appointments tab, thread) | "Load more {what}", "Load more tasks", "Load more exercises", "Show more visits", "Show earlier messages" | Two verbs, two variants | "Show more {things}" for lists, "Show earlier messages" for threads; one variant (`secondary`, `sm`) |
| AI review (design-system demo) | "Approve", "Edit", "Discard" | Generic; hides what is approved | "Approve draft" / "Approve draft with edits", "Edit statement {n}", "Reject draft" (CD-407) |
| AI generate | (not built) | | "Draft progress review" and "Make a new draft" (CD-408) |
| Note actions | (not built) | | "Sign note", "Amend note", "Save amendment", "Mark as entered in error" |
| Icon names | "Close panel", "Dismiss notification", "Open evidence n" | Generic names | "Close {panel title}", "Dismiss notification: {title}", "Open evidence n: {source}" |

Tests: a lint-style check that no `Button` child text equals one of "Submit", "OK", "Confirm", "Yes", "Cancel", "Continue", "Got it", "Try again" outside an allow-list; component tests for the accessible names.

### 8.10 Disabled actions and reasons (CD-429)

NHS and Atlassian both discourage disabled buttons (poor contrast, removed from the tab order). CarePath keeps its existing practice of visible reasons and tightens it.

**Decision (convention applied).** Prefer leaving an action enabled and returning a precise error when only data validity is at issue (a form missing a required answer). Use a disabled state only when the user lacks permission or a precondition is a state, not an input (not on care team, no exercise in the plan, offline, not the author). A disabled action: uses `aria-disabled="true"` (stays focusable, so a screen reader user reaches the reason), shows the reason as visible text next to or above the button, and links it with `aria-describedby` (fix for the check-ins tab "Mark reviewed" paragraph). Pending states (busy) disable with the loading state, not with a reason. Move up and down at list ends are disabled with the position text. Reasons are specific: "Add at least one exercise to publish." not "Unavailable". Testing: axe; each disabled control has a described-by target.

### 8.11 Action hierarchy inside the review queue detail pane (CD-430)

**Task.** In the detail pane a therapist assigns, reviews, resolves or dismisses (L research selected table plus detail pane). Four to five actions have lived with one primary, "Resolve with a note", which is right only sometimes.

| | Model |
|---|---|
| A. State-driven single primary | The primary changes with state: check-in task not yet reviewed: "Mark check-in reviewed"; after review or for non-check-in tasks: "Resolve with a note"; "Dismiss with a note", "Assign to me", "Unassign task" are secondary; ownership actions sit in a separate "Owner" row |
| B. All secondary equal | No primary |
| C. Stepwise wizard | Review, then resolve |

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 5 | 3 | 3 |
| Accessibility and usability (25) | 4 | 3 | 3 |
| Error prevention and trust (20) | 5 | 2 | 4 |
| Business and operational (15) | 4 | 3 | 2 |
| Interaction efficiency (10) | 4 | 3 | 2 |
| Implementation cost (5) | 4 | 5 | 2 |
| **Weighted** | **4.45** | 2.90 | 2.90 |

**Selected: A.** Rejected: B (violates "one primary", leaves the next step unclear), C (adds steps to a frequent job). Layout order top to bottom: consequence line, primary, secondary group, then "Owner: {name or Unassigned}" with its action. When disabled for non-care-team users, one shared reason line precedes the group (existing `#team-reason`). Testing: only one primary rendered per state (unit test over states), focus moves to the next task after resolve (existing).

---

## 3. Button inventory from the code (2026-11-20)

Extracted from every `Button`, `ButtonLink` and `IconButton` under `apps/web` excluding the gallery. Variant counts: primary and secondary dominate; `danger` appears twice (cancel visit confirm, stop session confirm); `quiet` for Remove, Reset timer, Clear filters, Not now, Show more visits, Change, View, Reset to awaiting assignment, Show first n.
Labels listed in 8.9 cover every item flagged. The extraction did not read dynamic labels built from variables except where shown in the file lines cited.

## 4. Traceability (brief section 25)

| Decision | Selected | Screens | Component | Storybook | Tests |
|---|---|---|---|---|---|
| CD-420 | Existing variants, one primary per context | all | `Button`, `Link` | revise | single-primary tests |
| CD-421 | `tone="critical"` on secondary | session | `Button` (new prop) | to add | contrast token test |
| CD-422 | Tiered confirmation policy | all | dialogs and sheets | document | per action table |
| CD-423 | Consequence line plus persistent result | queue, overview, record | `ActionNote` (new, text) | to add | text present |
| CD-424 | Selective sticky bars | session, forms, builder, AI, note | `StickyActionBar` (new) | to add | focus not covered |
| CD-425 | No FAB, split, row overflow | all | none | document | none |
| CD-426 | Words first; named icon buttons | builder, dialogs | `IconButton`, `Tooltip` | revise | accessible names |
| CD-427 | No bulk now; assign-only spec | queue | none | document | n/a |
| CD-428 | Label table | all | strings | document | label lint |
| CD-429 | `aria-disabled` plus visible reason | all | `Button` | revise | described-by |
| CD-430 | State-driven single primary | queue detail | `TaskDetail` | n/a | state unit tests |
