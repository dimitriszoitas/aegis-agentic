# Aegis Agentic — design-system infrastructure experiment

Status: implementation experiment. Owner: the project team. Source baseline: Aegis commit `12e4f6b218c6cc68aba303feec211ba91aaeb20a`.

## Product objective

A designer configures a project's visual language. A versioned kit makes that language discoverable and executable for coding agents. Consumers operate the installed design system as infrastructure: pin the approved release, inspect supported configuration, record permitted usage, monitor derived output, and review proposed improvements. Agents reuse approved implementations, compose approved patterns, and propose missing capabilities. Accepted work becomes shared, maintained code. The original Aegis repository, deployment, review prototype, and package remain independent.

The experiment must demonstrate real profile compilation, consistent composition, portable consumption, concurrent contribution handling, and bounded repair, plus runnable local and authenticated shared services for usage, configuration inventory, signed releases, reviewed activation/rollback, and optional AI advisory. The playground is an operator interface and a way to inspect the system. It must label disconnected states, fixture examples, estimates, manual review, and provider verification accurately. Passing a schema or token check does not establish complete accessibility or design quality.

## Users and boundaries

The primary users are designers configuring a language and maintainers operating installed projects. Application users select light/dark/system; they do not rewrite the design contract. The initial target is React on the web, using the existing Aegis/Base UI foundation. The original local service handles one project with local files and exclusive operation locks. The shared workspace adds multiple project scopes, authenticated roles, a durable SQLite catalogue and immutable signed kits on one filesystem host. Managed cloud hosting, enterprise SSO, distributed coordination, runtime LLM UI generation, native platform adapters, arbitrary code execution in the playground, and automatic public releases remain outside this experiment.

## Infrastructure architecture

The portable kit contains the compiler, registry, component API facts, contracts, skills, CLI, and service runtime. Project initialization validates the selected profile, compiles its output, and pins project/release/kit/registry identities and source hashes. The same project store backs the infrastructure CLI and loopback HTTP API. A browser console consumes the API; instrumented consumers submit validated event batches through an explicit SDK.

Project state includes the approved profile and release snapshot, generated artifacts, usage policy and buffer, bounded receipt history, operation history, maintenance proposals, and AI request budget. Local hash checks identify source or kit drift. Shared installations additionally verify detached Ed25519 signatures against explicit trusted keys before loading the runtime. SQLite commits project activation, revision checks and audit history atomically; project-file changes remain individually atomic operations protected by locks, not distributed transactions.

Initialization starts with telemetry and external AI disabled. Starting the browser does not start a background service. Starting the service without an interval does not start periodic repair. The operating commands and protocol are documented in [Infrastructure](INFRASTRUCTURE.md).

## Design profiles

Setup offers an Aegis baseline and two contrasting presets. Editable inputs cover brand seed, neutral temperature, semantic role colors, corner family, typography, and default density. Both light and dark are mandatory. Fundamental and Fundamental Floating remain independent presentation choices. A profile compiles into four explicit semantic mappings and preserves Primitive → Semantic → Group → Consumers. Profiles are compiler inputs, not a fourth token tier.

The compiler must regenerate dependent color treatments, including subtle fills, foregrounds, borders and mixed colors. Brand and semantic danger remain separate roles. Typography/shape may differ between profiles; control sizing, typography and spacing remain consistent across the four configurations within a profile. Density is a separate explicit composition axis. Existing Floating shell insets are retained as presentation composition; they do not authorize changing control metrics.

Compilation is deterministic for the same normalized profile and compiler version. Invalid or unknown inputs fail with useful messages. The baseline preserves the existing manifest. Profile outputs include the manifest, CSS, input configuration, provenance/lock information and a report that distinguishes checks performed from manual review.

## Contracts and composition

Author executable family/component/pattern contracts alongside usage prose. Seed representative controls and a dataset-filtering pattern. Every component has an identity, responsibility, owning group, anatomy, states, capabilities, public API, examples and verification expectations. Native semantics and Base UI own behavior; styling consumes the assigned group. Existing source-extracted API metadata remains a discovery layer, not proof of behavior.

