# Shared design contract

This contract applies to component, token, and layout work in this repository. It defines the approved architecture. Inspect the current source before implementation; an existing shortcut is a migration target, not permission to extend that shortcut.

## Three token tiers

```text
Primitive values → Semantic roles → Group roles → Components and layouts
```

There are three token tiers. Components and layouts are consumers, not a fourth token tier.

- **Primitive:** exact context-free colors, dimensions, font metrics, percentages, and other design values. No semantic or group references.
- **Semantic:** shared design meaning with explicit theme mappings. Primitive references only.
- **Group:** descriptive roles owned by the Storybook sidebar category. Semantic references only.
- **Consumer:** component or layout styling and its numeric design defaults. Group references only.

Resolve the category from `tokens/component-categories.json` using the longest matching source prefix. A component's own CSS, inline styles, and numeric design defaults use only that category's namespace. Every component under **Components/Triggers**, including Button, Link, DropdownMenu, and ContextMenu, uses `--group-trigger-*` for its own properties. Do not create a per-component top-level group or borrow another category's tokens because their values happen to match.

A genuinely nested shared component retains its own category. A Card uses Surface tokens for the Card's properties; a real Button rendered inside it still uses Trigger tokens for the Button's properties. The parent may lay out the child using its own category tokens, but must not restyle the child's implementation or reclassify borrowed tokens as nesting. Shared helpers and registry imports do not establish a nested-component relationship. Document owned and nested bindings separately, and keep actual ownership violations visible until the source is corrected.

The same rules apply inside fallbacks and composite expressions. A semantic gradient or shadow must resolve directly through primitive operands, not another semantic token. A group alias cannot bypass semantics. State-dependent local bindings may select the appropriate group token; they are implementation bindings, not a new public token tier.

Runtime values derived from actual data, measurement, or interaction are not design tokens. Examples include a dragged column's measured width, a progress value, or a calculated popover position. Fixed defaults, clamps, thresholds, and visual dimensions still follow the three tiers. Document the difference and keep numeric JavaScript defaults synchronized with their CSS source.

## Four explicit semantic mappings

Every semantic token defines Fundamental/light, Fundamental/dark, Fundamental Floating/light, and Fundamental Floating/dark explicitly, including when several mappings are identical.

Sizing, spacing, font families, font sizes, line heights, weights, and tracking remain identical across all four mappings. Colors, radii, border treatment, and shadows may change with the selected theme or mode. Existing mode-dependent sizing or spacing must be reconciled during migration rather than silently retained as an exception.

Responsive breakpoints, density choices, and user resizing are separate axes. Their rules must behave consistently across the four combinations. Keep theme changes from altering content, selection, drafts, or interaction state.

## Naming scales

Semantic dimension, spacing, and radius ramps use this order:

`xxxs`, `xxs`, `xs`, `s`, `m`, `l`, `xl`, `xxl`, `xxxl`, `xxxxl`.

Group names describe relative treatment within a category:

- **Spacing:** `flush`, `hairline`, `tight`, `snug`, `compact`, `regular`, `comfortable`, `roomy`, `spacious`, `expansive`.
- **Radius:** `square`, `slight`, `subtle`, `soft`, `rounded`, `bold`, `strong`, `pronounced`, `dramatic`, `full`.
- **Sizing:** `tiny`, `small`, `compact`, `regular`, `comfortable`, `roomy`, `large`, `extra-large`, `huge`, `vast`.

Sizing names are the working vocabulary; inspect the approved token manifest before adding a new family. A label's numeric meaning is local to its group. For example, the Trigger category's button `snug` spacing may be 4px while the Surface category's container `snug` spacing is 16px. This illustrates relative naming, not a universal mapping to copy into every group.

When a new step belongs between existing group steps, review the ordering and neighboring names. Renaming may be appropriate. Audit and migrate all consumers, exports, documentation, and tests while preserving existing values unless a visual change is explicitly requested.

## Headless behavior and focus

Use Base UI for applicable composite interaction behavior and keep its headless entry independent of styles. Styled components consume group tokens and expose clear public props. Do not add theme-specific visual decisions to the behavior layer.

Keyboard focus uses `:focus-visible` and input-modality tracking where text controls retain native focus-visible after a pointer click. Pointer focus alone must not add a focus ring or outline. A quiet active border may remain. Keep native focus and a visible keyboard indicator; preserve forced-colors support, focus return, and navigation handoffs. Do not remove hidden primitive focus guards as a styling workaround.

## Source and verification

The authoritative token manifest is `tokens/design-tokens.json`; its generated stylesheet is `src/styles/design-tokens.css`. Change definitions through the manifest and owning scripts, not generated CSS or compatibility declarations. Inspect `src/lib/component-design-tokens.ts` for numeric runtime access and keep its defaults synchronized with the canonical definitions. Component implementations and exports live in `src/components` and `src/package`; composed patterns live in `src/patterns`. The Directory and source-backed component documentation identify existing families and APIs.

Use the relevant scripts in `package.json`, including token, headless-boundary, type, lint, unit, interaction, documentation, and package checks. Verify actual keyboard behavior and computed theme values in addition to automated accessibility checks. Coordinate generated documentation with concurrent work so one final generation reflects a stable source snapshot. Do not edit unrelated local review prototypes or infer publishing authorization from a request to create a component.
