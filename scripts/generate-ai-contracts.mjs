/** Publish compact, source-derived contracts without executing component implementations. */
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readdir, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  documentationId,
  documentationSections,
  foundationNavigation,
  foundationNavigationLinks,
} from './component-doc-navigation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve('vite/package.json'))('postcss');
const foundationTokenFiles = [
  'src/styles/primitive-color-tokens.css',
  'src/styles/elevation-tokens.css',
  'src/styles/design-tokens.css',
];
const tokenManifestFile = 'tokens/design-tokens.json';
const configurations = [
  'fundamental.light',
  'fundamental.dark',
  'fundamental-floating.light',
  'fundamental-floating.dark',
];
const unique = (items) => [...new Set(items)].sort();
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const schemaVersion = 1;
const sectionNames = documentationSections.map(([, label]) => label);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function categoryOf(meta) {
  return meta.category.replace(/^(?:Components|Patterns)\//, '');
}

function kindOf(meta) {
  if (['component', 'pattern', 'foundation'].includes(meta.kind)) return meta.kind;
  if (meta.title.startsWith('Patterns/')) return 'pattern';
  if (meta.title.startsWith('Foundations/')) return 'foundation';
  return 'component';
}

function supportsPublishedTheme(row) {
  const layouts = [...row.selector.matchAll(/data-layout-theme\s*=\s*['"]([^'"]+)/g)].map(
    (match) => match[1],
  );
  return (
    !layouts.length ||
    layouts.some((layout) => ['fundamental', 'fundamental-floating'].includes(layout))
  );
}

function importKey(importPath, packageName) {
  if (importPath === packageName) return '.';
  return importPath.startsWith(`${packageName}/`)
    ? `./${importPath.slice(packageName.length + 1)}`
    : undefined;
}

function linksFor(meta, prefix) {
  const hub = `${prefix}?path=/docs/${documentationId(meta)}`;
  return {
    contract: `${prefix === '../' ? './components/' : './'}${meta.id}.json`,
    overview: `${hub}&docsTab=overview`,
    anatomy: `${hub}&docsTab=guidelines&docsSection=anatomy`,
    api: `${hub}&docsTab=guidelines&docsSection=api`,
    tokens: `${hub}&docsTab=tokens`,
  };
}

function validateInputs(families, aliases, manifest) {
  assert(families.length > 0, 'No component metadata found.');
  assert(
    aliases && typeof aliases === 'object' && !Array.isArray(aliases),
    'componentAliases must be an object.',
  );
  const ids = new Set();
  for (const meta of families) {
    assert(
      typeof meta.id === 'string' && /^[a-z0-9-]+$/.test(meta.id),
      `Invalid component ID: ${meta.id}`,
    );
    assert(!ids.has(meta.id), `Duplicate component ID: ${meta.id}`);
    ids.add(meta.id);
    assert(meta.name && meta.title && meta.category, `Missing identity for ${meta.id}`);
    assert(
      Array.isArray(meta.props) && Array.isArray(meta.css) && Array.isArray(meta.imports),
      `Incomplete metadata for ${meta.id}`,
    );
    for (const item of meta.imports) {
      const key = importKey(item.path, manifest.name);
      assert(
        key && Object.hasOwn(manifest.exports, key),
        `Unpublished import ${item.path} in ${meta.id}`,
      );
      assert(
        /^[A-Za-z_$][\w$]*$/.test(item.name),
        `Invalid exported name ${item.name} in ${meta.id}`,
      );
    }
  }
  for (const [id, values] of Object.entries(aliases)) {
    assert(ids.has(id), `Aliases reference unknown component ${id}`);
    assert(
      Array.isArray(values) && values.every((value) => typeof value === 'string' && value.trim()),
      `Invalid aliases for ${id}`,
    );
  }
  assert(
    Object.hasOwn(manifest.exports, './styles.css'),
    'The public stylesheet export is missing.',
  );
  assert(
    Object.hasOwn(manifest.exports, './primitives'),
    'The public headless primitives export is missing.',
  );
}

const string = { type: 'string' };
const strings = { type: 'array', items: string, uniqueItems: true };
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const ref = (name) => ({ $ref: `#/$defs/${name}` });

export function contractSchema() {
  const header = (documentType) => ({
    $schema: string,
    schemaVersion: { const: 1 },
    documentType: { const: documentType },
    package: ref('package'),
  });
  const identity = {
    id: string,
    name: string,
    category: string,
    tokenGroup: { type: ['string', 'null'] },
    kind: { enum: ['component', 'pattern', 'foundation'] },
    aliases: strings,
    purpose: string,
    importPaths: strings,
    links: ref('links'),
  };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Public component and token contracts',
    description:
      'Source extraction and authored guidance. These documents do not certify runtime behavior, accessibility, design parity, or agent performance.',
    oneOf: [ref('index'), ref('component'), ref('tokenGraph')],
    $defs: {
      package: object({ name: string, version: string }),
      links: object({
        contract: string,
        overview: string,
        anatomy: string,
        api: string,
        tokens: string,
      }),
      identity: object(identity),
      navigationLink: object({ label: string, id: string, url: string }),
      provenance: object({
        generator: string,
        metadata: string,
        guidance: string,
        aliases: string,
        navigation: string,
        foundationTokens: strings,
        tokenManifest: { type: ['string', 'null'] },
        sourceDigest: string,
      }),
      evidence: object({
        api: { const: 'source-extracted' },
        guidance: { enum: ['authored', 'not-authored'] },
        runtimeVerification: { const: 'not-included' },
        designParity: { const: 'not-recorded' },
      }),
      prop: object(
        {
          component: string,
          name: string,
          type: string,
          required: { type: 'boolean' },
          defaultValue: string,
          description: string,
        },
        ['component', 'name', 'type', 'required'],
      ),
      variant: object({ name: string, values: strings, default: string }, ['name', 'values']),
      guidance: object(
        {
          overview: string,
          usage: strings,
          accessibility: strings,
          intent: strings,
          context: strings,
        },
        [],
      ),
      dependency: object({
        name: string,
        componentIds: strings,
        contracts: strings,
        resolution: { enum: ['documented', 'not-in-index'] },
      }),
      story: object({ id: string, name: string, url: string, sourceFile: string }, [
        'id',
        'name',
        'url',
      ]),
      tokenBinding: object({
        token: string,
        ownership: { enum: ['owned', 'nested'] },
        component: string,
        group: { type: ['string', 'null'] },
      }),
      sourceFacts: object({
        roles: strings,
        ariaAttributes: strings,
        nativeElements: strings,
        keyboardKeys: strings,
        dependencies: strings,
      }),
      definition: object({
        expression: string,
        selector: string,
        conditions: strings,
        source: string,
        references: strings,
      }),
      token: object(
        {
          status: { enum: ['declared', 'runtime-or-unresolved'] },
          canonical: { type: 'boolean' },
          path: string,
          tier: { enum: ['primitive', 'semantic', 'group'] },
          type: string,
          value: string,
          mappings: object(Object.fromEntries(configurations.map((name) => [name, string]))),
          family: string,
          group: string,
          invariant: { type: 'boolean' },
          scope: { enum: ['local'] },
          definitions: { type: 'array', items: ref('definition') },
          references: strings,
          consumers: strings,
        },
        ['status', 'canonical', 'definitions', 'references', 'consumers'],
      ),
      index: object({
        ...header('index'),
        provenance: ref('provenance'),
        description: string,
        limitations: strings,
        supportedThemes: object({ color: strings, presentation: strings }),
        consumption: object({
          styled: object({ stylesheetImport: string, guidance: string }),
          headless: object({ importPath: string, importStatement: string, guidance: string }),
        }),
        navigation: object({
          topLevel: { type: 'array', items: ref('navigationLink') },
          foundations: { type: 'array', items: ref('navigationLink') },
          agenticSkills: { type: 'array', items: ref('navigationLink') },
        }),
        tokenGraph: string,
        components: { type: 'array', items: ref('identity') },
      }),
      component: object({
        ...header('component'),
        ...identity,
        description: string,
        exports: strings,
        importStatements: strings,
        stylesheetImport: string,
        props: { type: 'array', items: ref('prop') },
        variants: { type: 'array', items: ref('variant') },
        composition: { type: 'array', items: ref('dependency') },
        guidance: ref('guidance'),
        evidence: ref('evidence'),
        sourceFacts: ref('sourceFacts'),
        sourceFiles: strings,
        stories: { type: 'array', items: ref('story') },
        tokenRefs: strings,
        tokenBindings: { type: 'array', items: ref('tokenBinding') },
        tokenGraph: string,
      }),
      tokenGraph: object({
        ...header('token-graph'),
        description: string,
        limitations: strings,
        configurations: strings,
        tokens: { type: 'object', additionalProperties: ref('token') },
      }),
    },
  };
}

/** Pure artifact construction is also used by the focused contract tests. */
export function buildArtifacts({
  families,
  aliases,
  guidance,
  manifest,
  foundationTokens = [],
  tokenManifest,
}) {
  validateInputs(families, aliases, manifest);
  if (tokenManifest) {
    assert(
      JSON.stringify(tokenManifest.configurations) === JSON.stringify(configurations),
      'The canonical token manifest must declare the four supported configurations in order.',
    );
    for (const [name, entry] of Object.entries(tokenManifest.tokens)) {
      assert(
        name.startsWith('--') && typeof entry.path === 'string',
        `Invalid canonical token ${name}`,
      );
      assert(
        ['primitive', 'semantic', 'group'].includes(entry.tier),
        `Invalid canonical tier for ${name}`,
      );
      assert(typeof entry.type === 'string', `Missing canonical type for ${name}`);
      if (entry.tier === 'semantic')
        assert(
          entry.mappings &&
            JSON.stringify(Object.keys(entry.mappings).sort()) ===
              JSON.stringify([...configurations].sort()) &&
            Object.values(entry.mappings).every((value) => typeof value === 'string'),
          `Semantic token ${name} requires four explicit configuration mappings.`,
        );
      else assert(typeof entry.value === 'string', `Canonical token ${name} requires a value.`);
    }
  }
  families = [...families].sort((a, b) => a.id.localeCompare(b.id));
  const packageInfo = { name: manifest.name, version: manifest.version };
  const allNames = new Map();
  for (const meta of families)
    for (const name of unique([meta.name, ...(meta.exportNames ?? [])]))
      allNames.set(name, unique([...(allNames.get(name) ?? []), meta.id]));
  const tokens = new Map();
  const ensureToken = (name) => {
    if (!tokens.has(name))
      tokens.set(name, { definitions: new Map(), references: new Set(), consumers: new Set() });
    return tokens.get(name);
  };
  for (const [name, entry] of Object.entries(tokenManifest?.tokens ?? {})) {
    const token = ensureToken(name);
    token.canonical = Object.fromEntries(
      ['path', 'tier', 'type', 'value', 'mappings', 'family', 'invariant', 'scope']
        .filter((key) => entry[key] !== undefined)
        .map((key) => [key, entry[key]]),
    );
    if (entry.tier === 'group' && entry.family) token.canonical.group = entry.family;
    for (const value of [entry.value, ...Object.values(entry.mappings ?? {})].filter(Boolean))
      for (const [, reference] of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
        token.references.add(reference);
        ensureToken(reference);
      }
  }
  // Foundation primitives must remain discoverable even before any component consumes them.
  for (const row of foundationTokens) {
    assert(row.property.startsWith('--'), `Expected a foundation custom property: ${row.property}`);
    const token = ensureToken(row.property);
    const definition = {
      expression: row.value,
      selector: row.selector,
      conditions: [...row.conditions],
      source: row.file,
      references: unique(row.tokens),
    };
    token.definitions.set(JSON.stringify(definition), definition);
    for (const name of row.tokens) {
      token.references.add(name);
      ensureToken(name);
    }
  }
  const artifacts = new Map();
  const identities = [];
  for (const meta of families) {
    const authored = guidance[meta.name] ?? guidance[meta.title];
    const identity = {
      id: meta.id,
      name: meta.name,
      category: categoryOf(meta),
      tokenGroup: meta.tokenGroup ?? null,
      kind: kindOf(meta),
      aliases: unique(aliases[meta.id] ?? []),
      purpose: authored?.overview || meta.purpose || meta.description || '',
      importPaths: unique(meta.imports.map((item) => item.path)),
      links: linksFor(meta, '../'),
    };
    identities.push(identity);
    const imports = new Map();
    for (const item of meta.imports)
      imports.set(item.path, unique([...(imports.get(item.path) ?? []), item.name]));
    const tokenRefs = new Set();
    const tokenBindings = new Map();
    const supportedCss = meta.css.filter(supportsPublishedTheme);
    const supportedCssFiles = new Set(supportedCss.map((row) => row.file));
    for (const row of supportedCss) {
      const consumption =
        !row.property.startsWith('--') &&
        !['inherited', 'definition'].includes(row.ownership?.kind);
      for (const name of row.tokens) {
        const token = ensureToken(name);
        if (consumption) {
          tokenRefs.add(name);
          token.consumers.add(meta.id);
          const binding = {
            token: name,
            ownership: row.ownership?.kind === 'nested' ? 'nested' : 'owned',
            component: row.ownership?.component ?? meta.name,
            group: row.ownership?.group ?? meta.tokenGroup ?? null,
          };
          tokenBindings.set(JSON.stringify(binding), binding);
        }
      }
      if (row.property.startsWith('--')) {
        const token = ensureToken(row.property);
        const definition = {
          expression: row.value,
          selector: row.selector,
          conditions: [...row.conditions],
          source: row.file,
          references: unique(row.tokens),
        };
        token.definitions.set(JSON.stringify(definition), definition);
        for (const name of row.tokens) token.references.add(name);
      }
    }
    const sourceFacts = Object.fromEntries(
      ['roles', 'ariaAttributes', 'nativeElements', 'keyboardKeys', 'dependencies'].map((key) => [
        key,
        unique(meta.accessibility?.[key] ?? []),
      ]),
    );
    const contract = {
      $schema: '../schema.json#/$defs/component',
      schemaVersion,
      documentType: 'component',
      package: packageInfo,
      ...identity,
      links: linksFor(meta, '../../'),
      description: meta.description || '',
      exports: unique(meta.exportNames ?? meta.imports.map((item) => item.name)),
      importStatements: [
        ...[...imports]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([specifier, names]) => `import { ${names.join(', ')} } from '${specifier}';`),
      ],
      stylesheetImport: `import '${manifest.name}/styles.css';`,
      props: meta.props
        .filter((prop) => !prop.inherited)
        .map((prop) => ({
          component: prop.component,
          name: prop.name,
          type: prop.type,
          required: prop.required,
          ...(prop.defaultValue === undefined ? {} : { defaultValue: prop.defaultValue }),
          ...(prop.description ? { description: prop.description } : {}),
        })),
      variants: meta.variants.map((variant) => ({ ...variant, values: unique(variant.values) })),
      composition: unique(meta.relatedComponents ?? []).map((name) => {
        const ids = (allNames.get(name) ?? []).filter((id) => id !== meta.id);
        return {
          name,
          componentIds: ids,
          contracts: ids.map((id) => `./${id}.json`),
          resolution: ids.length ? 'documented' : 'not-in-index',
        };
      }),
      guidance: authored
        ? Object.fromEntries(
            Object.entries(authored).filter(([key]) =>
              ['overview', 'usage', 'accessibility', 'intent', 'context'].includes(key),
            ),
          )
        : {},
      evidence: {
        api: 'source-extracted',
        guidance: authored ? 'authored' : 'not-authored',
        runtimeVerification: 'not-included',
        designParity: 'not-recorded',
      },
      sourceFacts,
      sourceFiles: unique(
        meta.sourceFiles.filter((file) => !file.endsWith('.css') || supportedCssFiles.has(file)),
      ),
      stories: meta.stories.map((story) => ({
        id: story.id,
        name: story.name,
        url: `../../?path=/story/${story.id}`,
        ...(story.sourceFile ? { sourceFile: story.sourceFile } : {}),
      })),
      tokenRefs: unique(tokenRefs),
      tokenBindings: [...tokenBindings.values()],
      tokenGraph: '../tokens.json',
    };
    artifacts.set(`ai/components/${meta.id}.json`, json(contract));
  }
  const limitations = [
    'Declarations scoped only to unsupported presentation themes are excluded. Shared declarations and Fundamental or Fundamental Floating selectors are retained.',
    'Declarations are extracted from source, not a computed cascade or a universal resolved value. Selectors, media conditions, inheritance, state and CSS source order still apply.',
    'A runtime-or-unresolved token has no declaration in the extracted component source closure. It may be set dynamically or supplied by a consumer. This status is not proof that the token is invalid.',
    'Canonical paths, primitive/semantic/group tiers and configuration mappings come only from the explicit token manifest. Compatibility aliases and runtime variables are not classified as canonical by name.',
    'Canonical scope:local group tokens are assigned by their owning component selector or state. Their manifest value documents a default and is not a global CSS declaration.',
    'No accessibility, runtime test or design-parity success is inferred from source extraction.',
  ];
  const graph = {
    $schema: './schema.json#/$defs/tokenGraph',
    schemaVersion,
    documentType: 'token-graph',
    package: packageInfo,
    description:
      'Deduplicated CSS custom-property declarations and reference edges for documented components and the complete primitive color, opacity and elevation foundations.',
    limitations,
    configurations: tokenManifest ? [...tokenManifest.configurations] : [],
    tokens: Object.fromEntries(
      [...tokens]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, token]) => [
          name,
          {
            status:
              token.definitions.size || token.canonical ? 'declared' : 'runtime-or-unresolved',
            canonical: Boolean(token.canonical),
            ...(token.canonical ?? {}),
            definitions: [...token.definitions.values()].sort((a, b) =>
              JSON.stringify(a).localeCompare(JSON.stringify(b)),
            ),
            references: unique(token.references),
            consumers: unique(token.consumers),
          },
        ]),
    ),
  };
  artifacts.set('ai/tokens.json', json(graph));
  artifacts.set('ai/schema.json', json(contractSchema()));
  const provenance = {
    generator: 'scripts/generate-ai-contracts.mjs',
    metadata: 'src/stories/component-docs/generated/*.json',
    guidance: 'src/stories/component-docs/authored-guidance.ts',
    aliases: 'src/stories/component-docs/component-discovery.ts',
    navigation: 'scripts/component-doc-navigation.mjs',
    foundationTokens: unique(foundationTokens.map((row) => row.file)),
    tokenManifest: tokenManifest ? tokenManifestFile : null,
    sourceDigest: createHash('sha256')
      .update(
        JSON.stringify({
          families,
          aliases,
          guidance,
          navigation: foundationNavigation,
          foundationTokens,
          tokenManifest,
          package: packageInfo,
          exports: manifest.exports,
        }),
      )
      .digest('hex'),
  };
  artifacts.set(
    'ai/index.json',
    json({
      $schema: './schema.json#/$defs/index',
      schemaVersion,
      documentType: 'index',
      package: packageInfo,
      provenance,
      description:
        'Task-based discovery of component APIs, usage guidance, examples and token references.',
      limitations: [
        'Own component props are included. Inherited React and native HTML props remain available through the published TypeScript declarations and full API documentation.',
        'TypeScript types and defaults are source text, not JSON validation rules. Conditional prop requirements need the published declarations and authored guidance.',
        'Keyboard keys and ARIA names are source facts, not proof that every interaction or accessibility requirement has been verified.',
        'Runtime verification and design parity are not included in these contracts. Story links identify examples, not test results.',
      ],
      supportedThemes: {
        color: ['light', 'dark'],
        presentation: ['fundamental', 'fundamental-floating'],
      },
      consumption: {
        styled: {
          stylesheetImport: `import '${manifest.name}/styles.css';`,
          guidance:
            'Styled components use the optional shared stylesheet. Import it once to use the supplied visual language; omitting it requires consumer styling.',
        },
        headless: {
          importPath: `${manifest.name}/primitives`,
          importStatement: `import { Button } from '${manifest.name}/primitives';`,
          guidance:
            'This entry re-exports Base UI primitives without CSS. Its APIs are Base UI APIs, distinct from the styled component contracts in this index.',
        },
      },
      navigation: foundationNavigationLinks('../'),
      tokenGraph: './tokens.json',
      components: identities,
    }),
  );
  artifacts.set(
    'llms.txt',
    `# ${manifest.name}\n\n> React components and patterns for applications. Use the public contracts to discover supported APIs and guidance.\n\n## Start here\n\n- [Component index](./ai/index.json): Ordered documentation navigation, task-based categories, aliases, exact import paths and per-component contracts.\n- [Contract schema](./ai/schema.json): Version 1 JSON schema for the index, components and token graph.\n- [Token declaration graph](./ai/tokens.json): Source expressions, selectors, conditions and references. Values are not universal computed results.\n- [Documentation](./?path=/docs/foundations-welcome--docs): Live examples and full component guidance.\n\n## Documentation navigation\n\n${foundationNavigation
      .filter((page) => page.group === 'topLevel')
      .map((page) => `- [${page.label}](./?path=/docs/${page.id})`)
      .join('\n')}\n\nFoundations: ${foundationNavigation
      .filter((page) => page.group === 'foundations')
      .map((page) => `[${page.label}](./?path=/docs/${page.id})`)
      .join(' · ')}.\n\nAgentic Skills: ${foundationNavigation
      .filter((page) => page.group === 'agenticSkills')
      .map((page) => `[${page.label}](./?path=/docs/${page.id})`)
      .join(
        ' · ',
      )}.\n\n## Usage\n\nChoose a component from the index, read its contract, and import its exported name from the listed package path. Import the optional \`${manifest.name}/styles.css\` once for the supplied visual language. Without it, styled components require consumer styling. For headless composition, import Base UI primitives from \`${manifest.name}/primitives\`, which includes no CSS and uses Base UI APIs instead of the styled component APIs. Use the published TypeScript declarations for inherited HTML props and complex types. Preserve existing component names and choose categories by task, without atomic design grouping.\n\nEach component has one documentation hub with Overview, Guidelines, Tokens Used and Examples tabs. Contract documentation links select the matching hub tab; legacy section routes and individual story URLs remain accessible.\n\nComponent contracts distinguish source-extracted facts from authored guidance. Source ARIA and keyboard facts do not certify accessibility. Story links do not certify passing tests. Runtime verification and design parity are not included. Token declarations retain context; check the active theme, selector and state before overriding them. The published graph includes common definitions and Fundamental or Fundamental Floating declarations, excluding selectors scoped only to legacy presentation themes.\n`,
  );
  validateArtifacts(artifacts, families);
  return artifacts;
}

