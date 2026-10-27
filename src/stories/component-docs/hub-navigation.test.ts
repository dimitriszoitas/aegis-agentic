import { describe, expect, it } from 'vitest';
import { hubNavigationMessage, readHubNavigationUpdate } from './hub-navigation';

const preview = {} as Window;
const href =
  'https://example.test/design-system/?path=/docs/checkbox-overview--docs&docsTab=examples&docsExample=checkbox--playground';
const current = new URL(href);
function event(url = current) {
  return { source: preview, origin: url.origin, data: hubNavigationMessage(url) };
}

describe('component hub manager query synchronization', () => {
  it('updates only hub keys and clears obsolete section values without navigation', () => {
    expect(readHubNavigationUpdate(event(), preview, current)).toEqual({
      docsTab: 'examples',
      docsSection: null,
      docsExample: 'checkbox--playground',
    });
    expect(current.pathname).toBe('/design-system/');
  });
  it('keeps the chosen example when the manager serializes a later theme change', () => {
    const query = readHubNavigationUpdate(event(), preview, current)!;
    const managerQuery = Object.assign(
      { docsTab: 'examples', docsExample: 'checkbox--read-only' },
      query,
    );
    const themed = new URL(current);
    Object.entries({ ...managerQuery, globals: 'theme:dark' }).forEach(([key, value]) => {
      if (value === null) themed.searchParams.delete(key);
      else themed.searchParams.set(key, value);
    });
    expect(themed.searchParams.get('docsExample')).toBe('checkbox--playground');
    expect(themed.searchParams.get('globals')).toBe('theme:dark');
  });
  it('rejects other origins, nested frames, missing previews and unrelated protocols', () => {
    expect(
      readHubNavigationUpdate({ ...event(), origin: 'https://other.test' }, preview, current),
    ).toBeNull();
    expect(
      readHubNavigationUpdate({ ...event(), source: {} as Window }, preview, current),
    ).toBeNull();
    expect(readHubNavigationUpdate(event(), null, current)).toBeNull();
    expect(
      readHubNavigationUpdate(
        { ...event(), data: { channel: 'storybook-channel' } },
        preview,
        current,
      ),
    ).toBeNull();
  });
  it('lets explicit links and popstate win over queued messages from the previous selection', () => {
    const destination = new URL(current);
    destination.searchParams.set('docsExample', 'checkbox--read-only');
    expect(readHubNavigationUpdate(event(), preview, destination)).toBeNull();
    expect(readHubNavigationUpdate(event(destination), preview, destination)?.docsExample).toBe(
      'checkbox--read-only',
    );
    destination.searchParams.set('path', '/docs/button-overview--docs');
    expect(readHubNavigationUpdate(event(), preview, destination)).toBeNull();
  });
});
