# CarePath microcopy guidelines

Status: provisional until advisor sign-off. Source: `docs/COMPONENT-BRIEF.md` section 18 (and 8, 13, 14, 22), `docs/design/component-usage-matrix.md` (sections C, F, G), `docs/design/component-research/13-messaging.md`, `14-navigation.md`, `16-overlays.md`, `17-light-families.md`, `docs/design/typography-exploration.md`, `packages/shared/src/copy.ts`, and the existing formatters in `apps/web/app/(clinician)/_lib/format.ts` and `(patient)/_lib/format.ts`. Written 2026-11-20. Rules are design decisions, not measured results; no copy has been tested with users.

Project rules that apply to every string: plain sentences, no exclamation marks, no placeholder text, never colour alone for meaning, every app shell shows "Demonstration product. Synthetic data. Not for clinical use." (`CLAUDE.md`).

## 1. Principles

1. Say what happened or what will happen, to whom, and what to do next. One idea per sentence.
2. Write for the reader. Patients get plain language at about a grade 6 to 8 reading level [Judgement, not measured]; clinicians get precise professional terms they already use. The same fact may be worded differently in the two apps, never contradictorily (section 6).
3. Every piece of text must earn its place. If removing it loses nothing, remove it (brief section 18).
4. Never hide essential information in a tooltip, a placeholder or an icon.
5. Do not diagnose, predict or reassure about health. The app reports what the patient entered and what the care team set. Terms in `BANNED_DIAGNOSTIC_TERMS` (diagnosis, diagnosed, "you have", "you may have", injury, tear, sprain, "condition is", "treatment for") stay out of patient-facing generated or fixed copy; the check runs on the onboarding review step and the pain notice today and is a good manual check elsewhere.
6. Do not promise availability. Never write "anytime", "24/7", "live", "online now", or a reply time the clinic did not set.
7. Use the same word for the same thing everywhere (section 6 is the canonical list).

## 2. Voice and grammar

- Sentence case for titles, headings, buttons, labels and tabs. Proper nouns and "CarePath" keep their capitals.
- Patient app: second person ("your care team", "your visit"). Clinician and admin apps: neutral third person or direct imperative for actions ("Mark reviewed"); say "the patient" or the name, never "you" for the patient.
- Present tense, active voice. "Your visit is cancelled", not "Your visit has been successfully cancelled".
- No "please", no apologies for ordinary validation, no "oops", no exclamation marks, no emoji, no humour in errors or clinical content.
- Short sentences; no more than 20 words for patient text where possible. Use "do not" in formal warnings and "don't" nowhere in clinical or consent text; contractions are acceptable elsewhere in patient text but the existing copy mostly avoids them, so keep that style.
- Numbers: digits for all counts in UI ("3 exercises"); pluralise correctly ("1 visit", "2 visits"); say "of" for scores ("7 of 10").

## 3. Element-by-element rules

### 3.1 Page titles and headings

- Browser title: "{Page} | CarePath"; inside a patient record "{Patient name} | {Section} | CarePath" so the tab title always names the patient (CD-503). Never include message text, diagnoses or free-text patient content in a title or URL.
- Page `h1` names the place or object: "Today", "Messages", "Review queue", "Patients", "Care plan for {name}". Not a sentence of marketing ("Welcome back").
- Section `h2` names the content: "Visits today", "Check-ins not yet reviewed". Counts go in a separate element ("5") not in the heading string, and only when the number equals the list length.
- Dialog titles are the action as a question ("Cancel this visit?") or the object ("Intake for Jane Doe").
- Do not repeat the page title as the first heading of a card inside it.

### 3.2 Labels and field text

- Labels are visible, specific, and name what the user types: "Message to your care team", "Why are you cancelling". The requirement word is separate: "required" or "optional" (the `requirement` prop), never "(optional)" typed into the label.
- The "why we ask" line follows clinical or personal fields in patient forms and says why and who sees it ("Your care team sees this. The time opens up for other patients.").
- Group questions with a legend that is a complete question.

### 3.3 Placeholders

