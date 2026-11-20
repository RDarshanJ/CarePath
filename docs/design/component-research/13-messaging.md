# 13. Messaging components

Status: provisional until advisor sign-off. Protocol: `docs/design/component-research/PROTOCOL.md`; brief: `docs/COMPONENT-BRIEF.md` sections 4, 13, 14 and 22. Access date for every external source: 2026-11-20. No colours are chosen; semantic token roles only. Decision records: CD-510 to CD-515. This file builds on `feature-research/G-messaging.md` (selected G4: single thread, guided starting points, urgent route beside the emergency notice, post-send expectation line, reachable composer) and does not repeat its feature-level alternatives. It decides the components that implement G4 and consolidates the two thread implementations.

Evidence labels as in `14-navigation.md`: [Observed], [Prior], [Judgement], [Assumption]. Scores are heuristic; no user testing has been run.

## 0. Source register

| Ref | Product, platform, screen | URL | Observation |
|---|---|---|---|
| G-1 | Ro, Hers, Noom, MyChart help, clinician paper (PMC7969962) | see `G-messaging.md` section 6 | [Prior] Thread with named sender and credential, delivery tick on the patient's own messages (Hers), "No action needed" status badge (Ro), non-urgent and call-911 wording (MyChart help), clinicians want urgent matters on the phone and clearer guidance on appropriate use (paper, small US primary-care study). |
| M12 | Contra, web, Messages | https://mobbin.com/screens/3f75114d-c78b-4ee8-a654-25cb1bead98e | [Observed] Three columns: app nav, conversation list with tab-style filters (General, Requests, Marketing) and an "Unread" toggle, count pills on rows, thread pane with composer pinned at the bottom. |
| M13 | Givingli, web, Inbox | https://mobbin.com/screens/d6e333ee-841e-438e-b372-c54fded1439f | [Observed] Two panes: list on the left, thread on the right, own message right-aligned in a filled bubble, composer pinned at the bottom with Send as text. |
| M14 | Upwork, web, Messages | https://mobbin.com/screens/25ac71f0-3756-463d-b2e5-b009f8dcbfe5 | [Observed] List with filter chips (Unread, Favorites), a thread where each message carries sender and time, a composer with a toolbar, and a right context panel with the other party's details and an activity timeline. |
| M15 | Fresha, web, Client messages | https://mobbin.com/screens/bdceb00f-dcbb-48e0-9257-3127a05eaf5d | [Observed] List with Open and Closed filters, thread header with the client's name and a link to the profile, a system line inside the thread ("Appointment booked ... View appointment"), composer with a pending attachment, right panel with client details. |
| M16 | Base44, web, Messages | https://mobbin.com/screens/ce13789a-8426-4b45-8ca3-a96edc02841a | [Observed] Search over a list, a blue dot for unread, thread bubbles left and right with a day label, composer pinned at the bottom. |
| D11 | WCAG 2.2, Understanding 4.1.3 Status Messages | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | [Observed] Results of actions, busy states, progress and errors that do not move focus must be exposed to assistive technology through status or alert roles or live regions. |
| D8 | WCAG 2.2, Understanding 3.2.6 Consistent Help | https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html | [Observed] Help or contact that repeats across pages must keep the same place in the content order. |
| D12 | NN/g, confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Prefer undo to confirmation for routine actions; use outcome-named buttons. Applied here to "discard draft" only. |
| S6 | NHS Design System, warning callout | https://service-manual.nhs.uk/design-system/components/warning-callout | [Observed] The callout is not for telling people to contact a GP or seek help (the NHS care card pattern is for that; that page was not retrieved); specific headings; at most two per page. Applied to CD-513: the emergency notice is not a generic callout. |
| Not retrieved | WAI-ARIA 1.2 `log` role (fetch truncated before the role definitions); NHS and CMS messaging guidance; Carbon, Material, Atlassian chat or comment components; Slack and Linear message composer pages | not retrieved or not attempted | The `log` role and its polite live-region behaviour are used here from existing CarePath code and ARIA practice and are marked [Prior knowledge, not re-fetched]. |
| Not accessed | Healthcare messaging screens (MyChart, One Medical, Hinge Health, Sword Health) | not on Mobbin in this session | No claim about their interfaces. |

