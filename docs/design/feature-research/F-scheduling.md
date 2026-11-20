# Feature F: Appointment scheduling

Status: provisional until advisor sign-off. Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 F. Access date for every external source: 2026-11-20. No colours are chosen here.

## 1. User problem

A patient needs to find a visit time that fits their week with their own therapist, confirm it without surprises, and move or cancel it later without friction or guilt. The clinic needs the slot filled, kept, and never double booked. A pretty calendar is not the problem; finding a workable time quickly, knowing what time zone it is in, and recovering when someone else took the slot are.

## 2. User and context

- Who: an assigned patient (the API only lets a patient book with a therapist on their care team). New patients book an initial evaluation; returning patients book a follow-up, in the clinic or by video. [Assumption from PRD Scenario E; no participants used.]
- Device and state: phone first, between other tasks. May be in pain or have limited transport options, which makes day and time-of-day constraints real (intake already asks for availability).
- Frequency: a handful of times over an episode of care; reschedule and cancel are rarer but high stress.
- Other roles: coordinators can book for any patient; therapists and admins read appointments but do not book or cancel (`appointment.read`).

## 3. Business objective

Fill clinician capacity and reduce lost visits, while keeping patient choices visible and fair (no dark patterns, brief section 9).

Metric names only: booking completion rate; time from opening Book a visit to a confirmed booking; share of bookings that hit `booking_conflict` or `slot_unavailable`; reschedule versus cancel rate; late cancellation rate and no-show rate; slot utilisation per practitioner; share of patients with a booked visit within a set window after assignment.

## 4. Constraints

Functional (from `scheduling.ts` and `api-phase3.md` section 10):

- `GET /practitioners/:id/slots?from&to&type` returns open slots grouped by clinic-zone day, at most 31 days, only future open slots, empty days omitted. Appointment types: `initial_evaluation`, `follow_up`, `video_follow_up`. A slot lists the types it supports. The appointment always takes the whole slot (no duration choice).
- `POST appointments` takes `slotId`, `type`, optional `reason`; a slot taken in the meantime answers 409 `booking_conflict`; a past or blocked slot answers 409 `slot_unavailable`. Overlapping bookings by the same patient with another clinician are rejected (AC-E3).
- `reschedule` is cancel plus book in one transaction; if the new slot is taken the original stays (AC-E7). Cancel takes an optional reason (the contract makes it optional; see section 5).
- Statuses: `requested` exists in the lifecycle but no workflow creates it (C1 ruling 3.3), so "request a time" is not available. `booked`, `checked_in`, `in_progress`, `completed`, cancelled by patient or clinic, `no_show`.
- Time: instants are UTC; the API names the clinic zone in every response. PRD REQ-APT-03 says the web shows times in the viewer's zone and names it; the current booking flow shows times in the clinic's zone and names it. That is correct for an in-person visit; it needs a decision for video visits (section 8).
- Missing: no cross-practitioner "earliest available" endpoint, no waitlist or "notify me" for no availability, no visit duration or location field on `Appointment`, no cancellation-policy or late-cancel field, no preparation text, no calendar export endpoint. Checkpoint C2 scoped "no calendar grid, no drag".
- A care team can contain more than one therapist; `therapistsOf(team)` already handles one or many.

Technical: slot reads are one request per practitioner per range; an "earliest" shortlist for one practitioner needs one request; across several practitioners, one request each (small N).

Safety and privacy: appointment type and reason are health information; reason text is shown to the care team ("Your therapist will see this before the visit"). Confirmation emails and calendar exports must not include the reason or clinical detail. Reminders may include time and place only.

Accessibility: time slots as buttons with the full date available to screen readers (existing `sr-only` date); targets at least 24 by 24 px (SC 2.5.8); focus moved to the confirm heading or the conflict notice after a state change; conflict, loading and success announced politely; time zone stated as text at every time; no drag-only action; keyboard alternative for any grid.

## 5. Current CarePath implementation

Read: `appointments/page.tsx`, `appointments/book/page.tsx`, `appointments/[appointmentId]/reschedule/page.tsx`, `_components/booking-flow.tsx` (596 lines), `cancel-visit.tsx`, and screenshots `docs/screenshots/4.3a/e01` to `e06`, `e10-just-taken-*`.

