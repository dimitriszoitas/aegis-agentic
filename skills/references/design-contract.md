# Shared design contract

This contract applies to component, token, and layout work in this repository. It defines the approved architecture. Inspect the current source before implementation; an existing shortcut is a migration target, not permission to extend that shortcut.

## Three token tiers

```text
Primitive values → Semantic roles → Group roles → Components and layouts
```

There are three token tiers. Components and layouts are consumers, not a fourth token tier.

- **Primitive:** exact context-free colors, dimensions, font metrics, percentages, and other design values. No semantic or group references.
- **Semantic:** a reusable design choice, treatment, state or scale with explicit theme mappings. Primitive references only.
- **Group:** the use of a semantic choice by an owning category, component part or layout role. Semantic references only.
- **Consumer:** component or layout styling and its numeric design defaults. Group references only.

Resolve the category from `tokens/component-categories.json` using the longest matching source prefix. A component's own CSS, inline styles, and numeric design defaults use only that category's namespace. Every component under **Components/Triggers**, including Button, Link, DropdownMenu, and ContextMenu, uses `--group-trigger-*` for its own properties. Do not create a per-component top-level group or borrow another category's tokens because their values happen to match.

A genuinely nested shared component retains its own category. A Card uses Surface tokens for the Card's properties; a real Button rendered inside it still uses Trigger tokens for the Button's properties. The parent may lay out the child using its own category tokens, but must not restyle the child's implementation or reclassify borrowed tokens as nesting. Shared helpers and registry imports do not establish a nested-component relationship. Document owned and nested bindings separately, and keep actual ownership violations visible until the source is corrected.

The same rules apply inside fallbacks and composite expressions. A semantic gradient or shadow must resolve directly through primitive operands, not another semantic token. A group alias cannot bypass semantics. State-dependent local bindings may select the appropriate group token; they are implementation bindings, not a new public token tier.

Runtime values derived from actual data, measurement, or interaction are not design tokens. Examples include a dragged column's measured width, a progress value, or a calculated popover position. Fixed defaults, clamps, thresholds, and visual dimensions still follow the three tiers. Document the difference and keep numeric JavaScript defaults synchronized with their CSS source.

## Four explicit semantic mappings

Every semantic token defines Fundamental/light, Fundamental/dark, Fundamental Floating/light, and Fundamental Floating/dark explicitly, including when several mappings are identical.

Sizing, spacing, font families, font sizes, line heights, weights, and tracking remain identical across all four mappings. Colors, radii, border treatment, and shadows may change with the selected theme or mode. Existing mode-dependent sizing or spacing must be reconciled during migration rather than silently retained as an exception.

Responsive breakpoints, density choices, and user resizing are separate axes. Their rules must behave consistently across the four combinations. Keep theme changes from altering content, selection, drafts, or interaction state.

## Meaning before naming

Classify responsibility before choosing a prefix. A valid reference graph alone does not establish a useful design system.

- Primitives answer **what exact value?** Their names describe context-free values, palettes or scales. Reuse a primitive only when its value and type match; an opacity zero is not a spacing primitive.
- Semantics answer **which reusable design choice?** Examples include `radius-subtle`, `radius-rounded`, `radius-pill`, `size-small`, `size-large`, `space-compact`, `color-neutral-subtle`, `color-content-muted`, `color-danger`, `duration-fast` and `elevation-raised`. Define meaning, ordering and applicable property in the manifest. The same choice has one mapping per theme, independent of the consuming family.
- Groups answer **where is that choice applied?** Control, item, surface, dialog, avatar, toolbar and page identify ownership or anatomy. For example, `--group-input-control-radius` selects `--semantic-radius-subtle`, while `--group-surface-dialog-radius` selects `--semantic-radius-rounded`. Keep the category namespace and meaningful part/property/state. A semantic called `radius-control` or `size-sidebar` has placed a group responsibility in the semantic tier.

These examples express responsibilities, not a ban on a word in every context. A generic disabled color or selected treatment is shared meaning; a navigation item's selected background is a group application. A typography title or body style can be shared meaning; a specific badge's text size is a group application. Descriptions and consumers must support the distinction.

Use a deliberate, ordered semantic vocabulary per property: for example square/subtle/soft/rounded/pill for radius, small/medium/large for size, and tight/compact/regular/roomy for spacing. Existing abbreviated scales (`xxxs` through `xxxxl`) are valid when defined consistently and used as shared choices. Do not put owner names or `legacy`/`native` source labels into a semantic scale. Family-relative differences belong in group mappings to different shared choices, not multiple incompatible definitions of one semantic name.

A group name may include a variant such as `small` when it identifies a real family option, but that does not make `small` exclusively group vocabulary. Its category and part establish ownership. Avoid parallel aliases for the same responsibility. Equal values alone do not prove equal meaning; merge choices only when their meaning and all four mappings agree. Record distinct meanings and deliberate exceptions.

During migration, separate canonical tokens from compatibility aliases. Compatibility aliases have an owner, target and remaining consumers; they do not become extra canonical semantic choices. Preserve existing API hooks where required without presenting them as the new design vocabulary. Review the ordered scale, affected consumers, docs and tests together when adding or renaming a choice.

## Headless behavior and focus

Use Base UI for applicable composite interaction behavior and keep its headless entry independent of styles. Styled components consume group tokens and expose clear public props. Do not add theme-specific visual decisions to the behavior layer.

Keyboard focus uses `:focus-visible` and input-modality tracking where text controls retain native focus-visible after a pointer click. Pointer focus alone must not add a focus ring or outline. A quiet active border may remain. Keep native focus and a visible keyboard indicator; preserve forced-colors support, focus return, and navigation handoffs. Do not remove hidden primitive focus guards as a styling workaround.

## Source and verification

The authoritative token manifest is `tokens/design-tokens.json`; its generated stylesheet is `src/styles/design-tokens.css`. Change definitions through the manifest and owning scripts, not generated CSS or compatibility declarations. Inspect `src/lib/component-design-tokens.ts` for numeric runtime access and keep its defaults synchronized with the canonical definitions. Component implementations and exports live in `src/components` and `src/package`; composed patterns live in `src/patterns`. The Directory and source-backed component documentation identify existing families and APIs.

Use the relevant scripts in `package.json`, including token, headless-boundary, type, lint, unit, interaction, documentation, and package checks. Verify actual keyboard behavior and computed theme values in addition to automated accessibility checks. Coordinate generated documentation with concurrent work so one final generation reflects a stable source snapshot. Do not edit unrelated local review prototypes or infer publishing authorization from a request to create a component.
