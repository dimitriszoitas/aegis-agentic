/** Exercise the new public entries from an actual packed artifact, without source aliases. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumer = await mkdtemp(join(tmpdir(), 'aegis-form-collection-consumer-'));
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const output = join(root, 'artifacts/forms-collections-package');
await mkdir(output, { recursive: true });
const report = {
  status: 'running',
  packageVersion: manifest.version,
  consumer,
  checks: [],
  limits: [
    'Installs the actual npm tarball while reusing local third-party dependencies; a fresh registry installation is not verified.',
    'Public types, module loading, server markup and production bundling are checked here. Browser interaction and accessibility are separate Storybook evidence.',
  ],
};
function run(command, args) {
  const result = spawnSync(command, args, { cwd: consumer, encoding: 'utf8', timeout: 120000 });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}
try {
  const packed = JSON.parse(
    run('npm', [
      'pack',
      root,
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      consumer,
      '--cache',
      join(consumer, '.npm-cache'),
    ]),
  );
  const tarball = join(consumer, packed[0].filename);
  report.tarballSha256 = createHash('sha256')
    .update(await readFile(tarball))
    .digest('hex');
  const installed = join(consumer, 'node_modules', manifest.name);
  await mkdir(installed, { recursive: true });
  run('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1']);
  for (const entry of await readdir(join(root, 'node_modules'), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '@dimitriszoitas') continue;
    await symlink(
      join(root, 'node_modules', entry.name),
      join(consumer, 'node_modules', entry.name),
    );
  }
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await writeFile(
    join(consumer, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Form and collection package verification</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  await writeFile(
    join(consumer, 'main.tsx'),
    `
import { createRoot } from 'react-dom/client';
import { PasswordInput, type PasswordInputProps } from '${manifest.name}/password-input';
import { NumberInput, type NumberInputProps } from '${manifest.name}/number-input';
import { CollectionToolbar, type CollectionToolbarProps } from '${manifest.name}/patterns/collection-toolbar';
import { FormSection, type FormSectionProps } from '${manifest.name}/patterns/form-section';
import { PasswordInput as RootPasswordInput, NumberInput as RootNumberInput } from '${manifest.name}';
import { CollectionToolbar as PatternToolbar, FormSection as PatternSection } from '${manifest.name}/patterns';
import '${manifest.name}/styles.css';
const password: PasswordInputProps = {label:'Password', defaultValue:'local-demo', autoComplete:'new-password'};
const number: NumberInputProps = {label:'Seats', value:null, min:1, max:100, onValueChange:(value, details)=>{ if (value === 7) details.cancel(); }, onValueCommitted:(_value, details)=>{ String(details.reason); }};
const toolbar: CollectionToolbarProps = {label:'Collection controls',searchLabel:'Find records',query:'',onQueryChange:()=>{},resultCount:0,actions:({disabled})=><button disabled={disabled}>Add record</button>};
const section: FormSectionProps = {legend:'Account',maxColumns:2,children:<><PasswordInput {...password}/><NumberInput {...number}/></>};
if (PasswordInput !== RootPasswordInput || NumberInput !== RootNumberInput || CollectionToolbar !== PatternToolbar || FormSection !== PatternSection) throw new Error('Public re-exports differ');
createRoot(document.getElementById('root')!).render(<main><h1>Form and collection package verification</h1><CollectionToolbar {...toolbar}/><FormSection {...section}/></main>);
`,
  );
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      include: ['main.tsx'],
    }),
  );
  run(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    join(consumer, 'tsconfig.json'),
  ]);
  report.checks.push(
    'The four direct public subpaths, root component exports and pattern barrel compile with public prop and callback types.',
  );
  await writeFile(
    join(consumer, 'verify.mjs'),
    String.raw`
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { PasswordInput } from '${manifest.name}/password-input';
import { NumberInput } from '${manifest.name}/number-input';
import { CollectionToolbar } from '${manifest.name}/patterns/collection-toolbar';
import { FormSection } from '${manifest.name}/patterns/form-section';
const password=render(h(PasswordInput,{label:'Password',name:'password',defaultValue:'local-demo'}));
assert.match(password,/type="password"/); assert.match(password,/aria-label="Show password"/);
const number=render(h(NumberInput,{label:'Amount',name:'amount',defaultValue:1234.5,locale:'de-DE',format:{minimumFractionDigits:2}}));
assert.match(number,/value="1.234,50"/); assert.match(number,/name="amount"/); assert.match(number,/value="1234.5"/);
const toolbar=render(h(CollectionToolbar,{label:'Collection controls',searchLabel:'Find records',query:'',onQueryChange:()=>{},resultCount:0}));
assert.match(toolbar,/aria-label="Collection controls"/); assert.match(toolbar,/0 results/);
const section=render(h(FormSection,{legend:'Account',description:'Shared settings',disabled:true},h(PasswordInput,{label:'Password'})));
assert.match(section,/<fieldset[^>]*disabled/); assert.match(section,/<legend[^>]*>Account<\/legend>/); assert.doesNotMatch(section,/<form[ >]/);
console.log('Public installed components preserve password, localized numeric, collection and native fieldset markup.');
`,
  );
  run(process.execPath, [join(consumer, 'verify.mjs')]);
  report.checks.push(
    'Installed module server rendering preserves concealed passwords, localized numbers with raw form values, collection status and native fieldset semantics.',
  );
  await build({
    configFile: false,
    root: consumer,
    logLevel: 'warn',
    build: { outDir: 'dist', emptyOutDir: true },
    resolve: { dedupe: ['react', 'react-dom'] },
  });
  const assets = join(consumer, 'dist/assets');
  const css = (
    await Promise.all(
      (await readdir(assets))
        .filter((name) => name.endsWith('.css'))
        .map((name) => readFile(join(assets, name), 'utf8')),
    )
  ).join('\n');
  for (const selector of [
    'aegis-password-toggle',
    'aegis-number-input',
    'aegis-collection-toolbar',
    'aegis-form-section',
  ])
    assert(css.includes(selector), `Missing packed styles for ${selector}`);
  report.checks.push(
    'A source-independent Vite production build includes all four components and their packaged styles.',
  );
  const catalogue = JSON.parse(
    await readFile(join(installed, 'agent-kit/reference-api/ai/contract-catalogue.json'), 'utf8'),
  );
  for (const id of ['password-input', 'number-input', 'collection-toolbar', 'form-section']) {
    const entry = catalogue.entries.find((entry) => entry.registryId === id);
    assert(
      entry?.api && entry.contract?.document.schemaVersion === 2,
      `Missing installed API/contract mapping: ${id}`,
    );
    assert.equal(
      await readFile(join(installed, 'agent-kit', entry.contract.source.path), 'utf8'),
      entry.contract.raw,
    );
  }
  report.checks.push(
    'The packed kit discovers all four API families and exact schema-2 contracts.',
  );
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
