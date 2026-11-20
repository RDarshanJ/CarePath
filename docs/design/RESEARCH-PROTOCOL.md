# Feature research protocol (CarePath design refinement)

Source brief: `docs/DESIGN-BRIEF.md` (§5–§9 govern this work). Prior research to build on, not repeat blindly: `docs/research/*.md`, `docs/product/prd.md`, `docs/decisions/checkpoint-c2.md`.

One file per feature: `docs/design/feature-research/<letter>-<slug>.md`. Each file contains, in order:

1. **User problem** — one paragraph, in plain words.
2. **User and context** — who, where, device, physical/cognitive state, frequency.
3. **Business objective** — and how it would be measured (metric names only; no invented numbers).
4. **Constraints** — functional (what the current API/contracts support — check `packages/shared/src/contracts` and `docs/architecture/api-phase3.md`), technical, safety/privacy, accessibility (WCAG 2.2 AA).
5. **Current CarePath implementation** — what exists today (read the code under `apps/web/app/...` and screenshots under `docs/screenshots/**`), and its weaknesses.
6. **Production references observed** — table: product, platform, screen/flow name, URL (Mobbin link or official source), access date 2026-11-20, what was observed. Only what you actually retrieved. Mark `[Observed]` vs `[Assumption]`. If a product isn't on Mobbin, say so and use an accessible public source.
7. **Established patterns** — what recurs across references and why it works.
8. **Alternatives (≥3, meaningfully different interaction models, not reskins)** — for each: interaction model, benefits, limitations, accessibility, business implications, technical complexity (against current API), error/recovery behaviour, evidence (cite §6 rows; label research evidence vs expert judgement vs untested assumption).
9. **Mandatory gates** — accessibility, privacy, safety: pass/fail per alternative. A failing alternative is ineligible regardless of score.
10. **Weighted evaluation** — default weights: task effectiveness 25, clinical safety/privacy/trust 20, usability/accessibility 20, business value 15, operational efficiency 10, technical feasibility 5, design-system consistency 5 (adjust per feature with reason). Score 1–5 with a one-line justification per cell.
11. **Recommendation** — selected approach, why it beats the runner-up, what is rejected and the trade-off.
12. **Requirement alignment row** — user segment, job to be done, pain point, business objective, functional requirement, success metric, design hypothesis, selected pattern, technical dependency, validation method.
13. **States to design** — the relevant subset of: default, hover, focus, active, selected, disabled, loading, empty, partial data, validation error, server error, network loss, permission denied, success, cancellation, interrupted workflow, stale information, unsaved changes — each with microcopy and recovery action.
14. **Responsive behaviour** — 375, 390, 768, 1024, 1440, 1920: what stays, what moves to panels, what changes model.

Rules: no fabricated participants, quotes, usability results, competitor features or metrics. Paraphrase sources; quotes under 15 words, max one per source. Do not choose colours here — the visual identity is decided separately. Recommendations are provisional until the advisor signs off.

Mobbin: load tools with ToolSearch `select:mcp__Mobbin__search_flows,mcp__Mobbin__search_screens,mcp__Mobbin__search_sections`. Prefer complete flows. Record Mobbin URLs.