What exists: Appointments page with Book a visit, Upcoming and Past lists, reminder banner when the visit is today or tomorrow, success banners after booking, moving or cancelling. Booking is a two-step flow: (1) therapist (card, or radio if several), visit type (radio with a one-line hint each), a day-of-week and time-of-day filter preselected from the availability the patient gave at intake, then open times grouped by day as buttons with "Show later days"; (2) confirm with a summary and a "what would you like to work on" field. A conflict shows "That time was just taken", states nothing was booked, and offers the closest open times as buttons while keeping selections. Reschedule reuses the flow and states the current visit and that it is replaced. Cancel opens a dialog and requires a reason.

Strengths: slots visible before commitment; intake availability reused; conflict recovery with nearest alternatives; atomic reschedule messaging ("Your current visit is unchanged"); time zone named; no empty-day clutter; plain empty states.

Weaknesses:

1. Entry is browse-first. Even when the preselected filter shows a good time on the first day, the patient sees a page with a therapist card, a type radio, a filter panel and then times. The "first suitable time" is about a scroll and a half down at 390 px (e03 capture).
2. The filter panel (two sets of chips, plus helper text) is heavier than the thing it filters at 390 px.
3. Cancel requires a reason. The contract says optional; the dialog blocks submission when it is empty, adding friction at the moment a patient is most likely to feel bad about cancelling.
4. No cancellation or rescheduling expectations are shown before confirming (nothing is defined in the data; if the clinic has a policy it is not surfaced).
5. Confirmation lacks what Zocdoc and Calendly provide: add to calendar, what to bring, where to go, how to join a video visit. The data model has none of these fields today.
6. Time zone: clinic zone only; a patient travelling for a video visit sees clinic time with no local equivalent.
7. Upcoming visit cards repeat the same small block for every status; "Today" and "Tomorrow" are only in the banner.
8. A "no open times" state tells the patient to contact the care team, but offers no notify-me or waitlist (not in the contract).
9. After a reschedule, the replaced visit appears under Past as cancelled with no link to its replacement (the contract has `rescheduledToId`).

## 6. Production references observed

