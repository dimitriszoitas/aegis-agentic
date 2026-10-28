import { describe, expect, it } from 'vitest';
import {
  catalogueNavigationMessage,
  catalogueStateUrl,
  readCatalogueNavigationUpdate,
  readCatalogueState,
} from './catalogue-navigation';

const preview = {} as Window;
const current = new URL('https://example.test/library/?path=/docs/aegis-contract-catalogue--docs');
describe('contract catalogue navigation', () => {
  it('round trips search, coverage, kind, section and selection through manager mode changes', () => {
    const state = {
      query: 'Page layout',
      coverageFilter: 'authored',
      kind: 'pattern',
      section: 'components',
      selectedId: 'patterns-pagelayout',
    };
    const url = catalogueStateUrl(current, state);
    const message = { source: preview, origin: url.origin, data: catalogueNavigationMessage(url) };
    const synchronized = readCatalogueNavigationUpdate(message, preview, url)!;
    const themed = new URL(current);
    for (const [key, value] of Object.entries({ ...synchronized, globals: 'theme:dark' })) {
      if (value === null) themed.searchParams.delete(key);
      else themed.searchParams.set(key, value);
    }
    expect(readCatalogueState(themed)).toEqual(state);
    expect(themed.pathname).toBe('/library/');
    expect(
      catalogueStateUrl(url, { ...state, section: 'protocols', selectedId: null }).searchParams.has(
        'contract',
      ),
    ).toBe(false);
  });
  it('ignores messages from other frames, routes, origins, and obsolete filter selections', () => {
    const url = catalogueStateUrl(current, {
      query: 'button',
      coverageFilter: 'all',
      kind: 'all',
      section: 'components',
      selectedId: null,
    });
    const event = { source: preview, origin: url.origin, data: catalogueNavigationMessage(url) };
    expect(readCatalogueNavigationUpdate(event, null, url)).toBeNull();
    expect(
      readCatalogueNavigationUpdate({ ...event, source: {} as Window }, preview, url),
    ).toBeNull();
    expect(
      readCatalogueNavigationUpdate({ ...event, origin: 'https://other.test' }, preview, url),
    ).toBeNull();
    expect(readCatalogueNavigationUpdate(event, preview, new URL(current))).toBeNull();
    const otherRoute = new URL(url);
    otherRoute.searchParams.set('path', '/docs/other--docs');
    expect(readCatalogueNavigationUpdate(event, preview, otherRoute)).toBeNull();
  });
  it('defaults unknown filter choices without trusting URL strings as supported choices', () => {
    const url = new URL(current);
    url.searchParams.set('contractCoverage', 'certified');
    url.searchParams.set('contractKind', 'anything');
    url.searchParams.set('contractSection', 'hidden');
    expect(readCatalogueState(url)).toEqual({
      query: '',
      coverageFilter: 'all',
      kind: 'all',
      section: 'components',
      selectedId: null,
    });
  });
});
