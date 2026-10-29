import { describe, expect, it } from 'vitest';
import { configurations, designProfiles, validateCompiledManifest } from './profile';
import {
  createBrandPackage,
  previewBrandPackage,
  serializeBrandPackage,
  validateBrandPackage,
} from './brand-package';

describe('portable brand packages', () => {
  it.each(designProfiles)(
    'round-trips $id with normalized deterministic output and four valid configurations',
    (profile) => {
      const pkg = createBrandPackage(profile, { packageVersion: '1.2.0-beta.1' });
      const encoded = serializeBrandPackage(pkg);
      const parsed = JSON.parse(encoded);
      expect(serializeBrandPackage(parsed)).toBe(encoded);
      const preview = previewBrandPackage(parsed, designProfiles[0]);
      expect(preview.valid).toBe(true);
      expect(preview.package?.profile).toEqual(pkg.profile);
      expect(preview.compiled?.manifest.configurations).toEqual([...configurations]);
      expect(validateCompiledManifest(preview.compiled!.manifest)).toEqual([]);
      expect(preview.compiled?.runtimeDefaults.numericMetrics).toBe('unchanged');
    },
  );
  it('produces an explicit comparison without mutating the current brand', () => {
    const before = structuredClone(designProfiles[0]);
    const next = createBrandPackage({ ...before, brand: '#893797', density: 'compact' });
    const result = previewBrandPackage(next, before);
    expect(result.changes.map((change) => change.field)).toEqual(['brand', 'density']);
    expect(before).toEqual(designProfiles[0]);
    expect(result.compiled?.contrast).toHaveLength(36);
  });
  it('rejects incompatible metadata, arbitrary hooks, unsafe profile fields and missing modes', () => {
    const pkg = createBrandPackage(designProfiles[0]);
    for (const invalid of [
      null,
      { ...pkg, version: 2 },
      { ...pkg, install: 'run()' },
      { ...pkg, packageVersion: 'latest' },
      { ...pkg, compatibility: { ...pkg.compatibility, compilerVersion: 2 } },
      { ...pkg, compatibility: { ...pkg.compatibility, configurations: ['fundamental.light'] } },
      {
        ...pkg,
        compatibility: {
          ...pkg.compatibility,
          configurations: [...configurations.slice(0, 3), configurations[0]],
        },
      },
      { ...pkg, profile: { ...pkg.profile, font: 'url(https://example.com/font)' } },
      { ...pkg, profile: { ...pkg.profile, css: 'body{display:none}' } },
    ]) {
      expect(validateBrandPackage(invalid).some((issue) => issue.severity === 'error')).toBe(true);
      expect(previewBrandPackage(invalid, designProfiles[0])).toMatchObject({
        valid: false,
        changes: [],
      });
    }
  });
});