Synthesis: web messaging products converge on list plus thread with the composer pinned under the thread (M12, M13, M14, M16); unread is a count or a dot on the row (M12, M16); filters like Unread exist in lists with many conversations (M12, M14), which a clinician inbox has and a patient inbox does not; system events (booking) appear inline in the thread (M15); sender and time are on every message (M14, G-1). Nothing observed shows a consumer or clinical product that states reply expectations or emergency routing beside the composer except MyChart help text and Ro's help banner (G-1), so those parts rest on G's safety reasoning, not on product precedent.

## 1. Current state: the two implementations

Read in `apps/web/app/(patient)/_components/thread-view.tsx`, `(clinician)/inbox/messages.tsx`, `conversation-list.tsx`, and the staff list in `messages.tsx`.

| Aspect | Patient `thread-view.tsx` | Staff `messages.tsx` | Unified result |
|---|---|---|---|
| Message card | full-width, 1 px border, own message tinted | `max-w-xl`, own message offset right with `ml-auto`, others sunken | One card: own offset right, others left, both with the same border and header; max width about 70 characters |
| Failed border | 2 px error border | 1 px `border-error-ink` | 2 px, plus text and icon |
| Sender label | name, role, time | "You (name)" for own, role, time | "You" for own on both; staff adds the name in brackets because several staff share a thread |
| New marker | "New" text beside the sender on each new message | none | A "New messages" separator before the first unread, in text |
| Delivery lines | Sending, Sent, "Not sent. {reason} Your message is saved here." with "Retry sending" | Sending, Sent, "Not sent. {reason}" with "Try again" | One `DeliveryState` with "Retry sending" |
| Retry feedback | Banner "Still not sent" | toast "Trying to send again" and toast errors | Row state "Retrying" and an in-thread Banner; no toasts (matrix E) |
| Composer label | "Message to your care team" | "Message to {patient}" | Same component; label names the recipient |
| Composer notes | hint with reply time; emergency notice as warning box | reply time, emergency notice and "Press Ctrl+Enter to send" in `aria-describedby` text | Same slots; patient variant adds the urgent line and starting points; staff variant adds the shortcut |
| Send disabled | never (validates on submit) | disabled when empty, no reason | Never disabled for empty; validate on submit (matrix F) |
| Log container | `role="log"` wrapper, page scrolls | `role="log"` scroll container with `tabIndex=0`, max height | Same `role="log"` with `aria-label`; staff variant scrolls inside the pane and is focusable |
| Earlier messages | secondary button "Show earlier messages" | secondary sm button, same words | One "Show earlier messages" |
| Read-only (audit) | n/a | text line, no composer | Keep, same line |

---

## 2. Decision: message thread (CD-510)

1. **Task and journey.** Patient: read the care team's answer, see what was sent, retry a failure. Clinician: read a patient's thread, reply, know who else is in it. Needs: who wrote, role, time, delivery state, what is new.
2. **Business and healthcare.** Routine questions resolved in messages; urgent matters not in messages; no suggestion of constant availability. Sender name and role on every message. Message content never in titles, URLs, notifications (G).
3. **Examples.** M12 to M16 [Observed]; G-1 for Ro and Hers [Prior]. All non-clinical except G-1.
4. **Guidance.** D11 for status exposure; `role="log"` for a conversation stream [Prior knowledge, not re-fetched].
5. **Alternatives.** A one shared `MessageThread` with own messages offset, text-keyed states; B keep two implementations; C chat bubbles with status by colour and alignment.
6. **Gates.** Accessibility: C fails (state and sender by colour and alignment alone); A and B pass. Safety: all pass if reply expectations stay in the composer. C is **ineligible**.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A One shared MessageThread, own messages offset, text-keyed states (selected) | 5 | 5 | 5 | 4 | 4 | 4 | 4.70 |
| B Two implementations kept (current) | 4 | 4 | 3 | 2 | 3 | 5 | 3.45 |
| C Chat bubbles, status by colour and alignment | 4 | 2 | 2 | 3 | 4 | 3 | 2.90 |