/** Check local artifact links, component references and token graph integrity. */
export function validateArtifacts(artifacts, families) {
  const storyIds = new Set(families.flatMap((meta) => meta.stories.map((story) => story.id)));
  const docsIds = new Set(
    families.flatMap((meta) => sectionNames.map((section) => documentationId(meta, section))),
  );
  const hubIds = new Set(families.map((meta) => documentationId(meta)));
  const hubTabs = new Set(['overview', 'guidelines', 'tokens', 'examples']);
  const guidelineSections = new Set([
    'anatomy',
    'types',
    'variants',
    'intent',
    'states',
    'sizes',
    'usage',
    'accessibility',
    'api',
    'context',
  ]);
  const graph = JSON.parse(artifacts.get('ai/tokens.json'));
  const index = JSON.parse(artifacts.get('ai/index.json'));
  const ids = new Set(index.components.map((item) => item.id));
  const foundationIds = new Set(foundationNavigation.map((page) => page.id));
  function link(from, target, foundation = false) {
    assert(
      typeof target === 'string' && !/^(?:[a-z]+:|\/)/i.test(target),
      `Non-relative link ${target} in ${from}`,
    );
    const resolved = new URL(target, `https://contracts.invalid/${from}`);
    const route = resolved.searchParams.get('path');
    if (route) {
      const [, kind, id] = route.split('/');
      assert(
        kind === 'story'
          ? storyIds.has(id)
          : kind === 'docs' && (foundation ? foundationIds.has(id) : docsIds.has(id)),
        `Unknown documentation link ${target} in ${from}`,
      );
      if (kind === 'docs' && !foundation) {
        const tab = resolved.searchParams.get('docsTab');
        const section = resolved.searchParams.get('docsSection');
        const example = resolved.searchParams.get('docsExample');
        assert(
          hubIds.has(id) && hubTabs.has(tab),
          `Documentation contracts must use a canonical hub tab: ${target}`,
        );
        assert(
          tab !== 'guidelines' || guidelineSections.has(section),
          `Unknown guideline section: ${target}`,
        );
        assert(!section || tab === 'guidelines', `Guideline section outside its tab: ${target}`);
        assert(
          !example || (tab === 'examples' && storyIds.has(example)),
          `Unknown example selection: ${target}`,
        );
      }
      return;
    }
    const artifact = resolved.pathname.slice(1);
    assert(artifacts.has(artifact), `Broken artifact link ${target} in ${from}`);
    if (resolved.hash) {
      let value = JSON.parse(artifacts.get(artifact));
      for (const segment of decodeURIComponent(resolved.hash.slice(2)).split('/'))
        value = value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
      assert(value !== undefined, `Missing JSON pointer ${target} in ${from}`);
    }
  }
  for (const [file, contents] of artifacts) {
    if (!file.endsWith('.json') || file === 'ai/schema.json') continue;
    const value = JSON.parse(contents);
    assert(value.schemaVersion === 1, `Unsupported schema version in ${file}`);
    link(file, value.$schema);
    if (value.tokenGraph) link(file, value.tokenGraph);
    if (value.documentType === 'index') {
      assert(
        JSON.stringify(value.navigation) === JSON.stringify(foundationNavigationLinks('../')),
        'Foundation navigation labels, order or stable URLs differ from the documentation contract.',
      );
      for (const group of Object.values(value.navigation))
        for (const item of group) link(file, item.url, true);
      for (const item of value.components)
        for (const target of Object.values(item.links)) link(file, target);
    }
    if (value.documentType === 'component') {
      for (const target of Object.values(value.links)) link(file, target);
      for (const story of value.stories) link(file, story.url);
      for (const dependency of value.composition) {
        for (const id of dependency.componentIds) assert(ids.has(id), `Unknown dependency ${id}`);
        for (const target of dependency.contracts) link(file, target);
      }
      for (const name of value.tokenRefs)
        assert(Object.hasOwn(graph.tokens, name), `Missing token ${name} in ${file}`);
    }
  }
  for (const [name, token] of Object.entries(graph.tokens)) {
    for (const target of token.references)
      assert(Object.hasOwn(graph.tokens, target), `Missing token edge ${name} -> ${target}`);
    for (const id of token.consumers) assert(ids.has(id), `Unknown token consumer ${id}`);
  }
}

