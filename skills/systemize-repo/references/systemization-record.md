# Project systemization record

Use one durable project record, or the repository's existing equivalent, to keep evidence and decisions accessible to future agents. The following fields are a working outline, not a CLI input schema. Keep source-derived facts, inferred intent, decisions and executed evidence distinct. Do not copy empty sections into a project or invent results to fill them.

## Scope and baseline

Maintain the [seven-stage progress ledger](stages.md) with status, evidence, remaining work and next action for each stage. Record the full directory census, explicit exclusions, supported/unsupported frameworks and refreshed discovery hash. Keep files classified, family/variant coverage, migrated consumers and reviewed hardcoded/inline candidates as separate progress measures. Never derive completion from the number of stories or imports.

- Repository/revision and preexisting local changes; routes, framework and package manager.
- Requested work: audit, pilot or staged refactor; explicitly included/excluded areas.
- Design direction: preserve existing by default, or the user's explicit redesign choice.
- `accessibilityTarget`: `normal`, `AA`, or `AAA`; existing stronger requirements retained. Target is separate from achieved status.
- Aegis source/kit/package, registry, compiler and selected profile pins.
- Baseline build/test results and any preexisting failures; runnable environments and unavailable evidence.
- Screenshots/workflow observations identified by route, state, theme, viewport and content fixture. Record what was sampled and what remains uninspected.

## Inventory and design language

For each route, identify its page archetype, shell, repeated patterns, components, state owner and evidence. For each style family, record typography, colors and meanings, surfaces, border roles, spacing, radius, elevation, icon/motion conventions, density, responsive rules and observed themes. Record conflicting families rather than forcing a single answer.

Keep a canonical-family inventory separate from the source-file index. Include public names and aliases, wrappers, owning category, responsibility, actual APIs/defaults, supported variants and states, consumers, and documentation destination. Record the source or call site that establishes each supported configuration, including treatments hidden in wrapper classes or local style maps. Count domain instances separately from reusable families.

Keep a separate application-usage record: entry points and public package entries, source revision/hash, scope, analyzer, app dependency path, incoming caller file/line, story/test-only paths, public export obligations, unresolved dynamic loading, observed runtime evidence if collected, and keep/migrate/deprecate/investigate decision. Static app reachability is potential usage; no detected reference is a review candidate, not proven dead code. Re-run after changing consumers and keep a discoverable usage view in the migration audit when Storybook is delivered.

Each decision has a stable ID, scope, description, source/call-site references, rendered evidence if available, origin (`explicit`, `observed`, `inferred`), confidence and disposition (`preserve`, `correct`, `investigate`). An explicit user choice is authoritative; a confident inference is still an inference.

Example decision shape: “Selection indicator is trailing in the plan picker; row activation replaces a single selected ID; modal confirmation commits the draft.” Source and rendered evidence establish which parts actually exist. Do not copy this example as a universal product rule.

## Consolidation and compatibility ledger

| Candidate family and before sources | Shared responsibility | Differences to preserve | Canonical boundary/API after | Migrated consumers and retained adapters | Evidence and status |
| --- | --- | --- | --- | --- | --- |

Use reuse, extraction, compatible variant, composition, adapter, new capability or keep separate as the action. List all affected imports/call sites. Record source props/types/defaults, events/payloads/timing, refs, slots, controlled state, form behavior, host endpoints and persistence. State how each remains compatible, and identify any deliberate break and consumer migration.

For each retained overlap, classify deliberate separation or temporary duplication, cite the precise incompatibility, and identify the remaining consumers, convergence work and acceptance evidence needed to retire it. Record which duplicated responsibilities were removed, rather than treating a moved file or shared export as a refactor result.

## Token migration map

For each changed role record original value/expression, source and consumers; exact primitive; semantic role and four mappings; owned group/category; target references; and whether the rendered result is preserved or intentionally corrected. Classify runtime measurements separately. Record unsupported compiler/profile values and their implementation route. Keep unresolved mappings visible instead of counting them as migrated.

For each foundation family, record the canonical semantic vocabulary, its ordering and meaning, duplicate choices consolidated, owner-specific decisions moved to groups, and justified exceptions. Include primitive types and validate composite operands. Keep compatibility aliases and remaining legacy consumers separate from canonical token counts. Record whether each family has been reviewed, corrected and verified; do not infer conceptual correctness from a prefix check.

Link the corresponding Foundations documentation and its canonical data source. Record a verified end-to-end trace for representative families, plus the scope and results of dependency/ownership checks across the migrated graph. Distinguish a displayed mapping from verified consumer usage.

## Catalogue and variant coverage

Link each canonical family to its docs page, embedded playground and usage/API guidance. Reconcile all discovered public variants and meaningful states against a direct rendered example or reproducible playground setup. Include compatibility wrappers in their owning family and domain examples in their intended section.

| Family and supported configuration | API/source evidence | Direct example or playground setup | Render/interaction check and environment | Status or remaining gap |
| --- | --- | --- | --- | --- |

Record source reachability separately from rendered and behavioral coverage. An import, API extractor or passing story build cannot establish that a specialized variant appears or works. State representative combination coverage and exclusions. Retain a documentation/sidebar map from previous entries to canonical pages, examples or archived material when reorganizing an existing catalogue.

## Missing-capability completion

For every missing capability record its reuse search, intended responsibility and destination (Aegis Agentic source, product-local component, pattern or layout). Link implementation, typed public API, source compatibility, tokens/four mappings, behavioral contract, usage/API guidelines, Storybook playground/anatomy/states, exports, registry/agent/MCP discovery and relevant verification. Each item is complete, pending, or not applicable with a reason. Track source acceptance, consumer integration and publication separately.

## Page conventions and accessibility

Link the project's supported recipe and pattern-policy files. Record shared implementations, permitted variants, header/action/filter decisions, density, overflow and responsive order. Explain exceptions by page/task. Keep descriptive decisions outside executable schemas that do not support them.

For accessibility, record criterion ID, target, route/component/state/theme, method, measured result, status and evidence. Text must meet the Normal baseline even if border gaps remain. For every border gap identify whether the boundary/state cue is essential or decorative, and any alternative identifying cue. Record necessary visual corrections separately from accidental drift.

## Migration batches and results

For each batch link the baseline, implementation and verification, list migrated consumers and retained adapters, and record new/removed implementations. Count component families rather than files when reporting consolidation; give the denominator and scope. Record current literal design values versus unresolved mappings with the same exclusions each time. Do not use a lower component count or fewer literals as proof of correctness.

Close with verified scope, unresolved findings, incomplete family and full-component deliverables, unresolved overlaps and next work. Report architecture/consolidation, token migration, catalogue/API coverage, rendered verification and application regressions as separate outcomes. A pilot must say pilot; a source-only inspection must say source-only. Preserve the requested scope when reporting incomplete work. Preserve the decision record and point future work to it from project guidance.
