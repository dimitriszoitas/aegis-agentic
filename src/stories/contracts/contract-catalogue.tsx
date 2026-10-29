import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { DataGrid, type DataGridProps, type GridDensity } from '@/components/data-grid';
import { DescriptionList } from '@/components/description-list';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Tabs } from '@/components/tabs';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/patterns/page-layout';
import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  contractCatalogue,
  getContractCoverage,
  getContractEntry,
  searchContracts,
  type ContractEntry,
} from '@/agentic/contracts';
import { ContractDetails } from './contract-details';
import {
  catalogueNavigationMessage,
  catalogueStateUrl,
  readCatalogueState,
  type CatalogueState,
} from './catalogue-navigation';
import './contracts.css';

function navigationWindow() {
  try {
    if (window.top?.location.origin === window.location.origin) return window.top;
  } catch {
    /* Standalone preview. */
  }
  return window;
}
const coverageOptions = [
  { value: 'all', label: 'All coverage' },
  { value: 'authored', label: 'Authored behavior' },
  { value: 'api-only', label: 'API reference only' },
  { value: 'evidence', label: 'Linked evidence' },
];
const kindOptions = [
  { value: 'all', label: 'All kinds' },
  { value: 'component', label: 'Components' },
  { value: 'pattern', label: 'Patterns' },
  { value: 'foundation', label: 'Foundations' },
];