Arithmetic: A = (25x5 + 25x5 + 20x5 + 15x4 + 10x4 + 5x4) / 100 = 4.70; B = (25x4 + 25x4 + 20x3 + 15x2 + 10x3 + 5x5) / 100 = 3.45; C = (25x4 + 25x2 + 20x2 + 15x3 + 10x4 + 5x3) / 100 = 2.90. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Why: removes duplicated state logic that already diverged (border weight, retry wording, toasts), and keeps sender, role and time as text on every message (M14 pattern) so alignment is decoration only. Rejected: B (the divergence is the problem), C.
9. **Spec: `MessageThread` (composed component) with `MessageItem`.**
   - Anatomy: `section` labelled by the conversation (visually hidden `h2` "Messages"), "Show earlier messages" button, `role="log"` with `aria-label` ("Messages in this conversation" / "Messages with {patient}"), an `ol` of items, optional separator "New messages", optional Banner for "Still not sent". Each item: sender name (semibold), role label, date and time in the clinic zone ("Nov 18, 9:01 AM"), body (`whitespace-pre-wrap`, `break-words`), delivery line for own messages (CD-512).
   - Variants: `patient` (page scrolls; cards full width up to the measure) and `staff` (pane scroll, focusable log, `max-w-xl` offset). Nothing else differs; copy, states and markup are shared.
   - Typography: body `notes` role (17/28 patient, staff dense scale per `typography-exploration.md`), sender `label`, role and time `small`; timestamps with tabular figures.
   - Tokens: own message uses the `primary-subtle` surface role, others `surface` (patient) or `surface-sunken` (staff); failed: `error-ink` border at 2 px. These roles exist today; no new colours.
   - Behaviour: opening a thread clears unread on the server (AC-E9); the thread polls about every 5 s; new messages append without moving focus or scroll unless the reader is at the bottom (then keep pinned to the bottom); if the reader has scrolled up, show a "New messages below" text button that scrolls and focuses the separator. Announcements: the log is polite; only incoming messages from others are announced as "Sender, role, time, text"; own messages are not re-announced on send (the status line says "Sent").
   - System events (for example "Appointment booked") are not part of this release: the contract has no event messages (M15 shows the idea; [Assumption] it would help clinicians).
   - States: loading (skeleton rows, composer already usable), empty ("No messages yet. Write the first one below." patient; staff version names the patient), error (Banner with retry, composer disabled with the reason "Messages did not load"), partial (older pages unavailable: "Earlier messages did not load" with retry), long content (wrap; a single 2000-character message stays inside the card), permission restricted (404 path shows the "You can't open this conversation" copy, G13), stale (poll failure: "Updated 9:12 AM" under the header, no claim of being live), network loss ("You are offline. Messages you write are kept here until you reconnect." only if the app genuinely queues; today it shows failed with retry).
   - Permissions: participants read and write; organisation auditors read only (existing text line, audit event recorded server-side).
   - Responsive: see CD-515.
   - Testing: one component test matrix (sending, sent, failed with retry, failed without retry, new separator, long unbroken string, RTL not required); axe; screen-reader pass on an incoming message and a failed send; Playwright at 390 and 1440.

---

## 3. Decision: composer (CD-511)

