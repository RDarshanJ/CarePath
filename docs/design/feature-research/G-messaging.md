# Feature G: Patient and care team communication

Status: provisional until advisor sign-off. Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 G. Access date for every external source: 2026-11-20. No colours are chosen here.

## 1. User problem

A patient has a question for their care team: a sore day after exercise, a plan change they do not understand, a scheduling worry. They need a safe, private place to ask, to know when to expect an answer, to see who answered, and to be certain their message did or did not go through. They also need to be told, plainly and every time, that this is not the place for an emergency and that the team is not watching it continuously. The product must not promise availability or emergency cover it does not provide.

## 2. User and context

- Who: an active patient with an assigned therapist. The thread also includes the care team's active coordinators. [From contract and `api-phase3.md` section 10.]
- Device and state: phone, usually short messages typed on a small keyboard, sometimes while worried or in pain, sometimes at night or on a weekend when no one will answer soon. Patients often cannot judge whether a symptom is urgent (see the clinician study below), so the interface should not rely on them to self-triage.
- Frequency: occasional; checks for replies a few times a day while waiting.
- Roles: therapists and coordinators read and reply; coordinators with organisation access can audit-read any thread; each such read is an audit event.

## 3. Business objective

Resolve routine questions without a visit or a phone call, keep clinician inbox work predictable, and keep the patient informed about what to expect, without implying 24/7 availability.

Metric names only: send success rate; failed-send retry rate; unread-to-read time; clinic-side time to first reply (an operational metric, not shown to the patient as a promise); share of messages that need redirecting to a phone call or visit; patient messages per episode; thread open rate from Today.

## 4. Constraints

Functional (from `messaging.ts`, `clinic.ts`, `copy.ts` and the API notes):

- One conversation per patient and care team, created automatically when a therapist is assigned (`CARE_TEAM_THREAD_SUBJECT` = "Messages with your care team"); participants are the patient, the therapist and active coordinators. There is no create-conversation endpoint, no topic or category field, no urgency flag, no attachments (checkpoint C2 scoped them out), no read receipts per message, no typing state.
- `ConversationSummary` has subject, participants, last message time, 140-character preview, `unreadCount`, `failedCount`. `Message` has body (max 2000 characters), status `queued | sent | failed`, sender name, role and `roleLabel`, `mine`, times, `failureReason`, `canRetry`. Failed messages are visible only to the sender; sent messages to every participant.
- `MessagePage.composer` supplies `replyTimeText` (clinic setting, nullable) and `emergencyNotice` ("Not monitored for emergencies. If this is an emergency, call 911." fixed copy, `EMERGENCY_NOTICE`). `ClinicCard` supplies clinic name, phone (nullable), reply time and the notice.
- Polling: list about every 30 seconds, an open thread about every 5 seconds; opening a thread clears its unread count (AC-E9).
- Access: participants only; a non-participant gets 404 (AC-E11).

Technical: client components poll; sends are optimistic with a queued state and in-place retry.

Safety and privacy: no suggestion of constant availability; emergency notice in the composer on every compose (REQ-MSG-02, AC-E10); no clinical advice from the app itself; no AI-authored text to patients in this feature; sender name and role shown on every message; message content never in notifications, page titles or URLs; messages are health information. Attachments (photos of a wound, range-of-motion videos) need consent text, size and type limits, scanning and storage rules and are not available; if added later, they are a separate decision with their own privacy review.

Accessibility: thread as a labelled list with sender, role and time read in a meaningful order; new messages announced politely without stealing focus; composer label visible (not placeholder only); character count announced only near the limit; failed-send state keyed to text, not colour, and reachable by keyboard; focus returned to the composer after send and after retry; target size at least 24 px (SC 2.5.8); help and the emergency notice in consistent places (SC 3.2.6).

## 5. Current CarePath implementation

Read: `messages/page.tsx`, `messages/[conversationId]/page.tsx`, `_components/conversation-list.tsx`, `_components/thread-view.tsx` (357 lines), the shared Contact care team button in `patient-frame.tsx`, and screenshots `docs/screenshots/4.3a/e07` to `e09`, `e11-not-sent-*`.

