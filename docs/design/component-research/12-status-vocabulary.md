# 12 Status indicators and vocabulary (family 12)

Protocol: `component-research/PROTOCOL.md`. Brief section 13 (and 18, 22). Access date for every external source: 2026-11-20. Decision records CD-230 to CD-240. Evidence for the mismatches: `docs/design/component-usage-matrix.md` section C (re-verified against code on 2026-11-20 for appointments, patient status and review). Colours are not chosen; tone names (success, warning, error, info, neutral) are semantic token roles. Scores are heuristic.

## 0. Sources reviewed this session

| Source | URL | Observed |
|---|---|---|
| GOV.UK Design System, Tag | https://design-system.service.gov.uk/components/tag/ | [Observed] Tags show status only and are never interactive; text carries the meaning, colour reinforces (cites WCAG 2.2 SC 1.4.1); keep the same colour for the same tag everywhere; one status can be enough because absence implies the other state; start with the fewest statuses; adjectives not verbs; sentence case. |
| NHS service manual, Tag | https://service-manual.nhs.uk/design-system/components/tag | [Observed] Same rules (small number of statuses, no links in tags, adjectives, sentence case); do not mix solid colours with tints; text and background contrast meet AAA. |
| Atlassian Design System, Lozenge | https://atlassian.design/components/lozenge/usage | [Observed] Lozenges for workflow status, state, priority, permissions; tags for descriptive metadata. Semantic colours for shared meaning, accent colours never for semantic labels; do not mix semantics in one lozenge; pair colour with a label and optionally an icon with established meaning; lozenges are not focusable so truncated text is hidden, so keep labels short; no custom behaviour in a lozenge. |
| Carbon, colour palettes | https://carbondesignsystem.com/data-visualization/color-palettes/ | [Observed] Alert colours: red danger, orange serious warning, yellow warning, green normal. Used as a convention check only. |
| NHS CUI Patient Banner | https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben | [Observed] Missing values need self-explanatory words; "?" and "-" confuse. Used for "Not recorded". |
| Mobbin: Cal AI "Progress", Flo "Cycle trends" | https://mobbin.com/screens/a66164ef-7a59-4a18-ab4b-f02fc00f7b0f ; https://mobbin.com/screens/ce72a902-eec7-405c-949e-7235468e4483 | [Observed] "Healthy" pill and "Increase" labels attach verdicts to health values; the reason CarePath keeps verdict words out of status vocabularies for patient-reported data. |
| Slack activity states, Notion/Linear history | see `J-patient-record.md` section 6 | [Prior] Items state their own condition in words; version lists mark "Current version". |

Not accessed: CMS, USWDS (Tag), Material 3 (chips), Apple HIG (badges), Spectrum (status light), Fluent (badge), Polaris (badge) pages; Mobbin status-badge searches; NN/g. Nothing from them is cited.

## 1. Present state, in one paragraph

One appointment can show as an outlined Tag (clinician), a filled chip (patient, live states only) or plain text (patient, ended states). One review task is a chip in the queue and overview and a Tag in the record timeline. Plan version "Current" is a success `StatusChip` in two places, "Current version" in a third and "(current)" as plain text in the patient plan history, while its sibling "Earlier version" is a Tag in the same slot. Wording differs for no-show ("Did not attend" / "Missed"), patient cancellation ("Cancelled by the patient" / "Cancelled by you"), video visits ("Video follow-up" / "Follow-up by video"), session outcome ("Ended without finishing" / "Not finished") and unsent messages ("n messages not sent" / "n of your messages were not sent"). Status tone logic for patient status is duplicated in `common.tsx` and admin `patients.tsx`. `ReviewTask.priority` (integer, 30 to 80 in seed) is used only to order the queue. No route renders AI generation or clinical note state.

## 2. CD-230: how status is shown (component choice and what a status needs)

**Alternatives.** A: a coloured badge for every status value. B: a rule set: plain text for an expected state, a Tag for an exceptional administrative state, a `StatusChip` for a state that needs attention or is live, no standalone dots. C: a dot plus text on every row. D: plain text only.

**Gates.** A fails the brief's own rule ("do not convert every metadata value into a coloured badge") and wastes the signal; a dot alone fails SC 1.4.1 (colour as the only means) [Standard], so C passes only with text beside the dot.

**Scores (default weights).** A 2,3,2,3,4,5 = 2.75; B 5,5,5,4,4,4 = 4.45; C 3,4,3,3,4,4 = 3.40; D 3,5,3,3,4,5 = 3.70. B arithmetic (125+125+100+60+40+20)/100.

