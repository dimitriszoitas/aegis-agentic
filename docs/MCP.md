# Read-only agent access through MCP

The optional MCP adapter makes an installed Aegis kit discoverable to an agent without requiring the agent to invent component APIs or read the entire repository. It exposes authored contracts and source-derived API metadata separately, along with profile presets, page recipes, source guidance, project pins and bounded validators.

It runs locally over stdio using the official TypeScript SDK. The verified protocol revision is **2025-11-25**; Node 24 is required. The SDK is bundled only into `agent-kit/bin/aegis-mcp.mjs`, independently of React and the dependency-free core runtime. No HTTP listener, external service, API key, global agent configuration, telemetry collection, repair or release action is installed.

## Connect a client

Configure a compatible MCP client explicitly using its own configuration format. This generic example shows the command and arguments; replace both absolute paths with the actual installed kit and project:

```json
{
  "mcpServers": {
    "aegis": {
      "command": "node",
      "args": [
        "/absolute/path/to/agent-kit/bin/aegis-mcp.mjs",
        "--kit",
        "/absolute/path/to/agent-kit",
        "--project",
        "/absolute/path/to/product",
        "--lock",
        "aegis-lock.json",
        "--profile",
        "profile/profile.json",
        "--policy",
        "pattern-policy.json"
      ]
    }
  }
}
```

All project paths after the root are normalized relative paths. The adapter binds one root at startup. MCP callers cannot change the root or supply arbitrary file paths. Omitting `--kit` from the bundled entry selects its containing kit; source development should pass `--kit` explicitly. Omitting `--project` enables **unbound discovery**, which reports that no product policy or project/profile pin has been verified. Project-specific arguments without a root fail startup.

This adapter explicitly supports these kit/registry pairs, all with compiler `1` and catalogue schema `1`:

| Kit version          | Registry revision |
| -------------------- | ----------------- |
| `0.4.0-experiment.0` | `2`               |
| `0.5.0-experiment.0` | `3`               |
| `0.6.0-experiment.0` | `4`               |
| `0.7.0-experiment.0` | `5`               |

Mixed pairs are rejected: a 0.7 kit with revision 2, 3 or 4, or a 0.4–0.6 kit with revision 5, is not supported. The loaded core registry and catalogue package/version/revision must match the selected kit. Supporting these pairs does not migrate a project's lock or activate a newer release. Future versions need an intentional compatibility update and verification. Two existing lock formats are supported:

- A consumer `aegis-lock.json` (schema 1) must match package name/version, registry revision, the installed kit's `integrity.json` SHA-256, and the actual configured profile ID/hash. Its recorded tarball digest and dependency source are returned as provenance; the adapter does not have or verify tarball bytes.
- A compiled `profile-lock.json` (schema 1) must match kit version, registry revision, loaded core runtime SHA-256, canonical profile-source SHA-256 and compiled profile hash. Pass its relative location with `--lock`, normally `profile/profile-lock.json`.

Unknown lock formats, mismatched versions/hashes, missing files and escaping paths fail. There is no fallback to current source or the latest package. Changes to the bound lock/profile or kit integrity manifest require restarting and validating the binding again. Supported locks do not attest a numeric profile revision: composition validation verifies the actual bound profile ID/hash and reports `profileRevisionAttested: false` rather than inventing a revision.

## Discovery and tools

Resources use fixed `aegis://` identities:

| Resource                  | Contents                                                                   |
| ------------------------- | -------------------------------------------------------------------------- |
| `aegis://context`         | Installed kit identity and explicit bound/unbound context                  |
| `aegis://project-profile` | Exact bound configured profile (bound mode only)                           |
| `aegis://project-policy`  | Current explicitly selected product policy (bound mode only)               |
| `aegis://catalogue`       | Searchable entry summaries, coverage distinctions and exact-document links |
| `aegis://contracts/<id>`  | Exact authored contract or system protocol JSON                            |
| `aegis://api/<id>`        | Exact generated public API metadata                                        |
| `aegis://profiles/<id>`   | Installed profile preset JSON                                              |
| `aegis://page-recipes`    | Supported layout recipe facts and limits                                   |
| `aegis://public-entry-coverage` | Public UI ownership/export classification snapshot, when advertised by the kit |
| `aegis://guidance/<name>` | Exact installed skill or shared reference text                             |

