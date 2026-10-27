# Initial experiment evaluation

Evaluation date: 2026-10-27. Kit/package: `0.1.0-experiment.0`; registry revision `1`; compiler version `1`; source baseline `12e4f6b218c6cc68aba303feec211ba91aaeb20a`.

The experiment demonstrates a deterministic profile/contract runtime, an exported kit operating in a fresh consumer directory, guarded local repair, and two genuinely separate candidate-authoring runs. It does **not** establish that generated components are production-ready, that schema validity proves equivalent behavior, or that one example predicts general agent reliability. The design system remains experimental.

The final [verification summary](../experiments/evidence/verification-summary.json) and [complete check log](../experiments/evidence/final-check.log) record the delivered build.

## Completed checks

| Check | Actual result | What it establishes |
| --- | --- | --- |
| `npm run agentic:test` (`vitest run src/agentic`) | 8 files, **122 passing tests**: 20 profile, 38 composition/registry/maintenance, 9 telemetry, 32 inventory/update, and 23 usage-client tests | Compiler determinism and graph rules; composition validation; proposal and revision checks; bounded maintenance decisions. No browser behavior is included. |
| `npm test` | **29 files, 283 passing tests** | Repository unit coverage, including the core tests above. These counts overlap; they must not be added together. |
| `npm run headless:check` | Passed: **215 files, 883 imports** | Static separation of behavior and styling in the checked source graph. |
| `npm run agentic:consumer` | Passed in a freshly created consumer directory | Copied portable kit operates without source checkout or npm dependencies; details below. |
| `npm run build:package` | Passed: **107 public entries, 1,426 files** | Package construction completed. This is distinct from consumer imports exercised below. |
| `npm run test:package` | Passed fresh tarball installation, **100 strict TypeScript import entries**, production Vite bundle and browser smoke checks | Published-package consumption and a bounded set of existing component interactions work. See [package evidence](../experiments/evidence/package-smoke.json). |
| Candidate A | **40/40 model tests passed**, proposal valid with no issues | Candidate A's pure JavaScript behavior satisfies its authored assertions. [Evidence](../experiments/token-input/candidate-a/evidence.json). |
| Candidate B | **28/28 model tests passed**, proposal valid with no issues | Candidate B's different behavior satisfies its authored assertions. [Evidence](../experiments/token-input/candidate-b/evidence.json). |

The core/repository/package command results above were completed by the main evaluator and recorded here; candidate counts are taken from their actual author-run evidence. The post-independence comparison additionally executed the exported runtime against both real proposals and ran focused model probes. No candidate tests or outputs were changed during comparison.

The package browser smoke test exercised light/dark Field semantics, Select keyboard behavior, Modal focus trapping, packaged assets/fonts, and headless Button/Checkbox keyboard, label, controlled state and native form behavior. Its report records zero axe violations in those checked views, no browser errors and no failed responses. The headless production graph had no styled package modules, CSS assets or stylesheet requests. This bounded result does not certify the entire component catalogue, all profiles or either experimental TokenInput model.

## Portable consumer and repair evidence

[The recorded fresh-directory report](../experiments/evidence/agent-kit-consumer.json) was produced by [the consumer verification script](../scripts/verify-agent-kit.mjs). The script copies the complete exported kit into a new temporary consumer, then invokes that copy's CLI with no repository module resolution. It verified:

- Aegis, Atlas and Solstice compile independently and each initially scans as healthy.
- An invalid profile is rejected; the same composition produces the same fingerprint; incoherent Apply behavior and a mismatched profile pin are rejected.
- Registry discovery, fixture conflict detection and local proposal submission work. Reusing a proposal identity and using a stale expected revision are rejected.
- Appending real drift to compiled Atlas CSS is detected. One bounded repair restores the original bytes, keeps a before-file/report, and passes a separate rescan.
- Changing the approved profile source prevents automatic repair and leaves generated CSS unchanged.
- A symlink in an output destination is refused.

These are real filesystem actions, not a simulated maintenance status. Registry checks in this consumer harness use the kit's explicitly labelled **illustrative fixtures**; they do not count as the independent candidate experiment. The harness does not promote a canonical component or authenticate an owner. Its writes are local and sequential; simultaneous process races, cross-machine collaboration and Git merge coordination remain untested.

A fourth, custom team profile also compiles in the fresh consumer with a new identity, brand, radius, typography and density. Its generated profile scope and clean maintenance scan are checked.

## Independent TokenInput experiment

