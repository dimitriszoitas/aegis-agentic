# Canonical Storybook delivery

Read when systemizing an existing catalogue or building one as part of the requested refactor. The catalogue should explain the system and let a consumer exercise its real APIs. Preserve the product's design language while applying Aegis's ownership, token and documentation logic.

## Organize by responsibility

Use the following hierarchy, adapting labels to established product terminology when needed:

| Section | Content |
| --- | --- |
| Foundations | Design language, typography, color, spacing, density, elevation, motion, accessibility targets, token layers and theme/mode mappings. |
| Components | One canonical family page per reusable UI responsibility, grouped into categories with clear token ownership. Include supported visual and behavioral variants within that family. |
| Patterns | Reusable tasks such as filtering a collection, selecting records or editing with Save/Cancel. Show the host obligations and supported configurations. |
| Page layouts | Reusable page structure, slots, scroll/overflow ownership, responsive rules and composition constraints. |
| Product examples | Domain pages and scenarios composed from the canonical system, with links to their components, patterns and layouts. |

Place migration ledgers, source-reachability reports and retained historical demonstrations in a separate audit or archive section. They can explain evidence and compatibility without appearing to be additional supported families. Preserve useful story links through redirects or a documented migration where feasible. Do not delete a consumed component to simplify navigation.

Different domain columns, data or permissions usually belong in examples of the same grid or collection pattern. Distinct selection, editing, pagination or provider contracts may justify separate families or variants. Name that difference and explain which to use; a folder name such as `legacy` or `new` is not enough. If duplicate runtime orchestration remains, mark it as migration work even after grouping its stories.

## Explain foundations from the actual token graph

Organize Foundations by design topic, not only by token tier: Colors, Typography, Spacing & Sizing, Iconography, Motion, Opacity, Border, Elevation, and Themes & Modes as applicable to the product. Within a topic expose primitive values and semantic roles as tabs or sections, plus group ownership and inspectable references. Use browsable color tables with swatches and dependency columns, typography specimens, dimension bars, radius/border samples and elevation/motion examples appropriate to each topic. Color tables expose Primitive → Hex, Semantic → Primitive → Hex, and Group → Semantic → Primitive → Hex for the selected mapping. Preserve alpha and gradient stops instead of inventing one opaque hex for a composite color. Group typography specimens by their actual property: font size, line height, tracking, family and weight. A context-free dimension reused by more than one property can appear in more than one specimen group; do not render line-height or tracking values as font sizes. Keep the full searchable registry available as an audit/detail view. A thousand-row token table alone is not usable Foundations documentation. Show the reconciled canonical scales and distinguish missing coverage from invented values. Keep unmigrated source values and compatibility aliases in audit material, with their consumers and planned dispositions. Correct the manifest first; filtering a wrongly classified token out of a topic is not a migration.

Document context-free primitive values, shared semantic roles, category-owned group roles and component/layout consumers as distinct layers. If the project also calls unstyled behavior components “primitives,” distinguish that meaning from primitive tokens.

Show real values with useful previews and references: color swatches, type and spacing scales, surfaces, borders, radii and elevation where applicable. Provide browsable or searchable inventories for large graphs, and a representative trace such as a control surface from its owning group through its semantic role to the exact primitive. Link to the owning source and affected family; avoid a separate hand-maintained value list that can drift.

Expose Fundamental/light, Fundamental/dark, Fundamental Floating/light and Fundamental Floating/dark mappings explicitly, including identical mappings. Show which were observed in the source and which were newly authored. Keep density and responsive rules separate from those axes. Derived documentation must agree with the canonical manifest and rendered styling; a displayed token graph does not establish that consumers actually follow it.

## One useful page per canonical family

Deliver one canonical documentation page per component family. Organize it with a small set of content tabs, such as Overview, Anatomy, API, Accessibility and Tokens Used. Variants, sizes, states, slots, prop values and their combinations belong in the embedded playground controls and contextual examples within that page. Do not create a sidebar page or a documentation tab for each variant or combination. Keep genuinely different interaction responsibilities separate, with an explicit explanation of the boundary.

