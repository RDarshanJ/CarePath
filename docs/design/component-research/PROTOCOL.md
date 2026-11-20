# Component research protocol

Source brief: `docs/COMPONENT-BRIEF.md` (governs this work, with `docs/DESIGN-BRIEF.md`). Inputs: `docs/design/component-inventory.md`, `docs/design/component-usage-matrix.md`, `docs/design/component-research/INDEX.md`, `docs/design/feature-research/*.md` (feature-level recommendations already made — build on them, don't contradict without saying why), `docs/design/color-exploration.md`, `docs/design/typography-exploration.md`.

## Per family file: `docs/design/component-research/<NN>-<family>.md`

For each meaningful component decision in the family (brief §4):
1. User task, place in journey, information needed, action wanted.
2. Business/operational requirement; healthcare constraint.
3. Production examples (≥3 where available): product, platform, screen, URL (Mobbin link or official source), access date 2026-11-20, observation. `[Observed]` vs `[Assumption]`. Only what you actually retrieved.
4. Design-system guidance: cite NHS, CMS, GOV.UK, USWDS, Carbon, Material 3, Apple HIG, Atlassian, Fluent, Polaris, Spectrum, DHCW where relevant (URL + what it says, paraphrased); NN/g, Baymard, WAI-ARIA APG, WCAG 2.2.
5. Alternatives (2–4, structurally different). For conventional elements, reuse the established pattern and say so — no invented alternatives.
6. Mandatory gates (accessibility, privacy, safety) pass/fail.
7. Weighted evaluation — weights: task effectiveness 25, accessibility & usability 25, error prevention & trust 20, business & operational value 15, interaction efficiency 10, implementation & maintenance cost 5 (adjust with reason). Scores are heuristic; say so.
8. Selected + rejected, rationale.
9. Spec (brief §21): anatomy, usage / when not to use, variants, states (brief §22 — relevant subset), behaviour, keyboard, screen-reader announcements, responsive rules (brief §23), data dependencies, loading/error behaviour, permissions, testing requirements.

Also add one decision record per important choice to `docs/design/component-decisions/CD-<NNN>-<slug>.md` with the brief §19 fields (ID, screen/workflow, user segment, task, business objective, alternatives, references, evidence, accessibility, clinical/privacy constraints, complexity, feasibility, selected, rejected, rationale, validation method). Use the ID range assigned to you.

For high-impact choices listed in brief §20, write a **prototype spec** (what identical content/data/tokens, what differs) in `docs/design/design-alternatives/prototypes/<slug>.md` — do not build it; prototypes are rendered after the visual direction is chosen.

Rules: no fabricated observations, participants, quotes or numbers. Paraphrase; quotes < 15 words, one per source. Colours are not chosen here — refer to semantic token roles only. Do not commit.