export function ContractCatalogue() {
  const [density, setDensity] = useState<GridDensity>('default');
  const [state, setState] = useState(() => {
    const initial = readCatalogueState(new URL(navigationWindow().location.href));
    if (initial.selectedId && getContractEntry(initial.selectedId)?.kind === 'protocol')
      initial.section = 'protocols';
    return initial;
  });
  const { query, coverageFilter, kind, selectedId, section } = state;
  const selected = selectedId ? getContractEntry(selectedId) : undefined;
  const columnSizes = useComponentTokenNumbers([
    'application.grid-column-lg',
    'application.grid-column-2xl',
    'application.grid-column-3xl',
    'application.grid-column-5xl',
  ]);
  const details = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const coverage = getContractCoverage();
  const matches = useMemo(
    () =>
      searchContracts(query).filter((entry) => {
        if (section === 'protocols') return entry.kind === 'protocol';
        return (
          entry.kind !== 'protocol' &&
          (kind === 'all' || entry.kind === kind) &&
          (coverageFilter === 'all' ||
            (coverageFilter === 'authored' && entry.coverage.behaviorAuthored) ||
            (coverageFilter === 'api-only' &&
              entry.coverage.apiDocumented &&
              !entry.coverage.behaviorAuthored) ||
            (coverageFilter === 'evidence' && entry.coverage.evidenceLinked))
        );
      }),
    [query, coverageFilter, kind, section],
  );
  useEffect(() => {
    if (!moveFocus.current || !selected) return;
    details.current?.scrollIntoView({ block: 'start' });
    details.current?.focus({ preventScroll: true });
    moveFocus.current = false;
  }, [selected]);
  useEffect(() => {
    const target = navigationWindow();
    const restore = () => {
      setState(readCatalogueState(new URL(target.location.href)));
    };
    target.addEventListener('popstate', restore);
    return () => target.removeEventListener('popstate', restore);
  }, []);
  const commit = (patch: Partial<CatalogueState>) => {
    const next = { ...state, ...patch };
    setState(next);
    const target = navigationWindow();
    const url = catalogueStateUrl(new URL(target.location.href), next);
    target.history.replaceState(target.history.state, '', url);
    if (target !== window) target.postMessage(catalogueNavigationMessage(url), url.origin);
  };
  const select = (entry: ContractEntry) => {
    if (selectedId === entry.id) {
      details.current?.scrollIntoView({ block: 'start' });
      details.current?.focus({ preventScroll: true });
    } else moveFocus.current = true;
    commit({ selectedId: entry.id });
  };
  const columns: DataGridProps<ContractEntry>['columns'] = [
    {
      accessorKey: 'name',
      header: 'Contract',
      size: columnSizes['application.grid-column-5xl'],
      cell: ({ row }) => (
        <Button
          emphasis="ghost"
          size="sm"
          onClick={() => select(row.original)}
          aria-label={`Open ${row.original.name} contract`}
        >
          {row.original.name}
        </Button>
      ),
    },
    { accessorKey: 'kind', header: 'Kind', size: columnSizes['application.grid-column-lg'] },
    {
      id: 'coverage',
      header: 'Coverage',
      size: columnSizes['application.grid-column-2xl'],
      minSize: columnSizes['application.grid-column-2xl'],
      accessorFn: (entry) =>
        entry.kind === 'protocol'
          ? 'System protocol'
          : entry.coverage.behaviorAuthored
            ? 'Authored behavior'
            : 'API reference only',
      cell: ({ getValue }) => <Tag>{getValue<string>()}</Tag>,
    },
    {
      id: 'status',
      header: 'Declared status',
      size: columnSizes['application.grid-column-2xl'],
      accessorFn: (entry) => entry.contract?.status ?? 'No authored contract',
    },
    {
      id: 'evidence',
      header: 'Evidence',
      size: columnSizes['application.grid-column-3xl'],
      accessorFn: (entry) =>
        `${entry.checks.length} check sources · ${entry.evidence.length} reports`,
    },
  ];
  return (
    <div className="contract-catalogue">
      <PageLayout
        archetype="collection"
        title="Contract catalogue"
        description="Find public API facts, authored requirements and scoped evidence. Coverage records what is documented; it does not certify behavior."
        filters={
          <div className="contract-filters">
            <SearchInput
              aria-label="Search contracts"
              placeholder="Search name, purpose, or import…"
              value={query}
              onValueChange={(query) => commit({ query })}
            />
            {section === 'components' && (
              <>
                <Select
                  aria-label="Contract coverage"
                  options={coverageOptions}
                  value={coverageFilter}
                  onValueChange={(coverageFilter) => commit({ coverageFilter })}
                />
                <Select
                  aria-label="Contract kind"
                  options={kindOptions}
                  value={kind}
                  onValueChange={(kind) => commit({ kind })}
                />
              </>
            )}
            <Button
              emphasis="secondary"
              onClick={() => {
                commit({ query: '', coverageFilter: 'all', kind: 'all' });
              }}
            >
              Clear filters
            </Button>
          </div>
        }
      >
        <div className="contract-stack">
          <DescriptionList
            columns={3}
            items={[
              { id: 'api', label: 'API families', value: coverage.apiFamilies },
              {
                id: 'authored',
                label: 'Authored component / pattern contracts',
                value: coverage.authoredComponentPatternContracts,
              },
              {
                id: 'missing',
                label: 'API families without authored behavior',
                value: coverage.apiFamiliesWithoutAuthoredBehavior,
              },
            ]}
          />
          <Tabs
            label="Contract catalogue sections"
            value={section}
            onValueChange={(value) => {
              commit({ section: value, selectedId: null });
            }}
            items={[
              { value: 'components', label: 'Components and patterns', content: null },
              { value: 'protocols', label: 'System protocols', content: null },
            ]}
            sharedContent={
              <div className="contract-stack">
                {section === 'protocols' && (
                  <p>
                    System protocols define service boundaries and request rules. They are listed
                    separately from component behavior contracts.
                  </p>
                )}
                <p role="status">
                  {matches.length}{' '}
                  {section === 'protocols' ? 'system protocols' : 'component and pattern entries'}{' '}
                  match the current filters.
                </p>
                <DataGrid
                  data={matches}
                  columns={columns}
                  getRowId={(entry) => entry.id}
                  label={
                    section === 'protocols' ? 'System protocol contracts' : 'Component contracts'
                  }
                  noun="contracts"
                  rowLabel={(entry) => entry.name}
                  enableSelection={false}
                  density={density}
                  onDensityChange={setDensity}
                  pagination
                  pageSize={10}
                  onRowClick={select}
                  emptyTitle="No contracts found"
                  emptyDescription="Clear filters or try another name, purpose, or import."
                />
              </div>
            }
          />
          {selected ? (
            <div className="contract-selection" ref={details} tabIndex={-1}>
              <ContractDetails key={selected.id} entry={selected} />
            </div>
          ) : selectedId ? (
            <p role="alert">
              The requested contract is not in this generated catalogue. Select an available entry.
            </p>
          ) : (
            <p>Select an entry to read its requirements, source references and evidence.</p>
          )}
          <details className="contract-section">
            <summary>Catalogue scope and limitations</summary>
            <ul>
              {contractCatalogue.limitations.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </details>
        </div>
      </PageLayout>
    </div>
  );
}
