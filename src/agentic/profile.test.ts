import { describe, expect, it } from 'vitest';
import canonical from '../../tokens/design-tokens.json';
import {
  compileProfile,
  contrastRatio,
  designProfiles,
  resolveToken,
  validateCompiledManifest,
  validateProfile,
  configurations,
} from './profile';
import type { DesignProfile } from './profile';

const original = designProfiles[0];
const copy = (profile = original): DesignProfile => structuredClone(profile);

describe('design profile validation', () => {
  it.each([null, [], 4, 'profile'])('rejects non-object input %s', (value) => {
    expect(validateProfile(value).some((issue) => issue.severity === 'error')).toBe(true);
  });
  it('rejects unknown keys, unsupported versions, unsafe selectors and arbitrary CSS values', () => {
    for (const patch of [
      { mode: 'light' },
      { version: 2 },
      { id: 'x"] {body{display:none}}' },
      { brand: 'red; --x: 2px' },
      { font: 'arbitrary' },
    ])
      expect(
        validateProfile({ ...original, ...patch }).some((issue) => issue.severity === 'error'),
      ).toBe(true);
    expect(() =>
      compileProfile({ ...original, semantic: { ...original.semantic, danger: '#123' } }),
    ).toThrow();
    expect(
      validateProfile({
        ...original,
        semantic: { ...original.semantic, surprise: '#123456' },
      }).some((i) => i.code === 'unknown-semantic'),
    ).toBe(true);
  });
  it('warns when semantic seeds collide without blocking an otherwise valid profile', () => {
    const profile = {
      ...original,
      semantic: { ...original.semantic, success: original.semantic.danger },
    };
    expect(validateProfile(profile)).toEqual([
      expect.objectContaining({ code: 'semantic-collision', severity: 'warning' }),
    ]);
  });
});

