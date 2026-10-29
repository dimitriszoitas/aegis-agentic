# Source repair proposals

Aegis has two different maintenance paths. The portable infrastructure service automatically restores derived profile CSS/JSON when its approved source and compiler lock still match. The source repair worker reproduces a browser defect, asks an AI for a bounded CSS proposal, verifies it in an isolated checkout, and produces a reviewable commit. Source changes still need review and a normal release.

The experiment now inventories and source-scans **every authored UI component contract**. The source-backed catalogue includes implementation, CSS and story paths, their hashes, authored requirements, linked checks, finite acceptance scenarios, and an explicit repair-eligibility decision. A listed component is not automatically repairable.

Two trusted source-repair policies are available:

| Policy             | Eligible component IDs     | Exact patch scope                                                                     | Browser acceptance                                                                                                                            |
| ------------------ | -------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Metric containment | `metric-card`, `sparkline` | Two exact component CSS files, two attempts, 20,000 replacement bytes                 | 28 product scenarios and 56 canonical fixture scenarios                                                                                       |
| DataGrid density   | `data-grid`                | `src/components/data-grid/data-grid.css` only, two attempts, 35,000 replacement bytes | 16 trusted scenarios across controlled/uncontrolled hosts, two widths and four mode/presentation combinations; each exercises three densities |

Neither policy can change TypeScript, behavior, dependencies, tokens, contracts, test cases, thresholds, fixtures or reference images. All other components have explicit manual-review reasons until an adequate defect-specific oracle exists. A linked Storybook story or a shallow no-overflow smoke check does not authorize a model to change CSS.

## Run it

Use a clean source checkout with installed dependencies and Playwright Chromium. The worker is not bundled into a downloaded consumer kit or the UI runtime.

```sh
# Inspect every component's exact source ownership and repair boundaries.
npm run repair -- catalogue
npm run repair -- catalogue --component data-grid

# Read-only source checks for all authored UI components, or one component.
# These are not browser health certifications and never call an AI provider.
npm run repair -- scan --all
npm run repair -- scan --component button

# Audit only: no AI request, no source edits.
# With no --component, this preserves the original metric browser audit.
npm run repair -- scan

# Audit, then ask Codex for a repair only if a defect is reproduced.
npm run repair -- run --provider codex

# Reproduce a density defect in the trusted fixture before any AI request.
npm run repair -- run --component data-grid --provider codex

# Read durable results.
npm run repair -- status
npm run repair -- status --id RUN_ID

# Explicitly push a verified candidate and create a draft PR.
npm run repair -- publish --id RUN_ID
```

`run` uses the installed Codex CLI and its authentication. It consumes account usage only after reproducing a defect. The adapter supplies a JSON schema, a read-only sandbox, an empty temporary working directory, disabled known integrations, and finite time/output limits. It ignores user configuration and does not override the CLI's default model. The only source content sent is the selected policy's exact allowlisted CSS snapshots, bounded audit diagnostics, the repair policy and prior attempt summaries. Tokens reported by the provider are recorded as usage, not inferred billing amounts. No application records or usage telemetry are included.

The model returns proposed file contents and the expected original hashes. It does not decide which commands run, edit the candidate, change the tests or assert that acceptance has passed. The worker validates the response independently, including exact paths, unchanged source, file types, byte limits and protected names.

## What happens in a run

1. Pin the source commit and policy; acquire an exclusive local lock. A dirty checkout is refused.
2. Clone the committed source into `.aegis-repair/RUN_ID/candidate`. The original checkout stays untouched. Installed dependencies are shared as trusted inputs; generated Vite caches and reports go into the run directory.
3. Reproduce the defect using the chosen trusted policy. Metric containment uses the existing 28 Forma scenarios and 56 canonical scenarios across seven widths, normal/long values and all four mode/presentation mappings. DataGrid density uses a fixed six-record/two-column fixture that imports the candidate implementation, checks all three approved token heights and density selected states, preserves row identities and painted cell contents, and verifies pointer/keyboard row activation. It covers both controlled and uncontrolled density hosts at 1440px/390px in all four presentations. Missing browsers, compilation failures, unexpected network requests and runtime/console errors are infrastructure errors, not permission to repair.
4. Save the attempt before requesting a proposal. Validate its exact source hashes and scope, then apply it only to the candidate. Each subsequent attempt starts from the original source, not from a partially repaired candidate.
5. Run the same policy-specific browser scenarios, then type checks, token ownership/hierarchy checks, the headless boundary and the complete source unit suite. Confirm that tracked protected files, Git HEAD/index and final committed bytes still match their expected identities.
6. Save a passing patch and local commit on `codex/repair/...`. Stop for visual/semantic review. Publishing is a separate explicit command; it creates a draft PR and never merges, releases or updates consumers.

A baseline that already passes makes no model request. A model refusal, invalid proposal, regression failure, provider failure or infrastructure failure stops the run. Only another measured failure of the same trusted policy can consume the second attempt. If both attempts fail, the incident remains `needs-review` with its evidence.

