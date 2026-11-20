# M. AI-assisted clinical summaries

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 M, sections 5, 8, 9. Prior work: `docs/research/competitor-analysis.md` (Abridge 5.1, SPRY 3.1, Commure 5.2), `docs/design-system/components.md` (AIDraftBlock, EvidenceRef). Access date for every source: 2026-11-20. Status: provisional until the advisor signs off. No colours are chosen here.

Scope note: the AI pipeline is not built yet (`packages/ai/src/index.ts` is a placeholder). The only AI UI today is the design-system gallery demo. Everything below is design for a feature that has contracts in the PRD but no running endpoint.

## 1. User problem

A therapist wants a quick, structured draft of what happened since the last visit (reported changes, engagement, missing information) and needs to be sure each statement is backed by the patient's own records before anything enters the chart. The hard part is not generating text; it is checking it fast enough that the checking is real, finding what the draft left out, and leaving a record that a named clinician took responsibility for the final wording.

## 2. User and context

- **Caseload therapist (T1).** Desktop, in the patient record (AI summaries is a record section), usually just before or after a visit. Reviews one patient's draft at a time. A few times per week per patient under review; frequency is an assumption.
- State: time-pressed, tempted to skim. Trust in the tool will drift upward if it is usually right (automation bias). This is expert judgement and is supported by the NYU Langone comment in section 6 that busy clinicians can copy text without noticing mistakes.
- Not for patients: approved summaries are clinician-only (PRD Q1).

## 3. Business objective

Reduce clinician time spent writing progress reviews without lowering scrutiny. Metric names only: time from draft shown to decision, share of drafts approved unchanged, approved with edits, rejected; share of statements opened for evidence before approval; unsupported statements per draft (from `pnpm ai:eval`); edits per approved draft; regenerate rate. No target values are claimed, and a high unchanged-approval rate is not treated as success without the evidence-open rate beside it.

## 4. Constraints

**Functional (PRD sections 7.9, 9, 11, acceptance AC-F1 to F10; `docs/architecture/domain-model.md`):**
- Output schema: summary, reported changes, engagement observations, missing information, source references, review items. Each statement carries `sourceRefs`. A verifier labels each statement supported, unsupported ("No supporting record found"), or missing information. **No numeric confidence** is shown.
- Lifecycle: `AIGeneration` records provider, prompt version, input references, output, validity. `AIReview` is append-only: approved, approved with edits (edited output stored, original kept), rejected with a reason. Regenerate creates a new generation. The decision is per generation, not per section.
- A draft needs an active `ai_assisted_features` consent; a refusal is audited (AC-F5). Failures: schema-invalid output returns a failure with retry and stores no partial draft (AC-F2); provider timeout retries twice with backoff then shows a recoverable error (AC-F7).
- Every generated block shows "Draft, generated, not reviewed" and the provider name; the deterministic provider reads "Demo provider, rule-based" and is never described as a live model (AC-F10).
- Nothing generated reaches a patient, the record or an export without a clinician action. Approved is not the same as signed: a note from an AI draft still needs signature (AC-F8).
- Assistant scope is navigation only and refuses diagnosis, treatment and exercise-change questions (AC-F9). A free chat assistant is out of scope.
- **Contract gaps:** no AI endpoints or schemas exist yet in `packages/shared/src/contracts`; the overview contract says AI lists "arrive in Phase 5". Per-section decisions are not modelled (see D below).

**Technical:** Source records are structured (check-ins, sessions, Observations), so "sources" are records opened through each ref's `apiPath`, not a continuous transcript. The note-from-transcript path (REQ-AIS-06) does have a transcript.

**Safety and privacy:** redaction before any external call; injection set must stay in schema; no sparkle or glow; no diagnostic claims. The unsupported-statement state must be visible before approval.

**Accessibility (WCAG 2.2 AA):** evidence panel reachable and operable by keyboard; evidence references are 24 px buttons named "Open evidence N"; status carried by words and icon; side-by-side must reflow to one column at 320 px (1.4.10); focus not hidden under a sticky panel (2.4.11); status changes announced politely (4.1.3).

