import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';
import { auditComponentUsage } from './component-usage.mjs';
import { discoverUI } from './ui-discovery.mjs';

const anchor = process.env.COMPONENT_USAGE_TYPESCRIPT_PACKAGE ?? path.join(process.cwd(), 'package.json');
const tsDirectory = path.dirname(createRequire(anchor).resolve('typescript/package.json'));
function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-review-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  fs.symlinkSync(tsDirectory, path.join(root, 'node_modules/typescript'), 'dir');
  const contents = {
    'package.json': JSON.stringify({ name: 'discovery-review-fixture', type: 'module' }),
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', types: [], noLib: true } }),
    ...files,
  };
  for (const [name, source] of Object.entries(contents)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  return root;
}

// A common Vite split-config arrangement: the root is a solution config,
// while the app's aliases and JSX mode are in the referenced config.
test('project-reference aliases cannot create confident false-negative app usage', t => {
  const root = fixture(t, {
    'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }),
    'tsconfig.app.json': JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', baseUrl: '.', paths: { '@/*': ['src/*'] }, noLib: true, types: [] }, include: ['src'] }),
    'src/main.tsx': `import { Control } from '@/ui/Control'; export const app = <Control />;`,
    'src/ui/Control.tsx': `export function Control() { return <button>Save</button>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  const control = report.entries.find(entry => entry.file === 'src/ui/Control.tsx');
  assert.ok(control);
  assert.equal(control.status, 'app-reachable', `Actual aliased consumer was classified ${control.status} with ${report.unresolvedAppEdges.length} unresolved app edges`);
});

test('MDX UI remains visible as unsupported source requiring review', t => {
  const root = fixture(t, {
    'src/main.tsx': 'export const app = null;',
    'content/checkout.mdx': '# Checkout\n\n<PaymentButton tone="primary" />\n',
    'views/receipt.hbs': '<section><button>Print receipt</button></section>',
    'views/checkout.ejs': '<button><%= label %></button>',
    'views/account.pug': 'section\n  button Save',
  });
  const report = discoverUI({ root });
  for (const file of ['content/checkout.mdx', 'views/receipt.hbs', 'views/checkout.ejs', 'views/account.pug']) {
    const accountedFor = report.sourceFiles.some(entry => entry.file === file)
      || report.scope.skipped.some(entry => entry.path === file);
    assert.ok(accountedFor, `${file} was walked but absent from every source/scope review list`);
  }
});

test('JSX in JavaScript is discovered without requiring a .jsx suffix', t => {
  const root = fixture(t, {
    'src/main.js': `import { Control } from './control.js'; export const app = <main><Control /></main>;`,
    'src/control.js': `export default function () { return <button>Save</button>; }`,
  });
  const report = discoverUI({ root });
  for (const file of ['src/main.js', 'src/control.js']) {
    assert.ok(report.entries.some(entry => entry.file === file && entry.jsxElements > 0), `${file} lost its JSX rendering evidence`);
  }
});

test('literal runtime imports of owned workspace packages do not silently become negative', t => {
  const root = fixture(t, {
    'package.json': JSON.stringify({ name: 'workspace-root', private: true, workspaces: ['packages/*'] }),
    'src/main.tsx': `import { Control } from '@local/ui'; export const app = <Control />;`,
    'packages/ui/package.json': JSON.stringify({ name: '@local/ui', exports: './src/index.ts' }),
    'packages/ui/src/index.ts': `export { Control } from './Control';`,
    'packages/ui/src/Control.tsx': `export function Control() { return <button>Save</button>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  const control = report.entries.find(entry => entry.file === 'packages/ui/src/Control.tsx');
  assert.ok(control);
  assert.ok(['app-reachable', 'uncertain'].includes(control.status), `Owned workspace UI was classified ${control.status} with ${report.unresolvedAppEdges.length} unresolved app edges`);
});


test('nearest workspace config resolves its own alias without imposing the root alias', t => {
  const root = fixture(t, {
    'src/main.tsx': `import { Screen } from '../packages/editor/Screen'; export const app = <Screen />;`,
    'packages/editor/tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '~/*': ['./*'] }, moduleResolution: 'Bundler', noLib: true, types: [] }, include: ['*.tsx'] }),
    'packages/editor/Screen.tsx': `import { Field } from '~/Field'; export function Screen() { return <Field/>; }`,
    'packages/editor/Field.tsx': `export function Field() { return <input/>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  assert.equal(report.entries.find(entry => entry.file === 'packages/editor/Field.tsx')?.status, 'app-reachable');
});

test('conflicting project configs mark unresolved app ownership instead of choosing one alias silently', t => {
  const shared = { module: 'ESNext', moduleResolution: 'Bundler', baseUrl: '.', noLib: true, types: [] };
  const root = fixture(t, {
    'tsconfig.json': JSON.stringify({ files: [], references: [{ path: './tsconfig.a.json' }, { path: './tsconfig.b.json' }] }),
    'tsconfig.a.json': JSON.stringify({ compilerOptions: { ...shared, paths: { '@theme': ['./themes/A'] } }, include: ['src'] }),
    'tsconfig.b.json': JSON.stringify({ compilerOptions: { ...shared, paths: { '@theme': ['./themes/B'] } }, include: ['src'] }),
    'src/main.tsx': `import { Control } from '@theme'; export const app = <Control/>;`,
    'themes/A.tsx': `export function Control() { return <button>A</button>; }`,
    'themes/B.tsx': `export function Control() { return <button>B</button>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  assert.ok(report.unresolvedAppEdges.some(edge => edge.reason.includes('configurations disagree')));
  for (const file of ['themes/A.tsx', 'themes/B.tsx']) assert.equal(report.entries.find(entry => entry.file === file)?.status, 'uncertain');
});

test('unresolved bare imports remain uncertain when dependency ownership is unknown', t => {
  const root = fixture(t, {
    'src/main.tsx': `import { launch } from 'virtual-runtime-registry'; export const app = launch();`,
    'custom/Registered.tsx': `export function Registered() { return <button>Registered</button>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  assert.equal(report.entries.find(entry => entry.file === 'custom/Registered.tsx')?.status, 'uncertain');
  assert.ok(report.unresolvedAppEdges.some(edge => edge.expression === 'virtual-runtime-registry'));
});

test('resolved external declarations and Node builtins do not create unexplained application uncertainty', t => {
  const root = fixture(t, {
    'src/main.tsx': `import { existsSync } from 'node:fs'; import { external } from 'installed-external'; export const app = external(existsSync('.'));`,
    'node_modules/installed-external/package.json': JSON.stringify({ name: 'installed-external', types: './index.d.ts' }),
    'node_modules/installed-external/index.d.ts': `export declare function external(value: boolean): unknown;`,
    'custom/Unused.tsx': `export function Unused() { return <button>Unused</button>; }`,
  });
  const report = auditComponentUsage({ root, entries: ['src/main.tsx'] });
  assert.equal(report.entries.find(entry => entry.file === 'custom/Unused.tsx')?.status, 'no-detected-reference');
  assert.equal(report.unresolvedAppEdges.length, 0);
});


test('repeated same-line findings have distinct deterministic IDs for the migration ledger', t => {
  const root = fixture(t, {
    'src/main.tsx': `export const App = () => <section><div style={{padding:4}}/><div style={{padding:4}}/></section>;`,
  });
  const first = discoverUI({ root });
  const second = discoverUI({ root });
  const padding = first.findings.filter(finding => finding.kind === 'inline-design-value' && finding.detail === 'padding:4');
  assert.equal(padding.length, 2, 'Both inline declarations must be represented');
  assert.equal(new Set(first.findings.map(finding => finding.id)).size, first.findings.length);
  assert.deepEqual(first.findings.map(finding => finding.id), second.findings.map(finding => finding.id));
});