**Selected B.** Rules:

| Situation | Form | Why |
|---|---|---|
| List where every row has the same status (for example Upcoming visits are all booked) | No indicator; the list heading states the state; an `sr-only` word on each row if rows can leave the list | Absence implies the default (GOV.UK, NHS [Observed]); a repeated tag says nothing |
| Mixed-status list | Expected state as plain text, every exception as a Tag; the word is always visible (never only `sr-only`) | Absence would be ambiguous because it means different things in different lists |
| Administrative state (enrolment, plan version, appointment, review task, priority, note signed) | `Tag`: outlined, text only | Existing rule in `docs/design-system/components.md` |
| Needs attention or live state (stopped for discomfort, not yet reviewed, message not sent, in progress today) | `StatusChip`: filled tint, icon, words | Existing rule; icon adds a second channel |
| Standalone dot | Not used | Meaning would sit in colour and position |
| Count of items (unread, not sent) | Count badge with `sr-only` unit (family 14), never a status vocabulary word | Different job |
| Anything that needs a reason | Plain sentence next to or under the status, visible, never a tooltip | Brief section 18 |
| Anything the user can fix | One action button next to the status (Retry sending, Try again) | Brief section 13 "associated action" |

Further rules: tags are never links or buttons; at most two Tags per row and at most one per vocabulary; sentence case; adjectives or participles, not verbs; the same status has the same tone in every app (one shared map, CD-239); no status uses a tone that implies a clinical verdict on health data (no tone for pain or session count). Label length: 24 characters or fewer where it must sit in a table cell; longer wording goes in the sentence beside it. A `title` attribute is never used to carry the explanation. **Rejected:** A (noise), C (dot-only risk), D (loses attention states).

## 3. Vocabularies mapped to real enums

Enum sources: `packages/db/prisma/schema.prisma` (read 2026-11-20) and `packages/shared/src/contracts/*.ts`. A label that has no UI today is marked "no UI today"; the wording is a proposal for when it is built. Audience columns: Staff is clinician and admin; Patient is the patient app, differing only by perspective pronoun where noted (CD-233 rule).

### 3.1 Enrolment (CD-231): `PatientStatus` and `IntakeStatus`

`PatientStatus`: intake_incomplete, awaiting_assignment, active, inactive, discharged. Contracts: `patientStatusSchema` (patients.ts).

| Enum value | Staff label | Form | Tone | Explanation | Action | Patient label (hero eyebrow) |
|---|---|---|---|---|---|---|
| intake_incomplete | Intake incomplete | Tag | warning | In the record and admin: "Intake not submitted" detail from the intake status | Admin: "Waiting for the patient to finish intake" (existing text) | Setting up |
| awaiting_assignment | Awaiting assignment | Tag | warning | "No therapist assigned yet" | Admin: Assign therapist | Setting up |
| active | Active | Tag | success | See definition note below | none | none (patients are not labelled) |
| inactive | Inactive | Tag | neutral | no UI definition | none | none |
| discharged | Discharged | Tag | neutral | no UI definition | none | none |

`IntakeStatus` (in_progress, submitted, reviewed) plus "no intake record": admin Intake column words become Not started, In progress, Submitted, Reviewed (replacing "Missing: intake not started", "Missing: intake started, not submitted", "Submitted", "Submitted and reviewed"). Not started and In progress show as plain text with a warning Tag only when the patient status is intake_incomplete (to avoid two tags for one fact). The patient's own "Step n of 11" stays a `Progress`.

Definition note ("Active" is ambiguous, brief section 13): the code gives no definition. [Assumption, to confirm with the product owner] active = intake submitted and a therapist assigned. Until confirmed, keep the word, put the definition as visible text beside the status filter ("Active: intake submitted and a therapist assigned") and in the glossary table of the admin help. Do not rename before the owner confirms what inactive and discharged mean. One map and one tone function in `@carepath/shared` replaces the copies in `common.tsx` and `admin/patients/patients.tsx`.

### 3.2 Care plan (CD-232): plan stage, plan version, `CarePlanStatus`

Directory contract: `planStageSchema` none, draft, published. Database `CarePlanStatus`: draft, active, on_hold, revoked, completed, entered_in_error. Today's UI only distinguishes stage and version, so only those are mapped to words now.

