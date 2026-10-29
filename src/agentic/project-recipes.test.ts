import { describe, expect, it } from 'vitest';
import {
  normalizeProjectRecipes,
  projectRecipeRequirements,
  resolveProjectRecipe,
  serializeProjectRecipes,
  validateProjectRecipes,
} from './project-recipes';
import { getContractEntry } from './contracts';
import { pageLayoutRecipes } from '../patterns/page-layout/recipes';
import policy from '../product/pattern-policy.json';
const config = { schemaVersion: 1, project: 'forma', revision: 1, recipes: {} };
describe('project recipes', () => {
  it('reuses published layout defaults and resolves every archetype with known requirements', () => {
    expect(normalizeProjectRecipes(config).recipes.dashboard.maxColumns).toBe(
      pageLayoutRecipes.recipes.dashboard.defaultMaxColumns,
    );
    for (const archetype of ['collection', 'detail', 'settings', 'dashboard'] as const) {
      const result = resolveProjectRecipe(config, archetype);
      expect(result.layout.archetype).toBe(archetype);
      for (const requirement of result.requirements) {
        const requirements = getContractEntry(requirement.contractId)?.contract?.document
          .requirements as { id: string }[];
        expect(
          requirements.some((item) => item.id === requirement.requirementId),
          JSON.stringify(requirement),
        ).toBe(true);
      }
      expect(
        result.projectRequirements.every((id) =>
          projectRecipeRequirements.some((item) => item.id === id),
        ),
      ).toBe(true);
    }
  });
  it('rejects unsupported variants and arbitrary styling/props rather than merging them', () => {
    for (const recipes of [
      { collection: { filters: 'modal' } },
      { settings: { maxColumns: 2 } },
      { dashboard: { maxColumns: 8 } },
      { detail: { narrow: 'overlay' } },
      { collection: { searchWidth: 750 } },
      { collection: null },
    ]) {
      expect(validateProjectRecipes({ ...config, recipes }).valid).toBe(false);
      expect(() => resolveProjectRecipe({ ...config, recipes }, 'collection')).toThrow();
    }
    expect(validateProjectRecipes({ ...config, revision: 0 }).valid).toBe(false);
    expect(validateProjectRecipes({ ...config, recipes: { unknown: {} } }).valid).toBe(false);
  });
  it('makes state ownership, push exclusions and controlled density explicit', () => {
    const result = resolveProjectRecipe(config, 'collection');
    expect(result.bindings.find((item) => item.role === 'results')?.hostBindings).toMatchObject({
      density: 'density',
      onDensityChange: 'setDensity',
    });
    expect(result.hostState.map((item) => item.id)).toEqual([
      'query',
      'density',
      'facets',
      'filterPanelOpen',
      'selectedRecordId',
    ]);
    expect(result.prohibited.join(' ')).toContain('SideSheet');
    expect(result.bindings.find((item) => item.role === 'filter-shell')?.props).toMatchObject({
      inFlow: true,
      backdrop: false,
    });
    expect(result.imports.find((item) => item.role === 'facets')?.exports).toEqual([
      'FilterOptions',
    ]);
  });
  it('serializes defaults, reordered objects and repeated resolutions deterministically', () => {
    const expanded = normalizeProjectRecipes(config);
    expect(serializeProjectRecipes(config)).toBe(serializeProjectRecipes(expanded));
    expect(
      serializeProjectRecipes({ recipes: {}, revision: 1, project: 'forma', schemaVersion: 1 }),
    ).toBe(serializeProjectRecipes(config));
    expect(resolveProjectRecipe(config, 'collection')).toEqual(
      resolveProjectRecipe(expanded, 'collection'),
    );
    expect(resolveProjectRecipe({ ...config, revision: 2 }, 'collection').stableHash).not.toBe(
      resolveProjectRecipe(config, 'collection').stableHash,
    );
  });
  it('uses existing product policy wrapper identities and rejects mismatched products', () => {
    const result = resolveProjectRecipe(config, 'collection', { patternPolicy: policy });
    expect(result.imports.find((item) => item.role === 'toolbar')).toMatchObject({
      module: './filter-toolbar',
      exports: ['FormaFilterToolbar'],
      source: 'project-policy',
    });
    expect(result.patternPolicy?.revision).toBe(policy.revision);
    expect(() =>
      resolveProjectRecipe(config, 'collection', {
        patternPolicy: { ...policy, product: 'other' },
      }),
    ).toThrow(/same project/);
  });
  it('keeps collection width unrestricted, detail prose scoped, and settings save explicit', () => {
    expect(resolveProjectRecipe(config, 'collection').layout.measure).toBeUndefined();
    const detail = resolveProjectRecipe(
      { ...config, recipes: { detail: { supportingRegion: 'aside', measure: 'compact' } } },
      'detail',
    );
    expect(detail.layout.slots).toContain('aside');
    expect(detail.layout.measure).toBeUndefined();
    expect(detail.bindings.find((item) => item.component === 'ReadingColumn')?.props.measure).toBe(
      'compact',
    );
    expect(resolveProjectRecipe(config, 'settings').hostState[0].responsibility).toContain(
      'Save/Cancel',
    );
  });
});
