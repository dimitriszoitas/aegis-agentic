import { componentToken } from '@/lib/component-design-tokens';
import { useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Columns3, Funnel, Rows2, Rows3, Rows4 } from '@/components/icon';
import type { RecordOwner } from '@/sample-data/types';
import { Button } from '@/components/button';
import { ButtonGroup } from '@/components/button-group';
import { IconButton } from '@/components/icon-button';
import { Checkbox } from '@/components/checkbox';
import { Popover } from '@/components/popover';
import { SearchInput } from '@/components/search-input';
import { Select, type SelectOption } from '@/components/select';
import { TextInput } from '@/components/text-input';
import { TimeRangePicker } from '@/components/time-range-picker';
import { Tag } from '@/components/tag';
import { severityLabels } from '@/components/severity-badge';
import { statusLabels } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { formatTimeRange } from '@/lib/time-range';
import {
  recordFilterReducer,
  filterSeverities,
  filterStatuses,
  filterSources,
  getAppliedFilterCount,
  hasCustomTimeRange,
  UNASSIGNED,
  type RecordFilterAction,
  type RecordFilterState,
  type FilterColumn,
  type FilterDensity,
  type FilterField,
  type FilterOperator,
} from '@/lib/filters';
import './filter-bar.css';

export type { FilterColumn, FilterDensity } from '@/lib/filters';
export type FilterMode = 'bar' | 'panel';
export interface FilterBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Bar mode edits filters inline; panel mode delegates editing to the sidebar. */
  filterMode?: FilterMode;
  /** Replaces the normal filter/search row while records are selected. */
  selectionActions?: ReactNode;
  value: RecordFilterState;
  onValueChange: (value: RecordFilterState) => void;
  owners?: readonly RecordOwner[];
  now?: Date | number;
  density?: FilterDensity;
  onDensityChange?: (density: FilterDensity) => void;
  columns?: readonly FilterColumn[];
  onColumnVisibilityChange?: (id: string, visible: boolean) => void;
  onTogglePanel?: () => void;
  /** Applied chips appear only when the filter sidebar is closed. */
  filterPanelOpen?: boolean;
  panelId?: string;
  disabled?: boolean;
}
const fieldLabels: Record<FilterField, string> = {
  title: 'Record title',
  severity: 'Severity',
  status: 'Status',
  source: 'Source',
  subject: 'Subject',
  category: 'Category',
  assignee: 'Assignee',
  tags: 'Tag',
};
const operatorLabels: Record<FilterOperator, string> = {
  is: 'is',
  'is-not': 'is not',
  contains: 'contains',
  'not-contains': 'does not contain',
};

interface FilterPickerProps {
  value: RecordFilterState;
  dispatch: (action: RecordFilterAction) => void;
  owners: readonly RecordOwner[];
  disabled: boolean;
}
function FilterPicker({ value, dispatch, owners, disabled }: FilterPickerProps) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState<FilterField>('severity');
  const [operator, setOperator] = useState<FilterOperator>('is');
  const [input, setInput] = useState('');
  const choices: SelectOption[] | undefined =
    field === 'severity'
      ? filterSeverities.map((item) => ({ value: item, label: severityLabels[item] }))
      : field === 'status'
        ? filterStatuses.map((item) => ({ value: item, label: statusLabels[item] }))
        : field === 'source'
          ? filterSources.map((item) => ({ value: item, label: item }))
          : field === 'assignee'
            ? [
                { value: UNASSIGNED, label: 'Unassigned' },
                ...owners.map((item) => ({ value: item.id, label: item.name })),
              ]
            : undefined;
  const selectValue = choices && (operator === 'is' || operator === 'is-not');
  function apply() {
    const selected = input.trim();
    if (!selected || disabled) return;
    const severity = filterSeverities.find((item) => item === selected);
    const status = filterStatuses.find((item) => item === selected);
    const source = filterSources.find((item) => item === selected);
    if (operator === 'is' && field === 'severity' && severity)
      dispatch({
        type: 'patch',
        patch: { severities: [...new Set([...value.severities, severity])] },
      });
    else if (operator === 'is' && field === 'status' && status)
      dispatch({ type: 'patch', patch: { statuses: [...new Set([...value.statuses, status])] } });
    else if (operator === 'is' && field === 'source' && source)
      dispatch({ type: 'patch', patch: { sources: [...new Set([...value.sources, source])] } });
    else if (operator === 'is' && field === 'assignee')
      dispatch({
        type: 'patch',
        patch: { assignees: [...new Set([...value.assignees, selected])] },
      });
    else
      dispatch({
        type: 'add-rule',
        rule: { id: crypto.randomUUID(), field, operator, value: selected },
      });
    setInput('');
    setOpen(false);
  }
  return (
    <Popover
      title="Add filter"
      open={open}
      onOpenChange={setOpen}
      width={componentToken('filter-picker-width')}
      trigger={
        <IconButton aria-label="Add filter" data-filter-add emphasis="ghost" disabled={disabled}>
          <Funnel size={componentToken('filtering.icon-md')} />
        </IconButton>
      }
    >
      <form
        className="aegis-filter-picker"
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <Select
          label="Field"
          disabled={disabled}
          options={Object.entries(fieldLabels).map(([value, label]) => ({ value, label }))}
          value={field}
          onValueChange={(next) => {
            setField(next as FilterField);
            setInput('');
          }}
        />
        <Select
          label="Operator"
          disabled={disabled}
          options={Object.entries(operatorLabels).map(([value, label]) => ({ value, label }))}
          value={operator}
          onValueChange={(next) => {
            setOperator(next as FilterOperator);
            setInput('');
          }}
        />
        {selectValue ? (
          <Select
            label="Value"
            disabled={disabled}
            placeholder="Choose a value"
            options={choices}
            value={input}
            onValueChange={setInput}
          />
        ) : (
          <TextInput
            label="Value"
            disabled={disabled}
            placeholder={
              field === 'category' ? 'For example, delivery.001' : 'Enter a filter value'
            }
            value={input}
            onValueChange={setInput}
          />
        )}
        <Button type="submit" intent="function" disabled={!input.trim() || disabled}>
          Apply filter
        </Button>
      </form>
    </Popover>
  );
}

