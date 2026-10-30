---
name: systemize-repo
description: Re-systemize an existing UI repository or design system with Aegis architecture by discovering its design language, consolidating compatible families and patterns, organizing tokens and interactive documentation, and fully building missing capabilities while preserving product APIs and behavior.
---

# Systemize a repository

Turn an existing interface into a maintainable design system implementation, including repositories that already have a design-system folder, tokens and Storybook. Those structures do not establish coherent ownership, reusable boundaries or complete documentation. Reconcile the actual UI into canonical families that people and agents can discover, configure and extend. Preserve its identity, deliberate interaction choices and public APIs unless the user requests a change. This is an agent-assisted investigation and staged refactor, not a deterministic one-command converter or automatic source repair.

Read the [agentic contract](../references/agentic-contract.md) and [design contract](../references/design-contract.md). Use the [systemization record](references/systemization-record.md) for the project's findings and migration ledger. Read [consolidation decisions](references/consolidation.md) before merging implementations, [accessibility targets](references/accessibility.md) before assessing or changing styling, and [Storybook delivery](references/storybook.md) when organizing or verifying the component catalogue.

## Follow the staged workflow

Read [stages and visible progress](references/stages.md) before discovery. Maintain the seven stages: whole-application map; UI and usage reconciliation; inline UI and design-decision review; migration plan; implementation and consumer migration; catalog delivery; verification and closure. Record evidence, remaining work and the next batch for each stage. These are progress and quality gates, not requests for permission. Keep incomplete stages open even when builds or story tests pass.

## Establish the target

- Identify the user's actual repository, current changes, workspace instructions, framework, build tools, component libraries, routes, styling sources and existing tests. Do not substitute a demo or the Aegis source repository for a missing target path.
- Record the requested scope: audit, pilot, or staged refactor. A request to systemize and refactor authorizes implementation within that scope; do not add approval gates between routine batches. An audit-only request produces findings without rewriting application code.
- Default to preserving the discovered visual language. An Aegis restyle or other redesign is a separate explicit choice. Record `accessibilityTarget` as `normal`, `AA`, or `AAA`, defaulting to `normal` only if no project target is already established. Normal still requires minimum AA text contrast, keyboard access, visible focus and accessible names; it permits subtler borders without claiming WCAG conformance.
- Record the source revision and local changes, selected Aegis source/kit release, profile and registry. Use an isolated branch or checkout where appropriate; preserve unrelated edits. Reuse existing dependency and folder conventions where they serve the new boundaries.
- Inspect framework compatibility. Aegis's current styled implementations are React/TypeScript web components. Its guidance and token architecture can inform other stacks, but do not introduce React, replace the application framework, or claim an available native adapter without evidence.

## Discover the design language and intent

Inventory routes, page shells, patterns, components, variants and states from source and actual rendered workflows. Include imports and call sites, not only named component files. Inspect theme providers, CSS/custom properties, utilities, inline styles, local styles and existing assets; omit generated/vendor code from ownership counts.

Start from a census of the entire repository, not a fixed list of conventional component folders or an earlier Storybook inventory. Inspect every application/package source folder, including custom reusable directories, modules, features, pages, route files, local components and render callbacks. Record exclusions and unsupported source formats. Run the whole-tree discovery helper where supported, then review its candidates and gaps. An existing inventory supplements this scan and never restricts it.

Inspect hardcoded UI as well as styling: repeated native markup, inline selection rows, toolbars, dialogs, empty states, cards, controls and styled wrappers may belong to an existing component, a new supported variant, or an extracted pattern. Review JSX structure candidates, literal CSS/style values, utility definitions and variant maps against actual behavior and design intent. Do not automatically merge structural matches or tokenize runtime values. Record the chosen boundary and migrate the actual consumers, preserving APIs and interaction details.

