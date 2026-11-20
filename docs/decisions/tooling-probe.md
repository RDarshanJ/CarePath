# CarePath — Tooling Probe (WP 2.2)

Date: 2026-11-19. Scratch directory: `/tmp/probe` (outside the repo). Sandbox: Linux, root, Node v22.23.5, npm 10.9.9, 2 CPUs, 7 GB RAM.

Summary of what worked and what did not is in the table at the end. Failures are recorded as failures.

## 1. Playwright Chromium

| Step | Command | Result |
|---|---|---|
| Install package | `npm install @playwright/test` in `/tmp/probe/pw` | PASS. `@playwright/test` / `playwright` 1.65.1 |
| Browser download | `npx playwright install chromium` | FAIL. `Download failed: server returned code 403 ... request blocked: no rule or allowlist entry allows host "cdn.playwright.dev"` (Chrome for Testing 159.0.8154.6, playwright chromium v1255) |
| Default launch, no executable path | `chromium.launch({headless:true})` | FAIL. Browser not installed (same CDN block) |
| System Chrome | `/usr/bin/google-chrome --version` → `Google Chrome for Testing 153.0.8010.12` | PRESENT |
| Launch system Chrome + screenshot `about:blank` | `chromium.launch({executablePath:'/usr/bin/google-chrome', headless:true, args:['--no-sandbox']})`, `page.goto('about:blank')`, `page.screenshot(...)` | PASS. Browser 153.0.8010.12. Output `/tmp/probe/pw/about-blank.png`, PNG 1280×720 RGB |

Notes:
- The WP 2.2 gate command `pnpm exec playwright install chromium` will fail in this sandbox for the same CDN reason. The workable path is system Chrome through `executablePath`.
- Version mismatch: Playwright 1.65.1 expects Chrome 159, the system Chrome is 153. The screenshot ran, but this is not verified beyond `about:blank`.
- Fallback applied, as advisor-plan risk #2 allows: system Chromium/Chrome via `executablePath`.

## 2. Load tools: k6 and autocannon

| Tool | Command | Result |
|---|---|---|
| k6 via GitHub release | `curl -L -o k6.tgz https://github.com/grafana/k6/releases/download/v1.4.2/k6-v1.4.2-linux-amd64.tar.gz` then `tar -xzf` and `k6 version` | PASS. `k6 v1.4.2 (commit/5b725e8a6a, go1.25.4, linux/amd64)`. Binary: `/tmp/probe/k6dl/k6-v1.4.2-linux-amd64/k6`. Note: the GitHub API (`api.github.com`) returned 403, but direct release downloads from `github.com` work. |
| autocannon via npm | `npm install autocannon` in `/tmp/probe/ac` | PASS. `autocannon v9.0.0` |
| npm `k6` / `@grafana/k6` | `npm view k6 version`, `npm view @grafana/k6 version` | Not used. `k6` returned 0.0.0 (not the load tool); `@grafana/k6` returned 404 |

Decision input: k6 is available as a binary. autocannon is available as a fallback.

## 3. Fonts (Fontsource via npm)

| Package | Command | Version | Result |
|---|---|---|---|
| `@fontsource/ibm-plex-sans` | `npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono @fontsource/source-serif-4` in `/tmp/probe/fonts` | 5.3.0 | PASS. 84 woff2 files. `ibm-plex-sans-latin-400-normal.woff2` present |
| `@fontsource/ibm-plex-mono` | (same command) | 5.3.0 | PASS. 70 woff2 files. `ibm-plex-mono-latin-400-normal.woff2` present |
| `@fontsource/source-serif-4` | (same command) | 5.3.1 | PASS. 96 woff2 files. `source-serif-4-latin-600-normal.woff2` present |

GitHub fallback (`https://github.com/IBM/plex/archive/refs/heads/master.zip`) returned 403. Not needed because npm works.

## 4. HL7 FHIR validator and Java

| Step | Command | Result |
|---|---|---|
| Java | `java -version` | PASS. `openjdk version "21.0.13.0.3" 2026-10-24` |
| Release API | `curl https://api.github.com/repos/hapifhir/org.hl7.fhir.core/releases/latest` | FAIL. 403, "GitHub access to this repository is not enabled for this session" |
| Jar download | `curl -L -o validator_cli.jar https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar` | PASS. HTTP 200, 204,899,397 bytes, `/tmp/probe/fhir/validator_cli.jar` |
| Jar runs | `java -jar validator_cli.jar -version` | FAIL as a usage error (the option needs a FHIR version argument). Corrected form below runs |
| Jar runs (corrected) | `java -jar validator_cli.jar -version` → `FHIR Validation tool Version 7.0.6 (Git# 86bf796ddc97). Built 2026-11-13` | PASS (the tool starts and reports its version) |
| Validate a Synthea bundle | `java -jar validator_cli.jar <bundle.json> -version 4.0.1 -output out.txt` | FAIL. The validator needs FHIR definition packages. The egress proxy refused `build.fhir.org`, `packages.fhir.org` and `packages2.fhir.org` (HTTP 403, 18 refused connections). No validation result was produced |

Consequence: the official HL7 validator is not usable for validation here. The docs must not say that output passed the official validator (advisor-plan §6). Fallback is CarePath's own structural and reference validation, as the plan already states.

## 5. Synthea

| Step | Command | Result |
|---|---|---|
| Release API | `curl https://api.github.com/repos/synthetichealth/synthea/releases/latest` | FAIL. 403 |
| Jar download | `curl -L -o synthea-with-dependencies.jar https://github.com/synthetichealth/synthea/releases/download/master-branch-latest/synthea-with-dependencies.jar` | PASS. HTTP 200, 197,026,434 bytes |
| Help | `java -jar synthea-with-dependencies.jar -h` | PASS. Usage printed, exit 0 |
| Generate 1 patient | `java -jar synthea-with-dependencies.jar -p 1 -s 1 Massachusetts` in `/tmp/probe/synthea` | PASS. Exit 0. "You've just generated 1 patients!" Output includes `output/fhir/*.json` bundles |

Notes: the version was not read from the release API (blocked). The jar is the `master-branch-latest` release. The jar works. This probe does not claim that any particular Synthea version was verified beyond this run.

## Summary

| # | Item | Result | Version | Usable for CarePath |
|---|---|---|---|---|
| 1a | `npx playwright install chromium` | FAIL (CDN 403) | Playwright 1.65.1 | No |
| 1b | Headless Chrome screenshot of `about:blank` via system Chrome | PASS | Chrome 153.0.8010.12 | Yes, with `executablePath` |
| 2a | k6 binary (GitHub release) | PASS | k6 v1.4.2 | Yes |
| 2b | autocannon (npm) | PASS | autocannon 9.0.0 | Yes (fallback) |
| 3 | IBM Plex Sans, IBM Plex Mono, Source Serif 4 (Fontsource npm) | PASS | 5.3.0, 5.3.0, 5.3.1 | Yes |
| 4a | Java | PASS | OpenJDK 21.0.13 | Yes |
| 4b | HL7 FHIR validator jar download | PASS | 7.0.6 | Jar only |
| 4c | HL7 FHIR validator running on a bundle | FAIL (FHIR package hosts 403) | 7.0.6 | No |
| 5a | Synthea jar download | PASS | master-branch-latest (version not read) | Yes |
| 5b | Synthea generation (1 patient) | PASS | master-branch-latest | Yes |

Blocked hosts observed: `cdn.playwright.dev`, `api.github.com` (release API only; `github.com` downloads work), `build.fhir.org`, `packages.fhir.org`, `packages2.fhir.org`.
