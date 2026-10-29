import { build } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { patternPolicyCapability } from './product-pattern-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'agent-kit');
const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const mcpPackage = JSON.parse(await readFile(join(root, 'mcp/package.json'), 'utf8'));
execFileSync(process.execPath, [join(root, 'scripts/generate-contract-catalogue.mjs'), '--check'], {
  stdio: 'inherit',
});
await rm(out, { recursive: true, force: true });
await mkdir(join(out, 'runtime'), { recursive: true });
await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  build: {
    outDir: join(out, 'runtime'),
    emptyOutDir: true,
    target: 'es2022',
    minify: false,
    lib: { entry: join(root, 'src/agentic/index.ts'), formats: ['es'], fileName: () => 'core.mjs' },
  },
});
// The optional static source checker is a separate Node bundle. The browser/core runtime
// remains independent of TypeScript, the filesystem and this parser's bundle size.
await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  ssr: { noExternal: ['typescript'], target: 'node' },
  build: {
    ssr: join(root, 'scripts/product-pattern-policy.mjs'),
    outDir: join(out, 'runtime'),
    emptyOutDir: false,
    target: 'node24',
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: 'pattern-policy.mjs',
        // TypeScript's Node host initializes these CommonJS globals even when only
        // its in-memory parser/checker is used. Supply their ESM equivalents.
        banner:
          "import { fileURLToPath as aegisFileURLToPath } from 'node:url';\nimport { dirname as aegisDirname } from 'node:path';\nconst __filename = aegisFileURLToPath(import.meta.url);\nconst __dirname = aegisDirname(__filename);",
      },
    },
  },
});
for (const directory of ['profiles', 'registry', 'schemas', 'contracts']) {
  await cp(join(root, directory), join(out, directory), { recursive: true });
}
await cp(
  join(root, 'experiments/token-input/consolidated'),
  join(out, 'experiments/token-input/consolidated'),
  { recursive: true },
);
await cp(join(root, 'public/ai'), join(out, 'reference-api/ai'), { recursive: true });
await cp(join(root, 'public/llms.txt'), join(out, 'reference-api/llms.txt'));
for (const skill of [
  'build-ui',
  'systemize-repo',
  'compose-pattern',
  'extend-design-language',
  'audit-ui',
  'create-component',
  'create-token',
  'create-layout',
]) {
  await cp(join(root, 'skills', skill), join(out, 'skills', skill), { recursive: true });
}
await mkdir(join(out, 'skills/references'), { recursive: true });
await cp(
  join(root, 'skills/references/agentic-contract.md'),
  join(out, 'skills/references/agentic-contract.md'),
);
await cp(
  join(root, 'skills/references/design-contract.md'),
  join(out, 'skills/references/design-contract.md'),
);
await cp(
  join(root, 'skills/references/pattern-policy.md'),
  join(out, 'skills/references/pattern-policy.md'),
);
await cp(
  join(root, 'skills/references/page-composition.md'),
  join(out, 'skills/references/page-composition.md'),
);
await mkdir(join(out, 'tokens'), { recursive: true });
for (const name of ['design-tokens.json', 'component-categories.json']) {
  await cp(join(root, 'tokens', name), join(out, 'tokens', name));
}
await cp(join(root, 'scripts/infrastructure'), join(out, 'infrastructure'), {
  recursive: true,
  filter: (path) => !path.endsWith('.test.mjs'),
});
await mkdir(join(out, 'bin'), { recursive: true });
await cp(join(root, 'scripts/agentic-cli.mjs'), join(out, 'bin/aegis.mjs'));
// Ship the optional stdio adapter as a self-contained Node entry. No installation
// inside an immutable kit, SDK dependency in React, or global client config is needed.
await build({
  configFile: false,
  publicDir: false,
  logLevel: 'warn',
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: join(root, 'mcp/src/server.mjs'),
    outDir: join(out, 'bin'),
    emptyOutDir: false,
    target: 'node24',
    minify: false,
    rollupOptions: { output: { entryFileNames: 'aegis-mcp.mjs' } },
  },
});
const mcpLock = JSON.parse(await readFile(join(root, 'mcp/package-lock.json'), 'utf8'));
const notices = [];
for (const [dependencyPath, dependency] of Object.entries(mcpLock.packages)) {
  if (!dependencyPath || dependency.dev) continue;
  const installed = join(root, 'mcp', dependencyPath);
  const metadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  const destination = join('third-party/mcp', metadata.name);
  await mkdir(join(out, destination), { recursive: true });
  const licenseFiles = (await readdir(installed)).filter((name) =>
    /^(license|licence|notice)(\.|$)/i.test(name),
  );
  if (!licenseFiles.length) throw new Error(`Missing dependency license: ${metadata.name}`);
  for (const name of licenseFiles) await cp(join(installed, name), join(out, destination, name));
  notices.push({
    name: metadata.name,
    version: metadata.version,
    license: metadata.license,
    notices: licenseFiles.map((name) => join(destination, name)),
  });
}
await writeFile(
  join(out, 'third-party/mcp-dependencies.json'),
  JSON.stringify(notices, null, 2) + '\n',
);
await mkdir(join(out, 'docs'), { recursive: true });
for (const name of [
  'CONTRACTS.md',
  'MCP.md',
  'BRAND-PACKAGES.md',
  'PROJECT-RECIPES.md',
  'ACCEPTANCE.md',
  'SOURCE-REPAIR.md',
]) {
  await cp(join(root, 'docs', name), join(out, 'docs', name));
}
await cp(join(root, 'LICENSE'), join(out, 'LICENSE'));
const core = await import(
  pathToFileURL(join(out, 'runtime/core.mjs')).href + `?build=${Date.now()}`
);
await mkdir(join(out, 'recipes'), { recursive: true });
await writeFile(
  join(out, 'recipes/page-layout.json'),
  JSON.stringify(core.pageLayoutRecipes, null, 2) + '\n',
);
await mkdir(join(out, 'examples'), { recursive: true });
await cp(
  join(root, 'contracts/composition/project-recipes.json'),
  join(out, 'contracts/composition/project-recipes.json'),
);
await cp(join(root, 'src/product/project-recipes.json'), join(out, 'examples/forma.recipes.json'));
await writeFile(
  join(out, 'examples/project-recipes.json'),
  JSON.stringify(
    core.normalizeProjectRecipes({
      schemaVersion: 1,
      project: 'my-product',
      revision: 1,
      recipes: {},
    }),
    null,
    2,
  ) + '\n',
);
await writeFile(
  join(out, 'examples/brand-package.json'),
  core.serializeBrandPackage(core.createBrandPackage(core.designProfiles[0])),
);
await writeFile(
  join(out, 'examples/token-import.json'),
  JSON.stringify(
    {
      palette: {
        brand: {
          $type: 'color',
          $value: { colorSpace: 'srgb', components: [0.36, 0.25, 0.8], alpha: 1 },
        },
      },
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  join(out, 'examples/token-mapping.json'),
  JSON.stringify([{ field: 'brand', tokenPath: 'palette.brand' }], null, 2) + '\n',
);
await writeFile(
  join(out, 'examples/composition.json'),
  JSON.stringify(
    {
      ...core.defaultCompositionSpec,
      profileId: core.designProfiles[0].id,
      profileHash: core.compileProfile(core.designProfiles[0]).hash,
    },
    null,
    2,
  ) + '\n',
);
execFileSync(process.execPath, [join(root, 'scripts/check-agentic-coverage.mjs'), '--check'], {
  stdio: 'inherit',
});
const manifest = {
  schemaVersion: 1,
  name: packageInfo.name,
  version: packageInfo.version,
  baseline: '12e4f6b218c6cc68aba303feec211ba91aaeb20a',
  registryRevision: core.registry.revision,
  compilerVersion: '1',
  entry: 'skills/build-ui/SKILL.md',
  cli: 'bin/aegis.mjs',
  runtime: 'runtime/core.mjs',
  contractCatalogue: {
    path: 'reference-api/ai/contract-catalogue.json',
    guidance: 'docs/CONTRACTS.md',
    cli: 'contracts list|search|get|coverage',
    coverageScope: 'explicit-source-bindings-and-reported-evidence',
  },
  publicEntryCoverage: {
    path: 'reference-api/ai/public-entry-coverage.json',
    scope: 'authored-ui-entry-ownership-not-certification',
    sha256: createHash('sha256')
      .update(await readFile(join(root, 'public/ai/public-entry-coverage.json')))
      .digest('hex'),
  },
  authoringGuidance: {
    requiredWorkflow: 'library-source-checkout',
    skills: {
      'create-component': 'skills/create-component/SKILL.md',
      'create-token': 'skills/create-token/SKILL.md',
      'create-layout': 'skills/create-layout/SKILL.md',
    },
    limitation:
      'Installed guidance is portable; implementation changes and repository checks require a writable source checkout. Do not edit an installed package in node_modules.',
  },
  repositorySystemization: {
    guidance: 'skills/systemize-repo/SKILL.md',
    references: [
      'skills/systemize-repo/references/consolidation.md',
      'skills/systemize-repo/references/systemization-record.md',
      'skills/systemize-repo/references/accessibility.md',
    ],
    workflow: 'agent-assisted-staged-refactor',
    defaultDesignTreatment: 'preserve-existing',
    automaticMigration: false,
  },
  mcp: {
    entry: 'bin/aegis-mcp.mjs',
    transport: 'stdio',
    verifiedProtocolVersion: '2025-11-25',
    sdk: {
      name: '@modelcontextprotocol/server',
      version: mcpPackage.dependencies['@modelcontextprotocol/server'],
    },
    guidance: 'docs/MCP.md',
    readOnly: true,
    binding: 'explicit-project-lock-or-unbound-discovery',
  },
  patternPolicy: patternPolicyCapability,
  pageComposition: {
    recipeVersion: core.pageLayoutRecipes.version,
    registryId: 'page-layout',
    contract: 'contracts/agentic/page-layout.json',
    recipes: 'recipes/page-layout.json',
    guidance: 'skills/references/page-composition.md',
    importPath: `${packageInfo.name}/patterns/page-layout`,
    exports: ['PageLayout', 'ReadingColumn', 'ContentGrid'],
    archetypes: Object.keys(core.pageLayoutRecipes.recipes),
    validator: 'validatePageLayoutRecipe',
    validationScope: 'recipe-selection-only',
    cli: { recipes: 'pages recipes', validate: 'pages validate <selection.json>' },
  },
  designPortability: {
    brandSchema: 'schemas/brand-package.schema.json',
    guidance: 'docs/BRAND-PACKAGES.md',
    brandExample: 'examples/brand-package.json',
    dtcg: {
      formatVersion: '2025.10',
      scope: 'documented-subset',
      previewOnly: true,
      configurations: core.configurations,
    },
  },
  projectRecipes: {
    guidance: 'docs/PROJECT-RECIPES.md',
    requirements: 'contracts/composition/project-recipes.json',
    example: 'examples/project-recipes.json',
    validator: 'validateProjectRecipes',
    resolver: 'resolveProjectRecipe',
    discovery: 'discoverByBehavior',
  },
  sourceRepair: {
    inventory: 'reference-api/ai/repair-catalogue.json',
    guidance: 'docs/SOURCE-REPAIR.md',
    sourceCheckoutRequired: true,
    autoPublish: false,
  },
  acceptance: {
    inventory: 'reference-api/ai/acceptance-inventory.json',
    guidance: 'docs/ACCEPTANCE.md',
    scope: 'registered-finite-scenarios-not-executed-certification',
    sourceCheckoutRequiredForBrowserRunner: true,
  },
  infrastructure: {
    cli: 'infrastructure/cli.mjs',
    protocolVersion: 1,
    deployment: 'local-single-project',
    workspaceCli: 'infrastructure/workspace-cli.mjs',
    workspaceProtocol: 'contracts/workspace-api.json',
    workspaceDeployment: 'authenticated-single-host',
  },
  profiles: core.designProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    hash: core.compileProfile(profile).hash,
  })),
  limits: [
    'Experimental dataset filtering, consolidated TokenInput and four initial page-layout recipes; these do not cover every possible component or page.',
    'Page recipe validation checks supported selection options and supplied slot names, not rendered semantics, visual quality or nested interaction behavior.',
    'Authenticated multi-project workspace on one local filesystem host; no managed hosting, SSO, distributed coordination or automatic release.',
    'Optional remote AI advisory requires explicit model, server credentials and project opt-in; proposals never execute automatically.',
    'Periodic reconciliation repairs derived artifacts only while the local service is running; no operating-system daemon is installed.',
    'Selected static contrast checks do not establish full accessibility.',
    'Registry revision checks coordinate one shared filesystem; Git review coordinates branches.',
  ],
};
await writeFile(join(out, 'kit.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: '@dimitriszoitas/aegis-agent-kit',
      version: packageInfo.version,
      private: true,
      type: 'module',
      bin: {
        'aegis-agentic': './bin/aegis.mjs',
        'aegis-infra': './infrastructure/cli.mjs',
        'aegis-workspace': './infrastructure/workspace-cli.mjs',
        'aegis-mcp': './bin/aegis-mcp.mjs',
      },
      exports: './runtime/core.mjs',
      engines: { node: '>=24 <25' },
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  join(out, 'README.md'),
  '# Aegis Agentic portable kit\n\nStart with `skills/build-ui/SKILL.md` for new interfaces or `skills/systemize-repo/SKILL.md` to organize an existing product while preserving its design language and interaction intent. Systemization is an agent-assisted staged refactor, not a migration CLI. Inspect contract coverage with `node bin/aegis.mjs contracts coverage`. The optional read-only MCP adapter is `bin/aegis-mcp.mjs`; see `docs/MCP.md` for explicit binding and supported protocol. Run `node bin/aegis.mjs help` for commands. The core runtime has no npm dependencies. Keep this folder together. React component implementations are provided separately by the Aegis Agentic package; this kit defines and validates the design language.\n\nCompile a profile into a consuming project: `node bin/aegis.mjs profile compile profiles/aegis.json --out /path/to/project/agentic-dist`. Apply the emitted CSS after the base Aegis styles and set the documented profile attribute at the document root.\n\nInfrastructure: `node infrastructure/cli.mjs help`. Initialize a new local project with `node infrastructure/cli.mjs init --project /path/to/new-project --id my-project --profile profiles/aegis.json`; inspect `status`, `inventory`, and `plan`. The optional loopback service uses `serve --project /path/to/new-project --reconcile-interval 60`. Its HTTP shapes and limits are in `contracts/infrastructure-api.json`. Telemetry and remote AI start disabled. The runtime exports an explicit usage client; an AI provider is never required for component rendering.\n\nShared workspace (Node 24): `node infrastructure/workspace-cli.mjs help`. Supports signed kit installation, scoped bearer credentials, multiple projects, reviewed generation activation and rollback. Protocol: `contracts/workspace-api.json`. Single-host local filesystem only; no SSO or managed hosting.\n',
);
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name),
      ),
    )
  ).flat();
}
const integrity = {};
for (const file of (await files(out)).sort())
  integrity[relative(out, file)] = createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
await writeFile(join(out, 'integrity.json'), JSON.stringify(integrity, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      kit: out,
      version: manifest.version,
      files: Object.keys(integrity).length,
      profiles: manifest.profiles,
      registryRevision: manifest.registryRevision,
    },
    null,
    2,
  ),
);
