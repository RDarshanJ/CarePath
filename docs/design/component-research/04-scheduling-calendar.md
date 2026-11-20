# 04. Scheduling and calendar components

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief section 15 governs: different components per role, not one calendar forced into three jobs. Builds on `docs/design/feature-research/F-scheduling.md` (patient: earliest-times shortlist then guided list) and `H-clinician-workspace.md` and checkpoint C2 (day agenda list, no week grid, no drag). Access date for every external source: 2026-11-20. Colours are not chosen. Decision records: CD-310 to CD-319. Prototype spec: `docs/design/design-alternatives/prototypes/appointment-availability.md`.

Labels: **[Observed]** retrieved and read or viewed this session; **[Prior]** from earlier feature research, not re-retrieved; **[Code]** repository today; **[Judgement]**; **[Assumption]**. Scores are heuristic. Default weights: task 25, accessibility 25, error prevention and trust 20, business and operational 15, efficiency 10, cost 5.

## 0. Facts from code and records that bound the decisions

1. Slots: `AvailabilitySlot` has practitioner, start, end, status `open | booked | blocked`, supported appointment types. Overlapping slots per practitioner are rejected by an exclusion constraint; overlapping appointments per practitioner and per patient are also rejected [Code: `schema.prisma`]. So a true double booking cannot exist. "Conflicts" in the UI are the lost-race (409 `booking_conflict`), an unavailable slot (409 `slot_unavailable`), and a patient overlap with another clinician (AC-E3) [Prior F].
2. Patient slot read returns future open slots grouped by clinic-zone day, empty days omitted, at most 31 days [Prior F].
3. The appointment always takes the whole slot (no duration choice) and has no location, preparation or policy field [Prior F].
4. Clinician agenda is one practitioner's day from the API, refetched every 60 s [Code: `schedule.tsx`]. Statuses shown with a `Tag`.
5. Availability management: permissions `availability.manage_own` and `availability.manage` exist, the advisor plan lists availability in the admin scope and checkpoint C2 keeps "availability editing for a therapist's week, as a list of slots" and cuts recurring patterns. There is no `admin` module in `apps/api/src/modules` today, and the slot repo shown reads and locks slots, so a slot-write API for availability is not confirmed to exist [Code: directory listing and grep; Assumption that no write route exists].
6. Time zone conventions differ: clinician clinic zone with abbreviation, admin "Registered (UTC)", patient clinic zone name [Prior matrix G3]. REQ-APT-03 says viewer zone; the booking flow uses clinic zone [Prior F].
7. Appointment status presentation: tag in clinician screens, chip for two states and plain text in patient screens, nothing for booked; wording differs ("Did not attend" and "Missed", "Cancelled by the patient" and "Cancelled by you", "Video follow-up" and "Follow-up by video") [Prior matrix C3].

## 1. Decision: patient time-slot finding (CD-310)

### 1.1 Task, journey, information, action
An assigned patient, usually on a phone, wants the soonest workable time with their own therapist, wants to confirm it without surprises, and may later move or cancel it. Information: date, time, time zone, therapist, visit type. Action: choose a time, confirm.

### 1.2 Requirements and constraints
Business: fill near-term capacity without steering or dark patterns (brief section 9). Healthcare: reason text is health information shown only to the care team; confirmation exports carry no reason. API gives one practitioner's slots per request; a cross-practitioner "earliest" would need one request per therapist. Targets at least 24 px (SC 2.5.8 [Observed]); patient theme uses 44 px.

### 1.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Fresha | iOS | Select time | https://mobbin.com/screens/b79eb06d-9b03-42fa-9b40-0c88f2c97d3a | Horizontally scrolling date strip with one selected date and the other dates muted; below, times as full-width list rows; a calendar icon opens a full calendar. | [Observed] |
| Swiggy | iOS | Book table | https://mobbin.com/screens/3fef9c41-a18c-4665-8bbc-ea387e375aad | Date strip of day cards (Today, then weekdays), a meal-period group with a grid of time pills and a "View all slots" expander; a bottom Proceed button. | [Observed] |
| Tripadvisor | iOS | Tour time | https://mobbin.com/screens/21632a98-8496-4d51-842f-103cd064d9c4 | A date chip at top, time pills in a wrapping grid, "Show less" toggle, a selected pill with a heavier outline. | [Observed] |
| DoorDash | iOS | Reservation date | https://mobbin.com/screens/87e4889a-5af4-42dd-8963-b68d2a2eb761 | Month grid in a bottom sheet; past dates struck through; today outlined and selected date filled; a separate Time row set to "Anytime". | [Observed] |
| Calendly | Web | Booking page | https://mobbin.com/screens/d45fd998-e540-49fd-b224-1c2ef7285013 | Meeting details at left; month calendar at right with a Time zone control below it. | [Observed] |
| Upwork | Web | Consultation booking modal | https://mobbin.com/screens/cc036815-94c4-4081-820e-74c69a4a6e18 | Month calendar with past dates muted, a Time zone select above a vertical list of time buttons, Confirm button. | [Observed] |
| Zocdoc | iOS | Provider detail and booking | https://mobbin.com/flows/fcd6461e-af19-4ca9-9864-8b21c286888c | "Tomorrow" first with time pills and "View more availability"; no-availability state with Notify me. | [Prior F] |
| One Medical, Hinge Health, Headway, MyChart, Tebra, WebPT, MedBridge, Sword | iOS, web | Booking screens | n/a | No booking screens retrievable on Mobbin or public pages for these today (Hinge help text mentions scheduling the first video visit, no screens). | Not accessible |

