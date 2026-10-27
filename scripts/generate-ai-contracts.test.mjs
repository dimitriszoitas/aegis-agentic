import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArtifacts, validateArtifacts } from './generate-ai-contracts.mjs';
import {
  documentationId,
  documentationMetaId,
  documentationSections,
  foundationNavigationLinks,
} from './component-doc-navigation.mjs';

const definition = {
  file: 'src/styles/tokens.css',
  selector: ':root',
  conditions: [],
  property: '--control-height',
  value: 'var(--space-7)',
  tokens: ['--space-7'],
};
function family(id, name) {
  return {
    id,
    name,
    title: `Components/Actions/${name}`,
    category: 'Components/Actions',
    description: `${name} description`,
    purpose: `${name} purpose`,
    exportNames: [name],
    imports: [{ name, path: '@example/ui/button' }],
    props: [
      { component: name, name: 'size', type: '"sm" | "md"', required: false, defaultValue: '"md"' },
      { component: name, name: 'aria-label', type: 'string', required: false, inherited: true },
    ],
    variants: [{ name: 'size', values: ['sm', 'md'], default: 'md' }],
    relatedComponents: name === 'Button' ? ['Icon', 'ExternalHelper'] : [],
    sourceFiles: ['src/components/button/button.tsx'],
    stories: [
      {
        id: `${id}--default`,
        name: 'Default',
        sourceFile: 'src/components/button/button.stories.tsx',
      },
    ],
    accessibility: {
      roles: [],
      ariaAttributes: ['aria-busy'],
      nativeElements: ['button'],
      keyboardKeys: [],
      dependencies: [],
    },
    css: [
      definition,
      definition,
      {
        file: 'src/components/button/button.css',
        selector: '.button:hover',
        conditions: ['@media (hover: hover)'],
        property: 'height',
        value: 'var(--control-height)',
        tokens: ['--control-height'],
      },
    ],
  };
}
function input() {
  return {
    families: [
      family('components-actions-button', 'Button'),
      family('components-actions-icon', 'Icon'),
    ],
    aliases: { 'components-actions-button': ['cta', 'action'] },
    guidance: {
      Button: {
        overview: 'Perform an action.',
        usage: ['Choose a clear verb.'],
        accessibility: ['Keep the native button.'],
      },
    },
    manifest: {
      name: '@example/ui',
      version: '1.2.3',
      exports: {
        './button': './button.js',
        './styles.css': './styles.css',
        './primitives': './primitives.js',
      },
    },
  };
}
const read = (artifacts, file) => JSON.parse(artifacts.get(file));

test('contracts include own API and authored guidance without inventing verification', () => {
  const artifacts = buildArtifacts(input());
  const contract = read(artifacts, 'ai/components/components-actions-button.json');
  assert.deepEqual(
    contract.props.map((prop) => prop.name),
    ['size'],
  );
  assert.equal(contract.props[0].defaultValue, '"md"');
  assert.equal(contract.purpose, 'Perform an action.');
  assert.deepEqual(contract.importStatements, ["import { Button } from '@example/ui/button';"]);
  assert.equal(contract.stylesheetImport, "import '@example/ui/styles.css';");
  assert.equal(
    read(artifacts, 'ai/index.json').consumption.headless.importPath,
    '@example/ui/primitives',
  );
  assert.deepEqual(contract.guidance.usage, ['Choose a clear verb.']);
  assert.equal(contract.evidence.runtimeVerification, 'not-included');
  assert.equal(contract.evidence.designParity, 'not-recorded');
  assert.equal(
    read(artifacts, 'ai/components/components-actions-icon.json').evidence.guidance,
    'not-authored',
  );
  assert.deepEqual(contract.composition.find((item) => item.name === 'Icon').componentIds, [
    'components-actions-icon',
  ]);
  assert.equal(
    contract.composition.find((item) => item.name === 'ExternalHelper').resolution,
    'not-in-index',
  );
});

test('token graph deduplicates declarations and retains unresolved references and source context', () => {
  const source = input();
  source.families[1].css.push({
    ...definition,
    selector: '.dark',
    conditions: ['@media (min-width: 40rem)'],
    value: '40px',
    tokens: [],
  });
  const graph = read(buildArtifacts(source), 'ai/tokens.json');
  assert.equal(graph.tokens['--control-height'].definitions.length, 2);
  assert.deepEqual(graph.tokens['--control-height'].references, ['--space-7']);
  assert.equal(graph.tokens['--space-7'].status, 'runtime-or-unresolved');
  assert.deepEqual(graph.tokens['--space-7'].definitions, []);
  assert.ok(
    graph.tokens['--control-height'].definitions.some(
      (item) => item.selector === '.dark' && item.conditions[0] === '@media (min-width: 40rem)',
    ),
  );
});

