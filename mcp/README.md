# Optional Aegis MCP adapter

This package develops the optional local, read-only MCP adapter. It uses the official `@modelcontextprotocol/server` SDK 2.4.0 with Zod 4.6.7; integration tests use the independent official client SDK 2.4.0. The tested protocol revision is **2025-11-25** over stdio. Node 24 is required.

The exported agent kit contains a bundled `bin/aegis-mcp.mjs`. Its SDK dependencies are included in that separate Node bundle. The React package and core runtime do not import MCP, and an exported kit needs no `mcp/node_modules` installation.

From the repository:

```sh
npm ci --prefix mcp --ignore-scripts
npm run agentic:kit
npm test --prefix mcp
```

The tests connect an independent SDK client to a temporary copy of the exported kit, outside this checkout and without node_modules. Build the kit after adapter changes before running them. They verify discovery, exact file reads, shared validation engines, pinned project binding, invalid inputs, path escapes, source preservation, and reusable prompts. They do not certify every MCP client, browser behavior, or hosted security.

For development, use `node mcp/src/server.mjs --kit /absolute/path/to/agent-kit`. For exported-kit configuration, supported project locks, scope and limitations, read [MCP documentation](../docs/MCP.md). No client configuration is installed or changed automatically.
