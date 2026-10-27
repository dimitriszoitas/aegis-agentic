import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  configurations,
  categoryForFile,
  expressionReferences,
  validateTokenHierarchy,
  validateConsumerReferences,
  auditTokenConsumers,
} from './check-token-hierarchy.mjs';

const categoryMap = () => ({
  version: 1,
  categories: {
    trigger: {
      title: 'Components/Triggers',
      prefixes: ['src/button.css', 'src/button.tsx', 'src/components/button/'],
    },
    'data-display': {
      title: 'Components/Data Display',
      prefixes: ['src/grid.tsx', 'src/other.tsx'],
    },
    input: { title: 'Components/Inputs & Selection', prefixes: ['src/input.css'] },
    layout: { title: 'Components/Layout', prefixes: [] },
  },
  sharedFiles: ['src/shared.css'],
});
const maps = (value) => Object.fromEntries(configurations.map((key) => [key, value]));
function manifest() {
  return {
    version: 1,
    configurations: [...configurations],
    tokens: {
      '--p-blue': {
        path: 'primitive.color.blue.500',
        tier: 'primitive',
        type: 'color',
        value: '#356ac3',
      },
      '--p-white': {
        path: 'primitive.color.white',
        tier: 'primitive',
        type: 'color',
        value: '#ffffff',
      },
      '--p-space': { path: 'primitive.size.2', tier: 'primitive', type: 'dimension', value: '8px' },
      '--s-action': {
        path: 'semantic.color.action',
        tier: 'semantic',
        type: 'color',
        mappings: maps('var(--p-blue)'),
      },
      '--s-gap': {
        path: 'semantic.space.snug',
        tier: 'semantic',
        type: 'spacing',
        mappings: maps('var(--p-space)'),
        invariant: true,
      },
      '--group-trigger-background': {
        path: 'button.background',
        tier: 'group',
        type: 'color',
        family: 'trigger',
        value: 'var(--s-action)',
      },
      '--group-trigger-gap': {
        path: 'button.gap',
        tier: 'group',
        type: 'spacing',
        family: 'trigger',
        value: 'var(--s-gap)',
      },
    },
    consumers: [],
    dynamicVariables: [
      { name: '--pointer-x', reason: 'Measured pointer position', files: ['src/button.css'] },
    ],
  };
}
const codes = (m) => validateTokenHierarchy(m).errors.map((error) => error.code);