1. **Task.** Write a short message, know it was sent, find urgent guidance without hunting; for staff, reply quickly.
2. **Healthcare.** Messages are health information; typed drafts may contain symptoms; the notice and reply time must be visible while typing (G, REQ-MSG-02). No attachments, no AI-authored text to patients.
3. **Examples.** M12, M13, M16 (composer pinned under the thread) [Observed]; M15 (system line plus composer with attachment) [Observed]; G-1 for Hers' visible composer and Noom's prompt chips [Prior].
4. **Guidance.** WCAG 3.3.2 visible labels, 3.2.6 (D8) consistent placement of help, 4.1.3 (D11) status messages for send results, 2.4.11 Focus Not Obscured (sticky bar must not cover the focus ring; D9 [Prior]).
5. **Alternatives.** A shared composer with a visible label, guided starting points, urgent line and reply time, sticky on phones (G4 implemented); B the two current composers; C a chat-style single-line input where Enter sends.
6. **Gates.** Safety: C conditional-fail (Enter-to-send on a mobile keyboard sends half-typed symptom text and offers no room for the notice) → ineligible for the patient app. Accessibility: A pass if label stays visible and the sticky bar respects focus rules. Privacy: all pass; draft handling below.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Shared composer: label, guided starts, urgent line, sticky on phones (selected) | 5 | 4 | 5 | 4 | 4 | 3 | 4.40 |
| B Current composers, patient and staff | 4 | 4 | 3 | 3 | 3 | 5 | 3.60 |
| C Chat input with Enter to send | 4 | 3 | 2 | 3 | 5 | 4 | 3.30 |