describe('deterministic profile compiler', () => {
  it('passes the existing independent repository token graph checker for every preset', async () => {
    const validator = await import(
      new URL('../../scripts/check-token-hierarchy.mjs', import.meta.url).href
    );
    for (const profile of designProfiles)
      expect(validator.validateTokenHierarchy(compileProfile(profile).manifest).errors).toEqual([]);
  });
  it('preserves the complete original manifest and does not mutate the canonical source', () => {
    const before = JSON.stringify(canonical);
    const result = compileProfile(original);
    expect(result.manifest).toEqual(canonical);
    expect(result.stats.changed).toBe(0);
    compileProfile(designProfiles[1]);
    expect(JSON.stringify(canonical)).toBe(before);
    expect(result.manifest).toEqual(canonical);
  });
  it('produces stable output across copies and input object key order', () => {
    const first = compileProfile(designProfiles[1]);
    const input = Object.fromEntries(
      Object.entries(designProfiles[1]).reverse(),
    ) as unknown as DesignProfile;
    const second = compileProfile(input);
    expect(second.hash).toBe(first.hash);
    expect(second.css).toBe(first.css);
    expect(second.manifest).toEqual(first.manifest);
  });
  it.each(designProfiles)(
    '$id emits a complete valid graph with unchanged group ownership',
    (profile) => {
      const result = compileProfile(profile);
      expect(validateCompiledManifest(result.manifest)).toEqual([]);
      expect(result.manifest.configurations).toEqual([...configurations]);
      for (const [name, token] of Object.entries(result.manifest.tokens)) {
        if (token.tier === 'semantic') {
          expect(Object.keys(token.mappings!).sort()).toEqual([...configurations].sort());
          if (token.invariant) expect(new Set(Object.values(token.mappings!)).size).toBe(1);
        }
        if (token.tier === 'group')
          expect(token).toEqual(canonical.tokens[name as keyof typeof canonical.tokens]);
      }
      expect(result.css).toContain(`[data-agentic-profile="${profile.id}"]`);
      expect(result.css).toContain('light-dark(');
      expect(result.css).toContain('@media (forced-colors: active)');
    },
  );
  it('rebrands direct references and the raw colors embedded in dependent mixes', () => {
    const result = compileProfile({ ...original, brand: '#7d368b' });
    expect(
      resolveToken(result.manifest, '--semantic-color-action-fill', 'fundamental.light'),
    ).not.toContain('#356ac3');
    expect(
      resolveToken(result.manifest, '--semantic-color-action-soft', 'fundamental.light'),
    ).not.toContain('#356ac3');
    expect(
      resolveToken(result.manifest, '--semantic-color-action-border', 'fundamental.dark'),
    ).not.toContain('#7ba5ed');
    expect(
      resolveToken(result.manifest, '--semantic-color-action-outline', 'fundamental.light'),
    ).not.toContain('#356ac3');
    // A baseline id is not a bypass: changes to an Aegis profile compile normally.
    expect(result.stats.changed).toBeGreaterThan(0);
  });
  it('keeps density independent from color, metrics and presentation', () => {
    const comfortable = compileProfile(original),
      compact = compileProfile({ ...original, density: 'compact' });
    expect(compact.manifest).toEqual(comfortable.manifest);
    expect(compact.css).toBe(comfortable.css);
    expect(compact.runtimeDefaults.density).toBe('compact');
    expect(compact.runtimeDefaults.numericMetrics).toBe('unchanged');
    expect(compact.hash).not.toBe(comfortable.hash);
  });
  it('scales radius roles without changing dimensions, circle geometry or the relative group graph', () => {
    const result = compileProfile({ ...original, radius: 'round' });
    expect(resolveToken(result.manifest, '--semantic-radius-l', 'fundamental.light')).toBe('12px');
    expect(resolveToken(result.manifest, '--semantic-radius-circle', 'fundamental.light')).toBe(
      '50%',
    );
    expect(resolveToken(result.manifest, '--semantic-radius-xxxxl', 'fundamental.light')).toBe(
      '999px',
    );
    expect(result.manifest.tokens['--primitive-size-6']).toEqual(
      canonical.tokens['--primitive-size-6'],
    );
    expect(
      resolveToken(result.manifest, '--semantic-measurement-chart-dot-radius', 'fundamental.light'),
    ).toBe('4px');
    expect(resolveToken(result.manifest, '--semantic-chrome-radius', 'fundamental.light')).toBe(
      '0px',
    );
    expect(
      resolveToken(result.manifest, '--semantic-chrome-radius', 'fundamental-floating.light'),
    ).toBe('24px');
  });
  it('isolates an info hue from shared neutral text', () => {
    const result = compileProfile({
      ...original,
      semantic: { ...original.semantic, info: '#9c426b' },
    });
    expect(
      resolveToken(
        result.manifest,
        '--semantic-color-severity-info-foreground',
        'fundamental.light',
      ),
    ).not.toBe(
      resolveToken(
        compileProfile(original).manifest,
        '--semantic-color-severity-info-foreground',
        'fundamental.light',
      ),
    );
    expect(result.manifest.tokens['--color-slate-700']).toEqual(
      canonical.tokens['--color-slate-700'],
    );
  });
  it('gives the two alternative profiles visibly distinct color, type and shape values', () => {
    const [precision, studio] = designProfiles.slice(1).map(compileProfile);
    for (const token of [
      '--semantic-color-action-fill',
      '--semantic-color-surface-canvas',
      '--semantic-radius-l',
      '--semantic-font-family-ui',
    ])
      expect(resolveToken(precision.manifest, token, 'fundamental.light')).not.toBe(
        resolveToken(studio.manifest, token, 'fundamental.light'),
      );
  });
  it('reports measured contrast for each named pair in all four combinations', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBe(21);
    for (const profile of designProfiles) {
      const result = compileProfile(profile);
      expect(result.contrast).toHaveLength(36);
      for (const pair of result.contrast) {
        expect(pair.ratio).toBe(
          Math.round(contrastRatio(pair.foreground, pair.background) * 100) / 100,
        );
        expect(pair.passes).toBe(contrastRatio(pair.foreground, pair.background) >= pair.minimum);
      }
    }
  });
  it('adapts very light and dark brand seeds to readable action treatments', () => {
    for (const brand of ['#ffff00', '#ffffff', '#000000', '#00ff00']) {
      const result = compileProfile({ ...copy(designProfiles[1]), brand });
      expect(
        result.contrast.filter((pair) => /action/i.test(pair.pair)).every((pair) => pair.passes),
      ).toBe(true);
    }
  });
  it('detects missing references and illegal tier crossings independently of compilation', () => {
    const manifest = compileProfile(original).manifest;
    manifest.tokens['--semantic-color-action-fill'].mappings!['fundamental.light'] =
      'var(--missing)';
    manifest.tokens['--group-trigger-button-radius-soft'].value = 'var(--primitive-size-6)';
    const issues = validateCompiledManifest(manifest);
    expect(issues.some((i) => i.code === 'output-reference')).toBe(true);
    expect(issues.some((i) => i.code === 'output-tier')).toBe(true);
  });
});