| State | Label (staff) | Form | Notes |
|---|---|---|---|
| none | No plan | plain text in directory | |
| draft, v n current | Version n published, draft changes | plain text | existing `planStageText` |
| draft only | Draft only | Tag neutral in header; plain text in lists | |
| published | Version n published | plain text | |
| Version marker, current | Current | Tag success | **One word everywhere**: replaces "Current version", "(current)"; plain-text contexts read "Version 3, current" |
| Version marker, earlier | Earlier version | Tag neutral | |
| Version view, preview | Preview, not published | Tag info | A property of the view, not the record; was a `StatusChip` |
| on_hold / revoked / completed / entered_in_error | On hold, Revoked, Completed, Entered in error | Tag | no UI today; Entered in error also needs a visible sentence |

The version slot always renders a Tag (was alternating chip and tag). Builder save line ("Draft saved at ...", "Not saved: ...") stays a `role="status"` text line; it is feedback, not status vocabulary.

### 3.3 Appointment (CD-233): `AppointmentStatus` and `AppointmentType`

Contract: `appointmentStatuses` in scheduling.ts: requested, booked, checked_in, in_progress, completed, cancelled_by_patient, cancelled_by_clinic, no_show. Types: initial_evaluation, follow_up, video_follow_up.

| Enum | Staff label | Patient label | Upcoming list | Mixed or history list | Form | Tone |
|---|---|---|---|---|---|---|
| requested | Requested | Requested | shown | shown | Tag | info |
| booked | Booked | Booked | no indicator (sr-only word) | plain text | none or text | none |
| checked_in | Checked in | Checked in | shown | shown | Tag | info |
| in_progress | In progress | In progress | shown | shown | Tag | info |
| completed | Completed | Completed | n/a | plain text | text | none |
| cancelled_by_patient | Cancelled by the patient | Cancelled by you | shown | shown | Tag | warning |
| cancelled_by_clinic | Cancelled by the clinic | Cancelled by the clinic | shown | shown | Tag | warning |
| no_show | Did not attend | You did not attend | shown | shown | Tag | warning |

**Alternatives and scores.** A: a Tag on every row for every status (clinician today). B: plain text for the expected state and a Tag for exceptions and live states, words always visible in mixed lists. C: a lifecycle stepper per visit. Scores (default weights): A 3,4,3,3,4,5 = 3.45; B 5,5,4,4,4,4 = 4.50; C 3,3,4,3,2,2 = 3.05. B arithmetic (125+125+80+60+40+20)/100. Selected B. Rejected A (a repeated tag says nothing) and C (heavy for a status that rarely changes in view).

Fixes: no-show becomes "Did not attend" (staff) and "You did not attend" (patient), replacing patient "Missed" (a blaming shorthand, and not the same word the clinic sees). Perspective wording ("by the patient" / "by you") is the one allowed difference between apps and is documented as the rule. Video visit type is "Video follow-up" in both apps. The patient app uses the same Tag as staff for live and exception states, not a `StatusChip` (appointment status is administrative). Completed no longer appears as a success Tag on every past row.

### 3.4 Review (CD-234): `ReviewTaskStatus`, check-in review, session outcome

`ReviewTaskStatus`: open, in_review, resolved, dismissed (contract `reviewTaskStatusSchema`). Query filter values active and closed are filters, not statuses.

| Enum | Label | Queue (mixed open and in review) | Timeline and record | Form |
|---|---|---|---|---|
| open | Open | plain text "Open" | plain text "Open" | text |
| in_review | In review | Tag info | Tag info | Tag |
| resolved | Resolved | Tag success | Tag success | Tag |
| dismissed | Dismissed | Tag neutral | Tag neutral | Tag |

Review task status is administrative workflow, so it is a Tag everywhere (queue and overview chips become Tags; the timeline already uses Tag). The clock icon on "In review" is dropped with the chip. Kind remains Tag "Administrative" only for administrative rules; clinical rules show nothing (the default in the queue). Check-in review (a clinical review of patient data, `reviewedAt`) stays a `StatusChip`: "Reviewed" success with reviewer and time as plain text; "Not yet reviewed" warning with clock; it is a different concept from task status and is not merged.

### 3.5 Administrative priority (CD-235): `ReviewTask.priority` and `ReviewRule.priority`

Integer in the contract (review.ts lines 90 and 149); seeded rule values 80 reported pain, 60 unreviewed check-in, 50 missed sessions, 40 missing intake, 30 upcoming follow-up (`packages/db/seed/ops.ts`). Never displayed.

**Alternatives.** A: show the number. B: show bands High, Medium, Low computed in the client from thresholds. C: show a server-supplied two-level band (high or standard) as a Tag only for high, plus the existing "why it appeared" text. D: show nothing and rely on sort order.

