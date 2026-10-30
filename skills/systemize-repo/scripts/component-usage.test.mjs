import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { auditComponentUsage } from './component-usage.mjs';
import { discoverUI } from './ui-discovery.mjs';

// Only TypeScript is loaded. The fixture and consumer application modules are
// never imported. Prefer this checkout's dependency; an override can point at
// any installed consumer package.json when testing a portable skill copy.
const dependencyAnchors = [
  process.env.COMPONENT_USAGE_TYPESCRIPT_PACKAGE ?? import.meta.url,
  path.join(process.cwd(), 'package.json'),
];
let typescriptDirectory;
for (const anchor of dependencyAnchors) {
  try {
    typescriptDirectory = path.dirname(createRequire(anchor).resolve('typescript/package.json'));
    break;
  } catch {
    // A copied skill may live outside a package; try the explicit consumer.
  }
}
if (!typescriptDirectory) throw new Error('Install TypeScript or set COMPONENT_USAGE_TYPESCRIPT_PACKAGE to a consumer package.json.');

function fixture(t, files, { entry = 'src/main.tsx' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'component-usage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  fs.symlinkSync(typescriptDirectory, path.join(root, 'node_modules/typescript'), 'dir');
  const sourceFiles = {
    'package.json': JSON.stringify({ name: 'usage-fixture', type: 'module' }),
    'tsconfig.json': JSON.stringify({ compilerOptions: {
      target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
      jsx: 'react-jsx', baseUrl: '.', paths: { '@/*': ['src/*'] },
      strict: true, types: [], noLib: true,
    } }),
    ...files,
  };
  for (const [name, source] of Object.entries(sourceFiles)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  return {
    root,
    audit: (options = {}) => auditComponentUsage({ root, entries: [entry], ...options }),
  };
}

function byFile(report, file) {
  const record = report.entries.find((entry) => entry.file === file);
  assert.ok(record, `Expected inventory record for ${file}`);
  return record;
}

function component(name) {
  return `export function ${name}() { return null; }\n`;
}

test('discovery follows arbitrary folders and inline pages even with a narrow prior inventory', (t) => {
  const { root, audit } = fixture(t, {
    'src/main.tsx': `import { Shell } from '../screens/Shell'; export const app = Shell;`,
    'screens/Shell.jsx': `import { Custom } from '../business/widgets/Custom'; export function Shell() { return <main><Custom /></main>; }`,
    'business/widgets/Custom.tsx': `export function Custom() { return <section><label>Choice</label><div><button>Pick</button></div></section>; }`,
    'product/proxy-reusables/Orphan.tsx': component('Orphan'),
    'arbitrary/NoJsx.ts': `export function NoJsx() { return React.createElement('button', null, 'Save'); }`,
    'prior.json': JSON.stringify({ entries: [{ file: 'product/proxy-reusables/Orphan.tsx' }] }),
  });
  const discovered = discoverUI({ root });
  for (const name of ['screens/Shell.jsx', 'business/widgets/Custom.tsx', 'product/proxy-reusables/Orphan.tsx', 'arbitrary/NoJsx.ts']) assert.ok(discovered.entries.some((row) => row.file === name), name);
  const report = audit({ inventory: 'prior.json' });
  assert.equal(byFile(report, 'business/widgets/Custom.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'product/proxy-reusables/Orphan.tsx').status, 'no-detected-reference');
  assert.ok(report.scope.directories.some((item) => item.directory === 'business/widgets'));
});

test('reports inline anatomy, configured utilities and literals without automatically treating them as violations', (t) => {
  const { root } = fixture(t, {
    'src/main.tsx': `export function App() { return <section className="p-4 bg-red-500 text-sm"><h2>Title</h2><div style={{ padding: 17, color: 'var(--group-color)', width: measuredWidth }}><button>Accept</button></div></section>; }`,
    'features/Copy.tsx': `export function Copy() { return <section className="p-8 bg-blue-500 text-lg"><h2>Another</h2><div style={{ padding: 21 }}><button>Reject</button></div></section>; }`,
    'features/styles.css': '.local { padding: 17px; color: #c0ffee; }',
  });
  const report = discoverUI({ root });
  assert.ok(report.findings.some((row) => row.kind === 'inline-ui' && row.file === 'src/main.tsx'));
  assert.ok(report.findings.some((row) => row.kind === 'inline-design-value' && row.detail.includes('padding: 17')));
  assert.ok(!report.findings.some((row) => row.kind === 'inline-design-value' && /measuredWidth|var\(--group-color\)/.test(row.detail)));
  assert.ok(report.findings.some((row) => row.kind === 'utility-design-value' && row.values.includes('p-4')));
  assert.ok(report.findings.some((row) => row.kind === 'style-literal' && row.values.includes('#c0ffee')));
  assert.equal(report.repetitions.length, 1);
  assert.equal(report.repetitions[0].occurrences.length, 2);
  assert.ok(report.findings.every((row) => row.status === 'unreviewed'));
});

test('records exclusions, generated owners and unsupported templates instead of silently declaring complete coverage', (t) => {
  const { root } = fixture(t, {
    'src/main.tsx': 'export const app = null;',
    'features/View.vue': '<template><button>Save</button></template>',
    'generated/Special.tsx': 'export function Special() { return <button>Generated is just a folder name here</button>; }',
    'src/derived.tsx': '// @generated\nexport function Derived() { return <button/>; }',
    'dist/Output.tsx': component('Output'),
    'features/Example.stories.tsx': 'export function Example() { return <div style={{padding:88}}/>; }',
  });
  const report = discoverUI({ root });
  assert.ok(report.scope.skipped.some((row) => row.path === 'dist'));
  assert.ok(report.scope.skipped.some((row) => row.path === 'src/derived.tsx' && row.reason.includes('generated header')));
  assert.ok(report.entries.some((row) => row.file === 'generated/Special.tsx'));
  assert.ok(report.findings.some((row) => row.kind === 'framework-review' && row.file === 'features/View.vue'));
  assert.ok(!report.findings.some((row) => row.file.endsWith('.stories.tsx')));
  assert.equal(report.scope.scopeReview, 'required');
});

test('surfaces stale supplemental inventory paths and discovers new files regardless of the inventory', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': 'export const app = null;',
    'any-folder/New.tsx': component('New'),
    'prior.json': JSON.stringify({ entries: [{ file: 'deleted/Old.tsx' }] }),
  });
  const report = audit({ inventory: 'prior.json' });
  assert.deepEqual(report.missingInventoryFiles, ['deleted/Old.tsx']);
  assert.ok(byFile(report, 'any-folder/New.tsx'));
});

test('traces actual value uses through aliases, selected barrels, wrappers, side effects and literal lazy imports', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `
      import { RenamedButton } from '@/components';
      import { Wrapper } from '@/components/Wrapper';
      import type { TypeOnlyProps } from '@/components/TypeOnly';
      import { TypeQueryOnly } from '@/components/TypeQueryOnly';
      import '@/startup';
      type Query = typeof TypeQueryOnly;
      export const app = [RenamedButton, Wrapper];
      export const load = () => import('@/components/Lazy');
      // Executing this fixture would fail; the audit must only read its source.
      throw new Error('Application source must never execute');
    `,
    'src/components/index.ts': `
      export { UsedButton as RenamedButton } from './UsedButton';
      export { UnusedSibling } from './UnusedSibling';
    `,
    'src/components/UsedButton.tsx': component('UsedButton'),
    'src/components/UnusedSibling.tsx': component('UnusedSibling'),
    'src/components/Wrapper.tsx': `import { NestedControl } from './NestedControl'; export function Wrapper() { return NestedControl(); }`,
    'src/components/NestedControl.tsx': component('NestedControl'),
    'src/components/TypeOnly.tsx': `export type TypeOnlyProps = { value: string }; ${component('TypeOnly')}`,
    'src/components/TypeQueryOnly.tsx': component('TypeQueryOnly'),
    'src/components/Lazy.tsx': component('Lazy'),
    'src/startup.ts': `import { SideEffectControl } from './components/SideEffectControl'; export const registration = SideEffectControl;`,
    'src/components/SideEffectControl.tsx': component('SideEffectControl'),
  });
  const report = audit();
  for (const name of ['UsedButton', 'Wrapper', 'NestedControl', 'Lazy', 'SideEffectControl']) {
    assert.equal(byFile(report, `src/components/${name}.tsx`).status, 'app-reachable', name);
  }
  for (const name of ['UnusedSibling', 'TypeOnly', 'TypeQueryOnly']) {
    assert.equal(byFile(report, `src/components/${name}.tsx`).status, 'no-detected-reference', name);
  }
  assert.deepEqual(byFile(report, 'src/components/NestedControl.tsx').appPath,
    ['src/main.tsx', 'src/components/Wrapper.tsx', 'src/components/NestedControl.tsx']);
  assert.ok(byFile(report, 'src/components/UsedButton.tsx').incoming.some((edge) => edge.kind === 'runtime symbol reference' && edge.symbol === 'UsedButton'));
  assert.deepEqual(report.unresolvedAppEdges, []);
  for (const row of report.entries) {
    assert.equal(row.removalDecision, 'not-authorized-by-this-report');
    assert.equal(row.runtimeObservation, 'not-measured');
  }
});