test('legacy-only theme declarations and sources are excluded while common tokens remain', () => {
  const source = input();
  source.families[0].sourceFiles.push('src/styles/legacy.css');
  source.families[0].css.push({
    ...definition,
    file: 'src/styles/legacy.css',
    selector: "[data-layout-theme='minimalistic']",
    property: '--minimal-fill',
    value: 'var(--legacy-color)',
    tokens: ['--legacy-color'],
  });
  source.families[0].css.push({
    ...definition,
    selector: "[data-layout-theme='fundamental-floating']",
    value: '32px',
    tokens: [],
  });
  const artifacts = buildArtifacts(source);
  const graph = read(artifacts, 'ai/tokens.json');
  const contract = read(artifacts, 'ai/components/components-actions-button.json');
  assert.equal(graph.tokens['--minimal-fill'], undefined);
  assert.equal(graph.tokens['--legacy-color'], undefined);
  assert.ok(
    graph.tokens['--control-height'].definitions.some((item) =>
      item.selector.includes('fundamental-floating'),
    ),
  );
  assert.ok(graph.tokens['--control-height'].definitions.some((item) => item.selector === ':root'));
  assert.ok(!contract.sourceFiles.includes('src/styles/legacy.css'));
});

test('output is deterministic and deployment-safe under a nested public path', () => {
  const source = input();
  const first = buildArtifacts(source);
  const second = buildArtifacts({ ...source, families: [...source.families].reverse() });
  assert.deepEqual([...first], [...second]);
  const contract = read(first, 'ai/components/components-actions-button.json');
  const base = 'https://example.test/project/ai/components/components-actions-button.json';
  assert.equal(new URL(contract.tokenGraph, base).pathname, '/project/ai/tokens.json');
  assert.equal(new URL(contract.links.overview, base).pathname, '/project/');
  assert.equal(new URL(contract.$schema, base).pathname, '/project/ai/schema.json');
});

test('unknown aliases and unpublished package import paths are rejected', () => {
  assert.throws(
    () => buildArtifacts({ ...input(), aliases: { missing: ['button'] } }),
    /unknown component/,
  );
  const source = input();
  source.families[0].imports[0].path = '@example/ui/private';
  assert.throws(() => buildArtifacts(source), /Unpublished import/);
});

test('missing graph references and broken artifact links cannot pass validation', () => {
  const source = input();
  const artifacts = buildArtifacts(source);
  const graph = read(artifacts, 'ai/tokens.json');
  delete graph.tokens['--space-7'];
  artifacts.set('ai/tokens.json', JSON.stringify(graph));
  assert.throws(() => validateArtifacts(artifacts, source.families), /Missing token/);
  const other = buildArtifacts(source);
  other.delete('ai/schema.json');
  assert.throws(() => validateArtifacts(other, source.families), /Broken artifact link/);
});

test('documentation links target one canonical hub while direct stories retain stable routes', () => {
  const source = input();
  const artifacts = buildArtifacts(source);
  const contract = read(artifacts, 'ai/components/components-actions-button.json');
  const base = 'https://example.test/project/ai/components/components-actions-button.json';
  for (const [key, tab, section] of [
    ['overview', 'overview', null],
    ['anatomy', 'guidelines', 'anatomy'],
    ['api', 'guidelines', 'api'],
    ['tokens', 'tokens', null],
  ]) {
    const url = new URL(contract.links[key], base);
    assert.equal(url.pathname, '/project/');
    assert.equal(url.searchParams.get('path'), '/docs/components-actions-button-overview--docs');
    assert.equal(url.searchParams.get('docsTab'), tab);
    assert.equal(url.searchParams.get('docsSection'), section);
  }
  assert.equal(
    new URL(contract.stories[0].url, base).searchParams.get('path'),
    '/story/components-actions-button--default',
  );
});

