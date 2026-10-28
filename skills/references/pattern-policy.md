# Portable product pattern policies

Use this reference when creating or checking a product's repeated page structures. It describes the finite executable part of the [product pattern decisions](agentic-contract.md#product-pattern-decisions). The product's intended experience remains authoritative; a passing source check does not establish visual or behavioral correctness.

These conventions belong to the named product and declared pages. Record its repeated page construction choices—header hierarchy, action slots, filter placement, density and responsive behavior—before adding comparable pages. A product's chosen values do not become universal design-system defaults. Combine executable constraints with descriptive guidance and browser evidence for decisions that source syntax cannot establish.

## Create and run a policy

Save a project-relative JSON policy using `schemas/product-pattern-policy.schema.json` from the kit. Version 2 makes page membership and executable constraints explicit. Version 1 Forma policies must be migrated; they are not silently interpreted with new semantics.

Run from any working directory:

```sh
node /path/to/agent-kit/bin/aegis.mjs patterns check pattern-policy.json --project /path/to/product
```

The policy path is relative to the project root, or an absolute path inside it. Source paths are always relative to the project root. `scope` is a normalized directory within the project, or `.` for the whole project. Policy and source paths cannot escape the project or scope through traversal or symlinks. This command reads source and emits JSON; it does not execute the application's code, rewrite files, or change the policy.

```json
{
  "schemaVersion": 2,
  "product": "inventory",
  "revision": 1,
  "scope": "src",
  "pages": [{ "id": "items", "source": "src/items.tsx", "patterns": ["pageHeader", "grid"] }],
  "patterns": {
    "pageHeader": {
      "module": "@dimitriszoitas/aegis-agentic/patterns/page-header",
      "export": "PageHeader",
      "cardinality": { "min": 1, "max": 1 },
      "forbiddenLocalTags": ["h1"],
      "invariants": ["Shared header owns the page title and action placement"],
      "allowedVariations": ["Title, description and task-specific actions"]
    },
    "grid": {
      "module": "@dimitriszoitas/aegis-agentic/data-grid",
      "export": "DataGrid",
      "cardinality": { "min": 1, "max": 1 },
      "requiredProps": ["density"],
      "forbiddenProps": ["renderToolbar"],
      "invariants": ["Workspace density is shared; retain default display controls"]
    }
  },
  "exceptions": []
}
```

Use the installed package's actual module paths. A product-local wrapper may use `module: "./patterns"`, with its public named export. Add `source: "src/patterns.tsx"` to fingerprint that local implementation in the report. Source metadata does not prove that a module specifier resolves to that file; normal build/type checks establish module resolution.

Each page explicitly selects its relevant patterns. Set finite `cardinality.min` and `cardinality.max` per pattern. Zero is permitted for optional patterns. Descriptive-only patterns can record future or manually checked guidance, but cannot be referenced in a page's executable `patterns` array without a module, export and cardinality.

An optional `routeInventory` declares `{ "source": "src/app.tsx", "variable": "pages", "idProperty": "id" }`. The checker compares a top-level literal route array against the policy's page IDs and order. It accepts `as const` and `satisfies`; dynamic inventories need an application-specific route check. Without an inventory, the checker cannot discover omitted routes.

The inventory must be a local `const`. Direct reassignments, indexed/nested writes, mutating or unknown method calls, exports and escapes of the array binding through aliases or arguments fail. Common read methods such as `map` and `find` remain supported. This is a bounded local source check, not whole-program immutability analysis: callbacks, returned entry aliases and external runtime behavior still need application-specific tests.

## What is enforced

- Public named imports, including aliases, and namespace imports identify the chosen implementation. A shadowed local variable or same-named component from another module does not count.
- Cardinality counts JSX occurrences in a declared page source. Conditional renders, loops and helper components require browser evidence to establish the actual rendered count.
- `requiredProps` checks explicit prop presence, without evaluating its value. `forbiddenProps` checks explicitly supplied props. Spreads produce `spread-props` because their effective configuration is unknown.
- Optional `propValues` fixes product-specific values, for example `{ "density": "default", "enableSelection": false, "pagination": true, "pageSize": 10 }`. Each value must be a JSON primitive: string, finite number, boolean or null. The prop must be supplied explicitly, and a direct literal of the same type must match exactly. Boolean shorthand such as `pagination` means `true`. A missing value, duplicate attribute, spread or dynamic expression produces an unresolved `prop-value:<name>` finding. The checker does not execute expressions or infer component defaults. Encoded or multiline JSX attribute strings require an explicit JavaScript string literal to avoid ambiguous entity/whitespace handling.
- `forbiddenLocalTags` rejects specified intrinsic lowercase JSX tags anywhere in that page source; keep the rule scoped to the appropriate pages.
- Missing sources, malformed JSX, invalid policies and unknown rule properties fail the check. Explicitly declared local implementation sources are fingerprinted and parsed, but their behavior is not inferred.

Local identifier aliases, re-export resolution, `createElement` calls and dynamically constructed components do not establish an accepted pattern occurrence. Prefer direct public JSX bindings when practical. Use separate focused checks for a deliberate unsupported composition instead of reporting static uncertainty as verified behavior.

## Exceptions and evidence

An exception must identify exactly one page, pattern and rule and include a reason, for example:

```json
{
  "page": "items",
  "pattern": "pageHeader",
  "rule": "forbidden-tag:h1",
  "reason": "This page embeds a separately titled printable document."
}
```

Specific rules are `missing-import`, `cardinality`, `spread-props`, `required-prop:<name>`, `forbidden-prop:<name>`, `prop-value:<name>` and `forbidden-tag:<tag>`. Matched exceptions remain visible in the report with their findings. Unused exceptions fail so they do not silently become permanent waivers. Parse, filesystem, schema and route-coverage failures cannot be waived. A reason is an explicit design record, not authenticated owner approval. If a product intentionally reads a value from runtime state, scope its `prop-value` exception to that page and provide focused runtime evidence.

Reports include checker version, policy revision and canonical SHA-256, source hashes, findings and acknowledged exceptions. Keep them alongside the relevant kit/package lock, profile and browser evidence. A changed policy or source produces a different hash; this lets consumers identify stale evidence but is not an automatic approval mechanism.

Pair source checks with browser scenarios for shared header geometry, responsive filtering, keyboard interactions, loading/empty/error states and both modes. Review and approve screenshot baselines separately. Never broaden policy allowances or update visual baselines merely to hide an unintended regression.
