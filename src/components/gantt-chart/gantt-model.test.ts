import { describe, it, expect } from 'vitest';
import { calendarDay, ganttModel, DAY } from './gantt-model';
describe('calendar schedule', () => {
  it('rejects rolled-over and incomplete dates', () => {
    expect(calendarDay('2026-02-30')).toBeNull();
    expect(calendarDay('2026-1-3')).toBeNull();
    expect(calendarDay('2024-02-29')).not.toBeNull();
  });
  it('keeps inclusive dates independent of daylight saving transitions', () => {
    const model = ganttModel(
      [{ id: 'a', label: 'Launch', start: '2026-10-24', end: '2026-10-26' }],
      'day',
    );
    expect(model.days).toBe(3);
    expect(model.rows[0].endTime - model.rows[0].startTime).toBe(2 * DAY);
  });
  it('rejects reversed or duplicate tasks and clamps progress', () => {
    const model = ganttModel(
      [
        { id: 'a', label: 'Valid', start: '2026-10-01', end: '2026-10-02', progress: 200 },
        { id: 'a', label: 'Duplicate', start: '2026-10-03', end: '2026-10-04' },
        { id: 'b', label: 'Invalid', start: '2026-10-05', end: '2026-10-01' },
      ],
      'week',
    );
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0].progress).toBe(100);
    expect(model.invalid).toEqual(['Duplicate', 'Invalid']);
    expect(new Date(model.start).getUTCDay()).toBe(1);
  });
  it('bounds very long schedules instead of generating an unbounded grid', () => {
    expect(
      ganttModel([{ id: 'a', label: 'Long', start: '2000-01-01', end: '2026-10-01' }], 'day')
        .tooLong,
    ).toBe(true);
  });
});