## 5. Current CarePath implementation

- No AI summary screen exists. The record has no "AI summaries" tab in `apps/web/app/(clinician)/patients/[patientId]` (files: `record.tsx`, `tabs.tsx`, `plan`, `appointments-tab.tsx`).
- The design-system component `AIDraftBlock` plus `EvidenceRef` exists and is documented (`docs/design-system/components.md`; screenshot `docs/design-system/screenshots/gallery-1440-ai.png`). Observed in that screenshot: a draft block with a dashed left rule, the label "Draft, generated, not reviewed", provider in monospace, numbered evidence buttons after each sentence, and Approve, Edit, Discard buttons directly under the text; an approved block ("Generated, reviewed and approved by J. Alvarez, PT"); a rejected block with struck-through text.

Weaknesses of the component as a basis for a workflow:
1. **Approve is one click from unreviewed text.** Nothing records or requires that evidence was opened. PRD G-F says approval follows inspection of evidence.
2. The block has no representation of **unsupported statements** or **missing information**, which the schema produces.
3. A single Approve covers the whole block; there is no way to say "these three sentences are checked, this one is not".
4. The demo copy contains "down from 7 the week before", i.e. a trend statement. Real copy must not use the banned improvement framing for patient-reported pain (AC-C7 applies to captions; the same caution holds here by judgement).
5. No loading, failure, refusal (no consent) or regenerate states are drawn.

## 6. Production references observed

