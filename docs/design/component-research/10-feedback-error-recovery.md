# 10. Error recovery and feedback

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` section 14 (also 17, 22). Decision records: `docs/design/component-decisions/CD-440` to `CD-449`. Evidence for the current state: `docs/design/component-usage-matrix.md` sections A3, E and G, and the code (toast calls listed in section 2). Access date for every source: 2026-11-20. Scores are heuristic; no user test has been run. Colours are not chosen; token roles only (`error-ink`, `error-bg`, `warning-*`, `info-*`, `success-*`).

## 0. Problems from the code that this file fixes

From usage matrix E, confirmed by grepping every `toast(` call (queue 420 to 447 and 635 to 672, overview 176 and 181, record check-ins 700 to 714, builder 367, inbox 229 and 233):

1. **Every error from queue actions, overview "Mark reviewed", record "Mark reviewed" and message retry is a toast**: 7 seconds, polite, then gone. These are clinical record writes. Brief section 14 forbids a transient toast as the only way to communicate an important clinical record error.
2. **`NoteDialog` errors appear behind a modal that is still open and still holds the user's typed note.** The error is both out of sight and out of the focus order.
3. **"Mark check-in reviewed" in the queue detail has a toast as its only confirmation**; the task stays open and the button stays, so nothing persistent says it happened.
4. **Hand-built error alerts in eight files** (`check-in-form`, `plan-change-note`, `sign-out-button`, `item-editor`, `builder` goal row, `assign-dialog`, `session-player`, `onboarding-flow` `InlineError`) with the same markup copied; **only onboarding has an error summary.**
5. **Retry patterns differ**: Banner action, "Try saving again", row retry button, toast with no action.
6. **Auto-dismiss at 7 seconds with no pause**: content that disappears on a timer needs a way to pause or adjust (WCAG 2.2.2 treats self-disappearing content as auto-updating; 2.2.1 timing).
7. **A toast reports an in-flight message retry** ("Trying to send again") that duplicates the row's "Retrying" label.
8. The patient app and admin use no toasts: Banners and `role=status` lines. This is the model to extend.
9. Booking: the conflict path exists (`booking_conflict`, `slot_unavailable`); the confirmation must follow the server response (feature research F section 13).

## 1. Production examples and guidance used

| Source | Where | Observation |
|---|---|---|
| GOV.UK, Error summary | https://design-system.service.gov.uk/components/error-summary/ | [Observed] Show a summary for every validation error, even one; at the top of the main content; script moves focus to it; each item links to the field (first option for radios and checkboxes); heading "There is a problem"; messages worded the same as the inline message; prefix the page title with "Error:". |
| GOV.UK, Notification banner | https://design-system.service.gov.uk/components/notification-banner/ | [Observed] For information not tied to the page's task or the outcome of an earlier action; never for validation errors; not together with an error summary; at most one per page; success banner uses `role="alert"` and a "Success" heading; remove it when the user moves on; place before the `h1`. |
| Carbon, Notification pattern | https://carbondesignsystem.com/patterns/notification-pattern/ | [Observed] Inline, toast, actionable types; inline, banner and modal persist until dismissed or resolved; only toasts without actions dismiss themselves; do not auto-dismiss critical messages; match visual weight to urgency; require action only when needed; let users limit noncritical notifications. |
| NN/g, Form error guidelines | https://www.nngroup.com/articles/errors-forms-design-guidelines/ | [Observed] Put each message beside the field; validate when the user finishes a field and not while typing; a top summary helps but must not be the only indicator. The page does not discuss preserving input. |
| NN/g, Skeleton screens | https://www.nngroup.com/articles/skeleton-screens/ | [Observed] Under about 1 second show nothing; roughly 2 to 10 seconds spinner for one element, skeleton for a whole page; over 10 seconds a progress bar with an estimate; non-page processes use progress; skeletons showing only a frame feel broken. |
| NN/g, Confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Prefer undo where possible; confirmations only for serious actions; specific wording. |
| W3C WCAG 2.2 SC 4.1.3 | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | [Observed] Status messages are exposed with `status`, `alert` or `log` without moving focus; dialogs that take focus are excluded. |
| W3C WCAG 2.2 SC 2.2.2 | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | [Observed] Content that updates or disappears on a preset interval counts as auto-updating and needs a pause, stop, hide or frequency control unless essential; 2.2.1 adds timing rules (the page only cross-references it). |
| W3C APG, alertdialog | https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/ | [Observed] Modal that interrupts for an important message; needs name and description. |
| Mobbin, Contra "Cancel this project" | https://mobbin.com/screens/c52a1774-86d9-4922-96d5-79e9d5ca7c54 | [Observed] An error toast "Project cannot be cancelled." displayed outside the open dialog, above the dimmed page: the same separation CarePath has between toast and `NoteDialog`. |
| Mobbin, Square "Invalid request" | https://mobbin.com/screens/a84d4630-00c8-4eb3-b35c-3f250b10f338 | [Observed] A full-width red banner under the header of a multi-step document flow, with the committing "Share" disabled and "Save as draft" available. Shows a persistent banner for a form-level failure. Not clinical. |
| Mobbin, Base44 "Recently deleted" | https://mobbin.com/screens/16b4c24e-92fc-45c6-b12e-bb33a2b69f5f | [Observed] A success toast "App restored" with a dismiss control after a restore action, on a page that already shows the restored state. Example of a toast that confirms a change that is also visible. |
| Mobbin, Incident.io banner | https://mobbin.com/screens/ddf7c87e-a846-4966-9b1f-df25188d02e7 | [Observed] An info banner at the top of a document with a bold heading and a one-line description. Banner anatomy only. |
| CarePath, existing patterns | `docs/design-system/components.md` lines 45 to 50 and 74 to 80 | [Observed] Banner: error uses `role="alert"`, others `status`; "error banners say what happened, whether data is safe, and offer one next step"; toast 7 s polite; "errors state whether input was kept". The design system already says the right thing; the code does not follow it for the toasts above. |
| Feature research F, C, G | `feature-research/F-scheduling.md` section 13, `C-guided-sessions.md` line 240, `G-messaging.md` | [Observed] Error copy for booking ("We could not book that. Nothing was changed. Try again."), session ("That did not save. Your place in the session is unchanged. Try again."), messaging delivery states. Reused for the template in CD-449. |
| Not retrieved | | Material 3 snackbar (the page returned only JavaScript and a description), Apple HIG alerts, Baymard form-validation research, NHS error message and summary pages, USWDS alert, Fluent MessageBar, Polaris banner/toast, Stripe, Slack, Linear. No claims are made from them. |

---

## 2. Priority and persistence rules (CD-440)

**Task.** Decide, for any message, the channel, how long it stays, whether it takes focus, and whether it leaves a record.

**Alternatives.**

| | Model |
|---|---|
| A. Tiered channels by severity, required action and need for a record | Fixed table below |
| B. Toast-first | Most outcomes as toasts |
| C. Banners only | Everything inline and persistent |
| D. Notification centre as the primary channel | A list of events |

**Gates.** B fails (toast-only clinical errors, brief section 14). C passes but produces noise for trivial success (fatigue, brief section 14). D has no data model or product need (CD-444).

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 2 | 3 | 3 |
| Accessibility and usability (25) | 4 | 2 | 3 | 3 |
| Error prevention and trust (20) | 5 | 1 | 4 | 3 |
| Business and operational (15) | 4 | 3 | 2 | 2 |
| Interaction efficiency (10) | 4 | 5 | 2 | 2 |
| Implementation cost (5) | 3 | 5 | 4 | 1 |
| **Weighted** | **4.15** | 2.40 (gate fail) | 3.00 | 2.65 |

**Selected: A.** Rejected: B, C, D.

**Rule table.**

| Level | Examples | Channel | Persistence | Dismissal | Focus and announcement | Leaves a record |
|---|---|---|---|---|---|---|
| Critical, needs action now | Patient safety content (emergency notice, pain at threshold warning), session expired during unsaved work | Persistent alert (Banner `error` or `warning`) or `alertdialog` only when a decision blocks all progress | Until resolved | Not dismissible unless the cause is resolved | `role="alert"`, focus moves only for a blocking dialog or a form summary | Yes (audited where it is a clinical event) |
| Error on a user action | Save failed, mark reviewed failed, publish failed, send failed, booking conflict | Inline in the place of the action: field error, error summary, Banner above the action group, or in-row state; inside the dialog when a dialog is open (CD-449) | Until retried or dismissed by fixing the cause | Dismissible only after resolution or by "Dismiss" when the user chooses to leave it | `role="alert"` once; focus to the summary or banner for form submit; otherwise focus stays | Persistent visible state; server-side where it is a clinical write |
| Page or data problem | Cannot load list, stale data, offline, partial data | Banner (region) at the top of the affected region | Until the condition clears | Auto-clears when resolved; no manual dismiss for offline | `role="status"` (stale, partial); `role="alert"` (load failure) | No |
| Success with persistent state | Reviewed, published, signed, assigned | The state itself in the record (chip, line, row) plus optional toast | The state is permanent | n/a | `role="status"` | Yes, as the record state |
| Success without other visible state | "Copied", "Reminder set" (none exist today) | Toast | Until dismissed or 7 s, paused on hover and focus | Dismiss button | `role="status"` polite | No |
| Progress | Saving, sending, generating | Inline status text, button loading state | While in flight | Not dismissible | `role="status"`, debounced | No |
| Information | Plan change note, new records since draft | Banner `info` | Until acknowledged or condition clears | Dismiss or acknowledge button with a specific label | `role="status"` | Acknowledgement may be recorded |

**Notification fatigue rules.** At most one toast visible; a second queues behind the first. Identical consecutive toasts merge. No toast for background refetch or for changes already visible on screen (assign and unassign already update "Assigned to"; the toast is dropped). No toast on `Back` navigation. Total persistent banners: at most one per scope (GOV.UK), highest priority wins, with a count link if more ("2 more problems").

---

## 3. Inline validation and error summary (CD-441)

**Task.** Fix invalid entries in onboarding, check-in, booking, the plan builder, notes and dialogs without losing input.

**Alternatives.**

| | Model |
|---|---|
| A. Validate on blur (after first touch) and on submit; error summary on submit with focus; shared `FieldError` and `ErrorSummary` | GOV.UK summary plus NN/g timing |
| B. Validate on every keystroke | Immediate flags |
| C. Validate on submit only, with a summary | No blur validation |
| D. Inline only, no summary | Messages beside fields |

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 5 | 3 | 4 | 3 |
| Accessibility and usability (25) | 5 | 2 | 4 | 3 |
| Error prevention and trust (20) | 4 | 2 | 3 | 3 |
| Business and operational (15) | 4 | 3 | 4 | 3 |
| Interaction efficiency (10) | 4 | 3 | 3 | 4 |
| Implementation cost (5) | 3 | 4 | 4 | 5 |
| **Weighted** | **4.45** | 2.60 | 3.70 | 3.20 |

**Selected: A.** Rejected: B (flags while typing, NN/g), C (late feedback), D (summary missing: NN/g says a summary helps and GOV.UK requires it, while also saying it must not be the only indicator).

**Spec.**
- `FieldError` (one export in `packages/ui`, replacing eight hand-built alerts): icon, visually hidden "Error:", message, linked by `aria-describedby`; field gets `aria-invalid`, 2 px error border (existing).
- `ErrorSummary` (promoted from onboarding): heading "Fix these before you continue" for patients and "Fix these before you save" or the relevant verb for clinicians; list of links, each moving focus to its field (first option for radio and checkbox groups); wording identical to the inline message; `role="alert"`; focus moves to it on submit failure; page `document.title` prefixed "Error:". It is not shown together with a banner for the same failure.
- Timing: first validation on blur; once a field is invalid, re-validate on change and clear the message when fixed; never on first keystroke. Required-but-untouched fields are validated on submit only. Server field errors are mapped to the same summary.
- Wording: what is wrong and how to fix it, plain language, no blame; clinical ranges name units and the allowed range ("Enter repetitions from 1 to 100").
- Input is never lost: after a failed submit every field keeps its value, stated in the banner for server failures ("Your answers are kept.").
- Pain input: the existing inline alert for "missing pain" becomes a `FieldError` with the same text.
- States: default, focus, invalid, valid (no green tick; silence is valid), disabled, read-only, loading (submit button busy), partial (some fields server-validated), network failure (banner, not field errors), long content (messages wrap).
- Responsive: summary above the form at every width; no sticky summary. Zoom 200 percent: no horizontal scroll.
- Testing: axe; keyboard: summary link moves focus to the field; screen reader reads summary on submit; page title prefix.

---

## 4. Toast policy and fixes for toast-only clinical errors (CD-442)

**Task.** Keep low-priority confirmations without hiding errors or confirming into the void.

**Alternatives.**

| | Model |
|---|---|
| A. Restricted toast | Success only, never errors; only for outcomes with no other visible state or as a supplement; pause on hover and focus; suppressed while a modal is open; one at a time |
| B. Status quo | Errors and successes as 7 s polite toasts |
| C. No toasts | Persistent state and inline status only |
| D. Snackbar with undo | Toast carrying Undo for many actions |

**Gates.** B fails (clinical errors in toasts; errors behind modals; no pause for the timer). The others pass.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 2 | 4 | 3 |
| Accessibility and usability (25) | 4 | 2 | 4 | 3 |
| Error prevention and trust (20) | 4 | 1 | 4 | 3 |
| Business and operational (15) | 3 | 3 | 3 | 3 |
| Interaction efficiency (10) | 4 | 4 | 3 | 4 |
| Implementation cost (5) | 4 | 5 | 4 | 3 |
| **Weighted** | **3.85** | 2.30 (gate fail) | 3.75 | 3.10 |

The gap between A and C is small and sensitive to weights. **Selected: A**, because it keeps a light channel for the few success events that have no other visible state; if none emerges in the real screens, C is the fallback with no loss. **Rejected:** B, D (a timed Undo in a toast fails the timing requirements and hides the control from keyboard users; see CD-445).

**Rules (spec for `ToastProvider`).**
1. `error` tone is removed from `useToast`. Errors use inline channels (CD-440, CD-449). `tone` keeps `success` and `info`.
2. Auto-dismiss stays at 7 seconds, but the timer pauses while the toast is hovered or has focus, and when the window is blurred; a dismiss button is always present. A toast with an action does not auto-dismiss (Carbon). Reduced motion removes the slide animation.
3. The viewport sits below dialogs and drawers in the stacking order and, as a rule, toasts are held while a modal is open and shown after it closes. (Read in `packages/ui/src/components/overlays.tsx` and `toast.tsx`: the dialog content and the toast viewport both use `z-50`, so DOM order decides which is on top; the scrim is `z-40`. [Assumption, not verified in a browser] A modal Radix dialog also marks content outside it as hidden from assistive technology, so a toast raised while it is open may be neither visible nor announced. The rule is therefore "queue while any dialog or drawer is open", not a z-index fix.)
4. One visible at a time; merge duplicates; maximum queue of three.
5. Announcement through the Radix toast region (`role="status"` polite). A toast never contains the only copy of anything the user must act on.
6. The patient app keeps using no toasts.

**Specific fixes from usage matrix E (every row).**

| Current | Fix |
|---|---|
| Queue: assign and unassign toasts (`queue.tsx`) | Drop the success toast; "Assigned to" already updates (persistent). Failure: Banner in the detail pane above the action group, `role="alert"`, "Could not assign this task. Nothing was changed. Retry assigning." with a button. |
| Queue: "Mark check-in reviewed" toast | Replace with the persistent state in the detail pane ("Check-in reviewed by {name}, {time}") plus the consequence line before the action (CD-423). Toast optional and not relied on. Failure: Banner as above. |
| Queue: resolve and dismiss, toast the only proof the note saved | Task leaves the list (existing); add a persistent line in the patient's record history ("Task resolved by {name} with note") and in the detail pane if still open; keep the success toast as a supplement only. Failure inside `NoteDialog`: see next row. |
| `NoteDialog` error toast behind the open dialog | Error shown inside the dialog as a Banner above the footer, `role="alert"`, focus moves to the banner; the textarea keeps the note; text "Not saved. Your note is still here. Try again." |
| Overview "Mark reviewed" error toast | Row-level error: the row stays, shows an inline message "Could not mark this check-in reviewed. Nothing was changed." with "Retry" in that row; count of failures also in a region Banner if more than one. |
| Record check-ins tab "Mark reviewed" error toast | Same row-level message; chip stays "Not yet reviewed". |
| Message retry info toast "Trying to send again" | Remove. The row's "Retrying" label and live region carry it. Retry failure: row state returns to "Not sent. {reason}" with Retry visible. |
| Publish success toast then route change | Keep as supplement; the Plan tab already shows the new current version (persistent). Add the line "Version {n} published, {time}, by {name}". |
| Builder: save line and banners | Keep; they follow the policy already. |

**Testing.** No `tone="error"` in the codebase after the change (type error); a dialog-open test that a success toast is held until close; hover and focus pause test; axe on the toast region.

---

## 5. Banners and persistent alerts (CD-443)

Conventional element: reuse the existing `Banner` (`info`, `success`, `warning`, `error`), with the rules below drawn from GOV.UK and Carbon; no invented alternatives.

- Anatomy: icon, bold title, plain sentence, optional one action; error banners say what happened, whether data is safe, and offer one next step (existing rule).
- Placement: top of the affected region (page, dialog body above the footer, detail pane above the actions), not floating, immediately before the page heading for page-level success from a previous action (GOV.UK).
- At most one per scope; priority order: safety, error, stale, offline, partial, information. Others collapse to "n more problems".
- Roles: error and critical `alert`; others `status`; page-level informational banner may be a labelled `region`.
- Persistence: persists until the condition clears; success banners from a previous action are removed on the next navigation (GOV.UK). Dismissible only for information; never for errors or offline.
- Stale data: "This page may be out of date. Last updated {time}. Refresh." with "Refresh {noun}" (replaces "Refresh lists").
- Offline: "You are offline. Your edits are kept on this page. You can keep working; saving resumes when you reconnect." Editing continues; commit actions are disabled with that reason.
- Partial data: "Some of this page could not be loaded: {parts}." with "Retry loading {parts}", while loaded parts stay visible.
- Session expiry: critical banner "Your session ended. Sign in again to save. Your text is still here." and the sign-in preserves `next`.
- Copy and focus rules are in CD-449.
- Testing: only one banner rendered per scope; `role` per tone; axe.

## 6. Notification centre (CD-444)

**Task.** Decide whether CarePath needs a place to see past notifications.

| | Model |
|---|---|
| A. None; destinations and counts | Today and Messages (patient), Overview, Review queue and Inbox (clinician), each with its own count badge |
| B. Bell with a list of events | A global notification centre |
| C. Email or SMS digests | Outside the app |

**Gates.** All pass; B has no data model (no notification entity in the PRD); C is out of scope.

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 2 |
| Accessibility and usability (25) | 4 | 3 | 3 |
| Error prevention and trust (20) | 4 | 3 | 3 |
| Business and operational (15) | 4 | 3 | 2 |
| Interaction efficiency (10) | 4 | 3 | 2 |
| Implementation cost (5) | 5 | 2 | 3 |
| **Weighted** | **4.05** | 2.95 | 2.50 |

**Selected: A.** Each work item already has a home that is the record of the event: the review queue is the clinician's notification list, Messages the patient's. A centre would duplicate them and invite fatigue. Rejected: B, C. Count badges are unified (usage matrix A3: one `CountBadge`, with visually hidden "unread" or "open" text). **Reopen if:** asynchronous events appear that have no home (a generated draft ready, a task assigned by someone else) or users report missing events (no evidence yet).

---

## 7. Undo (CD-445)

**Task.** Recover from slips cheaply where recovery is safe.

| | Model |
|---|---|
| A. Inline undo for client-held changes, no timer | "Removed {name}. Undo" appears in place and stays until the next edit or navigation |
| B. Timed toast with Undo | Standard snackbar undo |
| C. Server-side restore window | "Recently deleted" with days to restore (Base44 shows this) |
| D. No undo | Confirmations only |

**Gates.** B fails timing and keyboard access (WCAG 2.2.1 and 2.2.2; the control vanishes). C is not supported by the API (append-only history, no soft delete).

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 4 | 2 |
| Accessibility and usability (25) | 4 | 2 | 4 | 4 |
| Error prevention and trust (20) | 4 | 3 | 5 | 2 |
| Business and operational (15) | 3 | 3 | 3 | 3 |
| Interaction efficiency (10) | 4 | 4 | 3 | 5 |
| Implementation cost (5) | 4 | 3 | 1 | 5 |
| **Weighted** | **3.85** | 2.85 (gate fail) | 3.80 (not feasible now) | 3.10 |

**Selected: A.** Where offered: remove exercise or goal in the plan draft (builder), discard of an unsaved AI edit is a confirmation instead (CD-422), reorder is reversible by moving again. Not offered where the server has written (mark reviewed, publish, sign, cancel visit): those use tiers 1, 3 and 4 (CD-422). **Rejected:** B (inaccessible), D, C (not available; revisit if soft delete is added).
Spec: the removed row is replaced by a status row with the object name, an "Undo remove" button (tertiary) and `role="status"` text; focus moves to the Undo button; removing another item replaces the earlier undo (one level); autosave still runs, and undo re-inserts at the original position and re-saves. Testing: keyboard path remove then undo; position restored.

## 8. Loading, progress and skeletons (CD-446)

Conventional element, thresholds from NN/g (retrieved), no invented alternatives.

| Wait | Pattern | CarePath use |
|---|---|---|
| Under about 1 s | Nothing | quick refetches (`keepPreviousData`, `aria-busy` only) |
| About 1 to 10 s, one element | Inline spinner or the button's `loading` state with the label kept | Save, sign, book, send |
| About 1 to 10 s, whole page or list | Skeleton that mirrors the real content (not just a frame) | Directory, queue, record tabs, Today |
| Over about 10 s or unknown long | Progress bar with a text estimate; indeterminate if no estimate, with elapsed time as text, never a made-up percentage | AI generation ("up to 20 seconds"), imports |
| Never | Spinner that replaces content that was already visible | refetch keeps previous content with `aria-busy` |

Rules: buttons keep their label and gain `aria-busy` (existing `Button loading`); the `loadingLabel` text is announced politely; skeletons carry `aria-hidden` and the region has a visually hidden "Loading {noun}" in a `role="status"`; reduced motion removes the shimmer (static fill). Stale-while-revalidate keeps data and flags "Updating". Timeouts: after 10 s of the same load, the status text changes to "This is taking longer than usual." with a retry control.

## 9. Optimistic updates (CD-447)

| | Model |
|---|---|
| A. Allowlist of safely recoverable updates | Only actions whose failure can be reverted without clinical or financial effect |
| B. Optimistic everywhere | Assume success |
| C. None | Wait for the server every time |

**Gates.** B fails (booking, sign, publish, mark reviewed would show a state that may be false: brief section 14).

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 3 |
| Accessibility and usability (25) | 4 | 3 | 4 |
| Error prevention and trust (20) | 5 | 1 | 4 |
| Business and operational (15) | 3 | 4 | 2 |
| Interaction efficiency (10) | 4 | 5 | 2 |
| Implementation cost (5) | 4 | 3 | 5 |
| **Weighted** | **4.05** | 2.95 (gate fail) | 3.30 |

**Selected: A.**

| Allowed (optimistic, with a visible pending marker where the state matters) | Not allowed (wait for the server, show busy) |
|---|---|
| Reorder or remove in the plan draft (local state; autosave status shows "Saving draft" and failure) | Book, reschedule, cancel visit |
| Message row appears at once as "Sending" and becomes "Sent" or "Not sent. {reason}" (the row says what is true: it is not sent yet) | Sign, amend, publish, approve, reject, mark reviewed, resolve, dismiss |
| Local expand, collapse, filter changes | Consent grant or withdrawal (show busy, then the persisted state) |
| Evidence-open marker held client-side until the source rendered (CD-409) | Stop or skip session (busy state, "Stopping..." then the result) |
| Selection state in lists | Check-in submission (the success view is shown after the server responds) |

Failure rule: revert the visible state, show an in-context error that says what was reverted and that nothing was lost (CD-449). Testing: failed autosave leaves the editor content and shows "Not saved"; the message-row failure path (Not sent, Retry) is the model to test against.

## 10. Booking: never confirm before the server (CD-448)

**Task.** A patient books or reschedules and must be told the truth about the result, including when the outcome is unknown.

| | Model |
|---|---|
| A. Pending until the server responds; explicit conflict and unknown-outcome states | Busy button, then a confirmation page built from the server's response |
| B. Optimistic confirmation | Show "Booked" immediately and reconcile |
| C. Reserve the slot first, then confirm | A hold with a timer, then a confirm step |

**Gates.** B fails (brief section 14, explicit). C passes but needs a hold API and a visible countdown (a timing burden under WCAG 2.2.1; no such endpoint).

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 5 | 3 | 5 |
| Accessibility and usability (25) | 4 | 3 | 4 |
| Error prevention and trust (20) | 5 | 0 | 5 |
| Business and operational (15) | 4 | 3 | 5 |
| Interaction efficiency (10) | 3 | 5 | 3 |
| Implementation cost (5) | 4 | 4 | 1 |
| **Weighted** | 4.35 | 2.65 (gate fail) | 4.35 (needs API) |

A and C tie on score; the tie is broken by feasibility (no hold API) and by the timing burden of C, not by the number. **Selected: A.** C is recorded as a future option if double-booking pressure grows and a hold API exists.

**Spec.**
- On "Book this visit": button enters `loading` ("Booking your visit"); the step stays; no success wording, no "added to your list", no calendar download offered, no confirmation email is described yet.
- Success: only on a successful server response, build the confirmation view from the response (date, time, zone, therapist, type), `role="status"`, focus to the confirmation heading, "Change or cancel this visit" and "Add to calendar" appear here.
- Conflict (`booking_conflict`, `slot_unavailable`): inline Banner above the action group, `role="alert"`: "That time was just taken. Nothing was booked. Choose another time." with the alternatives list refreshed and focus on the banner; "Choose a different time" is the primary action.
- Unknown outcome (timeout, network drop after send): do not say booked and do not say failed. Banner: "We could not confirm your booking. Check Appointments before you try again, so you do not book twice." with "Check my appointments" (primary, loads the list) and "Try again" disabled until the check completes. Requires an idempotency key on the booking request so a retry cannot create a second visit (contract request, flagged).
- Reschedule: the current visit remains booked and shown until the new time is confirmed (existing atomic behaviour); the copy says so on the review step and in every failure.
- Cancel visit: dialog errors inside the dialog; the visit is shown as booked until the server confirms cancellation; success updates the list and shows a persistent "Cancelled" row state.
- States: default, loading, success, conflict, unknown outcome, validation error, rate limited ("Too many attempts. Try again in a minute."), offline, permission restricted (no therapist assigned: empty state with Messages link), stale (slot list older than the page's "as of": "Times may have changed" with refresh).
- Testing: no success text rendered before a mocked server response; conflict path keeps selections; unknown-outcome path blocks retry until the list is checked; idempotency test on the API.

## 11. Error content template; errors inside modals; retry (CD-449)

**Task.** One consistent way to say what happened, whether data is safe, and the next step, in every place an error can appear, including when a dialog is open.

| | Model |
|---|---|
| A. Error inside the dialog, above the footer, focus to it | The dialog stays open, input kept |
| B. Toast over the modal (status quo) | Error outside the dialog |
| C. Close the dialog and show a page banner | Input leaves with the dialog |

| Criterion | A | B | C |
|---|---|---|---|
| Task effectiveness (25) | 5 | 1 | 3 |
| Accessibility and usability (25) | 5 | 1 | 3 |
| Error prevention and trust (20) | 5 | 1 | 2 |
| Business and operational (15) | 4 | 3 | 3 |
| Interaction efficiency (10) | 4 | 4 | 3 |
| Implementation cost (5) | 4 | 5 | 4 |
| **Weighted** | **4.70** | 1.80 (gate fail) | 2.85 |

**Selected: A.** Rejected: B (fails: error outside the focus order of an open modal, and it times out), C (loses typed input).

**Template (copy).**
1. What happened, in the user's terms: "Your note was not saved."
2. Whether data is safe and what state things are in: "Your text is still here." / "Nothing was changed." / "Your visit is still booked."
3. One next step as a button: "Retry saving note" (label per CD-428), plus a way out if retry may keep failing ("Copy your text").
Never: error codes as the message, "Something went wrong" alone, blame, a toast as the only copy. Technical detail goes in a collapsed "Details" disclosure for clinicians if the API gives a request id.

**Behaviour.** In a dialog the error Banner sits above the footer, `role="alert"`, focus moves to it, the primary action stays enabled for retry, Esc still closes and the dialog warns if text would be lost ("Discard your note?" with "Keep editing" first). In a page, the Banner sits above the action group or region; in a list row the message is in the row. `errorText()` (usage matrix A2) is kept as the single mapper from API errors to title and body; every channel calls it, and hand-written alerts are removed. One `RetryAction` pattern: button label "Retry {verb} {noun}", disabled with `aria-busy` while retrying, message "Retrying" in a `status` region, after the second consecutive failure the message adds "Check your connection or try again later." Three failures stop automatic retries (provider retries in AI generation follow M: twice with backoff).
States covered: network unavailable, timeout, validation (server), permission denied ("You are not on this patient's care team. Nothing was changed."), conflict (409: "This changed elsewhere. Load the latest to continue." with "Load the latest"), rate limit, server error, stale.
Testing: a modal with a failing action shows the error inside the dialog and keeps focus management; axe; copy lint for the three-part template in error strings.

---

## 12. Traceability (brief section 25)

| Decision | Selected | Screens | Component | Storybook | Tests |
|---|---|---|---|---|---|
| CD-440 | Tiered channel table, fatigue rules | all | policy plus `Banner`, status regions | document | per row |
| CD-441 | Blur and submit validation, summary, `FieldError` | forms | `FieldError`, `ErrorSummary` (promoted) | to add | axe, focus |
| CD-442 | Restricted toast, errors removed | clinician | `ToastProvider` revise | revise | no error tone |
| CD-443 | Banner rules | all | `Banner` | revise | one per scope |
| CD-444 | No notification centre | all | none | document | n/a |
| CD-445 | Inline undo, no timer | builder | `UndoRow` (new) | to add | keyboard path |
| CD-446 | Loading thresholds | all | `Skeleton`, `Button loading`, `Progress` | revise | reduced motion |
| CD-447 | Optimistic allowlist | builder, messages | policy | document | failure revert |
| CD-448 | Booking pending until server | booking | `BookingFlow` | n/a | no early success |
| CD-449 | Template, errors inside dialogs, retry | all | `QueryError`, `RetryAction`, `DialogContent` | revise | modal error test |
