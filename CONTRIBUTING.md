# Contributing to the beta

This is a personal design-system experiment. Feedback, reproducible issues and focused pull requests are welcome. API and behavior changes can occur during the beta; pin a reviewed commit in projects that depend on it.

## Run locally

Use Node 24 and the pnpm version declared in `package.json`.

```sh
git clone https://github.com/dimitriszoitas/aegis-agentic.git
cd aegis-agentic
pnpm install --frozen-lockfile
npm run mcp:setup
npm run storybook
```

Storybook opens on localhost:6006. `npm run dev` starts the workbench; `?view=product` opens the standalone Forma demo. Both default to your own computer. The public Storybook's Application Demo contains the same five-page product. Demo records stay in browser storage; use sample data.

To build a local package, run `npm run agentic:kit`, `npm run build:package` and `npm pack`. GitHub source availability is separate from npm publication. The checked-in npm publish configuration remains restricted; no public registry release is promised.

## Change the system coherently

Read the relevant source skill before making a change:

- [Components](skills/create-component/SKILL.md)
- [Tokens](skills/create-token/SKILL.md)
- [Layouts and patterns](skills/create-layout/SKILL.md)

These share [the design contract](skills/references/design-contract.md). Reuse canonical components and each product's recorded pattern decisions. Include appropriate Storybook examples, authored behavior contracts, generated metadata and evidence for affected interactions. Preserve the distinction between component responsibilities and work owned by the consuming application.

Run focused checks while developing, then `npm run check` before proposing a library change. For Forma changes, also run `npm run product:browser`; install Playwright Chromium first if needed. Regenerate source-derived documentation only after implementations are stable.

Keep changes on a feature branch and open a pull request against `beta`. Include what changed, why, how it was verified and any remaining limits. Do not commit private data, credentials, vendor-restricted code or assets without redistribution rights. Review [third-party notices](THIRD_PARTY_NOTICES.md) and use [private reporting](SECURITY.md) for security issues.

The Storybook publishing command targets the dedicated public site repository and requires maintainer access. Contributions do not automatically publish a package, deploy a service or update consumer pins.