The creation resources `aegis://guidance/create-component`, `aegis://guidance/create-token` and `aegis://guidance/create-layout` are exposed only when the installed kit advertises them in `authoringGuidance.skills`. They require a **library source checkout**: distributing these instructions does not put source folders or authoring checks in an installed npm package and does not authorize editing `node_modules`. Older supported kits without this metadata keep their existing resources. The optional public-entry coverage resource likewise appears only when advertised, and its supplied SHA-256 is checked in addition to the installed integrity manifest.

Clients should list resources and follow returned identities rather than guess names. The catalogue distinguishes authored behavior, system protocols, API documentation, linked checks and historical evidence; a linked check or passed historical report does not certify the current product. Exact file resources are checked against the installed integrity manifest and catalogue source hash when one is provided. These hashes establish snapshot consistency, not publisher authentication or human approval.

The 0.7 catalogue includes 127 authored component/pattern contracts, with all 124 API families mapped, zero API-only families and three authored-only entries. Seventeen working additions and authored requirements for all 78 previously uncovered families complete this milestone. Schema-2 contracts distinguish component responsibilities, host obligations and design guidance using stable requirement ids and cited sources. The catalogue wrapper remains schema 1; documents returned by `aegis://contracts/<id>` retain their own schema and version. Referenced hashes identify the source snapshot, not executed acceptance evidence. See [contract semantics and coverage](CONTRACTS.md).

Tools are `search_contracts`, `inspect_project_context`, `validate_page_recipe`, `validate_composition` and `audit_product_patterns`. Search delegates to the installed core catalogue helper, including curated capability aliases. Recipe and composition checks call the same pure engines as the kit CLI. Product audit uses the same installed static pattern-policy engine, reading only explicitly declared sources inside the bound policy scope. The adapter has no write, install, repair, promotion, instrumentation or network-fetch tools.

The `build_page` and `audit_page` prompts combine the task with current context and exact installed build/audit skill, agentic contract and page composition, design contract and pattern-policy guidance. They expose source guidance; they do not execute it or extend the host agent's authority.

## Bounds and evidence

Input JSON is limited to 32 KiB and depth 16; transport messages to 128 KiB. Search returns at most 30 entries. Individual resource/tool output is limited to 256 KiB. A product audit allows at most 100 declared source files, 256 KiB per file and 2 MiB total; the policy file is limited to 64 KiB (and parsed tool input rules also bound its JSON). Symlinks resolving outside the project or declared policy scope are rejected. The configured project should be a trusted local working directory, not a sandbox for concurrently hostile filesystem processes. The adapter imports the explicitly selected kit's JavaScript runtime, so select a kit you trust.

Recipe checks cover supported selection options; composition checks cover the currently implemented specification. Static product checks cover declared syntax/import identity, not executed render counts, visual consistency, accessibility or interactions. Continue browser and human review for those judgments. The adapter reports existing dependency-source limitations instead of turning a local dependency snapshot into a clean registry-install claim.

Integration verification uses the independent official SDK client against a copied exported kit with no node_modules. It checks protocol connection, discovery, byte-exact document reads, both lock formats, validators and invalid inputs, escaping paths, changed pins, failed kit integrity, unbound audit refusal and unchanged source files. It does not claim compatibility with every agent client's configuration UI.

Official SDK references: [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), [server API](https://ts.sdk.modelcontextprotocol.io/v2/api/%40modelcontextprotocol/server/server/mcp.html). The adapter pins released npm versions and tests the protocol revision stated above; it does not claim every SDK-supported revision was exercised. Bundled dependency license notices are under `third-party/mcp/` with an index at `third-party/mcp-dependencies.json` in the exported kit.