test('valid four-configuration three-tier graph passes', () => {
  const result = validateTokenHierarchy(manifest());
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.counts, { primitive: 3, semantic: 2, group: 2, dependencies: 10 });
});
test('nested fallbacks are dependencies while comments and quoted content are ignored', () => {
  assert.deepEqual(
    expressionReferences('var(--a, calc(var(--b) * 2)) /* var(--ignored) */ "var(--also-ignored)"'),
    ['--a', '--b'],
  );
  const m = manifest();
  m.tokens['--group-trigger-background'].value = 'var(--s-action, var(--p-white))';
  assert(codes(m).includes('tier-bypass'));
});
test('primitive aliases, semantic aliases and group aliases are forbidden', () => {
  for (const [name, value] of [
    ['--p-blue', 'var(--p-white)'],
    ['--s-action', 'var(--s-gap)'],
    ['--group-trigger-background', 'var(--group-trigger-gap)'],
  ]) {
    const m = manifest();
    if (m.tokens[name].tier === 'semantic') m.tokens[name].mappings = maps(value);
    else m.tokens[name].value = value;
    assert(codes(m).includes('tier-bypass'), name);
  }
});
test('unknown references and graph cycles are reported', () => {
  const m = manifest();
  m.tokens['--p-blue'].value = 'var(--s-action)';
  m.tokens['--group-trigger-gap'].value = 'var(--missing)';
  assert(codes(m).includes('cycle'));
  assert(codes(m).includes('unknown-reference'));
});
test('all four mappings are required and extra configurations rejected', () => {
  const m = manifest();
  delete m.tokens['--s-gap'].mappings['fundamental.dark'];
  m.tokens['--s-gap'].mappings['old.light'] = 'var(--p-space)';
  assert(codes(m).includes('missing-mapping'));
  assert(codes(m).includes('unknown-mapping'));
  m.configurations.pop();
  assert(codes(m).includes('configurations'));
});
test('invariant typography, spacing and sizing cannot vary by mode', () => {
  for (const type of ['spacing', 'sizing', 'font-family', 'fontSize', 'line-height']) {
    const m = manifest();
    m.tokens['--s-gap'].type = type;
    delete m.tokens['--s-gap'].invariant;
    m.tokens['--s-gap'].mappings['fundamental.dark'] = 'calc(var(--p-space) * 2)';
    assert(codes(m).includes('invariant'), type);
  }
});
test('styling roles can vary across the four configurations', () => {
  const m = manifest();
  m.tokens['--s-action'].mappings['fundamental.dark'] = 'var(--p-white)';
  assert.deepEqual(codes(m), []);
});
test('semantic and group values reject literals and hidden raw fallbacks', () => {
  for (const value of [
    '#fff',
    'none',
    'var(--p-blue, red)',
    'color-mix(in srgb, var(--p-blue) 80%, #fff)',
    'calc(var(--p-space) + 2px)',
    'var(--p-space, 8)',
    'var(--p-space) 2',
    'var(--p-blue, rgb(0 0 0 / 30%))',
  ]) {
    const m = manifest();
    m.tokens['--s-action'].mappings = maps(value);
    assert(codes(m).includes('raw-value'), value);
  }
});
test('CSS color composition and structural token arithmetic remain valid', () => {
  for (const value of [
    'color-mix(in srgb, var(--p-blue) 80%, var(--p-white))',
    'linear-gradient(115deg, var(--p-blue) 8%, var(--p-white) 92%)',
    'calc(var(--p-space) * 2)',
    'max(var(--p-space), calc(var(--p-space) / 2))',
  ]) {
    const m = manifest();
    m.tokens['--s-action'].mappings = maps(value);
    assert.deepEqual(codes(m), [], value);
  }
});
test('duplicate paths and design/runtime name collisions fail', () => {
  const m = manifest();
  m.tokens['--p-white'].path = m.tokens['--p-blue'].path;
  m.dynamicVariables.push('--p-blue');
  assert(codes(m).includes('duplicate-path'));
  assert(codes(m).includes('dynamic-collision'));
});
test('paths may repeat across tiers because the tier provides their namespace', () => {
  const m = manifest();
  m.tokens['--s-action'].path = m.tokens['--p-blue'].path;
  assert.deepEqual(codes(m), []);
});
test('consumer properties accept only their group and explicit runtime geometry', () => {
  const m = manifest();
  const check = (value) =>
    validateConsumerReferences(m, {
      file: 'src/button.css',
      family: 'trigger',
      property: 'color',
      value,
    });
  assert.deepEqual(check('var(--group-trigger-background)'), []);
  assert.deepEqual(check('calc(var(--pointer-x) + var(--group-trigger-gap))'), []);
  assert(check('var(--s-action)').some((e) => e.code === 'consumer-bypass'));
  assert(check('var(--unknown)').some((e) => e.code === 'consumer-unknown'));
  assert(
    validateConsumerReferences(m, { file: 'src/other.css', value: 'var(--pointer-x)' }).some(
      (e) => e.code === 'consumer-unknown',
    ),
  );
});
test('consumer group declarations may reference semantics but not runtime or primitives', () => {
  const m = manifest();
  const check = (value) =>
    validateConsumerReferences(m, {
      file: 'src/button.css',
      family: 'trigger',
      property: '--group-trigger-background',
      value,
    });
  assert.deepEqual(check('var(--s-action)'), []);
  assert(check('var(--p-blue)').some((e) => e.code === 'consumer-bypass'));
  assert(check('var(--pointer-x)').some((e) => e.code === 'group-runtime'));
  assert(check('var(--s-action, red)').some((e) => e.code === 'consumer-raw-group'));
});
test('category ownership rejects borrowing, including shared icon tokens', () => {
  const m = manifest();
  m.tokens['--group-icon-size'] = {
    path: 'icon.size',
    tier: 'group',
    type: 'dimension',
    family: 'icon',
    value: 'var(--s-gap)',
  };
  for (const reference of ['--group-trigger-background', '--group-icon-size'])
    assert(
      validateConsumerReferences(m, {
        file: 'src/list.css',
        family: 'data-display',
        value: `var(${reference})`,
      }).some((error) => error.code === 'consumer-family'),
    );
  assert(
    validateConsumerReferences(m, {
      file: 'src/list.css',
      family: 'data-display',
      property: '--group-trigger-background',
      value: 'var(--s-action)',
    }).some((error) => error.code === 'consumer-family'),
  );
  assert(
    validateConsumerReferences(m, {
      file: 'src/button.css',
      family: 'trigger',
      property: '--s-action',
      value: 'var(--p-blue)',
    }).some((error) => error.code === 'consumer-definition'),
  );
});
test('group prefixes must match their sidebar category', () => {
  const m = manifest();
  m.tokens['--group-trigger-background'].family = 'input';
  assert(codes(m).includes('group-prefix'));
  m.tokens['--group-trigger-background'].family = '';
  assert(codes(m).includes('group-family'));
});
test('CSS and runtime helper source auditing uses actual CSS names and reports unresolved expressions', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-token-graph-'));
  try {
    await mkdir(join(rootDir, 'src/lib'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/lib/component-design-tokens.ts'),
      `export const componentTokenDefinitions = { icon: { value: 8, unit: 'px', cssVariable: '--group-trigger-gap' } } as const;`,
    );
    await writeFile(
      join(rootDir, 'src/button.css'),
      '.button{color:var(--group-trigger-background);gap:var(--s-gap);--group-trigger-background:var(--s-action)}',
    );
    await writeFile(
      join(rootDir, 'src/button.tsx'),
      `const width = componentToken('icon'); const values=useComponentTokenNumbers(['icon']); const value = styles.getPropertyValue('--s-gap'); const unknown=componentToken(dynamic);`,
    );
    const m = manifest();
    m.consumers = [
      { file: 'src/button.css', family: 'trigger' },
      { file: 'src/button.tsx', family: 'trigger' },
    ];
    const result = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert.equal(result.files, 2);
    assert.equal(result.errors.length, 2);
    assert(result.errors.every((e) => e.code === 'consumer-bypass'));
    assert.equal(result.unsupported.length, 1);
    m.consumers = [{ file: '../outside.css', family: 'trigger' }];
    assert.equal(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors[0].code,
      'consumer-path',
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('runtime template exceptions require an exact expression and owning source path', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-runtime-template-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    const source = 'const offset = `var(--grid-pin-${side}-${index}, 0px)`;';
    await writeFile(join(rootDir, 'src/grid.tsx'), source);
    await writeFile(join(rootDir, 'src/other.tsx'), source);
    const m = manifest();
    m.dynamicVariables.push({
      name: '--grid-pin-offset',
      sourceTemplate: '--grid-pin-${side}-${index}',
      reason: 'Measured column offsets',
      files: ['src/grid.tsx'],
    });
    m.consumers = [{ file: 'src/grid.tsx', family: 'data-display' }];
    const allowed = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert.deepEqual(allowed.errors, []);
    assert.deepEqual(allowed.unsupported, []);
    m.consumers = [{ file: 'src/other.tsx', family: 'data-display' }];
    const wrongFile = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert.equal(wrongFile.unsupported.length, 1);
    await writeFile(join(rootDir, 'src/grid.tsx'), source.replace('${index}', '${different}'));
    m.consumers = [{ file: 'src/grid.tsx', family: 'data-display' }];
    assert.equal(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).unsupported.length,
      1,
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('the central category map uses longest prefixes and exact file matches', () => {
  const categories = categoryMap();
  categories.categories.layout.prefixes.push('src/components/');
  assert.equal(categoryForFile(categories, 'src/components/button/button.css'), 'trigger');
  assert.equal(categoryForFile(categories, 'src/components/other/other.css'), 'layout');
  assert.equal(categoryForFile(categories, 'src/button.css.extra'), undefined);
  const m = manifest();
  assert.deepEqual(validateTokenHierarchy(m, { categoryMap: categories }).errors, []);
  m.tokens['--group-missing-color'] = {
    tier: 'group',
    family: 'missing',
    path: 'missing.color',
    type: 'color',
    value: 'var(--s-action)',
  };
  assert(
    validateTokenHierarchy(m, { categoryMap: categories }).errors.some(
      (error) => error.code === 'group-category',
    ),
  );
});

test('consumer categories cannot be relabeled or overridden to borrow tokens', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-consumer-owner-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/input.css'),
      '.input { color: var(--group-trigger-background); }',
    );
    const m = manifest();
    m.consumers = [
      {
        file: 'src/input.css',
        family: 'trigger',
        rules: [{ selector: '.input', family: 'trigger' }],
      },
    ];
    const result = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert(result.errors.some((error) => error.code === 'consumer-category'));
    assert(result.errors.some((error) => error.code === 'consumer-rule-override'));
    assert(result.errors.some((error) => error.code === 'consumer-family'));
    await writeFile(
      join(rootDir, 'src/unknown.css'),
      '.unknown { color: var(--group-trigger-background); }',
    );
    m.consumers = [{ file: 'src/unknown.css', family: 'trigger' }];
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
        (error) => error.code === 'consumer-category',
      ),
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('shared CSS requires exact per-rule owners without a file-wide family fallback', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-shared-rules-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/shared.css'),
      '.button,\n .button:focus {color:var(--group-trigger-background)} @media (width < 640px) {.host .input {color:var(--group-input-color)}}',
    );
    const m = manifest();
    m.tokens['--group-input-color'] = {
      path: 'input.color',
      tier: 'group',
      family: 'input',
      type: 'color',
      value: 'var(--s-action)',
    };
    m.consumers = [{ file: 'src/shared.css', family: 'trigger' }];
    const missing = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert.equal(
      missing.errors.filter((error) => error.code === 'consumer-rule-unowned').length,
      2,
    );
    m.consumers[0].rules = [
      { selector: '.button, .button:focus', family: 'trigger' },
      { selector: '.host .input', family: 'input' },
    ];
    assert.deepEqual(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors,
      [],
    );
    m.consumers[0].rules[1].family = 'trigger';
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
        (error) => error.code === 'consumer-family',
      ),
    );
    m.consumers[0].rules[0].selector = '.button';
    const partial = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert(partial.errors.some((error) => error.code === 'consumer-rule-stale'));
    assert(partial.errors.some((error) => error.code === 'consumer-rule-unowned'));
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('shared CSS owner metadata rejects duplicate, stale, and unknown category entries', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-shared-metadata-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/shared.css'),
      '.button {color:var(--group-trigger-background)}',
    );
    const m = manifest();
    m.consumers = [
      {
        file: 'src/shared.css',
        rules: [
          { selector: '.button', family: 'trigger' },
          { selector: '.button', family: 'input' },
          { selector: '.gone', family: 'trigger' },
          { selector: '.button', family: 'missing' },
        ],
      },
    ];
    const result = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    for (const code of ['consumer-rule-duplicate', 'consumer-rule-stale', 'consumer-rule-owner'])
      assert(
        result.errors.some((error) => error.code === code),
        code,
      );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('shared helper selectors retain independent owners in exact scoped contexts', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-shared-context-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/shared.css'),
      `.sr-only {color:var(--group-trigger-background)}
      @scope (.link) to (.input) {.sr-only {color:var(--group-trigger-background)}}
      @media (width < 640px) {
        @scope (.input) to (.link) {.sr-only {color:var(--group-input-color)}}
      }`,
    );
    const m = manifest();
    m.tokens['--group-input-color'] = {
      path: 'input.color',
      tier: 'group',
      family: 'input',
      type: 'color',
      value: 'var(--s-action)',
    };
    m.consumers = [
      {
        file: 'src/shared.css',
        rules: [{ selector: '.sr-only', family: 'trigger' }],
      },
    ];
    const ambiguous = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
    assert(ambiguous.errors.some((error) => error.code === 'consumer-rule-ambiguous'));
    assert.equal(
      ambiguous.errors.filter((error) => error.code === 'consumer-rule-unowned').length,
      3,
    );
    m.consumers[0].rules = [
      { selector: '.sr-only', family: 'trigger', context: [] },
      {
        selector: '.sr-only',
        family: 'trigger',
        context: [{ name: 'scope', params: '(.link) to (.input)' }],
      },
      {
        selector: '.sr-only',
        family: 'input',
        context: [
          { name: 'media', params: '(width < 640px)' },
          { name: 'scope', params: '(.input)  to\n (.link)' },
        ],
      },
    ];
    assert.deepEqual(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors,
      [],
    );
    m.consumers[0].rules[2].family = 'trigger';
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
        (error) => error.code === 'consumer-family',
      ),
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('shared context must match the complete ordered ancestry and rejects malformed metadata', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-shared-context-validation-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/shared.css'),
      '@media (width < 640px) {@scope (.link) {.sr-only {color:var(--group-trigger-background)}}}',
    );
    const m = manifest();
    m.consumers = [{ file: 'src/shared.css', rules: [] }];
    const complete = [
      { name: 'media', params: '(width < 640px)' },
      { name: 'scope', params: '(.link)' },
    ];
    for (const context of [[], complete.slice(1), [...complete].reverse()]) {
      m.consumers[0].rules = [{ selector: '.sr-only', family: 'trigger', context }];
      const result = await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() });
      assert(result.errors.some((error) => error.code === 'consumer-rule-stale'));
      assert(result.errors.some((error) => error.code === 'consumer-rule-unowned'));
    }
    for (const context of [null, {}, [null], [{ name: 'scope' }], [{ name: '', params: '' }]]) {
      m.consumers[0].rules = [{ selector: '.sr-only', family: 'trigger', context }];
      assert(
        (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
          (error) => error.code === 'consumer-rule-context',
        ),
      );
    }
    m.consumers[0].rules = [
      { selector: '.sr-only', family: 'trigger' },
      { selector: '.sr-only', family: 'trigger', context: complete },
    ];
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
        (error) => error.code === 'consumer-rule-duplicate',
      ),
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('shared keyframes are owned by exact name, not generic from/to selectors', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-keyframe-owner-'));
  try {
    await mkdir(join(rootDir, 'src'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/shared.css'),
      '@keyframes trigger-spin {from {height:var(--group-trigger-gap)} to {height:calc(var(--group-trigger-gap) * 2)}} @keyframes input-slide {from {height:var(--group-input-gap)}}',
    );
    const m = manifest();
    m.tokens['--group-input-gap'] = {
      path: 'input.gap',
      tier: 'group',
      family: 'input',
      type: 'dimension',
      value: 'var(--s-gap)',
    };
    m.consumers = [
      {
        file: 'src/shared.css',
        rules: [
          { selector: 'from', family: 'trigger' },
          { selector: 'to', family: 'trigger' },
        ],
      },
    ];
    assert.equal(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.filter(
        (error) => error.code === 'consumer-rule-unowned',
      ).length,
      2,
    );
    m.consumers[0] = {
      file: 'src/shared.css',
      keyframes: [
        { name: 'trigger-spin', family: 'trigger' },
        { name: 'input-slide', family: 'input' },
      ],
    };
    assert.deepEqual(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors,
      [],
    );
    m.consumers[0].keyframes[1].family = 'trigger';
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categoryMap() })).errors.some(
        (error) => error.code === 'consumer-family',
      ),
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test('new production CSS and TS files cannot bypass ownership by omitting manifest registration', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'aegis-category-coverage-'));
  try {
    await mkdir(join(rootDir, 'src/components/button'), { recursive: true });
    await mkdir(join(rootDir, 'src/patterns/new-pattern'), { recursive: true });
    await mkdir(join(rootDir, 'src/review'), { recursive: true });
    await writeFile(
      join(rootDir, 'src/components/button/new.tsx'),
      "const color = 'var(--group-trigger-background)';",
    );
    await writeFile(
      join(rootDir, 'src/components/button/new.css'),
      '.button {color:var(--group-trigger-background)}',
    );
    await writeFile(
      join(rootDir, 'src/components/button/new.stories.tsx'),
      "const example = 'var(--missing)';",
    );
    await writeFile(
      join(rootDir, 'src/components/button/new.test.tsx'),
      "const test = 'var(--missing)';",
    );
    await writeFile(
      join(rootDir, 'src/review/prototype.tsx'),
      "const prototype = 'var(--missing)';",
    );
    await writeFile(join(rootDir, 'src/patterns/new-pattern/index.ts'), 'export {};');
    const m = manifest(),
      categories = categoryMap();
    const missing = await auditTokenConsumers(m, { rootDir, categoryMap: categories });
    assert.deepEqual(
      missing.errors
        .filter((error) => error.code === 'consumer-coverage')
        .map((error) => error.file),
      [
        'src/components/button/new.css',
        'src/components/button/new.tsx',
        'src/patterns/new-pattern/index.ts',
      ],
    );
    assert.equal(missing.inventoryFiles, 3);
    categories.categories.trigger.prefixes.push('src/patterns/new-pattern/');
    m.consumers = missing.errors.map(({ file }) => ({ file, family: 'trigger' }));
    assert.deepEqual(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categories })).errors,
      [],
    );
    await writeFile(join(rootDir, 'src/shared.css'), 'body{color:var(--group-trigger-background)}');
    assert(
      (await auditTokenConsumers(m, { rootDir, categoryMap: categories })).errors.some(
        (error) => error.code === 'consumer-coverage' && error.file === 'src/shared.css',
      ),
    );
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
