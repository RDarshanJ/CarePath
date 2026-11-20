# Checkpoint C3: evidence model, honesty of AI labelling, stretch tier

Date: 2026-11-20. Reviewer: advisor. Scope: WP 5.1, 5.2, 5.4 and 5.4b as merged on `main` at commit `011dff0`, plus the schema change in migration `20261124050200_phase5_ai_review`. Where this note differs from `advisor-plan.md`, `advisor-plan-rev1.md`, `checkpoint-c1.md`, `checkpoint-c2.md`, DR-002 or `rebuild-plan.md`, this note wins.

**Decision: the evidence model holds for what it claims, and no work package is rejected. Three packages are accepted with fixes. The stretch tier is not released: three items are cut, one is held until a key exists. Two small fix packages (WP 5.6a, WP 5.6b) land before WP 5.3 starts.**

What the evidence model claims, and all it may be said to claim: a statement marked supported cites at least one record, and every record it cites exists in the same organization, belongs to the same patient, and has a value in the cited field. It does not check that the record says what the statement says. With the demo provider the two happen to coincide because every statement is a count or a quotation of its own source. With a model they would not.

## 0. What was checked

- **Tests, in a scratch worktree of `011dff0`** (`/home/claude/wt/c3`, own install, removed afterwards): `pnpm --filter @carepath/ai test` 104 passed in 9 files; `pnpm --filter @carepath/fhir test` 101 passed in 4 files.
- **`GATE_SKIP_VERIFY=1 scripts/gate-wp-5.2.sh`** in the same worktree: exit 0. Migration applied and matched `schema.prisma`; 7 database tests; seed 78 of 78 integrity checks, content hash `9950d0b8…a5425` (the hash in PROGRESS); Scenario F 21 tests; M8 5 tests; lint, format, three type-checks, `openapi:check`; tree clean. The final `pnpm verify` stage was skipped on purpose: WP B-CR's gate held a lease and the web lock at the time. The worker's full run is the one in PROGRESS; I did not repeat it.
- **Evaluation reproduced.** `evals/run.ts --out` to a scratch file gave a measured-results table identical to `docs/evaluation/ai-eval.md` (25 valid, 0 of 181 unsupported, 146 of 195 recalled, 0 of 4 injections followed).
- **One probe of my own.** The demo provider was asked for a progress summary of a patient with no sessions, no check-ins and no published plan in the window, and again with one patient message only. Both runs: `failed`, `invalid_output`, three attempts, "Output failed the progress_summary schema at summary". See 1.1 item 1.
- **Read in full:** `packages/ai/src` (pipeline, verifier, sources, schemas, inputs, redaction, injection, both providers, prompt registry), `apps/api/src/modules/ai` (repo, service, review-state, view, provider, routes), `apps/api/src/modules/notes`, the migration, the DocumentReference and Practitioner mappers, the export route and its loader, `packages/shared/src/labels/ai.ts` and `note.ts`, both evaluation reports, DR-002 section M and `rebuild-plan.md`.
- **Live provider preconditions.** No `CAREPATH_ANTHROPIC_*` variable is set in this environment. `https://api.anthropic.com/v1/models` answered HTTP 401 without a key, so the host is reachable from this box today.
- **Shared cluster.** My lease (pid 14140) was released at 10:14 with another lease still live; the cluster was stopped at 10:16 by the last lease to exit, as `scripts/db.sh release` is designed to do. I did not call `stop` or `reset`.
- Not checked: `pnpm verify` end to end at `011dff0`; the Anthropic provider against the real API; the batch 2 validation rules line by line (covered by the 55 broken fixtures and the tests above, not by my reading); any UI, because WP 5.3 is not built.

## 1. Verdict per work package

| WP | Verdict |
|---|---|
| 5.1 AI pipeline, demo provider, verifier, redaction, eval | Accept with fixes |
| 5.2 AI endpoints, review, approval gate, notes | Accept with fixes |
| 5.4 FHIR batch 1, validation, import, Synthea demo | Accept |
| 5.4b FHIR batch 2 | Accept with fixes |