test('separates stories, tests, shared fixtures, public-only exports and unreferenced files', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': 'export const app = null;',
    'src/components/OnlyStory.tsx': component('OnlyStory'),
    'src/components/OnlyTest.tsx': component('OnlyTest'),
    'src/components/Both.tsx': component('Both'),
    'src/components/OnlyPublic.tsx': component('OnlyPublic'),
    'src/components/Unused.tsx': component('Unused'),
    'src/components/example.stories.tsx': `import { OnlyStory } from './OnlyStory'; import { Both } from './Both'; export const Example = () => [OnlyStory(), Both()];`,
    'src/components/example.test.tsx': `import { OnlyTest } from './OnlyTest'; import { Both } from './Both'; export const assertion = [OnlyTest(), Both()];`,
    'src/public.ts': `export { OnlyPublic } from './components/OnlyPublic';`,
  });
  const report = audit({ publicEntries: ['src/public.ts'] });
  for (const [name, status] of Object.entries({
    OnlyStory: 'stories-only', OnlyTest: 'tests-only', Both: 'stories-and-tests-only',
    OnlyPublic: 'public-api-only', Unused: 'no-detected-reference',
  })) assert.equal(byFile(report, `src/components/${name}.tsx`).status, status, name);
  assert.equal(byFile(report, 'src/components/OnlyPublic.tsx').publicExport, true);
  assert.ok(byFile(report, 'src/components/Both.tsx').storyPath);
  assert.ok(byFile(report, 'src/components/Both.tsx').testPath);
});