What exists: Messages page with intro and the clinic's reply-time text ("Your care team will reply as soon as they can" as fallback); a list of conversations with unread shown as bold text, a count and a message icon; a thread page with sender name, role label and time on each message, "New" markers, "Sent" with a tick for own messages, "Sending", and "Not sent. <reason>. Your message is saved here" with "Retry sending"; a composer with a visible label, the reply-time hint ("Your care team usually replies within one business day."), a warning-style emergency notice, a character counter near the limit and a full-width Send. The header Contact care team button opens the clinic card (phone, reply time, emergency line, link to Messages).

Strengths: sender and role on every message; reply time and emergency notice in the composer itself; honest failed-send handling with a saved message and in-place retry; unread conveyed by text and count; participants-only; focus managed in the composer.

Weaknesses:

1. The composer sits below the whole thread, so on a long thread the patient scrolls to the end to write. (Not observed as a failure, but the capture shows the composer well below the fold at 390 px.)
2. The emergency notice is correct but terse: "Not monitored for emergencies" does not tell the patient what to do for something urgent but not an emergency (for example worsening pain, a fall) and does not show the clinic phone in the composer. The phone is in the header card, one tap away.
3. The reply-time hint reads "usually replies within one business day" when set; when null, the copy is a vaguer fallback. Neither says what happens outside business hours.
4. A blank composer offers no help on what to write or what not to send; patients may use it for urgent symptoms (the clinician study below shows clinicians want clearer guidance on appropriate use).
5. There is one thread per patient, so everything (plan question, visit change, pain) lands in one stream; the preview shows only the latest message, and the subject is fixed.
6. No indication after sending that the message is waiting for a reply or when a reply is expected beyond the composer hint; after "Sent" there is nothing to say "Your care team has it. They usually reply within one business day."
7. No way to tell whether the therapist or a coordinator will answer; the thread lists participants in the header only.
8. Message list shows a long header sentence of participants at 390 px (the capture wraps to three lines).

## 6. Production references observed

