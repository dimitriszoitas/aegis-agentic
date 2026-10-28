import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  auditPatternSources,
  auditProductPatterns,
  validatePatternPolicy,
} from './product-pattern-policy.mjs';

function fixture() {
  return {
    schemaVersion: 2,
    product: 'independent-product',
    revision: 1,
    scope: 'src',
    pages: [{ id: 'records', source: 'src/records.tsx', patterns: ['header', 'grid'] }],
    patterns: {
      header: {
        module: '@company/ds/patterns/page-header',
        export: 'PageHeader',
        cardinality: { min: 1, max: 1 },
        forbiddenLocalTags: ['h1'],
      },
      grid: {
        module: '@company/ds/data-grid',
        export: 'DataGrid',
        cardinality: { min: 1, max: 1 },
        requiredProps: ['density'],
        forbiddenProps: ['renderToolbar'],
      },
    },
    exceptions: [],
  };
}
const imports = `import { PageHeader as Header } from '@company/ds/patterns/page-header';
import * as Table from '@company/ds/data-grid';`;
const validSource = `${imports}
export function Records() { return <><Header title="Records"/><Table.DataGrid density={density}/></>; }`;
const audit = (source = validSource, policy = fixture()) =>
  auditPatternSources(policy, { 'src/records.tsx': source });
const rules = (result) => result.issues.map((entry) => entry.rule);
const auditRoutes = (routeSource) => {
  const policy = fixture();
  policy.routeInventory = { source: 'src/routes.ts', variable: 'pages', idProperty: 'id' };
  return auditPatternSources(policy, {
    'src/records.tsx': validSource,
    'src/routes.ts': `const pages = [{id:'records'}];\n${routeSource}`,
  });
};

test('public named aliases and namespace imports count across different product module names', () => {
  const result = audit();
  assert.equal(result.valid, true);
  assert.equal(result.checkedPatterns, 2);
  assert.equal(result.sources.length, 1);
  assert.deepEqual(result.exceptions, []);
});

test('shadowed local components do not count as canonical imports', () => {
  const result = audit(`${imports}
function Page(Header) { const Table = { DataGrid: () => null }; return <><Header/><Table.DataGrid density="compact"/></>; }`);
  assert.equal(result.valid, false);
  assert.equal(result.issues.filter((item) => item.rule === 'cardinality').length, 2);
});

test('multiple aliases resolve to the same public component and enforce cardinality', () => {
  const result = audit(
    validSource
      .replace('PageHeader as Header', 'PageHeader as Header, PageHeader as AnotherHeader')
      .replace('<Header title="Records"/>', '<Header/><AnotherHeader/>'),
  );
  assert(rules(result).includes('cardinality'));
});

test('unused imports, local lookalikes, type-only imports and wrong modules cannot establish reuse', () => {
  for (const source of [
    `${imports} const OwnHeader = () => null; export const Page = () => <><OwnHeader/><Table.DataGrid density="compact"/></>;`,
    validSource.replace('@company/ds/patterns/page-header', './page-header'),
    validSource.replace('import { PageHeader', 'import type { PageHeader'),
    validSource.replace('PageHeader as Header', 'type PageHeader as Header'),
  ])
    assert(rules(audit(source)).includes('cardinality'));
});

test('missing required props, forbidden overrides and local headings are distinct findings', () => {
  const result = audit(
    validSource
      .replace('density={density}', 'renderToolbar={() => null}')
      .replace('<Header title="Records"/>', '<Header/><h1>Second title</h1>'),
  );
  assert.deepEqual([...new Set(rules(result))].sort(), [
    'forbidden-prop:renderToolbar',
    'forbidden-tag:h1',
    'required-prop:density',
  ]);
  assert(
    result.issues.every((finding) => finding.source === 'src/records.tsx' && finding.line > 0),
  );
});

test('dynamic spreads fail closed even with an explicit required prop', () => {
  const result = audit(
    validSource.replace('density={density}', 'density={density} {...customizations}'),
  );
  assert.deepEqual(rules(result), ['spread-props']);
  assert.equal(result.valid, false);
});