Two agents received the same need: multiple free-text project labels with validation, removal, batch paste, optional suggestions, error preservation, accessible names, keyboard operation, controlled value and disabled state. Each worked in its own folder and read only the portable kit during authoring. Neither inspected the source implementation or the other candidate. Both had access to the same kit candidate contract and illustrative proposals; this was independent execution from shared guidance, **not** a blind invention study.

Each produced a real proposal, behavioral acceptance document, standalone JavaScript reducer, `node:test` suite and command/evidence record. Candidate A had a reporting-format mismatch on its initial successful 40-test run; it retained the raw output and corrected the recorder to request TAP. Candidate B's first validation harness import used the wrong relative path; its evidence records that failed attempt and the corrected successful validation. Neither event is hidden or represented as a passing original attempt.

The post-independence [comparison artifact](../experiments/token-input/comparison.json) records candidate file hashes, portable runtime identity, validation results, the actual `compareProposals` result, the actual `planConsolidation` output, concrete model probes and a review recommendation. Both proposals validate at revision 1. The runtime identifies duplicate responsibility and one explicit conflict: **A rejects duplicates; B ignores them with skipped-count feedback**. Both use Enter and disable blur commitment.

The schema comparison is incomplete. Reading and probing the models shows additional meaningful divergence:

| Behavior | Candidate A | Candidate B |
| --- | --- | --- |
| Enter `Alpha, Beta` | One label containing a comma | Two labels |
| Existing Alpha; paste `alpha` + newline + `Beta` | Reject entire batch and preserve input | Request Beta and report one skipped duplicate |
| Paste one value without separators | Edit draft; await explicit commit | Submit immediately |
| Suggestion interface | Ordinary labelled buttons; unrelated draft retained | Filtered combobox/listbox model; arrows/Escape; accepted suggestion clears unchanged query |
| Controlled responses | Request IDs reject stale responses | Array synchronization has no request-ID correlation |
| Newer draft detection | Compare submitted text | Track a monotonic draft revision |
| Empty commitment | Error | No-op |
| Value/API conventions | Controlled and uncontrolled; string/null validation conventions | Controlled only; different validator return conventions |

Both model suites pass because they assert their respective contracts. **68 passing model tests do not prove the models are equivalent**, and neither suite verifies the separate React demonstration component. Both candidates explicitly leave DOM focus, actual clipboard/IME behavior, screen-reader announcements, Base UI integration, narrow layouts and all visual configurations unverified.

## Proposed consolidation, not approval

Keep one TokenInput responsibility, but resolve its contract before merging code. The recommendation in the comparison artifact is:

1. Enter or visible Add commits; blur and single-line paste preserve draft. Blank commitment is a no-op. Newline/tab separate a batch; commas remain label content.
2. Reject duplicates by default with item-level feedback; retain the whole draft and make invalid batches atomic. Consider a separately explicit ignore policy only with skipped-count and idempotent-paste expectations.
3. Use trimmed NFC display values and documented JavaScript lowercase identity. Define one synchronous validator return contract and fail safely on exceptions or async results.
4. Combine A's correlated request/response IDs with B's monotonic draft revisions. Keep controlled value authoritative, preserve newer edits, provide explicit refusal settlement, disable mutation actions while pending, and avoid delayed focus theft.
5. Start with labelled suggestion buttons. A full combobox needs an applicable approved behavior primitive and its own rendered acceptance evidence. Preserve two-step Backspace removal and composition safeguards.

These are evaluator recommendations, not an owner decision. Preserve original candidate tests as evidence; write a shared acceptance suite for the reviewed contract and explicitly identify superseded expectations. Normalize overlapping capability names instead of mechanically joining both APIs. Define migration/version impact, implement the chosen behavior, validate it in the actual UI, obtain owner review, then promote one canonical entry through the release workflow.

The runtime consolidation plan currently copies the first candidate and lists conflicts/actions. It does not merge implementations or tests. Its `nextRevision: 2` is a proposed future revision; the actual registry remains at revision 1. No owner approval record, canonical merge, registry promotion or release was fabricated or performed for these candidates.

## Coverage and remaining limits

