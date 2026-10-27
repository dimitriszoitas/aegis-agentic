import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyCanonicalTokenMappings,
  parseTokenSources,
  tokenConfigurations,
} from './token-source';

describe('foundation token specimens', () => {
  it('resolves generated CSS by configuration without leaking Floating styling into Fundamental', () => {
    const css =
      ":root { --size: 28px; } :root, [data-layout-theme='fundamental'] { --surface: light-dark(white, black); } [data-layout-theme='fundamental-floating'] { --surface: light-dark(silver, gray); } .dark { --mode: dark; } :root, .aegis-theme-light { --mode: light; }";
    const base = parseTokenSources('', '', css);
    expect(base.light['--surface']).toBe('white');
    expect(base.dark['--surface']).toBe('black');
    expect(base.dark['--mode']).toBe('dark');
    const values = applyCanonicalTokenMappings(base, { tokens: {} }, css);
    expect(values['fundamental-floating.light']['--surface']).toBe('silver');
    expect(values['fundamental-floating.dark']['--surface']).toBe('gray');
    for (const configuration of tokenConfigurations)
      expect(values[configuration]['--size']).toBe('28px');
  });
  it('uses every explicit canonical mapping while retaining compatibility names and invariant sizes', () => {
    const mappings = Object.fromEntries(
      tokenConfigurations.map((name, index) => [name, `var(--primitive-color-${index})`]),
    );
    const values = applyCanonicalTokenMappings(
      { light: { '--legacy-only': '4px' }, dark: { '--legacy-only': '4px' } },
      {
        tokens: {
          '--primitive-size': { value: '28px' },
          '--semantic-surface': { mappings },
          '--group-card-surface': { value: 'var(--semantic-surface)' },
          '--group-card-state-fill': { value: 'var(--semantic-surface)', scope: 'local' },
        },
        compatibility: { '--color-bg-surface': '--semantic-surface' },
      },
    );
    for (const [index, configuration] of tokenConfigurations.entries()) {
      expect(values[configuration]['--semantic-surface']).toBe(`var(--primitive-color-${index})`);
      expect(values[configuration]['--group-card-surface']).toBe('var(--semantic-surface)');
      expect(values[configuration]['--group-card-state-fill']).toBeUndefined();
      expect(values[configuration]['--color-bg-surface']).toBe('var(--semantic-surface)');
      expect(values[configuration]['--primitive-size']).toBe('28px');
      expect(values[configuration]['--legacy-only']).toBe('4px');
    }
  });
  it('includes shared root and dark foundation declarations in both modes', () => {
    const values = parseTokenSources(
      ':root, .aegis-theme-light, .dark { --opacity-05: 0.05; --shadow-sm: var(--shadow-raised); }',
      '',
    );
    expect(values.light['--opacity-05']).toBe('0.05');
    expect(values.dark['--opacity-05']).toBe('0.05');
    expect(values.light['--shadow-sm']).toBe('var(--shadow-raised)');
    expect(values.dark['--shadow-sm']).toBe('var(--shadow-raised)');
  });

  it('uses canonical overrides in both colors and preserves shared aliases', () => {
    const values = parseTokenSources(
      ':root { --surface: white; --space: 4px; } .dark { --surface: black; }',
      ":is([data-layout-theme='fundamental'], [data-layout-theme='fundamental-floating']) { --surface: light-dark(white, gray); --nested: var(--space); }",
    );
    expect(values.light).toEqual({
      '--surface': 'white',
      '--space': '4px',
      '--nested': 'var(--space)',
    });
    expect(values.dark).toEqual({
      '--surface': 'gray',
      '--space': '4px',
      '--nested': 'var(--space)',
    });
  });

  it('selects nested color functions correctly without applying conditional rules', () => {
    const values = parseTokenSources(
      ':root { --size: 28px; } @media (max-width: 640px) { :root { --size: 20px; } }',
      "[data-layout-theme='fundamental'] { --fill: light-dark(color-mix(in srgb, red 20%, white), rgb(10, 20, 30)); } @media (max-width: 640px) { [data-layout-theme='fundamental'] { --size: 16px; } }",
    );
    expect(values.light['--fill']).toBe('color-mix(in srgb, red 20%, white)');
    expect(values.dark['--fill']).toBe('rgb(10, 20, 30)');
    expect(values.light['--size']).toBe('28px');
    expect(values.dark['--size']).toBe('28px');
  });

  it('documents the shared Fundamental component geometry rather than the legacy base', () => {
    const tokenValues = parseTokenSources(
      readFileSync(new URL('../../styles/tokens.css', import.meta.url), 'utf8'),
      readFileSync(new URL('../../styles/fundamental-tokens.css', import.meta.url), 'utf8'),
    );
    expect(tokenValues.light['--surface-radius']).toBe('8px');
    expect(tokenValues.dark['--surface-radius']).toBe('8px');
    expect(tokenValues.light['--button-radius-sm']).toBe('5px');
    expect(tokenValues.light['--layout-page-padding']).toBe('var(--space-7)');
    expect(tokenValues.light['--color-bg-canvas']).not.toBe(tokenValues.dark['--color-bg-canvas']);
    expect(tokenValues.light['--color-bg-canvas']).not.toContain('light-dark(');
  });
});
