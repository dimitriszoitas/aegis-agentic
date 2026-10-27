import { componentToken } from '@/lib/component-design-tokens';
import { Children, useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { X } from '@/components/icon';
import type { WorkRecord, RecordOwner } from '@/sample-data/types';
import { Accordion, type AccordionItem } from '@/components/accordion';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { CountBadge } from '@/components/count-badge';
import { IconButton } from '@/components/icon-button';
import { SearchInput } from '@/components/search-input';
import { SeverityBadge, severityLabels } from '@/components/severity-badge';
import { statusLabels as defaultStatusLabels, type RecordStatus } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import {
  recordFilterReducer,
  applyRecordFilters,
  filterSeverities,
  filterSources,
  filterStatuses,
  getRecordFacetCounts,
  getAppliedFilterCount,
  UNASSIGNED,
  type RecordFilterAction,
  type RecordFilterState,
} from '@/lib/filters';
import './filter-panel.css';

export interface FilterOptionsProps {
  children: ReactNode;
  groupLabel: string;
}

/** Keep long facets compact without changing the host's selected filter values. */
export function FilterOptions({ children, groupLabel }: FilterOptionsProps) {
  const [expanded, setExpanded] = useState(false);
  const options = Children.toArray(children);
  const optionsId = useId();
  const hasMore = options.length > 8;
  return (
    <div className="aegis-filter-options">
      <div id={optionsId} className="aegis-filter-facets">
        {expanded ? options : options.slice(0, 8)}
      </div>
      {hasMore && (
        <Button
          className="aegis-filter-options-toggle"
          emphasis="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-controls={optionsId}
          aria-label={
            expanded
              ? `Show first 8 of ${options.length} ${groupLabel} options`
              : `Show all ${options.length} ${groupLabel} options`
          }
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show all'}
        </Button>
      )}
    </div>
  );
}

export interface FilterPanelProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'onChange' | 'defaultValue'
> {
  value: RecordFilterState;
  onValueChange: (value: RecordFilterState) => void;
  records: readonly WorkRecord[];
  owners?: readonly RecordOwner[];
  now?: Date | number;
  onClose?: () => void;
  disabled?: boolean;
  defaultSearch?: string;
  /** Additional host-owned controls shown above the standard facets. */
  children?: ReactNode;
  /** Include host-owned criteria in the applied count and Clear all state. */
  additionalFilterCount?: number;
  onClearAll?: () => void;
  statusGroupLabel?: string;
  statusLabelOverrides?: Partial<Record<RecordStatus, string>>;
}

/** An in-flow panel. The containing grid shell owns its push/collapse transition. */
export function FilterPanel({
  value,
  onValueChange,
  records,
  owners,
  now,
  onClose,
  disabled = false,
  defaultSearch = '',
  children,
  additionalFilterCount = 0,
  onClearAll,
  statusGroupLabel = 'Status',
  statusLabelOverrides,
  className,
  ...props
}: FilterPanelProps) {
  const [search, setSearch] = useState(defaultSearch);
  const [expanded, setExpanded] = useState(['severity', 'status', 'source', 'assignee']);
  const titleId = useId();
  const anchor = now ?? Date.now();
  const query = search.trim().toLocaleLowerCase();
  const dispatch = (action: RecordFilterAction) =>
    onValueChange(recordFilterReducer(value, action));
  const count = getAppliedFilterCount(value) + Math.max(0, additionalFilterCount);
  const statusLabels = { ...defaultStatusLabels, ...statusLabelOverrides };
  const matching = applyRecordFilters(records, value, anchor).length;
  const severityCounts = getRecordFacetCounts(records, value, 'severities', anchor);
  const statusCounts = getRecordFacetCounts(records, value, 'statuses', anchor);
  const sourceCounts = getRecordFacetCounts(records, value, 'sources', anchor);
  const assigneeCounts = getRecordFacetCounts(records, value, 'assignees', anchor);
  const availableOwners = owners ?? [
    ...new Map(
      records.flatMap((record) =>
        record.assignee ? [[record.assignee.id, record.assignee] as const] : [],
      ),
    ).values(),
  ];
  const assignees = [{ id: UNASSIGNED, name: 'Unassigned' }, ...availableOwners];
  // Keep selected IDs removable even when their owner is no longer in the loaded records.
  for (const id of value.assignees)
    if (!assignees.some((owner) => owner.id === id)) assignees.push({ id, name: id });
  const visible = (group: string, label: string) =>
    !query || `${group} ${label}`.toLocaleLowerCase().includes(query);
  const facetLabel = (label: ReactNode, count: number) => (
    <span className="aegis-filter-facet-label">
      <span>{label}</span>
      <span className="aegis-filter-facet-count">
        <span className="sr-only">{count} matching records</span>
        <span aria-hidden="true">{count}</span>
      </span>
    </span>
  );
  const groups: AccordionItem[] = [];
  const severities = filterSeverities.filter((severity) =>
    visible('severity', severityLabels[severity]),
  );
  const statuses = filterStatuses.filter((status) =>
    visible(statusGroupLabel, statusLabels[status]),
  );
  const sources = filterSources.filter((source) => visible('source', source));
  const visibleAssignees = assignees.filter((owner) => visible('assignee', owner.name));
  if (severities.length)
    groups.push({
      value: 'severity',
      title: 'Severity',
      count: value.severities.length || undefined,
      content: (
        <FilterOptions groupLabel="Severity">
          {severities.map((severity) => (
            <Checkbox
              size="sm"
              key={severity}
              checked={value.severities.includes(severity)}
              disabled={disabled}
              label={facetLabel(
                <SeverityBadge severity={severity} />,
                severityCounts[severity] ?? 0,
              )}
              onCheckedChange={() =>
                dispatch({ type: 'toggle-facet', facet: 'severities', value: severity })
              }
            />
          ))}
        </FilterOptions>
      ),
    });
  if (statuses.length)
    groups.push({
      value: 'status',
      title: statusGroupLabel,
      count: value.statuses.length || undefined,
      content: (
        <FilterOptions groupLabel={statusGroupLabel}>
          {statuses.map((status) => (
            <Checkbox
              size="sm"
              key={status}
              checked={value.statuses.includes(status)}
              disabled={disabled}
              label={facetLabel(statusLabels[status], statusCounts[status] ?? 0)}
              onCheckedChange={() =>
                dispatch({ type: 'toggle-facet', facet: 'statuses', value: status })
              }
            />
          ))}
        </FilterOptions>
      ),
    });
  if (sources.length)
    groups.push({
      value: 'source',
      title: 'Source',
      count: value.sources.length || undefined,
      content: (
        <FilterOptions groupLabel="Source">
          {sources.map((source) => (
            <Checkbox
              size="sm"
              key={source}
              checked={value.sources.includes(source)}
              disabled={disabled}
              label={facetLabel(source, sourceCounts[source] ?? 0)}
              onCheckedChange={() =>
                dispatch({ type: 'toggle-facet', facet: 'sources', value: source })
              }
            />
          ))}
        </FilterOptions>
      ),
    });
  if (visibleAssignees.length)
    groups.push({
      value: 'assignee',
      title: 'Assignee',
      count: value.assignees.length || undefined,
      content: (
        <FilterOptions groupLabel="Assignee">
          {visibleAssignees.map((owner) => (
            <Checkbox
              size="sm"
              key={owner.id}
              checked={value.assignees.includes(owner.id)}
              disabled={disabled}
              label={facetLabel(owner.name, assigneeCounts[owner.id] ?? 0)}
              onCheckedChange={() =>
                dispatch({ type: 'toggle-facet', facet: 'assignees', value: owner.id })
              }
            />
          ))}
        </FilterOptions>
      ),
    });
  return (
    <aside
      {...props}
      className={cn('aegis-filter-panel', className)}
      aria-labelledby={props['aria-labelledby'] ?? titleId}
    >
      <div className="aegis-filter-panel-heading">
        <h2 id={titleId}>
          Filters <CountBadge count={count} label="applied filters" />
        </h2>
        <div className="aegis-filter-panel-actions">
          <Button
            emphasis="ghost"
            size="sm"
            disabled={disabled || count === 0}
            onClick={() => (onClearAll ? onClearAll() : dispatch({ type: 'reset' }))}
          >
            Clear all
          </Button>
          {onClose && (
            <IconButton
              aria-label="Close filter panel"
              emphasis="ghost"
              size="sm"
              onClick={onClose}
            >
              <X size={componentToken('filtering.icon-sm')} />
            </IconButton>
          )}
        </div>
      </div>
      <SearchInput
        aria-label="Search filter options"
        placeholder="Find a filter…"
        value={search}
        onValueChange={setSearch}
        disabled={disabled}
        clearLabel="Clear filter option search"
      />
      <div className="aegis-filter-panel-result" role="status" aria-live="polite">
        {matching.toLocaleString()} matching {matching === 1 ? 'record' : 'records'}
      </div>
      <div
        className="aegis-filter-panel-scroll"
        tabIndex={0}
        role="region"
        aria-label="Filter options"
      >
        {children && <div className="aegis-filter-panel-custom">{children}</div>}
        {groups.length ? (
          <Accordion
            type="multiple"
            value={query ? groups.map((group) => group.value) : expanded}
            onValueChange={(next) => {
              if (!query) setExpanded(next);
            }}
            items={groups}
          />
        ) : (
          <p className="aegis-filter-panel-empty" role="status">
            No filter options match “{search}”.
          </p>
        )}
      </div>
    </aside>
  );
}