- Placeholders are not labels, not instructions and not format hints. Prefer no placeholder. A format or example goes in helper text ("For example, 3 sets of 10").
- The text "Press / to search" is helper text under the search label, not a placeholder.

### 3.4 Helper text

- One short sentence under the label, above the field. States format, unit, limit or consequence. Does not repeat the label.
- Character limits appear only near the limit: "120 characters left." The 2000-character message limit and 500 and 1000-character notes are announced politely at thresholds.

### 3.5 Buttons and links

- Name the specific outcome: "Publish version 3", "Reschedule visit", "Send check-in", "Send message", "Save draft", "Mark reviewed", "Request review". Avoid "Submit", "OK", "Yes", "Continue" or "Confirm" alone unless the behaviour is only moving on and the page says what comes next.
- Match the label to behaviour: "Save and continue" if data is saved, "Continue" if not (GOV.UK button guidance, S1 in `17-light-families.md`).
- Dismiss labels: "Keep {thing}" when the dialog is about cancelling or removing it; "Cancel" otherwise; "Close" for read-only overlays.
- Loading labels are the progressive verb: "Sending", "Cancelling", "Saving", "Loading". Show-more controls read "Show more {things}".
- Link text names the destination ("Open the patient record", "All patients"). Never "click here" or "read more" alone. Back links name the parent ("All patients", "Back to Today").
- Repeated buttons in a list get a longer accessible name that includes the item ("Cancel visit on Nov 20 at 9:00 AM") while the visible word stays short.

### 3.6 Validation and error messages

- State what is wrong and how to fix it, positively. Match the field's wording. Same text in the field and in any error summary. Keep the user's input. (GOV.UK error message guidance, S3.)
- Pattern: required field "Enter {what}" or "Write a short note about what you decided."; wrong format "Enter a date as month, day and year, for example 03 14 1984"; too long "Messages can be up to 2,000 characters."; business rule "Choose a time in the future."
- Errors that are not the user's input (server, network, permission) are not field errors. They use a Banner that says what happened, whether anything was saved, and one next step: "Your visit was not cancelled and is still booked. Check your connection and try again."
- Never blame ("You entered an invalid value"). Never "Invalid", "Error occurred", "Something went wrong" alone.
- Every error has the visually hidden prefix "Error:" in field errors.

### 3.7 Tooltips and popovers

- Tooltips are supplementary only and appear on icon-only controls that already have an accessible name. They never hold information the user needs, never hold links, and are not used on touch.
- Popovers are for a short optional explanation (under 40 words) reached from a visible text control.
- Patient-facing explanations ("why we ask") stay inline.

### 3.8 Empty states

Structure: what is empty, why, what fills it, one action if there is one. Examples:

- "No messages yet. Write the first one below."
- "No visits today. Nothing is booked with you." (clinician)
- "Nothing needs your attention. Checked at 9:02 AM." (clinician)
- Filtered empty: "No patients match these filters." with "Clear filters".
- Never imply good news from absence of data. Where data may be missing say "Not recorded" or "Not collected in CarePath" (J, `J-patient-record.md`), not "None" or "0".

### 3.9 Confirmations and results

- Confirm dialogs: title restates the action as a question; one or two sentences give the consequence; the confirming button repeats the verb; the safe button comes first. Example for cancel visit: title "Cancel this visit?", body "Your care team sees your reason. The time opens up for other patients.", buttons "Keep this visit", "Cancel visit".
- Say when something cannot be undone: "This is saved with your name and the time and cannot be changed." (resolve a task, publish a version). Do not say "Are you sure?".
- Results appear only after the server confirms: "Your visit is cancelled", "Version 3 is published", "Your message was sent". While waiting: "Cancelling", "Sending".
- Success headings are consistent so meaning does not rely on colour: "Saved", "Sent", "Done".
- Persistent state lines use time: "Draft saved at 9:02 AM." "Not saved: {reason}." with a retry action.

### 3.10 Icons and visual text

