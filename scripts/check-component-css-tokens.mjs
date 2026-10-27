import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Use the CSS parser supplied by the build tool, keeping this audit aligned with Vite.
const require = createRequire(import.meta.url);
export const postcss = createRequire(require.resolve('vite/package.json'))('postcss');
const sharedFiles = [
  'src/styles/fundamental.css',
  'src/styles/fundamental-overlays.css',
  'src/styles/fundamental-floating.css',
  'src/styles/layout-theme.css',
  'src/styles/scrollbars.css',
  'src/styles/globals.css',
  'src/styles/input-focus.css',
  'src/styles/theme.css',
  'src/package/styles.css',
  'src/package/reset.css',
];
export async function componentCssFiles() {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await visit(path);
      else if (entry.name.endsWith('.css')) files.push(path);
    }
  }
  await visit('src/components');
  await visit('src/patterns');
  return [...files, ...sharedFiles].sort();
}

// Read declaration values only. Selector indices and keyframe percentages describe
// document/time structure; at-rule breakpoints cannot use custom properties in CSS.
// Strings, comments and custom-property names must never be interpreted as values.
export function numericFragments(value) {
  const values = [];
  const functions = [];
  let index = 0;
  while (index < value.length) {
    if (value.startsWith('/*', index)) {
      const end = value.indexOf('*/', index + 2);
      index = end < 0 ? value.length : end + 2;
      continue;
    }
    if (value[index] === '"' || value[index] === "'") {
      const quote = value[index++];
      while (index < value.length) {
        if (value[index++] === '\\') index++;
        else if (value[index - 1] === quote) break;
      }
      continue;
    }
    const number = value
      .slice(index)
      .match(/^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?(?:[a-z]+|%)?/i);
    if (number) {
      const raw = number[0];
      const unit = raw.match(/[a-z%]+$/i)?.[0] ?? '';
      values.push({ raw, unit, index, functions: functions.map((item) => ({ ...item })) });
      index += raw.length;
      continue;
    }
    const identifier = value.slice(index).match(/^[-_a-z][-_a-z\d]*/i);
    if (identifier) {
      index += identifier[0].length;
      if (value[index] === '(') {
        functions.push({ name: identifier[0].toLowerCase(), argument: 0 });
        index++;
      }
      continue;
    }
    if (value[index] === '(') functions.push({ name: 'group', argument: 0 });
    if (value[index] === ')') functions.pop();
    if (value[index] === ',' && functions.length) functions.at(-1).argument++;
    index++;
  }
  return values;
}

export function exceptionReason(declaration, fragment) {
  const { prop, value } = declaration;
  // A dimensionless multiplier/divisor in calc() scales a runtime token. It is not
  // a spacing value. Only sign reversal (-1), paired edges and centering (2) are
  // exempt, and the expression must reference a token/runtime variable. Arbitrary
  // factors, additive offsets, fixed lengths and percentages remain audited.
  if (
    !fragment.unit &&
    ['-1', '2'].includes(fragment.raw) &&
    /var\(--/.test(value) &&
    fragment.functions.some((item) => item.name === 'calc')
  ) {
    const before = value.slice(0, fragment.index).trimEnd();
    const after = value.slice(fragment.index + fragment.raw.length).trimStart();
    if (/[*/]$/.test(before) || /^[*/]/.test(after)) return 'runtime arithmetic coefficient';
  }
  if (prop === 'padding-left' && fragment.raw === '1' && /var\(--tree-level\)\s*-\s*1/.test(value))
    return 'one-based runtime tree depth';
  return undefined;
}

export async function auditComponentCss() {
  const files = await componentCssFiles();
  const failures = [];
  const exceptions = new Map();
  let declarations = 0;
  for (const file of files) {
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    root.walkDecls((declaration) => {
      declarations++;
      for (const fragment of numericFragments(declaration.value)) {
        const reason = exceptionReason(declaration, fragment);
        if (reason) exceptions.set(reason, (exceptions.get(reason) ?? 0) + 1);
        else
          failures.push({
            file,
            line: declaration.source.start.line,
            property: declaration.prop,
            value: declaration.value,
            literal: fragment.raw,
          });
      }
    });
  }
  return {
    files: files.length,
    declarations,
    exceptions: Object.fromEntries(exceptions),
    failures,
  };
}
export function verifyAuditRules() {
  const cases = [
    ['height', '34px', ['34px']],
    ['padding', '0 8px var(--space-2)', ['0', '8px']],
    ['width', 'var(--runtime-width, 320px)', ['320px']],
    ['width', 'calc(100% - 2 * var(--inset))', ['100%']],
    ['z-index', 'calc(var(--z-sticky) + 1)', ['1']],
    ['padding-left', 'calc(var(--space-2) + (var(--tree-level) - 1) * var(--nested-inset))', []],
    ['width', 'calc(1px * 2)', ['1px', '2']],
    ['width', 'calc(var(--size-1) * 34)', ['34']],
    ['opacity', '.55', ['.55']],
    ['transform', 'translate(-50%, -50%) scale(.98)', ['-50%', '-50%', '.98']],
    [
      'box-shadow',
      '0 3px 8px color-mix(in srgb, var(--color-scrim) 40%, transparent)',
      ['0', '3px', '8px', '40%'],
    ],
    ['font-weight', '600', ['600']],
    ['line-height', '1.5', ['1.5']],
    ['transition', 'opacity 120ms cubic-bezier(.2,.8,.2,1)', ['120ms', '.2', '.8', '.2', '1']],
    ['grid-template-columns', 'repeat(3, minmax(0, 1fr)) 280px', ['3', '0', '1fr', '280px']],
    ['flex', '1 0 220px', ['1', '0', '220px']],
    ['grid-column', '1 / span 2', ['1', '2']],
    ['content', "'Example 24'", []],
    ['width', 'var(--group-data-display-measurement-grid-column-2xs)', []],
    ['--local-height', '34px', ['34px']],
    ['padding', '/* size 24 */ var(--space-4)', []],
  ];
  for (const [prop, value, expected] of cases) {
    const literals = numericFragments(value)
      .filter((fragment) => !exceptionReason({ prop, value }, fragment))
      .map(({ raw }) => raw);
    assert.deepEqual(literals, expected, `${prop}: ${value}`);
  }
  const declarations = [];
  postcss
    .parse(
      '@media (max-width: 640px) { .row:nth-child(2) { gap: 8px; } } @keyframes enter { 50% { opacity: 0.5; } }',
    )
    .walkDecls((decl) => declarations.push(...numericFragments(decl.value).map(({ raw }) => raw)));
  assert.deepEqual(declarations, ['8px', '0.5']);
  return cases.length + 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--self-test')) {
    console.log(`Component CSS audit: ${verifyAuditRules()} parser and exception checks passed.`);
  }
  const report = await auditComponentCss();
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    for (const failure of report.failures)
      console.error(
        `${failure.file}:${failure.line} ${failure.property}: ${failure.literal} must use a design token`,
      );
    console.log(
      `Component CSS tokens: ${report.files} files, ${report.declarations} declarations, ${report.failures.length} fixed-value violations.`,
    );
    console.log('Constrained structural exceptions:', report.exceptions);
  }
  if (report.failures.length) process.exitCode = 1;
}
