# Executable acceptance evidence

A contract records what must hold. An acceptance scenario records the exact subset we can measure, in which consumer, and with which oracle. Neither authored coverage nor the existence of a test file means that the behavior passed.

The shared case catalogue is `scripts/acceptance/catalogue.mjs`. Its source-backed requirement references point to the existing component contracts and project recipe requirements. `scripts/acceptance/oracles.mjs` contains the actual reusable browser assertions, used by the standalone evidence runner, the Forma filtering regression, and the Storybook publication smoke. A changed selector is a consumer adapter concern; the expected behavior stays in the shared oracle.

## Current finite scenarios

| Scenario        | Isolated Storybook               | Real Forma consumer       | Measured behavior                                                                                |
| --------------- | -------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| Push filtering  | FilterPanel synchronized example | Users, Products, Invoices | Reserved space, results shrink, no overlap/backdrop, narrow stacking, results remain interactive |
| Density         | DataGrid default example         | Users, Invoices           | Selected state and strictly increasing compact/default/comfortable row heights                   |
| Modal dismissal | Modal default example            | Add user                  | Enter opens, focus enters, Escape dismisses, focus returns to the surviving opener               |

Each context has eight planned presentations: widths 1440 and 390, both light/dark modes, and Fundamental/Fundamental Floating. The product's generic filtering shell uses the project recipe requirements; it is not misrepresented as the WorkRecord-specific FilterPanel implementation. A narrow layout has its own assertion rather than an exception that silently skips geometry.

These checks deliberately catch the previously reported failure modes. A selected density label with unchanged row heights fails. A visible filter panel laid over unchanged results fails. Pointer interception and hidden or inert results fail even when the panel looks correct.

## Run and inspect

Start the local Storybook and Forma servers, then run:

```sh
node scripts/acceptance/run.mjs --storybook http://127.0.0.1:6010 --forma 'http://127.0.0.1:4181/?view=product'
```

The report is `artifacts/acceptance/report.json`. Use `--out PATH` to select an output, `--case CASE_ID` or `--context CONTEXT_ID` for a focused run, and `--list` to inspect the executable catalogue. Omitted servers and unselected scenarios remain `not-run`; they never inherit previous passing evidence. A failing scenario does not prevent the remaining contexts from being checked.

For production or CI verification, first build the application and Storybook from the intended stable checkout, then run `node scripts/acceptance/verify-builds.mjs`. This wrapper serves the existing `dist/` and `storybook-static/` directories on temporary loopback ports, runs the complete 72-scenario matrix, and runs the design infrastructure UI verifier when present. It requires every planned scenario to pass, rejects changed source or artifact bytes, records build hashes, and always closes its servers. Reports are saved under `artifacts/acceptance-builds/`. It never rebuilds or silently substitutes an existing development server. Build hashes identify the tested bytes; they do not attest their original source.

```sh
node --test scripts/acceptance/oracles.test.mjs
node scripts/acceptance/verify-adversarial.mjs
```

The adversarial browser proof uses small controlled fixtures. It accepts working push/density behavior, then confirms that the same browser oracles reject an overlay substituted for push layout and an unchanged row height behind apparently working density buttons. These are test-oracle checks, not fabricated production incidents or AI-generated repairs.

## Evidence boundaries

Each report includes source/contract/oracle file hashes, Git revision and dirty state, the actual context URL, theme, presentation, width, timestamps, measurements, and one of four outcomes:

- `passed`: that finite scenario executed and met its assertion.
- `failed`: execution observed a failing assertion or could not complete successfully.
- `not-run`: a planned scenario did not execute, for example because its server was not supplied.
- `unsupported`: this runner has no executable mapping for that authored requirement.

Every authored requirement appears in the inventory, including unsupported requirements. A mapped requirement remains `not-run` until its whole planned matrix has results; a failure takes precedence. Passing entries retain `coverage: partial-scenario`, because the scenario does not certify every sentence of the linked requirement. Full keyboard semantics, accessibility, visual appropriateness, data integrity, and all configuration permutations are not implied.

The report schema is `schemas/acceptance-evidence.schema.json`. `verifiedRecords(report, currentSourceDigest)` rejects reports with an altered digest, stale source snapshot, changed context identity, or source changes during the run before joining observations into an inventory. Hashes establish integrity against the supplied digest, not trusted authorship. Do not accept an arbitrary untrusted report as release authority.

The source snapshot describes the local checkout. A supplied server's build identity is not attested, so use locally built artifacts from that checkout for release or repair evidence. A hash match alone cannot prove what an unrelated remote server is running.

## Repair integration

A repair planner can select failed records by requirement, component, consumer, and presentation. Reproduce the same scenario against an isolated candidate, retain the failed evidence, and compare fresh results using the unchanged oracle. Missing mappings require additional acceptance work or human review; they do not authorize speculative repair. The runner has no mutation, merge, publication, credential, or provider capability.

Broad component self-healing must distinguish source inspection, executable reproduction, proposed repairs, and verified fixes. Expanding the component catalogue is not proof that every component has an autonomous repair path.
