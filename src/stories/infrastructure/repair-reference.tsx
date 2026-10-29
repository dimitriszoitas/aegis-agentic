import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataGrid } from '@/components/data-grid';
import { SearchInput } from '@/components/search-input';
import { SideSheet } from '@/components/side-sheet';
import { Tag } from '@/components/tag';
import { PageHeader } from '@/patterns/page-header';
import catalogue from '../../../public/ai/repair-catalogue.json';
import '../contracts/contracts.css';

type Entry = (typeof catalogue.entries)[number];
const columns: ColumnDef<Entry>[] = [
  { accessorKey: 'exportName', header: 'Component or pattern' },
  {
    id: 'repair',
    header: 'Source repair',
    accessorFn: (entry) => (entry.repair.eligible ? 'Bounded policy' : 'Manual review'),
    cell: ({ row }) => (
      <Tag intent={row.original.repair.eligible ? 'function' : 'default'}>
        {row.original.repair.eligible ? 'Bounded policy' : 'Manual review'}
      </Tag>
    ),
  },
  {
    id: 'policy',
    header: 'Policy',
    accessorFn: (entry) => entry.repair.policyId ?? 'Not yet authored',
  },
  { id: 'checks', header: 'Linked checks', accessorFn: (entry) => entry.linkedChecks.length },
];
export function RepairReference() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Entry | null>(null);
  const rows = useMemo(
    () =>
      catalogue.entries.filter((entry) =>
        `${entry.id} ${entry.exportName} ${entry.repair.policyId ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
      ),
    [query],
  );
  return (
    <article className="contract-stack">
      <PageHeader
        title="Repair coverage"
        description="Every authored component is inspectable. Source repair is enabled only for a specific defect with a trusted check."
      />
      <p>
        {catalogue.summary.authored} authored entries · {catalogue.summary.boundedRepairEligible}{' '}
        have a bounded repair policy · {catalogue.summary.manualReview} require manual review before
        automated source repair.
      </p>
      <p>
        The worker can propose MetricCard/Sparkline containment fixes and DataGrid density CSS
        fixes. It preserves content, behaviour and the checks used to judge the repair. Passing a
        source scan alone never enables an automatic fix.
      </p>
      <SearchInput
        aria-label="Find repair coverage"
        placeholder="Search component or policy…"
        value={query}
        onValueChange={setQuery}
      />
      <DataGrid
        label="Component repair coverage"
        data={rows}
        columns={columns}
        getRowId={(entry) => entry.id}
        rowLabel={(entry) => entry.exportName}
        enableSelection={false}
        onRowClick={setSelected}
      />
      <SideSheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? `${selected.exportName} repair coverage` : 'Repair coverage'}
      >
        {selected && (
          <div className="contract-stack">
            <p>{selected.purpose}</p>
            <p>{selected.repair.reason}</p>
            <h3>Owned style sources</h3>
            <ul>
              {selected.styles.map((source) => (
                <li key={source}>
                  <code>{source}</code>
                </li>
              ))}
            </ul>
            <h3>Read-only source scan</h3>
            <pre>
              <code>{`npm run repair -- scan --component ${selected.id}`}</code>
            </pre>
            <p>
              Source scan checks contract identity and selected CSS token rules. It does not execute
              every story or certify component health.
            </p>
            {selected.repair.eligible && (
              <>
                <h3>Bounded proposal run</h3>
                <pre>
                  <code>{`npm run repair -- run --component ${selected.id} --provider codex`}</code>
                </pre>
                <p>
                  This may use a Codex account after reproducing the specific defect. It prepares a
                  reviewed proposal; publication is separate.
                </p>
              </>
            )}
            <h3>Linked checks</h3>
            <ul>
              {selected.linkedChecks.map((check) => (
                <li key={check.path}>
                  <strong>{check.label}</strong>
                  <p>{check.scope}</p>
                  <code>{check.path}</code>
                </li>
              ))}
            </ul>
            {!selected.linkedChecks.length && (
              <p>No curated checks are linked in this inventory.</p>
            )}
          </div>
        )}
      </SideSheet>
      <p>
        Inventory is not executed evidence. Source repair never automatically merges, releases or
        updates consumer applications. The separate infrastructure service can regenerate derived
        profile files while approved inputs remain unchanged.
      </p>
    </article>
  );
}