test('propValues verifies exact primitive literals and boolean shorthand', () => {
  const policy = fixture();
  policy.patterns.grid.propValues = {
    density: 'default',
    enableSelection: false,
    pagination: true,
    pageSize: 10,
    empty: null,
    offset: -1,
  };
  const source = validSource.replace(
    'density={density}',
    'density="default" enableSelection={false} pagination pageSize={10} empty={null} offset={-1}',
  );
  assert.equal(audit(source, policy).valid, true);
  assert.equal(
    audit(source.replace('density="default"', 'density={("default" as const)}'), policy).valid,
    true,
  );
  for (const [before, after, rule] of [
    ['density="default"', 'density="compact"', 'prop-value:density'],
    ['enableSelection={false}', 'enableSelection', 'prop-value:enableSelection'],
    ['pagination ', 'pagination={false} ', 'prop-value:pagination'],
    ['pageSize={10}', 'pageSize="10"', 'prop-value:pageSize'],
    ['empty={null}', 'empty="null"', 'prop-value:empty'],
  ])
    assert(rules(audit(source.replace(before, after), policy)).includes(rule));
});

test('propValues reports unresolved expressions, missing values, duplicate attributes and spreads', () => {
  const policy = fixture();
  policy.patterns.grid.propValues = { density: 'default' };
  for (const prop of [
    'density={density}',
    'density={getDensity()}',
    'density={undefined}',
    'density={true ? "default" : "default"}',
    '',
    'density="default" density="compact"',
    'density="default" {...props}',
  ]) {
    const finding = audit(validSource.replace('density={density}', prop), policy).issues.find(
      (entry) => entry.rule === 'prop-value:density',
    );
    assert(finding?.message.startsWith('Unresolved density'), prop);
  }
});

test('prop value exceptions are specific, reasoned and reject stale waivers', () => {
  const policy = fixture();
  policy.patterns.grid.propValues = { density: 'default' };
  policy.exceptions = [
    {
      page: 'records',
      pattern: 'grid',
      rule: 'prop-value:density',
      reason: 'This page consumes the runtime workspace density; browser scenarios verify it.',
    },
  ];
  const result = audit(validSource, policy);
  assert.equal(result.valid, true);
  assert.equal(result.exceptions[0].findings[0].rule, 'prop-value:density');
  assert(
    rules(audit(validSource.replace('density={density}', 'density="default"'), policy)).includes(
      'unused-exception',
    ),
  );
  for (const values of [
    { density: [] },
    { density: {} },
    { density: Number.NaN },
    { density: undefined },
    ['default'],
  ]) {
    policy.patterns.grid.propValues = values;
    assert.equal(validatePatternPolicy(policy).valid, false);
  }
  policy.patterns.grid.propValues = { renderToolbar: null };
  assert.equal(validatePatternPolicy(policy).valid, false);
});

test('reasoned exceptions waive only the exact page, pattern and rule and remain visible', () => {
  const policy = fixture();
  policy.exceptions = [
    {
      page: 'records',
      pattern: 'header',
      rule: 'forbidden-tag:h1',
      reason: 'Embedded printable document needs a separate title.',
    },
  ];
  const result = audit(
    validSource.replace('<Header title="Records"/>', '<Header/><h1>Print title</h1>'),
    policy,
  );
  assert.equal(result.valid, true);
  assert.equal(result.exceptions.length, 1);
  assert.equal(result.exceptions[0].findings[0].rule, 'forbidden-tag:h1');
  assert(rules(audit(undefined, policy)).includes('unused-exception'));
  const otherViolation = audit(
    validSource.replace('density={density}', 'renderToolbar={customToolbar}'),
    policy,
  );
  assert(rules(otherViolation).includes('forbidden-prop:renderToolbar'));
});

