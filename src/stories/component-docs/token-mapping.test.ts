import { describe, expect, it } from 'vitest';
import { buildTokenInventory, type TokenDeclaration } from './token-inventory';
import {
  buildTokenMappings,
  mappingConfigurations,
  selectMappingTheme,
  type MappingManifest,
  type MappingConfiguration,
} from './token-mapping';
import type { ComponentMetadata } from './types';

const modes = (light: string, dark = light) =>
  Object.fromEntries(
    mappingConfigurations.map((mode) => [mode, mode.endsWith('.dark') ? dark : light]),
  );
const manifest: MappingManifest = {
  tokens: {
    '--group-trigger-fill': { tier: 'group', value: 'var(--semantic-fill)' },
    '--group-trigger-local': { tier: 'group', scope: 'local', value: 'var(--semantic-fill)' },
    '--group-trigger-gradient': { tier: 'group', value: 'var(--semantic-gradient)' },
    '--semantic-fill': {
      tier: 'semantic',
      mappings: modes('var(--color-light)', 'var(--color-dark)'),
    },
    '--semantic-gradient': {
      tier: 'semantic',
      mappings: modes(
        'linear-gradient(120deg, var(--color-lime), var(--color-blue) 50%, var(--color-purple))',
      ),
    },
    '--color-light': { tier: 'primitive', value: 'white' },
    '--color-dark': { tier: 'primitive', value: 'black' },
    '--color-lime': { tier: 'primitive', value: 'lime' },
    '--color-blue': { tier: 'primitive', value: 'blue' },
    '--color-purple': { tier: 'primitive', value: 'purple' },
  },
};
const row = (
  property: string,
  value: string,
  selector = '.aegis-button',
  component = 'Button',
): TokenDeclaration => ({
  property,
  value,
  selector,
  tokens: [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]),
  file: 'button.css',
  conditions: [],
  ownership: { kind: component === 'Button' ? 'owned' : 'nested', component, group: 'trigger' },
});
const fixture = (rows: TokenDeclaration[]) =>
  ({ name: 'Button', tokenGroup: 'trigger', css: rows }) as ComponentMetadata;
const mappings = (meta: ComponentMetadata, mode: MappingConfiguration = mappingConfigurations[0]) =>
  buildTokenMappings(buildTokenInventory(meta)[0], meta, manifest, mode);

describe('token mapping graph', () => {
  it.each(mappingConfigurations)(
    'follows the selected %s mapping without importing inactive theme branches',
    (mode) => {
      const [mapping] = mappings(fixture([row('background', 'var(--group-trigger-fill)')]), mode);
      const primitive = mode.endsWith('.dark') ? '--color-dark' : '--color-light';
      expect(mapping.nodes.map((node) => node.name)).toEqual(['--semantic-fill', primitive]);
      expect(mapping.expanded).toBe(mode.endsWith('.dark') ? 'black' : 'white');
    },
  );

  it('preserves every gradient operand and the expression instead of flattening it to one color', () => {
    const [mapping] = mappings(fixture([row('background', 'var(--group-trigger-gradient)')]));
    expect(
      mapping.nodes.filter((node) => node.tier === 'primitive').map((node) => node.name),
    ).toEqual(['--color-lime', '--color-blue', '--color-purple']);
    expect(mapping.nodes[0].expression).toContain('var(--color-blue) 50%');
    expect(mapping.expanded).toBe('linear-gradient(120deg, lime, blue 50%, purple)');
  });

  it('keeps local state selectors and media conditions and excludes other components and themes', () => {
    const meta = fixture([
      row('color', 'var(--group-trigger-local)'),
      row('--group-trigger-local', 'var(--semantic-fill)'),
      {
        ...row('--group-trigger-local', 'var(--semantic-gradient)', '.aegis-button:hover'),
        conditions: ['@media (hover: hover)'],
      },
      row('--group-trigger-local', 'var(--color-dark)', '.dark .aegis-button'),
      row('--group-trigger-local', 'var(--color-purple)', '.aegis-child', 'Child'),
    ]);
    const result = mappings(meta);
    expect(result).toHaveLength(2);
    expect(result[1].context).toBe('.aegis-button:hover · @media (hover: hover)');
    expect(result[0].expanded).toBe('white');
    expect(result[1].nodes.filter((node) => node.tier === 'primitive')).toHaveLength(3);
  });

  it('never substitutes a local manifest value when no scoped declaration exists', () => {
    const [mapping] = mappings(fixture([row('color', 'var(--group-trigger-local)')]));
    expect(mapping.expression).toBeUndefined();
    expect(mapping.expanded).toBeUndefined();
    expect(mapping.note).toContain('not a runtime default');
  });

  it('retains unresolved runtime references and an authored fallback without fabricating a primitive', () => {
    const [mapping] = mappings(
      fixture([
        row(
          'color',
          'var( --runtime-color , color-mix(in srgb, var(--group-trigger-fill) 20%, transparent))',
        ),
      ]),
    );
    expect(mapping.context).toContain('Default fallback');
    expect(mapping.expanded).toBe('color-mix(in srgb, white 20%, transparent)');
    expect(mapping.note).toContain('Fallback only');
    const [unknown] = mappings(fixture([row('width', 'var(--runtime-width)')]));
    expect(unknown.nodes).toEqual([]);
    expect(unknown.expanded).toBeUndefined();
  });

  it('uses layout-specific mappings instead of assuming the two layouts share every value', () => {
    const specific: MappingManifest = {
      tokens: {
        ...manifest.tokens,
        '--semantic-fill': {
          tier: 'semantic',
          mappings: {
            'fundamental.light': 'var(--color-light)',
            'fundamental.dark': 'var(--color-dark)',
            'fundamental-floating.light': 'var(--color-lime)',
            'fundamental-floating.dark': 'var(--color-purple)',
          },
        },
      },
    };
    const meta = fixture([row('background', 'var(--group-trigger-fill)')]);
    const entry = buildTokenInventory(meta)[0];
    expect(
      mappingConfigurations.map(
        (mode) => buildTokenMappings(entry, meta, specific, mode)[0].expanded,
      ),
    ).toEqual(['white', 'black', 'lime', 'purple']);
  });

  it('terminates a cyclic source graph without losing the referenced tokens', () => {
    const cyclic: MappingManifest = {
      tokens: {
        ...manifest.tokens,
        '--semantic-fill': { tier: 'semantic', value: 'var(--group-trigger-fill)' },
      },
    };
    const meta = fixture([row('background', 'var(--group-trigger-fill)')]);
    const [mapping] = buildTokenMappings(
      buildTokenInventory(meta)[0],
      meta,
      cyclic,
      mappingConfigurations[0],
    );
    expect(mapping.nodes.map((node) => node.name)).toEqual([
      '--semantic-fill',
      '--group-trigger-fill',
    ]);
    expect(mapping.nodes[1].note).toContain('Cyclic');
  });

  it('selects nested light-dark branches and keeps all active color-mix operands', () => {
    expect(
      selectMappingTheme('color-mix(in srgb, light-dark(var(--a), var(--b)) 20%, var(--c))', true),
    ).toBe('color-mix(in srgb, var(--b) 20%, var(--c))');
    expect(
      selectMappingTheme('light-dark(calc(2px + var(--a)), calc(4px + var(--b)))', false),
    ).toBe('calc(2px + var(--a))');
  });
});
