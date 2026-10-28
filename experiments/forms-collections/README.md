# Forms and collections — 0.6 experiment

This milestone adds PasswordInput, NumberInput, CollectionToolbar and FormSection as working public components/patterns with source-backed contracts, examples and anatomy. The classic Aegis checkout remains unchanged.

[Verification](verification.json) records 384 source tests, 15 API-generator tests, 18 catalogue-generator tests, 11 MCP integration groups and 109 infrastructure tests, alongside the successful integrated build and documentation checks. These groups overlap with the integrated command and must not be added as separate executions.

[Built Storybook evidence](storybook-report.json) records 90 bounded checks: 38 confirmed play executions, 32 geometry cases, 8 Overview cases, 4 Anatomy cases, 4 input appearance comparisons and4 stepper groups covering 24 unavailable states. Its 42 axe scans have no violations. Representative screenshots are saved alongside this report; the complete 44-image output remains in `artifacts/forms-collections-storybook/` and is uploaded by CI.

The browser pass caught missing inherited PasswordInput controls/API metadata and a NumberInput field appearance difference. Source provenance now distinguishes inherited design-system and dependency properties from native platform attributes; shared appearance rules now include NumberInput. Unavailable number steppers receive the existing Button disabled styling. A stale-frame assumption in the browser harness was corrected by reacquiring Storybook's remounted specimen; no runtime bridge workaround was introduced.

[Packed consumer evidence](package-report.json) checks the actual tarball's public types, exports, native markup, production bundle and exact API/contract distribution. It reuses local third-party dependencies and does not prove fresh registry installation. [MCP compatibility evidence](mcp-compatibility-report.json) exercises the byte-identical new adapter with preserved real 0.4/r2 and 0.5/r3 kits. The frozen runner is copied here as `mcp-compatibility-runner.mjs`; its original artifact path and hash remain in the unmodified report. Those older kit snapshots remain local fixtures, not newly generated substitutes.

[Catalogue checks](catalogue-storybook-report.json) and [layout/skill checks](guidance-storybook-report.json) verify existing documentation behavior after the changes. Run `npm run check`, `npm run docs:check`, `npm run build-storybook`, `npm run forms-collections:browser` and `npm run forms-collections:package` to repeat current checks.

This is bounded evidence for Chromium, two widths, four presentations and selected variants. Storybook restores serialized args across its MDX remount; local password visibility and uncontrolled FormSection Overview drafts are not covered by that persistence claim. The controlled FormSection NativeForm story is tested separately. No certification of all 107 families, general agent determinism, backend integration or production performance is claimed.