test('scope, duplicate IDs, unknown patterns, invalid cardinality and exception typos reject the policy', () => {
  const mutations = [
    (p) => {
      p.schemaVersion = 1;
    },
    (p) => {
      p.scope = '../outside';
    },
    (p) => {
      p.pages[0].source = '../outside.tsx';
    },
    (p) => {
      p.pages[0].source = 'other/records.tsx';
    },
    (p) => {
      p.pages.push({ ...p.pages[0], source: 'src/other.tsx' });
    },
    (p) => {
      p.pages[0].patterns = ['unknown'];
    },
    (p) => {
      p.patterns.header.cardinality = { min: 2, max: 1 };
    },
    (p) => {
      p.patterns.header.forbidenProps = ['eyebrow'];
    },
    (p) => {
      p.exceptions = [{ page: 'records', pattern: 'header', rule: '*', reason: 'Everything' }];
    },
    (p) => {
      p.exceptions = [{ page: 'records', pattern: 'header', rule: 'cardinality', reason: ' ' }];
    },
    (p) => {
      p.patterns.grid.requiredProps = ['renderToolbar'];
    },
  ];
  for (const mutate of mutations) {
    const policy = fixture();
    mutate(policy);
    assert.equal(validatePatternPolicy(policy).valid, false);
    assert.equal(audit(undefined, policy).checkedPatterns, 0);
  }
});

test('optional patterns allow zero instances and remain scoped to specified pages', () => {
  const policy = fixture();
  policy.patterns.header.cardinality = { min: 0, max: 1 };
  const source = `import {DataGrid} from '@company/ds/data-grid'; export const Page = () => <DataGrid density="compact"/>;`;
  assert.equal(audit(source, policy).valid, true);
  policy.pages[0].patterns = ['grid'];
  assert.equal(audit(source + 'const Title = () => <h1>Allowed here</h1>;', policy).valid, true);
});

test('literal route inventory detects uncovered routes and refuses dynamic inventories', () => {
  const policy = fixture();
  policy.routeInventory = { source: 'src/routes.ts', variable: 'pages', idProperty: 'id' };
  const run = (routeSource) =>
    auditPatternSources(policy, { 'src/records.tsx': validSource, 'src/routes.ts': routeSource });
  assert.equal(run("const pages = [{id:'records'}] as const;").valid, true);
  assert.equal(run("const pages = [{id:'records'}] satisfies Array<{id:string}>;").valid, true);
  assert(
    rules(run("const pages = [{id:'records'}, {id:'forgotten'}];")).includes('route-coverage'),
  );
  assert(rules(run('const pages = getRoutes();')).includes('route-inventory'));
  assert(rules(run('const pages = [{...route}];')).includes('route-inventory'));
  assert(rules(run("const pages = [{id:'records', ...route}];")).includes('route-inventory'));
  assert(
    rules(run("const pages = [{id:'records', [key]:'different'}];")).includes('route-inventory'),
  );
  assert(rules(run("const pages = [{id:'records', id:'different'}];")).includes('route-inventory'));
  for (const source of [
    "let pages = [{id:'records'}]; pages = [{id:'unreviewed'}];",
    "const pages = [{id:'records'}]; pages.push({id:'unreviewed'});",
    "const pages = [{id:'records'}]; pages[0] = {id:'unreviewed'};",
    "const pages = [{id:'records'}]; pages[0].id = 'unreviewed';",
    "const pages = [{id:'records'}]; const alias = pages; alias.push({id:'unreviewed'});",
    "const pages = [{id:'records'}]; mutate(pages);",
    "const pages = [{id:'records'}]; const push = pages.push;",
    "export const pages = [{id:'records'}];",
  ])
    assert(rules(run(source)).includes('route-inventory'), source);
  assert.equal(
    run(
      "const pages = [{id:'records'}]; const items = pages.map(({id}) => id); const first = pages.find(p => p.id === 'records'); const n = pages.length;",
    ).valid,
    true,
  );
});

test('declared local wrapper sources participate in evidence identity', () => {
  const policy = fixture();
  policy.patterns.header.source = 'src/patterns.tsx';
  assert(rules(audit(undefined, policy)).includes('missing-source'));
  const result = auditPatternSources(policy, {
    'src/records.tsx': validSource,
    'src/patterns.tsx': 'export const PageHeader = () => null;',
  });
  assert.equal(result.valid, true);
  assert(result.sources.some((entry) => entry.path === 'src/patterns.tsx'));
});