Build a family inventory alongside the file inventory. Follow aliases, wrappers, local CVA/style maps, specialized controls and domain examples to the responsibilities they implement. Record supported variant values, defaults, meaningful states, slots and exposed behaviors with source/call-site evidence. A base Button story does not cover a branded or AI button wrapper merely because that wrapper eventually imports Button. A complete file graph is useful discovery evidence, not proof that the supported UI has been documented or exercised.

Include the real application shell in that reconciliation: primary side navigation, account/workspace menus, top navigation, page headers and global search where present. A shared surface rendered only through a Storybook decorator still needs its own discoverable family or pattern page and direct examples of its supported states. Preserve route, permissions, collapse/mobile, grouping and action contracts when documenting or consolidating navigation.

Audit actual application usage separately from catalogue coverage. Read [component usage evidence](references/usage.md), identify the real runtime entry points, and run the supported static analyzer or an equivalent framework-aware tool. Follow value imports, aliases, selected re-exports, wrappers, routes and lazy modules; distinguish application reachability, story/test-only references, public export obligations, no detected references and unresolved loading. Record concrete entry-to-component paths and incoming source locations. Do not count a Storybook import as app usage or treat static reachability as runtime frequency. Review unused candidates against dynamic loading, feature flags and external consumers before any removal; an audit never grants deletion permission.

Identify typography, semantic color roles, surfaces, border roles, radius, elevation, spacing, density, icon treatment, motion, responsive behavior and theme coverage. Relate values to their uses. Equal values can have different meanings; repeated values can be accidental. A dominant color or spacing frequency does not establish the designer's intent.

For each candidate family, capture anatomy and interaction alongside appearance: leading/trailing controls, row hit areas, single/multiple selection, immediate/draft commit, cancel/dismiss behavior, reading order, focus, keyboard behavior and state ownership. A check at the end of a modal selection row is a preservation requirement, not a reason to substitute a leading checkbox. Do not infer a widget's semantics from its icon.

Maintain evidence links to files and call sites, plus route/state/theme/viewport screenshots and observations when runnable. Distinguish explicit product decisions, observed implementation, inferred conventions and unresolved conflicts. Mark confidence and sampling boundaries. Inspect multiple representative screens before promoting an observation to a shared rule. When no coherent language exists, retain scoped families and propose a minimal convention rather than inventing a brand.

Capture existing component APIs before changing consumers: prop names/types, defaults, controlled/uncontrolled modes, callbacks and payloads, refs, slots, form semantics, public imports and any supported style hooks. Include forwarded DOM/data/ARIA attributes, focus methods, event ordering/cancellation and native form serialization where applicable. Record real API/network integrations as host obligations. Preserve routes, request shapes, timing, persistence, permissions and business logic through the refactor.

## Plan compatible consolidation

Group candidates by responsibility and behavior, then compare anatomy, API and styling. Use the [decision matrix](references/consolidation.md) to choose reuse, extraction, compatible variants, composition, adapter or separate implementations. Different names, props, domain fields or nonidentical source do not justify duplicate orchestration by themselves. Identify the stable shared behavior and move real differences into typed configuration, slots or host adapters. Do not equate similar screenshots with interchangeable components.

Reuse the existing repo API as the starting contract. If an Aegis component fits but exposes a different API, preserve the product's API through a thin adapter when possible. Add a shared capability when necessary; do not rewrite working call sites merely to obtain familiar prop names. Record unavoidable breaking changes and their migration before applying them, and resolve unclear behavior with the user while continuing unaffected work.

Separate reusable controls, reusable task patterns, page shells and product-specific orchestration. Introduce props for actual supported differences, with invalid combinations excluded. Avoid a universal component with unrelated Boolean switches. Preserve useful existing folders; establish explicit import boundaries instead of moving the whole repo to a prescribed structure. Record a before/after map from implementations and consumers to canonical families, adapters and deliberate exceptions. When overlapping providers must remain temporarily, identify the precise incompatibility and the work and evidence needed to retire the overlap; a generic risk note is not a completed consolidation decision.

