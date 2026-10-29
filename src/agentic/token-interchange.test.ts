import { describe, expect, it } from 'vitest';
import { configurations, designProfiles, resolveToken, validateCompiledManifest } from './profile';
import { exportDtcg, inspectDtcg, previewDtcgImport, serializeDtcg } from './token-interchange';

const source = {
  $extensions: { 'example.vendor': { keep: ['opaque', { nested: true }] } },
  palette: {
    $type: 'color',
    violet: {
      $value: { colorSpace: 'srgb', components: [0.4, 0.2, 0.6] },
      $extensions: { 'other.vendor': { arbitrary: 7 } },
    },
    brand: { $value: '{palette.violet}' },
  },
  shape: { $type: 'dimension', corner: { $value: { value: 12, unit: 'px' } } },
  typeface: { $type: 'fontFamily', primary: { $value: ['Georgia', 'serif'] } },
};

describe('DTCG supported-subset inspection', () => {
  it('preserves inherited types, aliases, values and unknown extension data without flattening', () => {
    const parsed = inspectDtcg(source);
    expect(parsed.issues).toEqual([]);
    expect(parsed.tokens.find((token) => token.path === 'palette.brand')).toMatchObject({
      type: 'color',
      value: '{palette.violet}',
      alias: 'palette.violet',
      resolvedValue: source.palette.violet.$value,
    });
    expect(JSON.parse(serializeDtcg(parsed.document!))).toEqual(source);
    expect(serializeDtcg(JSON.parse(serializeDtcg(source)))).toBe(serializeDtcg(source));
  });
  it('resolves local JSON Pointers, partial values and escaped names', () => {
    const result = inspectDtcg({
      'a/b': { $type: 'dimension', $value: { value: 12, unit: 'px' } },
      alias: { $type: 'dimension', $ref: '#/a~1b/$value' },
      number: { $type: 'number', $ref: '#/a~1b/$value/value' },
      composite: {
        $type: 'dimension',
        $value: { value: { $ref: '#/a~1b/$value/value' }, unit: 'rem' },
      },
    });
    expect(result.issues).toEqual([]);
    expect(result.tokens.find((token) => token.path === 'number')?.resolvedValue).toBe(12);
    expect(result.tokens.find((token) => token.path === 'composite')?.resolvedValue).toEqual({
      value: 12,
      unit: 'rem',
    });
  });
  it.each([
    { a: { $type: 'number', $value: '{missing}' } },
    { a: { $type: 'number', $value: '{b}' }, b: { $type: 'number', $value: '{a}' } },
    { a: { $type: 'number', $ref: '#/b/$value' }, b: { $type: 'number', $value: '{a}' } },
    { a: { $type: 'number', $ref: 'https://example.com/tokens.json#/a' } },
    { a: { $type: 'number', $value: '12{b}' } },
    { a: { $type: 'number', $value: 1 }, b: { $type: 'fontWeight', $value: '{a}' } },
    { group: { $type: 'number', a: { $value: 'oops' } } },
    { a: { $value: 2 } },
    { a: { $type: 'dimension', $value: { value: 4, unit: 'vw' } } },
    { a: { $type: 'color', $value: '#123456' } },
    { a: { $type: 'color', $value: { colorSpace: 'display-p3', components: [1, 0, 0] } } },
    { a: { $type: 'shadow', $value: {} } },
    { group: { $extends: '{other}' }, other: {} },
    { a: { $type: 'number', $value: 1, child: { $type: 'number', $value: 2 } } },
    { a: { $type: 'number', $value: 1, $ref: '#/b/$value' }, b: { $type: 'number', $value: 2 } },
    { 'bad.name': { $type: 'number', $value: 1 } },
  ])('rejects unsupported, malformed or ambiguous input %#', (input) => {
    expect(inspectDtcg(input).valid).toBe(false);
    expect(inspectDtcg(input).issues.some((issue) => issue.severity === 'error')).toBe(true);
  });
  it('rejects circular JavaScript input and non-JSON values without throwing', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    for (const invalid of [cycle, undefined, { a: () => 1 }, { a: NaN }, { a: new Date() }])
      expect(inspectDtcg(invalid).valid).toBe(false);
  });
});

