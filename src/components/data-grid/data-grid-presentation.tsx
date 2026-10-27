import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCheck, Eye, Folder, RotateCcw, Sparkles } from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { BulkActionsBar } from '@/components/bulk-actions-bar';
import { Button } from '@/components/button';
import {
  ActionsCell,
  AiVerdictCell,
  EntityCell,
  NumberCell,
  SeverityCell,
  SparklineCell,
  StatusCell,
  TagsCell,
  TimeCell,
} from '@/components/data-grid-cells';
import { JsonViewer } from '@/components/json-viewer';
import { Kbd } from '@/components/kbd';
import { Select } from '@/components/select';
import { Separator } from '@/components/separator';
import { SideSheet, SideSheetField, SideSheetSection } from '@/components/side-sheet';
import { statusLabels, type RecordStatus } from '@/components/status-badge';
import { Tabs } from '@/components/tabs';
import { Textarea } from '@/components/textarea';
import { AiPanel } from '@/patterns/ai-panel';
import { FilterBar } from '@/patterns/filter-bar';
import { FilterPanel } from '@/patterns/filter-panel';
import { applyRecordFilters, createDefaultFilters, type RecordFilterState } from '@/lib/filters';
import type { AiContextItem, AiRequest } from '@/lib/ai';
import {
  records as fixtures,
  owners,
  generateRecords,
  referenceTime,
  workflows,
  type WorkRecord,
} from '@/sample-data';
import { DataGrid, type GridDensity } from './data-grid';
import './data-grid-presentation.css';