**Gates.** A fails (an unexplained number is not a vocabulary). B fails (the client would invent thresholds that the rules configuration owns; clinical-safety risk if the two diverge).

**Scores.** C 4,5,5,4,4,2 = 4.35; D 2,4,2,3,5,5 = 3.10. C arithmetic (100+125+100+60+40+10)/100.

**Selected C, conditional on a contract change:** request `priorityLevel: "high" | "standard"` on `ReviewTask`, derived on the server (the rule or an admin setting decides which rules are high; thresholds are not specified here). UI: Tag "High priority" (warning) on high tasks only, with the rule name as the visible reason; standard shows no mark. Until the field exists, the list line reads "Sorted by priority, then oldest first" (accurate to `orderBy priority desc, createdAt asc`) and no priority word is shown. Two levels because GOV.UK and NHS advise the fewest statuses [Observed]. **Rejected:** A, B, D alone.

### 3.6 AI generation (CD-236): `AIGenerationStatus`, `AIReviewDecision`, `NoteVersionSource`

Database only (no contract yet). `AIGenerationStatus`: pending, succeeded, failed. `AIReviewDecision`: approved, approved_with_edits, rejected. `AIGeneration.unsupportedStatementCount`, `providerLabel`. `NotificationType` includes ai_draft_ready.

One name for the feature, everywhere: staff screens say "AI-generated" and patient consent says "AI-assisted drafting" (the consent type is `ai_assisted_features`). This replaces "automated drafting tools" (consent copy) and the bare word "generated" (design system labels): provenance has to say AI. The existing `AIDraftBlock` labels gain the words.

| State (derived) | Label | Form | Explanation shown | Action |
|---|---|---|---|---|
| pending | Generating draft | `Progress` indeterminate with text, `role="status"` | "This can take a minute. You can keep working." | Cancel only if the API supports it (not assumed) |
| succeeded, no review | Draft, AI-generated, not reviewed | `AIDraftBlock` label (dashed rule), not a chip | provider name from `providerLabel`; "n statements have no source" when `unsupportedStatementCount` > 0 | Review, Approve, Edit, Reject |
| succeeded, approved | AI-generated, reviewed and approved | `AIDraftBlock` solid rule | reviewer and time | none |
| succeeded, approved_with_edits | AI-generated, edited and approved | `AIDraftBlock` solid rule | "Edited by {name}", time | View changes |
| succeeded, rejected | Draft rejected, not used | `AIDraftBlock` | reviewer, time | none |
| failed | Could not generate a draft | Banner (error, `role="alert"`) | "Nothing in the record was changed." | Try again |

No confidence percentage (no validated meaning; brief section 16). No sparkle icon. The consent switch label: "Allow AI-assisted drafting for my care team" (patient consent copy change; confirm with the consent owner).

### 3.7 Clinical note (CD-237): `ClinicalNoteStatus` and `NoteVersionSource`

`ClinicalNoteStatus`: draft, signed, entered_in_error (amendments are new versions, not a status). `NoteVersionSource`: clinician, ai_draft. No route renders it today.

| State | Label | Form | Explanation |
|---|---|---|---|
| draft | Draft | Tag neutral | "Not signed" (who can see a draft is not defined in the contracts, so nothing more is asserted) |
| signed | Signed | Tag success | plain text "Signed by {name}, {date time}" |
| signed with more than one version | Signed | Tag success | plain text "Version 2, amended {date}"; version list in History |
| entered_in_error | Entered in error | Tag warning | Visible sentence "This note was marked as entered in error and should not be relied on." plus who and when |
| version source ai_draft | line of text "Started from an AI-generated draft" | plain text | links to the version; never overwrites clinician text (brief section 16) |

Authorship is a plain line, not a second Tag, so a signed note has one status Tag.

### 3.8 Message delivery (CD-238): `MessageStatus`

Contract: queued, sent, failed (messaging.ts comment: queued visible to sender only; failed sender only with `canRetry`).

| Enum | Label | Form | Explanation | Action |
|---|---|---|---|---|
| queued | Sending | icon (clock) plus text | none | none |
| sent | Sent | icon (check) plus text, muted | none | none |
| failed | Not sent | `StatusChip`-style row: icon plus text plus border, error tone | the reason string, "Your message is saved here." | Retry sending; while retrying "Retrying" |

**Alternatives.** A: chip in lists and icon plus text in thread (today). B: one icon-plus-text message state component used in both apps, failed row identical (same border width, same words). C: single tick icons only.

**Gates.** C fails (icon-only, SC 1.4.1 and text-alternative expectations).