### 1.1 WP 5.1: accept with fixes

Sound: refusals happen before any provider call; an external provider can only be handed `RedactedText`; the outbound canary stops a send when a known identifier survives; failed runs return no partial output; token and cost totals include failed attempts; prices are configuration; the prompt fingerprint is pinned by a test.

1. **A summary of an empty window fails, and the failure blames the provider.** `packages/ai/src/schemas.ts:75` requires `summary` to hold at least one statement. `draftProgressSummary` (`providers/deterministic.ts`) writes summary statements only from sessions, check-ins and a published plan. A patient with none of the three in the window gets three `invalid_output` attempts and a stored failed generation, answered 502. A newly assigned patient is the ordinary case. PROGRESS (WP 5.1, deviation 2) says "`summary` may be empty when the window has no records"; the schema says otherwise. Fix A1.
2. **The verifier accepts any record of the patient, not only the records the prompt was built from.** `verifier.ts:107-121` resolves a reference by type, id, scope and field. A model that cites a real check-in from outside the window, which it never saw, gets "supported". The demo provider cannot do this; a model can. Fix A2.
3. **An invented redaction token survives into the output.** `redaction.ts` `restore` leaves an unknown `[[NAME_9]]` as it is, and `pipeline.ts:201-202` then validates and stores it. Fix A3.
4. **`providers/anthropic.ts:81-98` does not read `stop_reason`.** A reply cut at `max_tokens` is reported as "did not return JSON" and retried twice at full cost. Fix A4.
5. `redaction.ts:97-103` treats each part of a known name of three letters or more as a name anywhere in the text. A patient called May, Will or Rose turns ordinary words into tokens. The text is restored afterwards, so this costs model input quality, not correctness. No fix required; record it as a limitation in the redaction test file's header.
6. The evaluation report needs three sentences it does not have. See 3.2. Fix A5.

### 1.2 WP 5.2: accept with fixes

Sound: one stored row per request, written with its audit event in one transaction; a failed generation is stored as failed and answered 502, never as success; reviews are append-only and the database refuses anything after the one decision; statements are verified again on every read and inside the approval transaction; a reference to another patient's record reads `out_of_scope` and its value is never returned (`view.ts:95`); approval of a note draft creates a draft note and only `POST …/sign` by the author signs; consent is checked at generation and again at approval; the stale-revision check runs under a row lock.

1. **A clinic administrator is sent the note text they are not allowed to read.** `notes/routes.ts:382` scopes the entered-in-error call with `requirePatientRead`, and `:405` answers with `toNote`, which carries every version's SOAP text (`:79-96`). The `clinic_admin` role has no `clinical.read` (migration `20261120120000_role_permissions`), cannot call `GET …/notes/:noteId`, and yet receives the full note from this route with no `phi.read` event. The test at `apps/api/test/phase5/ai.test.ts:565-577` exercises exactly this path and does not look at the body. Fix B1.
2. **The handler decides by role name, not by permission.** `notes/routes.ts:100`, `:384`, `:401-402` test `ctx.role === "clinic_admin"` after the route config has already admitted `settings.manage`. Ruled in 4.3. Fix B1.
3. **The route says something that is not true on `main`.** `notes/routes.ts:374`, and so `openapi.json`: "the note is no longer exportable". The export sends it (1.4). Fix B2 makes the sentence true.
4. **Two signed notes for one visit are possible.** `ai/routes.ts:227-240` starts a new draft for an encounter whatever notes it has, and `:506-524` turns each approved draft into its own note. Nothing in the schema limits notes per encounter. Fix B4.
5. **The redactor is not told the staff names.** `ai/repo.ts:350-357` passes the patient's name, birth date, email, phone and MRN. Messages and transcripts name the therapist. This matters only for an external provider, which has never been run, and the data is synthetic. Fix B5, before any external call from the API.
6. **The migration's note rules have no database test.** `packages/db/test/phase5-ai-review.test.ts` has seven tests, none for `ClinicalNote_entered_in_error_check` or `ClinicalNote_freeze_entered_in_error`. The API test covers the happy path only. Fix B6.
7. `ai/view.ts:71` derives `isDemo` as "provider is not `anthropic`". It fails in the safe direction (an unknown provider reads as demo). Keep it.
8. `ai/repo.ts:704-730` nudges a timestamp forward one millisecond when the clock has not moved. Acceptable; it keeps order under the fixed test clock. The stored time can therefore differ from the wall clock by milliseconds, which no document should describe as exact.
9. A draft note cannot be discarded. The database allows `draft → entered_in_error`; the API allows only `signed → entered_in_error` (`notes/routes.ts:388`). Not fixed now; listed in section 7.