- An icon never replaces a word for status or navigation (section 3.11 of this guide and `17-light-families.md` section 10). Icon-only controls are limited to close, dismiss and move up or down, each with an accessible name.
- No icon beside every heading. No sparkle or AI icon.
- Status always has words: "Sent", "Not sent", "Reviewed", "Not yet reviewed".

## 4. Clinical terminology: clinicians versus patients

| Concept | Clinician and admin wording | Patient wording | Rule |
|---|---|---|---|
| Pain value | "Pain 7 of 10 (patient-reported)" | "pain of 7 out of 10" in sentences, "7 of 10" in lists | Always label as patient-reported in staff views; never relabel as a clinician assessment; never convert to mild, moderate or severe in the clinician app. The patient scale may show the end labels "0 No pain" and "10 Worst pain" and a words line describing the position, which is not a diagnosis (`components.md`). |
| Check-in | "Check-in" | "Check-in" | Same word. |
| Session | "Session" (one performance of the plan) | "Session" | Same. "Workout" is not used. |
| Stopped session | "Stopped for discomfort" | "Stopped for discomfort" | Same words (see section 6). |
| Care plan | "Care plan", "Version n" | "Your care plan", "Version n" | Same nouns. |
| Visit | "Visit" in lists, "appointment" in field names | "Visit" | Choose "visit" for the event in prose; "Appointments" stays the nav label. |
| Care team | "Care team" | "Your care team" | Same. |
| Review task | "Review task" | not shown | Rule-generated; never "alert" or "risk". |
| Priority and order | "Order: rule priority, then oldest. Set by clinic rules, not a measure of medical risk." | not shown | Do not imply clinical severity (L). |
| AI features | "Generated, not reviewed" (design system label, `AIDraftBlock`) | "Automated drafting tools" (consent) | One name decided in the AI family before screens are built (section 6). Until then neither app uses "AI-powered", "smart" or "assistant". |
| Abbreviations | Allowed only where clinicians use them daily and the first use on a page is spelled out: "PT" is spelled "physical therapist" in headings; "MRN" is allowed in the record header and written as "MRN" in mono. | None. Spell out. | Do not use "ROM", "NPRS", "HEP" or similar in either app without a visible expansion. |
| Instruments | Use the exact wording and scoring of an established instrument when one is used; never reword it. | Same wording as the instrument. | Do not invent scales. |

Medical statements about what is wrong with a patient are never generated by the interface. The interface says what was reported or set ("You reported pain of 7 out of 10").

## 5. Dates, times, numbers and units

Existing helpers already follow most of this; the rules below fix the differences between apps.

- Dates in text: abbreviated month, day, year when the year matters: "Nov 18, 2026". Without year for recent items in lists: "Nov 18". Long form for headings and patient prose: "Thursday, Nov 19" and "Thursday, November 19" (patient `long` style). Never numeric-only dates such as 11/18/26, because they are ambiguous.
- Birth date: "Born Mar 4, 1984" in the record header. Age is not displayed unless a screen needs it; if shown, calculate from the date and write "42 years".
- Date entry (birth date, schedule): format hint in helper text; a visible example; error "Enter a date as month, day and year." Pickers and native inputs are decided in the clinical-inputs and scheduling families.
- Times: 12-hour with AM or PM, no leading zero: "9:01 AM". Clinician and patient lists show the time of an instant in the clinic's time zone (existing). Both apps add the zone only where it can be misread: the first visit time on a page, a visit time near a day boundary, and anywhere the user and the clinic could be in different zones: "9:00 AM Mountain Time" for patients, "9:00 AM MT" for clinicians (`tzAbbreviation`).
- Time zone convention across apps: clinic zone everywhere, labelled. The admin patients table currently shows "Registered (UTC)"; use the clinic zone with the same label rule, or show the full date without a time (a registration date needs no time). Stored values remain UTC.
- Relative time ("5 h", "3 d", "n h old") only in compact columns and always with the absolute time available in the detail ("Nov 18, 9:01 AM"). Words in prose: "3 hours", "2 days" (clinician `formatAgeHours`). Column label "In queue" for age in the queue (L).
- Updated stamps: "Updated 9:12 AM" or "Record as of 9:12 AM", the time in the clinic zone.
- Durations: "45 seconds", "2 minutes 30 seconds" in prose; "00:45" only in a running timer.
- Numbers: tabular figures; thousands separator from 1,000; no trailing zeros; counts are integers.
- Units: always visible beside the value, spelled out for patients ("seconds", "repetitions") and abbreviated for clinicians only where the unit is standard and unambiguous. Dose text follows `doseText`: "3 sets of 10 repetitions, hold 5 seconds, rest 30 seconds". Raw field keys such as `holdSeconds` never appear in the UI (plan diff, section 6).
- Weekdays: Monday first for patients; abbreviations (Mon, Tue) in staff schedule text ("Mon, Wed, Fri, once a day").
- Phone numbers: as stored, as a `tel:` link in patient help; never truncated.

