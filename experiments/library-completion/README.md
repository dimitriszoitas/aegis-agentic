# Library completion — 0.7

This milestone implements the 17 families in [scope.json](scope.json) and closes authored coverage for every existing API family. The original classic Aegis checkout is kept separate.

## Scope and ownership

- Inputs: Combobox, OtpInput, TimePicker, DateTimePicker, PhoneInput, ColorPicker.
- Editing and content: InlineEdit, RichTextEditor, SortableList, FilePreview.
- Indicators: Indicator and PresenceIndicator; existing badge/count/status families retain their APIs.
- Application patterns: FormErrorSummary, ResourceState, RecordEditor, AppShell, UnsavedNavigationGuard.
- Coverage: 124/124 API families mapped, 127 authored contracts, three authored-only entries, two service protocols, and explicit public-entry classifications.

The component layer handles interaction and presentation. The host owns data transport, authentication, authorization, durable state, conflict policy, telemetry consent and model/service execution. Native time controls vary by browser. Phone validation uses numbering metadata. Rich text is a bounded editor schema; file preview supports raster images with other-file fallback. Navigation guarding requires explicit host router integration.

## Reproducible checks

`npm run check`, `npm run build-storybook`, `npm run library-completion:source`, `npm run library-completion:browser` and `npm run library-completion:package` cover complementary boundaries. The package check uses the actual npm tarball with locally available third-party dependencies; it does not certify a fresh remote-registry install. Coverage checks enforce authored ownership without treating written requirements as passing runtime evidence.

A separate primary-button reproduction showed that the initial contrast warning occurred while theme colors were transitioning. Settled colors passed full axe in light and dark. Source browser audits now wait for finite animations before color evaluation; no shared color mapping was changed for that transient finding.

The final [verification snapshot](verification.json) records 429 unit tests, 13 MCP integration groups, 109 infrastructure tests, 19 source-browser workflow groups and 24 source accessibility scans. The built Storybook passes 213 checks, 43 confirmed interaction plays and 179 accessibility scans across the 17 additions. All 17 packed public entries pass strict types, export identity, SSR, production bundling, styles and installed contract checks. Earlier forms, contract catalogue, guidance, product and page-layout regressions also pass.

The snapshot retains full reports and source hashes. Re-run the commands above after source changes; these results do not certify untested configurations or host integrations.
