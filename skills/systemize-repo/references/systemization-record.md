# Project systemization record

Use one durable project record, or the repository's existing equivalent, to keep evidence and decisions accessible to future agents. The following fields are a working outline, not a CLI input schema. Keep source-derived facts, inferred intent, decisions and executed evidence distinct. Do not copy empty sections into a project or invent results to fill them.

## Scope and baseline

- Repository/revision and preexisting local changes; routes, framework and package manager.
- Requested work: audit, pilot or staged refactor; explicitly included/excluded areas.
- Design direction: preserve existing by default, or the user's explicit redesign choice.
- `accessibilityTarget`: `normal`, `AA`, or `AAA`; existing stronger requirements retained. Target is separate from achieved status.
- Aegis source/kit/package, registry, compiler and selected profile pins.
- Baseline build/test results and any preexisting failures; runnable environments and unavailable evidence.
- Screenshots/workflow observations identified by route, state, theme, viewport and content fixture. Record what was sampled and what remains uninspected.

## Inventory and design language

For each route, identify its page archetype, shell, repeated patterns, components, state owner and evidence. For each style family, record typography, colors and meanings, surfaces, border roles, spacing, radius, elevation, icon/motion conventions, density, responsive rules and observed themes. Record conflicting families rather than forcing a single answer.

Each decision has a stable ID, scope, description, source/call-site references, rendered evidence if available, origin (`explicit`, `observed`, `inferred`), confidence and disposition (`preserve`, `correct`, `investigate`). An explicit user choice is authoritative; a confident inference is still an inference.

Example decision shape: “Selection indicator is trailing in the plan picker; row activation replaces a single selected ID; modal confirmation commits the draft.” Source and rendered evidence establish which parts actually exist. Do not copy this example as a universal product rule.

## Consolidation and compatibility ledger

| Candidate family and sources | Shared responsibility | Differences to preserve | Proposed boundary/API | Action and evidence | Status |
| ---------------------------- | --------------------- | ----------------------- | --------------------- | ------------------- | ------ |

Use reuse, extraction, compatible variant, composition, adapter, new capability or keep separate as the action. List all affected imports/call sites. Record source props/types/defaults, events/payloads/timing, refs, slots, controlled state, form behavior, host endpoints and persistence. State how each remains compatible, and identify any deliberate break and consumer migration.

## Token migration map

For each changed role record original value/expression, source and consumers; exact primitive; semantic role and four mappings; owned group/category; target references; and whether the rendered result is preserved or intentionally corrected. Classify runtime measurements separately. Record unsupported compiler/profile values and their implementation route. Keep unresolved mappings visible instead of counting them as migrated.

## Missing-capability completion

For every missing capability record its reuse search, intended responsibility and destination (Aegis Agentic source, product-local component, pattern or layout). Link implementation, typed public API, source compatibility, tokens/four mappings, behavioral contract, usage/API guidelines, Storybook playground/anatomy/states, exports, registry/agent/MCP discovery and relevant verification. Each item is complete, pending, or not applicable with a reason. Track source acceptance, consumer integration and publication separately.

## Page conventions and accessibility

Link the project's supported recipe and pattern-policy files. Record shared implementations, permitted variants, header/action/filter decisions, density, overflow and responsive order. Explain exceptions by page/task. Keep descriptive decisions outside executable schemas that do not support them.

For accessibility, record criterion ID, target, route/component/state/theme, method, measured result, status and evidence. Text must meet the Normal baseline even if border gaps remain. For every border gap identify whether the boundary/state cue is essential or decorative, and any alternative identifying cue. Record necessary visual corrections separately from accidental drift.

## Migration batches and results

For each batch link the baseline, implementation and verification, list migrated consumers and retained adapters, and record new/removed implementations. Count component families rather than files when reporting consolidation; give the denominator and scope. Record current literal design values versus unresolved mappings with the same exclusions each time. Do not use a lower component count or fewer literals as proof of correctness.

Close with verified scope, unresolved findings, incomplete full-component deliverables and next work. A pilot must say pilot; a source-only inspection must say source-only. Preserve the decision record and point future work to it from project guidance.
