import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Accordion } from '@/components/accordion';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { CountBadge } from '@/components/count-badge';
import { DataGrid } from '@/components/data-grid';
import { DropdownMenu } from '@/components/dropdown-menu';
import { Field } from '@/components/field';
import { ChevronDown, Funnel, PanelLeftClose, Plus } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { Modal } from '@/components/modal';
import { ProgressBar } from '@/components/progress-bar';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Tag, type TagProps } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { AppliedFilterGroups } from '@/patterns/filter-bar';
import { FilterOptions } from '@/patterns/filter-panel';
import {
  businessReferenceDate,
  currentMemberId,
  formatBusinessDate,
  formatMoney,
  type BusinessData,
  type BusinessProject,
  type BusinessViewProps,
  type TeamMember,
} from './business-types';
import './business-lists.css';

export interface BusinessListsProps extends BusinessViewProps {
  kind: 'projects' | 'customers' | 'invoices' | 'team';
}
interface ListRow {
  id: string;
  name: string;
  subtitle: string;
  status: string;
  ownerId: string;
  customerId?: string;
  date: string;
  amount: number;
  priority?: string;
  progress?: number;
  plan?: string;
  industry?: string;
  role?: string;
  department?: string;
  location?: string;
  projectId?: string;
}
interface Facet {
  id: keyof ListRow;
  label: string;
  options: { value: string; label: string }[];
}
const projectStatuses: BusinessProject['status'][] = ['Planned', 'Active', 'On hold', 'Completed'];
const priorities: BusinessProject['priority'][] = ['Low', 'Medium', 'High'];
const roles: TeamMember['role'][] = ['Member', 'Manager', 'Admin'];
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
const descriptions: Record<BusinessListsProps['kind'], string> = {
  projects: 'Plan delivery, track progress, and keep client work moving.',
  customers: 'Account relationships, active work, and the people behind them.',
  invoices: 'Track billing, outstanding balances, and recorded payments.',
  team: 'The people delivering great work across Northstar.',
};
const statusIntent = (status: string): TagProps['intent'] =>
  ['Completed', 'Paid', 'Active'].includes(status)
    ? 'success'
    : status === 'Overdue'
      ? 'destroy'
      : ['On hold', 'Pending', 'Away', 'Paused'].includes(status)
        ? 'warning'
        : ['Invited', 'Prospect'].includes(status)
          ? 'function'
          : 'default';
