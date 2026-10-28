# Source repair proposals

Aegis has two different maintenance paths. The portable infrastructure service automatically restores derived profile CSS/JSON when its approved source and compiler lock still match. The source repair worker reproduces a browser defect, asks an AI for a bounded CSS proposal, verifies it in an isolated checkout, and produces a reviewable commit. Source changes still need review and a normal release.

The first implemented source policy is **MetricCard/Sparkline containment**. It is deliberately finite: two exact CSS paths, at most two attempts, at most two changed files and 20,000 replacement bytes. It cannot change TypeScript, behavior, dependencies, tokens, contracts, test cases, thresholds, fixtures or reference images. Additional components and kinds of repair need an authored audit policy and acceptance cases before they become eligible.

## Run it

Use a clean source checkout with installed dependencies and Playwright Chromium. The worker is not bundled into a downloaded consumer kit or the UI runtime.

```sh
# Audit only: no AI request, no source edits.
npm run repair -- scan

# Audit, then ask Codex for a repair only if a defect is reproduced.
npm run repair -- run --provider codex

# Read durable results.
npm run repair -- status
npm run repair -- status --id RUN_ID

# Explicitly push a verified candidate and create a draft PR.
npm run repair -- publish --id RUN_ID
```

`run` uses the installed Codex CLI and its authentication. It consumes account usage only after reproducing a defect. The adapter supplies a JSON schema, a read-only sandbox, an empty temporary working directory, disabled known integrations, and finite time/output limits. It ignores user configuration and does not override the CLI's default model. The only source content sent is the two allowlisted CSS snapshots, bounded audit diagnostics, the repair policy and prior attempt summaries. Tokens reported by the provider are recorded as usage, not inferred billing amounts. No application records or usage telemetry are included.

The model returns proposed file contents and the expected original hashes. It does not decide which commands run, edit the candidate, change the tests or assert that acceptance has passed. The worker validates the response independently, including exact paths, unchanged source, file types, byte limits and protected names.

## What happens in a run

1. Pin the source commit and policy; acquire an exclusive local lock. A dirty checkout is refused.
2. Clone the committed source into `.aegis-repair/RUN_ID/candidate`. The original checkout stays untouched. Installed dependencies are shared as trusted inputs; generated Vite caches and reports go into the run directory.
3. Reproduce the defect using the existing 28 Forma metric scenarios and 56 canonical MetricCard scenarios. The latter cover seven widths, normal/long values and all four mode/presentation mappings. Missing browsers, compilation failures, unexpected network requests and page errors are infrastructure errors, not permission to repair.
4. Save the attempt before requesting a proposal. Validate its exact source hashes and scope, then apply it only to the candidate. Each subsequent attempt starts from the original source, not from a partially repaired candidate.
5. Run the same 84 browser scenarios, then type checks, token ownership/hierarchy checks, the headless boundary and the complete source unit suite. Confirm that tracked protected files, Git HEAD/index and final committed bytes still match their expected identities.
6. Save a passing patch and local commit on `codex/repair/...`. Stop for visual/semantic review. Publishing is a separate explicit command; it creates a draft PR and never merges, releases or updates consumers.

A baseline that already passes makes no model request. A model refusal, invalid proposal, regression failure, provider failure or infrastructure failure stops the run. Only another measured containment failure can consume the second attempt. If both attempts fail, the incident remains `needs-review` with its evidence.

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

No unattended source-repair schedule is installed. CI runs the no-AI audit and controlled tests. The infrastructure service's existing optional derived-output reconciliation loop remains separate. This milestone provides an executable audit → AI proposal → verification → draft-review path for one bounded source policy, not universal autonomous maintenance.
