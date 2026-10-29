---
name: systemize-repo
description: Systemize an existing UI repository with Aegis by discovering its design language, consolidating compatible components and page patterns, migrating tokens, and fully building missing library capabilities while preserving existing APIs and product behavior.
---

# Systemize a repository

Turn an existing interface into a maintainable design system implementation. Preserve its identity, deliberate interaction choices and public APIs unless the user requests a change. This is an agent-assisted investigation and staged refactor, not a deterministic one-command converter or automatic source repair.

Read the [agentic contract](../references/agentic-contract.md) and [design contract](../references/design-contract.md). Use the [systemization record](references/systemization-record.md) for the project's findings and migration ledger. Read [consolidation decisions](references/consolidation.md) before merging implementations and [accessibility targets](references/accessibility.md) before assessing or changing styling.

## Establish the target

- Identify the user's actual repository, current changes, workspace instructions, framework, build tools, component libraries, routes, styling sources and existing tests. Do not substitute a demo or the Aegis source repository for a missing target path.
- Record the requested scope: audit, pilot, or staged refactor. A request to systemize and refactor authorizes implementation within that scope; do not add approval gates between routine batches. An audit-only request produces findings without rewriting application code.
- Default to preserving the discovered visual language. An Aegis restyle or other redesign is a separate explicit choice. Record `accessibilityTarget` as `normal`, `AA`, or `AAA`, defaulting to `normal` only if no project target is already established. Normal still requires minimum AA text contrast, keyboard access, visible focus and accessible names; it permits subtler borders without claiming WCAG conformance.
- Record the source revision and local changes, selected Aegis source/kit release, profile and registry. Use an isolated branch or checkout where appropriate; preserve unrelated edits. Reuse existing dependency and folder conventions where they serve the new boundaries.
- Inspect framework compatibility. Aegis's current styled implementations are React/TypeScript web components. Its guidance and token architecture can inform other stacks, but do not introduce React, replace the application framework, or claim an available native adapter without evidence.

## Discover the design language and intent

Inventory routes, page shells, patterns, components, variants and states from source and actual rendered workflows. Include imports and call sites, not only named component files. Inspect theme providers, CSS/custom properties, utilities, inline styles, local styles and existing assets; omit generated/vendor code from ownership counts.

Identify typography, semantic color roles, surfaces, border roles, radius, elevation, spacing, density, icon treatment, motion, responsive behavior and theme coverage. Relate values to their uses. Equal values can have different meanings; repeated values can be accidental. A dominant color or spacing frequency does not establish the designer's intent.

For each candidate family, capture anatomy and interaction alongside appearance: leading/trailing controls, row hit areas, single/multiple selection, immediate/draft commit, cancel/dismiss behavior, reading order, focus, keyboard behavior and state ownership. A check at the end of a modal selection row is a preservation requirement, not a reason to substitute a leading checkbox. Do not infer a widget's semantics from its icon.

Maintain evidence links to files and call sites, plus route/state/theme/viewport screenshots and observations when runnable. Distinguish explicit product decisions, observed implementation, inferred conventions and unresolved conflicts. Mark confidence and sampling boundaries. Inspect multiple representative screens before promoting an observation to a shared rule. When no coherent language exists, retain scoped families and propose a minimal convention rather than inventing a brand.

Capture existing component APIs before changing consumers: prop names/types, defaults, controlled/uncontrolled modes, callbacks and payloads, refs, slots, form semantics, public imports and any supported style hooks. Include forwarded DOM/data/ARIA attributes, focus methods, event ordering/cancellation and native form serialization where applicable. Record real API/network integrations as host obligations. Preserve routes, request shapes, timing, persistence, permissions and business logic through the refactor.

## Plan compatible consolidation

Group candidates by responsibility and behavior, then compare anatomy, API and styling. Use the [decision matrix](references/consolidation.md) to choose reuse, extraction, compatible variants, composition, adapter or separate implementations. Do not equate similar screenshots with interchangeable components.

Reuse the existing repo API as the starting contract. If an Aegis component fits but exposes a different API, preserve the product's API through a thin adapter when possible. Add a shared capability when necessary; do not rewrite working call sites merely to obtain familiar prop names. Record unavoidable breaking changes and their migration before applying them, and resolve unclear behavior with the user while continuing unaffected work.

Separate reusable controls, reusable task patterns, page shells and product-specific orchestration. Introduce props for actual supported differences, with invalid combinations excluded. Avoid a universal component with unrelated Boolean switches. Preserve useful existing folders; establish explicit import boundaries instead of moving the whole repo to a prescribed structure.

Record common page recipes and conventions: headers, actions, search width, filter commit behavior, push panels versus modal tasks, density, reading measures, responsive ordering and overflow ownership. Preserve task-specific exceptions. Use [page composition](../references/page-composition.md) and the installed recipe/policy schemas for supported rules. Keep extra design observations in the decision record, not invented schema fields.

## Tokenize without silently redesigning

Follow [create-token](../create-token/SKILL.md). Trace each design decision through exact Primitive values, Semantic roles and owned Group roles to its consumers. Keep measured geometry, user data and interaction values out of the design-token catalog. Preserve exact values during reference migration except documented accessibility fixes or explicitly requested restyling.

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

## Refactor in verifiable slices

Start with a representative vertical slice that exercises real data/state, a repeated pattern and a meaningful interaction. Build the needed shared boundaries, migrate its tokens, preserve its API through direct reuse or adapters, then verify before expanding to the next family. When a staged refactor was requested, continue through the agreed scope without stopping at a successful pilot.

Preserve behavior and styling together. Compare the same content, states, themes and widths against the baseline. Exercise API contracts, keyboard/focus, selected/draft data, validation, overlays, filters, sorting and navigation relevant to each changed slice. Run existing tests first when feasible; distinguish preexisting failures. Add focused regressions for changed boundaries and intentional variants, not tests that merely mirror prop names.

For accessibility, record criterion-level results and evidence under the chosen target. Static checks or a contrast pass do not certify a whole application. Report unavailable browser/assistive-technology evidence and remaining manual review honestly. Do not regenerate screenshots or weaken assertions to hide an unrequested change.

Remove superseded implementations only after checking all consumers, route variants and external export obligations. Update imports, stories, tests and project guidance with each completed batch. Preserve compatibility wrappers while they are still used.

Keep the migration ledger current: baseline and current counts, consolidated families, preserved exceptions, new library capabilities and their completion states, token mappings, API compatibility, accessibility findings, verified routes and remaining work. Add a concise project `AGENTS.md` pointer to these decisions and the installed canonical skills so later agents reuse the chosen system. Do not claim repository-wide completion from a sampled pilot.
