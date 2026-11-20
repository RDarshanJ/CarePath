# CarePath UX Pattern Research (Mobbin)

Access date: 2026-11-19
Author: UX pattern researcher (agent)
Scope: the 20 patterns listed in the "Mobbin research" section of `docs/BRIEF.md`.

## 1. Method and access limits

What was retrieved
- Mobbin MCP (`search_flows`, `search_screens`) was reachable and returned results for iOS and web. Each result is a Mobbin-curated capture. I viewed the low-resolution inline preview frames the tool returns. For long flows the tool shows an evenly spaced sample (about 3 to 5 frames), not every screen. Observations below describe only frames I saw. Anything I could not see is stated as unseen.
- No images were downloaded or saved into the repo. Links point to Mobbin; image URLs expire after 30 days.
- Mobbin captures are of live apps at the time of capture, so details may differ in the current release.

Per-app access result

| App | Result |
|---|---|
| Zocdoc | Accessible (3 booking flows, iOS) |
| Headspace | Accessible (onboarding flow, iOS; result output was truncated after about 13 frames) |
| Oura | Accessible (onboarding, Oura Labs / Counsel setup, Health Radar, iOS) |
| Apple Health | Accessible (data sources and access, sharing, connect patient portal, iOS) |
| Fitbit / Google Health (Fitbit) | Accessible (onboarding, goal setting, push notification settings, profile, iOS) |
| WHOOP | Accessible (onboarding, first-week review, profile, iOS) |
| Flo | Accessible (Today, symptom logging, iOS) |
| Nike Training Club | Accessible (workout detail "whiteboard" flow, iOS). Only one flow sampled; no in-session player frames seen |
| Strava | Accessible (Statistics, profile, iOS) |
| Calm | Accessible but thin: I saw only a sleep promo, paywall, "how did you hear about Calm" survey and home. Nothing health-relevant beyond those, so Calm contributes little here |
| One Medical | NOT accessible via Mobbin. `search_flows` for "One Medical onboarding account creation" returned an unrelated fintech app ("One"); a second query ("One Medical app booking appointment") returned zero flows. Fallback: official page https://www.onemedical.com/same-day/ (WebFetch). It lists same/next-day booking, messaging, prescription renewal and video care in text only; it describes no screens. No One Medical interface was inspected. |
| MyChart | NOT accessible via Mobbin. A flow search returned Ro/Hers messaging; a screen search for "MyChart patient portal" returned Ro, Apple Health and Hims screens, none from MyChart. Fallback: official-text only, from https://www.uchicagomedicine.org/patients-visitors/patient-information/mychart (WebFetch; lists appointments, messaging, visit notes, refills, results, imaging, billing). A Johns Hopkins MyChart page failed to load. No MyChart interface was inspected. |

