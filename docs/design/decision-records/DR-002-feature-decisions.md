# DR-002: Feature decisions (design checkpoint D1)

Date: 2026-11-20. Decider: lead advisor. Status: decided, except the items listed in section 4, which stay open and must be stated as open in the product and its docs.
Inputs: `feature-research/A` to `N`, `component-research/01` to `17`, `component-decisions/CD-*`, `audit.md`, `DR-001`, `docs/product/prd.md`, `docs/decisions/checkpoint-c2.md`.
Outputs: this record; `DR-003-prototypes.md`; `rebuild-plan.md`; traceability columns in `component-research/INDEX.md`.

Evidence limits. No patient, clinician or coordinator took part in any of this. Every weighted score in the research is a heuristic judgement. Decisions below are mine, from reading the research and the code facts it cites; where I checked the code myself it says "checked".

Effect on the component decisions. Every `CD-*` record is **accepted as written** unless section 3 amends it. CD status moves from "provisional" to "accepted (DR-002)"; the amended ones are listed in section 3.

## 1. Rules that apply to every feature

These settle several conflicts at once.

| # | Rule | Settles |
|---|---|---|
| R1 | **Browser storage.** `localStorage` is not used. `sessionStorage` may hold interface state only (open panels, the set count in a session, scroll position). It never holds free text a person typed about health (messages, check-in notes, clinical notes, task notes), search terms that name a patient, or account fields. Those live in memory and are protected by the leave guard (CD-522). | G section 13 against CD-511; A item 3; CD-333 |
| R2 | **Nothing that identifies a patient goes into a URL or a document title.** No name, MRN, birth date or search text. Record titles read "Patient record, CarePath" (CD-203). | I against CD-333 |
| R3 | **Fixed safety copy is a constant and is never edited inline.** New safety lines are new constants in `@carepath/shared` copy, each with a banned-word test. | G, CD-513 |
| R4 | **No minutes, scores, bands or verdict words that the data does not hold.** No session length estimate in the client, no "mild, moderate, severe", no "improved". | B against C item 3; D; E |
| R5 | **A demo default is labelled as one.** Any threshold or band that no clinic chose is shown to staff with the words "Demo default. Not clinically reviewed." | Pain threshold 7; review age bands |
| R6 | **Breakpoint for side-by-side work is 1280 px.** Below it the second pane is a drawer; below 768 it is a full screen. | H against CD-524 and CD-526 |
| R7 | **A design never shows a control for an endpoint that does not exist.** Templates, archive, saved personal views, snooze, "notify me", attachments and bulk actions are absent, not disabled. | K, I, L, F, G |

## 2. Decisions per feature

