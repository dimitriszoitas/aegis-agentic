import { build } from 'vite';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'agent-kit');
const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
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
for (const directory of ['profiles', 'registry', 'schemas', 'contracts']) {
  await cp(join(root, directory), join(out, directory), { recursive: true });
}
await cp(join(root, 'public/ai'), join(out, 'reference-api/ai'), { recursive: true });
await cp(join(root, 'public/llms.txt'), join(out, 'reference-api/llms.txt'));
for (const skill of ['build-ui', 'compose-pattern', 'extend-design-language', 'audit-ui']) {
  await cp(join(root, 'skills', skill), join(out, 'skills', skill), { recursive: true });
}
await mkdir(join(out, 'skills/references'), { recursive: true });
await cp(
  join(root, 'skills/references/agentic-contract.md'),
  join(out, 'skills/references/agentic-contract.md'),
);
await cp(join(root, 'skills/references/design-contract.md'), join(out, 'skills/references/design-contract.md'));
await mkdir(join(out, 'tokens'), { recursive: true });
for (const name of ['design-tokens.json', 'component-categories.json']) {
  await cp(join(root, 'tokens', name), join(out, 'tokens', name));
}
await cp(join(root, 'scripts/infrastructure'), join(out, 'infrastructure'), {
  recursive: true, filter: path => !path.endsWith('.test.mjs'),
});
await mkdir(join(out, 'bin'), { recursive: true });
await cp(join(root, 'scripts/agentic-cli.mjs'), join(out, 'bin/aegis.mjs'));
await cp(join(root, 'LICENSE'), join(out, 'LICENSE'));
const core = await import(
  pathToFileURL(join(out, 'runtime/core.mjs')).href + `?build=${Date.now()}`
);
await mkdir(join(out, 'examples'), { recursive: true });
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
  infrastructure: { cli: 'infrastructure/cli.mjs', protocolVersion: 1, deployment: 'local-single-project' },
  profiles: core.designProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    hash: core.compileProfile(profile).hash,
  })),
  limits: [
    'Initial experiment: one executable composition pattern and TokenInput extension schema.',
    'Local project service only: no hosted multi-tenant authentication, distributed coordination or automatic release.',
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
      bin: { 'aegis-agentic': './bin/aegis.mjs', 'aegis-infra': './infrastructure/cli.mjs' },
      exports: './runtime/core.mjs',
      engines: { node: '>=22' },
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  join(out, 'README.md'),
  '# Aegis Agentic portable kit\n\nStart with `skills/build-ui/SKILL.md`. Run `node bin/aegis.mjs help` for commands. The core runtime has no npm dependencies. Keep this folder together. React component implementations are provided separately by the Aegis Agentic package; this kit defines and validates the design language.\n\nCompile a profile into a consuming project: `node bin/aegis.mjs profile compile profiles/aegis.json --out /path/to/project/agentic-dist`. Apply the emitted CSS after the base Aegis styles and set the documented profile attribute at the document root.\n\nInfrastructure: `node infrastructure/cli.mjs help`. Initialize a new local project with `node infrastructure/cli.mjs init --project /path/to/new-project --id my-project --profile profiles/aegis.json`; inspect `status`, `inventory`, and `plan`. The optional loopback service uses `serve --project /path/to/new-project --reconcile-interval 60`. Its HTTP shapes and limits are in `contracts/infrastructure-api.json`. Telemetry and remote AI start disabled. The runtime exports an explicit usage client; an AI provider is never required for component rendering.\n',
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