The filtering composition supports explicit approved choices for immediate versus Apply-based filtering, density, and presentation. It resolves into a canonical specification and reusable implementation. Defaults must be explicit. Invalid combinations must be rejected. The same accepted spec and locked dependencies produce the same intended UI; identical free-form prompts are not promised to select the same spec.

## Registry and contributions

The registry is Git-first and project-owned. Entries record stable ID, aliases, capabilities, status, version and implementation. Search covers names and capabilities. The workflow is discover → reuse → extend → propose. A new proposal starts with a contract and supporting evidence. Proposals remain experimental until accepted.

Concurrent proposals include their expected registry revision. Stale writes must fail rather than overwrite another contribution. Similarity is a review signal, not a semantic equivalence proof. Consolidation compares capability and behavior contracts first; incompatible defaults must be resolved explicitly. One canonical implementation receives accepted capabilities, combined tests, migrations and a release. Unrelated customers do not silently share changes.

The experiment includes a multi-value TokenInput that was absent as a standalone component in the baseline. Independent candidate proposals and consolidation evidence must record their real provenance. Synthetic examples are labeled fixtures. Agent evaluation output must never be substituted with a fabricated passing result.

## Maintenance and evolution

Observe → classify → reproduce → propose → repair → validate → review → release.

Inputs are repository failures, generated-output drift, reproducible reports, capability requests, configuration inventory, and optional permitted usage. Production telemetry is not required. Deterministic regeneration of derived output from unchanged approved inputs may run locally without an additional owner decision. Behavioral repairs, dependency changes, new semantics, profile source changes, contract changes, baseline changes and releases require review in this experiment.

Repairs operate on known files, retain before/after evidence, have bounded attempts, and must not weaken contracts, tests, thresholds or baselines to manufacture a pass. The infrastructure service independently rescans after a repair. An explicitly requested periodic loop checks health and only reconciles eligible derived drift; cycles do not overlap, retention runs every cycle, and three failed cycles pause repair until explicit resume. Circuit state is process-local and resets on service restart. It does not invoke AI or approve a changed source. The loop ends with its process.

If source/lock/profile/release identity changes, automatic regeneration is refused. Update planning compares explicit snapshots, classifies impacts, checks project and version pins, and includes available component usage. Plans are static input comparisons, never executed migrations or inherited coverage. Unknown versions and incompatible pins block planning. Shared workspaces prepare a fresh project generation, return an expiring digest-bound plan, and require owner activation against the expected project revision. Activation revalidates the source and target and atomically selects the new generation. Rollback prepares another new generation from retained approved inputs, preserving history. Unknown kit versions and lower registry revisions still require explicit migration work. The system drafts proposals and enforces boundaries; owner acceptance and consumer adoption remain explicit.

## Usage and configurability

Usage collection is disabled at both the project and consumer-client boundaries by default. The SDK records only explicit caller-supplied technical facts after policy validation; it does not inspect the DOM, capture application content, infer users/sessions, persist a browser queue, flush periodically, or retry automatically. The initialized server policy allows known component IDs and no prop values. Optional prop rules admit reviewed booleans or finite enums while rejecting content and credentials.

Events describe component, registry/project, revision, profile, mode, presentation, and one of render/action/configuration/error. The service validates the whole batch before storing it, bounds the event buffer and reporting window, and deduplicates the last 1,000 acknowledged batch identities. The SDK preserves an uncertain batch for explicit retry. Receipt eviction, clearing, or page reload prevents any claim of globally exactly-once delivery. Disabling server collection clears retained events and receipts. Reported counts cover the instrumented surfaces only; missing usage is not evidence that a component is unused or safe to remove.

The configuration inventory extracts public component dimensions, qualified compound-part props, finite choices, known defaults, and unconstrained inputs. Axis classification distinguishes explicit declarations from name heuristics. Cartesian estimates over finite dimensions are capped and exclude unconstrained inputs; they do not prove that all combinations are valid or tested.

Coverage comes only from explicit records matching the current pin, supported values, and required evidence metadata. Planned and failed records remain separate, and duplicate configurations do not increase passed coverage. The inventory does not run or authenticate referenced evidence. Zero records means no accepted coverage records in this inventory, not absence of repository tests. Unconstrained content or callback props may be intentional and must not be automatically restricted to improve a count.