## 6. Wording mismatches found in the code, with the chosen wording

Source: `docs/design/component-usage-matrix.md`. "Chosen" is a design decision for the next implementation step; the code is unchanged.

| Matrix | Mismatch | Chosen wording and rule |
|---|---|---|
| C1 | Intake status: clinician "Intake incomplete", admin "Missing: intake not started" and variants | One shared map for clinician and admin. Patient status words: Active, Inactive, Discharged, Intake incomplete, Awaiting assignment. Admin intake column: "Not started", "Started, not submitted", "Submitted", "Submitted and reviewed" (no "Missing:" prefix; the column header names the subject). Definitions are shown in a "What these mean" disclosure on the directory: Intake incomplete = the patient has not submitted intake; Awaiting assignment = intake submitted, no therapist assigned; Active = a therapist is assigned and the patient is in care; Inactive = care is paused; Discharged = care has ended. [Draft definitions inferred from the status transitions in `domain-model.md`; to be confirmed with the product owner before use.] Do not use "Active" without that definition available. |
| C1 | Admin action cell "Waiting for the patient to finish intake" | Keep, in the same sentence form for both apps. |
| C2 | Plan version: "Current", "Current version", "(current)" | "Current" as the status word on a version row; "Current version" as the heading of the version that the patient sees; never "(current)" in parentheses. The patient history reads "Version 3, current". Builder header: "Patient sees version 3 (published Nov 3)" (K). |
| C2 | Plan states mix chip and tag | Wording only here: Draft, Published, Superseded (earlier versions), "Draft differs from version N" (K). Chip or tag form is decided in the status vocabulary family. |
| C3 | No-show: clinician "Did not attend", patient "Missed" | "Did not attend" in clinician and admin, "Missed" in the patient app. Reason: the patient app uses plain language, the staff app uses the record term; both map to one `no_show` and are listed together in the glossary. |
| C3 | Patient cancellation: clinician "Cancelled by the patient", patient "Cancelled by you" | Keep: each app says it from its own point of view; clinician "Cancelled by the patient". |
| C3 | Video visits: "Video follow-up" versus "Follow-up by video" | "Follow-up by video" in both apps (noun first reads naturally in lists and in patient prose). |
| C3 | Booked is hidden in the clinician tag and sr-only in tables | "Booked" is the default and is not shown as a visible tag; screen-reader text "Booked" remains. |
| C4 | Review task: "Open" hidden in lists, listed in the timeline | "Open" is stated wherever status appears as text; lists may omit it only when the list header says "Open and in review". |
| C4 | Priority never shown | Do not show a number or severity word. Add the fixed line "Order: rule priority, then oldest. Set by clinic rules, not a measure of medical risk." |
| C5 | "Ended without finishing" (clinician) versus "Not finished" (patient) | "Not finished" in both. |
| C5 | Session item words "Done / Skipped / current" | Keep in patient session list. Staff table shows Completed, In progress, Paused, Not finished, Stopped for discomfort. |
| C6 | "Try again" versus "Retry sending"; "n of your messages were not sent" versus "n messages not sent"; toast "Trying to send again" | "Retry sending"; "2 messages not sent"; no toast. See `13-messaging.md` (CD-512). |
| C7 | Pain rendered as "Pain n of 10 (patient-reported)" in three ways | One function renders "Pain {n} of 10 (patient-reported)" for staff and "{n} of 10" for patient lists; `overview.tsx` calls it instead of repeating the string. |
| C8 | AI feature named "automated drafting tools" (consent) and "generated" (design system) | Decide one name with the AI family before any AI screen exists. Rule until then: do not call a rule-based provider "AI" or "model"; consent copy remains as approved. |
| G3 | UTC in admin, clinic zone elsewhere | Section 5. |
| G10 | "Set by your care team." read by clinicians in `PlanView` | Clinician view reads "Set by the care team." or omits it; patient view keeps "Set by your care team." The serializer sentence is not reused verbatim across audiences. |
| A3 | Raw field keys in clinician plan diffs (`holdSeconds`) | Use the patient wording map ("hold time", "repetitions") in all diffs through the single `DiffList`. |
| A3 | "Cancel visit" opener, confirm and "Keep this visit" | Keep; see `16-overlays.md` (CD-521). |
| A3 | "Load more tasks", "Show more visits", "Show later days" | "Show more {things}"; "Show earlier messages" at thread top. |
| F | Disabled controls without reason: move up or down, send, previous or next | Do not disable send (message validated on submit); move buttons at the ends are hidden or described by the list position text ("Exercise 1 of 4"); page buttons show the range text. |
| E | Toast-only success or errors | Errors in a Banner in context with what was kept; toasts only for non-critical page-level notes. See `16-overlays.md` (CD-528). |
| Messaging | Emergency copy | `EMERGENCY_NOTICE` is fixed and not reworded. Added copy (urgent route) is separate and approved by the advisor. |