const freshId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function BusinessLists({ kind, data, onNavigate, onChange }: BusinessListsProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState([
    'status',
    'priority',
    'ownerId',
    'plan',
    'industry',
    'customerId',
    'role',
    'department',
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<'project' | 'member'>();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sizes = useComponentTokenNumbers(
    [
      'application.grid-column-2xs',
      'application.grid-column-xs',
      'application.grid-column-sm',
      'application.grid-column-sm-plus',
      'application.grid-column-md',
      'application.grid-column-md-plus',
      'application.grid-column-lg',
      'application.grid-column-lg-plus',
      'application.grid-column-xl',
      'application.grid-column-xl-plus',
      'application.grid-column-2xl',
      'application.grid-column-3xl',
      'application.grid-column-4xl',
      'application.grid-column-5xl',
    ],
    rootRef,
  );
  const filterPanelId = useId();
  const title = kind === 'team' ? 'Team' : kind[0].toUpperCase() + kind.slice(1);
  const customerById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );
  const memberById = useMemo(
    () => new Map(data.team.map((member) => [member.id, member])),
    [data.team],
  );
  const projectById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  );
  const rows: ListRow[] = useMemo(() => {
    if (kind === 'projects')
      return data.projects.map((project) => ({
        id: project.id,
        name: project.name,
        subtitle: customerById.get(project.customerId)?.name ?? 'Customer',
        status: project.status,
        ownerId: project.ownerId,
        customerId: project.customerId,
        date: project.dueDate,
        amount: project.budget,
        priority: project.priority,
        progress: project.progress,
      }));
    if (kind === 'customers')
      return data.customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        subtitle: customer.contact,
        status: customer.status,
        ownerId: customer.ownerId,
        date: customer.joinedAt,
        amount: data.projects.filter((project) => project.customerId === customer.id).length,
        plan: customer.plan,
        industry: customer.industry,
        location: customer.location,
      }));
    if (kind === 'invoices')
      return data.invoices.map((invoice) => ({
        id: invoice.id,
        name: invoice.id,
        subtitle: customerById.get(invoice.customerId)?.name ?? 'Customer',
        status: invoice.status,
        ownerId: customerById.get(invoice.customerId)?.ownerId ?? '',
        customerId: invoice.customerId,
        date: invoice.dueDate,
        amount: invoice.amount,
        projectId: invoice.projectId,
      }));
    return data.team.map((member) => ({
      id: member.id,
      name: member.name,
      subtitle: member.email,
      status: member.status,
      ownerId: member.id,
      date: member.joinedAt,
      amount: data.projects.filter(
        (project) => project.memberIds.includes(member.id) && project.status !== 'Completed',
      ).length,
      role: member.role,
      department: member.department,
      location: member.location,
    }));
  }, [kind, data, customerById]);
  const facets: Facet[] =
    kind === 'projects'
      ? [
          { id: 'status', label: 'Status', options: options(projectStatuses) },
          { id: 'priority', label: 'Priority', options: options(priorities) },
          {
            id: 'ownerId',
            label: 'Owner',
            options: data.team
              .filter((member) => data.projects.some((project) => project.ownerId === member.id))
              .map((member) => ({ value: member.id, label: member.name })),
          },
        ]
      : kind === 'customers'
        ? [
            { id: 'status', label: 'Status', options: options(['Active', 'Prospect', 'Paused']) },
            { id: 'plan', label: 'Plan', options: options(['Standard', 'Business', 'Enterprise']) },
            {
              id: 'industry',
              label: 'Industry',
              options: options(
                [...new Set(data.customers.map((customer) => customer.industry))].sort(),
              ),
            },
          ]
        : kind === 'invoices'
          ? [
              { id: 'status', label: 'Status', options: options(['Pending', 'Overdue', 'Paid']) },
              {
                id: 'customerId',
                label: 'Customer',
                options: data.customers
                  .filter((customer) =>
                    data.invoices.some((invoice) => invoice.customerId === customer.id),
                  )
                  .map((customer) => ({ value: customer.id, label: customer.name })),
              },
            ]
          : [
              { id: 'status', label: 'Status', options: options(['Active', 'Invited', 'Away']) },
              { id: 'role', label: 'Role', options: options(roles) },
              {
                id: 'department',
                label: 'Department',
                options: options([...new Set(data.team.map((member) => member.department))].sort()),
              },
            ];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (row: ListRow, except?: string) =>
    `${row.name} ${row.subtitle} ${row.id} ${row.location ?? ''} ${row.department ?? ''} ${projectById.get(row.projectId ?? '')?.name ?? ''}`
      .toLocaleLowerCase()
      .includes(normalizedQuery) &&
    Object.entries(filters).every(
      ([key, values]) =>
        key === except ||
        values.length === 0 ||
        values.includes(String(row[key as keyof ListRow] ?? '')),
    );
  const matching = rows.filter((row) => matches(row));
  const setFacet = (id: string, values: string[]) => {
    setFilters((current) => ({ ...current, [id]: values }));
    setSelectedIds([]);
  };
  const clearFilters = () => {
    setFilters({});
    setSelectedIds([]);
  };
  const focusSearch = () => searchRef.current?.focus({ preventScroll: true });
  const filterCount = Object.values(filters).reduce((sum, values) => sum + values.length, 0);
  function focusFilterControl() {
    rootRef.current
      ?.querySelector<HTMLElement>(
        `button[aria-controls="${filterPanelId}"], .aegis-business-bulk button, .aegis-grid-scroll`,
      )
      ?.focus({ preventScroll: true });
  }
  function closeFilters() {
    setPanelOpen(false);
    requestAnimationFrame(focusFilterControl);
  }
  function toggleFilters() {
    if (panelOpen) closeFilters();
    else {
      setPanelOpen(true);
      requestAnimationFrame(() =>
        document.getElementById(`${filterPanelId}-heading`)?.focus({ preventScroll: true }),
      );
    }
  }
  const filterGroups = facets.map((facet) => ({
    value: facet.id,
    title: facet.label,
    count: filters[facet.id]?.length || undefined,
    content: (
      <FilterOptions groupLabel={facet.label}>
        {facet.options.map((option) => {
          const count = rows.filter(
            (row) => matches(row, facet.id) && String(row[facet.id]) === option.value,
          ).length;
          return (
            <Checkbox
              key={option.value}
              size="sm"
              checked={filters[facet.id]?.includes(option.value) ?? false}
              label={
                <span className="aegis-filter-facet-label">
                  <span title={option.label}>{option.label}</span>
                  <span className="aegis-filter-facet-count">
                    <span aria-hidden="true">{count}</span>
                    <span className="sr-only">
                      {count} matching {kind === 'team' ? 'members' : kind}
                    </span>
                  </span>
                </span>
              }
              onCheckedChange={(checked) =>
                setFacet(
                  facet.id,
                  checked === true
                    ? [...(filters[facet.id] ?? []), option.value]
                    : (filters[facet.id] ?? []).filter((value) => value !== option.value),
                )
              }
            />
          );
        })}
      </FilterOptions>
    ),
  }));
  const navigate = (row: ListRow) =>
    onNavigate(
      kind === 'invoices'
        ? { page: 'projects', recordId: row.projectId }
        : { page: kind, recordId: row.id },
    );
  const nameColumn: ColumnDef<ListRow> = {
    accessorKey: 'name',
    header:
      kind === 'team'
        ? 'Member'
        : kind === 'invoices'
          ? 'Invoice'
          : kind === 'projects'
            ? 'Project'
            : 'Customer',
    size:
      kind === 'invoices'
        ? sizes['application.grid-column-3xl']
        : sizes['application.grid-column-5xl'],
    minSize: sizes['application.grid-column-2xl'],
    cell: ({ row }) => (
      <div className="aegis-business-name-cell">
        {kind === 'team' && <Avatar name={row.original.name} size="sm" aria-hidden="true" />}
        <div className="aegis-business-cell-copy">
          <button
            type="button"
            className="aegis-business-record-link"
            onClick={() => navigate(row.original)}
          >
            {row.original.name}
          </button>
          <span>{row.original.subtitle}</span>
        </div>
      </div>
    ),
  };
  const ownerColumn: ColumnDef<ListRow> = {
    accessorKey: 'ownerId',
    header: 'Owner',
    size: sizes['application.grid-column-xl-plus'],
    sortingFn: (a, b) =>
      (memberById.get(a.original.ownerId)?.name ?? '').localeCompare(
        memberById.get(b.original.ownerId)?.name ?? '',
      ),
    meta: { getText: (row) => memberById.get(row.ownerId)?.name ?? '' },
    cell: ({ row }) => {
      const member = memberById.get(row.original.ownerId);
      return member ? (
        <button
          className="aegis-business-person"
          type="button"
          onClick={() => onNavigate({ page: 'team', recordId: member.id })}
        >
          <Avatar name={member.name} initials={member.initials} size="sm" aria-hidden="true" />
          <span>{member.name}</span>
        </button>
      ) : (
        'Unassigned'
      );
    },
  };
  const statusColumn: ColumnDef<ListRow> = {
    accessorKey: 'status',
    header: 'Status',
    size: sizes['application.grid-column-md'],
    cell: ({ row }) => (
      <Tag variant="status" intent={statusIntent(row.original.status)}>
        {row.original.status}
      </Tag>
    ),
  };
  const dateColumn: ColumnDef<ListRow> = {
    accessorKey: 'date',
    header: kind === 'projects' || kind === 'invoices' ? 'Due date' : 'Joined',
    size: sizes['application.grid-column-lg'],
    minSize: sizes['application.grid-column-lg'],
    meta: { align: 'right', cellClassName: 'mono' },
    cell: ({ row }) => formatBusinessDate(row.original.date),
  };
  const columns: ColumnDef<ListRow>[] =
    kind === 'projects'
      ? [
          nameColumn,
          statusColumn,
          {
            accessorKey: 'priority',
            header: 'Priority',
            size: sizes['application.grid-column-2xs'],
            sortingFn: (a, b) =>
              priorities.indexOf(a.original.priority as BusinessProject['priority']) -
              priorities.indexOf(b.original.priority as BusinessProject['priority']),
            cell: ({ row }) => (
              <Tag size="sm" intent={row.original.priority === 'High' ? 'warning' : 'default'}>
                {row.original.priority}
              </Tag>
            ),
          },
          ownerColumn,
          {
            accessorKey: 'progress',
            header: 'Progress',
            size: sizes['application.grid-column-lg-plus'],
            cell: ({ row }) => (
              <div className="aegis-business-progress">
                <ProgressBar
                  label={`${row.original.name} progress`}
                  value={row.original.progress}
                  size="sm"
                  intent={row.original.status === 'Completed' ? 'success' : 'function'}
                />
                <span className="mono">{row.original.progress}%</span>
              </div>
            ),
          },
          {
            accessorKey: 'amount',
            header: 'Budget',
            size: sizes['application.grid-column-sm-plus'],
            meta: { align: 'right', cellClassName: 'mono' },
            cell: ({ row }) => formatMoney(row.original.amount),
          },
          dateColumn,
        ]
      : kind === 'customers'
        ? [
            nameColumn,
            statusColumn,
            {
              accessorKey: 'industry',
              header: 'Industry',
              size: sizes['application.grid-column-xl'],
            },
            {
              accessorKey: 'plan',
              header: 'Plan',
              size: sizes['application.grid-column-sm'],
              cell: ({ row }) => <Tag size="sm">{row.original.plan}</Tag>,
            },
            ownerColumn,
            {
              accessorKey: 'amount',
              header: 'Projects',
              size: sizes['application.grid-column-2xs'],
              meta: { align: 'right', cellClassName: 'mono' },
            },
            dateColumn,
          ]
        : kind === 'invoices'
          ? [
              nameColumn,
              {
                id: 'project',
                accessorFn: (row) => projectById.get(row.projectId ?? '')?.name ?? '',
                header: 'Project',
                size: sizes['application.grid-column-4xl'],
                cell: ({ row, getValue }) => (
                  <button
                    type="button"
                    className="aegis-business-record-link"
                    onClick={() => navigate(row.original)}
                  >
                    {getValue<string>()}
                  </button>
                ),
              },
              statusColumn,
              {
                accessorKey: 'amount',
                header: 'Amount',
                size: sizes['application.grid-column-md-plus'],
                meta: { align: 'right', cellClassName: 'mono' },
                cell: ({ row }) => formatMoney(row.original.amount),
              },
              dateColumn,
            ]
          : [
              nameColumn,
              { accessorKey: 'role', header: 'Role', size: sizes['application.grid-column-xs'] },
              {
                accessorKey: 'department',
                header: 'Department',
                size: sizes['application.grid-column-xl'],
              },
              statusColumn,
              {
                accessorKey: 'location',
                header: 'Location',
                size: sizes['application.grid-column-xl-plus'],
              },
              {
                accessorKey: 'amount',
                header: 'Active projects',
                size: sizes['application.grid-column-md-plus'],
                meta: { align: 'right', cellClassName: 'mono' },
              },
              dateColumn,
            ];
  const summary =
    kind === 'invoices'
      ? `${formatMoney(data.invoices.filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0))} outstanding · ${data.invoices.filter((invoice) => invoice.status === 'Overdue').length} overdue`
      : kind === 'projects'
        ? `${data.projects.filter((project) => project.status === 'Active').length} active · ${data.projects.filter((project) => project.status === 'Completed').length} completed`
        : kind === 'customers'
          ? `${data.customers.filter((customer) => customer.status === 'Active').length} active accounts · ${data.customers.filter((customer) => customer.status === 'Prospect').length} prospects`
          : `${data.team.filter((member) => member.status !== 'Invited').length} members · ${data.team.filter((member) => member.status === 'Invited').length} invited`;
  function updateProjectStatus(status: BusinessProject['status'], ids: string[]) {
    onChange(
      {
        projects: data.projects.map((project) => {
          if (!ids.includes(project.id)) return project;
          const tasks = project.tasks.map((task, index, allTasks) => ({
            ...task,
            done:
              status === 'Completed'
                ? true
                : status === 'Planned'
                  ? false
                  : project.progress === 100
                    ? index < allTasks.length - 1
                    : task.done,
          }));
          return {
            ...project,
            status,
            tasks,
            updatedAt: new Date().toISOString(),
            progress:
              status === 'Completed'
                ? 100
                : tasks.length
                  ? Math.round((tasks.filter((task) => task.done).length / tasks.length) * 100)
                  : 0,
          };
        }),
      },
      `${ids.length} ${ids.length === 1 ? 'project' : 'projects'} marked ${status.toLowerCase()}.`,
    );
    setSelectedIds([]);
    requestAnimationFrame(focusSearch);
  }
  function markPaid(ids: string[]) {
    const count = data.invoices.filter(
      (invoice) => ids.includes(invoice.id) && invoice.status !== 'Paid',
    ).length;
    if (!count) return;
    onChange(
      {
        invoices: data.invoices.map((invoice) =>
          ids.includes(invoice.id) ? { ...invoice, status: 'Paid' } : invoice,
        ),
      },
      `${count} ${count === 1 ? 'invoice' : 'invoices'} marked paid.`,
    );
    setSelectedIds([]);
    requestAnimationFrame(focusSearch);
  }
  return (
    <section className="aegis-business-list" ref={rootRef} aria-label={title}>
      <header className="aegis-business-list-heading">
        <div>
          <h1 tabIndex={-1}>{title}</h1>
          <p>{descriptions[kind]}</p>
        </div>
        <span className="aegis-business-list-summary">{summary}</span>
      </header>
      <div className="aegis-business-list-workspace" data-panel-open={panelOpen}>
        <div
          className="aegis-business-facets"
          id={filterPanelId}
          aria-hidden={!panelOpen}
          inert={!panelOpen}
        >
          <aside
            className="aegis-filter-panel aegis-business-filter-panel"
            aria-labelledby={`${filterPanelId}-heading`}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.defaultPrevented) {
                event.preventDefault();
                closeFilters();
              }
            }}
          >
            <div className="aegis-filter-panel-heading">
              <h2 id={`${filterPanelId}-heading`} tabIndex={-1}>
                Filters{' '}
                {filterCount > 0 && (
                  <CountBadge count={filterCount} label={`applied ${kind} filters`} />
                )}
              </h2>
              <div className="aegis-filter-panel-actions">
                <Button size="sm" emphasis="ghost" onClick={clearFilters} disabled={!filterCount}>
                  Clear all
                </Button>
                <IconButton
                  aria-label={`Collapse ${kind} filters`}
                  size="sm"
                  emphasis="ghost"
                  onClick={closeFilters}
                >
                  <PanelLeftClose size={componentToken('application.icon-md')} />
                </IconButton>
              </div>
            </div>
            <span className="aegis-filter-panel-result" role="status">
              {matching.length} of {rows.length} {kind === 'team' ? 'members' : kind} match
            </span>
            <div
              className="aegis-filter-panel-scroll"
              role="region"
              aria-label={`${title} filter options`}
              tabIndex={0}
            >
              <Accordion
                type="multiple"
                value={expandedFilters}
                onValueChange={setExpandedFilters}
                items={filterGroups}
              />
            </div>
          </aside>
        </div>
        <div className="aegis-business-list-results">
          <DataGrid<ListRow>
            label={`${title} table`}
            noun={kind === 'team' ? 'members' : kind}
            data={matching}
            columns={columns}
            getRowId={(row) => row.id}
            rowLabel={(row) => row.name}
            onRowClick={navigate}
            enableSelection
            selectedRowIds={selectedIds}
            onSelectedRowsChange={setSelectedIds}
            pageSize={10}
            height={componentToken('business-grid-height')}
            emptyTitle={`No ${kind === 'team' ? 'members' : kind} found`}
            emptyDescription="Try another search or clear the selected filters."
            renderBulkActions={(selected, clear) => (
              <div className="aegis-business-bulk" role="group" aria-label="Selection actions">
                <strong>{selected.length} selected</strong>
                {kind === 'projects' && (
                  <DropdownMenu
                    label="Update project status"
                    trigger={
                      <Button
                        size="sm"
                        emphasis="secondary"
                        trailingIcon={<ChevronDown size={componentToken('application.icon-sm')} />}
                      >
                        Set status
                      </Button>
                    }
                    items={projectStatuses.map((status) => ({
                      id: status,
                      label: status,
                      onSelect: () =>
                        updateProjectStatus(
                          status,
                          selected.map((row) => row.id),
                        ),
                    }))}
                  />
                )}
                {kind === 'invoices' && (
                  <Button
                    size="sm"
                    emphasis="secondary"
                    disabled={selected.every((row) => row.status === 'Paid')}
                    onClick={() => markPaid(selected.map((row) => row.id))}
                  >
                    Mark paid
                  </Button>
                )}
                <Button
                  size="sm"
                  emphasis="ghost"
                  onClick={() => {
                    clear();
                    requestAnimationFrame(focusSearch);
                  }}
                >
                  Clear selection
                </Button>
              </div>
            )}
            renderToolbar={({ selectionActions }) => (
              <div className="aegis-business-list-tools">
                <div className="aegis-business-list-toolbar">
                  {selectionActions ?? (
                    <>
                      <div className="aegis-business-filter-toggle">
                        <IconButton
                          emphasis="tertiary"
                          aria-label={filterCount ? `Filters, ${filterCount} applied` : 'Filters'}
                          aria-controls={filterPanelId}
                          aria-expanded={panelOpen}
                          onClick={toggleFilters}
                        >
                          <Funnel size={componentToken('application.icon-md')} />
                        </IconButton>
                      </div>
                      <SearchInput
                        ref={searchRef}
                        aria-label={`Search ${kind}`}
                        placeholder={kind === 'team' ? 'Search members…' : `Search ${kind}…`}
                        value={query}
                        onValueChange={(value) => {
                          setQuery(value);
                          setSelectedIds([]);
                        }}
                      />
                      <div className="aegis-business-list-create">
                        {kind === 'projects' && (
                          <Button
                            leadingIcon={<Plus size={componentToken('application.icon-md')} />}
                            onClick={() => setDialog('project')}
                          >
                            Create project
                          </Button>
                        )}
                        {kind === 'team' && (
                          <Button
                            leadingIcon={<Plus size={componentToken('application.icon-md')} />}
                            onClick={() => setDialog('member')}
                          >
                            Invite member
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {!panelOpen && (
                  <AppliedFilterGroups
                    groups={facets.map((facet) => ({
                      id: facet.id,
                      label: facet.label,
                      values: (filters[facet.id] ?? []).map(
                        (value) =>
                          facet.options.find((option) => option.value === value)?.label ?? value,
                      ),
                      onRemove: () => setFacet(facet.id, []),
                    }))}
                    onClearAll={clearFilters}
                    focusFallback={focusFilterControl}
                  />
                )}
              </div>
            )}
          />
        </div>
      </div>
      {dialog === 'project' && (
        <CreateProject
          data={data}
          onClose={() => setDialog(undefined)}
          onCreate={(project) => {
            onChange({ projects: [project, ...data.projects] }, `Created ${project.name}.`);
            setQuery('');
            setFilters({});
            setSelectedIds([]);
            setDialog(undefined);
            requestAnimationFrame(() => onNavigate({ page: 'projects', recordId: project.id }));
          }}
        />
      )}
      {dialog === 'member' && (
        <InviteMember
          data={data}
          onClose={() => setDialog(undefined)}
          onCreate={(member) => {
            onChange(
              { team: [member, ...data.team] },
              `Added ${member.name} as an invited member. No email was sent.`,
            );
            setQuery('');
            setFilters({});
            setSelectedIds([]);
            setDialog(undefined);
          }}
        />
      )}
    </section>
  );
}

function CreateProject({
  data,
  onClose,
  onCreate,
}: {
  data: BusinessData;
  onClose: () => void;
  onCreate: (project: BusinessProject) => void;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [owner, setOwner] = useState(currentMemberId);
  const [budget, setBudget] = useState('');
  const [due, setDue] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 3) next.name = 'Enter a project name with at least 3 characters.';
    if (!data.customers.some((item) => item.id === customer)) next.customer = 'Choose a customer.';
    if (!data.team.some((item) => item.id === owner)) next.owner = 'Choose an owner.';
    if (!budget.trim() || !Number.isFinite(Number(budget)) || Number(budget) <= 0)
      next.budget = 'Enter a budget greater than zero.';
    if (!due || !Number.isFinite(Date.parse(due)) || due < businessReferenceDate.slice(0, 10))
      next.due = 'Choose a due date on or after 24 October 2026.';
    if (
      data.projects.some(
        (project) =>
          project.customerId === customer &&
          project.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      next.name = 'This customer already has a project with that name.';
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    onCreate({
      id: freshId('prj'),
      name: name.trim(),
      customerId: customer,
      ownerId: owner,
      memberIds: [owner],
      status: 'Planned',
      priority: 'Medium',
      description: description.trim(),
      budget: Number(budget),
      spent: 0,
      progress: 0,
      dueDate: `${due}T12:00:00.000Z`,
      updatedAt: new Date().toISOString(),
      tasks: [],
      notes: [],
    });
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Create project"
      description="Set up the client, owner, and delivery target. You can add tasks in the project workspace."
      footer={
        <>
          <Button emphasis="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Create project
          </Button>
        </>
      }
    >
      <form
        ref={formRef}
        id={formId}
        className="aegis-business-create-form"
        noValidate
        onSubmit={submit}
      >
        <Field label="Project name" error={errors.name} required>
          <TextInput
            value={name}
            onValueChange={setName}
            placeholder="e.g. Customer onboarding refresh"
            maxLength={120}
          />
        </Field>
        <Field label="Customer" error={errors.customer} required>
          <Select
            value={customer}
            onValueChange={setCustomer}
            placeholder="Choose a customer"
            options={data.customers.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label="Project owner" error={errors.owner} required>
          <Select
            value={owner}
            onValueChange={setOwner}
            options={data.team
              .filter((member) => member.status !== 'Invited')
              .map((member) => ({ value: member.id, label: member.name }))}
          />
        </Field>
        <div className="aegis-business-form-columns">
          <Field label="Budget (USD)" error={errors.budget} required>
            <TextInput
              type="number"
              min="1"
              step="1"
              value={budget}
              onValueChange={setBudget}
              placeholder="25000"
            />
          </Field>
          <Field label="Due date" error={errors.due} required>
            <TextInput
              type="date"
              min={businessReferenceDate.slice(0, 10)}
              value={due}
              onValueChange={setDue}
            />
          </Field>
        </div>
        <Field label="Description" optional>
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What will this project deliver?"
          />
        </Field>
      </form>
    </Modal>
  );
}
function InviteMember({
  data,
  onClose,
  onCreate,
}: {
  data: BusinessData;
  onClose: () => void;
  onCreate: (member: TeamMember) => void;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Member');
  const [department, setDepartment] = useState('Operations');
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter the member’s full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address.';
    else if (data.team.some((member) => member.email.toLowerCase() === email.trim().toLowerCase()))
      next.email = 'This email already belongs to a member or pending invitation.';
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    onCreate({
      id: freshId('usr'),
      name: name.trim(),
      initials: initials(name),
      email: email.trim().toLowerCase(),
      role,
      department,
      title: 'New team member',
      location: 'Not specified',
      status: 'Invited',
      bio: 'Profile details will be added when this member joins the workspace.',
      joinedAt: new Date().toISOString(),
    });
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Invite member"
      description="Add an invited member to this local example. No invitation email is sent."
      size="small"
      footer={
        <>
          <Button emphasis="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Add invited member
          </Button>
        </>
      }
    >
      <form
        ref={formRef}
        id={formId}
        className="aegis-business-create-form"
        noValidate
        onSubmit={submit}
      >
        <Field label="Full name" error={errors.name} required>
          <TextInput value={name} onValueChange={setName} autoComplete="name" maxLength={100} />
        </Field>
        <Field label="Email address" error={errors.email} required>
          <TextInput type="email" value={email} onValueChange={setEmail} autoComplete="email" />
        </Field>
        <Field label="Role" required>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as TeamMember['role'])}
            options={options(roles)}
          />
        </Field>
        <Field label="Department" required>
          <Select
            value={department}
            onValueChange={setDepartment}
            options={options([...new Set(data.team.map((member) => member.department))])}
          />
        </Field>
      </form>
    </Modal>
  );
}
