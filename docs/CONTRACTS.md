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

The current inventory contains **103 API families**, **seven authored component/pattern contracts** and **two separately classified service protocols**. Five authored contracts map to API families; two have no generated API-family entry. Consequently, **98 API families have API documentation without a mapped authored behavioral contract**. These counts describe different artifacts, not a percentage of behavior verified.

| Authored identity   | API family                  | Scope                                                                  |
| ------------------- | --------------------------- | ---------------------------------------------------------------------- |
| `button`            | `components-actions-button` | Native action, loading and focus requirements                          |
| `field`             | `components-forms-field`    | Label, description and validation association                          |
| `dialog`            | `components-overlays-modal` | The Modal implementation and its focus/dismissal requirements          |
| `card`              | `components-surfaces-card`  | Related content and nested token ownership                             |
| `page-layout`       | `patterns-pagelayout`       | Four initial page recipes and their selection/structure boundaries     |
| `dataset-filtering` | No API-family mapping       | Experimental `FilteredDataset` renderer and supported customer filters |
| `token-input`       | No API-family mapping       | Experimental free-text multi-value entry and controlled acknowledgment |

`dataset-filtering` does **not** describe the inherited `FilterBar` API family. A shared word, category or nested dependency is insufficient to map contracts. [`contracts/catalogue-bindings.json`](../contracts/catalogue-bindings.json) records explicit registry identities, versions, implementation files and export names. The generator checks these against the registry and source-derived API metadata, and rejects stale, duplicate, missing or incompatible bindings.

The infrastructure and shared-workspace HTTP protocols are listed separately. Their requirements do not increase component/pattern behavioral coverage. The protocol's `schemaVersion` describes its document format; the catalogue does not invent a component contract version for it.

Every entry distinguishes:

- **API documented:** a source-derived API family exists.
- **Behavior authored:** a mapped component/pattern requirement document exists.
- **System contract authored:** a service protocol document exists, outside behavioral-family counts.
- **Checks linked:** curated check source files exist. This is not a passing result or an exhaustive test inventory.
- **Evidence linked/reported:** a record exists, and a reported status is shown when the record supplies one. A status remains the record's claim, not a new certification by the catalogue.

Source paths and SHA-256 hashes identify the exact catalogue inputs. Authored documents also retain their original text for inspection and copying. Evidence records with declared source hashes receive a separate source-match assessment. A mismatch stays visible; matching those hashes does not rerun checks, prove complete coverage or establish human approval. Records without such hashes are marked `not-assessed`. Missing curated links do not establish that a component has no tests elsewhere.

## Validation and distribution

Run `npm run contracts:generate` after API metadata generation. Run `npm run contracts:check` to validate source requirements, bindings and deterministic output without rewriting it. The catalogue generator writes only its own file and preserves other AI assets. The API generator likewise preserves the sibling catalogue, while `ai:generate` refreshes it after the API files so their hashes stay aligned.

The portable kit includes the catalogue under `reference-api/ai/contract-catalogue.json`, API entries under `reference-api/ai/components/`, and authored documents under `contracts/`. Catalogue source paths identify repository sources; they do not promise that every check or evidence file is served over HTTP or included in every distribution. Interfaces should display paths/hashes without inventing downloadable links to absent files.

[`schemas/component-contract.schema.json`](../schemas/component-contract.schema.json) defines closed shapes for baseline contracts, TokenInput v2 and page-layout v1. Baselines and TokenInput require states. The structural page-layout recipe has no invented interaction state list; it requires its named API, recipe references and explicit limitations instead. Unknown properties, incompatible versions and invalid nested options fail validation. A new contract shape needs a deliberate schema update. Shape validity does not execute an invariant.

The profile, composition, registry and maintenance runtimes additionally check particular relationships: complete theme mappings, valid Apply behavior, profile fingerprints, canonical identity, stale revisions and permitted repair operations. Token audits enforce styling ownership. Browser and unit runs provide separate evidence.

## Extending a contract

Start with responsibility and observable acceptance criteria. Define defaults and edge cases, including validation, empty states, controlled state, disabled behavior, keyboard interaction and theme changes. Reference the public API and owning token group. Add representative examples and executable checks where possible, then register the precise mapping and bounded evidence links.

Compare overlapping proposals before merging code. The independent TokenInput experiment found differences in delimiters, duplicate policy, paste atomicity and controlled acknowledgments despite both candidates passing their own tests. Its consolidated v2 requirement and evidence record remain experimental, with no fabricated human approval or stable release.

Changing approved behavior requires a revised implementation proposal, reviewed consolidation and appropriate versioning. An approval record cannot relabel one implementation as having another implementation's behavior. No contract, Storybook page or agent transport substitutes for a missing product decision, visual review or comprehensive testing.