Healthcare and enterprise stand-ins (not on the brief's list, found through Mobbin)
- Patient/consumer health: CVS Health, Ro, Hers, Hims, Noom, Bevel, Cal AI.
- Enterprise web (clinician-desktop analogues): Stripe, Square, Browserbase, Givingli, Productboard, incident.io, Searchable, Spellbook, Wix, Calendly, Klaviyo. None of these is a healthcare product. Mobbin web searches for healthcare-specific desktop tables, schedules and queues returned only these non-health products, so clinician-desktop implications below are transfers from other domains and are labelled as such.

Known gaps
- No rehab or physiotherapy product was found (no 0 to 10 pain scale, body map, or exercise-form feedback captures). Pain logging is inferred from Flo's symptom logging.
- No accessibility audit was done on any reference. Observations about contrast, target size etc. are visual impressions from small previews only, not measurements.
- Do not copy these interfaces. Each "implication" is a behavior to adapt, not a layout to reproduce.

---

## 2. Patterns

Format per pattern: Reference, Observed, Strengths, Limitations, CarePath implication (P = patient mobile, C = clinician desktop).

### 1. Account creation and authentication
Reference
- Headspace Onboarding: https://mobbin.com/flows/31b21791-dec6-448a-8253-648f5ebbba3e
- Oura Onboarding: https://mobbin.com/flows/2daad675-0e15-482d-87fb-0c59ec00e946
- WHOOP Onboarding: https://mobbin.com/flows/db2b1d13-f44b-4edf-8fae-0b642b7a98e1
- Fitbit Onboarding: https://mobbin.com/flows/83080a39-a578-4767-b12e-f799ef73ce72

Observed
- Headspace: a single form (first name, last name, email, password with "8+ characters" in the label), a "Log in" link top right, "Continue with SSO", then Apple/Facebook/Google icons. Terms/Privacy agreement is a line under the form. Validated fields show a green check; a bad password field turns red with an alert icon and a show/hide eye toggle.
- Oura: a "Create an Oura account" screen that shows the pre-filled email and asks "please confirm it's correct" with a single Continue.
- WHOOP: one question per screen. Enter password screen has a "Forgot password?" link; name screen asks first name, last name and username; the next control is a circular arrow button.
- Fitbit: "Looks like you're new to Fitbit" detects that a Google account has no Fitbit profile and offers "Sign in with existing Fitbit account" or "Continue as a new user" or Cancel.

Strengths: email confirmation avoids typo accounts (Oura); detecting an existing identity prevents duplicate accounts (Fitbit); inline success/error on each field (Headspace); one question per screen reduces load (WHOOP).
Limitations: Headspace's password rule is visible only as a label hint (rules are not listed as a checklist); social-login icons carry no text labels in the capture; none of these shows MFA, session timeout or lockout, which a clinical product needs; none shows role selection.

CarePath
- P: email + password with an explicit rule list, show/hide toggle, and a confirm-your-email step. Offer "I already have an account" detection. Add a visible MFA step (TOTP or email code) because data is PHI-like even if synthetic.
- C: role is assigned by the organization, not self-selected; clinicians sign in via SSO/OAuth against a seeded identity. Show session timeout warnings and an explicit "signed in as clinician, [org]" indicator.
- Label all accounts as synthetic demo data (brief requirement).

### 2. Progressive onboarding
Reference
- Headspace Onboarding (above): "What's on your mind?" multi-select, "What's your mindfulness style?", recommended course with a "Why this recommendation" section (focus, activity, experience), then reminders and a trial explainer.
- WHOOP First week review: https://mobbin.com/flows/4d1934ee-6912-4e37-a5e7-4fa709072db6 and the Calibration Timeline (progress bars such as "Log 14 sleeps to unlock" for VO2 Max and "Log 21 sleeps" for Healthspan).
- Fitbit Onboarding (profile info: weight, height, sex with a reason: "used to calculate metrics like calories burned"; research consent).
- One (fintech, non-health) "Setup bonus" checklist: https://mobbin.com/flows/95ecca48-bbd2-42ad-b148-0720b1b61cf7 (3 of 4 steps complete, 15 days left).

Observed: onboarding asks a goal first, then explains why a recommendation was made, then asks for notification/health permissions at the point of use (Headspace reminders and Health Kit toggles on one screen, with Health Kit off by default). WHOOP defers value features behind a visible unlock progress.
Strengths: short, skippable ("Maybe later" appears on the Headspace course card); recommendation transparency; unlock progress sets expectations.
Limitations: Headspace puts a 14-day trial screen in onboarding, which is commercial pressure CarePath should not have; WHOOP's unlock mechanic is gamified and could pressure patients; One's checklist uses a deadline-bonus mechanic.

CarePath
- P: 4 steps max before reaching Today: confirm identity, pick the care plan or accept the one the clinician assigned, set reminder time, review privacy. Everything else is asked in context later. Show "why we ask" next to any clinical field (Fitbit pattern).
- P: if a clinician has already assigned a plan, onboarding should land on it rather than asking generic goals.
- C: onboarding is a short checklist (availability, clinic, templates), resumable, no deadlines.

### 3. Medical questionnaires
Reference
- CVS Health "Answering symptom questions": https://mobbin.com/flows/992c0a32-7a1e-41dc-8ec8-f9000f860b38
- Hers "Complete treatment questionnaires": https://mobbin.com/flows/60448996-a8dd-4632-9b46-4ab745af1a4e

Observed
- CVS: a "Visit checklist" with a 50% completion ring and rows labelled "Action Needed" or "Completed" (Payment & insurance, Symptom questions, Check in, Consents & privacy, Depression Screening); "Check in" shows a future availability date. The symptom screen is titled "Symptoms 3 of 4", states "More questions will appear based on your responses. All fields required", and uses a yes/no choice then chip multi-select.
- Hers: a top segmented progress bar, option cards with a title plus a one-line description (for example Good/Fair/Poor with descriptions), a free-text "anything else you want your provider to know?" with an explicit "I have nothing to add" checkbox, a staged "Loading your results" with three check steps, and a required-field error under a field.

Strengths: checklist gives a resumable overview and distinguishes status clearly; described options reduce ambiguity; the explicit "nothing to add" checkbox avoids blank-versus-skipped ambiguity; branching is announced.
Limitations: "All fields required" with no "prefer not to answer" in the CVS frame I saw; progress shown as a percentage ring is not meaningful when branching changes the length; neither frame shows save-and-resume messaging.

CarePath
- P: pre-visit intake and weekly check-in as a checklist of short forms, each with step X of Y, a visible "Prefer not to answer", and autosave with "Saved" feedback. Use described options for pain/function scales.
- C: show the patient's answers inside the encounter view with changes since last time highlighted; unanswered vs declined must be distinguishable.

### 4. Consent and permissions
Reference
- Oura Labs / Counsel setup: https://mobbin.com/flows/7f4740ce-2c8e-4e70-843a-ef1c45f107ce
- Apple Health Sharing: https://mobbin.com/flows/00d9fca9-9ce6-4ba4-8a91-e3141ce6e29d and Data sources & access: https://mobbin.com/flows/e19317bd-987a-4ace-bd7d-42048e3786b1
- Fitbit research consent (frame in Fitbit Onboarding flow above)
- Bevel "Allow access to Health": https://mobbin.com/screens/0563bc9d-da45-41fb-b491-91228e338fac
- Cal AI "Manage Apple Health": https://mobbin.com/screens/2bcefec4-6036-44fb-8862-7f7bcd383f3e

Observed
- Oura/Counsel: one screen separates an OPTIONAL toggle ("Allow Counsel to share my health information to Oura", defaulted off, with a note that data may no longer be subject to HIPAA once shared and that consent can be withdrawn in Settings > Data sharing) from a REQUIRED toggle ("Review and agree to Counsel's policies") with links. Labels say OPTIONAL and REQUIRED in caps. A "What Counsel sends to Oura" button gives detail. The AI chat screen states messages are informational, advises a physician for medical advice and 911 for emergencies.
- Apple Health: Sharing explains "You're in Control", "Private and Secure" (only a summary of each topic is shared, you can stop at any time), with "Share with Someone" and "Ask Someone to Share"; a "Share with your doctor" row; per-data-type "Apps Allowed to Read Data" with an empty "None" state.
- Fitbit: research consent is stated as "completely optional" with equal "No thanks" and "Agree & continue" buttons; the summary says what data and gives an example of use.
- Bevel / Cal AI: a pre-prompt explains why Health access is needed before the system dialog; Cal AI shows step-by-step instructions for changing it later in iOS Settings.

Strengths: required vs optional is unmistakable; revocation location is stated at grant time; sharing is per topic and summary-level; pre-prompts explain purpose; recovery path after denial.
Limitations: long legal text sits behind links (Oura); the Counsel frame I saw has both toggles off with a single "I'm ready" button, so it is unclear what happens if the required toggle is off (I did not see that state); Apple's per-topic model is granular but spreads controls across many screens.

CarePath
- P: a "Sharing and consent" screen with named recipients (care team, clinic) and per-category rows, each with on/off, last changed, and "who can see this". Separate required terms from optional sharing, using the caps-label pattern. Every grant shows where to revoke. Log consent changes to the audit log.
- C: show the clinician what the patient has consented to share, and block or flag actions outside consent. Never imply that these controls make CarePath HIPAA compliant (brief constraint).

### 5. Goal setting
Reference
- Fitbit "Setting a goal": https://mobbin.com/flows/2846108f-289a-4e9a-906a-d99629174ed9
- Cal AI Personal Details (goal weight, daily step goal): https://mobbin.com/screens/674ef9c2-3540-4d3d-a52a-3bf589c63d13
- Headspace reminder time picker (in the onboarding flow above)

Observed: Fitbit's goal screen is a single large number ("5 days per week") with minus and plus buttons and Next; the weekly view shows seven day circles with "0 of 6 mindful days" and Week/Month/Year tabs. (The goal in one frame was 5 and the target in another was 6; I cannot tell whether these are different sessions, so I draw no conclusion from that.) Cal AI lists goals as editable rows with a "Change Goal" button.
Strengths: one decision per screen; stepper avoids typing; plain-language unit.
Limitations: goals here are self-set with no clinical bounds or guidance; no explanation of what a good target is.

CarePath
- P: goals are mostly clinician-prescribed (sessions per week, range-of-motion target). Patients can adjust only within clinician-set limits and see "Your therapist set this" with a request-change action.
- C: goal editor on the care plan with a safe range and a rationale field; changes are versioned.

### 6. Daily home dashboards
Reference
- Flo Today: https://mobbin.com/flows/7cb82647-5822-4c81-bbc6-9fae6a7b5ce3
- Headspace Today (final frame of onboarding flow), Fitbit Today (no-data state, Onboarding flow), Apple Health Summary (https://mobbin.com/screens/4e9ba466-1bb7-442d-adaa-ce7052ddb12f is the connect-portal screen; Summary frames appear in the Apple Health flows above), One Home (https://mobbin.com/flows/95ecca48-bbd2-42ad-b148-0720b1b61cf7).

Observed
- Flo: a week strip with a selected day, one hero statement ("Period in 4 days"), three quick-action buttons (Log period, Symptoms, Sex), then horizontally scrolling insight cards, then history and patterns. Bottom tabs: Today, Insights, Secret Chats, Messages, Partner.
- Headspace Today: a greeting, a dismissible promo card, then "Start your day" as a vertical timeline.
- Fitbit Today: a hero ring with "No data", three small metric rings (Steps, Zone Min, Mindful days), then a Recovery section. Three tabs.
- Apple Health Summary: user-pinned topic cards with an Edit action.
- One: a top balance card, a setup checklist, then "Discover more" cards.

Strengths: one hero answer plus one primary action; quick actions for the most frequent log; pinning (Apple) lets users choose.
Limitations: Flo and Headspace mix promotional/content cards with the core task, which dilutes it; Fitbit's hero is empty for new users.

CarePath
- P: Today shows (1) next step ("Do today's 3 exercises, about 12 min"), (2) a pain quick-log, (3) next appointment or unread message badge. No promotional content. Empty hero must still show a next action.
- C: a clinician "Today" with the day's appointments, flagged patients and AI drafts awaiting review, ordered by urgency (see patterns 14 to 18).

### 7. Guided activity experiences
Reference
- Nike Training Club workout detail (whiteboard): https://mobbin.com/flows/8650d3a2-61a3-411e-b703-d26841cb12e5
- Headspace session player (frame in Onboarding flow above)

Observed
- NTC: a workout page with duration/level, equipment ("Full Gym"), a format tag, a persistent "Start Workout" button and a music toggle. The body lists blocks (Power, Strength) with a "3x" repeat badge, each line as reps or time plus movement (for example "2x Broad Jump", "60s Rest"), and "View Drills" per block. An explainer ("What is a Whiteboard Workout?") and a three-tip preview page ("Preview before you start", "Prepare for each circuit", "Follow the circuit") sit behind info affordances.
- Headspace player: a large pause button, a live caption strip, a scrubber with elapsed/remaining time, a settings gear and a close button.

Strengths: the whole session is previewable before starting; a sticky start action; drills are optional detail; captions and a visible scrubber help hearing-impaired and impatient users.
Limitations: NTC's list format assumes a gym; I did not see in-session player frames, so rest/skip/stop behavior is unverified; no pain-stop affordance in either product.

CarePath
- P: exercise session = preview list (equipment, duration, "What you need") then a one-exercise-at-a-time view with a large Done, "Skip", "Too painful - stop" and a visible rest timer. Provide captions or text steps for every demo. The experimental camera feature (Phase 9) must not be required.
- C: plan builder shows the same preview the patient will see.

### 8. Pain and symptom logging
Reference
- Flo "Logging symptoms": https://mobbin.com/flows/22df520b-6764-4b62-833c-186ab412ac03
- Oura Health Radar (Symptom Radar): https://mobbin.com/flows/cac6a11f-9128-4bf3-b4ac-032e27574713

Observed
- Flo: a bottom sheet titled "Today / Cycle day 18" with a search field, grouped chip lists (activities, pills), per-item reminders, a sticky "Apply" button, a wheel picker for a measurement (temperature with a unit switch), counters for water, and a free-text "My notes" sheet with Clear and Done. Prior entries appear on the Today screen as "My symptom patterns", showing for example "You logged fatigue between your fertile window and next period, just like 53% of Flo users".
- Oura Health Radar: a status page ("Active and monitoring") listing monitors that are each switchable "On", with an info icon, and an explanation that notifications will surface in Today.

Strengths: chips make logging fast; the sticky Apply gives a single commit; units are switchable; pattern view rewards logging; free text is optional.
Limitations: no severity scale in the frames I saw; the "53% of users" comparison is a social benchmark that could mislead clinically; nothing shows how a logged symptom reaches a clinician.

CarePath
- P: a 10-second log: 0 to 10 pain slider/steppers with words at the anchors, location (body area chips), when (during/after exercise), optional note, and an explicit confirmation of "Your therapist will see this". Offer "Log" from Today and after each exercise.
- P: a red-flag path: high pain or listed symptoms shows "Contact your clinic" with phone/message actions and a non-diagnostic disclaimer (Oura Counsel style: informational, call 911 for emergencies).
- C: logs appear as a trend with the exercise they followed; threshold crossings create a queue item (pattern 16).

### 9. Progress visualization
Reference
- Strava Statistics: https://mobbin.com/flows/7b8fd308-aefc-4b41-ac63-3a3ecf8faa8c
- Flo cycle history and symptom patterns (Today flow above)
- Fitbit mindfulness weekly view (Setting a goal flow above)
- WHOOP First week review (flow above)

Observed
- Strava: a sport switcher (run/ride/swim) over three plain sections: Activity (average per week), Year-to-Date, All Time. Numbers are right-aligned in a label/value list; no chart in these frames.
- Flo: dotted timeline rows per cycle in colour-coded dots, with legends (Period, Fertile days, Ovulation) and a "within normal range" note.
- Fitbit: seven day circles for the week, tabs Week/Month/Year, and a count ("0 of 6 mindful days").
- WHOOP: a full-screen story review with a segmented progress indicator across the top.

Strengths: Strava's list is scannable and screen-reader friendly; Fitbit's day circles map directly to a weekly goal; time-range tabs are consistent.
Limitations: tables hide trends; Flo's dots rely on colour and a legend; WHOOP's story format is attractive but linear and time-consuming.

CarePath
- P: a weekly adherence strip (days completed vs prescribed), a pain-over-time line chart with a table alternative, and a plain sentence ("Pain is lower than 2 weeks ago"). Never colour-only; label points. Every chart has a data table toggle.
- C: the same data with the plan overlaid and annotations for plan changes. Do not use fabricated data in charts (brief).

### 10. Appointment booking
Reference
- Zocdoc "Booking an appointment": https://mobbin.com/flows/fcd6461e-af19-4ca9-9864-8b21c286888c
- Zocdoc "Making a doctor appointment": https://mobbin.com/flows/26c741b6-0231-4040-b5e9-890f0b6db100
- Zocdoc "Booking an appointment (appoinments)": https://mobbin.com/flows/229b867a-fa73-45d2-b632-3a11fcf3254b

Observed: a provider page with a new-patient checkbox, an office selector that notes "2 more locations with availability soon", an In person / Video visit switch, and time slots as pill buttons grouped by day with "View more availability". Dates with nothing show "No available appointments" text. The Review and book screen has a "Secure Booking" lock label, a patient selector ("Alex Smith / Someone else"), address, insurance (with a camera scan alternative and in-network messaging), visit reason, a phone number field, optional notes, a certification checkbox and a sticky "Book appointment". An inline error reads "A valid address is required to book with this doctor". The confirmation says "Appointment booked!" with "Add to calendar" and "Prepare for appointment" links, followed by cross-sell cards for other exams. The Appointments tab shows "Up next" with a map and "Book an appointment". After booking, the home screen prompts "Almost done! Next, upload a photo of your ID".

Strengths: slots visible before commitment; patient selector supports dependents; plain error reasons; post-booking next steps; confirmation includes calendar add.
Limitations: a long single review page; a certification checkbox is easy to tick without reading; cross-sell cards after confirmation distract; a day with no slots forces scrolling through empty days.

CarePath
- P: choose visit type, then slots (hide empty days or collapse them), then a short review. Prevent double booking server-side and show "That time was just taken - here are the nearest alternatives" (error recovery, pattern 19). Confirmation: date/time/time zone, location or video link, prep list, add to calendar, cancel/reschedule.
- C: booking must never allow overlapping reservations (Definition of done). Show conflicts at drop time.

### 11. Calendar management
Reference
- Zocdoc Appointments tab ("Up next", map, details link): https://mobbin.com/flows/26c741b6-0231-4040-b5e9-890f0b6db100
- Non-health desktop analogues: incident.io schedule https://mobbin.com/screens/1e54db01-76cb-45d1-9053-fc6599c5c9eb ; Calendly one-off meeting https://mobbin.com/screens/54e3901e-5c39-4569-b618-5426f3d4b9ab ; Klaviyo campaigns calendar https://mobbin.com/screens/6b3dd16e-7760-46c9-9f32-6d6852777fa0

Observed
- incident.io: a multi-week timeline with a "Today" button, prev/next arrows, a time-zone multi-select with popular zones, weekend columns shaded, a red marker for the current moment.
- Calendly: a week grid with a time zone selector, duration select, host list with working hours ("Weekdays, 8:30 am - 4:30 pm"), shaded unavailable cells with an "Unavailable" tag, and a "Next" with "Select times to share".
- Klaviyo: a week view with Today, a Week/Month selector, filter chips (Campaigns, Audience, Channels, Status, Tags) and event blocks with icons.

Strengths: unavailable time is visibly distinct; time zone is explicit; Today and arrows are standard; filters sit on the calendar.
Limitations: dense event titles truncate (Klaviyo); colour alone separates states in places; none is a clinic calendar (no room/equipment resources, no no-show state, no visit-type colouring).

CarePath
- P: Appointments list first (Up next, Past), with calendar export; a month view is optional.
- C: a day/week grid per clinician with working hours shaded, visit-type icons plus labels (not colour alone), a time-zone label, and drag-to-reschedule with a conflict check. Provide a keyboard alternative to drag.

### 12. Messaging
Reference
- Ro "Message detail": https://mobbin.com/flows/b30bd9c6-b668-4781-ab0a-9c609aab7b84
- Hers "Chatting with a medical care team": https://mobbin.com/flows/2ebf735e-fb93-4318-8edd-8d0bcd416626
- Oura Counsel medical chat (Oura Labs flow above)
- One Medical: official text only (https://www.onemedical.com/same-day/): messaging providers any time; no interface inspected.
- MyChart: official text only (UChicago page): messaging your doctor, no response time stated; no interface inspected.

Observed
- Ro: a Support tab with a "Messages" card showing a "No action needed" badge, thread title, sender and date, and "Show all message threads". A thread shows a message from a clinician, a banner "Need help now? Find quick answers in our Help Center", and "This conversation is closed. Still need help? Start a new conversation".
- Hers: a care-team thread with a clinician message, user bubbles in a different colour with a timestamp and delivery tick, a compose field "Write a message...", and the clinician's replies including links to find a primary care doctor.
- Oura Counsel: "Medical chat" with suggested prompts, "Add a doctor / will reply after 7pm", a footer disclaimer ("Messages from Counsel AI are informational... For emergencies, call 911").

Strengths: status badge tells whether action is needed; closed-thread state is explicit; response-time expectation is shown ("will reply after 7pm"); emergency disclaimer is persistent.
Limitations: closed conversations force a new thread, which fragments history; no attachment/photo frames seen in Ro/Hers; AI vs human sender distinction in Oura is only a label.

CarePath
- P: threads per care episode, a visible "Typical reply: within 1 business day" and an always-visible "Urgent? Call the clinic" line. Show who is replying and their role. Support photo attachment for wound/ROM questions with consent text.
- C: inbox sorted by waiting time, with templates, an AI draft-reply clearly marked and never auto-sent (pattern 18).

### 13. Patient profiles
Reference
- Google Health (Fitbit) profile: https://mobbin.com/screens/58936b59-fdb9-4cd5-8455-f34dbc6921ce
- Cal AI Personal Details: https://mobbin.com/screens/674ef9c2-3540-4d3d-a52a-3bf589c63d13
- WHOOP profile: https://mobbin.com/screens/78ac7a97-7006-4df0-9fb9-ee42f019bb62
- Apple Health connect patient portal: https://mobbin.com/screens/4e9ba466-1bb7-442d-adaa-ce7052ddb12f
- Ro visit summary: https://mobbin.com/screens/8b46ff22-294b-431a-8ec4-f24ab75eef37

Observed
- Google Health: a short purpose statement ("Your information informs your metrics..."), rows for Birthday (managed by the Google Account), Sex (Edit), Height (Edit), and an Account ID.
- Cal AI: rows with right-aligned values and pencil icons plus a "Change Goal" button.
- WHOOP: avatar, level, streak and "Achievements" tiles; gamified.
- Apple Health: a provider card with a "Connect Account" action to bring clinical records into Health.
- Ro: a "Your recent visit" note with the clinician's name and a "Message us" shortcut.

Strengths: each field states why it is collected or where it is managed; row-level edit; provider-authored visit note is attributed.
Limitations: these are consumer profiles, not clinical records (no problem list, allergies, medications or care team); WHOOP's gamification is inappropriate for rehab.

CarePath
- P: Profile has Identity, Contact, Emergency contact, Care team, Consents. Show "Managed by your clinic" on fields the patient cannot edit.
- C: a patient header that stays visible on every tab: name, age, DOB, key flags, plan status, last contact, with a synthetic-data label. Tabs: Overview, Plan, Logs, Notes, Messages, Documents. Mapping to FHIR Patient/CarePlan/Observation is a backend concern.

### 14. Data tables
Reference
- Stripe Customers: https://mobbin.com/screens/ab9ed449-1e64-4dbe-8be4-b98b53831762
- Givingli Contacts: https://mobbin.com/screens/7d93a086-afd4-4b65-9726-e7e094565108
- Square Customer directory: https://mobbin.com/screens/515531bc-92ff-4a24-b0fe-4440f32ad471
- Browserbase Sessions: https://mobbin.com/screens/b3e74860-e1a1-471f-9180-ecd6f12b530a
(All non-health, web.)

Observed: left navigation; a title with an Add action; a search field; a sortable header (Square shows a sort arrow on Name); row checkboxes; a compact row height; pagination ("1 - 9 of 9 results" in Stripe; rows-per-page and Previous/Next in Browserbase); a customisable-columns control (icon beside Filter in Stripe).
Strengths: dense but scannable; selection and bulk actions are possible; result counts are explicit.
Limitations: Givingli greys out paid features with "PRO" badges inside the table header, which adds noise; identifiers and emails dominate, so these tables show no status or risk at a glance; no sticky headers or responsive behaviour visible in the previews.

CarePath
- C: a patient table with columns: Name, Plan, Adherence (text + small bar), Last pain score, Next visit, Flags. Sticky header, sortable columns, keyboard row navigation, column chooser, visible count and pagination, row click opens the patient; avoid colour-only flags.
- P: no tables on mobile; use cards or a list.

### 15. Advanced filters
Reference
- Square "Define filters" side panel: https://mobbin.com/screens/515531bc-92ff-4a24-b0fe-4440f32ad471
- Browserbase filter chips and date presets: https://mobbin.com/screens/b3e74860-e1a1-471f-9180-ecd6f12b530a
- Stripe saved views and Filter: https://mobbin.com/screens/ab9ed449-1e64-4dbe-8be4-b98b53831762

Observed
- Square: a right panel with grouped conditions ("Purchases must match all these details"), a field/operator/value row (Location, "was not", value) with a delete icon, "Add purchase detail", "Add filter", and a live line ("0 matching customers. That's 0% of your customer base.") with an Apply button.
- Browserbase: removable filter chips ("Status: Completed"), a "+" opening a menu (Status, Region, Date) with a date submenu (Today, Yesterday, Last 7 days ... Custom), and "Clear filters" plus a sort selector.
- Stripe: a row of saved-view tabs (All, Top customers, First-time customers, High refunds, ...) above a Filter button.

Strengths: live match count before applying; operators are readable; chips show the active state at a glance and can be removed individually; presets cover common ranges; saved views reduce rebuild.
Limitations: Square's panel hides the table while editing; nested "match all" logic is not obviously extensible to OR; no filter persistence indicator in the preview.

CarePath
- C: chip-based active filters, a match count, saved views such as "Pain increased this week", "No log in 3 days", "Plan ending in 14 days", and an obvious Clear. State filters in the URL so a view can be shared and returned to.
- P: simple chips only (for example exercise history by week); no operator builder.

### 16. Administrative work queues
Reference
- incident.io board: https://mobbin.com/screens/4342b0ab-2225-4fe7-ae32-ffecee7c3a1f
- Productboard Feedback list plus detail panel: https://mobbin.com/screens/c4401191-dac4-43db-8f74-623ba244f485
- Searchable Opportunities: https://mobbin.com/screens/b5ac0f74-ee24-4737-bcaa-a46895266752
(All non-health, web.)

Observed
- incident.io: a board with status columns (Triage with count, Investigating, Fixing, Monitoring), each card showing an ID, age ("3d 1h"), title, a severity tag (Critical / Major / Minor / No severity) and an assignee avatar.
- Productboard: a list on the left with tabs (My Feedback, Created by me, Followed by me), unread dots, and a right-hand detail panel with an AI summary, "AI Insights (Beta)" bullets, links and a primary "Mark processed".
- Searchable: a left category tree with counts, cards with a priority label (Critical/High/Medium), and per-card Done and Decline, plus a toast "Opportunity marked as complete".

Strengths: counts per state; the age of each item is shown; severity uses text plus icon; list-plus-detail keeps context; per-item Done/Decline is fast; a toast confirms the action.
Limitations: a board hides items past the visible columns; the AI summary in Productboard has no visible sources in the frame; Done/Decline lack an undo in the frame seen.

CarePath
- C: a single "Needs attention" queue with types (high pain log, missed sessions, unread message, AI draft to review, expiring plan), age, assignee, and priority as text + icon. List-plus-detail layout; Resolve/Snooze/Assign with undo; keyboard navigation. Empty queue is a positive state (pattern 20).
- Queue ordering and thresholds must be documented as product rules, not clinical advice.

### 17. Notifications
Reference
- Google Health (Fitbit) push settings: https://mobbin.com/screens/4b4085ea-4efd-4b00-8121-b0a27a8cf78a
- Headspace reminders (Onboarding flow above)
- Oura Health Radar: https://mobbin.com/flows/cac6a11f-9128-4bf3-b4ac-032e27574713
- Calm paywall "Remind me 2 days before renewal": https://mobbin.com/flows/38549b00-2fe8-4fd1-914b-13c4905db245
- Zocdoc Appointments tab badge (Zocdoc flows above)

Observed
- Google Health: grouped toggles (Health and fitness, Social, More) with one-line descriptions, and rows that open a sub-screen when conditions are configurable ("High and low heart rate", "Irregular rhythm").
- Headspace: a time picker sheet ("Remind me to meditate at 8:00AM every day") with Confirm, and card toggles ("Set a reminder", "Enable Mindful Moments").
- Oura: states that alerts show in Today when notifications are on.
- Calm: a renewal-reminder toggle with an inline "Enable notifications in Settings ... Open Settings" prompt when system notifications are off.
- Zocdoc: a numbered badge on the Appointments tab.

Strengths: descriptions say what triggers a notification; grouping; time and frequency are explicit; deep link to system settings when permission is off.
Limitations: many toggles with no preview of what the notification will say; Headspace asks while the user is still onboarding; none shows quiet hours.

CarePath
- P: only three categories by default (exercise reminder, appointment reminder, messages) with a time picker and quiet hours; copy that never includes diagnosis or PHI on the lock screen ("You have a new message" rather than content). A permission pre-prompt and recovery link if denied.
- C: in-app inbox badges only for the queue; no push with patient details.

### 18. AI-generated content review
Reference
- Wix "Review and approve blog post": https://mobbin.com/screens/35f261f5-eab7-4824-8575-661043bd2341
- Spellbook summary with source chips: https://mobbin.com/screens/5f122c12-b787-4e37-a9ff-ac3ca75e6548
- Searchable "Review Prompts": https://mobbin.com/screens/b464059d-a3eb-4a85-9a34-e3be6ca0b54b
- Productboard AI summary (see pattern 16)
- Oura Counsel disclaimer (see pattern 12)
(None is healthcare; the AI behaviors are transferable.)

Observed
- Wix: a modal "Review and approve" with a schedule selector, the generated item shown in full, and actions Preview & Edit, Generate New, Dismiss, and Publish Now, with Cancel and "Confirm (1/1)".
- Spellbook: a "Thinking complete" disclosure, then bullet points, each ending in a small numbered chip (for example 1, 2, 3) that refers to a source passage, and a files panel on the right; a "Review table" tab.
- Searchable: a list of generated prompts with inline edit (check/cross icons), counts ("50/50"), and a final "Looks Good" button.
- Productboard: a labelled "AI summary" and "AI Insights Beta" block next to source fields.

Strengths: human approval is the only way the content goes out; edit-in-place and regenerate are one step away; per-claim source chips support evidence inspection; AI content is labelled; counts show review progress.
Limitations: Wix's approval is a single confirm for the whole item with no per-claim check; Spellbook chips are small and I did not see what opens when one is selected; Productboard shows no confidence or source link in the frame; none records who approved what and when.

CarePath
- C: AI visit/progress summary appears as a labelled draft. Each sentence carries an evidence chip that opens the underlying log, note or measurement alongside. Actions: Accept, Edit, Reject, Regenerate, with a required reviewer sign-off and an audit entry (reviewer, time, edits). Unsupported statements are flagged "no evidence found". Nothing is sent to a patient or written to the record until approved (Definition of done: evidence inspection and human approval).
- P: patient-facing AI content is limited, labelled "AI-assisted, reviewed by [clinician]" only when true, and carries the informational/emergency disclaimer.
- Do not state clinical accuracy figures that have not been measured.

### 19. Error recovery
Reference
- Noom "Can't connect": https://mobbin.com/screens/2419210e-0800-41b0-b0ce-d45c385858cc
- Perplexity "Something went wrong": https://mobbin.com/screens/53c1cd17-3832-45bf-adcc-d86bd15c7a15
- v0 "Deployment Error": https://mobbin.com/screens/63640548-4dd7-4a66-b9a3-48e8b0a5328c (a counter-example)
- Zocdoc inline booking error; Hers "Required field."; Headspace password error (flows above)
- Cal AI "Manage Apple Health": https://mobbin.com/screens/2bcefec4-6036-44fb-8862-7f7bcd383f3e

Observed
- Noom: icon, "Can't connect", "Please try again. You can reach out to Support if this problem persists", a Retry button, with the tab bar still visible.
- Perplexity: an inline banner "Something went wrong. Please try again later." with a "Try again" link under the search field, in place of results.
- v0: "Deployment Error" with the text "Not Found. [object Object]. An error occurred..." and a Publish button; the raw "[object Object]" leaks an unformatted error.
- Inline field errors: Zocdoc states what is missing and why; Hers shows "Required field." under the empty field; Headspace marks the field red.
- Cal AI gives numbered steps to recover from a denied permission.

Strengths: the error stays in context and keeps navigation; retry is one tap; the support path is named; field errors sit next to the field; permission recovery is step-by-step.
Limitations: "Please try again later" gives no time frame and no indication whether data was saved; v0 shows how not to surface errors; none shows an offline state or what happens to a half-completed form.

CarePath
- Every error states what happened, whether the user's data is safe, and one next action. Never show raw error objects. Preserve in-progress forms and logs locally and say "Saved on this device, will send when you're back online". For booking conflicts, offer alternatives. For authorization errors, say "You don't have access" and do not reveal that a record exists.
- Phone number for the clinic on any error blocking care tasks (booking, urgent message).

### 20. Empty and loading states
Reference
- Empty: Cal AI "No data to show": https://mobbin.com/screens/ed32b620-bc5e-439a-972a-e8aefd4e5552 ; Bevel "No data / Not enough data": https://mobbin.com/screens/64c0eecd-3705-4060-acff-757343c0fb0f ; Venmo "No Activity": https://mobbin.com/screens/f2375a86-5661-4c31-ba83-c8c19d205dd9 ; Fitbit "No data" rings (Onboarding flow); Zocdoc "No available appointments"; Apple Health "None" for apps allowed to read data.
- Loading: Citi Bike skeleton https://mobbin.com/screens/400a3ae1-51e5-4f27-9f53-ec93b53f112f ; Thumbtack skeleton https://mobbin.com/screens/8d1ba56e-851d-4e85-af50-4d47d5f23638 ; Google search skeleton https://mobbin.com/screens/c18a51d4-44f9-445c-abac-10c3c384ad2e ; Hers staged "Loading your results" (questionnaire flow); WHOOP unlock progress bars (flow above).

Observed
- Cal AI: an icon, "No data to show" and "This will update as you log more food" inside the chart card, with period tabs still shown. Bevel: "No data available. We were unable to detect any data." and a second card "Not enough data. Connect your wearable to see how your habits impact your aging." with skeleton rows behind.
- Venmo: only the words "No Activity" centred on an otherwise blank screen.
- Fitbit: rings show 0 and the hero says "No data"; Zocdoc lists each empty day with the text "No available appointments".
- Skeletons: Citi Bike mimics the list structure (headers, avatar circles, text lines); Thumbtack mimics cards with a heading "Scanning review data..."; Google uses shimmer bars under the search field. Hers narrates progress with three steps that tick off. WHOOP shows how much more data is needed ("Log 14 sleeps to unlock").

Strengths: the best empty states say why and what will fill them (Cal AI, Bevel, WHOOP); skeletons that match the final layout reduce layout shift; narrated steps make a wait feel purposeful.
Limitations: Venmo's bare text gives no next step; Bevel's "unable to detect any data" can read like a fault; several empties still show zeros that look like a result; Zocdoc's repeated "No available appointments" is noise.

CarePath
- Empty states: say why it is empty, what will fill it and offer one action ("Log your first session"). Distinguish "no data yet" from "no data because sync failed" from "not allowed". Collapse repeated empties (for example a run of unavailable days).
- Loading: skeletons matching the final layout for lists and tables; a narrated progress for longer AI work ("Reading 12 logs", "Drafting summary"); a timeout fallback after a defined delay.
- Positive empty for the clinician queue: "Nothing needs attention", with the last-checked time.

---

## 3. CarePath interaction principles

1. One primary action per screen. Today and every task screen lead with the next thing to do; no promotional cards (Flo, Headspace, Fitbit contrast).
2. Ask in context, explain why. Each clinical field or permission states why it is collected and who sees it (Fitbit profile, Bevel pre-prompt).
3. Required versus optional is always labelled in words, and optional sharing defaults to off (Oura/Counsel).
4. Say where consent is revoked at the moment it is granted, and log consent changes (Oura, Apple Health).
5. Never rely on colour alone. Status, severity and chart series use text, icon or pattern plus colour; every chart has a table view (Strava list, Flo legend lesson).
6. Pain logging takes seconds and ends with a visible handoff: "Your therapist will see this", plus a red-flag path to contact the clinic and a non-diagnostic disclaimer (Flo chips, Oura disclaimer).
7. Patients control only what the clinician allows. Prescribed fields show "Set by your care team" with a request-change action (Fitbit goal stepper, adapted).
8. Every exercise session can be previewed first and stopped for pain at any step; no feature is camera-dependent (NTC preview, Headspace player).
9. Booking shows availability before commitment, prevents conflicts on the server and, on conflict, offers nearest alternatives (Zocdoc, adapted).
10. Messages show who is replying, their role, and a typical reply time, with a persistent urgent-care line (Hers/Ro, Oura).
11. Clinician tables and queues show state, age and priority at a glance, support saved filters with live counts, and open a list-plus-detail view without losing place (Square, Browserbase, incident.io, Productboard).
12. AI output is always a labelled draft with per-claim evidence the reviewer can open; approval, edit and rejection are logged and nothing leaves the clinic before approval (Wix, Spellbook, adapted).
13. Errors state what happened, whether data is safe and one next action; in-progress input is preserved; raw error text is never shown (Noom, Perplexity, v0 counter-example).
14. Empty states explain why and what fills them; skeletons mirror the final layout; long waits narrate progress (Cal AI, Bevel, Citi Bike, Hers).
15. Notifications carry no PHI on the lock screen, are grouped by purpose with a visible time and quiet hours, and offer a recovery link if permission is denied (Google Health, Calm).

Caveats
- These principles come from sampled captures of other products and general design judgment. None has been tested with CarePath users, and none constitutes clinical or compliance guidance.