Record common page recipes and conventions: headers, actions, search width, filter commit behavior, push panels versus modal tasks, density, reading measures, responsive ordering and overflow ownership. Preserve task-specific exceptions. Use [page composition](../references/page-composition.md) and the installed recipe/policy schemas for supported rules. Keep extra design observations in the decision record, not invented schema fields.

## Reconcile the design language and token architecture

Follow [create-token](../create-token/SKILL.md). Trace each design decision through exact Primitive values, Semantic roles and owned Group roles to its consumers. Keep measured geometry, user data and interaction values out of the design-token catalog. Systemization must produce common design choices, not a prefixed copy of every source value. Classify each family by responsibility: exact primitives; reusable semantic treatments/scales/states; category-owned group applications. Review color, spacing, sizing, radius, typography, border, elevation, opacity and motion together.

Preserve exact values for reference-only migration. When the user requests normalization, consolidate accidental inconsistencies into the chosen scales, record the old/new values and affected consumers, and verify the resulting UI. Preserve justified product differences and interaction intent. A smaller vocabulary is useful only when it still represents the product correctly.

Control, item, surface, dialog, avatar and page describe group applications; subtle, pill, small and large can describe semantic choices. Apply the shared contract by meaning, not a prefix or a mechanical naming rule. Keep legacy/native compatibility aliases outside the canonical vocabulary and record remaining consumers. A syntactically valid graph can still be conceptually wrong.

Map only roles that actually match. Do not map every gray to one neutral, round an intentional spacing value to a convenient step, or replace a font because the profile compiler lacks it. Preview supported profile/brand mappings. Unsupported values or roles remain explicit gaps: implement them through an owning source extension or a documented product-local token graph with the same tier rules, not edits to the kit's immutable snapshots, private CSS overrides or fabricated profile fields. Record local group ownership and equivalent checks.

The Aegis target requires four explicit semantic mappings: Fundamental/light, Fundamental/dark, Fundamental Floating/light and Fundamental Floating/dark. Distinguish originally observed modes from newly designed mappings; never claim an absent mode was inferred from source. Keep sizing, spacing and font metrics invariant across that matrix, with density/responsiveness separate. If preserving existing theme geometry conflicts with this rule, record the conflict and resolve the density/model choice before migrating those consumers. Do not silently restyle them or report them compliant.

## Fully build missing capabilities

Search the installed registry, contracts, public exports and actual APIs before declaring a gap. Classify whether the need is an existing-component extension, new reusable component, composed pattern, page recipe or product-only behavior. Build needed capabilities within the requested refactor scope, rather than ending with a wishlist.

Use [extend-design-language](../extend-design-language/SKILL.md), [create-component](../create-component/SKILL.md), [create-layout](../create-layout/SKILL.md), and [create-token](../create-token/SKILL.md) as applicable. Use an editable Aegis Agentic source checkout for library contributions; never modify classic Aegis or generated kit copies. A source checkout is required to finish a library gap. If unavailable, prepare a compatible product-local implementation and report the remaining library work explicitly.

A reusable capability is complete only when its applicable deliverables exist:

- Implementation with existing product API compatibility, exported types, defaults, callbacks and payloads, refs, controlled/uncontrolled behavior, slots and invalid-combination rules. Keep application services and data contracts in their host or adapter.
- Working states and interactions, appropriate Base UI or native semantics, keyboard/focus behavior, accessible naming and feedback, and the selected accessibility target. Keep behavior independent of styling.
- Owned group tokens and all four semantic mappings, responsive and density rules, and documented supported configurations.
- Public package export/import and a real consumer integration. Do not introduce an incompatible canonical API for other consumers; provide an additive adapter or explicit versioned migration where needed.
- Authored contract with stable requirement IDs, component/host/design responsibilities, anatomy, state model, limitations, configuration and acceptance cases. Generated API facts do not replace behavioral guidance.
- Usage and avoidance guidance, composition examples, accessibility instructions, prop/API reference, token ownership and migration notes. Add functional Storybook examples, an args-driven playground and annotated anatomy, including meaningful states and variations.
- Registry/capability discovery and generated documentation coverage, including availability through the existing agent/MCP discovery paths. Verify discovery, not merely the presence of a source file. Add a new MCP tool only if a genuinely new service operation is needed.
- Relevant behavior, API compatibility, token, package-consumer and visual checks with recorded outcomes. Connect applicable acceptance scenarios without pretending missing checks passed. Add repair eligibility only when a trusted finite repair policy and oracle exist.

