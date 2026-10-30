# Application usage evidence

Determine which implementation families the application actually depends on, separately from which files its stories import. Record both source evidence and its limits. Do not remove an exported API or a runtime-loaded feature because a text search finds no JSX tag.

## Find the real roots

Inspect HTML/module entry points, framework route conventions, server/client entry points, package exports and runtime registries. Include feature-flagged routes and lazy imports as potentially used. Resolve local aliases, selected barrel exports, compatibility re-export paths and wrapper dependencies. Exclude type-only references from runtime usage. Stories, test fixtures and documentation are separate roots.

For a TypeScript/JavaScript repository with explicit module entry points, the optional analyzer is [component-usage.mjs](../scripts/component-usage.mjs). It reads source without executing application modules and uses the target repository's installed TypeScript dependency. It does not install dependencies or collect telemetry.

```sh
node /path/to/aegis/skills/systemize-repo/scripts/component-usage.mjs \
  --root=/path/to/product \
  --entry=src/main.tsx \
  --out=docs/systemization/component-usage.json
```

Repeat `--entry` for additional application roots. For a library, repeat `--public-entry=src/package/index.ts` for each real public source entry. UI candidates are discovered throughout the repository, including feature/page/custom folders, JSX and local components. Supply `--inventory=docs/systemization/component-inventory.json` to supplement that scan with existing `entries[].file`; it never narrows discovery, and stale paths are reported. The directory census and exclusions are included for review. HTML module roots may be inferred; framework routes must be discovered and supplied explicitly. Do not use a missing entry list to conclude the application is unused. See [staged discovery](stages.md) for inline UI, hardcoded styling and unsupported templates.

## Classify conservatively

| Status | Meaning |
| --- | --- |
| App reachable | A static value-reference or literal lazy-import path starts at an actual app entry. It may be behind permissions, flags or an unvisited route. |
| Stories only / tests only / stories and tests only | Supporting examples or checks reference the file, with no detected app path. |
| Public API only | A supplied package entry exports it; external use may exist even with no local app call site. |
| No detected reference | No path in the inspected roots. Review it as a candidate for retention, consolidation or deprecation. |
| Uncertain | Unresolved application imports, computed namespace registries or glob loading prevent a reliable negative classification. |

The report gives paths, callers/lines, source hash, scope and unresolved edges. It analyzes selected exports through barrels without claiming that every sibling export is used. Required compatibility import paths remain reachable. It conservatively follows all runtime references in a reachable module, including inactive branches and locally unused functions; it does not prove that every export/variant in that module renders. Review external package exports and framework-specific runtime loading independently.

If usage frequency or observed rendering is requested, add opt-in local instrumentation or a bounded browser workflow, recording routes, roles, flags and duration. A component absent from a sampled session can still be used elsewhere. Do not introduce analytics or send source/product data to external services to answer a local usage question.

## Act on the evidence

Reconcile usage with the canonical-family and duplicate-implementation records. A migration may leave a compatibility adapter required by current consumers; retain it until those consumers are migrated. Public exports can require deprecation/versioning instead of removal. Story-only components may be intentional library offerings. Record keep, migrate, deprecate or investigate with reasons and tests. Do not automatically delete candidates.

Expose this report separately from catalogue coverage, with searchable statuses and concrete dependency evidence. After refactoring consumers, regenerate it and check that intended imports moved to their canonical owner while route, API and state contracts still work.
