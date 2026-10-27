# Shared design-system infrastructure

The second experiment adds a shared workspace for multiple projects on one durable local filesystem. A workspace keeps project identities, scoped credentials, release generations and activation history in SQLite. Each project still uses the deterministic compiler, contracts, inventory, usage policy and repair engine. The original single-project service remains available.

This is a runnable service foundation, not a deployed cloud service. There is no SSO, multi-region coordination, online database migration, managed backup service, or claim of production availability. Node 24 is the tested runtime; its built-in SQLite module can emit an experimental-feature warning. Run one service per workspace on local storage. Do not put its SQLite WAL or locks on an unverified network filesystem.

## Set up a signed workspace

Use the CLI help for exact options:

```sh
npm run agentic:kit
npm run workspace -- help
npm run workspace -- release-keygen --out .aegis-release-keys
npm run workspace -- release-sign --kit agent-kit --private-key .aegis-release-keys/private.pem --out .aegis-release.json
npm run workspace -- init --workspace .aegis-shared --trusted-keys .aegis-release-keys/public-key.json
npm run workspace -- install --workspace .aegis-shared --kit agent-kit --attestation .aegis-release.json
```

The key command creates a new directory. Keep the private signing key outside the service in a real deployment. The example paths are ignored by Git. The public key is an explicit trust decision. Signing asserts who approved particular bytes; it does not establish component quality, accessibility, or safe behavior. Use reviewed releases and a protected signing process.

Initialization writes an administrator credential once to `bootstrap.token` with owner-only file permissions and a 30-day expiry. CLI commands default to this local file; `--token-file` selects a scoped credential. Raw tokens never appear in normal command output. The database stores SHA-256 token hashes. Do not commit, log, put in URLs, or embed long-lived administrator credentials in applications.

Use the digest returned by `install` when creating a project:

```sh
npm run workspace -- create-project --workspace .aegis-shared --id customer-portal --name "Customer portal" --kit-digest DIGEST_FROM_INSTALL --profile profiles/atlas.json
npm run workspace -- projects --workspace .aegis-shared
npm run workspace -- serve --workspace .aegis-shared --port 4178
```

The workbench's **Infrastructure** panel can connect to the shared workspace and select among projects visible to a credential. Credentials live only in the current browser component's memory, and are cleared on disconnect or leaving the panel. They are not persisted in local storage. Refreshing the page requires connecting again. The development proxy maps `/api/aegis-workspace` to port 4178; the existing local project proxy remains on 4177.

For a copied kit, use `node agent-kit/infrastructure/workspace-cli.mjs` instead of `npm run workspace --`. Keep the complete kit together.

## Roles and isolation

| Role          | Read project    | Plan / repair / retention / usage consent | Prepare and activate releases | Submit usage    | Manage projects and credentials |
| ------------- | --------------- | ----------------------------------------- | ----------------------------- | --------------- | ------------------------------- |
| Administrator | All projects    | All projects                              | All projects                  | All projects    | Yes                             |
| Owner         | Scoped projects | Scoped projects                           | Scoped projects               | No              | No                              |
| Operator      | Scoped projects | Scoped projects                           | No                            | No              | No                              |
| Viewer        | Scoped projects | No                                        | No                            | No              | No                              |
| Ingest        | No              | No                                        | No                            | Scoped projects | No                              |

Non-administrator credentials require explicit existing project IDs and expiry. Revocation and expiry are rechecked when authorizing actions; fabricating an actor object does not grant access. Issue separate credentials for operators and consumers. For browser usage reporting, use an application-owned server relay or a narrowly scoped, short-lived ingest credential through the SDK's injected fetch adapter. Do not ship a workspace administrator token with a browser bundle.

The shared API requires an `Authorization: Bearer …` header. Mutations additionally require JSON and `X-Aegis-Client: console` or `sdk`. Unknown fields, oversized bodies, unrecognized hosts, and disallowed browser origins fail. Request budgets use the connection address, not caller-supplied forwarding headers. Errors do not return filesystem paths, SQLite diagnostics or tokens. These are service boundaries; any process able to modify the workspace or runtime has operating-system authority outside them.

## Signed releases and generations

