import { describe, expect, it } from 'vitest';
import { records, generateRecords, workflows, owners, type WorkRecord } from '@/sample-data';
import {
  recordFilterReducer,
  applyRecordFilters,
  createDefaultFilters,
  getRecordFacetCounts,
  getRecordHistogram,
  getAppliedFilterCount,
} from './filters';

const now = Date.parse('2026-10-06T12:00:00.000Z');
const makeRecord = (id: string, overrides: Partial<WorkRecord> = {}): WorkRecord => ({
  ...records[0],
  id,
  title: 'Project delivery review',
  severity: 'high',
  status: 'new',
  source: 'Projects',
  lastSeen: '2026-10-06T11:00:00.000Z',
  assignee: undefined,
  tags: ['delivery', 'production'],
  ...overrides,
});

describe('shared record filters', () => {
  it('combines OR facets, AND groups, case-insensitive search and positive/negative rules', () => {
    const rows = [
      makeRecord('critical', { severity: 'critical' }),
      makeRecord('high'),
      makeRecord('medium', { severity: 'medium' }),
      makeRecord('other-source', { source: 'Customers' }),
      makeRecord('suppressed', { tags: ['delivery', 'suppressed'] }),
    ];
    const state = {
      ...createDefaultFilters(),
      severities: ['critical', 'high'] as WorkRecord['severity'][],
      sources: ['Projects'] as WorkRecord['source'][],
      query: 'pRoJeCt',
      rules: [
        { id: 'exclude', field: 'tags' as const, operator: 'is-not' as const, value: 'suppressed' },
        { id: 'include', field: 'tags' as const, operator: 'contains' as const, value: 'DELIV' },
      ],
    };
    expect(applyRecordFilters(rows, state, now).map((row) => row.id)).toEqual(['critical', 'high']);
    expect(applyRecordFilters(rows, { ...state, assignees: ['unassigned'] }, now)).toHaveLength(2);
    expect(
      applyRecordFilters(
        rows,
        {
          ...state,
          rules: [
            { id: 'exclude-all', field: 'title', operator: 'not-contains', value: 'project' },
          ],
        },
        now,
      ),
    ).toEqual([]);
  });

  it('uses inclusive last-seen boundaries and preserves every match in histogram bins', () => {
    const rows = [
      makeRecord('start', { lastSeen: '2026-10-05T12:00:00.000Z' }),
      makeRecord('middle'),
      makeRecord('end', { lastSeen: '2026-10-06T12:00:00.000Z' }),
      makeRecord('old', { lastSeen: '2026-10-05T11:59:59.999Z' }),
      makeRecord('future', { lastSeen: '2026-10-06T12:00:00.001Z' }),
      makeRecord('invalid', { lastSeen: 'invalid' }),
    ];
    const state = createDefaultFilters();
    expect(applyRecordFilters(rows, state, now).map((row) => row.id)).toEqual([
      'start',
      'middle',
      'end',
    ]);
    const bins = getRecordHistogram(rows, state, now, 24);
    expect(bins).toHaveLength(24);
    expect(bins[0].count).toBe(1);
    expect(bins[23].count).toBe(2);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
    expect(
      applyRecordFilters(
        rows,
        {
          ...state,
          timeRange: {
            mode: 'absolute',
            from: '2026-10-06T11:00:00.000Z',
            to: '2026-10-06T11:00:00.000Z',
          },
        },
        now,
      ).map((row) => row.id),
    ).toEqual(['middle']);
  });

  it('keeps panel toggles, bar chips, rules and clear-all synchronized without mutating prior state', () => {
    const initial = createDefaultFilters();
    let state = recordFilterReducer(initial, {
      type: 'patch',
      patch: { severities: ['critical'], sources: ['Projects'] },
    });
    const priorSeverities = state.severities;
    state = recordFilterReducer(state, {
      type: 'toggle-facet',
      facet: 'severities',
      value: 'high',
    });
    expect(state.severities).toEqual(['critical', 'high']);
    expect(priorSeverities).toEqual(['critical']);
    // Removing a chip uses the identical transition as unchecking its panel facet.
    state = recordFilterReducer(state, {
      type: 'toggle-facet',
      facet: 'severities',
      value: 'critical',
    });
    expect(state.severities).toEqual(['high']);
    state = recordFilterReducer(state, {
      type: 'add-rule',
      rule: { id: 'rule', field: 'subject', operator: 'contains', value: ' workspace ' },
    });
    expect(state.rules[0].value).toBe('workspace');
    expect(getAppliedFilterCount(state)).toBe(3);
    state = recordFilterReducer(state, { type: 'remove-rule', id: 'rule' });
    state = recordFilterReducer(state, {
      type: 'patch',
      patch: { query: 'delivery', timeRange: { mode: 'relative', preset: '7d' } },
    });
    expect(getAppliedFilterCount(state)).toBe(4);
    expect(recordFilterReducer(state, { type: 'reset' })).toEqual(createDefaultFilters());
    expect(initial).toEqual(createDefaultFilters());
  });

  it('counts alternate values within one facet while honoring the remaining groups and unassigned ownership', () => {
    const rows = [
      makeRecord('critical', { severity: 'critical' }),
      makeRecord('high'),
      makeRecord('low', { severity: 'low' }),
      makeRecord('billing', { severity: 'critical', source: 'Billing' }),
    ];
    const state = {
      ...createDefaultFilters(),
      severities: ['critical'] as WorkRecord['severity'][],
      sources: ['Projects'] as WorkRecord['source'][],
    };
    expect(getRecordFacetCounts(rows, state, 'severities', now)).toEqual({
      critical: 1,
      high: 1,
      low: 1,
    });
    expect(getRecordFacetCounts(rows, state, 'sources', now)).toEqual({ Projects: 1, Billing: 1 });
    expect(getRecordFacetCounts(rows, state, 'assignees', now)).toEqual({ unassigned: 1 });
    expect(applyRecordFilters(rows, state, now).map((row) => row.id)).toEqual(['critical']);
  });
});