for (const [kind, expression] of [
  ['dynamic import', `const moduleName = './components/Uncertain'; export const load = () => import(moduleName);`],
  ['glob registry', `export const registry = import.meta.glob('./components/*.tsx');`],
]) test(`${kind} in app marks negative results uncertain without hiding positive evidence`, (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { Known } from './components/Known'; export const app = Known; ${expression}`,
    'src/components/Known.tsx': component('Known'),
    'src/components/Uncertain.tsx': component('Uncertain'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Known.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'src/components/Uncertain.tsx').status, 'uncertain');
  assert.equal(report.unresolvedAppEdges.length, 1);
});

test('unresolved imports in story-only source do not contaminate application negatives', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': 'export const app = null;',
    'src/components/Unused.tsx': component('Unused'),
    'src/components/dynamic.stories.tsx': `export const load = (name) => import(name);`,
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Unused.tsx').status, 'no-detected-reference');
  assert.equal(report.unresolvedAppEdges.length, 0);
  assert.equal(report.unresolvedOtherEdges.length, 1);
});

test('used unresolved local named imports prevent definitive negative results', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { Missing } from './missing-generated-registry'; export const app = Missing;`,
    'src/components/Uncertain.tsx': component('Uncertain'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Uncertain.tsx').status, 'uncertain');
  assert.ok(report.unresolvedAppEdges.some((edge) => edge.expression.includes('missing-generated-registry')));
});

test('literal namespace property access resolves the selected export without including siblings', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import * as UI from './components'; export const app = UI['Selected'];`,
    'src/components/index.ts': `export { Selected } from './Selected'; export { Other } from './Other';`,
    'src/components/Selected.tsx': component('Selected'),
    'src/components/Other.tsx': component('Other'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Selected.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'src/components/Other.tsx').status, 'no-detected-reference');
});

test('computed namespace registry access is not mistaken for proven nonuse', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import * as UI from './components'; export const resolve = (name: string) => UI[name];`,
    'src/components/index.ts': `export { Possible } from './Possible';`,
    'src/components/Possible.tsx': component('Possible'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Possible.tsx').status, 'uncertain');
  assert.ok(report.unresolvedAppEdges.length > 0);
});

test('requires real entry points and validates explicit public entry points', (t) => {
  const { audit } = fixture(t, { 'src/components/Unused.tsx': component('Unused') });
  assert.throws(() => audit(), /real application entry points/i);
  assert.throws(() => audit({ entries: [] }), /real application entry points/i);
  const real = fixture(t, { 'src/main.tsx': 'export const app = null;' });
  assert.throws(() => real.audit({ publicEntries: ['src/missing.ts'] }), /Public entry does not exist/);
});

test('infers the real HTML module entry and supplements rather than restricts an explicit inventory', (t) => {
  const { audit } = fixture(t, {
    'index.html': '<script type="module" src="/src/main.tsx"></script>',
    'src/main.tsx': `import { Included } from './controls/Included'; export const app = Included;`,
    'src/controls/Included.tsx': component('Included'),
    'src/components/NotInventoried.tsx': component('NotInventoried'),
    'inventory.json': JSON.stringify({ entries: [{ file: 'src/controls/Included.tsx' }] }),
  });
  const report = audit({ entries: undefined, inventory: 'inventory.json' });
  assert.deepEqual(report.appEntries, ['src/main.tsx']);
  assert.deepEqual(report.entries.map((row) => row.file), ['src/components/NotInventoried.tsx', 'src/controls/Included.tsx', 'src/main.tsx']);
  assert.equal(byFile(report, 'src/controls/Included.tsx').status, 'app-reachable');
});

test('runtime property names resolved to imported interfaces do not create value dependencies', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `
      import type { ControlOptions } from './components/TypeOnly';
      const options: ControlOptions = { label: 'Local text' };
      export const app = options.label;
    `,
    'src/components/TypeOnly.tsx': `export interface ControlOptions { label: string } ${component('TypeOnly')}`,
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/TypeOnly.tsx').status, 'no-detected-reference');
});

