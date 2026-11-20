# 06. AI verification and review components

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` section 16 (also 4, 19 to 22). Builds on `docs/design/feature-research/M-ai-summaries.md` (selected there: structured review panel, one gated decision per generation, evidence in a drawer). This file does not re-open that choice; it decides the components inside it, and says where it adds to M. Decision records: `docs/design/component-decisions/CD-400` to `CD-409`. Access date for every source: 2026-11-20. Scores are heuristic expert judgement; no clinician has tested anything and no result is claimed. Colours are not chosen; token roles only (`ai-rule`, `surface-sunken`, `primary`, `warning-*`, `error-*`, `info-*`, `border-control`).

Status: no route renders AI content (usage matrix A1, C8). `AIDraftBlock` and `EvidenceRef` exist only in `/design-system`. Everything here is spec for a screen that does not exist yet.

## 0. Inputs that bound every decision in this file

- PRD and domain model: `AIGeneration` (provider, prompt version, inputs, output); `AIReview` is append-only (approved, approved with edits, rejected with reason); one decision per generation; edited output stored, original kept; regenerate = new generation; a note version from AI has `source = ai_draft` and still needs signature (AC-F4, AC-F8, AC-F10; `domain-model.md` line 42).
- Verifier gives each statement one of: supported, "No supporting record found", or a missing-information item. No numeric confidence (PRD).
- Brief section 16: no sparkle icons; no confidence percentages without a defined, validated meaning; generated, clinician-authored and finalised content must be distinguishable; AI must not silently overwrite clinician text.
- Usage matrix C8: the feature has three names today ("automated drafting tools" in consent, "generated" in the design system, "AI-assisted features" in M). Resolved in CD-406.

## 1. Production examples and guidance used (shared by decisions 6.1 to 6.9)

`[Observed]` = read on the page in this or the M research session; `[Assumption]` = inference. Items marked "via M" were retrieved during the M research on 2026-11-20 and are not re-fetched here; see `M-ai-summaries.md` section 6 for what each page does not say.

| Source | Where | Observation |
|---|---|---|
| Abridge, "Verify a Note With Linked Evidence" (via M) | https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence | [Observed] Select note text, the matching transcript passage is highlighted in a side panel; audio playback of that section. Silent on unlinked text. |
| Microsoft DAX Copilot for Epic, review (via M) | https://support.microsoft.com/en-us/dax-copilot/epic/review-in-dax-copilot-for-epic | [Observed] Sectioned note, version cards, split view against transcript or earlier version; manual edits are not carried into later generated versions. |
| SPRY agentic scribe (via M) | https://www.spryhealth.ai/agentic-scribe | [Observed] Pre-sign flags (conflicts, missing details); clinician reviews, edits and signs before the note is final. |
| Ambience clinicians page (via M) | https://www.ambiencehealthcare.com/clinicians | [Observed] Validator flags diagnoses without supporting evidence; no note-to-source links described. |
| NYU Langone via Becker's (via M) | https://www.beckershospitalreview.com/?p=305077 | [Observed] Each fact links to its source note; lead researcher warns busy clinicians may copy without noticing mistakes. |
| Heidi (Mobbin, via M) | https://mobbin.com/screens/52227ae5-3a6f-4f01-ae19-c1864b231898 | [Observed] Note in template sections, side panel of tasks with checkbox counters ("1/3 tasks"). |
| Microsoft Copilot, Fireflies (Mobbin, via M) | https://mobbin.com/screens/37c149bf-1913-482d-8598-0ce07cbd7b0c ; https://mobbin.com/screens/0e277c22-7dac-4085-aa59-cd24cd3dbc52 | [Observed] References listed after the answer (footnote style). |
| Google NotebookLM (Mobbin, via M) | https://mobbin.com/screens/12426ebf-18cd-4a3c-9796-a914e121f140 | [Observed] Sources, answer with a source count, editable note in three panes. |
| Carbon, "Carbon for AI" | https://carbondesignsystem.com/guidelines/carbon-for-ai/ | [Observed] Marks AI content with a consistent AI label that opens an explanation; the page's own styling uses glow and gradients; when a user edits suggested content the component reverts to its normal look and offers a way to restore the AI original. CarePath takes the label-plus-explanation and the revert idea, and rejects the glow (brief section 16). |
| Google PAIR guidebook, explainability and trust | https://pair.withgoogle.com/chapter/explainability-trust/ | [Observed] Aim for calibrated trust, not maximum trust; categorical confidence needs a suggested action per category; numeric percentages carry the most risk (false precision, accepted without checking); disclose what data is used. |
| NN/g, confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Frequent confirmations teach click-through; name the item and the outcome in the dialog; do not pre-select the affirmative. Relevant to decision gating (6.8). |
| WCAG 2.2 SC 4.1.3 Status Messages | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | [Observed] Status messages need role status, alert or log so they are announced without moving focus. |
| Mobbin search for EHR note editors with AI and amendments | Mobbin web search, 2026-11-20 | [Observed] Returned no clinical products (Canva, Spellbook, WeTransfer, incident.io, Plane, Square). Nothing from Mobbin is cited for clinical AI review; the clinical evidence is the vendor pages above. |
| Not retrieved | | Apple HIG, Material 3 and Fluent AI guidance were not retrieved for this file; NHS, CMS, USWDS and DHCW systems have no AI-verification component that was read. No claim is made about them. |

Gap carried from M: no page read shows a visible unsupported-statement state. The design below has no production reference for it; it rests on the verifier schema and on the PAIR argument for categorical states with an action each.

---

## 6.1 Evidence mechanism (CD-400)

**Task and place in journey.** A therapist, in the record's AI summaries section after a visit or before one, checks each generated statement against the patient's records or, for a note draft, against a transcript. Needs: which record supports this sentence, the supporting field in context, and whether the record could be opened. Action: open evidence, then accept, edit, remove or keep with a note.

**Requirements.** Business: draft shown to decision is faster than writing, without lower scrutiny; metric names in M section 3 (share of statements opened before approval). Healthcare: unsupported text must not reach the chart; wrong-patient references are unsupported (AC-F3); evidence panel must not hide the statement being checked.

**Alternatives (structurally different).**

| | Model |
|---|---|
| A. Numbered refs plus evidence drawer | Each statement ends in `EvidenceRef` buttons; one opens a right drawer (bottom sheet on narrow screens) with the source record and the supporting field marked in words. |
| B. Docked side-by-side pane | Source pane always visible beside the draft; selecting a statement scrolls and marks the matching passage; search inside the source. |
| C. Expandable references under each statement | An inline "Sources (2)" disclosure per statement that expands the source summaries in the reading flow. |
| D. Footnote list after the text | Numbered references listed at the end of the document. |

**Mandatory gates.**

| | G-A11y (keyboard, 320 px reflow, focus not hidden 2.4.11) | G-Privacy (consent, org scope) | G-Safety (source one gesture from statement; unsupported visible; not checkable if source fails) |
|---|---|---|---|
| A | Pass if the drawer returns focus to the statement and does not cover it at 1440 | Pass | Pass |
| B | Pass only if it stacks at 320 px and scrolling regions are named | Pass | Pass |
| C | Pass | Pass | Pass, but long disclosures push the statements apart, which weakens scanning (judgement) |
| D | Pass | Pass | Fail: reader leaves the statement to find the source (M pattern 2; NYU and Abridge both avoid this) |

**Evaluation (weights 25/25/20/15/10/5; 1 to 5; heuristic).**

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4: structured records are small, one drawer shows one | 5: best for long transcripts | 3 | 2 |
| Accessibility and usability (25) | 4 | 3: two scroll regions, width | 4 | 4 |
| Error prevention and trust (20) | 5 | 5 | 3 | 2 |
| Business and operational (15) | 4 | 3: slower per draft | 3 | 3 |
| Interaction efficiency (10) | 4 | 4 | 3 | 2 |
| Implementation cost (5) | 4: `EvidenceRef` and `DrawerContent` exist | 2: new two-pane layout | 4 | 5 |
| **Weighted (of 5)** | **4.20** | **3.95** | **3.30** | 2.80 (gate fail) |

Arithmetic A: (100+100+100+60+40+20)/100. B: (125+75+100+45+40+10)/100. C: (75+100+60+45+30+20)/100. D: (50+100+40+45+20+25)/100.

**Selected.** A for progress reviews built from structured records. B only for the note-from-transcript draft (REQ-AIS-06) at 1280 px and above, as M already recommended; below that it becomes A. **Rejected:** C (spreads statements apart, no gain over A), D (fails the safety gate). Trade-off: a drawer is one step more than a docked pane; accepted because structured sources are short.

**Spec: `EvidenceRef` and `EvidencePanel`.**
- Anatomy. `EvidenceRef`: a button showing the number, with visible text on larger targets only where space allows; accessible name "Open evidence 2: check-in 14 Nov" (adds the source name, replacing today's bare "Open evidence 2"). `EvidencePanel` (drawer): heading "Evidence for statement 3"; the statement text; for each source a block with source type in words ("Patient check-in", "Session", "Observation"), date and time in clinic zone, the supporting field with the label "Supports this statement" and the value, and a link "Open full record" (new view through `apiPath`, same tab, opens the record read-only).
- Marking the supporting field: bold plus a text label and a leading rule; never colour alone.
- Use when: a statement has at least one source ref. When not to use: for unsupported statements (they have no refs; the control reads "No supporting record found", not a disabled ref).
- Variants: drawer (right, 1024 and above), bottom sheet (below 768), docked pane (1920 or transcript drafts at 1280 and above).
- States: default, hover, focus-visible, pressed, selected ("Evidence open" text on the statement), loading (skeleton for the source block; statement stays readable), source unavailable ("Source could not be opened. This statement is not counted as checked."), partial (some sources open, some failed), permission restricted ("You cannot open this record." when the source belongs to a patient or organisation outside scope; treated as unsupported), long content (source field truncates with "Show full value"; no hover-only content), stale (if the source changed after generation: "This record was edited after the draft was made").
- Behaviour. Opening a source records an evidence-open event (client held; storage is a contract request, M section 4). Esc closes the panel and returns focus to the ref that opened it. Opening another ref replaces the drawer content. The drawer is `role="dialog"`, non-modal above 1280 px (focus may leave), modal below.
- Keyboard. Tab to a ref, Enter or Space opens; focus moves to the drawer heading; Esc closes; refs are reachable in reading order.
- Screen reader. On open: heading announced by focus move. On source failure: `role="alert"` is not used (not a user-action error); `role="status"` "Source could not be opened."
- Responsive. 320 to 767: sheet from the bottom, 80 percent height, statement text repeated at the top of the sheet so context is not lost; 768 to 1279: overlay drawer 420 px; 1280 and up: docked beside, statement stays visible.
- Data. `sourceRefs[]` with type, id, `apiPath`, supporting field key; read-only fetch per ref.
- Testing. axe on drawer; keyboard-only run; unit: failed source not counted as opened-and-checked; 200 percent zoom at 390 px; no hover-only information.

---

## 6.2 Section-level versus whole-document approval (CD-401)

**Task.** After reviewing, the therapist must take responsibility for the summary. Needs: how much is checked, what is still open, one clear decision. Action: Approve, Approve with edits, Reject with reason.

**Constraints.** The PRD stores one `AIReview` per generation. A partially approved summary assembled over several sessions blurs "who approved what, when" (M alternative D).

**Alternatives.**

| | Model |
|---|---|
| A. Whole-draft decision with section progress | One decision per generation; each section shows "n of m statements resolved" as local progress only. |
| B. Section-level approval | Each section has Approve section; draft is approved when all are. |
| C. Per-statement accept or reject | A control on every statement. |
| D. Auto-accept supported statements, review only flagged | Supported statements pass unless the clinician objects. |

**Gates.** A passes. B passes accessibility and privacy; safety conditional (needs per-section review rows the contract lacks). C passes but produces dozens of controls per draft (judgement: click-through risk, PAIR/NN/g argument). D fails safety: content enters the record without a clinician action on that content (brief section 16; AC-F8).

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 | 5 |
| Accessibility and usability (25) | 4 | 4 | 3 | 4 |
| Error prevention and trust (20) | 5 | 3 | 4 | 1 |
| Business and operational (15) | 3 | 3 | 2 | 4 |
| Interaction efficiency (10) | 3 | 4 | 1 | 5 |
| Implementation cost (5) | 4 | 2 | 2 | 4 |
| **Weighted** | **3.95** | **3.55** | **2.80** | ineligible (3.75 raw, gate fail) |

A: (100+100+100+45+30+20)/100. B: (100+100+60+45+40+10)/100. C: (75+75+80+30+10+10)/100. D raw: (125+100+20+60+50+20)/100 = 3.75; ineligible regardless.

**Selected: A.** Section progress is a counter ("Reported changes: 2 of 3 resolved"), not an approval. **Rejected:** B (not supported by the model, messy accountability), C (click-through), D (fails safety). Runner-up B, revisit if clinicians report whole-draft decisions are too coarse (U).

**Spec: `ReviewProgress`.** A text line per section heading and one total line near the decision ("5 of 7 statements resolved. 1 item of missing information not yet acknowledged"). Counts are text, in a `role="status"` region updated politely and debounced (at most one announcement per 2 s). Not a percentage, not a ring. Persistent across scroll via the sticky decision bar (see 6.8). Narrow screens: counts collapse into the bar's summary line.

---

## 6.3 Inline editing of generated text (CD-402)

**Task.** Fix a sentence without retyping the draft. The clinician's edit must become clearly clinician-authored, and the generated original must stay recoverable.

**Alternatives.**

| | Model |
|---|---|
| A. Edit in place per statement, original kept | "Edit" turns the statement into a textarea; Save keeps both versions; "Restore original" available. |
| B. Plain-language instruction ("make it shorter") | Clinician types an instruction; the system rewrites (Abridge, SPRY). |
| C. One rich-text editor over the whole draft | Edits free-form; statement boundaries and refs are lost. |
| D. Accept or reject only | No editing; reject and regenerate. |

**Gates.** C fails safety (refs and statement status lost after the first edit, so the unsupported check can no longer be trusted). B passes only if the rewrite is stored as a new generation with the instruction (otherwise generated text silently replaces text, breaking brief section 16). A and D pass.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 | 2 |
| Accessibility and usability (25) | 4 | 3 | 3 | 4 |
| Error prevention and trust (20) | 5 | 3 | 2 | 3 |
| Business and operational (15) | 3 | 4 | 3 | 2 |
| Interaction efficiency (10) | 3 | 5 | 3 | 5 |
| Implementation cost (5) | 4 | 2 | 4 | 5 |
| **Weighted** | **3.95** | **3.55** | 2.85 (gate fail) | 3.15 |

**Selected: A.** B is deferred; if later added it must create a new generation, store the instruction, and show "Rewritten from your instruction" provenance. **Rejected:** C, D. Trade-off: slower than a chat instruction. Carbon's revert-to-original idea is taken (Restore original).

**Spec: `StatementEditor`.**
- Anatomy: statement text; "Edit" (secondary, size sm, accessible name "Edit statement 3"); when editing: `Textarea` with visible label "Your wording for statement 3", character guidance only if a limit exists, "Save wording", "Cancel editing", "Restore generated wording" (only when already edited).
- After save: label on the statement "Edited by {name}, {time}"; refs stay attached and still open; the verifier status is shown as "Support not re-checked after your edit" (an edited statement is clinician-authored text and the supported label no longer applies to the new words); original available through CD-403.
- Never overwrites: edits live in the `AIReview` payload (edited output) until the decision; the generation row is untouched; nothing reaches the note until "Use in note" (CD-406).
- Keyboard: Edit moves focus to the textarea; Esc cancels only when the text is unchanged, otherwise asks "Discard your wording?"; Save returns focus to Edit.
- Screen reader: on save `role="status"` "Wording saved for statement 3. Original draft kept."
- States: default, editing, saving, save error ("Your wording is still here. Not saved. Try again." in-context, never a toast), unsaved changes (leaving asks to discard), read-only (draft already decided), permission restricted (not on care team: Edit absent and reason line shown), long content (textarea grows; no truncation).
- Testing: edited text never lands in the generation record; leaving with edits prompts; axe on textarea label.

---

## 6.4 Revision comparison (CD-403)

**Task.** See what the clinician changed against the generated draft (before approving, in history later), and what changed between two generations after a regenerate.

**Alternatives.**

| | Model |
|---|---|
| A. Per-statement "Original draft" disclosure | Under an edited statement a disclosure shows the original wording as a labelled block. |
| B. Whole-draft two-column comparison | Generated left, edited right, aligned by statement, in history. |
| C. Inline word-level diff in one column | Insertions and deletions marked inside the text. |
| D. Version list only | Versions named, content opened one at a time. |

**Gates.** C must carry text labels for inserted and removed spans or it fails "not colour alone"; as pure strike and underline marks it is hard on screen readers (judgement). All pass otherwise.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 5 | 4 | 2 |
| Accessibility and usability (25) | 5 | 3 | 3 | 4 |
| Error prevention and trust (20) | 4 | 5 | 4 | 3 |
| Business and operational (15) | 3 | 4 | 3 | 2 |
| Interaction efficiency (10) | 4 | 3 | 4 | 2 |
| Implementation cost (5) | 5 | 3 | 2 | 5 |
| **Weighted** | **4.15** | 4.05 | 3.50 | 2.85 |

**Selected: A in the live review; B in record history** (read-only, two columns at 1024 and above, stacked "Generated draft" over "Final wording" below that, aligned by statement). **Rejected:** C (screen reader cost, no clear gain), D. Between two generations, use B with "Draft 1" and "Draft 2" headings. This reuses the `DiffList` meaning for plan versions (usage matrix A3: one diff implementation) only where fields differ; free text uses the labelled blocks above.

**Spec.** Labels are fixed words: "Generated draft" and "Your wording". Blocks are stacked, each with its label as a visible heading, so the pair reads linearly for screen readers. No strike-through on either (strike-through already means "rejected, not used" in `AIDraftBlock`). Keyboard: the disclosure is a native `details`/`summary` or `aria-expanded` button. History comparison region has `role="group"` named "Comparison of generated draft and final wording". Loading: skeleton two blocks. Error: "The earlier draft could not be loaded." with Retry. Testing: reading order check; no information only in colour.

---

## 6.5 Generated-content provenance (CD-404)

**Task.** At a glance and in an export-adjacent context, know where text came from: who or what produced it, from which inputs, when, and whether anyone has taken responsibility.

**Alternatives.**

| | Model |
|---|---|
| A. Fixed text provenance line | One line under the block header: provider, input count and period, generated time. |
| B. Icon badge | A small mark denoting AI. |
| C. Hover or popover details | Provenance only on demand. |
| D. Colour-coded background | Tint distinguishes AI from human text. |

**Gates.** B fails brief section 16 (decorative marker as a substitute for information). C fails "essential information not behind a tooltip" (brief section 18) and touch. D fails not-colour-alone when used alone.

**Selected: A** (weights omitted because B to D fail gates; A is the only eligible; a score table would be decorative). Carbon's label-opens-explanation pattern is partly kept: the line has a "How this draft was made" text button that opens a short popover (inputs listed, what the verifier checked, what it cannot check), never the only carrier of provenance.

**Spec: `ProvenanceLine`.** Template, exact words: "Generated draft. Provider: {provider}. Based on {n} records from {start date} to {end date}. Generated {date, time, zone}." Deterministic provider: "Demo provider, rule-based" (AC-F10); never "AI" in front of it. After edits: "Edited by {name}, {time}." After approval: "Reviewed and approved by {name}, {time}." Statement level: a short "From check-in, 14 Nov" text beside the refs where there is room. Typography: caption size, `ink-muted`, provider name in `Mono` as `AIDraftBlock` does today. No icon. Date formats: clinic zone with abbreviation (usage matrix G3). Missing provider string: show "Provider not recorded" and treat as a defect (never hide the line). Testing: AC-F10 string assertion.

---

## 6.6 Unsupported-content warnings and missing information (CD-405)

**Task.** Find, before deciding, every statement with no supporting record and every gap the verifier reports, and resolve or acknowledge each.

**Alternatives.**

| | Model |
|---|---|
| A. Per-statement status chip, flagged items first in their section, plus a summary above | Words and icon on the statement; one count line; missing information as its own section. |
| B. Summary banner only | A banner counts problems; statements look the same. |
| C. Colour or underline on the text | Highlight unsupported words. |
| D. Confidence indicator per statement | A bar, level or percentage. |

**Gates.** B fails safety (reader must hunt, flagged text indistinguishable). C fails not-colour-alone and is invisible to a screen reader unless text is added. D fails brief section 16 (no validated meaning; PAIR lists false precision and over-acceptance as risks). Only A passes.

**Selected: A.** Weighted table omitted because the others fail gates (a number would imply a comparison that the gates already settled).

**Spec: `StatementStatus` (a `StatusChip` usage).**
- Words and icon: "Supported" (success tone, check icon) shown as plain text with icon, not a filled chip, to avoid a wall of green; "No supporting record found" (warning tone, alert icon, filled chip); "Missing information" items in their own section, each with a neutral info icon and sentence ("No check-in on 14 Nov").
- Order: within a section, unsupported statements first. They cannot be collapsed (accordions below 768 keep them expanded, per M section 14).
- Actions on an unsupported statement: "Edit statement", "Remove statement", "Keep with a note". Keep with a note requires a visible note field ("Why you are keeping this statement") and marks the statement "Kept without a supporting record. Note by {name}." in the draft and in history. It is not a one-click override.
- Missing information: "Acknowledge" (secondary) per item; or "Add to note" which inserts the gap as a clinician-authored line only after explicit action.
- Summary above the sections: "12 statements: 10 supported, 2 with no supporting record. 3 items of missing information." Text only, `role="status"`.
- Errors: verifier status absent (schema failure) means the whole draft is not shown ("The draft could not be used and was not saved").
- Never: a confidence figure, a level named high/medium/low, a progress ring, colour-only marking, or "AI is 87 percent sure".
- Testing: seeded unsupported statement appears first, cannot be collapsed, blocks the decision until resolved (6.8); axe; reading order.

---

## 6.7 Authorship states: generated, clinician-authored, finalised (CD-406)

**Task.** Anywhere text appears (review panel, note editor, history), tell at a glance who wrote it and what state it is in, so generated text cannot be mistaken for the clinician's or for signed record.

**Alternatives.**

| | Model |
|---|---|
| A. Rule, surface and fixed label per state | Left rule style, surface treatment and one fixed label phrase per state. |
| B. Icon badges per state | Distinct icons. |
| C. Colour-only tint per state | Background colour differences. |
| D. Separate containers: AI content lives only in the AI summaries section until the clinician inserts it | Spatial separation, plus a label. |

**Gates.** B and C fail alone (decorative or colour-only). A and D pass; they are complementary, not exclusive.

**Selected: A plus D's rule.** Five states, one phrase each, never abbreviated:

| State | Label (exact) | Treatment (token roles) | What it means |
|---|---|---|---|
| Generated draft | "Draft, generated, not reviewed" | dashed left rule `ai-rule`, `surface-sunken` | Machine output; no clinician has acted |
| Edited | "Generated, edited by {name}" | dashed rule retained, label changes | A clinician changed words; original kept |
| Approved draft | "Generated, reviewed and approved by {name}" | solid `primary` rule | Clinician took responsibility for the summary; not part of a signed note |
| Clinician-written | author line "{name}, {role}, {time}" | no rule, normal surface | Typed by a clinician |
| Signed | "Signed by {name}, {date time zone}" | no rule, `status` chip "Signed" (CD-415) | Final, immutable; later changes are amendments (CD-412) |

Rules: no state is shown by icon or colour alone; the dashed-versus-solid rule is a secondary cue only; the label is the carrier. Generated text never appears inside a clinician-written section (SOAP) without an explicit "Use in note" action; on use, the inserted text is marked in the note as "From approved draft, {time}" until the author edits it, then as clinician-authored with the source retained in `ClinicalNoteVersion.source`. Approved is not signed: the approved block says "Approved. Not yet part of a signed note." wherever that is true (M rule 4).

**Naming resolution (usage matrix C8).** Clinician surfaces: "generated draft" and "AI-assisted features" in settings. Patient consent: replace "automated drafting tools" with plain words that name AI once: "Allow AI-assisted drafting for your therapist's notes" with a one-line explanation that a therapist reviews everything and nothing is added to the record without them. This is a proposal; the consent copy needs the advisor's and legal review before use (open question).

**Spec states.** Default, editing, approved, rejected ("Draft rejected, not used" with reason visible, text not struck through; the existing `AIDraftBlock` strike-through is dropped because it hides the content the clinician may still need to read), signed, superseded, partial, missing information, permission restricted, stale. Responsive: labels wrap, never truncate. Tests: label strings; axe; screenshot without colour.

---

## 6.8 The decision control and its gate (CD-407)

**Task.** Take responsibility: approve, approve with edits or reject. The control must make skimming harder than checking without becoming a click-through.

**Alternatives.**

| | Model |
|---|---|
| A. Checklist-gated single decision | Decision stays disabled, with a reason in text, until flagged items are resolved, missing information acknowledged, and evidence opened for reported-change statements. |
| B. Always-enabled Approve | The block's current behaviour. |
| C. Typed attestation | The clinician types a phrase or their name to approve. |
| D. Second-reviewer approval | A different clinician must co-approve. |

**Gates.** B fails safety (approve one click from unseen text; M gate G-M3). C passes but is the demanding confirmation NN/g reserves for the rarest actions; used on every draft it trains reflex typing. D adds a workflow the PRD does not have.

| Criterion | A | C | D |
|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 2 |
| Accessibility and usability (25) | 4 | 3 | 4 |
| Error prevention and trust (20) | 5 | 4 | 5 |
| Business and operational (15) | 3 | 2 | 1 |
| Interaction efficiency (10) | 3 | 1 | 1 |
| Implementation cost (5) | 4 | 4 | 1 |
| **Weighted** | **3.95** | 2.90 | 2.80 |

(B excluded: gate fail.) **Selected: A.** Rejected: B, C, D. Weakness named: a checklist can become ticks; mitigation is tying items to recorded events (evidence opened, items resolved), not to a self-declared checkbox (U, to be tested).

**Spec: `ReviewDecisionBar`.**
- Anatomy: summary line (counts), reason line when disabled, three actions. Labels: "Approve draft" (primary), "Approve draft with edits" (replaces Approve automatically when any edit exists, so the label states what is being approved), "Reject draft" (secondary; opens an inline required field "Why is this draft not being used?"). No "Discard".
- Disabled reason, visible text, linked with `aria-describedby`, with jump links: "Approve is unavailable: 2 statements have no supporting record, and missing information is not acknowledged." Buttons use `aria-disabled` and stay focusable so the reason is reachable (usage matrix F pattern; NN/g-style guidance on disabled controls).
- Sticky at the bottom of the review area on all widths so the decision and its counts stay visible; it must not cover focus (2.4.11), so the scroll container has bottom padding equal to the bar height.
- After success: block turns approved ("Approved by {name} at {time}. Original draft and your edits are kept in record history."), `role="status"`, focus moves to the block heading; the next action offered is "Write the note" (if relevant), not an automatic insertion.
- Errors: decision write fails: inline Banner above the bar, "Your edits are still here. The decision was not saved. Try again." No toast.
- Offline: bar disabled with "You are offline. Your edits are kept on this page. Reconnect to approve."
- Permission: only care-team therapists; otherwise the bar is replaced by "Only a therapist on this patient's care team can review AI drafts." with a link to the care team.
- Single primary per context: only one of Approve or Approve-with-edits is ever shown.
- Testing: AC-F4, AC-F8; keyboard: bar reachable by Tab from the last statement; disabled reason read; seeded unsupported statement blocks approval.

---

## 6.9 Generation controls and failure states (CD-408)

**Task.** Ask for a draft deliberately, wait honestly, recover from failure, and regenerate without losing history.

**Alternatives.**

| | Model |
|---|---|
| A. Explicit "Draft progress review" button in the AI summaries section | Clinician starts a generation; one in flight at a time. |
| B. Auto-generate on opening the record | Draft present on arrival. |
| C. Scheduled pre-generation | Drafts prepared before visits. |
| D. Floating assistant | Chat entry anywhere. |

**Gates.** B and C fail privacy and safety (generation without a clinician request and without a visible consent check at that moment; content waiting unseen). D fails (out of scope, AC-F9; no statement-level sources).

**Selected: A** (only eligible; no weighted table). Label rules: "Draft progress review" (not "Generate", not "Ask AI", no sparkle). Regenerate label: "Make a new draft" with the line "The current draft stays in history."

**Spec.** Loading: "Generating a draft from {n} records. This can take up to 20 seconds." with an indeterminate progress bar and elapsed seconds in text (no fabricated percentage); skeleton mirrors sections; no partial text; Cancel keeps nothing. Timeout: "This is taking longer than expected. Trying again (1 of 2)." then "We could not reach the summary service. Nothing was saved." with "Try again" and "Write the note without a draft". Schema-invalid: Banner "The draft could not be used and was not saved. Nothing was added to the record." Consent refusal: "AI-assisted features are off for this patient. A summary was not generated." with a link to consents. Stale: banner "New records since this draft was made (2). The draft does not include them." with "Make a new draft". Persisted failure banners use `role="alert"` once, then remain as text. Testing: AC-F2, AC-F5, AC-F7.

---

## 6.10 Evidence panel failure and source-checking state (CD-409)

**Task.** Make sure a source the clinician could not read is never counted as checked, and that unavailability is visible and recoverable.

**Decision (conventional extension, no alternatives invented).** The evidence open event is recorded only after the source content rendered. A failed source shows the failure text in the drawer and in the statement ("Source could not be opened"), keeps the statement unchecked, and offers "Try opening again". If a source is out of scope the statement is treated as unsupported (AC-F3). This reuses the established error pattern (CD-449) and the `EvidencePanel` states in 6.1.

---

## 7. Cross-cutting rules for this family

1. No sparkle, glow or gradient; AI is identified by words (CD-404, CD-406). Carbon's own AI styling is noted and not adopted.
2. No confidence percentage, level or bar anywhere (PAIR: false precision; PRD).
3. Generated, edited, approved, clinician-written and signed text each carry their fixed label (CD-406). Labels are never abbreviated, truncated or moved into a tooltip.
4. Approve is not Sign (M rule 4; AC-F8).
5. Edits are never lost silently; regenerate never deletes a prior generation (M rule 5; DAX trap avoided).
6. Feedback: failures and warnings are persistent, in context, with text (CD-440 to CD-449). Nothing in this family uses a toast for an error.
7. Open questions for the advisor: (a) approval of consent copy in 6.7; (b) where evidence-open events are stored (contract request in M); (c) whether "Keep with a note" should be restricted to specific roles; (d) whether edited statements should be re-verified automatically (new generation) or flagged "not re-checked" as specified here.

## 8. Traceability (brief section 25)

| Decision | Selected | Screen | Implemented component | Storybook | Tests |
|---|---|---|---|---|---|
| CD-400 | Numbered refs plus drawer; docked pane for transcript | AI summaries, note-from-transcript | `EvidenceRef`, `EvidencePanel` (new) | to add | drawer a11y, failed-source |
| CD-401 | Whole-draft decision, section progress | AI summaries | `ReviewProgress` (new) | to add | counts text |
| CD-402 | Edit in place per statement | AI summaries | `StatementEditor` (new) | to add | edit never alters generation |
| CD-403 | Original disclosure; two-column in history | AI summaries, history | `RevisionPair` (new) | to add | reading order |
| CD-404 | Fixed text provenance line | all generated blocks | `ProvenanceLine` (new) | to add | AC-F10 |
| CD-405 | Statement status plus missing-info section | AI summaries | `StatementStatus` | to add | seeded unsupported |
| CD-406 | Five authorship labels | review, notes, history | `AIDraftBlock` (revised) | existing, revise | label strings |
| CD-407 | Checklist-gated decision bar | AI summaries | `ReviewDecisionBar` (new) | to add | AC-F4, F8 |
| CD-408 | Explicit generate button and states | AI summaries | page-level | to add | AC-F2, F5, F7 |
| CD-409 | Failed source never counted | evidence drawer | `EvidencePanel` | to add | unit |

Prototype comparison for 6.1 to 6.8 is specified in `docs/design/design-alternatives/prototypes/ai-evidence-review.md`.
