import { describe, expect, it } from 'vitest';
import { bindFormaRecipes, formaCollectionRecipe, formaProjectRecipes } from './recipes';
import { createInitialState } from './model';
describe('Forma recipe integration', () => {
  it('uses the checked-in recipe density and shared product wrapper', () => {
    expect(createInitialState().settings.density).toBe(
      formaProjectRecipes.recipes.collection.density,
    );
    expect(formaCollectionRecipe.imports.find((item) => item.role === 'toolbar')?.exports).toEqual([
      'FormaFilterToolbar',
    ]);
    expect(formaProjectRecipes.recipes.collection.filters).toBe('push');
  });
  it('allows implemented density and responsive grid variants within the recorded search policy', () => {
    const changed = bindFormaRecipes({
      ...formaProjectRecipes,
      recipes: {
        collection: { density: 'compact', searchMeasure: 'wide' },
        dashboard: { maxColumns: 2, minItemWidth: 'large' },
      },
    });
    expect(changed.recipes.collection.density).toBe('compact');
    expect(changed.recipes.dashboard.maxColumns).toBe(2);
  });
  it('rejects a valid library search measure that contradicts the product policy', () => {
    expect(() =>
      bindFormaRecipes({
        ...formaProjectRecipes,
        recipes: {
          ...formaProjectRecipes.recipes,
          collection: { ...formaProjectRecipes.recipes.collection, searchMeasure: 'regular' },
        },
      }),
    ).toThrow(/search measure differs from the recorded pattern policy/);
  });
  it('fails explicitly for library choices unsupported by this product implementation', () => {
    for (const recipes of [
      { collection: { filters: 'inline' } },
      { collection: { details: 'page' } },
      { settings: { save: 'immediate' } },
      { dashboard: { header: 'breadcrumbs' } },
      { detail: { supportingRegion: 'aside' } },
    ])
      expect(() =>
        bindFormaRecipes({
          ...formaProjectRecipes,
          recipes: {
            ...formaProjectRecipes.recipes,
            ...recipes,
            collection: { ...formaProjectRecipes.recipes.collection, ...recipes.collection },
          },
        }),
      ).toThrow();
  });
});