Reconcile existing long story lists into that page. Retain useful scenario stories as test fixtures and direct links when needed, while presenting the family documentation as the main sidebar destination using the installed Storybook version's supported navigation mechanism. Do not delete interaction coverage to tidy the sidebar. Confirm every supported variant remains reachable through the playground or an appropriate example. Verify the actual sidebar and in-page controls in the browser; a renamed title or collapsed tree is not consolidation.

A family page should include:

- Responsibility, when to use or avoid it, anatomy, and its relationship to neighboring families.
- The actual public API: props, accepted values, defaults, refs, slots, controlled/uncontrolled ownership, callbacks and payloads, supported composition and invalid combinations.
- An embedded, functional playground on that docs page, with visible controls for meaningful supported options and a preview using the real component. Storybook's separate Canvas controls alone do not meet this requirement. Share args and render logic with the stories where possible.
- Supported variants and meaningful state examples, including specialized wrappers and treatments discovered in product call sites. Explain how to select them through the public API or compatibility adapter.
- Behavioral guidance, keyboard/focus and accessibility requirements, host obligations, owned group tokens and theme/density/responsive rules. Include usage examples that preserve real event and data contracts.
- Tokens Used derived from the actual implementation, with anatomy/part, property, state or variant, and source location showing where each binding is used. Group rows by Colors (Background, Text, Border, Icons and other applicable roles), Spacing, Sizing, Border radius, Border width, Typography, Elevation, Motion and Opacity as applicable. Show the Group → Semantic → Primitive → resolved value trace and mapping. Distinguish own bindings from nested components and story-only styling. Keep direct semantic/primitive usage, hardcoded design values, compatibility aliases, unresolved expressions and unsupported analysis visible as gaps; importing a registry does not prove use of every token in it.

Use controls that match the API: selections for finite variants, toggles for applicable states, meaningful fixture choices for slots and data. Do not allow incompatible combinations or controls that never change the preview. Keep controlled examples interactive, expose relevant callback outcomes, and provide reset for stateful scenarios. Loading, disabled, empty, selected, invalid and overflow states apply only where supported. API documentation must distinguish a host-supplied state from behavior implemented by the component.

Do not create artificial variants solely to fill a playground. A specialized button can remain a public wrapper with its existing props while the Button family page documents and renders it. Consolidating its styling or behavior must preserve that compatibility, not silently discard its treatment or rename its public API.

## Prove coverage at the family and variant level

Walk the actual application shell before relying on the existing story catalogue. Map visible shared surfaces such as primary side navigation, top navigation, account/workspace menus, page headers and global search to their canonical family or pattern page. A sidebar imported only by a story decorator is not documented navigation coverage. Show its real reusable pieces under Components and its actual routed application composition under Patterns or Page layouts, with links between them. Use the real implementation and local provider fixtures; do not draw a substitute sidebar that merely resembles it. Record absent, backend-dependent or unverified surfaces explicitly.

Reconcile the discovered family inventory with the docs pages and actual examples. For each supported variant or meaningful state, record its API/configuration, a direct rendered example or playground setup, and verification status. Include representative combinations where interactions can differ, such as density with editable rows or loading with disabled actions. Exhaustive Cartesian combinations are unnecessary; state the sampling boundary and retain unverified combinations as such.

Keep these evidence types separate:

| Evidence | What it establishes |
| --- | --- |
| Source file or import graph | Implementation exists or is reachable; it may never render in the story. |
| Public API inventory | Supported configuration is declared; it may be undocumented or broken. |
| Direct example or playground setup | A variant can be rendered deliberately; it still needs verification. |
| Rendered and interaction check | The named appearance or behavior was exercised in the recorded state, theme and viewport. |

Verify that each family has one main documentation destination, tabs group documentation topics rather than combinations, its embedded controls change the preview, and meaningful interactions actually work. A long sidebar list of prop or variant permutations remains incomplete catalogue organization. Compare sibling variants and representative consuming pages for unintended drift. Record the checks run and what they covered; a static story build or portable story import does not prove rendered state coverage. Keep missing variants and incomplete family docs visible in the completion ledger rather than counting transitive imports as coverage.