### 1.3 WP 5.4: accept

The claim wording is right everywhere I looked ("US Core-aligned shapes, validated by CarePath's defined checks"; official validation "not performed" with the attempt logged; no `meta.profile`). The export route refuses to send a Bundle that fails its own checks. The report says the fixture set was written by the same worker as the checks and measures those cases only. The 500 on seeded patients that batch 1 left behind is closed by 5.4b (4.4).

### 1.4 WP 5.4b: accept with fixes

Sound: drafts are never read by the export (`fhir/repo.ts` loads only notes with `signedAt`), and the gate proves it on the seeded database (3 unsigned notes, 0 draft version ids in 40 exports).

1. **Entered-in-error notes are exported with their full text.** `packages/fhir/src/mappers/document-reference.ts:73-78` marks every version `entered_in_error` and `:168-176` still attaches the SOAP text. DR-002 M.3 says excluded. Ruled in 4.1. Fix B2.
2. `mappers/practitioner.ts:20` drops an NPI that fails the check digit and says nothing. The report discloses it. It stays, with the seed fixed in WP 6.3 (4.4).

## 2. Schema change: `20261124050200_phase5_ai_review`

**Accepted.** It is the schema the approval flow needs, and it puts the rules in the database, which is where C1 wanted them.

| Part | Ruling |
|---|---|
| `AIReviewDecision` gains `revised` | Accept. A revision is a working state, not a decision. The predicates compare text or list the old values because the new value cannot be used in the transaction that adds it; that is correct for PostgreSQL 16 |
| One decision per generation: partial unique index plus `enforce_ai_review_order` | Accept. The trigger gives the readable error and the index is the guarantee under a race |
| Only a succeeded generation can be reviewed | Accept |
| `previousGenerationId`, same patient, never itself | Accept |
| `freeze_completed_generation` (no update or delete once succeeded or failed) | Accept. This is ADR-10 for generations. `pending` is now unused by the API (4.5); leave the value, it costs nothing |
| `ClinicalNote.enteredInErrorAt`, `Reason`, `ByUserId`, the check and the freeze trigger | Accept, on condition B6: a rejection test for each branch of the check and for the trigger |

Conditions and notes:

- Two rules are still missing and go into one further migration in WP 5.6b: one signed note per encounter (B4) and the permission grant (B1). That migration is created after WP B-CR's `20261125000000_bcr_contract_batch` has merged and sorts after it.
- Migration names carry dates later than the day they were written. Order is what Prisma uses, so nothing breaks. No document may cite a migration name as the date of the work.

## 3. Honesty audit

### 3.1 Is demo output always labelled as demo

In storage and in the API: yes. `AIGeneration.provider` and `providerLabel` are written from the provider object in the same transaction as the row; the label is "Demo provider, rule-based"; model is null; tokens and cost are zero with the label "No model call: demo provider, rule-based, zero cost"; the two test probes carry "(test probe: …)" in the stored label; the seed stores the provider's real output, not hand-written text; `AI_PROBE` is forced to `none` in production (`config.ts:105`).

