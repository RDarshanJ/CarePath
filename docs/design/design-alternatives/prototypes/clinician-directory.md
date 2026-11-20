# Prototype spec: clinician directory, three layouts

Status: specification only. Nothing here is built; prototypes are rendered after the visual direction is chosen (protocol). Research: `docs/design/component-research/09-tables-search-filter.md` sections 1 to 5 and 10; decisions CD-330, CD-331, CD-332, CD-333, CD-334, CD-339. Brief section 20: "three different clinician directory layouts", identical content, data, tokens and screen sizes; only the structure under test changes. Colours are not chosen; the prototypes use whatever semantic tokens the chosen direction defines, identically in all three.

## What is held identical

**Data.** One synthetic fixture of 87 patients, served by the same mock of `GET /patients` (cursor pages of 25, filters, sort on name, status and last activity only). The fixture must include: a very long name and a very short one; two patients with the same family name; names with a hyphen and an apostrophe; a patient with no next visit; a patient with no care plan; a patient with a draft over a published version; a patient awaiting assignment; a discharged patient; a patient with three open review tasks; a patient with no activity for 20 days; one clinician with a long name. All names are invented; no real person's data. Counts shown (87, 25 per page, 6 pages) are properties of the fixture, not results.

**Fields per patient.** Name, MRN (monospace token role), status, clinician, plan stage using the CD-305 four words, last activity, next visit with the clinic zone named once in the header, open reviews. Administrative view additionally: intake status and missing-intake text.

**Behaviour held constant.** The same search (labelled "Search patients", `/` focuses, no `q` in the URL), the same six filters, the same view presets (CD-332), the same result count text, the same empty, loading and error states, the same cursor paging with `TablePagination`, the same "Back to results" restoring filters, sort, page and search, the same row actions (open record, open care plan builder, open appointments).

**Environment.** Clinician theme only; same type scale; widths 1920, 1440, 1024, 768, 390 and 375; light theme; keyboard and touch; 200 percent zoom check; reduced motion.

**Tasks (scripted, same for every layout).**
1. Find "the patient named Okafor-something" from a spoken surname (exact retrieval).
2. Find all patients with no activity in 14 days who have a published plan.
3. Open the care plan builder for a specific patient.
4. From a record, return to the list and continue from the same place.
5. A coordinator finds patients awaiting assignment (administrative view).

## What differs

| | Layout A: dense table with views | Layout B: master-detail | Layout C: searchable stacked list |
|---|---|---|---|
| Structure | One table, sortable headers, row menu, filters in a collapsible panel with chips, view pills | Left list (name, status, one signal line), right pane with the selected patient's summary (plan stage, last activity, next visit, open reviews, latest pain via the existing `PainText`) and "Open record" | One column of single-line rows (name, status when notable, one signal line, trailing menu); search always on top; filters in the same inline panel |
| Comparison across attributes | Columns; sort | Not possible beyond the list line | Sort by Select; one signal line only |
| Detail without leaving | Peek drawer on demand | Always visible pane | Peek drawer on demand |
| Width behaviour | Columns drop at 1024 and 768; stacks below 768 into Layout C | Pane becomes a full-screen detail below 1024 (list or detail) | Same at every width |
| PHI on screen at once | Rows only | Rows plus one patient's summary | Rows only |

Not varied: filter pattern, search, pagination, row actions. If a layout needs a different component to work (B needs a summary fetch per selection), that is recorded as a cost, not smoothed over.

## Evaluation plan (not run)

No participant results exist and none are claimed. Planned: (1) a heuristic walk-through with the brief section 19 criteria and the weights in the research file; (2) a scripted keyboard-only run of tasks 1 to 4 counting Tab stops and key presses per layout; (3) axe on each layout at each width; (4) timed tasks 1 to 5 with PTs and a coordinator once participants exist, recording time, errors, backtracks (opening the wrong record) and a confidence rating. Success measures are the metric names in feature research I section 3; targets are not set.

Decision rule before looking at results: keep Layout A unless B or C wins tasks 1 and 2 on both time and backtracks and causes no accessibility gate failure. Record the outcome in CD-330.

## Gates specific to the prototypes

Native table in A; list and detail focus management in B; no layout may put a patient name in a URL or document title beyond the existing record title; no layout may offer a clinical bulk action; B must pass the minimum-PHI rule for its summary pane.
