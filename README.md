# Aegis

[Application Demo](https://dimitriszoitas.github.io/aegis-ui/?path=/story/console-application-demo--demo) · [Component reference](https://dimitriszoitas.github.io/aegis-ui/) · [DataGrid presentation](https://dimitriszoitas.github.io/aegis-ui/?path=/story/components-data-datagrid--full-presentation)

Aegis is a token-based React design system for applications, dashboards, developer tools, and data-rich interfaces. It includes reusable controls, data display, navigation, overlays, and reviewable AI interactions. Choose **Fundamental** (the default) or **Fundamental Floating**, independently of light or dark color.

Storybook is the component reference and consumption guide. The primary application example is a connected business workspace for projects, customers, invoices, team profiles, activity, and Aegis AI. The repository also includes a website and searchable component catalogue. The reusable design system is packaged as `@dimitriszoitas/aegis-ui@0.1.0`, with ESM modules, TypeScript declarations, compiled styles, and direct component entry points. This release can be installed from a package archive; it has not been published to the npm registry.

## Explore the system

Start with **Foundations → Principles**, then browse components and reusable patterns. The library includes:

- Forms, menus, navigation, dialogs, sheets, notifications, and responsive layout primitives.
- Data grids with sorting and multi-sort, constrained column resizing, visibility settings, three densities, selection, bulk actions, expansion, and virtual scrolling.
- Toolbar or side-panel filters, time ranges, and removable summaries of applied filter groups.
- Charts, compact activity bars, metrics, activity timelines, and a Gantt timeline with day/week/month scales, progress, milestones, dependencies, and an accessible schedule table.
- File upload, segmented controls, description lists, copyable fields, links, and split buttons.
- Page headers, unsaved-change controls, notification centers, and onboarding checklists.
- Structured data viewers, code editing, and comparison.
- Assistants with attached context, streaming, stop, retry, regenerate, feedback, and reference navigation.
- Wizards with separate progress and form content, horizontal and vertical layouts, validation, and explicit approval.

For a complete table demonstration, open **Components → Data Display → DataGrid → Full presentation**. It combines filters, search, density and column controls, sorting and resizing, selection and bulk changes, record expansion, editable details, and AI summaries. Presentation controls switch between toolbar/sidebar filters, 150 and 1,000 records, pagination and virtual scrolling, and loading, empty, or retryable error states. Selecting rows replaces the search and table-controls row with bulk actions; clearing selection restores the unchanged search. Header indicators show sorting direction and multi-sort priority without an extra summary row. A trailing Actions column stays compact and pinned to the right by default; the last visible data column before it fills any spare width.

### Component documentation

Each of the 103 registered families starts with **Overview**, followed by **Component Guidelines** and **Tokens Used**. The ten guideline pages are Anatomy, Types, Variants, Intent & Emphasis, States, Sizes, Usage & Content, Accessibility, API & Props, and Use cases/In Context. Anatomy uses one or two populated component examples with numbered, keyboard-accessible callouts and matching part descriptions. Tokens Used has no canvas. It groups property bindings into separate color, border, text, icon, sizing, spacing, typography, radius, elevation, opacity, motion, and layout tables, with resolved values for all four theme and mode combinations. Variant selectors and source locations remain inspectable.

Token pages inspect the rendered example in all four theme/mode combinations and include source declarations for inactive variants and states. API tables come from public TypeScript definitions. Authored guidance explains component-specific usage and integration responsibilities.

Run `npm run docs:generate` after source changes and `npm run docs:check` to verify metadata and page coverage. Add `-- --storybook-url http://127.0.0.1:6006` to the check to verify live story links.

### Business application example

**Console → Application Demo** brings the components together in a business workspace. Move between Overview, Projects, Customers, Invoices, Team profiles, Activity, and Settings. Connected records provide context across lists and detail views, while Aegis AI keeps assistance alongside the work. The same example runs at `?view=console` in the standalone application.

Use this sample as a starting point for application composition: navigation, searchable tables, contextual details, editable forms, selection, feedback, and appearance settings. The data and actions are local demonstrations; connect host-owned APIs and persistence for a production application.

All demonstration records are synthetic. Sample edits live in memory and reset on reload; appearance preferences are stored separately. AI responses run locally without API keys or model requests.

## Install the React package

The package requires React 19 and ReactDOM 19. Install the archive produced by `npm pack`:

```sh
npm install /path/to/dimitriszoitas-aegis-ui-0.1.0.tgz react@^19 react-dom@^19
```

The archive contains the design system, not the marketing website or the standalone console. Runtime dependencies are declared in the package; React and ReactDOM are peer dependencies. It is ESM-only. No Tailwind installation or plugin is required in the consuming application.

Import the compiled component stylesheet once at your application's entry point. JavaScript imports do not automatically load CSS. The reset is optional and belongs **before** the component stylesheet; fonts are also optional:

```tsx
import '@dimitriszoitas/aegis-ui/reset.css'; // Optional application-wide baseline
import '@dimitriszoitas/aegis-ui/styles.css'; // Styles and tokens for the supplied visual language
import '@dimitriszoitas/aegis-ui/fonts.css'; // Optional self-hosted Figtree and JetBrains Mono
```

Omit `reset.css` to retain your application's baseline. If you omit `fonts.css`, load your own fonts or override `--font-ui` and `--font-mono`. `tokens.css` is available separately for token-only integrations; it is already included in `styles.css`.

```tsx
'use client';

import { useState } from 'react';
import { Button, Field, TextInput } from '@dimitriszoitas/aegis-ui';
import { Check } from '@dimitriszoitas/aegis-ui/icons';

export function ProfileForm() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <Field label="Display name" helpText="Use your display name.">
        <TextInput
          value={name}
          onValueChange={(value) => {
            setName(value);
            setSaved(false);
          }}
        />
      </Field>
      <Button
        type="submit"
        intent="function"
        leadingIcon={<Check size={16} />}
        disabled={!name.trim()}
      >
        {saved ? 'Saved locally' : 'Save name'}
      </Button>
    </form>
  );
}
```

Use a client boundary for interactive components in frameworks with React Server Components. The package does not claim universal SSR or RSC compatibility; verify the components you render on the server in your host framework. The example above keeps its state locally and does not persist a record.

### Public imports

| Import path                           | API                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dimitriszoitas/aegis-ui`            | Components, prop types, and commonly used TanStack table types.                                                                                 |
| `@dimitriszoitas/aegis-ui/button`     | A direct component entry; other component folders have corresponding entries such as `/data-grid` and `/modal`.                                 |
| `@dimitriszoitas/aegis-ui/icons`      | Semantic Hugeicons components and `IconProps`; icons are separate from the root exports.                                                        |
| `@dimitriszoitas/aegis-ui/aws-logo`   | Optional AWS logo component, catalog, typed names, and bundled SVG URLs.                                                                        |
| `@dimitriszoitas/aegis-ui/theme`      | `useTheme`, `useLayoutTheme`, `useAutoHideScrollbars`, and imperative theme helpers.                                                            |
| `@dimitriszoitas/aegis-ui/patterns`   | Reusable assistant, filters, AI diff review, prompt input, and wizard patterns. Direct entries such as `/patterns/ai-panel` are also available. |
| `@dimitriszoitas/aegis-ui/types`      | Shared record, owner, workflow, and chart types; no fixture records.                                                                            |
| `@dimitriszoitas/aegis-ui/ai`         | AI context/message/request types, stream contracts, and the explicitly local `streamMockResponse` helper.                                       |
| `@dimitriszoitas/aegis-ui/filters`    | Shared filter types, reducer, filtering, facets, and histogram helpers.                                                                         |
| `@dimitriszoitas/aegis-ui/time-range` | Time-range types, presets, resolution, and formatting.                                                                                          |
| `@dimitriszoitas/aegis-ui/utils`      | The `cn` class-name helper.                                                                                                                     |

Patterns expose controlled APIs and callbacks so the host application owns data, navigation, and persistence. `AiPanel` accepts a `streamResponse` adapter and defaults to the local mock. The complete sample application and other fixture-backed demonstrations are repository examples, not package exports. The reusable `Wizard` is included. Website code, stories, fixture data, and the Untitled UI gallery are excluded.

### Build and verify an archive

After installing this repository's dependencies:

```sh
npm run build:package
npm pack
npm run test:package
```

`build:package` writes library modules, declarations, styles, fonts, and assets to `lib-dist/`. `npm pack` runs the `prepack` build again and creates `dimitriszoitas-aegis-ui-0.1.0.tgz`. `test:package` installs a tarball into a fresh temporary consumer and checks its types, production build, and selected browser interactions. It needs Chromium; install it with `pnpm exec playwright install chromium` if necessary. Pass an existing archive with `npm run test:package -- --tarball /absolute/path/to/dimitriszoitas-aegis-ui-0.1.0.tgz`.

Registry publication is a separate release step requiring npm authentication and permission to publish under `@dimitriszoitas`. Neither building nor packing publishes the package.

## Run locally

Use Node.js 24, matching the deployment workflow. The checkout was verified on Node.js 24.1.0; the complete toolchain also supports Node.js 22.13 or later in the 22.x line. The package manager is pinned to `pnpm@11.19.0` in `package.json`.

```sh
pnpm install
pnpm storybook
```

Open [local Storybook](http://localhost:6006). Separate toolbar choices control light/dark color and the Fundamental or Fundamental Floating theme. Fundamental is the default. The business application exposes the same choices in Settings → Appearance. To run the website and standalone sample:

```sh
pnpm dev
```

Use the local URL printed by Vite. The root opens the marketing website, with interactive component examples and a live token demonstration. Open `?view=components` for the complete catalogue, with searchable previews, categories, light/dark themes, and detail panels with usage code, anatomy, and variants. Deep links support `component=button` or a category such as `category=charts`. Add `?view=console` to open the business application. No environment variables, credentials, or external services are required.

Application stories use the available width up to 2160px, then stay centered on wider displays. Narrow previews use the responsive navigation and content layout; Storybook's 1600px viewport preset remains available as an optional preview size.

## Design principles

**Two themes, one visual system.** Fundamental is the default, with full-height navigation and workspace panels. Fundamental Floating places navigation and assistant panels in rounded containers with exterior insets. Both use the same palette, typography, controls, data density, and interaction behavior. Light/dark color is a separate choice, giving four combinations. Switching presentation preserves application state.

**Quiet surfaces and clear actions.** Both themes use neutral surfaces, borderless cards, and subtle horizontal table dividers. Form controls retain their own fill and boundary. Transient overlays use a distinct surface and soft shadows; modal tasks add a backdrop. Ordinary actions use blue, AI actions use a contrasting lime-to-blue-to-purple gradient, and red, green, amber, and cyan communicate semantic state. Figtree carries interface text; JetBrains Mono distinguishes code and identifiers.

`SideNav` can collapse to an icon rail while keeping Settings and the user profile at the bottom. `brandName` and `brandIcon` customize its identity; `brandIcon={null}` omits the mark. Subtle horizontal dividers separate navigation groups without visible group headings. Fundamental Floating contains the navigation in an inset rounded surface while preserving the same controls and content.

**Corners stay compact.** Small, medium, and large controls are 28/34/40px high, with 5/6/6px corner radii. Cards use 8px corners, nested surfaces use 6px, and chips and checkboxes use 4px. Status indicators retain their component-specific shape. Floating navigation and assistant containers use the shared chrome geometry without changing interior control tokens. Line and dot separators each offer normal and light emphasis.

**Overflow stays usable.** Pages, tables, editors, and panels share slim, theme-aware native scrollbars. Thumbs appear while scrolling or using keyboard focus and hide again after activity stops, without changing the gutter. Hover and drag make them more prominent. Keyboard, wheel, and touch scrolling stay native; forced-colors mode keeps system styling.

**Hierarchy stays clear.** Accordion bodies, navigation children, tree levels, JSON branches, and expanded table content use a shared 12px inset.

**Color has a purpose.** Function blue identifies actions. Lime-to-blue-to-purple gradients identify AI assistance and provenance in both themes. Generic tags have transparent backgrounds with semantic outlines and optional dots. Labeled severity badges use text and an outline; their explicit compact variant keeps a colored dot. Status indicators pair a readable label with their state treatment. Destructive, success, and warning colors are separate from the five-level severity scale. Labels and icons preserve meaning without color.

**Density preserves access.** Grid rows are 36px compact, 48px default, and 60px comfortable. Long record titles stay on one line with full-text tooltips and accessible row labels. Compact metadata fits the row height. Density preserves available actions.

Use compact sticky page controls when long pages need persistent navigation or actions.

**AI remains reviewable.** Generated output has a visible label and provenance. Each turn snapshots its supplied context; stopping preserves partial output, and regenerating uses that original snapshot. Late output from superseded requests is ignored. Consequential changes require explicit approval; the local mock performs no external actions.

## Tokens and themes

The token system has three strict tiers:

1. **Primitive:** exact raw values, including 21 color palettes, dimensions, opacity and motion.
2. **Semantic:** shared roles referencing primitives, with four explicit mappings for Fundamental and Fundamental Floating in light and dark.
3. **Group:** sidebar-category roles referencing semantics. Every component or pattern consumes only its own category namespace for its own properties.

[`tokens/design-tokens.json`](tokens/design-tokens.json) is the authoritative graph. `npm run tokens:generate` produces [`design-tokens.css`](src/styles/design-tokens.css) and the runtime group aliases. Semantic sizing, spacing and font metrics stay identical across all four configurations. Theme changes affect styling such as color, radius and elevation. Semantic ramps use `xxxs` through `xxxxl`; descriptive group ramps are relative to their owner. For example, a Trigger button’s snug spacing can be 4px while a Surface container’s snug spacing is 16px.

[`tokens/component-categories.json`](tokens/component-categories.json) maps source folders to sidebar categories. All **Triggers** components, including Button, Link, DropdownMenu and ContextMenu, use `--group-trigger-*` for their own CSS, inline styles and numeric defaults. A real nested child keeps its own category: a Button inside a Card still uses Trigger tokens while the Card uses Surface tokens. Importing a shared helper or registry does not make it a nested component. Tokens Used separates owned bindings from nested component bindings and reports actual category mismatches rather than hiding them.

[`component-design-tokens.ts`](src/lib/component-design-tokens.ts) bridges CSS aliases to numeric chart, grid, overlay and icon APIs. Tests verify its server defaults equal the resolved canonical mappings. Explicit component props and measured geometry remain runtime inputs. Older variable names remain compatibility exports for existing documentation and integrations; they are not additional canonical tiers and runtime components do not consume them directly.

Run `npm run tokens:check` to validate adjacent-tier references, complete theme mappings, invariant dimensions, consumer bindings and fixed-value coverage. The audit covers runtime components, patterns and supported shared styles. Actual measurements, data values, intrinsic SVG geometry and media-query syntax are bounded structural exceptions. Marketing artwork, story compositions and archived review themes are outside this runtime audit.

Repository workflows live in [`skills/create-component`](skills/create-component/SKILL.md), [`skills/create-token`](skills/create-token/SKILL.md), and [`skills/create-layout`](skills/create-layout/SKILL.md). Storybook renders these same files under **Agentic Skills**, immediately after AI Guidelines. The machine-readable graph is also exported as `@dimitriszoitas/aegis-ui/token-manifest.json`.

Color is reflected by `.dark` and `data-theme` on `<html>`. [`useTheme`](src/lib/theme.ts) supports `light`, `dark`, and `system`, follows system changes, and persists explicit preferences when storage is available. The independent presentation uses `data-layout-theme="fundamental"` or `data-layout-theme="fundamental-floating"`; [`applyLayoutTheme`](src/lib/layout-theme.ts) applies it to the document so portaled sheets and menus receive the same treatment. Fundamental is the default. Storybook's color and theme controls preview all four combinations without persisting a standalone preference.

In a consuming application, use package imports:

```tsx
import '@dimitriszoitas/aegis-ui/styles.css';
import { Button } from '@dimitriszoitas/aegis-ui';
import { Sparkles } from '@dimitriszoitas/aegis-ui/icons';

export function ExplainAction({ onExplain }: { onExplain: () => void }) {
  return (
    <Button intent="ai" leadingIcon={<Sparkles size={16} />} onClick={onExplain}>
      Explain this record
    </Button>
  );
}
```

For source-level development in this repository, the `@/` alias resolves to `src/`; it is not needed by package consumers. Each component folder exports its public components and prop types. Use Storybook's component docs for individual APIs. For example, `DataGrid` consumes typed rows and columns, while `AiPanel` accepts a keyed request, attached context, and a reference callback.

`MiniBarChart`, available from `/mini-bar-chart` or the root export, provides compact zero-based activity bars with the same data, semantic intents, and accessible labeling as `Sparkline`. Use `sparklineVariant="bar"` in `MetricCard` to use it beside a metric. Storybook includes standalone, intent, metric-card, table-cell, and loading/empty examples.

`Notification`, available from `/notification` or the root export, unifies inline messages and floating notifications. The default `variant="inline"` has a transparent background and semantic border; `variant="floating"` uses a surface suitable for overlays. Both accept intent, title, description, actions, and dismissal. Mount `NotificationViewport` once and call `showNotification` for timed floating messages; `dismissNotification` dismisses them programmatically. Existing `Banner`, `Callout`, `Toast`, `Toaster`, and `showToast` imports remain compatible adapters. Storybook presents both variants under **Components → Feedback → Notification**.

Mount the theme hooks in your application shell to follow preferences and keep portaled overlays in sync:

```tsx
'use client';

import { Button } from '@dimitriszoitas/aegis-ui';
import {
  useTheme,
  useLayoutTheme,
  useAutoHideScrollbars,
  layoutThemeOptions,
} from '@dimitriszoitas/aegis-ui/theme';

export function AppearanceControls() {
  const { theme, toggleTheme } = useTheme();
  const { layoutTheme, setLayoutTheme } = useLayoutTheme();
  useAutoHideScrollbars();

  return (
    <>
      <Button onClick={toggleTheme}>Color: {theme}</Button>
      <div role="group" aria-label="Theme">
        {layoutThemeOptions.map(({ value, label }) => (
          <Button
            key={value}
            aria-pressed={layoutTheme === value}
            emphasis={layoutTheme === value ? 'primary' : 'tertiary'}
            onClick={() => setLayoutTheme(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </>
  );
}
```

Theme helpers apply `.dark`, `data-theme`, and `data-layout-theme` to `<html>` so menus, dialogs, and sheets portaled outside your app root receive the same tokens. `useAutoHideScrollbars` enables the optional activity-based scrollbar behavior for that document. Imperative `applyTheme` and `applyLayoutTheme` accept `{ persist: false }` for temporary previews. `layoutThemeOptions`, `layoutThemeLabels`, and `isLayoutTheme` share the supported values across controls and integrations. Existing `layoutTheme` prop names, `data-layout-theme`, and the `aegis-layout-theme` storage key remain compatible.

## Component refinements

Buttons have four emphasis levels: `primary` (filled), `secondary` (outline), `tertiary` (soft), and `ghost` (text). Icon-side padding is optically balanced; loading keeps the same footprint. `CountBadge` and `Tooltip` accept `variant="inverted"` in either color theme. Tooltip arrows use a continuous outline without an interior seam.

`Popover` supports optional headers and footers with `density="regular" | "tight"` and no internal dividers. `Modal` uses header/footer dividers and `size="small" | "regular" | "large"`. `SideSheet` aligns its title and close button, with optional `headerActions` and `footer` content. These surfaces keep header and footer actions outside the scrolling body.

`BottomSheet` belongs inside a bounded flex-column workspace; `.aegis-bottom-sheet-workspace` provides that layout. It fills its parent's width, preserves space for content above, and supports controlled height, minimum/maximum bounds, header actions, and a footer. `ExpandableText` clamps long text to a configurable number of lines and exposes customizable disclosure labels only when needed.

The interface uses Hugeicons through the package's `/icons` entry (`@/components/icon` inside this repository). **Foundations → Icons** includes the searchable Hugeicons catalog with sizes, stroke weights, and copyable imports. Local development additionally exposes the installed Untitled UI reference catalog. Figtree is the UI typeface; JetBrains Mono is used for code. The full icon catalogs are isolated from the console bundle, and the Untitled UI gallery is excluded from the installable package. Bundled fonts and AWS artwork retain the notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Third-party icon packs and logos retain their own licenses. Untitled UI's bundled license restricts redistribution. Production Storybook builds replace that pack with an empty module, hide its selector, and reject any build that still contains its package modules; the complete catalog remains available only in local development. See the [Untitled UI license](https://www.untitledui.com/license). Hugeicons' free pack is MIT licensed. AWS assets remain AWS-owned marks with source attribution in the logo catalog. The optional `AwsLogo` package entry remains available for applications that need the original artwork.

## Keyboard behavior

| Surface                  | Interaction                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Menus, selects, and tabs | Arrow navigation; Escape dismisses overlays; Tab leaves menus.                                                         |
| Trees and JSON           | Arrow keys traverse visible nodes; Left/Right collapse and expand. JSON supports copy value and path actions.          |
| Data grid                | Up/Down move row focus; Enter opens a row; Shift-click adds a sort; focused resize handles support arrow keys.         |
| Dialogs and sheets       | Modal focus stays inside the overlay and returns on close. Docked panels keep the workspace accessible.                |
| Bottom sheet             | Drag the top edge, or focus it and use Up/Down, Shift for larger steps, Home/End for limits, Escape to close.          |
| Assistant composer       | Enter sends; Shift+Enter inserts a newline; `/` opens commands; Stop preserves the current response.                   |
| Code editor              | Tab and Shift+Tab leave the editor rather than trapping focus.                                                         |
| Wizard                   | Arrow navigation follows the stepper orientation; completed steps can be revisited; validation gates forward progress. |

Text and select fields keep their normal border on focus without an added outline or color change; hover and validation styling remain intact. Buttons, options, trees, and grids retain their own keyboard focus cues. Reduced-motion preferences suppress decorative animation, including loading shimmer and AI streaming effects.

## Development and verification

| Command                 | Purpose                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm dev`              | Run the website and business application.                                                                   |
| `pnpm build`            | Type-check and build the website and business application into `dist/`.                                     |
| `pnpm preview`          | Preview the production website and application build.                                                       |
| `pnpm storybook`        | Run Storybook on port 6006.                                                                                 |
| `pnpm build-storybook`  | Build documentation into `storybook-static/`.                                                               |
| `npm run build:package` | Build the reusable ESM package and declarations into `lib-dist/`.                                           |
| `npm pack`              | Rebuild and create the installable package archive without publishing.                                      |
| `npm run test:package`  | Verify a tarball in an isolated React consumer.                                                             |
| `pnpm typecheck`        | Check strict TypeScript types.                                                                              |
| `pnpm lint`             | Run ESLint and the raw-hex color guard.                                                                     |
| `pnpm test`             | Run focused Vitest tests for component logic, filters, time ranges, and table helpers.                      |
| `pnpm test:stories`     | Run every story and its play function in light/dark Chromium, collecting browser errors and axe violations. |
| `pnpm check`            | Run types, lint, logic tests, and the Storybook build.                                                      |
| `pnpm format`           | Format the repository with Prettier.                                                                        |

Browser checks require Chromium and a running Storybook:

```sh
pnpm exec playwright install chromium
pnpm storybook
# In a second terminal:
pnpm test:stories
```

`STORYBOOK_URL` selects another running Storybook, and `STORY_FILTER` limits stories by ID using a regular expression. `CAPTURE_STORIES=1` also saves screenshots. Results go into ignored `test-results/`. The story sweep covers rendered story states and their play interactions; foundation MDX pages and additional keyboard workflows are reviewed separately. These checks support accessibility review and do not replace it.

When adding a component, export its typed API, use only its sidebar category’s group tokens for its own properties, add a colocated story matrix and focused interaction states, and verify both themes. Use realistic application content. Keep raw color values in the token source files.

## Repository map

```text
.storybook/                 Preview, themes, docs, and accessibility configuration
src/styles/                 Generated tokens and compatibility styles
src/components/             Reusable controls, surfaces, data display, and AI components
src/patterns/               Reusable workflows, assistant, details, and sample applications
src/sample-data/            Typed fixtures for business component demonstrations
src/stories/foundations/    Token specimens and design guidelines
src/lib/                   State helpers, theme utilities, and local AI protocol
src/package/               Library style and public API entry points
scripts/                   Package build/consumer checks, token guard, and story verification
```

The implementation uses React, TypeScript, Vite, Tailwind v4, Base UI headless primitives, TanStack Table and Virtual, CodeMirror 6, Recharts, react-day-picker, react-resizable-panels, and Sonner. Fonts are bundled locally; no external font CDN is needed.

## Roadmap

- Publish the verified package to the npm registry after authentication and namespace access are established.
- Add maintained visual-regression baselines alongside the existing themed story and interaction checks.
- Connect host-owned data and AI adapters while preserving controlled APIs, reference provenance, cancellation, and explicit approval.

Aegis code is licensed under the [MIT license](LICENSE). Third-party fonts, icons, and logos retain their respective licenses.

## Component discovery and headless composition

Storybook groups components by purpose: Triggers, Inputs & Selection, Navigation, Surfaces, Layout, Data Display, Data Visualization, Code, Feedback, and AI. Patterns group coordinated behavior into Filtering, Page Structure, Workflows, Communication, and AI Assistance. Every family retains its Overview, Component Guidelines, and Tokens Used sections. The Component Directory searches familiar aliases such as chips, textfield, drawer, and toast. Aliases help discovery; they are not additional exports.

Use `@dimitriszoitas/aegis-ui/primitives` for unstyled Base UI parts. This entry imports no design-system CSS, tokens, fixtures, routing, or application state. It exposes Base UI composition, controlled state, and accessibility APIs. Use the existing component entries and `styles.css` when you want the Fundamental visual language. Light/dark and Fundamental/Fundamental Floating remain independent presentation choices. Native React controls remain native where no interaction primitive is needed.

The documentation host serves `llms.txt`, `ai/index.json`, a versioned schema, compact per-component contracts, and a shared token declaration graph. These are generated from current source metadata and authored guidance. They list exact imports, supported props, variants, aliases, source links, and token references. Source extraction is distinct from runtime accessibility or visual evidence. Run `npm run docs:generate` after API changes and `npm run docs:check` to detect stale output.
