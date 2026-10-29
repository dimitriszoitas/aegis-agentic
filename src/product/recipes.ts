import source from './project-recipes.json';
import policy from './pattern-policy.json';
import { normalizeProjectRecipes, resolveProjectRecipe } from '@/agentic/project-recipes';

/** The pilot deliberately implements a subset of the library's approved recipe variants. */
export function bindFormaRecipes(input: unknown) {
  const config = normalizeProjectRecipes(input);
  if (config.project !== policy.product)
    throw new Error('Forma recipe product differs from its pattern policy.');
  for (const recipe of Object.values(config.recipes))
    if (recipe.header !== 'standard')
      throw new Error('Forma currently implements the standard shared header only.');
  if (
    config.recipes.collection.filters !== 'push' ||
    config.recipes.collection.details !== 'side-sheet'
  )
    throw new Error(
      'Forma currently implements push filtering and SideSheet record details. Update the shared implementation and pattern policy before selecting another variant.',
    );
  const searchMeasureTokens = {
    regular: '--group-application-business-app-size-width-wide-panel-small',
    wide: '--group-application-business-app-size-width-wide-panel-vast',
  } as const;
  if (
    searchMeasureTokens[config.recipes.collection.searchMeasure] !==
    policy.patterns.collectionFilters.desktopSearchWidthToken
  )
    throw new Error(
      'Forma search measure differs from the recorded pattern policy. Update the shared recipe and desktopSearchWidthToken together.',
    );
  if (config.recipes.settings.save !== 'explicit')
    throw new Error(
      'Forma workspace details require explicit Save/Cancel. Appearance preferences are documented immediate controls.',
    );
  if (config.recipes.detail.supportingRegion !== 'none')
    throw new Error('Forma does not implement a separate detail page with an aside.');
  return config;
}
export const formaProjectRecipes = bindFormaRecipes(source);
export const formaRecipes = formaProjectRecipes.recipes;
export const formaCollectionRecipe = resolveProjectRecipe(formaProjectRecipes, 'collection', {
  patternPolicy: policy,
});
