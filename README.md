# Aegis Agentic

A configurable, contract-driven design system with local and authenticated shared infrastructure services. A designer chooses the visual language; consumers pin its release, report explicitly permitted usage, inspect configuration boundaries, and prepare maintenance or update proposals. A portable kit gives coding agents the contracts and tools to reuse components, compose interfaces, and propose missing capabilities. The project is an independent snapshot of [Aegis](https://github.com/dimitriszoitas/aegis-ui), baseline `12e4f6b218c6cc68aba303feec211ba91aaeb20a`.

## Run the experiment

Use Node 24 and the package manager pinned in `package.json`.

```sh
pnpm install --frozen-lockfile
npm run dev -- --host 127.0.0.1 --port 4175 --strictPort
```

The root opens the workbench: Configure, Compose, Registry, Maintain, Export, and Infrastructure. The inherited examples remain available at `?view=console`, `?view=components` and `?view=marketing`. Browser profile edits persist locally. Infrastructure shows a disconnected state until its project service is started; browser examples do not create usage data or imply a connected model.

## Forma product pilot

Open `?view=product` for a five-section product built with Aegis: Dashboard, Users, Products, Invoices and Settings. It defaults to a dark, elevated presentation and also supports light mode. Users have a searchable, sortable grid, bulk actions, a detail side panel and a validated creation modal. Products and invoices support local creation, updates and CSV exports; settings persist appearance, density and workspace details.

This is a browser-local demo. It does not authenticate users, send invitations or invoices, process payments, or connect to a backend. Settings can export all workspace data or restore the sample records.

The [product pattern policy](src/product/pattern-policy.json) records shared headers, filters, grid controls and form conventions. `npm run product:patterns` checks shared implementation use; `npm run product:browser` starts an isolated preview and checks cross-page layout consistency, workflows, accessibility, light/dark and mobile behavior. Set `FORMA_URL` to test an existing preview instead. Screenshots and reports are written under `artifacts/forma-*`.

## Start the infrastructure service

Build the kit, initialize a new project directory, and start its local service:

```sh
npm run agentic:kit
npm run infrastructure -- init --project .aegis-workspace --id aegis-local --name "Aegis local infrastructure" --profile agent-kit/profiles/aegis.json
npm run infrastructure -- serve --project .aegis-workspace --port 4177
```

Open **Infrastructure** in the workbench to inspect the actual project. Telemetry and remote AI start disabled. The service pins the approved profile and release; changing a browser preview does not change that pin. Add `--reconcile-interval 60` to `serve` only when you want periodic checks and eligible deterministic repair while the process runs.

[Infrastructure guide](docs/INFRASTRUCTURE.md) covers the usage SDK, consent, CLI/API, configuration evidence, release planning, optional AI, and operational limits.

## Share infrastructure across projects

The authenticated workspace adds scoped roles, signed portable releases, multiple project generations, reviewed activation and rollback, and a durable SQLite catalogue. Follow the [shared workspace guide](docs/SHARED-WORKSPACE.md) to initialize signing keys and a workspace, install a verified kit, create projects and connect the console. It runs on one host; no external hosting or SSO is provisioned.

## What works

- **Profiles:** Aegis Original, Atlas Precision and Solstice Studio; editable brand, neutrals, semantic colors, corner family, typography and default density. A single compiler produces explicit Fundamental/Floating × light/dark mappings through the existing Primitive → Semantic → Group hierarchy. The original profile preserves the baseline manifest. Static contrast evidence identifies its limited scope.
- **Composition:** a finite customer-directory filtering contract with immediate or explicit Apply behavior, query/status controls, density, canonical recipes and profile/version fingerprints. The rendered preview has real local filtering and reset behavior.
- **Registry:** capability discovery, validated proposals, behavioral conflict comparison and explicit consolidation plans. Atomic local submission/promotion commands reject stale revisions. A shared Git repository and review workflow coordinate branches; the browser alone is not a collaboration server.
- **Missing component:** experimental TokenInput supports free-text values, validation, paste, suggestions and explicit duplicate/commit behavior. Existing Aegis components and Base UI remain the behavioral foundation. Illustrative proposal fixtures are labeled and never treated as verified independent generation.
- **Infrastructure:** a loopback HTTP service and CLI manage one pinned local project. The console displays real health, release, capability counts, usage evidence, and recent runs. It handles unavailable or stale service data explicitly.
- **Shared operations:** authenticated project scopes, hashed expiring credentials, detached Ed25519 release attestations, immutable installed kits, prepared updates, revision-checked activation and retained-generation rollback. The console selects projects and enforces role-aware controls; update activation is available through the CLI/API.
- **Usage:** a disabled-by-default SDK records only caller-supplied, allowlisted facts and flushes explicitly. Local retention and recent batch receipts are bounded. Counts describe instrumented surfaces; there is no inferred user/session analytics or globally exactly-once delivery.
- **Configurability:** source-derived component dimensions, choices, defaults, and unbounded props are inspectable. Finite combination estimates remain separate from explicit verification records.
- **Maintenance and updates:** actual derived drift can be repaired from unchanged pinned inputs, with evidence and a rescan. An optional service loop enforces physical retention and repeats health checks, pausing repair after three failed cycles. Changed sources, behavior, contracts, and releases require owner review; update comparison produces a plan without applying a migration.
- **Optional AI advisory:** a server-side key, explicit model, project opt-in, and per-request selection enable a bounded remote proposal request. Selected aggregate evidence is sent with `store: false`; responses are validated and never executed. Live AI has not been verified in this experiment.
- **Portable kit:** contracts, schemas, profiles, registry, source skills, reference API metadata and a dependency-free core/CLI run outside this repository.

The design language and proposed components are experimental. Token compliance, test results and selected color checks are evidence, not a universal usability or accessibility certification.

## Build and use the portable kit

```sh
npm run agentic:kit
node agent-kit/bin/aegis.mjs help
node agent-kit/bin/aegis.mjs profile compile agent-kit/profiles/atlas.json --out /path/to/consumer/agentic-dist
node agent-kit/bin/aegis.mjs composition validate agent-kit/examples/composition.json --profile agent-kit/profiles/aegis.json
node agent-kit/bin/aegis.mjs registry search filtering
node agent-kit/bin/aegis.mjs maintain scan --out /path/to/consumer/agentic-dist
node agent-kit/bin/aegis.mjs maintain repair --out /path/to/consumer/agentic-dist
```

Copy `agent-kit/` as a whole to another project. Start its agent at `skills/build-ui/SKILL.md`. The core `bin/aegis.mjs` CLI performs local operations. The separate `infrastructure/cli.mjs` runs the project service and only calls a model when explicitly configured and requested. Neither CLI publishes changes. For the supplied React implementations, build the separate package with `npm run build:package`; the package's `/agentic` entry includes the runtime, experimental components, and opt-in usage SDK. Import base `styles.css`, then your compiled `profile-tokens.css`. Apply `data-agentic-profile="atlas"` to the document root; existing Aegis theme helpers handle mode/presentation and portals. Pin the kit, selected profile content hash and registry revision with the composition.

The profile fingerprint is a reproducibility identifier, not a security signature. The CLI additionally records SHA-256 source/runtime identities to detect accidental maintenance drift. Owner approval files are explicit decision records, not authenticated identities; enforce shared acceptance through Git review and branch protections.

## Verify

```sh
npm run check
npm run tokens:check
npm run headless:check
npm run infrastructure:test
npm run agentic:browser
```

`check` validates types, lint, token and headless boundaries, unit tests, API metadata, kit creation, isolated consumer behavior, infrastructure tests, the production app and package builds. The consumer test deliberately corrupts derived CSS and changes approved source to verify both repair and refusal. Infrastructure tests cover local state, usage delivery, integrity checks, repair, and simulated provider responses. `agentic:browser` starts its own test server and exercises the workbench and simulated infrastructure API states; install Playwright Chromium first if it is unavailable. The infrastructure guide documents a separate real-service browser check. Browser verification and independent candidate evidence are described in `docs/EVALUATION.md`. The inherited component/Storybook pipeline remains `npm run legacy:check`.

## Read the design

- [Product specification](docs/PRD.md)
- [Shared workspace operations](docs/SHARED-WORKSPACE.md) and [authenticated HTTP contract](contracts/workspace-api.json)
- [Single-project infrastructure operations](docs/INFRASTRUCTURE.md)
- [Infrastructure HTTP contract](contracts/infrastructure-api.json) and [project schema](schemas/project.schema.json)
- [What a contract means](docs/CONTRACTS.md)
- [Portable agent contract](skills/references/agentic-contract.md)
- [Build UI](skills/build-ui/SKILL.md)
- [Compose patterns](skills/compose-pattern/SKILL.md)
- [Extend the language](skills/extend-design-language/SKILL.md)
- [Audit and repair](skills/audit-ui/SKILL.md)
- [Original Aegis reference](docs/original-aegis.md)

No existing Aegis deployment or npm package is updated by this experiment. The original Pages deployment workflow has been replaced with independent experiment checks. Publishing a version and consumer adoption remain deliberate actions.
