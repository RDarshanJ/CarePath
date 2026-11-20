# CD-503: patient context in record

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-503 |
| Screen or workflow | Patient record, care plan builder, staff message thread |
| User segment | Clinician |
| User task | Know which patient this is while moving between sections and routes |
| Business objective | Fewer wrong-patient and stale-data errors |
| Candidate alternatives | A sticky identity strip plus tabs; B persistent summary column from xl, sticky strip below, plus section tabs (selected); C breadcrumbs plus vertical list; D one long page with anchor links |
| Production references | M8 to M10 (Mobbin web, non-healthcare); J-patient-record.md; D4 GOV.UK tabs (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed: identity stays while tabs change (M9, M10). Healthcare patient banners not accessed. Heuristic B 4.40, A 4.00, C 3.25, D 3.00. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Landmark region named Patient, h1 focus on patient change, identity never covered by focus, 400 percent zoom |
| Clinical and privacy constraints | Two identifiers shown (name, MRN, birth date); title names the patient; no stale name on header error |
| Interaction complexity | Medium to high: shared PatientContextBar across three routes plus summary column |
| Technical feasibility | Medium: depends on J data; first slice needs no new endpoint |
| Selected | B |
| Rejected | A (runner-up, narrow-screen form of B), C, D |
| Decision rationale | Persistent identity guards against wrong-patient actions; absence and freshness get a permanent place (J) |
| Validation method | Scenario test with two same-surname patients; 400 percent zoom; keyboard sweep; prototype spec record-context-navigation.md |