Register and regenerate through the library's owning scripts, then run its coverage and affected package checks. Continue the consumer integration against a pinned local package or development source as appropriate. Source implementation, consumer verification, shared acceptance and publication are separate statuses. Follow existing owner/release policy for shared promotion or publishing; do not report a local candidate as an available published component.

## Make the system usable in Storybook

For a requested catalogue or full UI systemization with an existing Storybook, deliver the [canonical documentation structure](references/storybook.md): Foundations, Components, Patterns, Page layouts and Product examples. Adapt naming to established project terminology without mixing implementation files, migration reports and public UI families. Keep diagnostic and historical material in a separate section. Group domain examples under their reusable family rather than presenting every table or page instance as another independent design-system component.

Document the discovered language and token architecture, including Primitive → Semantic → Group → consumer traces, category ownership and all four explicit semantic mappings. Each canonical UI family needs one explanatory documentation page with content tabs, public API and behavior guidance, and an embedded functional playground for its supported variants. Put variant, size, state and configuration choices in that playground rather than separate sidebar pages or one tab per combination. Preserve scenario stories as executable fixtures and useful direct links without presenting them as additional families. The completion review must inspect the actual sidebar, page tabs and playground controls. Preserve existing APIs through adapters where needed; documentation consolidation alone does not remove duplicate implementations. Reconcile the family inventory against rendered variants and meaningful states before calling coverage complete.

## Refactor in verifiable slices

Start with a representative vertical slice that exercises real data/state, a repeated pattern and a meaningful interaction. Build the needed shared boundaries, migrate its tokens, preserve its API through direct reuse or adapters, then verify before expanding to the next family. When a staged refactor was requested, continue through the agreed scope without stopping at a successful pilot.

Preserve behavior and styling together. Compare the same content, states, themes and widths against the baseline. Exercise API contracts, keyboard/focus, selected/draft data, validation, overlays, filters, sorting and navigation relevant to each changed slice. Run existing tests first when feasible; distinguish preexisting failures. Add focused regressions for changed boundaries and intentional variants, not tests that merely mirror prop names.

For accessibility, record criterion-level results and evidence under the chosen target. Static checks or a contrast pass do not certify a whole application. Report unavailable browser/assistive-technology evidence and remaining manual review honestly. Do not regenerate screenshots or weaken assertions to hide an unrequested change.

Remove superseded implementations only after checking all consumers, route variants and external export obligations. Update imports, stories, tests and project guidance with each completed batch. Preserve compatibility wrappers while they are still used.

Keep the migration ledger current: baseline and current counts, consolidated families, preserved exceptions, new library capabilities and their completion states, token mappings, API compatibility, accessibility findings, verified routes and remaining work. Add a concise project `AGENTS.md` pointer to these decisions and the installed canonical skills so later agents reuse the chosen system.

Close the requested scope against outcomes: each included family has a canonical owner or justified separation, its consumers use the chosen boundary, its token trace is valid, and its API, variants and meaningful states are represented and verified in the catalogue. Compare representative pages together to check shared patterns and exceptions. Report build/tests, source reachability, rendered coverage and unresolved duplication separately. Passing builds, a large story count, or a renamed sidebar cannot establish those outcomes. An incomplete family, unverified variant, or retained overlap without a migration decision remains open work; do not call a scoped migration complete by relabeling it a pilot or quietly shrinking its scope.
