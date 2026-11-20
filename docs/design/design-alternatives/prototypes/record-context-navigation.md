# Prototype spec: patient context in the clinician record (CD-503, CD-504)

Status: spec only, not built. Prototypes are rendered after the visual direction is chosen. Research: `docs/design/component-research/14-navigation.md` section 6.

## Question
How should patient identity and section navigation be arranged so a therapist always knows which patient they are in, can see what is not recorded, and moves between sections without losing place?

## Alternatives to render
- A: sticky identity strip plus section tabs (current structure with the strip made compact).
- B: persistent summary column from 1280 px (identity, care team, current-state lines, "Not recorded" block, one "Record as of" stamp) with a sticky compact strip below 1280 px, plus the same section tabs.
- C: breadcrumbs plus a vertical section list (only to show why it duplicates the app sidebar).

## Identical across alternatives
- Patient: one synthetic patient with a long surname and a second patient with the same surname and a different MRN and birth date, so wrong-patient risk can be judged.
- Content: the same Timeline, Plan, Check-ins, Appointments and History data; one section with missing data (no check-in for 9 days) and one with a load error.
- Tokens: the same two-theme token set, IBM Plex Sans scale from `typography-exploration.md`, the same Tabs, Tag, Button components.
- Viewports: 375, 768, 1024, 1280, 1440.
- Tasks: open a record from a review task and return; switch to the second patient; open the care plan builder and come back; read what is unknown about the patient.

## What differs
Only the arrangement of identity and summary (strip versus column versus breadcrumbs) and where the "Not recorded" block and the stamp live.

## What to look at
Does the patient name stay visible and unobscured at 400 percent zoom and with focus on a table row; can the wrong patient be acted on after a switch; are absence and freshness found without scrolling; number of section switches per task; keyboard order. No participant data is claimed from this exercise unless real participants are used.
