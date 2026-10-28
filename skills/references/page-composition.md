# Constructing a page

Read this when choosing page structure or reviewing a composed screen. The [design contract](design-contract.md) owns tokens and behavior boundaries; the [product policy](pattern-policy.md) records choices shared within one product. Neither replaces the user's task.

## Make decisions at the appropriate scope

| Layer               | Authority                          | Example                                                                       |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Design language     | Approved profile and token graph   | Typography, surfaces, semantic color, spacing and elevation                   |
| Page archetype      | Registered recipe and public API   | Collection, detail, settings or dashboard structure                           |
| Product conventions | Versioned project pattern policy   | Chosen header, filter arrangement, search width, action placement and density |
| Page content        | Task and data                      | Columns, labels, contextual actions, empty/error explanations                 |
| Evidence            | Checks plus explicit design review | Import/prop compliance, rendered geometry, workflows and appropriateness      |

Resolve decisions in that order. Existing product conventions remain the default for the same purpose. A new product may choose different conventions. An intentional exception names its page, affected rule and reason; it is not a blanket permission to bypass the system.

## Select an archetype from the task

The experimental `page-layout` contract provides four initial recipes. Discover its current import path and version in the installed registry before use.

- **Collection:** Find, compare and act on records. Use a shared header, optional shared filters, full-width results, and collection-owned display/pagination controls. Tables own horizontal scrolling. Empty results distinguish an empty collection from active filters that match nothing.
- **Detail:** Understand or work on one entity. Put primary information first. Add one supporting region only when its content helps the primary task; preserve that reading order when columns stack. Use `ReadingColumn` for prose inside the main region while allowing tables and editors their own width.
- **Settings:** Change configuration deliberately. Use one readable main column, grouped fields, descriptions and explicit validation. Record whether changes save immediately or require Save/Cancel, how unsaved navigation behaves, and how confirmation works for consequential actions.
- **Dashboard:** Scan a summary and decide what to investigate. Use an adaptive content grid with a declared maximum column count and minimum useful item width. Metrics need a name, value, period/context and an appropriate destination when interactive. A trend must remain inside its card beside a long value or move to its own row.

These are initial reusable patterns, not an exhaustive classification of every possible interface. A workspace editor, wizard or split-view inbox may need a different recipe. Follow capability discovery and the extension workflow when the interaction model does not fit.

## State hard rules, defaults and judgments separately

**Hard rules** have an observable failure: reuse the selected header; keep the page title unique; use the declared filter application behavior; preserve drafts through a mode change; keep page content inside its available width; give overlays names and restore focus.

**Defaults** establish a starting composition: a detail page uses primary content plus at most one supporting column; a dashboard starts with a bounded adaptive grid; settings use a comfortable reading measure. Projects choose supported variants, then reuse those decisions consistently. Hardcoding two columns for every page would prevent legitimate dashboard and collection layouts.

**Design judgments** explain why the structure serves the task: the primary action is appropriate, related information belongs together, the secondary panel earns its space, and visual hierarchy reflects importance. Static validation cannot establish these judgments.

## Reading width and responsive structure

`ReadingColumn` exposes compact, comfortable and wide measures (55ch, 65ch and 75ch in the initial recipe). These are project-selectable defaults, not universal optimal values. `ch` uses the font's zero-glyph advance as a width unit; it is not a limit on text length or a guarantee of exactly that many characters per line. Review actual typography and languages used by the product.

Constrain paragraphs and forms intentionally. Do not apply a prose measure to an entire page containing data grids, charts or editors. Prefer the named measure over local CSS widths so related screens share the decision.

Column count is a maximum, not a requirement to squeeze content into columns. `ContentGrid` combines the selected cap with a minimum item width and available container space. Detail supporting content follows the main content when space is insufficient. Mode and presentation do not change reading measure, spacing, or column rules. Responsive adaptation and density are independent choices.

## Compose shared implementations

Use the registered `PageLayout`, `PageHeader`, `ReadingColumn`, `ContentGrid`, and applicable product wrappers. The page layout owns its outer structure; nested controls keep their own token ownership. Avoid redefining shared pattern internals in page CSS.

Before implementing repeated pages, record:

1. The task, archetype and primary action.
2. Shared implementations and selected variants, including density and reading measure.
3. Header/actions/filter placement and data-state ownership.
4. Loading, empty, error, success and permission behavior that the application actually supports.
5. Responsive reading order, overflow ownership and overlay/focus behavior.
6. How the decisions will be checked, and which judgments remain for visual review.

A local demo should use real local interactions and say where data is illustrative. Do not invent a backend, permission system or persistence guarantee to fill this record.

## Verify the result at three levels

- **Source checks:** The portable pattern checker can verify declared imports, literal choices, constrained props, local forbidden tags and the supported literal route inventory. Its report states what it cannot infer. Types catch incompatible recipe props.
- **Browser checks:** Compare related pages in light/dark and both presentations, at wide and narrow containers. Measure header/search alignment, reading width, column count and overflow. Exercise long content, filters, empty states, keyboard navigation, overlays and state preservation. Keep data tables wide inside their own scroll regions.
- **Visual and task review:** Inspect grouping, hierarchy, action priority, reading order and useful density. Screenshots are evidence until a reviewer explicitly accepts them as regression baselines.

A failure should improve the shared implementation or the missing acceptance rule. Do not relax a policy or baseline simply to make an unintended variation pass. When the user changes the intended behavior, update the chosen recipe, project record, consumers and checks together.