Arithmetic: A = (25x5 + 25x4 + 20x5 + 15x4 + 10x4 + 5x3) / 100 = 4.40; B = (25x4 + 25x4 + 20x3 + 15x3 + 10x3 + 5x5) / 100 = 3.60; C = (25x4 + 25x3 + 20x2 + 15x3 + 10x5 + 5x4) / 100 = 3.30. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Rejected: B (diverged and has the disabled-without-reason Send), C.
9. **Spec: `MessageComposer`.**
   - Anatomy (patient): `form aria-label="Write a message"`; starting points row (empty thread only, buttons that insert an editable opening line and move focus to the field; hidden after the first sent message in the session); `Field` label "Message to your care team" with requirement word "required" and hint (the clinic's reply-time text exactly as set; nothing if unset); textarea 4 rows, `maxLength` 2000, `autocomplete="off"`, spellcheck on; counter line shown only at 200 characters left or fewer ("120 characters left") and announced politely only at 100 and 20; `EmergencyNotice` (CD-513); Send button "Send message", full width on phones.
   - Staff variant: label "Message to {patient name}", no starting points, no urgent line, and, **proposed, pending advisor ruling**, no emergency notice: the staff composer would show the clinic's reply-time line and the keyboard hint only ("Press Ctrl+Enter or Cmd+Enter to send.", helper text). Difference from today: the staff composer currently repeats the patient-facing emergency notice, which reads as an instruction to the clinician. I did not re-read REQ-MSG-02 and AC-E10 to see whether they apply to staff composers, so until the advisor rules the staff composer keeps the notice, as a muted helper line below the field. The patient always sees the notice on their own composer.
- Behaviour: Send never disabled for empty; on submit with an empty or whitespace field, show the inline error "Write a message first." and focus the field. While sending: button loading label "Sending", the field stays editable but a second send is ignored. On success: clear field, focus returns to the field, status line (polite) "Sent. Your care team usually replies within one business day. For anything urgent, call the clinic." for patients (G13 wording; reply time only if the clinic set it, otherwise "Sent. For anything urgent, call the clinic."), cleared on the next keystroke. On failure: Banner "Not sent" inside the form with the reason and "Your text is still here"; the message also appears in the thread as failed (CD-512).
   - Draft protection (CD-522): a non-empty draft is kept in memory while the user moves within the app and a `beforeunload` guard warns on tab close or reload. Drafts are **not** written to `localStorage` or `sessionStorage`. This differs from `G-messaging.md` section 13 ("draft restored after a reload"): messages are health information and the demo is used on shared screens; a persisted draft outlives the sign-out. Advisor to rule; the in-memory choice is the safe default.
   - Sticky composer (patient, below 768 px): the form is a bar at the end of the page flow that stays within the viewport using `position: sticky; bottom`, not `fixed`, so the on-screen keyboard and zoom do not leave it floating over the last message; a scroll-padding equal to the bar height keeps the focused message and the focus ring visible. The notices above the field may collapse to one line "Not an emergency line. Urgent? Call the clinic." with a "Details" disclosure after the first send in the session, but are never removed (G14).
   - Keyboard: Tab order notice (static), field, Send; starting points before the field; Esc does nothing.
   - Screen reader: the label, hint and notices are linked by `aria-describedby`; the counter near the limit is a polite live region; send result is a `role="status"` line.
   - States: default, focus, filled, invalid (empty), sending, success, failed, offline, read-only (audit reader, text line instead), disabled never; unsaved changes (draft guard); permission restricted.
   - Data: `MessagePage.composer` (reply time text, emergency notice), `ClinicCard.phone`. No new endpoint.
   - Testing: banned-word check for "anytime", "24/7", "live", "online now" on the rendered page; keyboard with the on-screen keyboard open at 390 px; empty-submit error; draft guard on reload; axe.
   - Prototype spec: `docs/design/design-alternatives/prototypes/messages-composer-urgent-route.md`.

---

## 4. Decision: delivery state (CD-512)

1. **Task.** Know whether my message went through, and recover if it did not.
2. **Constraints.** Contract statuses are `queued | sent | failed` with `failureReason` and `canRetry`; failed messages are visible only to the sender; no per-message read receipts, no typing state (G). So "Delivered" and "Read" cannot be shown truthfully.
3. **Examples.** Hers shows a delivery tick on messages [Prior, G-1]; the Mobbin web screens (M12 to M16) showed no delivery text in the frames inspected [Observed absence only].
4. **Guidance.** D11: errors and results must be exposed; WCAG 1.4.1 (use of colour) is applied as the existing rule "never colour alone" (project rule, CLAUDE.md).
5. **Alternatives.** A one `DeliveryState`: icon plus words, retry in the row; B chip in staff, icon-and-text in patient (current); C ticks only (sent, delivered, read).
6. **Gates.** Safety and honesty: C fails (cannot show Delivered or Read; ticks alone also fail non-colour-text rules) → ineligible. Accessibility: B and A pass.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A One DeliveryState: icon plus words, retry in row (selected) | 5 | 5 | 5 | 4 | 4 | 4 | 4.70 |
| B Chip in staff, icon text in patient (current) | 3 | 4 | 3 | 2 | 3 | 5 | 3.20 |
| C Ticks only (sent, delivered, read) | 3 | 2 | 1 | 2 | 4 | 4 | 2.35 |

Arithmetic: A = (25x5 + 25x5 + 20x5 + 15x4 + 10x4 + 5x4) / 100 = 4.70; B = (25x3 + 25x4 + 20x3 + 15x2 + 10x3 + 5x5) / 100 = 3.20; C = (25x3 + 25x2 + 20x1 + 15x2 + 10x4 + 5x4) / 100 = 2.35. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Rejected: B (chip semantics are reserved for clinical status; matrix C6), C.
9. **Spec: `DeliveryState`** (inside `MessageItem`, own messages only).
   - Vocabulary: **Sending** (clock icon), **Sent** (check icon), **Not sent. {reason} Your message is saved here.** (alert-circle icon, semibold, `error-ink`), **Retry sending** (secondary sm button; label "Retrying" while loading). When `canRetry` is false: the reason only, no button, plus "Call the clinic if it is urgent." (staff variant: "Copy the text and send it again later." is not used; the sender can retype).
   - The failed card has the 2 px error border (shape cue) in addition to icon and words.
   - "Delivered", "Read", "Seen", ticks and double ticks are never shown (no data). A sent message needs no extra line beyond "Sent".
   - Live behaviour: sending to sent is announced once via the composer status line, not per item; failed is announced assertively once as "Message not sent" by the thread Banner (alert), not on every poll.
   - Retry order: oldest failed first; after a retry that fails again, Banner "Still not sent. It is saved here. Try again in a moment, or call the clinic if it is urgent."
   - Both apps use the same words. The toast "Trying to send again" is removed.
   - Testing: each status in Storybook; non-colour check (greyscale screenshot); retry failure; keyboard reach to Retry.

---

## 5. Decision: emergency and urgent notices (CD-513)

1. **Task.** Make sure someone with an urgent problem does not wait for a reply.
2. **Constraints.** `EMERGENCY_NOTICE` is a fixed constant ("Not monitored for emergencies. If this is an emergency, call 911.") under a checkpoint ruling; it must stay in the composer on every compose (REQ-MSG-02, AC-E10). G recommends adding a second line for "urgent but not an emergency", linking to the Contact care team card; the open advisor question is whether to add it as separate copy rather than editing the constant.
3. **Examples.** Ro help banner ("Need help now?"), MyChart help text [Prior, G-1]. The hand-built warning box exists in three places: composer, Contact care team dialog, and the check-in and stop-session flows (usage matrix A3).
4. **Guidance.** D8 consistent help placement; D11: static text is not a status message, so it is not given `role="alert"`.
5. **Alternatives.** A one `EmergencyNotice` element (static, non-dismissible, icon plus text) with an optional separate urgent line; B `Banner tone="warning"` with `role="status"`; C the current per-screen hand-built boxes.
6. **Gates.** Safety: A pass; B conditional (announced as a status on every render makes screen readers repeat it, and Banner can carry a dismiss action); C passes but diverges. Accessibility: A pass.
7. **Selected: A** (conventional element, one implementation reused per protocol item 5). Rejected: B (announcement noise, dismissible), C.
8. **Spec: `EmergencyNotice`.** Anatomy: `alert-triangle` icon, text from the shared constant, optional second paragraph "For something urgent that is not an emergency, call {phone}." (when `ClinicCard.phone` exists; otherwise "Urgent? Contact your clinic." linking to the Contact care team card), phone as a `tel:` link with the number visible. Not dismissible; no `role`; sits directly above the Send button in the composer, and in the same position in other flows that already show it. Tone role: `warning`. Text size never below the theme `label`. The constant is never edited inline; added copy is a separate string reviewed by the advisor. States: phone missing, long phone string, large text. Testing: the exact constant appears; the link is a real `tel:`; banned-words check.

---

## 6. Decision: unread state and the conversation list (CD-514)

1. **Task.** Patient: see whether the care team replied. Clinician: see which patients wrote and which messages did not send.
2. **Constraints.** `ConversationSummary` has `unreadCount`, `failedCount`, a 140-character preview and last message time; no "last sender" field and no status field (G).
3. **Examples.** M12 and M16: count pills and a dot on rows; M12 and M14: an Unread filter in lists that grow [Observed].
4. **Alternatives.** A text-first row: name, preview, time, trailing `CountBadge` "n unread", separate error line "n messages not sent" (icon plus words); B a `StatusChip` for unread and for failures (staff, current) and icon-plus-bold-text (patient, current); C a dot only.
5. **Selected: A.** A chip means clinical status (matrix C6); unread is a work signal, shown with the same `CountBadge` as the navigation (CD-508). Bold text can accompany but never carries meaning alone. Failure line is separate from the unread count because it is a different problem. Rejected: B, C (a dot cannot say how many and fails the text rule).
6. **Spec: `ConversationRow`.** Whole row is one link (patient) or one selectable row (staff pane, `aria-current="true"`, focus ring distinct from selection tint); content: patient name (staff) or "Your care team" (patient), preview line (truncate to one line with the full text inside the thread, no `title` reliance), time in "9:12 AM" today and "Nov 18" otherwise, badge, failure line. Staff list adds an All / Unread segmented control (CD-532) when the list exceeds a screenful [Assumption: clinicians with large caseloads need it; M12 and M14 show the filter]. Sort: most recent message first. Polling about every 30 s; "Updated 9:12 AM" under the list header with a "Refresh" text button. Empty: patient "Your conversation with your care team starts when a therapist is assigned to you."; staff "No conversations yet. They start when a patient is assigned to you." Accessible name of a row: "Jane Doe, 2 unread, last message 9:12 AM: {preview}". Message content never appears in the page title or URL. Testing: counts equal API values; row focus order; greyscale check.

---

## 7. Decision: messages entry and layout (CD-515)

1. **Task.** Reach the conversation quickly, especially when worried; staff move between conversations and records.
2. **Constraints.** One conversation per patient and care team (G); the patient list therefore has one row for nearly everyone. No create-conversation endpoint.
3. **Examples.** M12 to M16: list plus thread on web [Observed]. For phones G-1 shows Hers and Ro opening a thread from a card on a care tab [Prior]. No example found of a single-thread product skipping the list; that part is [Judgement].
4. **Alternatives.** A the patient Messages destination opens the single thread directly and shows the list only when there is more than one conversation; staff get two panes from xl and a list then thread below xl; B always list then thread (current); C topic-based threads (rejected in G as G2).
5. **Gates.** Safety: A pass (reply time and notices live in the composer on the thread); C conditional per G. Accessibility: all pass.
6. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Patient opens the single thread directly, list only when more than one; staff two panes from xl (selected) | 5 | 5 | 4 | 4 | 5 | 3 | 4.55 |
| B Always list then thread (current) | 3 | 4 | 4 | 3 | 2 | 5 | 3.45 |
| C Topic-based threads | 3 | 3 | 2 | 3 | 3 | 1 | 2.70 |

Arithmetic: A = (25x5 + 25x5 + 20x4 + 15x4 + 10x5 + 5x3) / 100 = 4.55; B = (25x3 + 25x4 + 20x4 + 15x3 + 10x2 + 5x5) / 100 = 3.45; C = (25x3 + 25x3 + 20x2 + 15x3 + 10x3 + 5x1) / 100 = 2.70. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

7. **Selected: A.** One fewer tap on a one-row list; the "All messages" back link appears only when a list exists. Risk [Assumption]: a patient may expect a list; mitigated by the thread header naming "Messages with your care team" and who is in it. Rejected: B (an extra step to a list of one), C.
8. **Spec.**
   - Patient, any width: `/messages` renders the thread when exactly one conversation exists; the page `h1` is the thread subject; participants line is truncated to the first name and role with a "Who is on this conversation" disclosure (matrix and G found a three-line participants string at 390 px). If more than one conversation ever exists, `/messages` is the list and the thread has "All messages" back link (CD-505).
   - Staff: below xl, list screen then thread screen with "Back to conversations"; from xl two panes (list about 320 px, thread fills) via the split-pane rule (CD-526: the thread is the destination, so the narrow form is a separate screen, not a drawer). The thread header uses the patient context bar content (name, MRN, link "Open the patient record") so a reply is never sent to the wrong patient (CD-503).
   - Composer fixed at the bottom of the thread pane at xl; sticky bar on phones (CD-511).
   - Data: conversation count and summaries from the existing list endpoint; no new field. The last-sender or status field proposed in G for a "waiting for your care team" line is not assumed.
   - Testing: single and multiple conversation fixtures; deep link `/messages/[id]` still works; back behaviour; two-pane keyboard order (list, thread, composer).

---

## 8. Not decided here

- Attachments, topic threads, assistant-style prompts, read receipts (G defers or rejects).
- Notification delivery (email or push) and its content rules.
- The error toast policy across the clinician app (error recovery family); this file only removes the message-retry toasts.