describe('four-configuration DTCG export', () => {
  it('exports valid documents with tier-preserving aliases and explicit omission diagnostics', () => {
    const result = exportDtcg(designProfiles[0]);
    expect(Object.keys(result.documents)).toEqual([...configurations]);
    expect(result.stats.exported + result.stats.omitted).toBe(result.stats.total);
    expect(result.stats.aliases).toBeGreaterThan(0);
    expect(result.issues).toHaveLength(result.stats.omitted);
    for (const mode of configurations) {
      const inspection = inspectDtcg(result.documents[mode]);
      expect(inspection.issues).toEqual([]);
      for (const token of inspection.tokens.filter((token) => token.alias)) {
        if (token.path.startsWith('group.'))
          expect(token.alias!.startsWith('semantic.')).toBe(true);
        if (token.path.startsWith('semantic.'))
          expect(token.alias!.startsWith('primitive.')).toBe(true);
      }
      expect(JSON.parse(serializeDtcg(result.documents[mode]))).toEqual(result.documents[mode]);
      expect(
        inspection.tokens.find((token) => token.path === 'semantic.semantic-radius-l')
          ?.resolvedValue,
      ).toEqual({ value: 6, unit: 'px' });
    }
    expect(result.stats.omitted).toBeGreaterThan(0);
    expect(
      result.issues.some((issue) => issue.message.includes('Original expression is retained')),
    ).toBe(true);
  });
});

describe('explicit token-to-profile import preview', () => {
  it('maps colors, font and exact radius anchors without modifying the current profile or input', () => {
    const original = JSON.stringify(source);
    const current = structuredClone(designProfiles[0]);
    const result = previewDtcgImport(source, current, [
      { field: 'brand', tokenPath: 'palette.brand' },
      { field: 'font', tokenPath: 'typeface.primary' },
      { field: 'radius', tokenPath: 'shape.corner' },
    ]);
    expect(result.valid).toBe(true);
    expect(result.profile).toMatchObject({ brand: '#663399', radius: 'round', font: 'serif' });
    expect(current).toEqual(designProfiles[0]);
    expect(JSON.stringify(source)).toBe(original);
    expect(validateCompiledManifest(result.compiled!.manifest)).toEqual([]);
    for (const configuration of configurations)
      expect(resolveToken(result.compiled!.manifest, '--semantic-radius-l', configuration)).toBe(
        '12px',
      );
  });
  it('does not assume mappings from token names or execute source extensions', () => {
    const input = {
      brand: source.palette.violet,
      $extensions: {
        'org.aegis.interchange': { profile: designProfiles[1], css: 'body{display:none}' },
      },
    };
    expect(previewDtcgImport(input, designProfiles[0], []).valid).toBe(false);
  });
  it('rejects duplicate fields, missing paths, unsupported values and arbitrary fields', () => {
    const opaque = {
      color: { $type: 'color', $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 0.5 } },
    };
    expect(
      previewDtcgImport(opaque, designProfiles[0], [{ field: 'brand', tokenPath: 'color' }]).valid,
    ).toBe(false);
    expect(
      previewDtcgImport(source, designProfiles[0], [
        { field: 'brand', tokenPath: 'palette.brand' },
        { field: 'brand', tokenPath: 'palette.violet' },
      ]).valid,
    ).toBe(false);
    expect(
      previewDtcgImport(source, designProfiles[0], [{ field: 'brand', tokenPath: 'nope' }]).valid,
    ).toBe(false);
    expect(
      previewDtcgImport(source, designProfiles[0], [
        { field: 'radius', tokenPath: 'palette.brand' },
      ]).valid,
    ).toBe(false);
    expect(
      previewDtcgImport(source, designProfiles[0], [
        { field: 'radius', tokenPath: 'shape.corner', css: 'bad' } as never,
      ]).valid,
    ).toBe(false);
  });
});
