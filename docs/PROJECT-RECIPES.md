# Project recipes and behavior discovery

A project recipe records a product's shared composition decisions before an agent picks components. It extends the existing `pageLayoutRecipes` archetypes and selects approved variants; it does not introduce another layout system or replace the product pattern policy.

The profile owns visual design decisions. Project recipes own supported behavior and composition choices. The pattern policy names the shared implementations and static source constraints. Rendered acceptance remains separate from both.

## Configure once

```json
{
  "schemaVersion": 1,
  "project": "customer-console",
  "revision": 1,
  "recipes": {
    "collection": {
      "header": "standard",
      "filters": "push",
      "searchMeasure": "wide",
      "density": "default",
      "details": "side-sheet",
      "narrow": "stack"
    },
    "detail": { "supportingRegion": "aside", "measure": "comfortable" },
    "settings": { "measure": "comfortable", "save": "explicit" },
    "dashboard": { "maxColumns": 4, "minItemWidth": "regular" }
  }
}
```

Missing choices resolve to `projectRecipeDefaults`. Unknown keys, arbitrary CSS dimensions, unsupported column counts, modal filtering, and incompatible archetype options fail validation. Increment the project revision when changing a shared decision, update its implementation and acceptance evidence together, then share the same file with every contributor.

| Decision                 | Approved options                                          |
| ------------------------ | --------------------------------------------------------- |
| Header                   | `standard`, `breadcrumbs`                                 |
| Collection filtering     | `push`, `inline`, `none`                                  |
| Search measure           | `regular`, `wide`, with available width on narrow layouts |
| Grid density             | `compact`, `default`, `comfortable`                       |
| Record inspection        | `side-sheet`, `page`, `none`                              |
| Detail supporting region | `none`, `aside`                                           |
| Reading measure          | `compact`, `comfortable`, `wide`                          |
| Settings save behavior   | `explicit`, `immediate`                                   |
| Dashboard column cap     | 1, 2, 3, 4                                                |
| Dashboard item minimum   | `small`, `regular`, `large`                               |
| Narrow layout            | `stack`                                                   |

A library-approved option does not mean every host implements it. A host must bind it or reject it explicitly. Search measure is a product wrapper choice mapped to its owning group tokens. It is not a new raw-pixel styling override or a claim that CollectionToolbar exposes a width prop.

## Resolve into an implementation plan

```ts
import {
  normalizeProjectRecipes,
  resolveProjectRecipe,
  discoverByBehavior,
} from '@dimitriszoitas/aegis-agentic/agentic';

const variants = normalizeProjectRecipes(projectConfig).recipes;
const plan = resolveProjectRecipe(projectConfig, 'collection', {
  patternPolicy: existingProductPatternPolicy,
});
const choice = discoverByBehavior({
  query: 'filters beside a table',
  projectRecipes: projectConfig,
  requestedComponent: 'SideSheet',
});
// choice.status === 'rejected': a modal sheet is not the push-filter shell.
```

The resolver emits canonical imports, public prop bindings, required host state and callbacks, prohibited substitutions, existing contract requirement references, and project requirement IDs. It checks the resulting structure with the existing page layout validator. `serializeProjectRecipes` normalizes defaults and sorts object keys. Equivalent configuration resolves identically. `stableHash` is a comparison fingerprint, not a cryptographic trust signature.

`PageLayout` already renders PageHeader from its header props. Do not render a second title when consuming the header guidance in its plan. A product that already owns a shell can use the canonical regions and its shared header separately, as Forma does.

The optional schema-2 pattern policy must identify the same product. Existing `pageHeader`, `collectionFilters` and `dataGrid` declarations select product-local wrappers instead of inventing another import. Their required props and source still need to be implemented; a wrapper's API must not be assumed identical to the underlying component. The returned policy fingerprint records the input used for the plan. It does not certify source or runtime compliance.

## Choose behavior before appearance

`discoverByBehavior` ranks a curated set of behavior intents, then returns real catalogue entries and contract links. It does not use a model or claim semantic understanding of arbitrary language.

- **Push filtering:** an in-flow panel shares space with results. Opening it reduces the results area on wide screens; narrow containers stack filters first. Results stay interactive. There is no backdrop or focus trap.
- **Modal side sheet:** a task temporarily occupies an overlay. SideSheet owns modal focus/dismissal behavior; the host supplies its state and content.
- **Record details:** inspect one identified record, using the project's side-sheet or detail-page decision. This is a purpose, not a synonym for filtering.

An ambiguous request such as “side panel” returns alternatives and a clarification, without choosing an overlay. A known project recipe disambiguates broad filtering requests. A requested component or behavior that contradicts the selected recipe is rejected, with the approved recipe returned for context.

The full `FilterPanel` accepts WorkRecord-specific facets. For other domains use its reusable `FilterOptions`, shared Checkbox and AppliedFilterGroups in a product-owned in-flow shell. Never coerce arbitrary product records into WorkRecord or silently substitute SideSheet.

## Required acceptance

`contracts/composition/project-recipes.json` is the authored source of project requirements, imported by the runtime. These include push geometry, nonmodal result interaction, narrow reading order, functioning controlled density, shared search measure, header consistency and preserved state.

The reusable browser oracle is `scripts/acceptance/oracles.mjs`. References distinguish the product's shell requirements from the `filter-panel` component's lifecycle obligations. A valid configuration or source hash is not passing browser evidence.

## Read-only MCP

The adapter exposes `discover_by_behavior` and `resolve_project_recipe` when the installed core supports them. Inline configurations are reported as `inline-proposal`, never project approval.

Bind an existing project explicitly:

```sh
node agent-kit/bin/aegis-mcp.mjs \
  --kit ./agent-kit \
  --project ./consumer \
  --lock aegis-lock.json \
  --profile profile/profile.json \
  --policy pattern-policy.json \
  --recipes project-recipes.json
```

The recipe file is bounded by the configured project root and existing input size limits. Startup validates the config and matching product policy. The server records its exact hash, refuses a conflicting inline override, and stops serving against a recipe file changed after startup. Existing lock/profile/kit checks remain in effect. The tools do not write files, fetch external resources, execute generated application code, or claim a rendered result is compliant.

## Forma pilot

`src/product/project-recipes.json` is consumed by `src/product/recipes.ts`. Initial grid density comes from the config; user preferences remain the current source of truth after that. The shared filtering wrapper consumes filter behavior and search measure. Metric cards use ContentGrid with the selected cap and item minimum. Settings content uses the selected ReadingColumn measure.

Forma currently supports its standard shared header, push filtering, side-sheet details and explicit workspace Save/Cancel. Appearance preferences retain their documented immediate behavior. The binding throws on unsupported variants instead of ignoring them. Existing `pattern-policy.json` remains the source of implementation identity and source checks.