test('renamed Icons family preserves its canonical and legacy documentation routes', () => {
  const icons = family('foundations-icons', 'Iconography');
  icons.title = 'Foundations/Iconography';
  icons.category = 'Foundations';
  icons.kind = 'foundation';
  assert.equal(documentationMetaId(icons), 'foundations-icons-overview');
  for (const [, label] of documentationSections)
    assert.equal(
      documentationId(icons, label),
      documentationId({ ...icons, title: 'Foundations/Icons' }, label),
    );
  const source = input();
  source.families.push(icons);
  const contract = read(buildArtifacts(source), 'ai/components/foundations-icons.json');
  assert.match(
    contract.links.anatomy,
    /path=\/docs\/foundations-icons-overview--docs&docsTab=guidelines&docsSection=anatomy$/,
  );
});

test('contract validation rejects unknown tabs and section-only navigation links', () => {
  const source = input();
  for (const target of [
    '../../?path=/docs/components-actions-button-overview--docs&docsTab=missing',
    '../../?path=/docs/components-actions-button-overview--docs&docsTab=guidelines&docsSection=missing',
    '../../?path=/docs/components-actions-button-component-guidelines-anatomy--docs',
  ]) {
    const artifacts = buildArtifacts(source);
    const filename = 'ai/components/components-actions-button.json';
    const contract = read(artifacts, filename);
    contract.links.anatomy = target;
    artifacts.set(filename, JSON.stringify(contract));
    assert.throws(
      () => validateArtifacts(artifacts, source.families),
      /canonical hub|Unknown guideline section/,
    );
  }
});

test('machine navigation matches the visible foundation structure and retains public destinations', () => {
  const artifacts = buildArtifacts(input());
  const index = read(artifacts, 'ai/index.json');
  assert.deepEqual(index.navigation, foundationNavigationLinks('../'));
  assert.deepEqual(
    index.navigation.topLevel.map((page) => page.label),
    ['Welcome', 'Principles', 'Directory', 'AI Guidelines'],
  );
  assert.deepEqual(
    index.navigation.foundations.map((page) => page.label),
    [
      'Colors',
      'Typography',
      'Spacing & Sizing',
      'Iconography',
      'Motion',
      'Opacity',
      'Border (Radius, Width, Style)',
      'Elevation',
      'Themes & Modes',
    ],
  );
  assert.deepEqual(
    index.navigation.agenticSkills.map((page) => page.label),
    ['Agentic Skills'],
  );
  const base = 'https://example.test/project/ai/index.json';
  const typography = index.navigation.foundations.find((page) => page.label === 'Typography');
  assert.equal(
    new URL(typography.url, base).searchParams.get('path'),
    '/docs/foundations-type-and-motion--docs',
  );
  const icons = index.navigation.foundations.find((page) => page.label === 'Iconography');
  assert.equal(
    new URL(icons.url, base).searchParams.get('path'),
    '/docs/foundations-icons-overview--docs',
  );
  assert.equal(new URL(icons.url, base).pathname, '/project/');
  assert.match(
    artifacts.get('llms.txt'),
    /\[Motion\]\(\.\/\?path=\/docs\/foundations-motion--docs\)/,
  );
  assert.match(
    artifacts.get('llms.txt'),
    /\[Agentic Skills\]\(\.\/\?path=\/docs\/agentic-skills-component-creation--docs\)/,
  );
  index.navigation.topLevel[0].label = 'Old welcome label';
  artifacts.set('ai/index.json', JSON.stringify(index));
  assert.throws(
    () => validateArtifacts(artifacts, input().families),
    /Foundation navigation labels/,
  );
});

test('unused foundation primitives and alpha aliases stay in the public token graph', () => {
  const source = input();
  source.foundationTokens = [
    {
      ...definition,
      file: 'src/styles/primitive-color-tokens.css',
      property: '--color-blue-300',
      value: 'rgb(180 200 230)',
      tokens: [],
    },
    {
      ...definition,
      file: 'src/styles/primitive-color-tokens.css',
      property: '--opacity-05',
      value: '0.05',
      tokens: [],
    },
    {
      ...definition,
      file: 'src/styles/primitive-color-tokens.css',
      property: '--color-blue-300-alpha-05',
      value: 'rgb(from var(--color-blue-300) r g b / var(--opacity-05))',
      tokens: ['--color-blue-300', '--opacity-05'],
    },
  ];
  const artifacts = buildArtifacts(source);
  const graph = read(artifacts, 'ai/tokens.json');
  {
    assert.equal(graph.tokens['--color-blue-300'].status, 'declared');
    assert.deepEqual(graph.tokens['--color-blue-300'].consumers, []);
    assert.deepEqual(graph.tokens['--color-blue-300-alpha-05'].references, [
      '--color-blue-300',
      '--opacity-05',
    ]);
    assert.deepEqual(read(artifacts, 'ai/index.json').provenance.foundationTokens, [
      'src/styles/primitive-color-tokens.css',
    ]);
  }
});