A detached Ed25519 attestation binds a complete kit integrity digest, signer fingerprint and release metadata. The verifier rejects unlisted or missing files, hash mismatches, symbolic/hard links, unsafe paths, duplicate JSON keys, invalid metadata and untrusted keys. It verifies each installed kit before importing its runtime. Attestations stay outside the kit, preventing self-referential hashing. Signature timestamps are signed metadata, not trusted timestamp-authority evidence.

Installed releases are addressed by their complete content digest. A mutable source checkout is never used as a project's live release. Rebuilding the checkout kit therefore does not silently alter installed projects. Existing files are not considered trusted merely because they are in an installation directory.

Preparing an update creates a fresh project generation and a reviewable plan. It compares pinned registry, API and token facts, records profile changes, and includes the expected project revision, exact target digest, generated-input hashes and a 24-hour expiry. Preparation does not select the target generation. Activation requires the plan ID, its content digest, expected revision and a reason. It rechecks the active and prepared generations, then changes the active pointer and appends an audit record in one SQLite transaction. Competing or expired plans fail. No coverage is inherited or consumer application automatically migrated.

```sh
npm run workspace -- update-prepare --workspace .aegis-shared --project customer-portal --expected-revision 1 --kit-digest REVIEWED_DIGEST --profile profiles/solstice.json
npm run workspace -- activate --workspace .aegis-shared --project customer-portal --expected-revision 1 --plan-id REVIEWED_PLAN_ID --plan-digest REVIEWED_PLAN_DIGEST --reason "Reviewed profile, release impact and consumer evidence"
```

Each activation starts with an empty usage buffer, collection disabled, and remote AI disabled. Previously active generations remain available for evidence and rollback. `rollback-prepare` reconstructs a new generation from a retained profile and installed kit, then uses the same explicit activation process. It never rewrites history or repoints to an old mutable usage buffer. Currently supported kit versions are explicit; a lower registry revision or unsupported migration is refused and needs a separate migration implementation.

Project-level SQLite changes are atomic. Preparation, generated-output repair and telemetry updates remain filesystem operations guarded by exclusive locks, with atomic replacement per file. They are not transactions across every file. A crash may leave an inactive generation or lock. After stopping the service and confirming no writer remains, inspect and back up the workspace before removing a stale lock; do not guess which unfinished generation should become active.

## Maintenance and retention

Add `--reconcile-interval 60` to the shared service only when you want periodic maintenance. Each cycle enforces retention, checks health, and repairs eligible derived drift. It never calls AI or approves a changed source. Repeated failures pause repair after three cycles; retention continues. Explicit resume is available through the maintenance endpoint/CLI lifecycle. The circuit is process-local, so restarting resets it; no operating-system daemon or persistent job queue is installed.

Usage is physically pruned to 30 days and 10,000 events, maintenance proposals to 30 days and 100 files per generation, and duplicate-delivery receipts remain bounded at 1,000. Retention covers retained project generations as well as the active one. An explicit project opt-out also clears archived usage. Invalid files or identities require review rather than silent deletion. Repair backups are retained, so disk monitoring and a reviewed archival policy are still required. Workspace update plans are capped at 100; archive reviewed inactive plans deliberately. Installed kits, inactive preparations and generations are not automatically garbage-collected.

The catalogue bounds projects (1,000), generations (10,000 total / 1,000 per project), credentials (1,000 including revoked records), and audit history (latest 10,000 rows). These are protective limits, not capacity or performance benchmarks. Export audit evidence before retention if longer history is required. No claim of indefinite storage or globally exactly-once usage delivery is made.

## Deployment and recovery

The default listener is loopback. Non-loopback CLI deployment requires TLS key/certificate files, explicit allowed hosts and origins, and signed-release policy. Configure the infrastructure behind your deployment's access/network controls. This repository does not provision DNS, certificates, accounts, external hosting or secrets. The development Vite server is not a production hosting configuration.

Back up the entire stopped workspace, including the SQLite catalogue, kits, attestations, generated projects, plans and trust policy. Copying only the database loses the files it references. Test a restore on a separate directory before relying on it. No automatic disaster-recovery test or managed backup is claimed. Release-key rotation, credential recovery after losing every administrator, storage quota management, SSO, remote databases and distributed workers remain future work.

See the machine-readable [shared protocol](../contracts/workspace-api.json), [single-project guide](INFRASTRUCTURE.md), and [product specification](PRD.md). Component rendering does not depend on this service or on an AI model being online.