In the words the screen will use: **no, and this is the one finding that would have broken plan section 6.** `packages/shared/src/labels/ai.ts:4`, `:30`, `:36`, `:42` and `labels/note.ts:24` (CD-236, landed by D-WP-3) say "AI-generated": "Draft, AI-generated, not reviewed", "AI-generated, reviewed and approved", "Started from an AI-generated draft". In the product as it will be demonstrated, every one of those blocks is rule-based extraction with no model behind it. Plan section 4 wrote the label as "Draft, generated, not reviewed" beside the provider name for this reason. Ruling:

- Status labels drop "AI": "Draft, generated, not reviewed", "Generated, reviewed and approved", "Generated, edited and approved". The note line reads "Started from a generated draft". `AI_GENERATED_NAME` becomes "Generated draft".
- Every generated block shows `provider.label` as received. When `provider.isDemo` is true the block also shows the fixed sentence "Rule-based demo output. No AI model was used." as a constant in `@carepath/shared` copy (DR-002 R3).
- The patient consent wording ("Automated drafting tools") is already right and stays. `AI_CONSENT_NAME` stays: it names the feature a clinic could configure, not the output on screen.
- CD-236 is amended by this note. Fix B7; WP 5.3 builds on the new strings.

### 3.2 Are the evaluation numbers framed correctly

Mostly. `docs/evaluation/ai-eval.md` says the provider is rules and not a model, that no live provider was run, that the rules were changed after reading the cases and the numbers are optimistic for unseen transcripts, and that "unsupported" checks the cited record exists in scope and not what it says. That is the framing this checkpoint asked for. Three gaps, all fixed by A5:

1. **Two of the headline numbers are true by construction.** The demo provider builds each statement by quoting the turn it cites and reads only the case's own records. "Unsupported-statement rate 0 of 181" and "Citation accuracy 146 of 146" therefore cannot be anything else. They show the harness and verifier run; they are not findings about quality. The report must say so beside the table.
2. **The injection figures are in-sample.** Two detection patterns and the sentence-level handling were written after reading case-06 and case-19, which are two of the four probes. "0 of 4 followed" must carry "the patterns were written with these cases in view; n = 4".
3. **Scope.** The report covers note drafts. Progress summaries have no evaluation. No document may speak of "the AI evaluation" as covering both.

Also: PROGRESS (WP 5.1) says "two rules were adjusted"; the report lists three changes (sentence-level injection handling, two injection patterns, the strength coverage rule). The orchestrator corrects the count. None of these numbers is in `docs/evaluation/metrics.json` yet, so none may appear in a case study or the README until WP 8.1 puts them there with the wording above.

### 3.3 Other claims that overreach

| Where | Claim | Ruling |
|---|---|---|
| `notes/routes.ts:374`, `openapi.json` | An entered-in-error note "is no longer exportable" | False on `main`; true after B2 |
| PROGRESS, WP 5.1 deviation 2 | "`summary` may be empty when the window has no records" | False until A1; the orchestrator corrects the line when A1 merges |
| Approval gate, "evidence opened" | Could be read as "the clinician checked the evidence" | It records that the client posted an open event for one cited record of the statement. UI and docs say "opened", never "checked", "verified" or "reviewed". DR-002 already records this as an untested assumption |
| An edited statement keeps its source references | Could show as supported after the text changed | DR-002 M(d) stands: "Edited, not re-checked". WP 5.3 must not show the supported mark on a statement whose `resolution` is `edited` |
| FHIR report | None found | The wording, the "not performed" section and the limits of the fixture set are right |
| PRD, README, demo accounts, architecture docs | None found | Searched for compliance, validation, accuracy and model claims; nothing asserts what was not done |

Standing wording, added to the honesty rules: "supported" is always explained as "the cited record exists for this patient"; never "grounded", "verified", "fact-checked" or "no hallucinations".

## 4. Rulings

### 4.1 Entered-in-error notes in the FHIR export: excluded

DR-002 M.3 stands. The export reads only notes whose status is `signed`. A note marked entered in error leaves the export entirely: no DocumentReference for any of its versions.