Mobbin access: reachable (iOS and web). Preview frames only (evenly spaced samples of each flow). Links are Mobbin pages, not copies of images.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Zocdoc | iOS | "Booking an appointment" (and related Zocdoc flows returned in the same search, including "Provider detail") | https://mobbin.com/flows/fcd6461e-af19-4ca9-9864-8b21c286888c | [Observed] Provider page with "I'm a new patient" checkbox, an office selector noting "2 more locations with availability soon", a day heading ("Tomorrow") with time pills and "View more availability". Dates with none read "No available appointments". A no-availability provider shows "No upcoming availability" with a "Notify me" button. Review and book: "Secure Booking" label, patient selector (self or someone else), insurance, visit reason, phone number, optional notes to the office, a certification checkbox, and a sticky "Book appointment". An inline red error reads "A valid address is required to book with this doctor". Confirmation: "Appointment booked!" with the date, time and zone (EDT), "Add to calendar", "Prepare for appointment", then cross-sell exam cards. Appointments tab: "Up next" card with date, time, clinician, reason and a map, plus "Book an appointment". |
| Zocdoc | web | Patient help: reschedule or cancel | https://www.zocdoc.com/patient-help/en/articles/8724732-how-do-i-reschedule-or-cancel-my-appointment | [Observed, help text] Cancel or reschedule from the booking email link, the website, or the app appointment card; changes can't be made during the appointment time; an email confirms the change. The article itself notes a "Prepare for Appointment" button does not lead to cancel, so the email or app is more reliable. No cancellation reason is mentioned. |
| Google Calendar | iOS | "Creating an event" and "Creating a task" | https://mobbin.com/flows/3cf4f9cb-56db-467c-8db6-121d0ae9b561 | [Observed] Event sheet: title, event/task/birthday switch, all-day toggle, start and end date and time, a time zone row ("Western Indonesia Time" appears after changing the start), repeat, calendar chips, guests, video conferencing, location, a default "30 minutes before" notification. Day view with a plus button. Event detail shows title, time and repeat, join link, location, reminder, guests, and Yes/No/Maybe RSVP. A calendar-first model: the user picks the time, nothing is offered. |
| Google Calendar | web | Help: appointment schedules | https://support.google.com/calendar/answer/11608416 | [Observed, help text] A bookable page of your available times can be shared by link or embedded; slots close when you are busy, preventing conflicts; booked appointments appear on your calendar; email reminders are a paid feature. The page does not mention buffers, time zones or rescheduling. |
| Calendly | web | "Booking a meeting" | https://mobbin.com/flows/e0e18051-aa17-465a-8fe5-851659cc774b and https://mobbin.com/flows/0641d89b-eff4-498d-ab73-fa3011aa301c | [Observed] Two-pane booking page: meeting details (duration, location, host with a time-zone badge) on the left; month calendar with "Time zone display" selector and a prompt "Select a date to book" on the right (available dates highlighted); invitee name and email; "Contact questions" count ("1 / 1 questions answered", with a "View" link); a "Book meeting" button; toast "Event booked. A notification has been sent." Host side: event types with durations and "Weekdays, 08:30 - 16:30", a Create menu (one-on-one, group, round robin, collective, one-off meeting, meeting poll). |
| Calendly | web | Help: time zones | https://calendly.com/help/time-zones-overview | [Observed, help text] The invitee's time zone is detected and availability is shown in their local time, with a dropdown to change; events appear on the invitee's calendar in their zone; for in-person events an event type can be locked to one zone tied to the location; times adjust across daylight saving changes; confirmation and reminder emails show the correct zone. |
| One Medical | iOS | Not on Mobbin | https://www.onemedical.com/same-day/ | [Observed, official page text] Same- or next-day booking, "start on time", app for booking, renewals and messaging; the page does not describe booking steps and gives no availability guarantee or wait times. No interface inspected. |
| CVS Health | iOS | "Your health" | https://mobbin.com/flows/0e18922d-3828-4693-8da1-4a6a3bca9a1c | [Observed] A service card "Cancel or reschedule easily. Life happens. We'll fit to your schedule." as a first-level shortcut on the health home, alongside "Need care? Schedule an in-person or virtual visit today." |
| Hinge Health | iOS | Not on Mobbin | https://help.hingehealth.com/en/support/solutions/articles/155000002532-where-do-i-access-my-exercises- | [Observed, help text] The first video visit with a physical therapist is scheduled from the My Care tab and is required for full programme access. No screens inspected. |
| Not accessed | | MyChart (booking), Headway, Tebra, WebPT, MedBridge, Sword scheduling (the App Store listing does not describe scheduling) | | Not found on Mobbin in today's searches; no screens inspected. The earlier project research (`docs/research/mobbin-patterns.md` section 10 and 11) lists Calendly and other desktop calendars; those were not re-observed beyond the above. |

## 7. Established patterns

1. Show times before asking for commitment. Zocdoc, Calendly and CarePath all place slots before the form. It works because it avoids a form-then-fail.
2. The soonest time is the headline. Zocdoc shows "Tomorrow" and the first pills with "View more availability"; empty days are shown as text or collapsed. Patients scan for "soonest that works", not for a calendar.
3. Constraints are filters, not forms. Calendly lets the invitee change the zone; Zocdoc has location and in-person or video switches.
4. Time zone is an explicit, changeable control for remote meetings, and fixed to location for in-person (Calendly help). Zocdoc's confirmation prints the zone (EDT).
5. A short review step with the essentials, a sticky primary button, and optional notes (Zocdoc). Fields that exist only for the business (insurance, certification) make it long; CarePath has fewer fields.
6. Confirmation offers the next useful thing (add to calendar, prepare) and a management path (email link, app card). Zocdoc's help confirms several routes to change a booking.
7. A no-availability state that offers a way forward (Zocdoc "Notify me"). Calendars without it (Google, Calendly invitee view) leave the user to try later.
8. Failure modes: cross-sell after confirmation (Zocdoc) distracts; calendars that only record events (Google Calendar create) offer no help finding a free clinic slot; long single-page forms; no stated consequence for cancelling.

