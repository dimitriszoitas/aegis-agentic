# What a contract means

A contract is a versioned specification of what a component, composition or service must guarantee. It is separate from its implementation and from evidence that an implementation meets it.

| Artifact                    | Responsibility                                                                     | Example                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Authored requirement        | Defines purpose, anatomy, states where applicable, behavior and design constraints | A modal has an accessible title, contains focus while open and returns focus on dismissal.          |
| Source-derived API metadata | Describes discovered imports, properties, source facts and authored usage guidance | Button exposes loading and disabled properties. This does not prove their behavior.                 |
| Implementation              | Implements behavior and applies the owning group's tokens                          | Base UI Dialog supplies interaction; Aegis Modal supplies its styled interface.                     |
| Guidelines and skills       | Help a person or agent choose, compose and extend implementations                  | Preserve shared behavior when adding content; distinguish project conventions from general recipes. |
| Checks                      | Contains code that can exercise particular requirements                            | A browser script checks Escape and focus return. Linking it does not run it.                        |
| Evidence                    | Reports what was exercised against specified inputs and an environment             | A bounded browser run reports its scenarios, source hashes and findings.                            |

“Contract v1” means version one of the requirements. It is not a passing-test badge, a headless component, owner approval or accessibility certification. A proposed implementation is not canonical simply because its JSON validates.

## One catalogue, separate coverage dimensions

[`public/ai/contract-catalogue.json`](../public/ai/contract-catalogue.json) is generated from the canonical source files, not edited by hand. Storybook and agent interfaces consume the same data through [`src/agentic/contracts.ts`](../src/agentic/contracts.ts): `contractCatalogue`, `searchContracts`, `getContractEntry` and `getContractCoverage`. Missing identities return `undefined`; discovery never fabricates a contract.

The `0.6.0-experiment.0` inventory contains **107 API families**, **31 authored component/pattern contracts** and **two separately classified service protocols**. **29 API families have mapped authored requirements**; two authored contracts have no generated API-family entry. Consequently, **78 API families have API documentation without a mapped authored behavioral contract**. These counts describe different artifacts, not a percentage of behavior verified.

The 0.5 milestone added **20 source-backed contracts** to the seven present in 0.4. The 0.6 milestone adds four working components/patterns with their own contracts. The existing contracts retain their identities and versions:

| Authored identity   | API family                  | Scope                                                                  |
| ------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `button`            | `components-actions-button` | Native action, loading and focus requirements                          |
| `field`             | `components-forms-field`    | Label, description and validation association                          |
| `dialog`            | `components-overlays-modal` | The Modal implementation and its focus/dismissal requirements          |
| `card`              | `components-surfaces-card`  | Related content and nested token ownership                             |
| `page-layout`       | `patterns-pagelayout`       | Four initial page recipes and their selection/structure boundaries     |
| `dataset-filtering` | No API-family mapping       | Experimental `FilteredDataset` renderer and supported customer filters |
| `token-input`       | No API-family mapping       | Experimental free-text multi-value entry and controlled acknowledgment |

The 20 additions in 0.5 cover existing product-facing implementations:

| Area                       | New authored identities                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Input and selection        | `text-input`, `textarea`, `search-input`, `select`, `checkbox`, `switch`, `segmented-control` |
| Overlays and menus         | `dropdown-menu`, `popover`, `side-sheet`                                                      |
| Collections and navigation | `data-grid`, `filter-bar`, `page-header`, `side-nav`, `tabs`, `pagination`                    |
| Data and feedback          | `metric-card`, `sparkline`, `description-list`, `empty-state`                                 |

The four new 0.6 implementations are `password-input` (native password entry and visibility), `number-input` (Base UI numeric entry and form serialization), `collection-toolbar` (generic host-owned search, filter/action slots and result status) and `form-section` (native fieldset grouping with the shared responsive grid). Each has its own public import, source-backed requirements, interaction stories and anatomy specimen. These remain experimental additions with no fabricated owner approval.

`dataset-filtering` does **not** describe the inherited `FilterBar` API family; `filter-bar` now supplies that family's own requirement document. A shared word, category or nested dependency is insufficient to map contracts. [`contracts/catalogue-bindings.json`](../contracts/catalogue-bindings.json) records explicit registry identities, versions, implementation files and export names. The generator checks these against the registry and source-derived API metadata, and rejects stale, duplicate, missing or incompatible bindings.

The infrastructure and shared-workspace HTTP protocols are listed separately. Their requirements do not increase component/pattern behavioral coverage. The protocol's `schemaVersion` describes its document format; the catalogue does not invent a component contract version for it.

Every entry distinguishes:

- **API documented:** a source-derived API family exists.
- **Behavior authored:** a mapped component/pattern requirement document exists.
- **System contract authored:** a service protocol document exists, outside behavioral-family counts.
- **Checks linked:** curated check source files exist. This is not a passing result or an exhaustive test inventory.
- **Evidence linked/reported:** a record exists, and a reported status is shown when the record supplies one. A status remains the record's claim, not a new certification by the catalogue.