Mobbin access: reachable (iOS). Preview frames only. Links are Mobbin pages.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Ro | iOS | "Message detail" | https://mobbin.com/flows/b30bd9c6-b668-4781-ab0a-9c609aab7b84 | [Observed] A Support tab "Messages" card with a status badge ("No action needed"), thread title, last sender and date, and "Show all message threads". In the thread: a clinician message with name and photo, a top banner "Need help now? Find quick answers in our Help Center", and "This conversation is closed. Still need help? Start a new conversation". |
| Hers | iOS | "Chatting with a medical care team" | https://mobbin.com/flows/2ebf735e-fb93-4318-8edd-8d0bcd416626 | [Observed] A Care tab card "View New Message from Michelle B. NP" with the clinician's credential; a thread with clinician messages on the left (grey, with time and a delivery tick), the patient's own on the right (filled, with time), a visible composer "Write a message..." with a send arrow, a typed-in-progress state with the keyboard open. Clinician text includes a link to find a primary care doctor and "feel free to message me back at any time". |
| Noom | iOS | "Messages" and "Sending a message" | https://mobbin.com/flows/de3e8976-5388-4906-8635-0832fa620b4f and https://mobbin.com/flows/e07bf4ac-1c7c-4b00-aadf-941a68bc0ffe | [Observed] A messages list with one team entry, an unread count badge, and suggested prompt chips ("How do I weigh in?"); an in-thread header "We're here to help answer your questions"; suggested follow-up chips after a reply; thumbs up and down on replies; an add button beside the composer. This is an assistant-style chat (replies are long, formatted lists), not necessarily a human care team. |
| One (fintech, not health) | iOS | Chat | https://mobbin.com/flows/0a08eeb2-2f5f-42b9-ab4e-03c4914c4afe | [Observed] Chat opens with topic buttons ("Ask about transfer timelines", "File a dispute", "None of these"), a "Minimize" control, and an "Are you sure you want to end this chat?" dialog. Non-health transfer pattern only. |
| MyChart (organisations' pages) | web | Help: messaging reply | https://www.mychart.org/l/en-us/help/messaging-reply/ | [Observed, official help text] Most healthcare organisations reply within three business days, but each organisation sets its own policy; MyChart is for non-urgent questions and not for time-sensitive concerns; for emergencies, call 911 (or the local number) rather than waiting for a reply. MyChart screens are not on Mobbin; none inspected. |
| One Medical | iOS | Not on Mobbin | https://www.onemedical.com/same-day/ | [Observed, official page text] Provider messaging "anytime" in the app and 24/7 video or message care are stated; no response times, no emergency guidance on that page. No interface inspected. |
| Sword Health | iOS | Not searched on Mobbin | https://apps.apple.com/us/app/sword-health/id1468523447 | [Observed, listing text] Members can message a physical therapist "anytime for support"; other programmes mention 24/7 support. Marketing language; screens not inspected. |
| Hinge Health | iOS | Not on Mobbin | https://www.hingehealth.com/how-it-works/experience | [Observed, official page text] The page lists a care team and "Robin, your virtual care assistant" and does not describe how messaging works. Hinge Health help says in-app messaging unlocks after the first visit. No screens inspected. |
| Study: clinician handling of patient portal messages | n/a | "Insecure messaging" | https://pmc.ncbi.nlm.nih.gov/articles/PMC7969962 | [Observed, paper summary] Qualitative study of 20 primary care clinicians at two US sites: they agreed urgent issues (for example chest pain) belong on the phone, not in secure messages, and noted patients often can't judge urgency. Routine lab and medication questions were seen as appropriate. They wanted clearer guidance on appropriate use and few discussed it with patients. The paper reports no specific response-time expectations. Small, US, primary care, not rehab. |
| Not accessed | | MyChart, One Medical, Hinge Health and Sword screens; Maven, Omada, MedBridge, WebPT, Headway, Tebra, Medplum | | Not found on Mobbin in today's searches (the generic care-team message search returned Ro, Hers and Noom); no screens inspected. |

## 7. Established patterns

1. The thread is a conversation with named people. Ro and Hers show who wrote, with a credential (NP), and Hers shows timestamps and a delivery tick. This is also in CarePath already and is the right base.
2. Status before reading. Ro's "No action needed" badge tells the patient whether they have to do anything. CarePath has unread and failed counts but no neutral "all caught up" or "waiting for your care team" wording.
3. Expectation is stated where the patient types. MyChart says non-urgent and no guaranteed time; Hers has no stated time in the frames seen; CarePath puts the clinic's reply time in the composer. Marketing pages (One Medical "anytime", Sword "anytime") promise availability that CarePath must not copy.
4. Urgent help is a separate path. Ro offers quick answers in a Help Center banner; MyChart tells patients to call 911 instead of waiting. The clinician study supports routing urgent issues away from messaging.
5. Suggested starting points reduce blank-page effort (Noom prompt chips, One topic buttons). They are common in assistant chat; in a care-team thread they must not look like clinical triage or an AI answer.
6. Closed threads force a new conversation (Ro), which fragments history. CarePath keeps a single running thread, which preserves history.
7. Failure modes: promising "anytime" availability; threads with no status; long unstructured threads where a new topic gets lost; assistant-style formatting that makes a human reply look automated; attachments without clear privacy handling (none observed in the frames seen).

## 8. Alternatives

Evidence labels: R = research evidence observed above; J = expert judgement; U = untested assumption.

### G1. Single conversation thread (current model)

- Problem addressed: ask a question and see the history.
- Interaction model: one running thread with the care team; composer with reply time and emergency notice; unread and failed handling.
- Benefits: simple; full history in one place; built and tested.
- Limitations: blank composer gives no guidance on what to send; no "waiting" status; everything mixes in one stream; the composer is below a long thread.
- Accessibility: good as built.
- Business: neutral; clinicians read one stream per patient.
- Technical: done.
- Error and recovery: failed messages stay with Retry; polling failure leaves the unread count until the next poll.
- Evidence: R (Hers, Ro thread view; MyChart expectations); existing ACs.

### G2. Topic-based communication

- Problem addressed: route and find messages by subject (exercise question, scheduling, symptoms, other).
- Interaction model: patient picks a topic when composing; the thread groups by topic or shows topic labels.
- Benefits: helps clinicians triage; helps patients find old answers; mirrors One's topic buttons.
- Limitations: no topic field or create-conversation endpoint exists (contract and database change); a "symptoms" topic suggests monitoring, which contradicts the no-continuous-availability rule; extra step for a quick question; more threads fragment history (Ro's closed-thread problem); patients may choose the wrong topic under stress.
- Accessibility: a radio group or select; fine.
- Business: better triage if clinics use it [U].
- Technical: high (schema, routing, clinician inbox changes).
- Error and recovery: mis-routed topic needs clinician re-tagging.
- Evidence: R (One chat topics, a non-health product); J (risk).

### G3. Care-team inbox with status

- Problem addressed: show where each conversation stands.
- Interaction model: Messages is a list with status lines in words: "Reply received (new)", "Sent. Waiting for your care team", "Not sent. Retry", "All caught up". Opening shows the thread.
- Benefits: Ro-style status gives the patient certainty before opening; reduces repeated "did they get it?" checks.
- Limitations: with one thread per patient, a list of one row has little value on its own; "waiting for your care team" must not imply a promised time; the contract has no "last sender" field (only a preview and unread count), so "waiting" would be inferred in the client from the last message, which is not reliable if a clinician has read but not replied.
- Accessibility: status in text, fine.
- Business: reduces uncertainty; may increase repeated messages if the wording implies delay.
- Technical: low to medium (needs `lastMessage.mine` or a status field to be reliable).
- Error and recovery: wrong status is a trust issue.
- Evidence: R (Ro badge); J (inference caveat).

### G4. Conversation plus guided starting points and urgency routing

- Problem addressed: make the first message safe and useful, and send urgent needs elsewhere.
- Interaction model: keep the single thread. Above the composer (and on an empty thread), show a short "What would you like to ask?" row of starting points that only fill the composer with an editable opening line: "A question about my exercises", "A question about my appointment", "Something about how I feel". Each shows the same one-line reminder. Beside the emergency notice, add a plain "Urgent but not an emergency? Call [clinic phone]" line when `ClinicCard.phone` exists, otherwise "contact your clinic" (existing fallback wording), linking to the Contact care team card. After a successful send, show a quiet confirmation "Sent. Your care team usually replies within one business day. For anything urgent, call the clinic." Reply time shown exactly as the clinic sets it; if unset, say nothing about time rather than invent one. Move the composer to a sticky bottom bar at 375 to 768 px so it is reachable without scrolling the thread.
- Benefits: reduces blank-page friction; puts the urgent route where the patient is typing; no new data model (starting points are client-side text); consistent with the clinician study's call for guidance.
- Limitations: starting points can look like triage; "Something about how I feel" invites symptom reports into a channel that is not monitored continuously, so the same screen must carry the urgent route and the reply time; a sticky composer takes vertical space on small phones and with the on-screen keyboard.
- Accessibility: starting points are buttons that insert text and move focus into the composer; the composer keeps a persistent label; sticky bar must not cover the last message or the focus ring (SC 2.4.11 Focus Not Obscured); announce send results politely.
- Business: fewer misrouted urgent messages [U]; faster first messages; clinician inbox gets clearer openers.
- Technical: low. Client-only copy and layout; phone and reply time come from `ClinicCard` and `composer`. The emergency copy is a fixed constant, so any rewording needs an advisor ruling (see section 11).
- Error and recovery: unchanged failed-send handling; if the clinic phone is null the line reads "Urgent? Contact your clinic" with the card link.
- Evidence: R (Noom and One chips, Ro urgent banner, MyChart non-urgent guidance, clinician paper); J (specific design); U (that starting points reduce misrouted messages).

Deferred, not an alternative: attachments (photos or video) for wound or movement questions. Valuable clinically, but there is no contract, storage or consent design, and checkpoint C2 excludes them. Revisit as its own feature with a privacy review.

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| G1 | Pass | Pass | Pass (notice, reply time, no availability claim) | Eligible |
| G2 | Pass | Pass | Conditional: a "symptoms" topic implies monitoring and fails the no-continuous-availability rule unless it carries the urgent route; mis-selected topic can delay a response | Eligible only with the urgent route on the topic screen; otherwise ineligible |
| G3 | Pass | Pass | Conditional: any "waiting" wording that implies a promised time fails; status must not be inferred if it could be wrong | Eligible with constrained copy and a reliable data source |
| G4 | Pass (sticky bar must not obscure focus or content) | Pass (no content in notifications; no attachments) | Pass (urgent route and notice at the point of typing; no availability promise) | Eligible |

## 10. Weighted evaluation

Weights adjusted: task 20, safety/privacy/trust 25, usability/accessibility 20, business 10, operations 15, technical 5, design system 5. Reason: a messaging surface that overpromises availability is the main clinical risk, so safety rises to 25; clinician inbox efficiency matters (15); task effectiveness drops to 20 because the baseline thread already completes the core task.

| Criterion | G1 | G2 | G3 | G4 |
|---|---|---|---|---|
| Task effectiveness (20) | 4: send, read, retry all work | 4: routing helps find things | 4: status gives certainty | 4: easier first message, composer reachable |
| Safety, privacy, trust (25) | 4: notice and reply time present | 3: topic can imply monitoring | 4: if copy constrained | 5: urgent route beside the notice, no promise |
| Usability, accessibility (20) | 4 | 4: extra step | 4 | 4: sticky bar needs care |
| Business value (10) | 3 | 3 | 3 | 4: fewer misrouted urgent messages [U] |
| Operations (15) | 3: one undifferentiated stream | 4: triage by topic | 3: patient-facing only | 4: clearer openers, less urgent traffic [U] |
| Technical (5) | 5: built | 2: schema, routing, clinician inbox | 3: needs a reliable status field | 4: client-only |
| Design system (5) | 5 | 4 | 4 | 4 |
| Weighted total (out of 5) | 3.85 | 3.55 | 3.70 | 4.25 |

Arithmetic: G1 = (20x4 + 25x4 + 20x4 + 10x3 + 15x3 + 5x5 + 5x5) / 100 = 3.85. G2 = (80 + 75 + 80 + 30 + 60 + 10 + 20) / 100 = 3.55. G3 = (80 + 100 + 80 + 30 + 45 + 15 + 20) / 100 = 3.70. G4 = (80 + 125 + 80 + 40 + 60 + 20 + 20) / 100 = 4.25. Judgement scores, not measurements.

## 11. Recommendation

Select G4: keep the single care-team thread (G1) and add guided starting points, the urgent route beside the emergency notice, a post-send expectation line and a reachable composer. Runner-up: G1 unchanged (3.85), because G4 is G1 plus client-side guidance; G3's status idea is worth revisiting once the API exposes whether the last message was the patient's.

Why G4 beats G1: it puts the right expectation and the urgent route at the moment of writing, and removes the blank page, with no data-model change. Why it beats G2: no schema or inbox change, no "symptoms" topic implying monitoring, no fragmenting of history. Why it beats G3 today: the contract lacks a reliable "waiting" status. Rejected: topic threads now, status inference now, attachments now, and any "anytime" or "24/7" language.

Language rules for this feature:

- Never say "anytime", "24/7", "live", "online now" or show presence or typing indicators.
- Always state the reply time as the clinic set it. If the clinic did not set one, do not state a time.
- Keep "Not monitored for emergencies. If this is an emergency, call 911." visible in the composer. Add, do not replace: "For something urgent that is not an emergency, call [phone]."
- Name who answers: show sender name and role on every message (existing). Do not imply a specific person will reply to a new message; say "your care team".

Open questions for the advisor: (1) the emergency string is a fixed constant under a C1 ruling; approve adding the second line as separate copy rather than changing the constant? (2) approve moving the composer to a sticky bar at phone widths? (3) should the starting points be clinic-configurable later?

Trade-off: the screen carries more words above the composer. They are the words that matter for safety, so I accept the extra height and propose collapsing the starting points once the patient has sent a message.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Active patient with an assigned therapist |
| Job to be done | Ask my care team a question and know it went through, who will see it, when to expect an answer, and what to do if it is urgent |
| Pain point | Blank composer, urgent route one tap away in the header, no post-send expectation, composer below a long thread |
| Business objective | Resolve routine questions in messages; keep urgent issues on the phone; avoid availability promises |
| Functional requirement | REQ-MSG-01, REQ-MSG-02, REQ-MSG-03; AC-E9, AC-E10, AC-E11 |
| Success metric | Send success rate; failed-send retry rate; share of messages redirected to a call or visit; unread-to-read time; clinic time to first reply (names only) |
| Design hypothesis | If the urgent route and the reply time sit beside the composer and starting points reduce the blank page, fewer urgent matters are sent as messages and first messages are clearer. [Untested] |
| Selected pattern | G4 conversation with guided starting points and urgency routing |
| Technical dependency | `MessagePage.composer`, `ClinicCard.phone` and `replyTimeText`; optional future: last-message-sender or status field, attachments |
| Validation method | Scenario test with synthetic prompts ("You have worsening pain tonight, what do you do?"; "You want to ask about swapping a walk for a treadmill"), copy test for banned availability words, screen-reader test of the thread and composer, keyboard test with the on-screen keyboard open at 390 px, failed-send walkthrough |

## 13. States to design

| State | Microcopy | Recovery or action |
|---|---|---|
| Default (empty thread) | "Write to your care team. They usually reply within one business day." Starting points row. Emergency notice. | Pick a starting point or type |
| Default (with history) | Thread, composer, notice | Type and send |
| Hover, focus, active | Standard; starting points are buttons that fill the field and focus it | n/a |
| Disabled (send) | Send disabled only while sending; empty field gives a validation message on submit | n/a |
| Validation error | "Write a message first." / "Messages can be up to 2,000 characters." | Edit |
| Loading (thread) | "Loading messages" skeleton; composer already usable | None |
| Sending | "Sending" on the message and the button | None |
| Success | "Sent. Your care team usually replies within one business day. For anything urgent, call the clinic." | Dismiss on next keystroke |
| Failed delivery | "Not sent. <reason>. Your message is saved here." with "Retry sending" | Retry; copy text; call the clinic if urgent |
| Still failing after retry | "That message still did not send. It is saved here. Try again in a moment, or call the clinic if it is urgent." | Retry; header Contact |
| Unread | List: bold subject, "2 unread"; thread: "New" marker; nav badge with count in text for assistive tech | Opening clears it |
| Empty (no conversation) | "Your conversation with your care team starts when a therapist is assigned to you." | None |
| Permission denied | "You can't open this conversation." (404 path) | Back to Messages |
| Server error (list) | "Messages did not load. Try again." | Retry; header Contact |
| Network loss | "You are offline. Messages you write are kept here until you reconnect." Do not claim queued delivery unless the app guarantees it | Retry on reconnect |
| Stale information | "Updated 9:12 AM" near the list | Refresh |
| Unsaved changes | Leaving with a typed draft: "Keep your draft?" (drafts kept locally for the session) | Keep or discard |
| Interrupted workflow | Draft restored after a reload in the same session | Continue |
| Outside business hours | Only if the clinic sets text for it: show it. Otherwise nothing | n/a |

## 14. Responsive behaviour

- 375, 390: list is single column; thread single column with a sticky composer bar (label, field, send) and the emergency and urgent lines above it, collapsible after the first send in the session but never removed; starting points as a horizontal wrap of buttons above the field on an empty thread; header participants line truncated with a "Who is on this conversation" disclosure.
- 768: same, wider measure; composer no longer sticky if the thread is short.
- 1024: two panes: conversation list on the left (one row for most patients, so the pane stays narrow), thread and composer on the right; composer fixed at the bottom of the thread pane.
- 1440: same two panes with a comfortable maximum thread width (about 70 characters); notices stay beside the composer.
- 1920: centred at a maximum width; no extra panes.
- What changes model: only the list pane appears at 1024 and above; at phone widths list and thread are separate screens.