Reasons. The export is a point-in-time collection Bundle handed to a person, not a feed to a system that holds an earlier copy, so there is nothing to retract and the FHIR status has no recipient. The patient can export their own record (`fhir.export_own`), and the commonest reason for the mark is a note written on the wrong patient: exporting it "with a status" hands one patient another patient's visit text. The API already tells its callers the note is not exportable.

Scope of the ruling: clinical notes only. `Condition` (verification status) and `Encounter` (status) keep their entered-in-error values in the export, because other exported resources reference them and CarePath has no route that sets those statuses. `fhir-validation.md` states the difference. Fix B2.

### 4.2 Audit event names outside PRD section 13: both accepted

- `note.entered_in_error`: accepted. An irreversible act on a signed record needs its own name so the audit viewer can filter on it.
- `note.version`: accepted. A write of clinical text is audited like any other. Condition for WP 5.3: draft autosave does not post a version per keystroke or per few seconds. A version is posted on leaving the editor, on an explicit save, or after 30 seconds without typing, whichever comes first. Each post is a permanent row and an audit event.
- The orchestrator adds both names to PRD section 13.

### 4.3 Clinic administrator and entered in error: a permission of its own

`settings.manage` is not accepted as the gate. It means "change organization settings"; a read-only role matrix that shows it would not tell anyone that administrators can retire clinical notes.

- New permission key `note.mark_entered_in_error`, "Mark a signed clinical note entered in error, with a reason", granted to `clinic_admin` only, by migration.
- The route admits `note.sign` or `note.mark_entered_in_error`. The handler then requires: the caller is the author, or the caller holds `note.mark_entered_in_error`. No comparison with a role name remains in the module.
- A caller without `clinical.read` gets the note header back (id, type, status, author, signed time, the entered-in-error block) with `versions: []` and `currentVersion: null`. No note text. The audit `purposeOfUse` and `detailCode` follow the permission used.
- DR-002 S5 stays an open sign-off. No administrator screen for this is required; WP 6.2 may offer the action from a `note.sign` row in the audit viewer, or leave it out. It must not invent another way to find a note.

### 4.4 Seed NPIs fail the check digit: fix in WP 6.3

`packages/db/seed/people.ts:243` builds a ten-digit value starting with 9 and no check digit. WP 6.3 computes the last digit with the same rule the validator uses (`isValidNpi`, prefix 80840), keeps the leading 9 that marks the values as fictitious, and adds an integrity check "every seeded NPI passes `isValidNpi`". The content hash changes; record the new one. The mapper keeps leaving out an NPI that fails the check, with its existing test, so an imported bad value cannot break an export. `fhir-validation.md` then reports the seeded export with NPIs present.

### 4.5 Inline generation: accepted, and the job version is cut

Inline is right for a provider that answers in milliseconds, and the code is honest about failure. The job variant is not deferred; it is cut. Conditions:

- The `pending` label text "This can take a minute. You can keep working." is not shown by WP 5.3, because no generation is ever pending. The button shows a busy state until the answer arrives.
- If an external provider is ever enabled in the API (it is not released, section 5), the settings must keep the worst case under 45 seconds (`AI_MAX_RETRIES=1` with the 20 second timeout) so the request does not outlive the proxy.

### 4.6 Approval gate and note rules

Accepted as built, as demo rules. The stored words "pending clinical governance review" stay wherever they are described. One addition, B4: one signed note per encounter.

## 5. Stretch tier

The design rebuild (D-WP-1 to D-WP-19), WP 5.3, 6.1, 6.2, 6.3 and Phase 8 are all still ahead, on two CPUs with one web lock. Nothing is released that takes a turn on that lock.

