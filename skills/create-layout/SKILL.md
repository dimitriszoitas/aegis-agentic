---
name: create-layout
description: "Compose responsive application pages and reusable layout patterns from this repository's components and group tokens. Use for page structure, navigation, panels, and content hierarchy rather than creating a new primitive component by default."
---

# Layout creation

Read [the shared design contract](../references/design-contract.md) before choosing containers, spacing, or theme behavior.

## Start with content and existing patterns

Identify the page's primary task, information hierarchy, navigation, state ownership, and responsive constraints. Inspect existing page headers, navigation, filtering, wizard, notification, and AI patterns before introducing another shell. Reuse a pattern when its responsibility matches; do not copy a whole demonstration application to obtain one layout.

Keep normal content groups transparent unless a distinct surface communicates a meaningful relationship. Use existing Card, panel, or overlay components for their actual role rather than wrapping every component in a decorative card. Separate controls, semantic feedback, and structural containers; their boundaries are not interchangeable.

## Compose through group tokens

Use the sidebar category assigned to the layout or pattern in `tokens/component-categories.json` for its own spacing, sizing, typography, and style tokens. Nested shared components retain their own category bindings. A layout may position a child through its own tokens, but must not borrow another category to style its own elements or override the child's internal styling. Do not consume primitives or semantic tokens directly in the layout implementation, and do not introduce fixed visual values as inline style shortcuts.

Keep the same sizing, spacing, and font metrics in all four theme combinations. Fundamental Floating may change the approved surface, border, radius, and shadow treatment; it must not silently enlarge controls, fonts, gutters, or content padding. Treat density and responsive adaptation as independent settings that behave consistently in every theme.

Use natural document flow and explicit overflow ownership. Preserve readable text and accessible controls at narrow widths. A wide table may scroll within its own region; avoid making the entire page overflow to compensate for a fixed-width child. Verify sticky and pinned elements against the actual scroll container, including nested surfaces.

## Preserve functional state

Make links and actions navigate or perform their stated operation. Wire filters, selection, sorting, editing, loading, empty, error, and retry states to one source of truth. Changing theme, viewport, or panel visibility must not reset drafts or unrelated selection. Give missing records a useful recovery route.

Keep menus, dialogs, sheets, and composite controls on the shared Base UI-backed components. Apply the theme at the document or appropriate portal root so portaled content follows the same presentation. Verify nested overlay dismissal and focus return; do not replace native behavior with visual-only layers.

Use keyboard-only focus styling with `:focus-visible`, while retaining names, landmarks, logical Tab order, and explicit focus handoffs after navigation or removal. Do not hide focused content when a responsive panel changes mode.

## Verify the composition

Exercise the main task at desktop and narrow mobile widths in Fundamental/light, Fundamental/dark, Fundamental Floating/light, and Fundamental Floating/dark. Compare geometry and typography across those modes. Check keyboard navigation, focus visibility, overlay behavior, scrolling, long labels, loading/error/empty content, and state preservation through theme changes.

Add a focused pattern story or application example that demonstrates the real interaction. Keep illustrative data clearly local and do not imply backend capabilities that are absent. Run relevant type, lint, interaction, and accessibility checks; broaden testing only when the composition exposes a new risk. Update the pattern guidance and coordinate generated documentation after source changes are stable.
