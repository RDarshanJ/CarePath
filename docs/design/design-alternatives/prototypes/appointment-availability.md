# Prototype spec: appointment availability, two approaches

Status: specification only; not built. Research: `docs/design/component-research/04-scheduling-calendar.md` and `docs/design/feature-research/F-scheduling.md`, `H-clinician-workspace.md`; decisions CD-310, CD-312, CD-313, CD-314, CD-315. Brief section 20: "two approaches to appointment availability"; section 15: different patterns for different roles, so each approach is specified once per role and the roles are judged separately. Colours not chosen.

## The two approaches

| Role | Approach 1: lists | Approach 2: calendars |
|---|---|---|
| Patient (find and book) | Earliest-times shortlist, then day-grouped time list with filters (CD-310, selected) | Month calendar with open dates marked and a time list for the chosen date; zone shown beside the times |
| Clinician (understand the day) | Day agenda table with open-time rows and a seven-day count strip (CD-312, selected) | Day timeline on an hourly axis with appointment blocks and open blocks, a week-switching date stepper |
| Admin (manage capacity) | Per-therapist day-grouped slot list with an add-times form and row actions (CD-313, selected) | Week grid editor where times are added by choosing cells, with a list alternative |

Approach 1 is the recommendation in the research; Approach 2 exists so the recommendation is compared, not assumed. For the admin calendar approach a recurring-rule editor is out of scope (C2).

## What is held identical

**Data.** One synthetic clinic in one time zone with a fixed anchor instant; three therapists; four weeks of slots: mostly 45 minute slots on weekdays, a therapist with a gap day, a blocked lunch hour, a day fully booked, a day with a single open slot, and a day crossing a daylight saving change; 30 appointments in all statuses (booked, checked in, in progress, completed, cancelled by patient, cancelled by clinic, did not attend, one rescheduled with its replacement) of types initial evaluation, follow-up and video follow-up; a patient whose intake availability is Monday and Wednesday mornings; one patient viewer in a different zone for the video case. The mocks implement the real API shapes: future open slots only for patients, empty days omitted, at most 31 days, 409 `booking_conflict` on a chosen slot in one scripted run. All names invented.

**Components held constant.** `SlotButton`, `ToggleChip`, `AppointmentRecord` and its status words (CD-311, CD-317), `formatVisitTime` and its zone rules (CD-314), the conflict notice (CD-316), the cancel dialog (CD-318), table and list primitives.

**Environment.** Patient: patient theme at 375, 390, 768, 1024; clinician and admin: clinician theme at 1024, 1440, 1920; keyboard-only; 200 percent zoom; reduced motion; both themes' target sizes.

**Tasks.**
- Patient: book the soonest morning follow-up; hit a conflict and recover; move a visit; cancel a visit; book a video visit while the device is in another zone.
- Clinician: say how many visits are booked on Thursday and where the longest open gap is; open the patient for the 2 pm visit; identify a cancelled visit and a did-not-attend visit; navigate to next week.
- Admin: add six 45 minute times for a therapist on Monday; try to remove a booked time; block an hour; judge which therapist has the least open time next week.

## What differs and what it costs

Approach 2 needs new components with no existing equivalent: a month grid with the APG keyboard model (arrow keys by day and week, Page Up and Page Down by month, one cell in the tab sequence, polite month heading, full day names), a timeline with a text equivalent for every block, and a week grid with cell semantics and a list alternative. Approach 1 uses buttons, headings, tables and forms. Record these costs; they are not hidden by the prototype.

## Evaluation plan (not run)

No participant results exist and none are claimed. Planned per role: heuristic scoring with the research weights; scripted keyboard-only runs counting key presses; axe and screen reader pass on each; time and error counts for the tasks above once participants exist, with the patient measures being time to a confirmed booking and recovery from the conflict, the clinician measures time to answer the two day questions correctly, the admin measures time to add times and whether the booked-removal block was understood. Targets not set.

Decision rule before results: keep Approach 1 for a role unless Approach 2 is clearly faster and no worse on accessibility for that role. A different outcome per role is allowed and expected to be possible; record it in the role's decision record.

## Gates specific to the prototypes

Patients never see past or booked slots; every time carries a zone in its container; no drag in any calendar; every calendar has a list alternative; nothing is unavailable by colour alone; no confirmation before the server confirms; availability editing prototypes may not claim a write API exists.
