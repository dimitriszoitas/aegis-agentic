import { describe, expect, it } from 'vitest';
import { discoverByBehavior } from './behavior-discovery';
const config = { schemaVersion: 1 as const, project: 'test', revision: 1, recipes: {} };
describe('behavior-first discovery', () => {
  it('distinguishes push filtering from modal panels and refuses the wrong substitute', () => {
    const found = discoverByBehavior({
      query: 'filters beside a table',
      projectRecipes: config,
      requestedComponent: 'SideSheet',
    });
    expect(found.status).toBe('rejected');
    expect(found.selectedIntent).toBeNull();
    expect(found.candidates[0].intent).toBe('push-filtering');
    expect(found.projectRecipe?.archetype).toBe('collection');
    expect(found.rejections.some((item) => item.component === 'SideSheet')).toBe(true);
    expect(discoverByBehavior({ query: 'modal panel to isolate a task' }).selectedIntent).toBe(
      'modal-side-sheet',
    );
    expect(discoverByBehavior({ query: 'show selected user details' }).selectedIntent).toBe(
      'record-details',
    );
  });
  it('leaves panel and filtering ambiguities unresolved without a project decision', () => {
    expect(discoverByBehavior({ query: 'side panel' }).status).toBe('ambiguous');
    expect(discoverByBehavior({ query: 'filter' }).status).toBe('ambiguous');
    expect(discoverByBehavior({ query: 'filter', projectRecipes: config }).selectedIntent).toBe(
      'push-filtering',
    );
    expect(discoverByBehavior({ query: 'not-a-known-behavior' }).status).toBe('no-match');
  });
  it('rejects requested behavior that contradicts the project and preserves alternatives', () => {
    const result = discoverByBehavior({ query: 'inline filters', projectRecipes: config });
    expect(result.status).toBe('rejected');
    expect(result.projectRecipe?.variants).toMatchObject({ filters: 'push' });
    expect(result.rejections.some((item) => item.reason.includes('recipe revision'))).toBe(true);
  });
  it('returns real contracts and deterministic discovery evidence', () => {
    const input = { query: 'dashboard metrics', projectRecipes: config };
    const result = discoverByBehavior(input);
    expect(result).toEqual(discoverByBehavior(input));
    expect(result.candidates[0].contracts.map((item) => item.contract?.id)).toContain(
      'page-layout',
    );
    expect(result.projectRecipe?.archetype).toBe('dashboard');
    expect(result.limitations.join(' ')).toContain('not language-model inference');
  });
  it('does not approve unknown implementations or sheets when the project chooses a detail page', () => {
    expect(discoverByBehavior({ query: 'push filters', requestedComponent: 'Button' }).status).toBe(
      'rejected',
    );
    const pageConfig = { ...config, recipes: { collection: { details: 'page' as const } } };
    expect(
      discoverByBehavior({
        query: 'record details',
        requestedComponent: 'SideSheet',
        projectRecipes: pageConfig,
      }).status,
    ).toBe('rejected');
    expect(
      discoverByBehavior({
        query: 'record details',
        requestedComponent: 'PageLayout',
        projectRecipes: pageConfig,
      }).status,
    ).toBe('resolved');
    expect(
      discoverByBehavior({
        query: 'record details',
        projectRecipes: { ...config, recipes: { collection: { details: 'none' } } },
      }).status,
    ).toBe('rejected');
  });
  it('validates runtime inputs and does not accept arbitrary properties', () => {
    for (const input of [
      { query: '' },
      { query: 'test', limit: 31 },
      { query: 'test', projectRecipes: {} },
      { query: 'test', intent: 'unknown' },
      { query: 'test', script: 'execute me' },
    ])
      expect(() => discoverByBehavior(input as never)).toThrow();
  });
});
