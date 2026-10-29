# Brand packages and token interchange

Aegis separates the saved design profile from component behavior and composition rules. A brand package is a portable, versioned JSON wrapper around that profile. Importing one previews the change; it does not install code, change the canonical token manifest, or apply a brand automatically.

The browser-safe implementations are [`brand-package.ts`](../src/agentic/brand-package.ts) and [`token-interchange.ts`](../src/agentic/token-interchange.ts). The package schema is [`brand-package.schema.json`](../schemas/brand-package.schema.json).

## Replace a brand through a checked preview

```ts
import {
  createBrandPackage,
  previewBrandPackage,
  serializeBrandPackage,
} from '../src/agentic/brand-package';

// Export the team's saved DesignProfile, with a version the team owns.
const json = serializeBrandPackage(createBrandPackage(currentProfile, { packageVersion: '1.0.0' }));

// Parsing JSON does not apply it. Show changes and issues before saving.
const preview = previewBrandPackage(JSON.parse(json), currentProfile);
if (preview.valid) {
  console.log(preview.changes, preview.compiled?.contrast);
  // An explicit user action can save preview.package.profile using the host's
  // existing profile workflow. The library itself performs no persistence.
}
```

The wrapper records the package format version, package release version, supported design-profile version, profile-compiler contract version, token-contract version, and exactly four supported configurations. These contract versions are currently `1`; they are independent of the npm package version. Unsupported versions, extra fields, missing configurations, invalid profile values, and executable-style hooks are rejected.

Compilation reuses the existing profile compiler. It preserves Primitive → Semantic → Group dependencies and produces all four explicit mappings:

- Fundamental/light
- Fundamental/dark
- Fundamental Floating/light
- Fundamental Floating/dark

The preview includes changed profile fields, the complete compiled token graph, scoped CSS, independent token validation, and the existing contrast measurements. Contrast warnings remain visible. They do not claim that every possible composition passes accessibility checks. Density remains an independent host default; changing color modes cannot change invariant dimensions or font metrics.

Brand packages support the existing profile capabilities: six-digit seed colors for the brand and four semantic intents, three neutral treatments, three radius presets, three allowlisted font treatments, and two density defaults. They do not install arbitrary fonts or represent an unrestricted CSS theme. Components, behavior, contracts and project recipes are not replaced by a brand package.

Serialization is deterministic and normalizes profile values. This supports meaningful diffs and exact profile round trips. It does not establish authorship, signatures, registry trust or release approval. A package version is metadata, not an instruction to upgrade a project.

## DTCG 2025.10 supported subset

The interchange implementation follows the stable [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/) for a documented subset. It does **not** claim complete DTCG conformance or implement the Resolver Module.

Supported types:

| Type          | Supported values                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `color`       | Structured `srgb` color objects with three numeric components in `[0,1]`, optional alpha and six-digit hex fallback |
| `dimension`   | Numeric `px` or `rem` objects                                                                                       |
| `duration`    | Non-negative numeric `ms` or `s` objects                                                                            |
| `number`      | Finite JSON numbers                                                                                                 |
| `fontFamily`  | A font name or a non-empty ordered list of names                                                                    |
| `fontWeight`  | Numeric weights in `[1,1000]` or the specification's named weights                                                  |
| `cubicBezier` | Four finite control points with both x coordinates in `[0,1]`                                                       |

`inspectDtcg(input)` validates inherited group types, complete-token `{group.token}` aliases, and local JSON Pointer `$ref` values, including property references inside supported value objects. It detects missing references, type mismatches and cycles. An alias can inherit its target token's type. References and unknown vendor `$extensions` are retained in `document`; `resolvedValue` is separate preview data. `serializeDtcg(document)` gives stable key order without flattening aliases or discarding extensions.

The subset rejects remote references, percent-encoded pointer fragments, `$extends`, unsupported composite types, unknown reserved fields, malformed names, mixed token/group objects, non-JSON data and excessive nesting/reference chains. Unsupported color spaces require conversion outside this importer. CSS expressions and old string-form color/dimension values are not accepted as DTCG 2025.10 values. Diagnostics identify the affected token and reason. Input is never fetched, evaluated or inserted as CSS.

## Export all four configurations

```ts
import { exportDtcg, serializeDtcg } from '../src/agentic/token-interchange';

const bundle = exportDtcg(currentProfile);
for (const [configuration, document] of Object.entries(bundle.documents)) {
  const json = serializeDtcg(document);
  // Offer json as `${configuration}.tokens.json` from the host UI or CLI.
}
console.log(bundle.stats, bundle.issues);
```

The result is an Aegis bundle containing four separate token documents, one per configuration. The bundle wrapper is not itself a DTCG token document. Every document uses `primitive`, `semantic`, and `group` groups with unique CSS-name-derived token names. Complete `var(--token)` aliases become DTCG aliases to the preceding tier. Source CSS names, paths, types, category ownership and invariant markers are retained in the `org.aegis.interchange` extension.

The existing Aegis catalog includes CSS-only values such as percentages, system colors, gradients, shadows and `color-mix()` expressions. This subset **does not flatten those expressions into approximated values**. Unsupported tokens and aliases depending on them are omitted from the portable token set, reported individually, and retained as original expressions in the document's `org.aegis.interchange.omitted` extension. Inspect `stats.omitted` and `issues` before using an export in another tool. The supported subset is useful interchange, not a complete replacement for the Aegis compiler or CSS output.

## Map an external document to a profile

```ts
import { inspectDtcg, previewDtcgImport } from '../src/agentic/token-interchange';

const inspection = inspectDtcg(externalJson);
// Display inspection.tokens and issues. A designer chooses the mappings.
const preview = previewDtcgImport(externalJson, currentProfile, [
  { field: 'brand', tokenPath: 'palette.primary' },
  { field: 'semantic.danger', tokenPath: 'palette.error' },
  { field: 'font', tokenPath: 'typography.family' },
]);
// Review preview.changes and preview.compiled.contrast before explicitly saving.
```

Supported profile targets are `brand`, `semantic.success`, `semantic.warning`, `semantic.danger`, `semantic.info`, `font`, and `radius`.

- Color targets require opaque sRGB values and produce six-digit hex seed colors. The existing compiler derives their theme treatments.
- Font mapping uses the first family and accepts Figtree, system-ui, serif, or Georgia, mapping to existing allowlisted profile presets. No font is installed.
- Radius mapping explicitly treats the chosen token as the `radius-l` anchor: exactly 3px for compact, 6px for soft, or 12px for round. Other values are rejected rather than approximated.
- Duplicate field mappings, missing paths, unsupported fields, partial mappings containing an error, and malformed documents block the preview.

Token names cannot reliably reveal design intent. Therefore no token is automatically mapped based on its name, no saved profile in a vendor extension is automatically trusted, and an exported mode's adapted action color is not assumed to be the original brand seed. Use a brand package for a lossless Aegis profile round trip. Use explicit DTCG mappings to bring selected decisions from another system into a checked profile.

## Verification

Focused tests cover deterministic package round trips for all three presets, incompatible versions, unknown fields, four-configuration token validation, extension and alias preservation, inherited types, local and partial pointers, malformed and circular aliases, unsupported values, and explicit import mappings. Exported documents are re-inspected independently before the round-trip assertion. These checks validate interchange behavior, not the accessibility of every consuming product.