| Item | Decision | Reason and terms |
|---|---|---|
| Live Anthropic provider run | **Hold.** Releasable as an evaluation run only, never in the app | Terms below |
| Medplum sandbox push | **Cut** | Needs an account and credentials nobody has supplied; the export is a collection Bundle and a push needs a transaction Bundle with conditional references, which is new mapping work; it would prove little that the three validation layers do not. Docs keep "no sandbox or EHR integration" |
| Patient navigation assistant | **Cut** | DR-002 M already says it is not built. It is the weakest claim in the product and would need its own evidence model. The `navigation_answer` enum value stays unused; no route, no screen, no consent text mentions an assistant |
| Motion tracking (Phase 9) | **Cut** | Camera behaviour cannot be tested here, and the session player is the riskiest slice of the rebuild (D-WP-10) without it. Consequence, for D-WP-8: remove the "Camera movement tracking, not available yet" block from onboarding and from Sharing and consent (`(patient)/_lib/consent-copy.ts:34`); a promise about a cut feature is a dead item under R7. The `motion_tracking` enum value stays and stays ungrantable |
| Storybook | Released already by `rebuild-plan.md` section 6 | Unchanged |
| Saved filters, editable roles, row-level security, audit hash chain, PWA polish, landing art | **Cut** | Not revisited again |

**Live run: what is needed before it is released.**

1. A key supplied by the user for this purpose, as `CAREPATH_ANTHROPIC_API_KEY`, with `CAREPATH_ANTHROPIC_MODEL`. None is set in this environment. The session's own credentials are not to be used for the product.
2. `CAREPATH_ANTHROPIC_INPUT_USD_PER_MTOK` and `…_OUTPUT_…` read from the provider's price page on the day, with the date in the report. Without them cost is reported as "not computed".
3. WP 5.6a merged (A2, A3, A4), because those three are exactly what a model can trip and rules cannot.
4. The run is `pnpm ai:eval --provider anthropic --out docs/evaluation/ai-eval-anthropic.md` on the 25 synthetic transcripts. It writes its own file and never replaces the demo report. A spending ceiling is agreed before it starts; the run is stopped at the ceiling.
5. The report states: one run, 25 cases, the model id the API returned, the date, that the cases and rules were written before the run but the prompt was not tuned on a held-out set, and that "supported" still means the record exists.
6. The API stays on the demo provider. No generation from a model is stored in the seed or shown in a screenshot.

Egress is not the blocker: the API host answered from this box today. The key is.

## 6. Fix packages

Two packages, because one can start now and the other must wait for the schema.

### WP 5.6a, opus. Starts now. Owns `packages/ai/**`, `docs/evaluation/ai-eval.md`, `docs/evaluation/ai-eval.json`

Touches nothing owned by WP B-CR (`modules/sessions`, `review`, `patients`, `scheduling`, the schema, their contracts) or by D-WP-1 (`packages/ui`).

| # | Item |
|---|---|
| A1 | `ProgressSummaryOutput.summary` may be empty. Because the output schema is part of the prompt, register `progress_summary@1.1.0` with a change note and pin its fingerprint. Test: an empty window and a messages-only window both succeed with no summary statements and the expected `missingInformation`. The approval gate already refuses an output with nothing in it (`empty_output`), so such a draft can only be rejected |
| A2 | `verifyOutput` takes an optional list of allowed records (type and id). A reference that resolves but is not in the list is unsupported with a new reason `not_in_input`. The pipeline passes the generation's own `inputRefs`. Test with a provider that cites an in-scope record it was not given |
| A3 | After `restore`, any remaining `[[KIND_n]]` token in the output is `invalid_output` |
| A4 | The Anthropic provider treats `stop_reason: "max_tokens"` as `invalid_output` with a message that names truncation, and does not retry it. Test with the injected `fetch` |
| A5 | The report template gains the three statements in 3.2; re-run `pnpm ai:eval` and commit the regenerated report |

Gate: `scripts/gate-wp-5.1.sh` exit 0 in its own worktree (API 4051). The seed's stored generations change with A1, so the gate output records the new content hash.

### WP 5.6b, opus. Starts when WP B-CR has merged; finishes before WP 6.1 and WP 5.3 start

