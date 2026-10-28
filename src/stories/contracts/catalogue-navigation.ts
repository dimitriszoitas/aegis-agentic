const route = '/docs/aegis-contract-catalogue--docs';
const channel = 'aegis:contract-catalogue-navigation';
const queryKeys = [
  'contract',
  'contractQuery',
  'contractCoverage',
  'contractKind',
  'contractSection',
] as const;
type CatalogueQuery = Record<(typeof queryKeys)[number], string | null>;
export interface CatalogueState {
  query: string;
  coverageFilter: string;
  kind: string;
  section: string;
  selectedId: string | null;
}
export function readCatalogueState(url: URL): CatalogueState {
  const choice = (key: string, allowed: string[], fallback: string) => {
    const value = url.searchParams.get(key);
    return value && allowed.includes(value) ? value : fallback;
  };
  return {
    query: url.searchParams.get('contractQuery') ?? '',
    coverageFilter: choice('contractCoverage', ['all', 'authored', 'api-only', 'evidence'], 'all'),
    kind: choice('contractKind', ['all', 'component', 'pattern', 'foundation'], 'all'),
    section: choice('contractSection', ['components', 'protocols'], 'components'),
    selectedId: url.searchParams.get('contract'),
  };
}
export function catalogueStateUrl(current: URL, state: CatalogueState) {
  const url = new URL(current);
  for (const [key, value] of Object.entries({
    contract: state.selectedId,
    contractQuery: state.query || null,
    contractCoverage: state.coverageFilter === 'all' ? null : state.coverageFilter,
    contractKind: state.kind === 'all' ? null : state.kind,
    contractSection: state.section === 'components' ? null : state.section,
  })) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return url;
}
export function catalogueNavigationMessage(url: URL) {
  return {
    channel,
    version: 1,
    path: url.searchParams.get('path'),
    query: Object.fromEntries(
      queryKeys.map((key) => [key, url.searchParams.get(key)]),
    ) as CatalogueQuery,
  };
}

/** Only the current catalogue preview may synchronize its own visible URL state. */
export function readCatalogueNavigationUpdate(
  event: Pick<MessageEvent, 'source' | 'origin' | 'data'>,
  preview: Window | null,
  currentUrl: URL,
): CatalogueQuery | null {
  if (
    !preview ||
    event.source !== preview ||
    event.origin !== currentUrl.origin ||
    currentUrl.searchParams.get('path') !== route
  )
    return null;
  const data: unknown = event.data;
  if (!data || typeof data !== 'object') return null;
  const message = data as Record<string, unknown>;
  if (
    message.channel !== channel ||
    message.version !== 1 ||
    message.path !== route ||
    !message.query ||
    typeof message.query !== 'object'
  )
    return null;
  const query = message.query as Record<string, unknown>;
  if (
    Object.keys(query).length !== queryKeys.length ||
    queryKeys.some((key) => query[key] !== currentUrl.searchParams.get(key))
  )
    return null;
  return Object.fromEntries(queryKeys.map((key) => [key, query[key]])) as CatalogueQuery;
}