test('canonical manifest supplies explicit tiers, paths, groups and four mappings without classifying compatibility aliases', () => {
  const source = input();
  const configurations = [
    'fundamental.light',
    'fundamental.dark',
    'fundamental-floating.light',
    'fundamental-floating.dark',
  ];
  source.tokenManifest = {
    version: 1,
    configurations,
    tokens: {
      '--primitive-size-28': {
        path: 'size.28',
        tier: 'primitive',
        type: 'dimension',
        value: '28px',
      },
      '--semantic-size-control': {
        path: 'semantic.size.control',
        tier: 'semantic',
        type: 'dimension',
        invariant: true,
        mappings: Object.fromEntries(
          configurations.map((name) => [name, 'var(--primitive-size-28)']),
        ),
      },
      '--control-height': {
        path: 'group.button.height',
        tier: 'group',
        type: 'dimension',
        family: 'button',
        value: 'var(--semantic-size-control)',
        scope: 'local',
      },
    },
    consumers: [],
    dynamicVariables: [],
  };
  const artifacts = buildArtifacts(source);
  const graph = read(artifacts, 'ai/tokens.json');
  assert.deepEqual(graph.configurations, configurations);
  assert.equal(graph.tokens['--primitive-size-28'].canonical, true);
  assert.equal(graph.tokens['--primitive-size-28'].status, 'declared');
  assert.equal(graph.tokens['--primitive-size-28'].path, 'size.28');
  assert.equal(graph.tokens['--semantic-size-control'].tier, 'semantic');
  assert.equal(graph.tokens['--semantic-size-control'].invariant, true);
  assert.deepEqual(
    graph.tokens['--semantic-size-control'].mappings,
    source.tokenManifest.tokens['--semantic-size-control'].mappings,
  );
  assert.equal(graph.tokens['--control-height'].group, 'button');
  assert.equal(graph.tokens['--control-height'].scope, 'local');
  assert.ok(graph.tokens['--control-height'].references.includes('--semantic-size-control'));
  assert.equal(graph.tokens['--space-7'].canonical, false);
  assert.equal(graph.tokens['--space-7'].tier, undefined);
  assert.equal(
    read(artifacts, 'ai/index.json').provenance.tokenManifest,
    'tokens/design-tokens.json',
  );
  delete source.tokenManifest.tokens['--semantic-size-control'].mappings['fundamental.dark'];
  assert.throws(() => buildArtifacts(source), /four explicit configuration mappings/);
});

test('category bindings distinguish real nested components from registry definitions', () => {
  const data = input();
  const button = data.families[0];
  button.tokenGroup = 'trigger';
  button.css = [
    { ...definition, ownership: { kind: 'definition' } },
    {
      ...definition,
      property: 'background',
      value: 'var(--group-trigger-button-fill)',
      tokens: ['--group-trigger-button-fill'],
      ownership: { kind: 'owned', component: 'Button', group: 'trigger' },
    },
    {
      ...definition,
      property: 'color',
      value: 'var(--group-data-display-count-badge-foreground)',
      tokens: ['--group-data-display-count-badge-foreground'],
      ownership: { kind: 'nested', component: 'CountBadge', group: 'data-display' },
    },
    {
      ...definition,
      property: 'font-family',
      tokens: ['--group-layout-font-family'],
      ownership: { kind: 'inherited' },
    },
  ];
  const artifacts = buildArtifacts(data);
  validateArtifacts(artifacts, data.families);
  const contract = read(artifacts, 'ai/components/components-actions-button.json');
  assert.equal(contract.tokenGroup, 'trigger');
  assert.equal(contract.tokenBindings.length, 2);
  assert.deepEqual(
    contract.tokenBindings.map(({ ownership, group }) => ({ ownership, group })),
    [
      { ownership: 'owned', group: 'trigger' },
      { ownership: 'nested', group: 'data-display' },
    ],
  );
  assert(!contract.tokenRefs.includes('--space-7'));
  assert(!contract.tokenRefs.includes('--group-layout-font-family'));
  assert(!read(artifacts, 'ai/tokens.json').tokens['--space-7'].consumers.includes(button.id));
});