Source paths and SHA-256 hashes identify the exact catalogue inputs. Authored documents also retain their original text for inspection and copying. Evidence records with declared source hashes receive a separate source-match assessment. A mismatch stays visible; matching those hashes does not rerun checks, prove complete coverage or establish human approval. Records without such hashes are marked `not-assessed`. Missing curated links do not establish that a component has no tests elsewhere.

## Schema 2: explicit responsibility and source references

The 24 source-backed documents use **contract schema 2**, each starting at **contract version 1**. These are separate version axes: `schemaVersion` identifies the document shape, while `version` identifies that component's requirements. They retain `status: source-backed-baseline` and `verification: not-certified-by-this-contract`.

Each document declares component and host ownership, then gives each requirement a stable lower-kebab `id`, a `kind`, a statement and one or more repository-relative source references:

| Requirement kind | Meaning                                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component`      | Responsibility grounded in the implementation, including delegated primitive behavior and explicit limits. The requirement must cite an implementation or style file in the component’s own directory and API source graph; transitive dependencies alone do not qualify. |
| `host`           | Caller obligations such as accepting controlled-state changes, providing names, applying filters, fetching data, routing, submitting forms or preserving drafts.                                                                                                          |
| `design`         | Canonical composition or token guidance that an implementation or extension must follow; not a claim that the component executes that guidance at runtime.                                                                                                                |

Keep a requirement's id stable while its responsibility remains the same; use it to discuss changes and relate future checks to the requirement. Ids are unique within their contract, so references need both the contract identity/version and requirement id. Do not silently reuse an id for unrelated behavior. A material requirement change needs deliberate contract versioning and review.

The generator validates unique ids, existing source paths, family implementation references and the longest-prefix token owner. It includes the referenced files' hashes in the catalogue and exposes them as contract references. These hashes identify the source snapshot supporting the authored statement; they do not prove that the statement is exhaustive or that a test passed. Source changes make the generated catalogue stale, requiring review and regeneration rather than silently preserving an old source claim.

For example, DataGrid owns local sorting and page state while the host owns fetched records and mutations. FilterBar edits the WorkRecord filter model; its host applies that model to results. SideNav requests navigation without owning a router. Sparkline normalizes negative and nonfinite samples rather than preserving signed data. These boundaries are part of the requirements and limitations, not missing behavior that an agent may invent.

The new bindings link existing or focused checks where relevant and leave evidence arrays empty. Historical TokenInput evidence remains attached to its original contract and inputs; adding requirements does not transfer that evidence to other families or create owner approval.

## Validation and distribution

Run `npm run contracts:generate` after API metadata generation. Run `npm run contracts:check` to validate source requirements, bindings and deterministic output without rewriting it. The catalogue generator writes only its own file and preserves other AI assets. The API generator likewise preserves the sibling catalogue, while `ai:generate` refreshes it after the API files so their hashes stay aligned.

The portable kit includes the catalogue under `reference-api/ai/contract-catalogue.json`, API entries under `reference-api/ai/components/`, and authored documents under `contracts/`. Catalogue source paths identify repository sources; they do not promise that every check or evidence file is served over HTTP or included in every distribution. Interfaces should display paths/hashes without inventing downloadable links to absent files.

[`schemas/component-contract.schema.json`](../schemas/component-contract.schema.json) defines closed shapes for the existing baseline contracts, TokenInput v2, page-layout v1 and schema-2 source-backed requirements. Existing baselines and TokenInput require states, as do schema-2 documents. The structural page-layout recipe has no invented interaction state list; it requires its named API, recipe references and explicit limitations instead. Unknown properties, incompatible versions and invalid nested options fail validation. A new contract shape needs a deliberate schema update. Shape validity does not execute a requirement.

The profile, composition, registry and maintenance runtimes additionally check particular relationships: complete theme mappings, valid Apply behavior, profile fingerprints, canonical identity, stale revisions and permitted repair operations. Token audits enforce styling ownership. Browser and unit runs provide separate evidence.

## Extending a contract

Start with responsibility and observable acceptance criteria. Define defaults and edge cases, including validation, empty states, controlled state, disabled behavior, keyboard interaction and theme changes. Reference the public API and owning token group. Add representative examples and executable checks where possible, then register the precise mapping and bounded evidence links.

Compare overlapping proposals before merging code. The independent TokenInput experiment found differences in delimiters, duplicate policy, paste atomicity and controlled acknowledgments despite both candidates passing their own tests. Its consolidated v2 requirement and evidence record remain experimental, with no fabricated human approval or stable release.

Changing approved behavior requires a revised implementation proposal, reviewed consolidation and appropriate versioning. An approval record cannot relabel one implementation as having another implementation's behavior. No contract, Storybook page or agent transport substitutes for a missing product decision, visual review or comprehensive testing.