test('route inventory rejects nested destructuring and rest assignment targets', () => {
  for (const mutation of [
    "({ id: pages[0].id } = { id: 'uncovered' });",
    "[pages[0].id] = ['uncovered'];",
    "({ record: { id: pages[0].id } } = { record: { id: 'uncovered' } });",
    "([{ id: pages[0].id }] = [{ id: 'uncovered' }]);",
    "({ id: pages[0].id = 'uncovered' } = {});",
    "[...pages[0].id] = ['uncovered'];",
    "({ ...pages[0] } = { id: 'uncovered' });",
    "({ pages } = { pages: [{ id: 'uncovered' }] });",
  ]) {
    const result = auditRoutes(mutation);
    assert.equal(result.valid, false, mutation);
    assert(
      result.issues.some(
        (finding) =>
          finding.rule === 'route-inventory' && /written after declaration/.test(finding.message),
      ),
      mutation,
    );
  }
});

test('route inventory rejects for-in and for-of assignment targets', () => {
  for (const mutation of [
    "for (pages[0].id of ['uncovered']) {}",
    'for (pages[0].id in { uncovered: true }) {}',
    "for ({ id: pages[0].id } of [{ id: 'uncovered' }]) {}",
    "for ([pages[0].id] of [['uncovered']]) {}",
  ]) {
    const result = auditRoutes(mutation);
    assert.equal(result.valid, false, mutation);
    assert(
      result.issues.some(
        (finding) =>
          finding.rule === 'route-inventory' && /written after declaration/.test(finding.message),
      ),
      mutation,
    );
  }
});

test('route reads inside destructuring sources, keys and defaults remain supported', () => {
  const result = auditRoutes(`
    const items = pages.map(({id}) => id);
    const first = pages.find(page => page.id === 'records');
    let value;
    ({ id: value } = { id: pages[0].id });
    [value] = [pages[0].id];
    ({ [pages[0].id]: value } = { records: true });
    ({ id: value = pages[0].id } = {});
    [value = pages[0].id] = [];
    for (const id of [pages[0].id]) { console.log(id); }
  `);
  assert.equal(result.valid, true, JSON.stringify(result.issues));
});

test('reports are deterministic and source or policy changes invalidate their evidence hash', () => {
  const first = audit();
  assert.deepEqual(audit(), first);
  assert.notEqual(audit(validSource + '\n').sources[0].sha256, first.sources[0].sha256);
  const policy = fixture();
  policy.revision++;
  assert.notEqual(audit(undefined, policy).policy.sha256, first.policy.sha256);
  const reordered = Object.fromEntries(Object.entries(fixture()).reverse());
  assert.equal(audit(undefined, reordered).policy.sha256, first.policy.sha256);
});

test('missing files and parse errors never pass', () => {
  assert(rules(auditPatternSources(fixture(), {})).includes('missing-source'));
  assert(rules(audit(`${imports}\nexport const Page = () => <Header`)).includes('parse-error'));
});

test('filesystem audit remains inside root and scope, including symlink targets', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'aegis-policy-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'project');
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'policy.json'), JSON.stringify(fixture()));
  await writeFile(join(root, 'src/records.tsx'), validSource);
  assert.equal((await auditProductPatterns({ root, policyPath: 'policy.json' })).valid, true);
  await writeFile(join(directory, 'outside.tsx'), validSource);
  await rm(join(root, 'src/records.tsx'));
  await symlink(join(directory, 'outside.tsx'), join(root, 'src/records.tsx'));
  assert(
    (await auditProductPatterns({ root, policyPath: 'policy.json' })).issues.some(
      (finding) => finding.rule === 'unreadable-source',
    ),
  );
  await writeFile(join(directory, 'outside-policy.json'), JSON.stringify(fixture()));
  await symlink(join(directory, 'outside-policy.json'), join(root, 'linked-policy.json'));
  await assert.rejects(
    auditProductPatterns({ root, policyPath: 'linked-policy.json' }),
    /within the project root/,
  );
  await assert.rejects(
    auditProductPatterns({ root, policyPath: '../outside-policy.json' }),
    /within the project root/,
  );
});
