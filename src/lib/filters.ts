import type { WorkRecord, RecordSource } from '@/sample-data/types';
import type { Severity } from '@/components/severity-badge';
import type { RecordStatus } from '@/components/status-badge';
import { resolveTimeRange, type TimeRange } from '@/lib/time-range';

export const filterSeverities: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
export const filterStatuses: readonly RecordStatus[] = [
  'new',
  'in-review',
  'in-progress',
  'completed',
  'cancelled',
];
export const filterSources: readonly RecordSource[] = [
  'Projects',
  'Billing',
  'Customers',
  'Workspace',
];
export const UNASSIGNED = 'unassigned';
export type FilterField =
  'title' | 'severity' | 'status' | 'source' | 'subject' | 'category' | 'assignee' | 'tags';
export type FilterOperator = 'is' | 'is-not' | 'contains' | 'not-contains';
export interface FilterRule {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}
export interface RecordFilterState {
  query: string;
  severities: Severity[];
  statuses: RecordStatus[];
  sources: RecordSource[];
  /** RecordOwner IDs; use UNASSIGNED for records without an owner. */
  assignees: string[];
  rules: FilterRule[];
  timeRange: TimeRange;
}
export type FilterFacet = 'severities' | 'statuses' | 'sources' | 'assignees';
export type FilterDensity = 'compact' | 'default' | 'comfortable';
export interface FilterColumn {
  id: string;
  label: string;
  visible: boolean;
  hideable?: boolean;
}

export function createDefaultFilters(): RecordFilterState {
  return {
    query: '',
    severities: [],
    statuses: [],
    sources: [],
    assignees: [],
    rules: [],
    timeRange: { mode: 'relative', preset: '24h' },
  };
}

export type RecordFilterAction =
  | { type: 'patch'; patch: Partial<RecordFilterState> }
  | { type: 'toggle-facet'; facet: 'severities'; value: Severity }
  | { type: 'toggle-facet'; facet: 'statuses'; value: RecordStatus }
  | { type: 'toggle-facet'; facet: 'sources'; value: RecordSource }
  | { type: 'toggle-facet'; facet: 'assignees'; value: string }
  | { type: 'add-rule'; rule: FilterRule }
  | { type: 'remove-rule'; id: string }
  | { type: 'reset' };

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/** Shared transitions keep the horizontal bar and panel synchronized. */
export function recordFilterReducer(
  state: RecordFilterState,
  action: RecordFilterAction,
): RecordFilterState {
  switch (action.type) {
    case 'reset':
      return createDefaultFilters();
    case 'patch':
      return { ...state, ...action.patch };
    case 'add-rule':
      return {
        ...state,
        rules: [
          ...state.rules.filter((rule) => rule.id !== action.rule.id),
          { ...action.rule, value: action.rule.value.trim() },
        ],
      };
    case 'remove-rule':
      return {
        ...state,
        rules: state.rules.filter((rule) => rule.id !== action.id),
      };
    case 'toggle-facet': {
      switch (action.facet) {
        case 'severities':
          return {
            ...state,
            severities: toggle(state.severities, action.value),
          };
        case 'statuses':
          return {
            ...state,
            statuses: toggle(state.statuses, action.value),
          };
        case 'sources':
          return { ...state, sources: toggle(state.sources, action.value) };
        case 'assignees':
          return {
            ...state,
            assignees: toggle(state.assignees, action.value),
          };
      }
    }
  }
}

function fieldValues(record: WorkRecord, field: FilterField): string[] {
  switch (field) {
    case 'title':
      return [record.title];
    case 'severity':
      return [record.severity];
    case 'status':
      return [record.status, record.status.replaceAll('-', ' ')];
    case 'source':
      return [record.source];
    case 'subject':
      return [record.subject.name, record.subject.detail, record.subject.type];
    case 'category':
      return [record.category.id, record.category.name];
    case 'assignee':
      return record.assignee ? [record.assignee.id, record.assignee.name] : [UNASSIGNED];
    case 'tags':
      return record.tags;
  }
}

function matchesRule(record: WorkRecord, rule: FilterRule): boolean {
  const expected = rule.value.trim().toLocaleLowerCase();
  const values = fieldValues(record, rule.field).map((value) => value.toLocaleLowerCase());
  const positive =
    rule.operator === 'contains' || rule.operator === 'not-contains'
      ? values.some((value) => value.includes(expected))
      : values.some((value) => value === expected);
  return rule.operator === 'is-not' || rule.operator === 'not-contains' ? !positive : positive;
}

/** Facets are OR within a group and AND across groups; rules are ANDed. Uses lastSeen. */
export function applyRecordFilters<T extends WorkRecord>(
  records: readonly T[],
  state: RecordFilterState,
  now: Date | number = Date.now(),
): T[] {
  const { from, to } = resolveTimeRange(state.timeRange, now);
  const query = state.query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    const timestamp = Date.parse(record.lastSeen);
    if (!Number.isFinite(timestamp) || timestamp < +from || timestamp > +to) return false;
    if (state.severities.length && !state.severities.includes(record.severity)) return false;
    if (state.statuses.length && !state.statuses.includes(record.status)) return false;
    if (state.sources.length && !state.sources.includes(record.source)) return false;
    if (state.assignees.length && !state.assignees.includes(record.assignee?.id ?? UNASSIGNED))
      return false;
    if (query) {
      const searchable = [
        record.id,
        record.title,
        record.workflowId,
        record.severity,
        record.status,
        record.source,
        record.subject.name,
        record.subject.detail,
        record.category.id,
        record.category.name,
        record.assignee?.name ?? UNASSIGNED,
        ...record.tags,
      ]
        .join(' ')
        .toLocaleLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return state.rules.every((rule) => matchesRule(record, rule));
  });
}

/** Disjunctive counts exclude the current facet, while respecting every other filter. */
export function getRecordFacetCounts(
  records: readonly WorkRecord[],
  state: RecordFilterState,
  facet: FilterFacet,
  now: Date | number = Date.now(),
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of applyRecordFilters(records, { ...state, [facet]: [] }, now)) {
    const key =
      facet === 'severities'
        ? record.severity
        : facet === 'statuses'
          ? record.status
          : facet === 'sources'
            ? record.source
            : (record.assignee?.id ?? UNASSIGNED);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function hasCustomTimeRange(state: RecordFilterState): boolean {
  return state.timeRange.mode !== 'relative' || state.timeRange.preset !== '24h';
}
export function getAppliedFilterCount(state: RecordFilterState): number {
  return (
    Number(Boolean(state.query.trim())) +
    state.severities.length +
    state.statuses.length +
    state.sources.length +
    state.assignees.length +
    state.rules.length +
    Number(hasCustomTimeRange(state))
  );
}

export interface RecordHistogramBin {
  from: number;
  to: number;
  count: number;
}
export function getRecordHistogram(
  records: readonly WorkRecord[],
  state: RecordFilterState,
  now: Date | number = Date.now(),
  binCount = 24,
): RecordHistogramBin[] {
  const { from, to } = resolveTimeRange(state.timeRange, now);
  const count = Math.max(1, Math.floor(binCount));
  const duration = Math.max(1, +to - +from);
  const bins = Array.from({ length: count }, (_, index) => ({
    from: +from + (duration * index) / count,
    to: +from + (duration * (index + 1)) / count,
    count: 0,
  }));
  for (const record of applyRecordFilters(records, state, now)) {
    const index = Math.min(
      count - 1,
      Math.floor(((Date.parse(record.lastSeen) - +from) / duration) * count),
    );
    bins[index].count += 1;
  }
  return bins;
}
