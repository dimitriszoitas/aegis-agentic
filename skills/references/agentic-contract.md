# Agentic kit contract

The project profile, registry, composition contract and kit version are authoritative inputs. Source prose explains choices; executable contracts constrain them. Generated API metadata does not certify behavior or accessibility.

## Discovery and ownership

Start with the kit manifest and registry. Search by responsibility, capability and aliases. Prefer the canonical implementation when it fits; extend its public contract only when the responsibility remains coherent. Keep product data/routing in the consuming application. A new semantic role, incompatible behavior, or unsupported combination is an explicit proposal, not an undocumented CSS override.

## Token and component foundation

Read [the shared design contract](design-contract.md) for the authoritative Primitive → Semantic → Group rules, four explicit theme/mode mappings, category ownership and relative naming scales. It is the same source used by the repository's component, token and layout skills.

The portable kit includes `tokens/design-tokens.json` and `tokens/component-categories.json` as reference snapshots. Its compiler is bundled; editing a reference snapshot does not rebuild that compiler. New token roles or category registrations require a source-checkout proposal and a new kit version. In a consumer project, retain the declared owning group for new local components and run equivalent ownership checks before upstream acceptance.

## New components

Specify responsibility, anatomy, properties, invalid combinations, state model, keyboard/focus behavior, names, group ownership and acceptance cases before implementation. Use native elements when sufficient and Base UI for applicable composite behavior. Preserve its controlled/uncontrolled semantics and accessibility APIs. Focus styling is keyboard-visible. Do not imitate a composite widget using visual-only markup.

Find the nearest approved family and examples. Use deterministic shared recipes; never copy resolved profile colors into component CSS. A new composition can be valid without adding a semantic role. Tests must include required states and relevant combinations, not merely confirm the implementation's current output.

## Evidence and acceptance

Keep exact profile, registry and compiler versions with each result. Report automated checks, manual review and unverified cases separately. New candidates are experimental until promoted into a canonical registry release. Shared acceptance needs design/behavior review; local creation is allowed without publishing it.

## Maintenance

Only deterministic derived-output drift from unchanged approved inputs qualifies for automatic local repair. Behavioral changes, profile source changes, dependency updates, public API changes, contract changes and releases require owner review. A repair must not alter its test oracle, baseline or thresholds to pass. Keep a backup/evidence record and stop after the bounded attempt fails. Updates to consumer projects are explicit and versioned.