Verdicts: **Accept** (the researcher's recommendation as written), **Amend** (accepted with the changes listed), **Reject**.

### A. Onboarding: Amend

- Accept A1, the linear flow, with the checklist used only as the resume summary. Accept items 1, 2, 4, 5, 6 and 7 of the recommendation, with CD-102 (three-field birth date), CD-105 to CD-109 and CD-142 (required consent is a checkbox, optional consent is a radio pair that needs an answer).
- **Change:** item 3 (keep typed account fields in tab storage) is rejected under R1. Name, birth date, email and eligibility code typed before sign-in would stay on a shared device until the tab closes, with no sign-out to clear them. They stay in memory; a reload warns first.
- **CR-A1 (eligibility pre-check) rejected.** It creates a code-guessing oracle for a small gain; putting the code first on the form gets most of the value.
- **CR-A2 (email confirmation) rejected for this release.** It is not in the PRD. The docs list "no email verification" as a limitation.
- Consent wording follows CD-143 and the naming in `06-ai-verification.md` section 6.7: "AI-assisted drafting". The exact consent text is an open sign-off (section 4, S6).

### B. Patient home: Accept, with two rulings

- B1 with the appointment promoted under the hero when it is today or tomorrow.
- `estimatedMinutes` is **not** requested. There is no defensible rule for rep-based work. Today says "4 exercises". This also overrides C item 3: the session preview shows the exercise count and each exercise's own dose, and no total time (R4).
- The plan-change note keeps its acknowledgement (REQ-TOD-02) and shows as one collapsed row with "What changed" and "Got it".
- Plan stays off the tab bar (CD-500, four destinations). Today carries a visible "Your care plan" link in a fixed place. Revisit only if a scenario test shows people cannot find it.

### C. Guided sessions: Accept

- C2, the phase-driven player, with C1 as the fallback if C2 is not verified at 375 and 390 by its gate.
- Accept items 1, 2, 5, 6, 7 and 8. Item 3 as ruled in B. Item 4: the sound cue is **not built** in this release; the visual cue and the keep-awake request with a text fallback are.
- "Stop, this hurts" follows CD-421 (secondary button, critical tone, always visible, never in a menu).
- **CR-C1 accepted** (nullable `discomfortLevel` on stop). It is a safety improvement and does not block: until it lands, the stop sheet asks for the number first, as today.
- CR-C2 (store sets per activity) rejected. The set count stays in `sessionStorage`, which R1 allows.

### D. Pain reporting: Accept, with clinical items left open

- D1 with CD-100 (numbered radio group) and CD-101.
- Anchor wording is "0 No pain" and "10 Worst pain imaginable", matching the LOINC 72514-3 definition the Observation already uses. The live line is "You chose 7 of 10." with no band word. **The wording is not clinically reviewed** (S1).
- The clinic threshold stays at 7 as the seeded value, admin-editable and audited. It is a demo default under R5 and is never shown to the patient (S2).
- Accept the emergency line on the check-in screen and the preselected value after a stop, with the sentence that says where the number came from.
- CR-D1 (body area and timing) rejected for now; D2 stays parked with it.

### E. Progress: Accept

- E1, sections by data class, with CD-210 to CD-219.
- Plan-version markers: on the **clinician** pain chart as small ticks with a table row each. On the **patient** chart there is no tick; the table gains a "Plan updated" row. A mark on the patient's chart invites a cause-and-effect reading the product cannot support.

### F. Scheduling: Amend the requirement, accept the design

- F2 with CD-310 to CD-319. No calendar grid (C2 ruling stands).
- **Time zone: CD-314 option C is adopted and REQ-APT-03 is amended.** New text: "Instants are stored in UTC. Every time is shown in the clinic's zone with the zone named. For a video visit, the viewer's local time is added when the browser zone differs." A physical visit happens on the clinic's clock; showing the viewer's zone would give the wrong wall time. AC-E5 keeps its daylight-saving test and adds the video case. The PRD edit is the orchestrator's.
- Cancel reason is optional in the UI (matches the contract).
- "Add to calendar" is built in the client: title "CarePath appointment", clinic name, start, end and zone. No visit type, no reason, no clinician note.
- **Booking idempotency key** (`10-feedback-error-recovery.md`): accepted as CR-17, not blocking. Until it lands, the unknown-outcome banner tells the patient to check Appointments before trying again.
- No "notify me", no "request a time" (R7).

### G. Messaging: Amend

- G4 with CD-510 to CD-515.
- **Urgent line approved as a separate constant.** `EMERGENCY_NOTICE` is unchanged. A new `URGENT_NOTICE` reads "For something urgent that is not an emergency, call {phone}." and, with no clinic phone, "Urgent? Contact your clinic." (R3).
- **Staff composer drops the patient-facing emergency notice.** REQ-MSG-02 is a patient requirement (role column "P"). On a clinician's screen the line reads as an instruction to the clinician. AC-E10 is clarified to "the patient composer". The staff composer shows the label "Message to {patient name}", the clinic reply-time line the patient was given, and the keyboard hint.
- **Drafts are memory-only** (R1). CD-511 and CD-522 stand; G section 13 "draft restored after a reload" is withdrawn. A reload or tab close warns first.
- The sticky composer below 768 px is approved, using `position: sticky`, never `fixed`.
- Starting points are fixed copy, not clinic-configurable.

### H. Clinician workspace: Amend

- Build C, the grouped action list, and add D's detail pane on top of it. The pane follows R6 and CD-524: in place from 1280 px, a modal drawer from 768 to 1279, a full screen below 768. H's "stacked under 1024" is withdrawn.
- The pane is the **same** `TaskDetail` and check-in detail the review queue uses (CD-341, CD-523). It offers only the actions the API has: mark a check-in reviewed, and assign, resolve or dismiss a task. Visit, message and publish rows are links.
- The list ships first inside the same work package and is the fallback if the pane fails its gate.
- REQ-OVR-01 holds: every group shows a count equal to its list length, no KPI tiles. The "AI drafts awaiting review" group appears when WP 5.2 supplies it (CR-16).
- **Navigation order (amends CD-501):** Overview, Schedule, Patients, Review queue, Messages. The day comes first (Overview, Schedule), then people, then the two inboxes together so their count badges sit side by side. Both inboxes carry a `CountBadge` (CD-508). This is judgement, untested, and is one array to change.

### I. Patient directory: Amend

- Dense table (CD-330) with fixed named views (CD-332), filter chips (CD-331), the row menu (CD-337) and "Back to results".
- **Privacy bug confirmed (checked).** `apps/web/app/(clinician)/patients/directory.tsx` line 84 and `apps/web/app/(admin)/admin/patients/patients.tsx` line 82 read the search text from the `q` query parameter, so a typed name or MRN lands in browser history, the address bar on a shared screen and any referrer. Feature research I was wrong to say the URL holds no names.
- **Fix (amends CD-333):** the URL keeps view, filters, sort and page token. The search text is held in a store that lives in the staff layout, in memory, and is cleared on sign-out. It survives moving between list and record; it does not survive a reload. `sessionStorage` is not used (R1, R2). Test: no navigation in the staff app ever produces a URL that contains `q=`.
- The browser still sends the term to the API as `GET /patients?q=`. API request logging is disabled (checked: `apps/api/src/app.ts`), so this is not a live leak, but a body is the right place. CR-12 asks for `POST /patients/search`; it does not block.
- **The peek drawer is not built.** It puts more of a record on screen from a list, and the product has not decided whether a peek counts as a record open for the audit (REQ-REC-02). The row menu links are enough.
- Rows that open or act on a patient show the name with a muted "Born" line (CD-204).

### J. Patient record: Amend

- J option C with the identity ruling from CD-200 and CD-503: **identity is its own banner and never lives in a region that can collapse.** `PatientBanner` holds name, birth date with age, and MRN, with gender, language, zone and care team behind its second zone (CD-201 to CD-203). Actions move to the workspace header.
- J's summary (care team, current-state lines, the "Not recorded" block, one "Record as of" stamp) is a column beside the workspace from 1280 px and the first block of the workspace below it.
- Sections: Timeline (default), Plan, Check-ins and activity (the clinician data view, CD-216), Appointments, History. "Notes and summaries" joins when WP 5.3 lands. Section tabs are ARIA tabs with URL state (CD-504).
- Whether Timeline is one chronological list or time-aligned lanes is the one question still open (CD-241). DR-003 builds that comparison before the record slice starts.
- Medications and allergies read "Not collected in CarePath". No field is invented.

### K. Care-plan builder: Accept, vocabulary fixed

- Split pane from 1280 px, single page below (K option C degrading to B), with CD-300 to CD-306.
- **Plan state words are CD-305's:** Draft; Published, version N; Draft differs from version N; Earlier version. K's word "Superseded" is not used in the UI. The version the patient sees is "Current" everywhere (CD-232).
- Starting points are Blank and "Start from the current version". No template, no archive (R7).
- The patient-facing change note gets its preview in the publish dialog (CD-416).

### L. Review queue: Accept

- Table with detail pane (CD-341), the note form as an inline expansion (CD-523), one state-driven primary action (CD-430), R6 for the pane.
- The fixed line above the list is kept: "Order: rule priority, then oldest. Set by clinic rules, not a measure of medical risk."
- Three contract requests, none blocking: `priorityLevel` (CR-9, CD-235), per-rule totals for the count chips (CR-10), task event history (CR-11). Until each lands its UI is absent: no "High priority" tag, no chips, History shows created and resolution only.
- "Review next" is not built. No bulk actions (CD-427).

### M. AI summaries and notes: Accept, with the open questions ruled

- Structured review panel (M option C) with CD-400 to CD-409. Evidence opens in the R6 pane. The side-by-side source pane is used only for the note-from-transcript draft at 1280 px and above (CD-400).
- **Gate (CD-407 option A as written):** the decision is unavailable, with the reason in text, until every flagged statement is resolved, missing information is acknowledged, and evidence has been opened for reported-change statements. That last condition is an untested assumption about how to measure inspection; it is recorded as such and revisited after the first walkthrough.
- **Rulings on `06` section 7:** (b) evidence-open events and statement resolutions are stored in the `AIReview` payload (CR-7). (c) "Keep with a note" is open to any clinician who may approve the draft; no extra role. (d) An edited statement is labelled "Edited, not re-checked"; there is no automatic re-verification.
- **Notes (`07` gaps), ruled as demo rules that need clinical governance review (S4, S5):**
  1. **An amendment is signed.** It is committed by "Sign amendment" with a required reason, by the author only, in one step. The current version of a signed note is therefore always a signed version. There is no saved, unsigned amendment.
  2. **Completeness.** Signing warns about empty sections and does not block, except that a note with all four sections empty cannot be signed.
  3. **Entered in error.** The author or a clinic administrator may mark a signed note. A reason is required and stored. The mark cannot be undone. The text stays readable under a banner and is excluded from export. No second person is required.
  4. Note text is plain text. Draft notes autosave to the server (CD-414). There is no local recovery copy (R1).
- These need CR-8 in WP 5.2.
- No sparkle, no confidence figure, no chat assistant. The navigation assistant stays stretch and is not built.
- DR-001's follow-up stands: the first real review screen is captured with the final tokens and reviewed before the AI treatment is called done.

### N. Administrative analytics: Accept

- Definition-first metric table with drill-down tables, plus the short exception strip limited to clinic-set thresholds and plain facts.
- The admin shell gains a `SideNav` once it has two destinations (CD-502): Patients, Availability, Metrics, Enrollment codes, Review rules, Audit log.
- Availability editing is the per-therapist day-grouped slot list (CD-313). No recurring rules, no week grid.
- Review age bands (under 24 h, 24 to 48 h, over 48 h) ship as a demo default under R5 (S7).
- The PRD's "patients `assigned` or `active`" does not match the `PatientStatus` enum, which has no `assigned` (checked: `schema.prisma`). WP 6.1 pins the denominator as status `active` and the page prints that definition (S3).
- No per-clinician ranking, no peer benchmark, no period control on fixed-window metrics.

## 3. Component decisions amended by this record

| CD | Amendment |
|---|---|
| CD-333 | Search text in a layout-level memory store, not `sessionStorage` (R1, R2). |
| CD-330 | Peek drawer removed from the selected design. |
| CD-501 | Order is Overview, Schedule, Patients, Review queue, Messages; both inboxes badged. |
| CD-511 | Staff variant has no emergency notice; shows the patient's reply-time line. Drafts memory-only confirmed. |
| CD-513 | Urgent line approved as the separate constant `URGENT_NOTICE`. |
| CD-314 | Approved; REQ-APT-03 amended to match. |
| CD-412 | An amendment is committed by "Sign amendment"; no unsigned amendment state. |
| CD-411 | Signing is blocked only when all four sections are empty. |
| CD-415, CD-237 | Entered in error: author or clinic administrator, required reason, not reversible. |
| CD-231 | "Active" is defined in visible text as "intake submitted and a therapist assigned"; Inactive and Discharged get no definition until S3 is answered. |
| CD-235 | Accepted as conditional on CR-9; interim line as in L. |
| CD-241 | Stays pending; decided by the DR-003 prototype. |
| CD-141 | "Message your care team" links to Messages with no pre-filled subject (no contract for it). |
| CD-109 | Account-step fields are memory-only (A). |

All other CD records are accepted unchanged.

## 4. Open sign-offs (state as open; do not invent an answer)

These are product, clinical or legal decisions no one on this project can make. Each has a shipped demo behaviour so work is not blocked, and each must appear in `docs/design/final-design-rationale.md` under "Open questions" and, where staff can see the value, on screen under R5.

| Id | Question | Owner | Demo behaviour until answered |
|---|---|---|---|
| S1 | Is "Worst pain imaginable" the right upper anchor, and are both anchors acceptable to the clinic? | Clinical | Wording from the LOINC definition; docs say "not clinically reviewed" |
| S2 | Should a pain threshold ship with any default, and is 7 acceptable? | Clinical | 7, labelled demo default in admin settings; hidden from patients |
| S3 | What do Active, Inactive and Discharged mean, and which workflow sets the last two? | Product | Active defined as above; the other two shown only as stored words |
| S4 | Does an amendment need its own signature, and may anyone but the author amend? | Clinical governance | Signed, author only |
| S5 | Who may mark a note entered in error, and is a second person needed? | Clinical governance | Author or clinic administrator, reason required, one person |
| S6 | Consent: (a) the exact wording of both consents; (b) what the clinic keeps when the required consent is declined after an account exists; (c) what happens to unreviewed drafts when AI consent is withdrawn; (d) what the clinic does while a patient has not re-read changed wording | Legal and product | (a) plain-language draft marked "demonstration wording"; (b) account stays `intake_incomplete`, nothing is deleted, the screen gives the clinic contact; (c) no new drafts, unreviewed drafts can no longer be approved and stay in history, approved and signed text is untouched; (d) the existing agreement stands, banner only, no automatic revoke |
| S7 | Review age-band edges for the "Pending review items" metric | Product | Under 24 h, 24 to 48 h, over 48 h, labelled demo default |
| S8 | Does opening evidence count as inspection for the approval gate? | Product, with clinicians | Required for reported-change statements; marked untested |
| S9 | Is a list-level peek a record open for the audit? | Privacy | Peek not built |

No claim of regulatory compliance is made anywhere. The 45 CFR 164.526 reference in CD-412 is an analogy for append-and-link and is described as one.

## 5. Requirement text the orchestrator must edit

- `prd.md` REQ-APT-03 and AC-E5: clinic zone, viewer time added for video visits (F).
- `prd.md` AC-E10: "the patient composer shows reply time and the emergency notice" (G).
- `packages/shared` copy: add `URGENT_NOTICE`; pain anchors as constants; the R5 label.
- `docs/decisions/contract-requests.md`: add CR-6 to CR-17 from `rebuild-plan.md` section 5.
- `CLAUDE.md`: cite DR-001 and `design-tokens.md` for colour and type; cite this record for R1 to R7.