async function loadDataModule(filename, exportName) {
  const source = await readFile(path.join(root, filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
  );
  assert(module[exportName], `${filename} must export ${exportName}`);
  return module[exportName];
}

async function outputFiles(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
      await Promise.all(
        entries.map((entry) =>
          entry.isDirectory()
            ? outputFiles(path.join(directory, entry.name))
            : [path.join(directory, entry.name)],
        ),
      )
    ).flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function readFoundationTokens() {
  return (
    await Promise.all(
      foundationTokenFiles.map(async (file) => {
        const ast = postcss.parse(await readFile(path.join(root, file), 'utf8'), { from: file });
        const rows = [];
        ast.walkDecls((declaration) => {
          if (!declaration.prop.startsWith('--')) return;
          const conditions = [];
          let parent = declaration.parent;
          while (parent) {
            if (parent.type === 'atrule') conditions.unshift(`@${parent.name} ${parent.params}`);
            parent = parent.parent;
          }
          rows.push({
            file,
            selector: declaration.parent.selector ?? ':root',
            conditions,
            property: declaration.prop,
            value: declaration.value,
            tokens: unique(
              [...declaration.value.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]),
            ),
          });
        });
        return rows;
      }),
    )
  ).flat();
}

async function main() {
  const metadataDirectory = path.join(root, 'src/stories/component-docs/generated');
  const files = (await readdir(metadataDirectory)).filter((file) => file.endsWith('.json')).sort();
  const [families, guidance, aliases, manifest, tokenManifest] = await Promise.all([
    Promise.all(
      files.map(async (file) =>
        JSON.parse(await readFile(path.join(metadataDirectory, file), 'utf8')),
      ),
    ),
    loadDataModule('src/stories/component-docs/authored-guidance.ts', 'authoredGuidance'),
    loadDataModule('src/stories/component-docs/component-discovery.ts', 'componentAliases'),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, tokenManifestFile), 'utf8').then(JSON.parse),
  ]);
  for (const meta of families)
    for (const file of meta.sourceFiles) await readFile(path.join(root, file));
  const foundationTokens = await readFoundationTokens();
  const artifacts = buildArtifacts({
    families,
    guidance,
    aliases,
    manifest,
    foundationTokens,
    tokenManifest,
  });
  const check = process.argv.includes('--check');
  const differences = [];
  const existing = await outputFiles(path.join(root, 'public/ai'));
  for (const filename of existing) {
    const relative = path.relative(path.join(root, 'public'), filename).split(path.sep).join('/');
    if (!artifacts.has(relative)) {
      if (check) differences.push(`Unexpected generated artifact: ${relative}`);
      else await rm(filename);
    }
  }
  for (const [relative, contents] of artifacts) {
    const filename = path.join(root, 'public', relative);
    if (check) {
      const current = await readFile(filename, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      });
      if (current !== contents) differences.push(`Outdated generated artifact: ${relative}`);
    } else {
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(filename, contents);
    }
  }
  assert(
    !differences.length,
    `${differences.join('\n')}\nRun node scripts/generate-ai-contracts.mjs after regenerating component metadata.`,
  );
  console.log(
    `${check ? 'Checked' : 'Generated'} ${families.length} compact component contracts, shared token graph, schema, index and llms.txt.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