describe('generic work fixtures', () => {
  it('creates deterministic, independent records with valid workflow and history links', () => {
    const first = generateRecords(24, 42);
    const second = generateRecords(24, 42);
    expect(first).toEqual(second);
    expect(new Set(first.map((record) => record.id)).size).toBe(24);
    for (const record of first) {
      expect(workflows.some((workflow) => workflow.id === record.workflowId)).toBe(true);
      expect(record.eventCount).toBe(record.events.length);
      expect(Date.parse(record.firstSeen)).toBeLessThanOrEqual(Date.parse(record.lastSeen));
      expect(['user', 'project', 'account']).toContain(record.subject.type);
      expect(['new', 'in-review', 'in-progress', 'completed', 'cancelled']).toContain(
        record.status,
      );
      if (record.assignee)
        expect(owners.some((owner) => owner.id === record.assignee?.id)).toBe(true);
    }
    first[0].events[0].payload.action = 'changed';
    first[0].tags.push('local');
    expect(second[0].tags).not.toContain('local');
    expect(second[0].events[0].payload.action).not.toBe('changed');
  });
  it('filters generic category, subject, workflow and lifecycle data', () => {
    const sample = { ...records[0], status: 'in-review' as const };
    const filters = {
      ...createDefaultFilters(),
      statuses: ['in-review'] as WorkRecord['status'][],
      rules: [
        {
          id: 'category',
          field: 'category' as const,
          operator: 'is' as const,
          value: sample.category.id,
        },
        {
          id: 'subject',
          field: 'subject' as const,
          operator: 'contains' as const,
          value: sample.subject.name,
        },
      ],
    };
    expect(applyRecordFilters([sample], filters, Date.parse(sample.lastSeen))).toEqual([sample]);
    expect(
      applyRecordFilters(
        [sample],
        { ...filters, query: sample.workflowId },
        Date.parse(sample.lastSeen),
      ),
    ).toEqual([sample]);
  });
});