const largeDataset = generateRecords(1000, 2026);
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
type PresentationState = 'ready' | 'loading' | 'empty' | 'error';
type PresentationMode = 'pages' | 'virtual';
export interface DataGridPresentationProps {
  initialCount?: 150 | 1000;
  initialMode?: PresentationMode;
  initialFilterMode?: 'bar' | 'panel';
}
const contextFor = (record: WorkRecord): AiContextItem => ({
  id: record.id,
  label: `${record.id} · ${record.title}`,
  kind: 'record',
  description: `${record.severity} severity; ${statusLabels[record.status]}; ${record.eventCount} updates; ${record.subject.name}; ${record.source}; ${record.category.name}`,
});
function RecordHistory({ record }: { record: WorkRecord }) {
  return (
    <section className="aegis-grid-record-history">
      <h3>Record history · {record.id}</h3>
      <table className="aegis-grid-event-table" aria-label={`Record history for ${record.id}`}>
        <thead>
          <tr>
            <th>Updated</th>
            <th>Activity</th>
            <th>Owner</th>
            <th>Subject</th>
          </tr>
        </thead>
        <tbody>
          {record.events.map((event) => (
            <tr key={event.id}>
              <td>
                <TimeCell value={event.timestamp} now={referenceTime} />
              </td>
              <td>{event.action}</td>
              <td>{event.actor}</td>
              <td>{event.subject}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Inspect raw history</summary>
        <JsonViewer
          value={record.events}
          label={`Raw history for ${record.id}`}
          defaultExpandedDepth={1}
          maxHeight={componentToken('evidence-max-height')}
        />
      </details>
    </section>
  );
}
function RecordDetails({
  record,
  onSave,
}: {
  record: WorkRecord;
  onSave: (next: WorkRecord) => void;
}) {
  const [status, setStatus] = useState(record.status);
  const [assignee, setAssignee] = useState(record.assignee?.id ?? 'unassigned');
  const [note, setNote] = useState(record.ownerNote ?? '');
  const [saved, setSaved] = useState(false);
  const workflow = workflows.find((item) => item.id === record.workflowId);
  return (
    <Tabs
      label="Record details"
      items={[
        {
          value: 'overview',
          label: 'Overview',
          content: (
            <div className="stack">
              <SideSheetSection title="Work item">
                <SideSheetField label="Subject">{record.subject.name}</SideSheetField>
                <SideSheetField label="Category">{record.category.name}</SideSheetField>
                <SideSheetField label="Source">{record.source}</SideSheetField>
              </SideSheetSection>
              <Select
                label="Status"
                value={status}
                onValueChange={(value) => {
                  setStatus(value as RecordStatus);
                  setSaved(false);
                }}
                options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
              />
              <Select
                label="Assignee"
                value={assignee}
                onValueChange={(value) => {
                  setAssignee(value);
                  setSaved(false);
                }}
                options={[
                  { value: 'unassigned', label: 'Unassigned' },
                  ...owners.map((owner) => ({ value: owner.id, label: owner.name })),
                ]}
              />
              <Textarea
                label="Owner note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setSaved(false);
                }}
                rows={4}
              />
              <Button
                intent="function"
                onClick={() => {
                  onSave({
                    ...record,
                    status,
                    assignee: owners.find((owner) => owner.id === assignee),
                    ownerNote: note.trim(),
                  });
                  setSaved(true);
                }}
              >
                Save changes
              </Button>
              {saved && <p role="status">Record changes saved.</p>}
            </div>
          ),
        },
        {
          value: 'history',
          label: 'History',
          count: record.events.length,
          content: <RecordHistory record={record} />,
        },
        {
          value: 'workflow',
          label: 'Workflow',
          content: (
            <SideSheetSection title={workflow?.name ?? 'Workflow'}>
              <p>{workflow?.description}</p>
              <pre className="aegis-grid-workflow-code">{workflow?.yaml}</pre>
            </SideSheetSection>
          ),
        },
      ]}
    />
  );
}
/** Local work queue composed from public grid, filter, details, and AI primitives. */
export function DataGridPresentation({
  initialCount = 150,
  initialMode = 'pages',
  initialFilterMode = 'panel',
}: DataGridPresentationProps) {
  const tokens = useComponentTokenNumbers([
    'grid-column-xs',
    'grid-id-min-width',
    'grid-column-6xl',
    'grid-column-3xl',
    'grid-column-2xl',
    'grid-column-lg',
    'grid-column-md',
    'grid-column-sm',
    'grid-date-width',
    'grid-date-min-width',
    'grid-column-xl',
    'grid-tags-width',
    'grid-trend-width',
    'grid-actions-width',
    'data-display.business-grid-height',
  ]);
  const [count, setCount] = useState<150 | 1000>(initialCount);
  const [records, setRecords] = useState(initialCount === 1000 ? largeDataset : fixtures);
  const [mode, setMode] = useState<PresentationMode>(initialMode);
  const [filterMode, setFilterMode] = useState(initialFilterMode);
  const [state, setState] = useState<PresentationState>('ready');
  const [density, setDensity] = useState<GridDensity>('default');
  const [filters, setFilters] = useState(createDefaultFilters);
  const [selection, setSelection] = useState<string[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeId, setActiveId] = useState<string>();
  const [aiOpen, setAiOpen] = useState(false);
  const [request, setRequest] = useState<AiRequest>();
  const [context, setContext] = useState<AiContextItem[]>([]);
  const [session, setSession] = useState(0);
  const [notice, setNotice] = useState('Changes stay in this local demo.');
  const requestSequence = useRef(0);
  const shell = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const visible = useMemo(
    () => applyRecordFilters(records, filters, referenceTime),
    [records, filters],
  );
  const selected = records.filter((record) => selection.includes(record.id));
  const activeRecord = records.find((record) => record.id === activeId);
  const showPanel = filterMode === 'panel' && panelOpen;
  function updateFilters(next: RecordFilterState) {
    setFilters(next);
    setSelection([]);
  }
  function closePanel() {
    setPanelOpen(false);
    requestAnimationFrame(() =>
      shell.current
        ?.querySelector<HTMLButtonElement>(`button[aria-controls="${panelId}"]`)
        ?.focus(),
    );
  }
  function reset(nextCount = count, nextMode = mode) {
    setCount(nextCount);
    setRecords(nextCount === 1000 ? largeDataset : fixtures);
    setMode(nextMode);
    setFilterMode(initialFilterMode);
    setState('ready');
    setDensity('default');
    setFilters(createDefaultFilters());
    setSelection([]);
    setPanelOpen(true);
    setActiveId(undefined);
    setAiOpen(false);
    setRequest(undefined);
    setContext([]);
    setSession((value) => value + 1);
    setNotice('Changes stay in this local demo.');
  }
  function updateRecords(next: WorkRecord[]) {
    const changed = next.filter((record, index) => record !== records[index]).length;
    setRecords(next);
    setNotice(
      `${changed} ${changed === 1 ? 'record updated' : 'records updated'} in this local demo.`,
    );
  }
  function explain(items: WorkRecord[]) {
    const next = items.map(contextFor);
    setActiveId(undefined);
    setContext(next);
    setRequest({
      id: `grid-review-${++requestSequence.current}`,
      prompt:
        items.length === 1
          ? 'Summarize this work item and recommend the next review step.'
          : 'Summarize the selected work, group dependencies, and recommend a review order.',
      context: next,
    });
    setAiOpen(true);
  }
  function open(record: WorkRecord) {
    setAiOpen(false);
    setActiveId(record.id);
  }
  const columns: ColumnDef<WorkRecord>[] = [
    {
      accessorKey: 'severity',
      header: 'Severity',
      size: tokens['grid-column-xs'],
      minSize: tokens['grid-id-min-width'],
      sortingFn: (a, b) => severityOrder[a.original.severity] - severityOrder[b.original.severity],
      cell: ({ row }) => <SeverityCell severity={row.original.severity} />,
    },
    {
      accessorKey: 'title',
      header: 'Record',
      size: tokens['grid-column-6xl'],
      minSize: tokens['grid-column-3xl'],
      enableHiding: false,
      cell: ({ row }) => <span title={row.original.title}>{row.original.title}</span>,
    },
    {
      id: 'subject',
      accessorFn: (row) => row.subject.name,
      header: 'Subject',
      size: tokens['grid-column-2xl'],
      minSize: tokens['grid-column-lg'],
      cell: ({ row }) => <EntityCell entity={row.original.subject} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: tokens['grid-column-md'],
      cell: ({ row }) => <StatusCell status={row.original.status} />,
    },
    { accessorKey: 'source', header: 'Source', size: tokens['grid-column-sm'] },
    {
      accessorKey: 'eventCount',
      header: 'Updates',
      size: tokens['grid-date-width'],
      minSize: tokens['grid-date-min-width'],
      meta: { align: 'right' },
      cell: ({ row }) => <NumberCell value={row.original.eventCount} />,
    },
    {
      accessorKey: 'lastSeen',
      header: 'Updated',
      size: tokens['grid-column-lg'],
      meta: { align: 'right' },
      cell: ({ row }) => <TimeCell value={row.original.lastSeen} now={referenceTime} />,
    },
    {
      id: 'assignee',
      accessorFn: (row) => row.assignee?.name ?? 'Unassigned',
      header: 'Assignee',
      size: tokens['grid-column-xl'],
      cell: ({ row }) =>
        row.original.assignee ? (
          <span className="row">
            <Avatar name={row.original.assignee.name} size="sm" />
            {row.original.assignee.name}
          </span>
        ) : (
          'Unassigned'
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      size: tokens['grid-tags-width'],
      accessorFn: (row) => row.tags.join(', '),
      cell: ({ row }) => <TagsCell tags={row.original.tags} maxVisible={1} />,
    },
    {
      id: 'activity',
      header: 'Activity',
      size: tokens['grid-column-md'],
      enableSorting: false,
      cell: ({ row }) => <SparklineCell data={row.original.sparkline} />,
    },
    {
      id: 'ai',
      header: 'AI suggestion',
      size: tokens['grid-trend-width'],
      enableSorting: false,
      cell: ({ row }) => <AiVerdictCell {...row.original.aiVerdict} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      size: tokens['grid-actions-width'],
      minSize: tokens['grid-actions-width'],
      maxSize: tokens['grid-actions-width'],
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <ActionsCell
          actions={[
            {
              id: 'open',
              label: `Open ${row.original.id}`,
              icon: <Eye size={componentToken('data-display.icon-inline')} />,
              onClick: () => open(row.original),
            },
            {
              id: 'ai',
              label: `Review ${row.original.id} with AI`,
              icon: <Sparkles size={componentToken('data-display.icon-inline')} />,
              intent: 'ai',
              onClick: () => explain([row.original]),
            },
            {
              id: 'complete',
              label: 'Mark completed',
              icon: <CheckCheck size={componentToken('data-display.icon-inline')} />,
              onClick: () =>
                updateRecords(
                  records.map((record) =>
                    record.id === row.id ? { ...record, status: 'completed' } : record,
                  ),
                ),
            },
          ]}
        />
      ),
    },
  ];
  return (
    <main className="aegis-grid-presentation">
      <header className="aegis-grid-presentation-heading">
        <div>
          <h1>
            <Folder size={componentToken('data-display.icon-entity')} aria-hidden="true" />
            Work records
          </h1>
          <p>Filter work across teams, update selected records, and review the full history.</p>
        </div>
        <Button
          emphasis="secondary"
          size="sm"
          leadingIcon={<RotateCcw size={componentToken('data-display.icon-sm')} />}
          onClick={() => reset()}
        >
          Restore demo
        </Button>
      </header>
      <section aria-label="Presentation options" className="aegis-grid-presentation-options">
        <Select
          label="Demo records"
          size="sm"
          value={String(count)}
          options={[
            { value: '150', label: '150 work records' },
            { value: '1000', label: '1,000 work records' },
          ]}
          onValueChange={(next) => reset(next === '1000' ? 1000 : 150)}
        />
        <Select
          label="Browsing mode"
          size="sm"
          value={mode}
          options={[
            { value: 'pages', label: 'Paginated results' },
            { value: 'virtual', label: 'Continuous virtual scrolling' },
          ]}
          onValueChange={(next) => setMode(next as PresentationMode)}
        />
        <Select
          label="Filter layout"
          size="sm"
          value={filterMode}
          options={[
            { value: 'panel', label: 'Sidebar filters' },
            { value: 'bar', label: 'Toolbar filters' },
          ]}
          onValueChange={(next) => setFilterMode(next === 'bar' ? 'bar' : 'panel')}
        />
        <Select
          label="Result state"
          size="sm"
          value={state}
          options={[
            { value: 'ready', label: 'Ready' },
            { value: 'loading', label: 'Loading skeletons' },
            { value: 'empty', label: 'No matching records' },
            { value: 'error', label: 'Connection error' },
          ]}
          onValueChange={(next) => {
            setState(next as PresentationState);
            setSelection([]);
            setSession((value) => value + 1);
          }}
        />
        <div role="status" className="aegis-grid-presentation-count">
          {state === 'empty' ? 0 : visible.length.toLocaleString()} matching records{' '}
          <Separator variant="dot" /> {selected.length} selected
        </div>
      </section>
      <div className="aegis-grid-record-workspace" ref={shell} data-panel-open={showPanel}>
        {showPanel && (
          <FilterPanel
            id={panelId}
            records={records}
            owners={owners}
            value={filters}
            onValueChange={updateFilters}
            now={referenceTime}
            onClose={closePanel}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closePanel();
              }
            }}
          />
        )}
        <div className="aegis-grid-record-results">
          <DataGrid
            key={session}
            data={state === 'empty' ? [] : visible}
            columns={columns}
            getRowId={(row) => row.id}
            rowLabel={(row) => `${row.id}: ${row.title}`}
            label="Records"
            noun="records"
            onRowClick={open}
            selectedRowIds={selection}
            onSelectedRowsChange={setSelection}
            renderExpandedRow={(record) => <RecordHistory record={record} />}
            density={density}
            onDensityChange={setDensity}
            pagination={mode === 'pages'}
            virtualize={mode === 'virtual'}
            height={tokens['data-display.business-grid-height']}
            loading={state === 'loading'}
            error={
              state === 'error'
                ? 'The workspace service could not be reached. Retry to restore the same records.'
                : undefined
            }
            onRetry={() => {
              setState('ready');
              setNotice('Connection restored. Your filters and records are preserved.');
            }}
            initialColumnVisibility={{ assignee: false, tags: false, activity: false, ai: false }}
            renderToolbar={(api) => (
              <FilterBar
                value={filters}
                onValueChange={updateFilters}
                owners={owners}
                now={referenceTime}
                filterMode={filterMode}
                filterPanelOpen={showPanel}
                panelId={panelId}
                onTogglePanel={() => setPanelOpen((value) => !value)}
                density={api.density}
                onDensityChange={api.setDensity}
                columns={api.columns}
                onColumnVisibilityChange={api.setColumnVisibility}
                selectionActions={api.selectionActions}
              />
            )}
            renderBulkActions={(items, clear) => (
              <BulkActionsBar
                position="inline"
                selectedCount={items.length}
                owners={owners}
                onClear={clear}
                onAssign={(id) =>
                  updateRecords(
                    records.map((record) =>
                      selection.includes(record.id)
                        ? { ...record, assignee: owners.find((owner) => owner.id === id) }
                        : record,
                    ),
                  )
                }
                onStatusChange={(status) =>
                  updateRecords(
                    records.map((record) =>
                      selection.includes(record.id) ? { ...record, status } : record,
                    ),
                  )
                }
                onSummarize={() => explain(items)}
              />
            )}
          />
        </div>
      </div>
      <footer className="aegis-grid-presentation-footer">
        <p role="status">{notice}</p>
        <details>
          <summary>Explore every table interaction</summary>
          <div>
            <p>
              <strong>Filter the work</strong>
              <br />
              Search, choose a time range, and combine facets. Active criteria stay in sync between
              sidebar and toolbar layouts.
            </p>
            <p>
              <strong>Shape the table</strong>
              <br />
              Adjust density and visible columns. <Kbd>Shift</Kbd> + click adds a sort. Drag a
              header to reorder or its edge to resize.
            </p>
            <p>
              <strong>Review and update</strong>
              <br />
              Expand record history, inspect raw JSON, edit details, or select records to assign an
              owner, change status, and ask AI.
            </p>
            <p>
              <strong>Use the keyboard</strong>
              <br />
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> move through rows, <Kbd>Space</Kbd> selects, and{' '}
              <Kbd>Enter</Kbd> opens details. Arrow keys also resize a focused column edge.
            </p>
          </div>
        </details>
      </footer>
      <SideSheet
        title={activeRecord?.title ?? 'Record details'}
        description={activeRecord?.id}
        open={!!activeRecord}
        onOpenChange={(value) => {
          if (!value) setActiveId(undefined);
        }}
        closeLabel="Close detail panel"
        size="lg"
        actions={
          activeRecord ? (
            <Button
              intent="ai"
              emphasis="secondary"
              leadingIcon={<Sparkles size={componentToken('data-display.icon-md')} />}
              onClick={() => explain([activeRecord])}
            >
              Review with AI
            </Button>
          ) : undefined
        }
      >
        {activeRecord && (
          <RecordDetails
            key={activeRecord.id}
            record={activeRecord}
            onSave={(next) =>
              updateRecords(records.map((record) => (record.id === next.id ? next : record)))
            }
          />
        )}
      </SideSheet>
      <AiPanel
        key={`assistant-${session}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        context={context}
        request={request}
        scopeLabel="Selected work records"
        availableContext={visible.map(contextFor)}
        onEvidenceClick={(item) => {
          if (records.some((record) => record.id === item.id)) {
            setAiOpen(false);
            setActiveId(item.id);
          }
        }}
      />
    </main>
  );
}