**Scores.** A 3,3,4,3,4,3 = 3.30; B 5,5,5,4,4,4 = 4.70; B arithmetic (125+125+100+60+40+20)/100.

**Selected B**; list summaries use one wording in both apps: "{n} of your messages were not sent" and "{n} unread" (failed messages are only visible to their sender, so "your" is accurate for a clinician too). The failed row border is one width in both apps (resolves 2 px versus 1 px). The clinician "Trying to send again" toast is removed (duplicates the row's "Retrying"; the live region lives on the row). Count badges for nav are family 14.

### 3.9 Session outcome and check-in review, kept for the progress screens (CD-240)

`ExerciseSessionStatus`: in_progress, paused, completed, abandoned, stopped_discomfort. Contract progress sessions list only completed, stopped_discomfort, abandoned.

| Enum | Label (both apps) | Form |
|---|---|---|
| completed | Completed | plain text |
| in_progress | In progress | plain text |
| paused | Paused | plain text |
| abandoned | Not finished | plain text (replaces "Ended without finishing") |
| stopped_discomfort | Stopped for discomfort | `StatusChip` warning (a clinical signal, existing) |
`SessionActivityStatus`: pending, completed, skipped (patient list words Done, Skipped, current stay; staff word "Skipped" with its reason).

## 4. CD-239: one source of truth for labels

**Alternatives.** A: per-app maps (today). B: one module in `@carepath/shared` exporting typed label and tone maps keyed by the contract enums, with exhaustive `Record<Enum, ...>` types and perspective as a parameter. C: server returns display strings.

**Gates.** C fails the "no UI strings from the server for enums" convention stated in `appointments.tsx` ("the API enum never reaches the screen") and complicates translation; A is the cause of the mismatches.

**Scores.** A 2,3,2,3,5,5 = 2.85; B 5,4,5,4,4,3 = 4.40; C 3,3,3,3,3,2 = 2.95. B arithmetic (125+100+100+60+40+15)/100 = 4.40.

**Selected B.** Exhaustive records make a new enum value a compile error. Shared tests: every enum value has a label and tone; the same enum has the same label across audiences except the documented pronoun swap. Components (`StatusTag`, `StatusChip`) stay presentation-only in `packages/ui`.

## 5. Cross-app wording fixes (usage matrix section C, and what changes)

| Mismatch | Fix |
|---|---|
| "Current" / "Current version" / "(current)" | "Current" Tag; plain text "Version n, current" |
| No-show: "Did not attend" / "Missed" | "Did not attend" / "You did not attend" |
| "Cancelled by the patient" / "Cancelled by you" | Keep as perspective pair (documented rule) |
| "Video follow-up" / "Follow-up by video" | "Video follow-up" |
| "Ended without finishing" / "Not finished" | "Not finished" |
| "n messages not sent" / "n of your messages were not sent" | "{n} of your messages were not sent" |
| Intake: "Intake incomplete" vs "Missing: intake not started" | Patient status Tag plus intake words Not started, In progress, Submitted, Reviewed |
| Review task chip (queue) vs Tag (timeline) | Tag everywhere; Open shown as plain text |
| Appointment chip / tag / text | Tag for exceptions and live states, plain text for expected, in both apps |
| Pain rendered three ways | `ObservationValue` (CD-220) |
| AI feature names (automated drafting tools / generated) | "AI-assisted drafting" (consent) and "AI-generated" (labels) |
| Unused priority | Server `priorityLevel`, Tag for high only (CD-235) |

## 6. Spec for the shared status components (brief section 21)

- `StatusTag` (administrative) and `StatusChip` (attention or live): props are a `tone`, a `label` string and, for the chip, an `icon`; no enum knowledge, no onClick. Anatomy: outlined text (Tag) or tint, icon, text (chip). States: default only (non-interactive); long content wraps in cards and truncates never in cells (24 character budget); forced-colours mode keeps the border. Screen reader: reads the label as text; where the indicator is hidden by the absence rule, an `sr-only` word is present. Keyboard: not focusable. Testing: one story per enum value from the shared map, axe, 4.5:1 text contrast in each tone for light theme and the patient theme, and a test that no status label contains title case words beyond the first.
- Data dependencies: the enums above; priority needs `priorityLevel`; AI states need an AI contract that does not exist yet; clinical notes need a notes contract.
- Permissions: patients never see clinician-only statuses (review task, priority, AI review decisions, note status).
- Loading, error: a status that cannot be loaded shows "Status unavailable" as text beside a retry, not an empty cell.
