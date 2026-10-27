const channel = 'aegis:hub-navigation';
const queryKeys = ['docsTab', 'docsSection', 'docsExample'] as const;
type HubQuery = Record<(typeof queryKeys)[number], string | null>;

export function hubNavigationMessage(url: URL) {
  return {
    channel,
    version: 1,
    path: url.searchParams.get('path'),
    query: Object.fromEntries(queryKeys.map((key) => [key, url.searchParams.get(key)])) as HubQuery,
  };
}

/** Accept only the active docs preview's current URL, never stale navigation or nested stories. */
export function readHubNavigationUpdate(
  event: Pick<MessageEvent, 'source' | 'origin' | 'data'>,
  preview: Window | null,
  currentUrl: URL,
): HubQuery | null {
  if (!preview || event.source !== preview || event.origin !== currentUrl.origin) return null;
  const message: unknown = event.data;
  if (!message || typeof message !== 'object') return null;
  const data = message as Record<string, unknown>;
  if (
    data.channel !== channel ||
    data.version !== 1 ||
    typeof data.path !== 'string' ||
    !data.path.startsWith('/docs/') ||
    data.path !== currentUrl.searchParams.get('path') ||
    !data.query ||
    typeof data.query !== 'object'
  )
    return null;
  const query = data.query as Record<string, unknown>;
  if (
    Object.keys(query).length !== queryKeys.length ||
    queryKeys.some((key) => query[key] !== currentUrl.searchParams.get(key))
  )
    return null;
  return Object.fromEntries(queryKeys.map((key) => [key, query[key]])) as HubQuery;
}