test('namespace property references through a re-export chain resolve only the requested value', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import * as UI from '@/public'; export const app = UI.Renamed;`,
    'src/public.ts': `export { Original as Renamed } from './components';`,
    'src/components/index.ts': `export * from './Selected'; export * from './Unused';`,
    'src/components/Selected.tsx': component('Original'),
    'src/components/Unused.tsx': component('Unused'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Selected.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'src/components/Unused.tsx').status, 'no-detected-reference');
});

test('literal CommonJS requires count as reachable without running required source', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `const controls = require('./components/Required'); export const app = controls;`,
    'src/components/Required.tsx': `${component('Required')} throw new Error('Do not import application modules');`,
  });
  assert.equal(byFile(audit(), 'src/components/Required.tsx').status, 'app-reachable');
});

test('unresolved selected re-export prevents definitive negative classification', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { Selected } from './components'; export const app = Selected;`,
    'src/components/index.ts': `export { Missing as Selected } from './missing-generated';`,
    'src/components/Uncertain.tsx': component('Uncertain'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Uncertain.tsx').status, 'uncertain');
  assert.ok(report.unresolvedAppEdges.length > 0);
});

test('selected barrel imports include executable barrel initialization without pulling in unused siblings', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { Selected } from './components'; export const app = Selected;`,
    'src/components/index.ts': `
      import { Registered } from './Registered';
      export const registry = { Registered };
      export { Selected } from './Selected';
      export { Unused } from './Unused';
    `,
    'src/components/Selected.tsx': component('Selected'),
    'src/components/Registered.tsx': component('Registered'),
    'src/components/Unused.tsx': component('Unused'),
  });
  const report = audit();
  assert.equal(byFile(report, 'src/components/Selected.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'src/components/Registered.tsx').status, 'app-reachable');
  assert.equal(byFile(report, 'src/components/Unused.tsx').status, 'no-detected-reference');
});

test('reports required compatibility re-export path files as app-reachable independently of their owner', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { PublicControl } from '@/components/compatibility'; export const app = PublicControl;`,
    'src/components/compatibility/index.ts': `export { CompatibilityControl as PublicControl } from './CompatibilityControl';`,
    'src/components/compatibility/CompatibilityControl.tsx': `export { OwnerControl as CompatibilityControl } from '../OwnerControl';`,
    'src/components/OwnerControl.tsx': component('OwnerControl'),
    'src/components/Unused.tsx': component('Unused'),
    'inventory.json': JSON.stringify({ entries: [
      { file: 'src/components/compatibility/index.ts' },
      { file: 'src/components/compatibility/CompatibilityControl.tsx' },
      { file: 'src/components/OwnerControl.tsx' },
      { file: 'src/components/Unused.tsx' },
    ] }),
  });
  const report = audit({ inventory: 'inventory.json' });
  for (const file of ['src/components/compatibility/index.ts', 'src/components/compatibility/CompatibilityControl.tsx', 'src/components/OwnerControl.tsx']) {
    assert.equal(byFile(report, file).status, 'app-reachable', file);
    assert.equal(byFile(report, file).appPath[0], 'src/main.tsx');
  }
  assert.equal(byFile(report, 'src/components/Unused.tsx').status, 'no-detected-reference');
});

test('shorthand object registries preserve the imported runtime value dependency', (t) => {
  const { audit } = fixture(t, {
    'src/main.tsx': `import { Selected } from './components/Selected'; export const app = { Selected };`,
    'src/components/Selected.tsx': component('Selected'),
  });
  assert.equal(byFile(audit(), 'src/components/Selected.tsx').status, 'app-reachable');
});