## 7. Messaging copy (summary of `13-messaging.md`)

- Composer label "Message to your care team" (patient), "Message to {patient name}" (staff).
- Reply time exactly as the clinic set it; nothing if unset.
- After send (patient): "Sent. Your care team usually replies within one business day. For anything urgent, call the clinic." Without a clinic reply time: "Sent. For anything urgent, call the clinic."
- Failed: "Not sent. {reason} Your message is saved here." Retry: "Retry sending", loading "Retrying". Still failing: "That message still did not send. It is saved here. Try again in a moment, or call the clinic if it is urgent."
- Empty field on send: "Write a message first." Over limit: "Messages can be up to 2,000 characters."
- Urgent line: "For something urgent that is not an emergency, call {phone}." or "Urgent? Contact your clinic." linking to the contact card.
- Starting points are neutral openers: "A question about my exercises", "A question about my appointment", "Something about how I feel". They only insert editable text.

## 8. Navigation and overlay copy

- Destinations: patient Today, Progress, Appointments, Messages; clinician Overview, Patients, Review queue, Schedule, Messages; admin Patients. One word where possible (Apple HIG tab bar guidance, D5 in `14-navigation.md`).
- Count accessible names carry the unit: "Messages, 2 unread", "Review queue, 4 open".
- Skip link text: "Skip to main content".
- Discard row in an overlay: "Discard your note?" with "Keep editing" and "Discard note". Leave guard: "Leave without saving?", "Your last edits were not saved.", "Stay on this page", "Leave page".

## 9. Icon rules (summary)

Icons from the single in-house set, stroke and grid fixed; icon plus words for status and navigation; icon-only controls only for close, dismiss, move up and down with an accessible name; no decorative heading icons; no sparkle or AI glyph (`17-light-families.md` section 10).

## 10. Review checklist for any new string

1. Does it say what happened, to whom and what to do next?
2. Is it in the reader's language level (patient or clinician)?
3. Does it use the canonical word from section 6?
4. Is any meaning carried only by colour, an icon, a placeholder or a tooltip?
5. Does it avoid the banned diagnostic terms and availability promises?
6. Are dates, times and units formatted as in section 5, with the zone where it can be misread?
7. Does a button name its outcome, and does a dismiss label match section 3.5?
8. Does a screen reader get the same information, including the hidden "Error:" prefix and unit-bearing names?