| Area | Current status and limit |
| --- | --- |
| Workbench browser verification | Passed **8 integrated checks and 7 axe scans**, with zero reported violations and browser errors. All 12 preset × presentation × mode combinations preserve control geometry and content. See [browser evidence](../experiments/evidence/workbench/report.json). |
| Reference TokenInput alignment | Browser-verified Enter-only/no-blur defaults, atomic paste rejection, controlled acceptance/refusal, retained drafts, guarded IME/229 events, two-step Backspace, disabled behavior and delayed-acknowledgment draft/focus preservation. Typed commas remain literal unless configured; pasted commas/newlines separate batches. Native datalist suggestions and ordered-value acknowledgment are explicit experiment choices, not promotion of either independent model. |
| Visual matrix | Representative desktop and 390px screenshots were inspected; all 12 preset/presentation/mode combinations were exercised. Full catalogue × profile × mode × presentation × density coverage is not established. |
| Accessible behavior | Model accessibility descriptors are requirements, not DOM/screen-reader proof. Real focus order, announcements, IME, clipboard selection and touch need targeted verification. |
| Custom portable profile | Positive custom compilation and clean scan passed in the fresh consumer, separately from the source-change refusal test. Browser evidence covers the supplied presets, not all possible custom colors. |
| Concurrent contributions | Stale revision and identity rejection are tested; actual concurrent writers, cross-machine coordination and authenticated approval are not. Git review remains the intended shared acceptance mechanism. |
| Broader maintenance | Only unchanged-input deterministic output regeneration is automatically repaired. Behavioral fixes, source/profile changes, dependencies, contracts and release decisions require review. The local service can periodically reconcile eligible derived drift while running. An optional remote AI adapter produces proposals only; no live provider call has been verified, and no operating-system daemon is installed. |
| Original repository isolation | Read-only comparison confirmed the original HEAD and working-tree status are unchanged: its existing main.tsx edit and untracked component-audit/, docs/, review/ and verification script remain. Work was performed in a separate snapshot and is delivered as Aegis-Agentic. |

The evidence supports continued development of the bounded workflow. It does not support claims of autonomous design judgment, complete accessibility, accepted shared components, or general agent reliability.

## Additional final checks and limits

Token checks pass for 5,736 tokens, 7,031 references and 301 consumer files, with no unresolved references or ownership violations. Numeric presentation audits cover 103 CSS files and 199 runtime files. Existing token definitions were preserved; one application icon-stroke group alias was added through the existing semantic role. The four portable skills pass the skill validator. Source API generation checks pass with 13 focused tests.

A promotion regression test now refuses to register candidate A's implementation with candidate B's approved behavior. Choosing a different implementation or changing behavior requires a revised proposal/plan; approval cannot silently rewrite implementation semantics.

The workbench is an inspection application, not a production bundle-size benchmark. Its main build currently includes roughly 3.49 MB of JavaScript (294 kB gzip) and 1.12 MB of CSS (128 kB gzip), including the token compiler/manifest and inherited styles. Moving compilation out of a consuming application's runtime and importing only needed components is the intended deployment approach. No latency, memory or development-speed advantage over classic Aegis has been established.

The original Storybook catalogue is retained. The experiment adds direct source-skill rendering; it does not claim that every inherited story or component has been manually re-reviewed under every new profile.

## Infrastructure verification

The final local infrastructure adds a pinned project store, loopback HTTP protocol, explicit usage client, source-derived configuration inventory, update comparison, optional remote advisory, and operator console. [Operations and limits](INFRASTRUCTURE.md) describe the actual deployment boundary.

- **34 infrastructure tests pass:** 14 store tests, 16 HTTP tests and 4 provider-adapter tests. They exercise real temporary project files, unchanged-source repair, persistence/restart, atomic invalid-batch rejection, lost-acknowledgement retry deduplication, opt-out clearing, pin/profile/release mismatch refusal, lock handling, nested directory and evidence-path symlinks, strict request guards, and AI budget/privacy boundaries. Provider responses are mocked; HTTP integration uses a real loopback server and the exported SDK.
- **23 SDK unit tests** are included in the 283 repository tests above. They cover disabled defaults, strict records, queue limits, bounded UTF-8 request bodies, concurrent flushes, stable retry IDs, cancellation and server-side opt-out. Do not add these counts again to the repository total.
- The console passes **5 simulated-API browser flows and 3 axe scans**, with no reported violations or browser errors, in addition to the existing 8 workbench flows and 7 scans. A separate real-service check verifies actual status/inventory and responsive rendering. [Console evidence](../experiments/evidence/infrastructure/infrastructure-report.json) distinguishes simulations from [real-service evidence](../experiments/evidence/infrastructure/infrastructure-live-report.json).
- The inventory reports **102 component families, 917 API dimensions, 291 finite/constrained properties and 626 unconstrained properties**. It reports **zero registered verified configurations**. Existing tests are not automatically converted into configuration coverage; Cartesian estimates are not certification.
- The original Storybook catalogue and direct source-skill pages build successfully. Build warnings identify large inspector/catalogue chunks; no production performance advantage is claimed.

