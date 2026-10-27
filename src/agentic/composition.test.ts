import { describe, expect, it } from 'vitest';
import {
  defaultCompositionSpec,
  resolveComposition,
  validateCompositionSpec,
  stableFingerprint,
  type CompositionSpec,
} from './composition';
import { registry } from './registry';

describe('declarative composition', () => {
  it('resolves stable output independent of JSON property order', () => {
    const first = resolveComposition(defaultCompositionSpec);
    const shuffled = Object.fromEntries(Object.entries(defaultCompositionSpec).reverse());
    expect(resolveComposition(shuffled)).toEqual(first);
    expect(first.recipe.map((part) => part.slot)).toEqual([
      'root',
      'filter:query',
      'filter:status',
    ]);
    expect(first.stableHash).toMatch(/^fnv1a32-[a-f0-9]{8}$/);
  });
  it.each(['light', 'dark'] as const)(
    'supports %s and both presentation variants without changing density',
    (mode) => {
      for (const presentation of ['fundamental', 'fundamental-floating'] as const) {
        const result = resolveComposition({ ...defaultCompositionSpec, mode, presentation });
        expect(result.recipe[0].props.density).toBe('comfortable');
      }
    },
  );
  it('rejects incoherent immediate and explicit filter combinations', () => {
    expect(
      validateCompositionSpec({
        ...defaultCompositionSpec,
        filters: { ...defaultCompositionSpec.filters, showApplyButton: true },
      }).valid,
    ).toBe(false);
    expect(
      validateCompositionSpec({
        ...defaultCompositionSpec,
        filters: { ...defaultCompositionSpec.filters, application: 'explicit' },
      }).valid,
    ).toBe(false);
    const explicit = resolveComposition({
      ...defaultCompositionSpec,
      filters: {
        ...defaultCompositionSpec.filters,
        application: 'explicit',
        showApplyButton: true,
      },
    });
    expect(explicit.recipe.at(-1)?.componentId).toBe('button');
  });
  it.each([
    { density: 'spacious' },
    { presentation: 'floating' },
    { mode: 'auto' },
    { profileRevision: 0 },
    { registryRevision: 0 },
    { customCss: 'color:red' },
    { pattern: 'unknown' },
  ])('rejects unknown or invalid options %j', (change) => {
    expect(() => resolveComposition({ ...defaultCompositionSpec, ...change })).toThrow();
  });
  it('requires exact filter shape, unique identities and labeled options', () => {
    const invalidControls = [
      [{ id: 'status', kind: 'select', label: 'Status' }],
      [{ id: 'query', kind: 'text', label: 'Search', options: [] }],
      [
        {
          id: 'status',
          kind: 'select',
          label: 'Status',
          options: [
            { value: 'Active', label: 'One' },
            { value: 'Active', label: 'Duplicate' },
          ],
        },
      ],
      [
        { id: 'query', kind: 'text', label: 'Search' },
        { id: 'query', kind: 'text', label: 'Another' },
      ],
      [{ id: 'query', kind: 'text', label: ' ' }],
      [{ id: 'query', kind: 'text', label: 'Search', style: {} }],
    ];
    for (const controls of invalidControls)
      expect(
        validateCompositionSpec({
          ...defaultCompositionSpec,
          filters: { ...defaultCompositionSpec.filters, controls },
        }).valid,
      ).toBe(false);
  });
  it('permits custom profiles while checking supplied identity and revision', () => {
    const spec = { ...defaultCompositionSpec, profileId: 'custom-brand', profileRevision: 3 };
    expect(
      resolveComposition(spec, registry, { id: 'custom-brand', revision: 3 }).spec.profileId,
    ).toBe('custom-brand');
    expect(() => resolveComposition(spec, registry, { id: 'custom-brand', revision: 2 })).toThrow(
      /Profile identity or revision/,
    );
    expect(
      resolveComposition({ ...spec, profileHash: 'v1-aaaaaaaa' }, registry, {
        id: 'custom-brand',
        revision: 3,
        fingerprint: 'v1-aaaaaaaa',
      }).stableHash,
    ).not.toBe(
      resolveComposition({ ...spec, profileHash: 'v1-bbbbbbbb' }, registry, {
        id: 'custom-brand',
        revision: 3,
        fingerprint: 'v1-bbbbbbbb',
      }).stableHash,
    );
  });
  it('requires canonical dependencies and fingerprints their versions', () => {
    expect(() =>
      resolveComposition(defaultCompositionSpec, {
        ...registry,
        entries: registry.entries.filter((entry) => entry.id !== 'field'),
      }),
    ).toThrow(/Missing canonical dependency/);
    const updated = {
      ...registry,
      entries: registry.entries.map((entry) =>
        entry.id === 'field' ? { ...entry, version: 2 } : entry,
      ),
    };
    expect(resolveComposition(defaultCompositionSpec, updated).stableHash).not.toBe(
      resolveComposition(defaultCompositionSpec).stableHash,
    );
  });
  it('rejects stale profile content even when the numeric revision is unchanged', () => {
    expect(() =>
      resolveComposition(defaultCompositionSpec, registry, {
        id: defaultCompositionSpec.profileId,
        revision: 1,
        fingerprint: 'v1-aaaaaaaa',
      }),
    ).toThrow(/unpinned/);
    expect(() =>
      resolveComposition({ ...defaultCompositionSpec, profileHash: 'v1-bbbbbbbb' }, registry, {
        id: defaultCompositionSpec.profileId,
        revision: 1,
        fingerprint: 'v1-aaaaaaaa',
      }),
    ).toThrow(/fingerprint differs/);
    expect(
      resolveComposition(defaultCompositionSpec).assumptions.some((note) =>
        note.includes('unpinned'),
      ),
    ).toBe(true);
  });
  it('rejects valid-looking but unimplemented controls and status values', () => {
    for (const controls of [
      [{ id: 'revenue', kind: 'text', label: 'Revenue' }],
      [{ id: 'status', kind: 'text', label: 'Status' }],
      [
        {
          id: 'status',
          kind: 'select',
          label: 'Status',
          options: [{ value: 'Deleted', label: 'Deleted' }],
        },
      ],
    ])
      expect(
        validateCompositionSpec({
          ...defaultCompositionSpec,
          filters: { ...defaultCompositionSpec.filters, controls },
        }).valid,
      ).toBe(false);
  });
  it('keeps control order meaningful and leaves caller data unchanged', () => {
    const spec: CompositionSpec = structuredClone(defaultCompositionSpec);
    const before = JSON.stringify(spec);
    const first = resolveComposition(spec);
    expect(JSON.stringify(spec)).toBe(before);
    const reversed = {
      ...spec,
      filters: { ...spec.filters, controls: [...spec.filters.controls].reverse() },
    };
    expect(resolveComposition(reversed).stableHash).not.toBe(first.stableHash);
    expect(stableFingerprint({ a: 1, b: 2 })).toBe(stableFingerprint({ b: 2, a: 1 }));
  });
});
