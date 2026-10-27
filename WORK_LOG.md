# Current implementation baseline

Aegis is a reusable React design system with a connected business application as its primary example. This file records the current capabilities and verification process rather than historical implementation phases.

## Application example

- Storybook entry: **Console → Application Demo** (`?path=/story/console-application-demo--demo`).
- Standalone entry: `?view=console`.
- Workspace areas: Overview, Projects, Customers, Invoices, Team profiles, Activity, and Settings.
- Related sample records connect lists and details. Demonstration edits remain local; production data, authorization, and persistence belong to the host application.
- Aegis AI uses visible context, reviewable output, streaming controls, and explicit user decisions. Local responses need no API keys and perform no external actions.

## Shared visual system

- Fundamental is the default; Fundamental Floating adds rounded, inset navigation and assistant containers.
- Both presentations support light and dark and share typography, semantic colors, component geometry, and behavior.
- Figtree is the interface font; JetBrains Mono distinguishes code and identifiers.
- Semantic tokens separate canvas, card, field, overlay, text, border, intent, and data roles. Ordinary containers remain quiet; overlays have dedicated elevation.
- Theme preferences migrate legacy stored values to one of the two supported presentations. Theme changes preserve local interaction state, and portaled content follows the document theme.

## Component capabilities

- Typed forms, selection controls, menus, navigation, tabs, accordions, notifications, dialogs, sheets, and resizable panels.
- Data grids with sorting, column sizing and visibility, density, pagination or virtualization, selection, bulk actions, and expandable details.
- Metrics, charts, small activity bars, activity and Gantt timelines, structured-data views, editors, and diffs.
- File upload, segmented controls, description lists, copyable fields, links, split buttons, page headers, master/detail, unsaved changes, notification centers, and onboarding checklists.
- Assistants, prompts, AI output and feedback, inline suggestions, guarded review, and multi-step workflows.
- A searchable component catalogue and Storybook specimens document usage, anatomy, variants, keyboard behavior, and themes. All 104 registered families include Tokens Used and eleven guideline pages, totaling 1,248 dedicated documentation pages.
- Token inspection resolves rendered examples in all four presentation/color combinations. Generated source inventories cover inactive declarations and public API properties; authored guidance supplies usage and integration notes.
- Package entry points expose general-purpose components and reusable record workflows; the full application and fixture data are not bundled as public component exports.

## Package and publication

- The React 19 ESM archive includes typed exports, direct component entries, compiled CSS, optional reset/fonts, and attributed assets.
- Package consumers do not need repository aliases or a Tailwind plugin.
- Production builds exclude the locally installed restricted reference icon pack and reject accidental redistribution. Third-party font, icon, and artwork licenses remain documented.
- Building or packing an archive does not publish it to a registry.

## Verification

Run the current checkout checks before release:

- `pnpm typecheck`, `pnpm lint`, and `pnpm test` for source and logic.
- `pnpm build`, `pnpm build-storybook`, and `npm run build:package` for distributable artifacts.
- `npm run test:package` for an isolated consumer of the packed archive.
- `pnpm storybook` starts the local reference on port 6006.
- `STORYBOOK_URL=http://127.0.0.1:6007 pnpm test:stories` checks a separately served static build.
- `STORY_FILTER` bounds browser checks by story ID; `CAPTURE_STORIES=1` saves proofs under ignored `test-results/`.

Review both presentations in both colors, keyboard focus and restoration, dialogs and portals, responsive overflow, form validation, selected-record actions, state preservation, and reduced motion. Automated accessibility scans supplement manual review; they do not establish universal compliance. Final application integration and release checks must be run on the final source snapshot.

## Publication account guard

Before GitHub operations, run both `gh auth status` and `gh api user -q .login`. The account must be exactly `dimitriszoitas`. Do not create or push under another account. The requested public repository is `dimitriszoitas/aegis-ui`; deployment is GitHub Pages, with no npm publishing.

## Baseline verification, 25 October 2026

The clean publication snapshot passes TypeScript, lint and semantic-token checks, 43 unit tests, application and package builds, and the Storybook build. The packed package passes an isolated consumer installation, type check, production build, browser interactions, and accessibility scan.

The full Storybook sweep covered 436 examples in light and dark. Its seven findings were resolved and rechecked on the final static build. Two new regression stories cover narrow master/detail composition and long Gantt owner names. Final targeted checks also cover the expanded Gantt sizing and keyboard interactions. Desktop/mobile application checks confirm filters, selections, detail navigation, theme changes, and settings preserve state.

Documentation consistency checks cover all 104 families, 1,248 pages, and 432 example links. The 65-case documentation review and six-case final static check pass after contrast, scrolling, focus, and narrow-layout corrections.
