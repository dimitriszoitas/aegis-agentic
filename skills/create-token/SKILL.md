---
name: create-token
description: 'Create, map, or migrate design tokens in this repository across Primitive, Semantic, and Group tiers. Use for token definitions, naming, theme mappings, and reference migrations, not for arbitrary runtime data or measured geometry.'
---

# Token creation

Read [the shared design contract](../references/design-contract.md) first. Its tier boundaries and naming scales are requirements, not suggestions to approximate with the current file names.

## Trace before adding

Identify the property, owning sidebar category from `tokens/component-categories.json`, existing role, value source, consumers, and all four theme mappings. Search CSS, TypeScript, generated stylesheet inputs, package exports, stories, and documentation. Record computed values before a migration so refactoring references does not silently restyle the system.

Choose the tier by responsibility:

- A primitive is an exact, context-free value or scale entry.
- A semantic token expresses a shared design role and references only primitives.
- A group token gives that role a descriptive name within the sidebar category and references only semantic tokens. All Trigger implementations use `--group-trigger-*`; do not introduce separate Button or Link top-level groups.
- A component consumes only its own category group tokens; it does not reach through to semantic or primitive tokens or borrow another category. A real nested child component independently retains its own category bindings.

Keep measured positions, user-resized widths, progress, and supplied content data outside the design-token catalog. A fixed default, minimum, maximum, icon size, or animation duration is still a design decision and must follow the tiers, even if JavaScript reads it.

## Define the mapping

Use an existing exact primitive when possible. Add an appropriate primitive when the required value is absent; do not choose the nearest color or dimension merely to avoid adding a value. Keep raw values in the primitive source and maintain any generated outputs through their owning generator.

Every semantic token must have four explicit mappings: Fundamental/light, Fundamental/dark, Fundamental Floating/light, and Fundamental Floating/dark. Sizing, spacing, and font metrics resolve identically across them. Theme styling may vary colors, corners, border treatment, and shadows. A responsive rule or density option is a separate axis and must be equivalent across the four theme combinations.

Flatten semantic-to-semantic references at generation time or in the authoritative mapping. Composite semantic expressions may use primitive operands, but must not hide semantic dependencies inside gradients, `color-mix()`, `calc()`, fallbacks, or shadow lists. Group tokens must reference semantic roles only. Preserve meaningful primitive alpha and composition instead of rounding to a nearby opacity stop.

Use the approved semantic ramps and group vocabularies in the shared contract. Group labels are relative to their category; the same label does not imply the same numeric value in every group.

## Migrate names deliberately

Before inserting a step between existing group steps, review the neighboring names and their ordering. Rename neighboring steps when necessary to preserve an understandable scale. Audit every reference, preserve existing rendered values unless a visual change is requested, and migrate source, public exports, documentation, examples, and tests together. Do not leave aliases that bypass a tier or accidentally repurpose an existing name.

Avoid editing generated CSS or JSON as the source of truth. Update the owning typed definitions or manifest, regenerate only when the shared source is stable, and inspect the resulting graph for cycles, missing references, and references to the wrong tier.

## Verify the contract

Check reference direction and all four explicit mappings. Compare computed dimensions, spacing, and font metrics across themes. For colors, verify actual text and control contrast on the surfaces and interaction states where the token is used; test gradient intermediates when text crosses a gradient. For numeric JavaScript consumers, check CSS-resolved values, server defaults, scoped theme inheritance, and measured layout estimates remain consistent.

Run the repository token checks and focused component tests affected by the mapping. Review representative light/dark and Fundamental/Floating examples. Update the token documentation with the real source, role, group, and resolved values. Report any intentional appearance change separately from the reference migration.