The audit reproduced and fixed incorrect generated-profile binding, malformed budget rollover, arbitrary release metadata entering remote context, pin-inconsistent ingestion, malformed request handling, redirected repair/evidence folders, and oversized valid SDK batches. Regression evidence covers the fixes. The first HTTP integration fixture incorrectly used the canonical contract ID `button`; the default telemetry policy uses the source API ID `components-actions-button`. Correcting the fixture and documentation made the actual client-to-service flow pass without loosening validation.

The final [candidate metadata recheck](../experiments/token-input/final-runtime-recheck.json) confirms that the two original candidates remain byte-for-byte unchanged and validate against the delivered runtime. It does not promote either candidate or claim behavioral equivalence.

Remaining infrastructure limits include single-project local files, no authenticated multi-user service, no in-place accepted-release migration, bounded deduplication rather than global exactly-once delivery, manual instrumentation, and no automatic source repair or release publication. Remote AI is implemented and tested with controlled responses, but remains disabled and unverified against a paid provider. The delivered workspace begins with telemetry disabled and no usage records.


## Shared infrastructure extension — 0.2.0-experiment.0

This extension adds an authenticated, single-host workspace without changing the original Aegis checkout. Its [check log](../experiments/evidence/shared-check.log), [browser log](../experiments/evidence/shared-browser.log), [package log](../experiments/evidence/shared-package.log), and [summary](../experiments/evidence/shared-verification-summary.json) record the completed verification. Earlier sections retain the first experiment's evidence and limits.

- The full pipeline passes **283 source tests** and **109 infrastructure tests**, including catalogue persistence/scopes/revocation, two-handle revision conflicts, audit transaction rollback, detached signature trust/inventory checks, physical retention and the repair circuit, CLI commands, real prepared activation/rollback, HTTP boundaries and replaced-directory refusal. Counts include the inherited tests; they are not all new.
- Browser verification passes **16 scenario groups and 12 accessibility scans** across the workbench and infrastructure console. Shared-role and failure scenarios use explicitly mocked responses. They cover memory-only credentials, scope selection, stale response rejection, read-only viewers, operator mutations and revoked access. These bounded scans do not establish full accessibility.
- A fresh published-package smoke installation passes **100 strict public import checks**, production bundling, selected styled/headless keyboard and form behavior, and accessibility checks. The build produces **107 public entries**. The large workbench chunk warning remains; no throughput, cold-start or production-load benchmark was performed.
- A [real signed local workspace](../experiments/evidence/shared-workspace-live.json) installs version 0.2, creates two differently profiled projects, prepares and activates an experimental profile update, then restores the original profile through a fresh rollback generation. The first project ends at revision 3; the second remains at revision 1. Both report healthy, zero events, collection disabled and AI disabled.
- The [actual periodic repair check](../experiments/evidence/shared-periodic-repair.json) deliberately appends a comment to the second project's generated CSS. The running shared maintenance loop restores the exact original bytes while approved inputs remain unchanged. The check observes a successful bounded repair, not indefinite fault tolerance.

An independent review reproduced a directory replacement gap in the workspace installer and plan writer. The correction revalidates fixed workspace directories and write parents; a regression test and independent retest refuse all three replaced roots without outside writes. This is a scoped review, not an external penetration test.

The implementation has no provisioned cloud host, SSO, distributed failover, persistent job queue, live-provider evaluation, universal configuration coverage or automatic application migration. Retained releases and evidence need disk monitoring and reviewed archival. See [shared operations](SHARED-WORKSPACE.md) for current trust and recovery boundaries.

The separate [real shared-service browser report](../experiments/evidence/shared-workspace/shared-workspace-live-report.json) uses an expiring viewer credential against the actual service, without mocked routes. It verifies both projects, generation history, signed releases, GET-only requests, unchanged project state and zero usage. Three additional accessibility scans pass. Reproduce with `AEGIS_WORKSPACE_TOKEN_FILE=/path/to/viewer.token AGENTIC_URL=http://127.0.0.1:4175 node scripts/verify-shared-workspace-live.mjs`; the credential must be scoped to the two documented experiment projects.