Schema order is 5.2, B-CR, 5.6b, 6.1. Owns `apps/api/src/modules/ai`, `modules/notes`, `modules/fhir`, `packages/fhir/**`, one migration `phase5_c3_fixes`, `packages/shared/src/contracts/ai.ts` and `permissions.ts`, `packages/shared/src/labels/ai.ts` and `note.ts` with their tests, `packages/shared/src/copy.ts` (one constant), `apps/api/openapi.json` (regenerated), `docs/evaluation/fhir-validation.*`. The label edit is authorised here; it does not wait for D-WP-U. It touches `packages/shared/src/contracts/errors.ts` and `labels/labels.test.ts`, which B-CR is editing now; that is why it waits.

| # | Item |
|---|---|
| B1 | Ruling 4.3: permission `note.mark_entered_in_error`, granted by migration; handler by permission, not role; header-only answer for a caller without `clinical.read`. Tests: the administrator's response contains no SOAP text; a therapist who is not the author is refused; M8 fixtures updated |
| B2 | Ruling 4.1: `loadPatientExport` reads notes with `status = signed`; `signedNoteDocuments` returns nothing for an entered-in-error note; samples, round-trip counts and `fhir-validation.md` updated. API test: sign, amend, mark entered in error, export, and no id of the note or of any version appears in the Bundle |
| B3 | Route summaries and `openapi.json` say what is now true |
| B4 | One signed note per encounter: partial unique index on `ClinicalNote(encounterId)` where `status = 'signed'`; `POST …/sign` answers 409 `encounter_already_documented`; a seed integrity check. An entered-in-error note frees the visit for a corrected one |
| B5 | `patientIdentifiers` also returns the names of the patient's care-team practitioners and of the people who sent the messages in the input |
| B6 | Database tests for `ClinicalNote_entered_in_error_check` (each branch) and the freeze trigger |
| B7 | Ruling 3.1: label strings, the note line, the "Rule-based demo output. No AI model was used." constant with its banned-word test |
| B8 | The API passes stored `inputRefs` to the verifier on read and at approval (A2). An older row without `inputRefs` verifies as today |

Gate: `scripts/gate-wp-5.6b.sh`, API 4056, own database: migrate, `migrate:check`, the database tests, seed and seed check, `test/phase5/ai.test.ts`, `test/phase5/fhir.test.ts`, M8, `pnpm --filter @carepath/fhir test`, the seeded export check, lint, format and type-check of owned paths, `openapi:check`, `pnpm verify`, clean tree. Output in PROGRESS.

### Orchestrator, docs only

- PRD section 13: add `note.version` and `note.entered_in_error`. PRD and plan scope lists: navigation assistant, motion tracking and sandbox push are cut, in those words.
- `contract-requests.md`: CR-18 (entered-in-error permission and header-only answer), CR-19 (`encounter_already_documented`), both delivered by WP 5.6b.
- PROGRESS: correct the two WP 5.1 lines named in 3.2 and 3.3 when 5.6a merges.
- DR-002: note under M that the status labels are amended by C3 section 3.1; S5 unchanged and open.
- WP 6.3 instructions: ruling 4.4. D-WP-8 instructions: remove the motion-tracking block.

### WP 5.3, added conditions

Starts after WP 5.6b, D-WP-15 and this checkpoint. In addition to DR-002 M: the strings from B7; no supported mark on an edited statement; "opened", never "checked"; no pending state; autosave cadence from 4.2; the demo sentence visible on every generated block in the first capture set, which the advisor reads before the AI treatment is called done (DR-001 follow-up).

## 7. Carried forward

- C4 and D2 to D4 are unchanged.
- C5 claims audit: the wording rule at the end of 3.3; "ten FHIR resources" stands; the AI evaluation is cited only from `metrics.json` and only as a rule-set result; if the live run happens, its report is cited separately and never averaged with the demo run.
- WP 8.2 threat model: redaction is a demonstration control with the limits in 1.1 item 5 and 1.2 item 5; the evidence check is existence, not meaning; the approval gate's "evidence opened" is a client report.
- Known gaps, to be stated as gaps: a draft note cannot be discarded; progress summaries have no evaluation set; the Anthropic provider has never called the real API; `Condition` and `Encounter` entered-in-error rows are exported with their status.
