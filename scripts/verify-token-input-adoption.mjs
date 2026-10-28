import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build, preview } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'artifacts/token-input-adoption');
await mkdir(output, { recursive: true });
const consumer = await mkdtemp(join(tmpdir(), 'aegis-token-input-adoption-'));
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 120000 });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const packed = JSON.parse(
  run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer]),
);
const installed = join(consumer, 'node_modules', manifest.name);
await mkdir(installed, { recursive: true });
run('tar', ['-xzf', join(consumer, packed[0].filename), '-C', installed, '--strip-components=1']);
// Reuse installed dependency versions, but install Aegis itself exclusively from the packed artifact.
for (const entry of await readdir(join(root, 'node_modules'), { withFileTypes: true })) {
  if (entry.name.startsWith('.') || entry.name === '@dimitriszoitas') continue;
  await symlink(join(root, 'node_modules', entry.name), join(consumer, 'node_modules', entry.name));
}
const runtime = await import(pathToFileURL(join(installed, 'agent-kit/runtime/core.mjs')).href);
const kit = JSON.parse(await readFile(join(installed, 'agent-kit/kit.json'), 'utf8'));
assert.equal(kit.version, manifest.version);
assert.equal(runtime.registry.revision, 2);
const discovered = runtime.discoverRegistry('free text labels');
const component = discovered.find((entry) => entry.id === 'token-input');
assert(component, 'Installed registry must discover TokenInput.');
assert.equal(component.importPath, `${manifest.name}/agentic`);
assert.equal(component.provenance.origin, 'experimental-composition');
assert.equal(component.provenance.reviewedBy, null);
assert.equal(component.version, 2);
const contract = JSON.parse(
  await readFile(join(installed, 'agent-kit', component.contract), 'utf8'),
);
assert.equal(contract.version, 2);
assert.equal(contract.status, 'experimental');
assert(
  (await readFile(join(installed, 'agent-kit', contract.migration), 'utf8')).includes(
    'Asynchronous consumer',
  ),
);
assert.equal(
  JSON.parse(await readFile(join(installed, 'agent-kit', contract.evidence), 'utf8'))
    .contractVersion,
  2,
);
const comparison = JSON.parse(
  await readFile(join(root, 'experiments/token-input/comparison.json'), 'utf8'),
);
for (const [candidate, files] of Object.entries(comparison.inputs.candidateSha256)) {
  for (const [file, expected] of Object.entries(files)) {
    const bytes = await readFile(join(root, 'experiments/token-input', candidate, file));
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      expected,
      `${candidate}/${file} changed`,
    );
  }
}
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: { [manifest.name]: manifest.version },
  }),
);
await writeFile(
  join(consumer, 'index.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed TokenInput adoption</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>`,
);
await writeFile(
  join(consumer, 'main.tsx'),
  `import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TokenInput, type TokenInputAcknowledgment, type TokenInputRequest} from '${component.importPath}';
import {PageLayout, ReadingColumn, ContentGrid} from '${manifest.name}/patterns/page-layout';
import '${manifest.name}/tokens.css';
import '${manifest.name}/reset.css';
import '${manifest.name}/styles.css';
function App(){
 const [values,setValues]=useState<string[]>([]);
 const [acknowledgment,setAcknowledgment]=useState<TokenInputAcknowledgment>();
 function update(next:string[],request:TokenInputRequest): void | false {
  if(request.signal.aborted)return false;
  setValues(next); setAcknowledgment({requestId:request.requestId,status:'accepted'});
 }
 return <main><PageLayout archetype="settings" title="Installed consumer"><TokenInput label="Release labels" values={values} onValuesChange={update} confirmationMode="request" acknowledgment={acknowledgment} validateValue={value=>value==='invalid'?'Review this value':null}/></PageLayout><ReadingColumn measure="compact"><p>Public layout primitives from the installed package.</p></ReadingColumn><ContentGrid maxColumns={2} minItemWidth="small"><p>First summary</p><p>Second summary</p></ContentGrid></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);`,
);
run(
  process.execPath,
  [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--jsx',
    'react-jsx',
    '--moduleResolution',
    'bundler',
    '--module',
    'esnext',
    '--target',
    'es2022',
    '--skipLibCheck',
    join(consumer, 'main.tsx'),
  ],
  consumer,
);
await build({
  configFile: false,
  root: consumer,
  logLevel: 'warn',
  build: { outDir: 'dist', emptyOutDir: true },
  resolve: { dedupe: ['react', 'react-dom'] },
});
const server = await preview({
  configFile: false,
  root: consumer,
  logLevel: 'warn',
  preview: { host: '127.0.0.1', port: 0 },
});
const address = server.httpServer.address();
assert(address && typeof address !== 'string');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const report = {
  schemaVersion: 1,
  packageVersion: manifest.version,
  registryRevision: 2,
  contractVersion: 2,
  consumer,
  tarball: packed[0].filename,
  packageIntegrity: packed[0].integrity,
  sourceImports: false,
  dependencyReuse:
    'Installed Aegis from npm-pack tarball; dependencies reused from local node_modules.',
  originalCandidateHashesUnchanged: true,
  checks: [],
  accessibility: [],
  browserErrors: errors,
};
try {
  await page.goto(`http://127.0.0.1:${address.port}`);
  const field = page.getByRole('textbox', { name: 'Release labels', exact: true });
  await expect(field).toHaveJSProperty('tagName', 'TEXTAREA');
  await expect(page.locator('.aegis-page-layout[data-archetype="settings"]')).toBeVisible();
  await expect(page.locator('.aegis-reading-column')).toHaveCount(2);
  const layoutBounds = await page.locator('.aegis-page-layout').boundingBox();
  assert(layoutBounds.width <= 390, 'Installed settings layout fits the narrow viewport.');
  const gridItems = await page.locator('.aegis-content-grid-item').all();
  assert.equal(gridItems.length, 2);
  const firstItem = await gridItems[0].boundingBox();
  const secondItem = await gridItems[1].boundingBox();
  assert(secondItem.y > firstItem.y, 'Installed content grid collapses at narrow width.');
  await field.fill('UI, platform');
  await field.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Remove UI, platform', exact: true }),
  ).toBeVisible();
  await expect(field).toHaveValue('');
  await field.fill('valid\ninvalid');
  await field.press('Enter');
  await expect(field).toHaveValue('valid\ninvalid');
  await expect(page.getByRole('button', { name: 'Remove valid', exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('Review this value');
  await field.fill('valid\nready');
  await field.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove ready', exact: true })).toBeVisible();
  report.checks.push(
    'Packed registry discovers experimental TokenInput and points to an importable package export.',
    'Installed public TypeScript API compiles without repository aliases.',
    'Production-built consumer uses package TokenInput with correlated request confirmation.',
    'Comma stays literal; invalid batch is atomic and exact multiline draft survives; corrected batch commits.',
    'Original candidate A/B hashes remain unchanged.',
    'Public PageLayout, ReadingColumn and ContentGrid exports compile, render and adapt in the packed consumer.',
  );
  for (const mode of ['light', 'dark']) {
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle('dark', mode === 'dark');
      document.documentElement.dataset.theme = mode;
    }, mode);
    const results = await new AxeBuilder({ page }).analyze();
    assert.equal(results.violations.length, 0, JSON.stringify(results.violations));
    report.accessibility.push({ mode, width: 390, violations: 0 });
    await page.screenshot({ path: join(output, `${mode}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(
    `Verified TokenInput adoption from ${packed[0].filename}: ${report.checks.length} checks, two accessibility scans.`,
  );
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