## Evidence and recovery

Each run keeps `report.json`, `candidate.patch` when verified, the candidate checkout, browser measurements/screenshots, proposal bytes, provider provenance, source/oracle hashes and regression logs. These files stay local by default. Publishing sends the verified source diff and a concise PR description with evidence identifiers; it does not upload local screenshots/logs automatically.

The incident ID includes the base commit and policy identity. Repeating it returns the saved result rather than spending another AI budget. An interrupted run remains review-required. A new reviewed source commit or policy produces a new incident identity; there is no automatic endless retry.

`npm run repair -- unlock` removes a lock only when its recorded process is confirmed stopped on the same host. It does not reset the incident's attempts. An uncertain or still-running lock is retained. State is local to this checkout; there is no distributed lease or claim of exactly-once execution across machines. Keep the run directory until its review is resolved; the worker does not silently delete repair evidence.

Before draft publishing, the worker checks that the original source revision and remote have not changed, the candidate is clean, and the patch matches the verified evidence. A retry reuses an existing draft only when its head commit still matches. Demonstration fixtures cannot be published through this command. GitHub authentication and permission to push the target repository are required.

## Verification and boundaries

```sh
npm run repair:test
npm run repair -- scan

# Complete local pipeline experiment with a controlled test response; no AI request.
node scripts/repair-worker/verify-controlled.mjs

# Explicit live AI experiment; consumes Codex usage.
npm run repair:live -- --live
```

The test suite uses controlled providers to exercise actual temporary Git repositories, protected-path and source-hash refusal, locks, durable attempt limits, stale sources, process timeouts and draft-only publication arguments. These tests do not claim a live model result.

The controlled browser experiment exercises the same worker and complete acceptance pipeline against a seeded defect with a predetermined test response. Its results and a reviewable preview of the proposed live payload are saved under `artifacts/repair-worker-controlled/`. This verifies orchestration and acceptance, not the quality or reliability of an AI-generated repair.

The live experiment first verifies the healthy checkout, creates a separate fixture clone, introduces a clearly labeled CSS containment regression there and asks the real provider to repair it. Its proof is written under `artifacts/repair-worker-live/`. A successful proof requires a failing browser audit, real provider provenance, a nonempty source patch, all 84 scenarios passing again and all source regressions passing. It is a seeded regression experiment, not evidence that a production incident occurred. The original source is checked for changes at the end.

Finite automated checks cannot establish complete visual quality, every responsive scenario, every browser, or semantic correctness. Human review remains part of acceptance. The local clone isolates edits but is not a security sandbox for arbitrary untrusted repositories or dependencies; run this worker only against trusted project source and an operator-controlled CLI environment. Browser checks block external requests. Known Codex tools/integrations are disabled and tool events are rejected, but system-managed CLI configuration remains an operator trust boundary.

No unattended source-repair schedule is installed. CI runs the no-AI metric audit and controlled tests; the density policy is available through the worker and its focused verification. The infrastructure service's existing optional derived-output reconciliation loop remains separate. This milestone provides catalogue-wide source inspection and an executable audit → AI proposal → verification → draft-review path for two bounded source policies, not universal autonomous maintenance.

## Catalogue-wide scope and remaining boundaries

`scan --all` uses one shared catalogue snapshot and a CSS parse cache, inspects every authored UI component, and checks that source identity has not changed during execution. It checks contract/binding integrity, numeric CSS declaration tokenization, and direct Primitive/Semantic tier bypasses in component CSS. It reports exact file/line diagnostics, linked finite acceptance cases and explicit manual-review reasons. It does not execute every linked test or claim that a component is healthy because its source scan passed.

The deterministic `public/ai/repair-catalogue.json` is generated with `node scripts/repair-worker/catalogue.mjs --write`. It contains no fabricated passing evidence. `--check` detects stale source hashes. Runtime audit reports stay separate and include source and trusted-oracle hashes.

DataGrid density acceptance imports the candidate component into a trusted fixture, with candidate Vite configuration and environment loading disabled. It does not use an externally supplied Storybook server as proof. The candidate can change only its allowlisted CSS file. The fixture, expected data, shared acceptance assertions and their hashes live outside the editable candidate. Hiding, blanking, transparent paint, clipping, collapsing text/rows, wrong approved heights or replacing records cannot satisfy the acceptance assertions. The fixture deliberately excludes nonempty row-selection mode because the normal bulk-action toolbar hides density controls there. Sorting, virtualization, pagination and unrelated DataGrid functionality remain outside this finite policy; source regressions and human review still apply.

## Recorded live experiment

After explicit user authorization, the live Codex experiment passed on 29 October 2026: one model request removed the seeded minimum-width defect, all 84 Chromium scenarios passed again, and types, token checks, headless boundaries and all 429 source unit tests passed. The original checkout was unchanged. See [the live evidence](../experiments/source-repair/live/README.md), including source/oracle hashes, provider provenance, reported usage, patch and before/after screenshots. This is evidence for one seeded repair; it does not establish repair reliability across other defects or authorize an automatic release.