/** Search and view controls, plus a removable summary while the facet sidebar is closed. */
export function FilterBar({
  filterMode = 'bar',
  selectionActions,
  value,
  onValueChange,
  owners = [],
  now,
  density,
  onDensityChange,
  columns = [],
  onColumnVisibilityChange,
  onTogglePanel,
  filterPanelOpen = false,
  panelId,
  disabled = false,
  className,
  ...props
}: FilterBarProps) {
  const [internalDensity, setInternalDensity] = useState<FilterDensity>('default');
  const barRef = useRef<HTMLDivElement>(null);
  const activeDensity = density ?? internalDensity;
  const dispatch = (action: RecordFilterAction) =>
    onValueChange(recordFilterReducer(value, action));
  const removeFilter = (action: RecordFilterAction) => {
    const active = barRef.current?.ownerDocument.activeElement;
    if (active instanceof HTMLButtonElement && active.matches('.tag-remove')) {
      const buttons = Array.from(
        barRef.current?.querySelectorAll<HTMLButtonElement>('.tag-remove') ?? [],
      );
      const index = buttons.indexOf(active);
      (
        buttons[index + 1] ??
        buttons[index - 1] ??
        barRef.current?.querySelector<HTMLInputElement>('input[type="search"]')
      )?.focus();
    }
    dispatch(action);
  };
  const count = getAppliedFilterCount(value);
  const assigneeLabel = (id: string) =>
    id === UNASSIGNED ? 'Unassigned' : (owners.find((owner) => owner.id === id)?.name ?? id);
  const ruleDisplay = (field: FilterField, selected: string): string => {
    if (field === 'assignee') return assigneeLabel(selected);
    const severity =
      field === 'severity' ? filterSeverities.find((item) => item === selected) : undefined;
    const status =
      field === 'status' ? filterStatuses.find((item) => item === selected) : undefined;
    return severity ? severityLabels[severity] : status ? statusLabels[status] : selected;
  };
  return (
    <div
      {...props}
      ref={barRef}
      role="region"
      className={cn('aegis-filter-bar', className)}
      data-filter-mode={filterMode}
      aria-label={props['aria-label'] ?? 'Record filters'}
    >
      {selectionActions && <div className="aegis-filter-bar-selection">{selectionActions}</div>}
      <div className="aegis-filter-bar-main" hidden={!!selectionActions}>
        {filterMode === 'bar' && (
          <FilterPicker value={value} dispatch={dispatch} owners={owners} disabled={disabled} />
        )}
        {filterMode === 'panel' && onTogglePanel && (
          <IconButton
            aria-label={filterPanelOpen ? 'Hide filter panel' : 'Show filter panel'}
            aria-expanded={filterPanelOpen}
            aria-controls={panelId}
            emphasis={filterPanelOpen ? 'secondary' : 'ghost'}
            intent={filterPanelOpen ? 'function' : 'default'}
            onClick={onTogglePanel}
            disabled={disabled}
          >
            <Funnel size={componentToken('filtering.icon-md')} />
          </IconButton>
        )}
        <SearchInput
          aria-label="Search records"
          placeholder="Search records, subjects, categories…"
          value={value.query}
          onValueChange={(query) => dispatch({ type: 'patch', patch: { query } })}
          disabled={disabled}
          className="aegis-filter-search"
        />
        <TimeRangePicker
          value={value.timeRange}
          onValueChange={(timeRange) => dispatch({ type: 'patch', patch: { timeRange } })}
          now={now}
          disabled={disabled}
        />
        <div className="aegis-filter-bar-tools">
          <ButtonGroup aria-label="Row density">
            {(
              [
                { value: 'compact', label: 'Compact rows', icon: Rows4 },
                { value: 'default', label: 'Default rows', icon: Rows3 },
                { value: 'comfortable', label: 'Comfortable rows', icon: Rows2 },
              ] as const
            ).map(({ value: next, label, icon: Icon }) => (
              <IconButton
                key={next}
                aria-label={label}
                aria-pressed={activeDensity === next}
                emphasis={activeDensity === next ? 'secondary' : 'ghost'}
                intent={activeDensity === next ? 'function' : 'default'}
                size="sm"
                disabled={disabled}
                onClick={() => {
                  if (density === undefined) setInternalDensity(next);
                  onDensityChange?.(next);
                }}
              >
                <Icon size={componentToken('filtering.icon-md')} />
              </IconButton>
            ))}
          </ButtonGroup>
          {columns.length > 0 && (
            <Popover
              title="Visible columns"
              width={componentToken('filtering.column-settings-width')}
              trigger={
                <IconButton aria-label="Column settings" emphasis="ghost" disabled={disabled}>
                  <Columns3 size={componentToken('filtering.icon-md')} />
                </IconButton>
              }
            >
              <div className="aegis-filter-column-options">
                {columns.map((column) => (
                  <Checkbox
                    key={column.id}
                    label={column.label}
                    checked={column.visible}
                    disabled={column.hideable === false || !onColumnVisibilityChange}
                    onCheckedChange={(checked) =>
                      onColumnVisibilityChange?.(column.id, checked === true)
                    }
                  />
                ))}
              </div>
            </Popover>
          )}
        </div>
      </div>
      {(filterMode === 'bar' || !filterPanelOpen) && count > 0 && (
        <div className="aegis-filter-bar-applied" role="group" aria-label="Applied filters">
          <span className="aegis-filter-applied-count">{count} applied</span>
          {value.query.trim() && (
            <Tag
              variant="removable"
              removeLabel="Remove search filter"
              disabled={disabled}
              onRemove={() => removeFilter({ type: 'patch', patch: { query: '' } })}
            >
              Search: {value.query}
            </Tag>
          )}
          {value.severities.map((severity) => (
            <Tag
              key={`severity-${severity}`}
              variant="removable"
              removeLabel={`Remove ${severityLabels[severity]} severity filter`}
              disabled={disabled}
              onRemove={() =>
                removeFilter({ type: 'toggle-facet', facet: 'severities', value: severity })
              }
            >
              Severity: {severityLabels[severity]}
            </Tag>
          ))}
          {value.statuses.map((status) => (
            <Tag
              key={`status-${status}`}
              variant="removable"
              removeLabel={`Remove ${statusLabels[status]} status filter`}
              disabled={disabled}
              onRemove={() =>
                removeFilter({ type: 'toggle-facet', facet: 'statuses', value: status })
              }
            >
              Status: {statusLabels[status]}
            </Tag>
          ))}
          {value.sources.map((source) => (
            <Tag
              key={`source-${source}`}
              variant="removable"
              removeLabel={`Remove ${source} source filter`}
              disabled={disabled}
              onRemove={() =>
                removeFilter({ type: 'toggle-facet', facet: 'sources', value: source })
              }
            >
              Source: {source}
            </Tag>
          ))}
          {value.assignees.map((id) => (
            <Tag
              key={`assignee-${id}`}
              variant="removable"
              removeLabel={`Remove ${assigneeLabel(id)} assignee filter`}
              disabled={disabled}
              onRemove={() => removeFilter({ type: 'toggle-facet', facet: 'assignees', value: id })}
            >
              Assignee: {assigneeLabel(id)}
            </Tag>
          ))}
          {value.rules.map((rule) => (
            <Tag
              key={rule.id}
              variant="removable"
              removeLabel={`Remove ${fieldLabels[rule.field]} ${operatorLabels[rule.operator]} ${ruleDisplay(rule.field, rule.value)} filter`}
              disabled={disabled}
              onRemove={() => removeFilter({ type: 'remove-rule', id: rule.id })}
            >
              {fieldLabels[rule.field]} {operatorLabels[rule.operator]}{' '}
              {ruleDisplay(rule.field, rule.value)}
            </Tag>
          ))}
          {hasCustomTimeRange(value) && (
            <Tag
              variant="removable"
              removeLabel="Reset time range to last 24 hours"
              disabled={disabled}
              onRemove={() =>
                removeFilter({
                  type: 'patch',
                  patch: { timeRange: { mode: 'relative', preset: '24h' } },
                })
              }
            >
              {formatTimeRange(value.timeRange)}
            </Tag>
          )}
          <Button
            size="sm"
            emphasis="ghost"
            onClick={() => {
              barRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
              dispatch({ type: 'reset' });
            }}
            disabled={disabled}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