## 8. Alternatives

Evidence labels: R = research evidence observed above; J = expert judgement; U = untested assumption.

### F1. Guided booking flow with filters (current model)

- Problem addressed: book a visit step by step, with the type and filters first.
- Interaction model: therapist, type, filters, open times by day, confirm.
- Benefits: familiar; already built and tested; handles conflicts and reschedule.
- Limitations: slow to the first good time; filter panel is heavy on a phone; cancel friction.
- Accessibility: good (buttons, headings by day); the filter chips are toggle buttons with text.
- Business: neutral; the number of steps may suppress conversion in busy hours [U].
- Technical: done.
- Error and recovery: conflict notice with nearest alternatives; "no times match" with "Show every day and time".
- Evidence: R (Zocdoc, Calendly flows), existing ACs.

### F2. Earliest-availability recommendations, then full list

- Problem addressed: patient wants "the soonest time that fits me", not a browse.
- Interaction model: on opening Book a visit, a short "Earliest times that fit you" list (three options: for example "Fri Nov 20, 9:00 AM", "Mon Nov 23, 8:00 AM", "Wed Nov 25, 8:00 AM") for the default type, computed from the intake availability, with "See all times" opening the existing day-grouped list and filters. Choosing one goes to the confirm step. If nothing fits the intake filter, show the earliest unfiltered with "These are outside the days you gave" so nothing is hidden.
- Benefits: first good option is above the fold; keeps the full list for flexibility; no new data needed for one therapist.
- Limitations: "earliest" is not "best" (could cluster at a clinic's least convenient times); a fixed three can hide choice; if several therapists exist, shortlist merges several slot requests; must not steer patients to a therapist for utilisation reasons without saying so (brief section 9).
- Accessibility: three buttons plus a link; same pattern as existing chips; reading order is clear.
- Business: likely reduces time to book and unfilled near-term slots (utilisation) [U]. Must label why a time is suggested.
- Technical: low. One slots request (default range) per practitioner; sort by `startsAt`; apply intake filter client-side. Cross-practitioner "earliest" needs N requests. No API change required for the shortlist.
- Error and recovery: same as F1; if the shortlist time is taken at confirm, the conflict banner offers the next nearest times (existing). If slots fail to load, "Open times did not load" with Try again.
- Evidence: R (Zocdoc "Tomorrow" first, "View more availability"); J (shortlist plus full list).

### F3. Week calendar grid

- Problem addressed: see the whole week and the shape of availability.
- Interaction model: 7-day grid, open slots as cells, today marker, prev and next week, zone selector. On phone it becomes a one-day view with a week strip.
- Benefits: shows open versus unavailable time; familiar from Calendly's week and Google Calendar; helps patients who need to work around other commitments.
- Limitations: patients do not own a "free time" view of the clinic; many empty cells; on 375 px a grid is cramped; keyboard grid navigation is complex; C2 scoped no calendar grid; Google and Calendly show the user's own calendar, which CarePath does not have.
- Accessibility: needs a grid role, arrow-key navigation and a list alternative; day-of-week abbreviations need full names for screen readers.
- Business: neutral.
- Technical: medium; same slot data; grid layout and navigation are new components.
- Error and recovery: conflict handling same; stale cells after a slot is taken need refresh, which a list handles more gracefully.
- Evidence: R (Calendly, Google Calendar frames); J (fit for patients).

### F4. Provider-first scheduling

- Problem addressed: choose who first, then when.
- Interaction model: therapist cards (profile, credentials, next available), then that therapist's times.
- Benefits: good when a patient can choose from many providers (Zocdoc).
- Limitations: CarePath patients book with their assigned team; most have one therapist, so the step is empty; a provider list invites cherry-picking that harms continuity of care and clinician utilisation.
- Accessibility: fine.
- Business: weak for this product; supports utilisation only when a team has several therapists.
- Technical: low (already supported when `therapists.length > 1`).
- Error and recovery: same.
- Evidence: R (Zocdoc is provider-first because it is a marketplace); J (does not fit the care-team model).

Also considered and not scored: "Request a time" (patient states a window, clinic confirms). The `requested` status is not wired, there is no clinic confirmation workflow and no response-time promise can be made, so it cannot be offered honestly now.

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| F1 | Pass | Pass (reason shown only to care team, said at the field) | Pass (no clinical advice; conflict never loses a booking) | Eligible |
| F2 | Pass | Pass (suggestion uses intake availability, which the patient already gave; show the basis: "Based on the days you told us") | Pass | Eligible |
| F3 | Pass only with grid semantics, arrow keys and a list alternative | Pass | Pass | Eligible with conditions (a list must exist; on mobile it degrades to a list) |
| F4 | Pass | Pass | Pass | Eligible |

## 10. Weighted evaluation

Weights adjusted: task 25, safety/privacy/trust 15, usability/accessibility 20, business 10, operations 15, technical 10, design system 5. Reason: the brief names clinician utilisation and flexibility as explicit scheduling criteria, so operations gets 15; the mandatory gates already cover safety and privacy, so that weight drops to 15; technical rises to 10 because contract limits matter more here.

| Criterion | F1 | F2 | F3 | F4 |
|---|---|---|---|---|
| Task effectiveness (25) | 4: works, first good time one scroll down | 5: best time in first view | 3: shows the week, slower to a time | 3: extra step for most patients |
| Safety, privacy, trust (15) | 4: gates met | 4: must explain the suggestion basis | 3: weak on a phone, grid risk | 4 |
| Usability, accessibility (20) | 4 | 4: simple buttons and a link | 3: grid cost and mobile cramp | 3 |
| Business value (10) | 3 | 4: less time to book, fuller near-term slots [U] | 3 | 3 |
| Operations (15) | 3: no steering | 4: nudges to earliest slots, which helps utilisation | 3 | 3: spreads load only if choice exists |
| Technical (10) | 5: built | 4: client-side derive, N requests for several therapists | 3: new grid | 4 |
| Design system (5) | 5 | 5: chips and sections exist | 2: no grid component | 4 |
| Weighted total (out of 5) | 3.90 | 4.30 | 2.95 | 3.30 |

Arithmetic: F1 = (25x4 + 15x4 + 20x4 + 10x3 + 15x3 + 10x5 + 5x5) / 100 = 3.90. F2 = 4.30. F3 = 2.95. F4 = 3.30. Judgement scores; no measured outcomes exist.

## 11. Recommendation

Select F2: lead with "Earliest times that fit you" (three buttons, with the reason stated), then the existing filters and day-grouped list underneath or behind "See all times". Keep the two-step confirm, the conflict recovery and the atomic reschedule exactly as designed. Runner-up: F1 (current flow) because F2 is F1 plus a shortlist; if the shortlist proves confusing in testing, falling back to F1 costs nothing.

Why F2 beats F1: it removes the scroll and the filter panel from the common path, while the full list stays one tap away. Why it beats F3: no new component, better on a phone, no grid accessibility burden, and the patient does not have a calendar to overlay anyway. Why it beats F4: continuity of care. Rejected: F3 as the default (a week view can be considered as an optional desktop layout later), F4 for single-therapist teams, "request a time".

Decisions that go with it (each backed by section 5):

- Cancel reason becomes optional in the UI to match the contract. Ask once with a short pick-list or free text, never blocking ("Tell your care team why (optional)").
- Time zone: keep clinic time for in-person visits, name it at every time. For video follow-ups, show the visit in the clinic zone and add the patient's local time when the browser zone differs. Needs a decision from the advisor on REQ-APT-03.
- Confirmation shows what the data supports: date, time, zone, therapist, type, "Add to calendar" (a downloadable event with time, therapist name and no reason text), and "Change or cancel this visit". Do not invent location, prep or policy text; add those only when the clinic record supplies them.
- No cross-sell or promotional cards after booking.
- "Notify me" for no availability is out of scope until an API exists; for now, the empty state links to Messages and the clinic phone.

Trade-off: the shortlist nudges toward the earliest slots. That helps utilisation and speed but can hide a later preferred time. The line "Based on the days you told us" plus "See all times" keeps the choice visible.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Assigned patient booking, moving or cancelling a visit |
| Job to be done | Get a visit time that works, soon, and change it without penalty or confusion |
| Pain point | Browse-first flow, heavy filters, forced cancel reason, no add-to-calendar, clinic zone only for video visits |
| Business objective | Higher booking completion and fuller clinician schedules without steering or dark patterns |
| Functional requirement | REQ-APT-01, REQ-APT-03, REQ-APT-04, REQ-APT-05; AC-E1 to AC-E8 |
| Success metric | Booking completion rate; time to booked; conflict rate; reschedule versus cancel; no-show rate; utilisation (names only) |
| Design hypothesis | If the best-fitting earliest times are the first thing on the booking screen, patients book faster without losing access to other times. [Untested] |
| Selected pattern | F2 earliest-times shortlist, then guided list (F1) |
| Technical dependency | Slots endpoint; intake availability; optional future: calendar export, notify-me, location and prep fields |
| Validation method | Task test with synthetic scenarios (book the soonest morning follow-up; move it; cancel it), 50-parallel-request conflict test already in AC-E1, conflict-state walkthrough, screen-reader walkthrough of the shortlist and list, time zone check across a daylight saving boundary (AC-E5) |

## 13. States to design

| State | Microcopy | Recovery or action |
|---|---|---|
| Default | "Earliest times that fit you. Based on the days you told us." | Choose a time |
| Hover, focus, active, selected | Standard states on time buttons; selected shows "Selected" in text, not colour alone | n/a |
| Loading | "Loading open times" (skeleton, polite) | None |
| Empty (no availability in range) | "Terry has no open follow-up times in the next 2 weeks. Try another visit type, message your care team, or call the clinic." | Messages link, clinic phone |
| Empty (filters exclude all) | "No open times match the days you picked. There are 7 on other days." | "Show every day and time" |
| Partial data | Shortlist from one therapist loaded, another failed: "Could not load Sam's times. Try again." | Retry per therapist |
| Validation error | Reason over 500 characters: "Keep it under 500 characters." | Edit |
| Conflict | "That time was just taken. Nothing was booked." plus nearest times | Choose another |
| Slot unavailable | "That time can no longer be booked." plus nearest times | Choose another |
| Server error | "We could not book that. Nothing was changed. Try again." | Retry |
| Network loss | "You are offline. Nothing was booked." | Retry on reconnect |
| Permission denied | "You can book once a therapist is assigned to you." | Contact care team |
| Success | "Visit booked. Fri Nov 20, 9:00 AM to 9:45 AM, Mountain Standard Time." | Add to calendar; Change or cancel |
| Cancellation | "Cancel this visit?" "Tell your care team why (optional)." Button "Cancel visit"; keep "Keep visit" as the equal-weight alternative | Confirm; after: "Visit cancelled. The time is open for others." |
| Reschedule | "Choose a new time. Your current visit is unchanged until you confirm." | If new slot taken: "Your visit is unchanged." |
| Interrupted workflow | Browser back from confirm keeps type, filters and chosen time | Resume |
| Stale information | "Times updated 9:12 AM" with refresh | Refresh |
| Unsaved changes | Leaving confirm with text in the reason field: "Leave without booking?" | Stay or leave |
| Visit today | Banner "Your visit is today at 2:00 PM" | See details |

## 14. Responsive behaviour

- 375, 390: single column. Shortlist first, then "See all times" disclosure; filters collapse under a "Change days and times" button; times as wrapping buttons; confirm is a separate step with a sticky primary button.
- 768: same flow, times in a wider wrapping grid; filters visible.
- 1024: two panes: choices (type, filters) on the left, times on the right; shortlist stays on top of the right pane; confirm opens as a side panel or the second step as now.
- 1440: same two panes with a larger measure; optional week view toggle can be evaluated here (F3) once the list is proven.
- 1920: centred at a maximum width; no extra panes.
- What changes model: only the optional week view at 1024 and above; the phone model stays a list.
