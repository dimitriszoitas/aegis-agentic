import { describe, expect, it } from 'vitest';
import {
  buildTokenInventory,
  classifyToken,
  expandVariables,
  type TokenDeclaration,
} from './token-inventory';
import type { ComponentMetadata } from './types';

const declaration = (
  property: string,
  value: string,
  tokens: string[],
  selector = '.aegis-button',
): TokenDeclaration => ({ property, value, tokens, selector, file: 'button.css', conditions: [] });

describe('token reference inventory', () => {
  it.each([
    ['background', '--color-bg-surface', 'Color / fill'],
    ['border', '--color-border-default', 'Border color'],
    ['border', '--stroke-1', 'Border width'],
    ['color', '--color-text-primary', 'Text color'],
    ['size', '--component-icon-sm', 'Icon'],
    ['height', '--component-grid-height', 'Sizing'],
    ['width', '--component-filter-picker-width', 'Sizing'],
    ['padding', '--space-3', 'Spacing'],
    ['border-radius', '--radius-md', 'Border radius'],
    ['font-size', '--text-sm', 'Font size'],
    ['font-weight', '--weight-medium', 'Font weight'],
    ['line-height', '--line-height-compact', 'Line height'],
    ['box-shadow', '--shadow-overlay', 'Elevation'],
    ['transition', '--duration-fast', 'Motion'],
    ['icon size', '--component-icon-tooltip-delay', 'Motion'],
    ['filter', '--blur-soft', 'Elevation'],
  ])('classifies %s using %s', (property, token, category) => {
    expect(classifyToken(declaration(property, `var(${token})`, [token]), token)).toBe(category);
  });

  it('keeps every variant usage while grouping repeated bindings, and excludes unsupported themes', () => {
    const meta = {
      css: [
        declaration('height', 'var(--control)', ['--control']),
        declaration('height', 'var(--control)', ['--control'], '.aegis-button:hover'),
        declaration('--control', 'var(--size-32)', ['--size-32']),
        declaration(
          'height',
          'var(--old-size)',
          ['--old-size'],
          "[data-layout-theme='minimalistic'] .aegis-button",
        ),
      ],
    } as ComponentMetadata;
    const result = buildTokenInventory(meta);
    expect(result).toHaveLength(1);
    expect(result[0].usages).toHaveLength(2);
  });

  it('separates a real nested component and excludes inherited styles and definitions', () => {
    const own = {
      kind: 'owned' as const,
      component: 'Link',
      group: 'trigger',
      category: 'Components/Triggers',
    };
    const nested = {
      kind: 'nested' as const,
      component: 'Icon',
      group: 'iconography',
      category: 'Foundations/Iconography',
    };
    const meta = {
      name: 'Link',
      tokenGroup: 'trigger',
      css: [
        {
          ...declaration('color', 'var(--group-trigger-link-color)', [
            '--group-trigger-link-color',
          ]),
          ownership: own,
        },
        {
          ...declaration('width', 'var(--group-iconography-size)', ['--group-iconography-size']),
          ownership: nested,
        },
        {
          ...declaration('font-family', 'var(--group-surface-font)', ['--group-surface-font']),
          ownership: { kind: 'inherited', component: 'Page defaults' },
        },
        {
          ...declaration('chart-height', 'var(--semantic-chart-height)', [
            '--semantic-chart-height',
          ]),
          ownership: { kind: 'definition', component: 'Token registry' },
        },
      ],
    } as ComponentMetadata;
    const result = buildTokenInventory(meta);
    expect(
      result.map(({ scope, component, ownershipMismatch }) => ({
        scope,
        component,
        ownershipMismatch,
      })),
    ).toEqual([
      { scope: 'owned', component: 'Link', ownershipMismatch: false },
      { scope: 'nested', component: 'Icon', ownershipMismatch: false },
    ]);
  });

  it('keeps actual wrong-category bindings visible instead of hiding source violations', () => {
    const meta = {
      name: 'Link',
      tokenGroup: 'trigger',
      css: [
        declaration('color', 'var(--group-surface-color)', ['--group-surface-color']),
        declaration('height', 'var(--semantic-size-m)', ['--semantic-size-m']),
        declaration('width', 'var(--measured-width)', ['--measured-width']),
      ],
    } as ComponentMetadata;
    const result = buildTokenInventory(meta);
    expect(result).toHaveLength(3);
    expect(result.map((entry) => entry.ownershipMismatch)).toEqual([true, true, false]);
  });

  it('does not combine a parent binding with a nested binding that uses the same token', () => {
    const base = declaration('height', 'var(--group-trigger-height)', ['--group-trigger-height']);
    const meta = {
      name: 'DropdownMenu',
      css: [
        { ...base, ownership: { kind: 'owned', component: 'DropdownMenu', group: 'trigger' } },
        { ...base, ownership: { kind: 'nested', component: 'Button', group: 'trigger' } },
      ],
    } as ComponentMetadata;
    expect(buildTokenInventory(meta)).toHaveLength(2);
  });

  it('expands aliases and balanced fallbacks without splitting nested color functions', () => {
    const values: Record<string, string> = {
      '--alias': 'var(--size)',
      '--size': '32px',
      '--blue': 'rgb(0, 0, 255)',
    };
    const lookup = (key: string) => values[key];
    expect(expandVariables('calc(var(--alias) + var(--missing, 2px))', lookup)).toBe(
      'calc(32px + 2px)',
    );
    expect(
      expandVariables('var(--missing, color-mix(in srgb, var(--blue) 20%, transparent))', lookup),
    ).toBe('color-mix(in srgb, rgb(0, 0, 255) 20%, transparent)');
    expect(expandVariables('var(--data-width) var(--alias)', lookup)).toBe(
      'var(--data-width) 32px',
    );
  });

  it('terminates cyclic aliases', () => {
    expect(expandVariables('var(--a)', (key) => (key === '--a' ? 'var(--b)' : 'var(--a)'))).toBe(
      'var(--a)',
    );
  });
});