## Optional AI advisory

The local rules engine produces maintenance proposals without a provider. Remote advisory requires a server-only API key, an explicit compatible model, a project opt-in, and a specific AI request. The console defaults to local rules and only enables AI selection when the service reports it configured.

The adapter sends selected aggregate technical evidence, uses `store: false` and structured output, validates returned component/evidence references, and enforces response limits and a daily request budget. The initialized budget is five requests per UTC day, including failed attempts; it is not a monetary cap. Raw events, prop-value distributions, arbitrary project text, and secrets are not part of the advisory payload.

AI output remains `proposal-only`. It cannot execute repairs, edit source, approve behavior, weaken a baseline, or publish a release. Simulated provider tests establish response handling and refusal boundaries; they must not be presented as verified live AI behavior. This experiment has verified actual local rules-based planning, not a paid provider call.

## Playground

Configure: guided settings and real light/dark examples. Compose: functioning search/filter/apply/reset and inspectable canonical spec. Registry: discover existing capabilities, compare proposals and expose conflicts. Maintain: distinguish observed problems from illustrative evidence and show autonomy decisions. Export: download the project configuration and build a portable agent kit.

Infrastructure: read actual service health, release pins, usage evidence, component configuration, and recent runs; explicitly request collection, maintenance planning, or eligible derived repair. The console shows unavailable service data and labels retained snapshots stale. It does not count operator clicks as product usage. Configuration previews remain local browser edits and do not mutate the service's approved profile. Provider configuration, periodic operation, and update planning remain explicit CLI operations where the browser has no endpoint.

## Portable distribution

Export a kit with versioned profiles, contracts, registry, original source skills, shared guidance, examples, standalone core runtime, infrastructure service, and CLIs. It must run in a fresh directory without access to the Aegis source checkout. Provide profile compilation, spec validation, registry discovery/comparison, contribution submission with revision checks, drift scan/repair, project initialization/status, usage ingestion, inventory, proposal planning, and snapshot update comparison. Ship the consumer SDK through the React package's `/agentic` entry. Keep source instructions canonical; render or distribute those same files instead of maintaining divergent copies.

## Acceptance and evaluation

- Original Aegis working-tree state is unchanged.
- Aegis baseline plus two distinct profiles compile through one pipeline; all preserve four mappings and tier ownership.
- Invalid configuration, unsupported composition and conflicting/stale registry changes are rejected.
- Representative previews work in light/dark and both presentations, at desktop and narrow widths; profile/mode switches preserve form state.
- TokenInput supports adding, pasting, removal, validation and explicit duplicate policy with accessible labels and keyboard operation.
- The filtering pattern implements its stated immediate or explicit application behavior.
- An exported kit compiles a custom profile, validates a composition and exercises registry/repair in a fresh consumer directory.
- Corrupting a generated output is detected and repaired. Changing approved source, lock or contract context prevents an automatic repair.
- Browser checks capture meaningful interactions and accessibility findings. Manual review and untested dimensions remain explicit.
- Independent agent proposals are compared with recorded requirements and evidence. No claim of general reliability follows from one successful example.
- A fresh infrastructure project pins approved inputs and starts with telemetry and AI disabled. Real local status and inventory appear in the console without fixture substitution.
- Explicit SDK recording/flush, whole-batch rejection, ambiguous-delivery retry, bounded deduplication, and opt-out behavior have meaningful tests.
- Configuration estimates remain separate from pin-matched coverage records, including planned, failed, duplicate, and unsupported evidence.
- Deterministic and optional AI plans remain reviewable proposals; update plans do not apply migrations. Unknown source identities and unsupported releases block automatic action.
- The console handles disconnected, malformed, provider-failure, and stale states; browser results distinguish simulated API/provider cases from actual local-service verification.

## Delivery phases