### 1.4 Guidance
WAI-ARIA APG date picker dialog: grid navigation with arrow keys (one day left or right, one week up or down), Page Up and Page Down for months, roving focus with one cell in the Tab order, a polite live region for the month heading, selected cell `aria-selected`, full day names behind abbreviations (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) [Observed; the page states its code is illustrative and needs testing]. APG table page: a table is static, cells are not focusable; interactive cells push toward the grid pattern (https://www.w3.org/WAI/ARIA/apg/patterns/table/) [Observed]. Calendly help on time zones [Prior F]. Material 3 date picker guidance, Apple HIG and Fluent were not retrievable (shell pages or fetch failure).

### 1.5 Alternatives
A. Guided flow: filters then day-grouped list (current). B. Earliest-times shortlist (three buttons with stated basis) then the grouped list behind "See all times". C. Month calendar with a time list beside it. D. Date strip with a time list below.

### 1.6 Gates
| Alt | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A | Pass | Pass | Pass | Eligible |
| B | Pass (buttons and a disclosure) | Pass: basis sentence uses intake availability the patient already gave | Pass if "See all times" is always one action away and the basis is stated | Eligible |
| C | Conditional: needs the APG grid behaviour above and a list alternative | Pass | Pass | Eligible with conditions |
| D | Pass if the strip is a labelled list of buttons or a radio group | Pass | Pass | Eligible |

### 1.7 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 5 | 3 | 4 |
| Accessibility (25) | 4 | 4 | 3 | 4 |
| Error prevention (20) | 4 | 4 | 3 | 3 |
| Business (15) | 3 | 4 | 3 | 3 |
| Efficiency (10) | 3 | 5 | 3 | 4 |
| Cost (5) | 5 | 4 | 2 | 3 |
| **Total** | **3.80** | **4.35** | **2.95** | **3.60** |

(F weighted the same family with adjusted weights and got 4.30 for the shortlist; the scores agree in order.)

### 1.8 Selected and rejected
Selected: **B, shortlist then day-grouped list**, unchanged from F. Why the date strip (D) is not the default list navigation: the API omits empty days, so a strip would either show gaps with nothing in them or invent disabled days; Fresha mutes empty dates, which implies the clinic's days are known to the client. A strip is kept as an optional refinement inside "See all times" only if the day-grouped list proves long in testing [Judgement]. Month calendar rejected: the patient has no calendar to overlay and the grid carries the highest accessibility cost. Rejected as default: A (kept as the full list).

### 1.9 Spec: `EarliestTimes` plus `SlotList`
- **Anatomy:** `EarliestTimes` (heading, one-line basis, up to three `SlotButton`s, "See all times" disclosure), `SlotList` (day heading level 3 per clinic-zone day, wrapping `SlotButton`s, "Show later days" as the shared `LoadMore`), filters (days, time of day) as toggle chips under "Change days and times".
- **Use / not use:** patient booking and reschedule only. Not for clinician or admin.
- **States:** loading skeleton with polite "Loading open times"; empty in range; filters exclude all ("No open times match the days you picked. There are 7 on other days." with "Show every day and time"); partial (one therapist failed: retry for that therapist); error; stale ("Times updated 9:12 AM", refresh); permission (no therapist assigned); success handled by confirm step.
- **Behaviour:** the basis sentence names the source ("Based on the days you told us"); if none fits, show the earliest unfiltered with "These are outside the days you gave". Choosing a time moves to the confirm step and keeps filters on Back.
- **Keyboard:** all controls are buttons in DOM order; no custom grid.
- **Screen reader:** day headings navigable; slot names include the full date (existing sr-only prefix); list updates announced politely ("12 open times").
- **Responsive:** 375 and 390 single column, shortlist first; 768 wider wrapping; 1024 two panes (choices left, times right); no extra panes at 1440 or 1920.
- **Data:** slots per practitioner and type; intake availability. **Permissions:** patient with an assigned therapist; coordinators book for others in a different flow. **Testing:** the 50-parallel-booking test is API side; UI tests for shortlist derivation, no-fit fallback, back-navigation state, axe, 200 percent zoom.

## 2. Decision: slot button (CD-311)

### 2.1 Task and finding
Select one time. The product has hand-built `<button>` chips (`chip`, `chipOn`, `chipOff` at `booking-flow.tsx:86-89` and four other places) for slots, day filters and time-of-day filters. Slot chips have no pressed or selected state, because choosing goes straight to step 2 [Code]. Filter toggles use `aria-pressed`.

### 2.2 Alternatives
A. Keep hand-built chips. B. Two shared `ui` components: `SlotButton` (action button, selected text state when the page returns with a choice) and `ToggleChip` (`aria-pressed`, for filters). C. A radio group of times with a separate Continue button. D. One component for both jobs.

### 2.3 Gates and evidence
Conventional element; reuse the established pattern. Calendly's list, Upwork's time buttons and the iOS pill grids all use buttons that act on press [Observed, 1.3]. APG advises native semantics where they meet the need [Observed: table page states native elements are preferred]. A radio group (C) would fit if choice and confirm were one screen; here confirm is a second step, so a press-to-advance button is correct. D mixes an action with a toggle and is wrong for assistive technology (a button that both selects and proceeds should not announce "pressed").

### 2.4 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 3 | 4 | 3 | 3 |
| Accessibility (25) | 3 | 5 | 4 | 3 |
| Error prevention (20) | 3 | 4 | 4 | 3 |
| Business (15) | 3 | 3 | 3 | 3 |
| Efficiency (10) | 4 | 4 | 3 | 4 |
| Cost (5) | 5 | 3 | 3 | 4 |
| **Total** | **3.20** | **4.05** | **3.45** | **3.15** |

### 2.5 Selected
**B.** `SlotButton`: visible time with the zone in the list heading, an sr-only full date, 44 px minimum height in the patient theme, text "Selected" (not colour alone) only when a chosen slot is shown again after Back. `ToggleChip`: `aria-pressed`, text state, same height. Both in `packages/ui`, replacing the five local class sets. Rejected: A, C, D.

### 2.6 Spec
States: default, hover, focus-visible, pressed, selected (return view), disabled (only when a request is in flight, with the reason in the surrounding status text, never silent), long label (times never truncate). Keyboard: Enter and Space. Screen reader: name "Fri Nov 20, 9:00 AM"; toggle announces pressed state. Tokens: semantic roles for surface, border, selected border and focus ring; no colour chosen here. Testing: axe, focus ring contrast at both themes, 24 px minimum in the clinician theme, touch target 44 px in the patient theme.

## 3. Decision: clinician schedule component (CD-312)

### 3.1 Task, journey, information, action
A therapist opens Schedule to understand the working day: who is coming, when, what type, anything unusual, and where the open gaps are. Action: open a patient record or appointment, and occasionally check the coming days. Desktop at a desk, often several times a day [Assumption].

### 3.2 Requirements
Operational: see the shape of the day, including free time, because utilisation matters (admin metric: booked minutes over published availability minutes [Prior N]). Healthcare: patient identity shown with each row; patient name in the row is PHI visible on a shared screen. Prior ruling: day agenda list, no week grid, no drag (C2 section 6.4); this decision stays inside that ruling and says what is added.

### 3.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Square | Web | Staff Workday timeline | https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8 | A notice at the top saying times show in the location's time zone, a date stepper with Today, team members as rows across an hourly axis, colour bars with a text legend. | [Observed] |
| Calendly | Web | Calendar meeting list | https://mobbin.com/screens/3a2fdf98-1d65-4469-8031-d43b2a64c08a | Meetings grouped by day with a "Today" label and "No meetings today", search and Filter, "No more past meetings" and a "View more meetings" button. | [Observed] |
| Sweatpals | Web | Schedule | https://mobbin.com/screens/05e9f0a6-db81-4efa-aa67-1ae733110c67 | A week strip of seven day buttons with the selected day filled, a list/calendar/grid view toggle, rows with time and duration, location and a Book button. | [Observed] |
| incident.io | Web | Multi-timezone schedule | https://mobbin.com/screens/c14089d9-ccea-46c7-a13e-4aae572ea7ce | A "3 timezones" selector, dated column header and a row per city with a current-time marker in each zone, 2 weeks range. | [Observed] |
| WebPT EMR | Web | Dashboard with agenda | https://help.emr.webpt.com/article/1114-webpt-dashboard | Agenda of today's appointments with alerts beside it. Text only. | [Prior H] |
| MyChart, Epic, Tebra, Headway | Web | Provider schedule | n/a | No provider schedule screens retrievable. | Not accessible |

### 3.4 Guidance
Carbon data tables: sortable headers, row actions, and expansion for supplementary detail (https://carbondesignsystem.com/components/data-table/usage/) [Observed]. APG: native `table` preferred over ARIA roles; a plain table has no focusable cells (https://www.w3.org/WAI/ARIA/apg/patterns/table/) [Observed]. No retrieved page gives guidance on clinician day views; the design rests on the Mobbin examples and judgement.

### 3.5 Alternatives
A. Day agenda list (current: a table of the day's appointments). B. Day agenda that also lists the day's open slots as rows ("10:00 to 10:45 Open") and carries a seven-day strip of counts ("Mon 6 booked, 2 open") that changes the day. C. Day timeline: an hourly time axis with appointment blocks. D. Week grid.

### 3.6 Gates
| Alt | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A | Pass (native table) | Pass | Pass | Eligible |
| B | Pass (native table plus a labelled group of day buttons) | Pass | Pass | Eligible |
| C | Conditional: proportional blocks need a text equivalent for every block and a non-spatial reading order; short appointments get small targets | Pass | Pass | Eligible with conditions; outside the C2 ruling |
| D | Conditional: grid role and arrow keys, list alternative required, 375 px cramped | Pass | Pass | Outside the C2 ruling; fails cost |

### 3.7 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 5 | 4 | 3 |
| Accessibility (25) | 5 | 5 | 3 | 2 |
| Error prevention (20) | 4 | 4 | 4 | 3 |
| Business (15) | 3 | 4 | 4 | 4 |
| Efficiency (10) | 3 | 4 | 4 | 3 |
| Cost (5) | 5 | 4 | 2 | 1 |
| **Total** | **4.05** | **4.50** | **3.65** | **2.80** |

### 3.8 Selected and rejected
Selected: **B, agenda list with open-time rows and a seven-day count strip.** It adds to the C2 ruling without a grid or drag: open rows come from the same `AvailabilitySlot` data (status `open`), and the strip is a labelled group of day buttons, not a calendar. Why it beats the plain agenda A: it answers "where is my free time" and "how heavy is Thursday" which A cannot. Why not the timeline C: proportional blocks hide short visits at normal sizes and add a non-textual reading order for no task the agenda fails at; kept as Approach 2 in the prototype spec so the choice can be tested rather than assumed. Rejected: D.

Open question flagged for the advisor: whether the clinician agenda API returns open slots. The slots endpoint is a patient-facing read of one practitioner's future open slots, which may serve; past open slots in today's earlier hours are not returned, so "Open" rows for past hours of today are not available [Judgement from F section 4]. Until confirmed, B ships with open rows for the future part of today and later days only, which the day heading states ("Open times from now").

### 3.9 Spec: `ClinicianDay`
- **Anatomy:** page header with day and zone ("Thursday Nov 20, Mountain Standard Time"), day stepper (Previous, Today, Next, Go to date: CD-319), seven-day strip (text "Mon 6 booked, 2 open"), table with columns Time, Patient, Type, Status, plus gap rows for open times, row primary link on patient name.
- **Use / not use:** one practitioner's day. Not for admin capacity (CD-313) or patients.
- **States:** default; loading skeleton; empty day ("No visits today. Nothing is booked with you." plus open times if any); cancelled rows muted with the word Cancelled and the time struck through and spoken as "Cancelled"; in progress; checked in; no practitioner profile (existing copy); stale ("Updated 9:12 AM", 60 s refetch with polite note only on change); partial (strip counts failed: "Counts not available", table still shows); error with retry.
- **Behaviour:** rows are not clickable as a whole (see CD-337); the patient name link opens the record at the Appointments tab; "Today" returns to today; the day is in the URL (`?date=`) as now, no patient names in the URL.
- **Keyboard:** Tab to stepper, strip buttons, row links. No arrow-key model (native table).
- **Screen reader:** table caption "Visits on Thursday Nov 20"; gap rows read "Open, 10:00 AM to 10:45 AM"; strip buttons carry the full date and `aria-current="date"` for the viewed day.
- **Responsive:** at 1024 and above table plus strip; at 768 the strip scrolls horizontally as buttons; below 600 the table becomes a stacked list with the same fields in reading order (time, patient, type, status), not cards with decoration.
- **Data:** agenda (appointments for date and practitioner), open slots for date range, counts derived on the client from a 7-day read [Assumption: the 7-day read is available; otherwise the strip shows only the day stepper].
- **Permissions:** `appointment.read`; therapists see own schedule only (current behaviour).
- **Testing:** axe on table and strip; fixtures for empty day, full day, cancelled and no-show rows, day with a blocked slot; zone-boundary day at a daylight saving change (AC-E5).

## 4. Decision: admin availability management (CD-313)

### 4.1 Task and requirement
A coordinator or clinic admin sets and changes when each therapist can be booked: add times, block times, remove unbooked times, and see booked versus open to judge capacity. Brief section 15: capacity and availability management, not appointment viewing. C2 keeps "availability editing for a therapist's week, as a list of slots" and cuts recurring patterns. Admin metric "appointment utilisation" depends on published availability minutes [Prior N].

### 4.2 Examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Zillow | Web | Tour availability step | https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f | Per day: a date field, a start and end time field, add and remove controls on the row, an "Add a day" button; step 6 of 8 with Save & exit. | [Observed] |
| HoneyBook | Web | Scheduler block settings | https://mobbin.com/screens/b5fed4af-e5a7-457d-9b06-3b596f5b58f1 | A preview of the booking calendar with dots under available dates, a time zone select, AM and PM time-pill groups, and a settings panel with requirement toggles. | [Observed] |
| Sweatpals | Web | Date and time panel | https://mobbin.com/screens/fac08c36-eef2-4291-839c-df6b256cde54 | A choice between Single ("Happens once") and Recurring ("Multiple days or time slots") as two selectable cards, start and end date and time fields with a zone abbreviation, Save. | [Observed] |
| Square | Web | Workday | https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8 | Staff by hours, legend for scheduled and recorded. | [Observed] |
| Calendly | Web | Event types with availability ("Weekdays, 08:30 - 16:30") | https://mobbin.com/flows/e0e18051-aa17-465a-8fe5-851659cc774b | Availability summarised as a recurring rule per event type. | [Prior F] |
| Google Calendar | Web | Appointment schedules help | https://support.google.com/calendar/answer/11608416 | Slots close when you are busy. | [Prior F] |

Not accessible: MyChart, Epic, Tebra and Headway admin scheduling.

### 4.3 Alternatives
A. Per-therapist week as a day-grouped list of slots, with Add times (day, start, end, visit types) and Block or Remove per slot, and a booked versus open count per day. B. A week grid where cells are painted or clicked. C. Recurring pattern rules ("Weekdays 8:00 to 12:00") that generate slots. D. A table of slots with row selection and bulk actions.

### 4.4 Gates
A pass. B conditional: needs grid semantics and a list alternative. C pass for accessibility but outside C2 scope, and needs an API for rules or a generator on top of slot writes (none confirmed). D conditional: bulk remove of slots that have appointments would harm patients, so bulk is limited to open slots and previews the count.

### 4.5 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 4 | 5 | 3 |
| Accessibility (25) | 5 | 2 | 4 | 4 |
| Error prevention (20) | 4 | 3 | 3 | 3 |
| Business (15) | 4 | 4 | 5 | 3 |
| Efficiency (10) | 3 | 4 | 5 | 4 |
| Cost (5) | 5 | 1 | 1 | 4 |
| **Total** | **4.20** | **3.15** | **4.15** | **3.40** |

A and C score within 0.05, and the order is heuristic. The decision between them turns on scope and API, not on the score.

### 4.6 Selected
**A**, the day-grouped slot list with an add-times form, inside C2's scope. C (recurring rules) is recorded as the likely next step once the product wants it, because adding a week of times by hand is slow; it needs a slot-generation API and an advisor decision. B is rejected. D's bulk idea is limited to a later "Remove open times in this range" action with a count preview. No availability write route is confirmed in the repository (0.5), so this component cannot ship until the API owner confirms or adds one.

### 4.7 Spec: `AvailabilityEditor`
- **Anatomy:** therapist selector (native select; combobox only above 15 therapists), week navigation (Previous week, This week, Next week), per-day section with date heading and zone, rows (time range, visit types as text, status word Open, Booked or Blocked, row action), "Add times" form per day or at the top (day, start, end, slot length, visit types) using `ui Field`.
- **Use / not use:** coordinators and admins with `availability.manage`; therapists with `availability.manage_own` see only themselves. Not for patients.
- **States:** empty week ("No times published this week for Dana Smith. Add times so patients can book."), booked slot (row shows the patient's visit as a link; Remove disabled with the reason "This time has a booked visit. Cancel the visit first."), blocked (reason text optional), past week (read only, "Past times cannot be changed"), overlap error (server rejection: "These times overlap an existing time."), saving, error with retry, stale, success status line (not a toast alone).
- **Behaviour:** adding validates start before end, slot length divides the range or the remainder is stated; confirmation line "Added 6 times on Mon Nov 24." with an Undo only for unbooked additions (undo removes those exact slots); Remove on an open slot needs no dialog (reversible by Add) but is announced.
- **Keyboard:** native form and list controls; no grid.
- **Screen reader:** each row's action names the time ("Block Mon Nov 24, 9:00 to 9:45 AM"); live region for results.
- **Responsive:** single column at all widths; forms stack below 768.
- **Data:** slots by practitioner and range; appointments by slot. **Permissions:** as above. **Testing:** overlap rejection, booked-slot removal blocked, zone and daylight saving boundaries, permission matrix, keyboard-only add and remove, axe.

## 5. Decision: time zone display (CD-314)

### 5.1 Task and evidence
Everyone must know which time zone a time is in without doing arithmetic. Examples: Square names the location zone in a notice [Observed 3.3]; incident.io shows several zones at once with markers [Observed]; Calendly and Upwork put a changeable Time zone control by the times [Observed 1.3]; Sweatpals shows a zone abbreviation beside start and end [Observed 4.2]; Calendly help: in-person events can be locked to one zone tied to the location, the invitee's zone is detected and changeable [Prior F]. WCAG has no zone criterion; plain text at every time follows 3.3.2 intent [Judgement].

### 5.2 Alternatives
A. Clinic zone everywhere, named once in the heading. B. Viewer's browser zone everywhere with a selector (Calendly style). C. Clinic zone as primary plus the viewer's local time when it differs, for video visits only. D. Dual display always.

### 5.3 Gates
A pass for in-person care (the patient travels to the clinic's time). B fails for in-person: a patient with a device set to another zone would read wrong clock times for a physical visit. C pass. D pass but noisy for the usual case where both match.

### 5.4 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 3 | 5 | 4 |
| Accessibility (25) | 4 | 3 | 4 | 3 |
| Error prevention (20) | 4 | 2 | 5 | 4 |
| Business (15) | 3 | 3 | 4 | 3 |
| Efficiency (10) | 4 | 3 | 4 | 3 |
| Cost (5) | 5 | 2 | 4 | 3 |
| **Total** | **3.90** | **2.75** | **4.45** | **3.45** |

### 5.5 Selected
**C.** One formatter `formatVisitTime(instant, clinicZone, viewerZone?, type)` used in patient, clinician and admin: clinic zone named in the day heading, in confirmation and in records ("Mountain Standard Time" for patients, abbreviation "MST" for dense clinician tables); for `video_follow_up` when the browser zone differs, add "Your time: 10:00 AM Eastern Time". Admin screens show clinic zone, not UTC, for visits and availability; audit and registration timestamps may stay UTC but are labelled "UTC" (resolves matrix G3 for visit-related times only). REQ-APT-03 says viewer zone; the code uses clinic zone; this decision follows the code for in-person visits and needs advisor sign-off for the video case. B rejected, A kept as the fallback when the viewer zone is unknown.

### 5.6 Spec
Never display a time without a zone in the same container (heading counts). Daylight saving boundary days use the API's instants and zone name, never client arithmetic. Tests: AC-E5 daylight saving, a viewer in another zone, a video visit, an admin visit row, a record header time. Screen reader reads zone name in full once per list heading.

## 6. Decision: past and unavailable slots (CD-315)

### 6.1 Task and evidence
Show what is bookable and handle what is not. Observed: DoorDash strikes through past dates [Observed 1.3]; Upwork mutes past dates [Observed]; Fresha mutes unavailable dates in the strip [Observed]; Zocdoc shows "No available appointments" per day and "No upcoming availability" with Notify me [Prior F]. The slots API returns only future open slots, so a patient can never see a past or unavailable slot [Prior F].

### 6.2 Alternatives
A. Patient omits unavailable and past slots; staff screens show all with status words. B. Patient sees disabled slots with a reason. C. Patient sees nothing but a count of times elsewhere ("7 on other days").

### 6.3 Gates and selection
Disabled-but-visible targets with no way to act are noise for a patient who wants one workable time (matches F's reasoning); they are useful to staff who must understand capacity. A and C combine. Gate: nothing is unavailable by colour alone.
| Criterion | A omit for patient, words for staff | B disabled for patient | C count only |
|---|---|---|---|
| Task (25) | 5 | 3 | 3 |
| Accessibility (25) | 5 | 3 | 4 |
| Error prevention (20) | 4 | 3 | 3 |
| Business (15) | 4 | 3 | 3 |
| Efficiency (10) | 5 | 3 | 4 |
| Cost (5) | 5 | 3 | 4 |
| **Total** | **4.65** | **3.00** | **3.40** |

Selected: **A plus C's sentence when filters exclude times**. Staff status words: Open, Booked, Blocked, Past (past is text "Earlier today" and muted by token role, never colour alone). A stale list refreshes on focus and every 60 s with "Times updated 9:12 AM".

### 6.4 Spec
Patient: no past or booked slot ever appears; if a selected slot disappears before confirm, the conflict flow in CD-316 applies. Staff: row status words and an sr-only prefix. Tests: slot booked elsewhere while the list is open; list refresh keeps focus and the user's place.

## 7. Decision: booking conflicts (CD-316)

### 7.1 Task and constraints
When a time is taken, tell the patient truthfully that nothing was booked and offer the nearest alternatives while keeping their choices. Brief section 14: never show success before the server confirms. 409 `booking_conflict` and `slot_unavailable` exist; reschedule keeps the original on failure (AC-E7) [Prior F].

### 7.2 Alternatives
A. Inline notice in the flow with nearest times as `SlotButton`s (current). B. Toast then return to the list. C. Modal dialog. D. Optimistic confirmation then correction.

### 7.3 Gates and selection
D fails the brief (success before confirmation). B fails: a toast cannot carry the alternatives and disappears. C interrupts a time-sensitive step and traps focus for no gain. A passes. Scores (task, accessibility, error prevention, business, efficiency, cost): A 5,5,5,4,5,5 = 4.85; B 2,2,2,3,3,5 = 2.40; C 3,3,4,3,3,4 = 3.25; D 2,3,1,3,5,4 = 2.60 [heuristic].

Selected: **A**, an inline alert (existing `Banner` tone error with action area) at the top of the step, focus moved to its heading, text "That time was just taken. Nothing was booked." then the nearest three times and "See all times". Reschedule adds "Your current visit is unchanged." Network loss and server error use the same placement with their own text ("We could not book that. Nothing was changed. Try again."). Spec tests: conflict with 50 parallel bookings is API; UI tests for focus move, alternatives count, selection retained, screen reader announcement via alert role.

## 8. Decision: appointment record component (CD-317)

### 8.1 Task and finding
Show one visit consistently in patient list, patient detail, clinician schedule, record tab and overview. Today three forms for one status (tag, chip, plain text) and two vocabularies (0.7).

### 8.2 Examples
Calendly meetings list row with time range, title, attendee count and a coloured edge [Observed 3.3]; Sweatpals row with time and duration, location, status-like label "Event" and Book [Observed]; Fresha appointments table (reference and client as links, count text) [Prior I]; Calendly list "Up next" label and detail panel with Reschedule and Cancel [Prior H]. None is healthcare; no healthcare appointment card was retrievable.

### 8.3 Alternatives
A. Keep separate per-app markup. B. One `AppointmentRecord` with `audience` and `layout` (`row` for tables and lists, `summary` for detail) variants, one status map, one formatter. C. Cards for every appointment. D. Calendar event blocks only.

### 8.4 Gates
A fails consistency. C: oversize cards for repeated records (brief section 9). D: fails where there is no calendar. B passes.

### 8.5 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 3 | 4 | 3 | 2 |
| Accessibility (25) | 3 | 5 | 3 | 2 |
| Error prevention (20) | 2 | 5 | 3 | 3 |
| Business (15) | 3 | 4 | 3 | 3 |
| Efficiency (10) | 3 | 4 | 3 | 3 |
| Cost (5) | 5 | 3 | 3 | 2 |
| **Total** | **2.90** | **4.40** | **3.00** | **2.45** |

### 8.6 Selected
**B.** Status is one `Tag` (administrative status per the design system rule) with a shared map and these words, needing content sign-off: Requested, Booked (shown as text in patient lists, not hidden; sr-only only in dense clinician tables where every row is booked), Checked in, In progress, Completed, **Cancelled by you** (patient audience) or **Cancelled by the patient** (staff audience), **Cancelled by the clinic**, **Did not attend** (both audiences; "Missed" dropped as it reads as blame in a patient screen [Judgement]). Visit type words: "Initial evaluation", "Follow-up", "Video follow-up" (both audiences). Clinical-urgency states such as "In progress" may use the chip form only where already specified; the default is `Tag`. A rescheduled visit links to its replacement ("Moved to Fri Nov 27, 9:00 AM") using `rescheduledToId` [Prior F].

### 8.7 Spec: `AppointmentRecord`
- **Anatomy:** time range with zone (CD-314), visit type, therapist or patient name (audience), status `Tag`, optional reason (clinician only), row actions (Reschedule, Cancel for patients while allowed; Open record for staff).
- **States:** upcoming, today (text "Today" label), in progress, past completed, cancelled (muted, word Cancelled), no-show, rescheduled-from (link to replacement), long names, missing therapist, loading skeleton, error, permission restricted (staff without `appointment.read` see nothing).
- **Behaviour:** the whole row is not a click target; primary link and action buttons are real controls. The reason is never shown to the patient in lists and never in exports.
- **Keyboard and screen reader:** native list or table semantics; action names carry the date ("Cancel visit on Fri Nov 20"); status read as text.
- **Responsive:** row layout stacks below 600; status stays beside time. **Data:** appointment, slot, therapist, patient. **Testing:** wording snapshot across five call sites; axe; every status fixture; reschedule link.

## 9. Decision: cancel and reschedule flows (CD-318)

### 9.1 Task and constraints
Cancel or move a visit with low friction at a moment the patient may feel bad. The contract makes the cancel reason optional; the dialog currently blocks submission when it is empty [Prior F section 5]. High-impact action: needs a focused confirmation. Zocdoc help: cancel or reschedule from email, web or app card, no reason mentioned [Prior F]. CVS Health puts "Cancel or reschedule easily" as a first-level shortcut [Prior F].

### 9.2 Alternatives
A. Dialog with required reason (current). B. Dialog with optional reason and equal-weight "Keep this visit". C. One-tap cancel with undo toast. D. Full-page flow.

### 9.3 Selection
C fails: cancelling frees a slot others can take, so an undo cannot be honest. D is too heavy for a two-choice action. B selected (scores task, accessibility, error prevention, business, efficiency, cost: A 3,4,3,3,3,5 = 3.35; B 5,5,5,4,4,5 = 4.75; C 3,3,1,3,5,4 = 2.85; D 2,4,4,3,2,2 = 3.05 [heuristic]).

Spec: title "Cancel this visit?", the visit time and therapist stated in the dialog, "Tell your care team why (optional)", primary danger button "Cancel visit", equal-weight secondary "Keep this visit", initial focus on "Keep this visit" [Judgement: safest default], Escape means keep, success shown in the appointments list as a Banner "Visit cancelled. The time is open for others." (also announced) and the visit appears in Past with its status. Failure: "We could not cancel that. Your visit is unchanged." Within 24 hours or policy text: only when the clinic record supplies it; none invented. Reschedule reuses CD-310 with "Your current visit is unchanged until you confirm."

## 10. Decision: date input in schedule navigation (CD-319)

### 10.1 Task and finding
Clinician jumps to a date. `DayStepper` uses a native `<input type="date">` plus Previous, Today and Next [Code]. Brief section 7 asks to treat birth-date entry and future-appointment selection separately; birth date belongs to the clinical-inputs family, not here. Patients never type a date to book (they choose from open times).

### 10.2 Alternatives
A. Keep native date input with the stepper. B. APG-style date picker dialog with a grid. C. Stepper only. D. Typed text date with format hint.

### 10.3 Gates and selection
Native input: browser-provided, keyboard and screen-reader behaviour comes from the platform, compact, no new component; its accessible name and format come from the browser locale. APG's own date picker page states its example code is not production-ready and needs assistive-technology testing [Observed], so B costs a custom grid for a small gain. C removes long jumps. D adds error handling for a rare action.
Scores (task, accessibility, error prevention, business, efficiency, cost): A 4,4,4,3,4,5 = 3.90; B 4,3,4,3,3,1 = 3.35; C 2,5,4,2,2,5 = 3.30; D 3,3,2,3,3,4 = 2.85 [heuristic].

Selected: **A**, with a visible label "Go to date" and the day shown as text ("Thursday Nov 20") so the input's own rendering is not the only display. Revisit only if testing shows the native control fails on the clinician's browsers.

## 11. References and inaccessible sources
Retrieved today: WAI-ARIA APG date picker dialog and table patterns; WCAG 2.2 Understanding 2.5.7 and 2.5.8; Carbon data-table usage; Mobbin screens cited. Not retrievable or no relevant content: Material 3 date pickers (JavaScript shell, no content); Apple HIG (fetch failed); NN/g and Baymard calendar and booking pages (not located); Fluent, Spectrum, Polaris not reached for this family; MyChart, Epic, Tebra, Headway, MedBridge, Sword and Hinge Health booking screens (no public screens). Prior-research references (Zocdoc, Calendly help, Google Calendar help, One Medical, CVS Health, WebPT dashboard) are carried from the F and H feature research and are labelled [Prior].
