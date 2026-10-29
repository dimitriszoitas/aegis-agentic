# Consolidation decisions

Read when deciding whether similar implementations should become one component, pattern or layout. Prefer the smallest shared boundary that preserves the product's existing design and API contracts.

## Compare before combining

For every proposed family, compare purpose, anatomy, interactions, state ownership, public APIs, semantics, density, responsive behavior and visual roles. Cite source/call sites and rendered evidence. Names and pixel similarity only identify candidates.

| Finding                                                                        | Treatment                                                                                            |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Same responsibility, state model and API; repeated implementation              | Extract once, preserve exports through aliases/adapters as needed, migrate consumers.                |
| Same responsibility and semantics; meaningful appearance or placement variants | Share implementation with explicit supported variants. Preserve existing defaults per consumer.      |
| Shared layout with different domain data or actions                            | Extract a pattern/shell with slots or composition; leave data, permissions and services in the host. |
| Same purpose, different API naming or payload shape                            | Keep the source API through an adapter. Test values and event timing, not just type compatibility.   |
| Similar appearance, different selection/commit/focus model                     | Keep distinct semantic components; share a visual row or container only if useful.                   |
| Same numeric style value, different purpose                                    | Reuse an exact primitive if appropriate; retain separate semantic/group roles.                       |
| Difference with unclear intent or insufficient evidence                        | Record the uncertainty and retain behavior while investigating. Do not merge on frequency alone.     |

## Selection row example

A modal contains single-choice rows with a check at the trailing edge. Another screen uses independent checkboxes at the leading edge with a bulk action. Inspect actual roles, pointer and keyboard handlers, form behavior and state transitions. The trailing check alone does not establish whether the row is a radio, an option or an action.

Preserve the modal's trailing affordance, hit area, selection count, commit timing, cancellation and focus behavior. Preserve the other screen's multi-selection and leading controls. Shared typography or row spacing may belong in a visual primitive, but a generic `List` must not collapse these two interaction contracts. If two instances truly share behavior and differ only in indicator placement, a placement variant may be sufficient; keep their existing API through wrappers if required.

An existing input named `selectedId` with `onSelect(id)` must not silently become `value` with `onChange(event)`. Public aliases can retain the product's interface while delegating internally. Preserve whether a change is immediate or draft, whether repeated selection emits, and whether Cancel discards or commits. Check form serialization, accessibility and ref targets as part of compatibility.

## Pattern and layout boundaries

Collection pages may share a header, toolbar and results shell while retaining distinct filters, columns and permissions. Settings pages with immediate persistence and forms with Save/Cancel require different commit contracts even if their field layouts match. Push filter panels occupy layout space and preserve access to results; modal panels isolate a task. Do not swap one for the other to make the components look uniform.

Record which decisions are product-wide and which are scoped exceptions. A saved pattern policy can enforce supported import/prop rules, while browser scenarios verify layout and state. Do not pretend a static import check proves correct reading order or panel behavior.

## Aegis fit and missing components

Reuse Aegis directly only when its public API can express the required behavior and anatomy. Prefer a thin compatibility adapter for naming/default differences. A private-selector CSS override, discarded prop or callback translation that changes behavior indicates an unresolved gap.

For a reusable gap, build the full component or extend its owning family and preserve existing consumers. For product-only orchestration, build a local pattern with its own contract and shared controls. Track implementation, API, tokens, guidance, stories, contracts, exports, discovery, verification and release status individually. A successful local render is not a complete library contribution.