Mobbin does not have Abridge, Ambience or DAX (searches for them returned unrelated products). The closest Mobbin evidence is Heidi (an AI scribe) and general AI-with-sources screens. Official pages and vendor help were used for the clinical products and are marked as to what they do not say.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Abridge | Official help | Verify a Note With Linked Evidence | https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence | [Observed] In the web editor the clinician selects note text and the matching transcript passage is highlighted in a "Transcript & Linked Evidence" panel; double-click or Play plays the original audio of that section; Transcript Search is available alongside. The page does not say whether text with no transcript source is flagged, and does not describe review or signing. |
| Abridge | Official blog | Prompt editing | https://www.abridge.com/blog/ambient-ai-prompt-editing | [Observed] Clinicians can edit drafts with plain-language instructions instead of retyping; the clinician owns the final note; evidence is shown inside the workflow and should be inspectable with sources; the clinician reviews evidence first, then decides. Vendor reports internal evaluation of precision, recall and faithfulness (vendor claim, not verified). |
| Microsoft DAX Copilot for Epic | Official support | Review in DAX Copilot for Epic | https://support.microsoft.com/en-us/dax-copilot/epic/review-in-dax-copilot-for-epic | [Observed] Note tab holds AI summaries in sections (HPI, Results, Physical Exam, Assessment and Plan); each new recording makes a new version card in a timeline with version history kept; "split view" shows two tabs side by side to compare the note with a previous version or with the transcript, with keyword search in both; manual edits are not carried into later generated versions; summaries can be rated with comments. The page does not describe flagging or a separate sign-off step. |
| Ambience Healthcare | Official site | Clinicians page | https://www.ambiencehealthcare.com/clinicians | [Observed] One-click generators draft sections such as HPI and assessment and plan, which clinicians check and complete; a "compliance validator" flags diagnoses lacking supporting evidence; suggestions come with a rationale; a live audio recap lets a clinician replay a visit. The page does not describe note-to-source links or a formal attestation step. |
| SPRY | Official page | Agentic scribe | https://www.spryhealth.ai/agentic-scribe | [Observed] Before signing, flags body-part mismatches, missing required details and conflicting measurements; clinician fixes a flag or states a correction in plain language and every affected section updates; clinician reviews, edits and signs; only then the note is final and passed to billing. How flags look on screen is not described. |
| NYU Langone (via Becker's) | News | Hospital course summaries | https://www.beckershospitalreview.com/?p=305077 | [Observed] Every fact in an AI-generated summary links to its source clinical note; the lead researcher advises defining documentation standards first and warns that busy clinicians can copy text without noticing mistakes. |
| Heidi | Web (Mobbin) | Transcribing screen | https://mobbin.com/screens/8a93fc9d-6c23-4a3e-9540-35035455ab0d | [Observed] A persistent orange line under the composer reads "Review your note before use to ensure it accurately represents the visit"; tabs Context, Transcript, and the generated note. |
| Heidi | Web (Mobbin) | Note with tasks panel | https://mobbin.com/screens/52227ae5-3a6f-4f01-ae19-c1864b231898 | [Observed] Generated note on the left in template sections; a side panel of extracted tasks with checkboxes; counters at the foot ("0/9 codes", "1/3 tasks") show review progress; copy, undo and redo controls. |
| Heidi | Web (Mobbin) | Note with notification menu / context tab | https://mobbin.com/screens/d2e2247d-11f1-4d61-813f-096e854ba0d4 | [Observed] The note body reads as plain prose with no per-statement source markers visible in the screenshot. [Assumption] That means verification is by switching to the Transcript tab, not inline. |
| Asana | Web (Mobbin) | Draft with AI status report | https://mobbin.com/screens/d990abb6-ed7b-4a2e-a6d2-d2b619269080 | [Observed] A header "Draft with AI", thumbs up and down, and Back and Edit buttons at the foot; the text states a percentage and a duration as facts, with no source links on screen. |
| Microsoft Copilot | Web (Mobbin) | Report with References | https://mobbin.com/screens/37c149bf-1913-482d-8598-0ce07cbd7b0c | [Observed] Numbered list of references with site name and title under the text; 31 references collapsed under one heading. |
| Fireflies | Web (Mobbin) | AskFred answer | https://mobbin.com/screens/0e277c22-7dac-4085-aa59-cd24cd3dbc52 | [Observed] Answer ends with a short "References" list linking the source meetings; thumbs and copy beneath. |
| Google NotebookLM (labelled "Gemini Notebook" on Mobbin) | Web (Mobbin) | Three-pane notebook | https://mobbin.com/screens/12426ebf-18cd-4a3c-9796-a914e121f140 | [Observed] Sources list with checkboxes on the left, generated answer in the middle with a source count ("8 sources"), editable note on the right; "Saved responses are view only" notice. |
| ChatGPT | Web (Mobbin) | Deep research with Sources panel | https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e | [Observed] Right panel with Activity and 23 Sources tabs showing the steps taken and pages read; an inline "Sources" chip under the answer. |
| Linear | Web (Mobbin) | Triage Intelligence settings | https://mobbin.com/flows/d67e265d-a278-47af-bb77-d7f57229b346 | [Observed] AI suggestions can be shown, hidden or auto-applied per property; the feature is off until enabled. Useful for the "consent and control" pattern, not for review. |
| Commure | Competitor analysis | Ambient AI tiers | `docs/research/competitor-analysis.md` section 5.2 | [Observed, prior work] A base tier with no described clinician review step; CarePath rejects that. |
| Not retrieved | | | | A peer-reviewed study on what clinicians edit in AI-drafted notes (PubMed 42118974) failed to load; an AHRQ issue brief on AI and diagnostic safety returned an empty page; neither is cited. |

## 7. Established patterns

1. **Generated text comes in sections** matching the clinical template (DAX SmartSections, Heidi template sections, Ambience HPI and A and P, SPRY SOAP fields). It lets a reader check and edit one part at a time.
2. **Source is one gesture away from the statement** (Abridge select-to-highlight, NYU per-fact links, DAX split view with transcript). Verification fails if it needs a context switch.
3. **A standing reminder that the clinician owns the note** (Heidi's persistent line, Abridge "clinician owns", Ambience "check and complete"). Used as a label, it does not stop skimming by itself.
4. **Pre-sign-off checks for gaps and conflicts** (SPRY flags, Ambience validator). They shift attention from "read everything" to "resolve these".
5. **Plain-language correction** (Abridge, SPRY). Cuts edit time; risks unrecorded changes unless edits are versioned.
6. **Versions are kept** (DAX version cards and history). Manual edits not carried forward (DAX) is a trap CarePath should avoid by keeping the generation and the edited output side by side in `AIReview`.
7. **Progress counters on review** (Heidi "1/3 tasks"). Make "how much is checked" visible.
8. **Gaps in the public material:** none of the pages read describes a visible "unsupported statement" state or what the screen shows for missing information; Abridge's page is silent on unlinked text; Ambience does not describe source links. CarePath's schema (supported, unsupported, missing) is therefore ahead of what these pages describe, which is a design risk (nothing to copy) and an opportunity.

## 8. Alternatives

Evidence tags: **R** research evidence, **E** expert judgement, **U** untested assumption. No clinician test has been run.

### A. Inline generated summary in the record

- **Problem addressed:** get a draft in front of the therapist inside the record without a new screen.
- **Interaction model:** the AI summaries section shows one `AIDraftBlock`; numbered evidence buttons open a right drawer with the source record; Approve, Edit, Discard under the text.
- **Benefits:** simplest; already a component; reads like the record.
- **Limitations:** Approve is one click from unreviewed text; no home for unsupported or missing items; whole-block approval.
- **Accessibility:** good; one column, evidence buttons named by number.
- **Business implications:** fastest to build; highest risk of rubber-stamping, which would undermine the trust position.
- **Technical complexity:** low; one decision per generation fits `AIReview`.
- **Error and recovery:** failure block with Retry; regenerate creates a new generation.
- **Evidence:** R Asana (draft with Edit, no sources on screen) shows the pattern and its weakness; R Heidi (note prose, verification elsewhere); E rubber-stamp risk; R NYU warning on skimming.

### B. Side-by-side source and generated output

- **Problem addressed:** compare each statement with its source while reading.
- **Interaction model:** two panes. Left: generated sections. Right: source pane (records for progress review; transcript for a note draft) that scrolls and highlights the record for the selected statement, with keyword search. Stacks to one column on narrow screens.
- **Benefits:** strongest verification; matches DAX split view and Abridge linked evidence; essential for transcripts.
- **Limitations:** needs width; sources for a progress review are many small records, so a long pane may show more than needed; no place for unsupported or missing items unless added.
- **Accessibility:** two scrolling regions, each named and keyboard focusable; at 320 px it must stack; synchronised scrolling must not trap focus.
- **Business implications:** highest trust; slower per draft, which may blunt the time-saving case.
- **Technical complexity:** medium. Each ref type needs a read-only renderer through `apiPath`; for transcripts the existing source text is enough.
- **Error and recovery:** if a source cannot load, that statement shows "Source could not be opened" and cannot be counted as checked.
- **Evidence:** R Abridge linked evidence, DAX split view, NotebookLM three-pane; R NYU per-fact linking.

### C. Structured review panel

- **Problem addressed:** review in the same order the schema produces output, with problems surfaced first.
- **Interaction model:** a review panel with a header summary ("12 statements: 10 supported, 2 with no supporting record; 3 items missing"), then sections in order: Summary, Reported changes, Engagement observations, Missing information, Review items. Each statement shows its status in words with an icon and its evidence buttons; unsupported statements sit first in their section with actions "Edit", "Remove", "Keep with a note". A review checklist at the foot: unsupported items resolved; missing information acknowledged; evidence opened for at least the reported-change statements. Then one decision: Approve, Approve with edits, Reject with a reason. The decision is disabled with the reason in text until the checklist is complete. Evidence opens in a right drawer.
- **Benefits:** puts the verifier's output to work; makes "missing information" a first-class item; gates approval on inspection; maps to one `AIReview` per generation.
- **Limitations:** more structure than a paragraph; "Keep with a note" must be worded so it is not a one-click override; a checklist can become a click-through if it is only ticks (mitigated by tying it to recorded evidence-open events, which are U).
- **Accessibility:** headings per section, lists with status text, a progress line announced politely, disabled button with `aria-describedby` reason.
- **Business implications:** modest extra review time per draft; stronger audit story (evidence opened, items resolved).
- **Technical complexity:** medium. Needs statement-level status from the verifier (planned: PRD section 11), a client record of evidence opens (could be stored in the `AIReview` payload or kept client-side; a contract request), no per-section persistence.
- **Error and recovery:** edits are local until the decision; leaving the page asks to discard; failure on decision keeps edits ("Your edits are still here").
- **Evidence:** R SPRY pre-sign-off flags; R Ambience validator; R Heidi progress counters; R Abridge "review evidence, then decide"; E checklist wording.

### D. Section-level editing and approval

- **Problem addressed:** let the clinician finish one section at a time and approve sections independently.
- **Interaction model:** each section is its own block with Edit and "Approve section"; the whole summary becomes approved when all sections are; sections can be regenerated alone; plain-language edit per section.
- **Benefits:** fine-grained control; efficient editing; clear progress; partial work can be saved.
- **Limitations:** the approved summary may be assembled from sections approved at different times; "who approved what, when" becomes harder to state; regenerate-one-section changes the basis for the others; the PRD and contract allow one decision per generation.
- **Accessibility:** per-section controls repeat, so accessible names must include the section name.
- **Business implications:** appeals to edit efficiency; risks a messier audit trail.
- **Technical complexity:** high against the current design. It needs per-section review rows or an `AIReview` schema change and a rule for partial regeneration.
- **Error and recovery:** a failed regenerate of one section must not discard approved sections; a stale-section rule is needed when sources change.
- **Evidence:** R DAX SmartSections and SPRY section edits (section-level structure exists in products); R Abridge plain-language editing. Whether section-level approval is safe is U.

### E. Floating assistant or chat summary (out of scope, not scored)

A chat or floating assistant that answers "summarise this patient" anywhere. The brief rules this out for the product and the PRD limits the assistant to navigation (AC-F9). It has no statement-level sources or review step, so it fails the safety gate below.

## 9. Mandatory gates

**G-M1 accessibility** (WCAG 2.2 AA as above). **G-M2 privacy** (consent checked, redaction before external calls, organisation scope, no draft content in exports or patient views). **G-M3 safety** (never auto-finalise; the draft label and provider always visible; unsupported and missing information visible before approval; approval cannot be a single action on unseen text; the decision, reviewer and time are recorded; no numeric confidence).

| Alternative | G-M1 | G-M2 | G-M3 | Eligible |
|---|---|---|---|---|
| A. Inline summary (as currently specified) | Pass | Pass | Fail: approve is one click from unreviewed text and has no unsupported or missing state. Passes only if it adds those, at which point it becomes C. | No, as specified |
| B. Side-by-side | Pass if it stacks at 320 px | Pass | Conditional: needs unsupported and missing items and a gated decision | Yes, with conditions |
| C. Structured review panel | Pass | Pass | Pass | Yes |
| D. Section-level approval | Pass | Pass | Conditional: needs a defined whole-draft decision and audit of partial states; not supported by the current `AIReview` model | Yes, with conditions |
| E. Floating assistant | Not assessed | Fail (patient data to a free-form channel) | Fail | No |

## 10. Weighted evaluation

Weights adjusted from the default for this feature: task effectiveness 25, clinical safety/privacy/trust **25** (up from 20 because the product's central promise is that AI never finalises and unsupported statements are shown), usability/accessibility 20, business value **5** (down from 15: time saved is real but must not outrank trust), operational efficiency 10, technical feasibility **10** (up from 5: the AI contract does not exist and the review model is per generation), design-system consistency 5. Total 100. A and E are ineligible and not scored in the final comparison; A's score is shown for reference only.

| Criterion (weight) | A. Inline (reference) | B. Side-by-side | C. Structured panel | D. Section-level |
|---|---|---|---|---|
| Task effectiveness (25) | 3: statement checks need a drawer per statement; nowhere for missing items | 4: best for comparing, weaker for scanning issues | 5: issues first, matches output schema, one decision | 4: strong for editing, weaker for one coherent review |
| Safety, privacy, trust (25) | 3: rubber-stamp risk | 5: source visible at the statement | 5: gated decision, unsupported and missing visible | 4: partial approvals complicate accountability |
| Usability, accessibility (20) | 4: simplest | 3: width, two scroll regions, stacking needed | 4: linear and list based, more to read | 4: familiar, repeated controls |
| Business value (5) | 3: fast but weak trust | 3: slower review | 3: modest extra time, stronger audit story | 3: edit efficiency, messier audit |
| Operational efficiency (10) | 4: fewest clicks | 3: scrolling and syncing | 4: resolve flagged items, skip the rest | 5: partial progress saved |
| Technical feasibility (10) | 5: one component | 3: renderer per source type | 4: needs verifier status and an evidence-open record | 2: needs per-section review model |
| Design-system consistency (5) | 5: exists | 3: new two-pane layout | 4: reuses AIDraftBlock, EvidenceRef, Drawer, StatusChip | 4: reuses AIDraftBlock per section |
| **Weighted total (of 5)** | 3.60 (ineligible) | **3.75** | **4.45** | **3.85** |

Arithmetic: A = (75 + 75 + 80 + 15 + 40 + 50 + 25) / 100 = 3.60. B = (100 + 125 + 60 + 15 + 30 + 30 + 15) / 100 = 3.75. C = (125 + 125 + 80 + 15 + 40 + 40 + 20) / 100 = 4.45. D = (100 + 100 + 80 + 15 + 50 + 20 + 20) / 100 = 3.85. Scores are expert judgement informed by observed references; none is measured. The ordering of B and D is close and sensitive to the weights, so treat the runner-up as soft.

## 11. Recommendation

**Selected: C, structured review panel,** inside the record's AI summaries section, with evidence in a right drawer and one gated decision per generation.

Why it beats the runner-up (D, section-level approval):
- It matches the output the system already produces (sections, statement status, missing information) and the contract the PRD already specifies (one `AIReview` per generation, edited output stored, original kept).
- It answers the main risk the references leave open: none of the pages read describes a visible unsupported-statement state, and Heidi and Asana show that prose with a reminder line is easy to skim. Putting unsupported and missing items first, and gating the decision on resolving them, makes skimming harder than checking.
- D needs per-section approval records the current model does not have and complicates "who approved what, when".

**Runner-up: D**, which can be revisited if clinicians report that whole-draft decisions are too coarse. Its section progress counters (a Heidi-style "3 of 5 sections checked") are borrowed into C as local progress, not as separate approvals.

**Added to C from B:** the side-by-side source pane is adopted for one job only, the note-from-transcript draft (REQ-AIS-06), where the source is a transcript and DAX and Abridge show the pattern works. For the progress summary, evidence opens in a drawer because the sources are small structured records.

**Rejected:** A as specified (fails G-M3); E (out of scope and fails gates); any numeric confidence or "AI score" (PRD forbids it; no reference read justifies one).

**Trade-offs accepted:** extra review time per draft; a checklist that depends on recorded evidence-open events (an assumption about how to measure inspection, to be tested); no partial approvals.

Design rules that follow:
1. Every block shows "Draft, generated, not reviewed" and the provider until approved; after approval "Generated, reviewed and approved by {name}" with the provider kept.
2. Statement status in words and icon: Supported, No supporting record found, Missing information. No confidence figure.
3. The decision button is disabled with a reason in text until the checklist is complete.
4. Approve is not Sign: after approval the screen says "Approved. Not yet part of a signed note." where that applies.
5. Regenerate creates a new generation and leaves the prior one in history; edits are never lost silently (the DAX behaviour of dropping manual edits is avoided).

## 12. Requirement alignment row

| Field | Content |
|---|---|
| User segment | Caseload therapist (T1) |
| Job to be done | Turn a patient's recent records into a reviewed progress summary the therapist stands behind |
| Pain point | Writing it takes time; a draft is only useful if checking it is faster than writing it, and only safe if the checking is real |
| Business objective | Less documentation effort without lower scrutiny; a defensible audit trail |
| Functional requirement | REQ-AIS-01 to -05, -07; AC-F1 to F7, F10; new: checklist-gated decision, evidence-open record |
| Success metric | Time from draft shown to decision; share of statements opened before approval; unsupported statements per draft; approved unchanged, with edits, rejected; regenerate rate |
| Design hypothesis | If unsupported and missing items come first and the decision waits for them, therapists will resolve them instead of approving past them |
| Selected pattern | Structured review panel with evidence drawer and a single decision per generation |
| Technical dependency | AI endpoints and contracts (not yet defined); verifier output per statement; `AIReview` write; consent check; CR for evidence-open record |
| Validation method | Automated: AC-F1 to F10, axe, keyboard-only run, 200 percent zoom at 390, 768, 1440. Human: a moderated task with clinicians, including a draft seeded with a deliberately unsupported statement, is planned and not yet run. No result is claimed. |

## 13. States to design

| State | Behaviour and microcopy | Recovery |
|---|---|---|
| Default (draft) | Header "Draft, generated, not reviewed. Provider: {name}". Counts by status. Sections in order. | Open evidence, edit, decide |
| Hover, focus, active | Evidence buttons and actions show the 2 px ring; no hover-only information | Keyboard reachable |
| Selected | Statement with its evidence drawer open is marked "Evidence open" | Esc closes drawer, focus returns to the statement |
| Disabled decision | "Approve is unavailable: 2 statements have no supporting record, and missing information is not acknowledged." | Jump links to each item |
| Loading (generating) | "Generating a draft from {n} records. This can take up to 20 seconds." Skeleton mirrors sections; no partial text | Cancel keeps nothing |
| Empty (nothing to summarise) | "No records in this period to summarise. Check-ins and sessions appear here once the patient has logged them." | Link to timeline |
| Consent refusal | "AI-assisted features are off for this patient. A summary was not generated. Consent can be changed by the patient or the clinic." | Link to consents; event is audited |
| Partial data | "Based on 3 of 7 planned sessions. Missing information: no check-in on 14 Nov." (as the schema's missing-information items) | Acknowledge item |
| Unsupported statement | Icon plus "No supporting record found". Not hidden by collapse | Edit, Remove, or Keep with a note |
| Validation error | Reject without reason: "Add a reason so the record shows why this draft was not used." | Focus on reason field |
| Server error (schema invalid) | Banner: "The draft could not be used and was not saved. Nothing was added to the record." | "Try again" |
| Provider timeout | "This is taking longer than expected. Trying again (1 of 2)." then "We could not reach the summary service. Nothing was saved." | "Try again" or write manually |
| Network loss | "You are offline. Your edits are kept on this page. Reconnect to approve." | Auto-detect reconnect; decision stays disabled until online |
| Permission denied | "Only a therapist on this patient's care team can review AI drafts." | Link to care team |
| Stale information | If new check-ins arrived after generation: banner "New records since this draft was made (2). The draft does not include them." | "Generate a new draft" (creates a new generation; the old stays in history) |
| Unsaved changes | Leaving with edits asks "Discard your edits?" | "Keep editing" |
| Success (approved) | "Approved by {name} at {time}. Original draft and your edits are kept in record history." Block turns to the approved form. | Link to history |
| Rejected | "Draft rejected, not used." Text struck through; reason shown | "Generate a new draft" |
| Cancellation | Closing the decision dialog keeps all edits and the open state | n/a |
| Interrupted workflow | Edits held in local draft; reload restores the review position (U: local storage of PHI-bearing edits needs a privacy decision before building) | n/a |

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 375 and 390 | One column. Header counts, then sections as accordions with unsupported items always expanded. Evidence opens as a bottom sheet. Decision bar fixed at the foot with the reason line above it. Review is possible but cramped; the product treats the therapist record as desktop-first. |
| 768 | One column with wider sections; evidence as a right drawer over the content. |
| 1024 | Review panel with evidence drawer overlaying the right third. |
| 1440 | Review panel at reading width; evidence drawer at the right without covering the statement being checked. |
| 1920 | Review panel plus a persistent evidence pane (docked) so the drawer no longer overlays; for note-from-transcript drafts, the transcript pane is docked beside the draft (alternative B for that job). |

The model changes at two points: below 1024 evidence becomes an overlay and below 768 sections collapse into accordions.