1. Isolated source baseline and completed specification.
2. Profile compiler and executable contracts.
3. Registry, canonical composition, contribution policy and repair CLI.
4. Focused playground and missing-component demonstration.
5. Portable kit, independent proposal experiment, browser/consumer verification and evidence report.
6. Local design-system infrastructure: pinned project store, configuration inventory, opt-in usage SDK, bounded reconciliation, update proposals, and optional remote advisory adapter.
7. Separate repository and release candidate with honest evidence boundaries.
8. Authenticated single-host shared workspace: role-scoped credentials, SQLite catalogue, signed installed releases, reviewed generation activation/rollback, physical retention, paused repair circuits and a connected project selector.
9. Future acceptance work: managed hosting/SSO, distributed storage, broader configuration verification, additional migration adapters, persistent maintenance scheduling and verified live provider behavior.

## Risks and open limits

Behavioral completeness and visual quality exceed schema validation. Profile-specific contrast must be measured in context; selected static color pairs are limited evidence. Existing Aegis components may contain assumptions needing later migrations. Profiles multiply verification combinations. A registry reduces duplicate work but cannot prevent disconnected simultaneous invention.

The shared service is a single-host implementation with a SQLite catalogue and filesystem generations. It provides scoped API credentials but no SSO, distributed failover, global exactly-once delivery, automatic update adoption or unbounded repair authority. Optional timed maintenance physically prunes bounded usage and maintenance proposals; malformed state requires review. Repair evidence, installed kits, inactive generations and workspace update plans still require reviewed archival and disk monitoring. Running periodic repair is an explicit operator choice, and a responsible owner is still required for semantic changes and releases.

## Reusable page construction milestone

Page instructions combine five scopes: the configured design language; an explicit page archetype; versioned product pattern decisions; the page content and state model; and acceptance evidence. A rule such as a reading width or maximum column count must identify its scope. A collection must not inherit a prose-width limit. A maximum grid count is a cap and must allow intrinsic responsive collapse.

Ship initial collection, detail, settings and dashboard patterns with named regions, typed configuration, machine-readable recipes, source guidance and browser verification. Use the existing PageHeader and nested components without overriding their internal design ownership. Keep page padding and surfaces in the consuming application; avoid pretending that a structural wrapper owns fetching, routing or form state.

Project policies identify canonical shared implementations, required and forbidden props, exact finite values, route coverage and justified exceptions. Source validation must report unresolved configuration instead of assuming compliance. Browser checks separately assess layout containment, common geometry, keyboard interaction and accessibility. Visual quality and semantic suitability still require contextual review.

Evaluate portability with Relay, a second product that imports only the built package and compiled project profile. Give two agents the same page brief and pinned kit independently. Preserve their original sources and hashes, compare actual behavior, and turn ambiguous decisions into explicit project policy. Passing independent tests is not proof that two implementations are equivalent.

The product direction is a shared Aegis UI foundation with optional agent tools and workspace services. Keep this experiment isolated from classic Aegis until compatibility and adoption are reviewed. A future portfolio case study can draw on preserved evidence; writing that case study is outside this milestone.

## Contract discovery and agent integration milestone

Generate a canonical catalogue from explicit source bindings. Include every source API family, the authored component and pattern contracts, and separately classified infrastructure protocols. Report API documentation, authored behavior, linked checks and reported evidence independently. An entry without authored behavior must say so; neither generated props nor a linked test establishes semantic completeness or certification. Deterministic generation and freshness checks prevent the Storybook, CLI and portable kit from reporting different snapshots.

Expose the catalogue in Storybook and in each family’s Contract tab. Publish the same facts through the core discovery helpers and portable CLI. Keep source hashes, versions, implementation mappings, verification limits and raw requirements inspectable without inventing missing rules.

Provide an optional, local stdio MCP adapter built with the official SDK. Its resources, tools and prompts use the installed kit's catalogue, source guidance and existing validators. Project-specific operations require an explicit project binding whose release, registry, profile and integrity pins match the installed kit. Unbound discovery is labelled. Inputs and resources are bounded; clients cannot select arbitrary filesystem roots or read paths. This first adapter has no source editing, repair, promotion, telemetry mutation or release activation tools. Its verified protocol version and deployment limits must be explicit. The exported adapter runs outside the checkout without installing dependencies into an immutable kit, and its SDK stays outside the React and core runtime bundles.
