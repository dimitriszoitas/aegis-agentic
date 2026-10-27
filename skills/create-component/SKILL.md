---
name: create-component
description: 'Create or extend reusable React components in this repository with Base UI behavior, group tokens, public APIs, and source-backed documentation. Use for component work, not for a page that can be composed from existing components.'
---

# Component creation

Read [the shared design contract](../references/design-contract.md) before changing an API or visual treatment. It defines the required token tiers, theme matrix, naming scales, and focus behavior.

## Find the right component boundary

Inspect the Directory, public exports, implementation, and existing stories before creating a new family. Search equivalent vocabulary without treating names as equivalent behavior: a Tag is not automatically a StatusBadge; Select, DropdownMenu, and MultiCombobox solve different tasks; a Field supplies labeling and validation rather than a text input implementation.

Extend the existing component when its responsibility and interaction model match. Create a new component when the requested behavior has a distinct reusable contract. Keep application data, routing, and product-specific decisions in the consuming pattern or application.

## Separate behavior from appearance

Use the installed `@base-ui/react` primitives for applicable interactive behavior. Inspect their current exported types and the nearest migrated component before composing parts. Preserve keyboard navigation, controlled state, native form behavior, labeling, disabled state, dismissal, and focus return through the primitive API. Use native elements for simple static content or interactions that do not need a composite primitive.

Keep the headless package entry free of styles and application logic. Put styling in the component's scoped stylesheet and consume only the group namespace assigned to its sidebar category in `tokens/component-categories.json`. All Trigger implementations use `--group-trigger-*`, including their own icon dimensions and defaults. Actual nested shared components keep their own category tokens; importing a utility or token registry is not nesting. Select variants through props and state attributes. Do not move color, radius, shadow, or spacing choices into the behavior layer or branch the component on a theme name.

Use `:focus-visible` for keyboard focus treatment. Do not add a focus ring or outline merely because a control has pointer focus. A quiet active border may remain. Keep keyboard focus clearly visible, including in forced-colors mode. Preserve native focus, focus guards, and deliberate focus handoffs.

## Define the public contract

Follow the nearest component folder convention: implementation, scoped stylesheet, public index, and focused stories. Export public prop types. Make controlled and uncontrolled behavior explicit when both are supported. Forward the intended primitive/root props, refs, and accessibility attributes without accidentally dropping lifecycle callbacks.

Model intent, emphasis, size, and state as separate concerns. Reuse existing names when their meaning matches; do not introduce a new option only to reproduce a value already represented by the group tokens. A default design value belongs in the token system, while user data and measured geometry remain runtime values.

## Document and verify the real behavior

Add a useful standalone example, relevant states, and a focused interaction story. Provide an actual annotated Anatomy specimen with optional parts enabled; use real DOM selectors rather than a story matrix. Maintain purpose, usage, accessibility, API, token, and in-context guidance. Never hand-edit generated metadata.

Provide an args-driven Playground story for the Overview. Forward its controls to the actual component, including meaningful variants, sizes, states, and optional parts. Keep interactive state synchronized with changed args. Use serializable story options to select icons or other React elements; never expose inert controls for a fixed matrix or ask users to edit React nodes as JSON. The Overview centers the specimen and displays its controls beside it. Choice sets with up to four options use a segmented control; larger sets use a dropdown. Reset must restore the example, and theme changes must preserve its edited settings.

Check the four Fundamental/Fundamental Floating and light/dark combinations. The same size variant must keep its dimensions, font metrics, and spacing in all four. Verify the applicable keyboard behavior, pointer behavior, names, disabled/error states, overlays, and mobile fit. Include reduced-motion or forced-colors checks when the component uses those features. An axe pass supplements native interaction checks; it does not replace them.

Run scoped formatting/lint and the repository checks relevant to the change. If public exports change, verify the package entry and consumer types. Coordinate the final documentation generation with other work so one generation uses a stable source snapshot. Report what changed, what was verified, and any remaining limitation.
