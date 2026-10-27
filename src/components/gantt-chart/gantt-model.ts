export interface GanttTask {
  id: string;
  label: string;
  /** ISO calendar date, YYYY-MM-DD. Dates are inclusive and interpreted in UTC. */
  start: string;
  end: string;
  progress?: number;
  milestone?: boolean;
  owner?: string;
  dependencies?: readonly string[];
  intent?: 'function' | 'success' | 'warning' | 'ai';
}
export type GanttScale = 'day' | 'week' | 'month';
export const DAY = 86_400_000;
export function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(date) && new Date(date).toISOString().slice(0, 10) === value ? date : null;
}
export function ganttModel(tasks: readonly GanttTask[], scale: GanttScale) {
  const ids = new Set<string>();
  const invalid: string[] = [];
  const rows = tasks.flatMap((task) => {
    const start = calendarDay(task.start),
      end = calendarDay(task.end);
    if (!task.id || ids.has(task.id) || start === null || end === null || end < start) {
      invalid.push(task.label);
      return [];
    }
    ids.add(task.id);
    return [
      {
        ...task,
        startTime: start,
        endTime: task.milestone ? start : end,
        progress: Number.isFinite(task.progress) ? Math.max(0, Math.min(100, task.progress!)) : 0,
      },
    ];
  });
  if (!rows.length)
    return { rows, invalid, columns: [], start: 0, end: 0, days: 0, tooLong: false };
  let start = Math.min(...rows.map((row) => row.startTime));
  let end = Math.max(...rows.map((row) => row.endTime)) + DAY;
  const first = new Date(start),
    last = new Date(end - DAY);
  if (scale === 'week') {
    start -= ((first.getUTCDay() + 6) % 7) * DAY;
    end += (7 - ((last.getUTCDay() + 6) % 7) - 1) * DAY;
  }
  if (scale === 'month') {
    first.setUTCDate(1);
    start = first.getTime();
    last.setUTCMonth(last.getUTCMonth() + 1, 1);
    end = last.getTime();
  }
  const days = (end - start) / DAY;
  if (days > 366 * 5) return { rows, invalid, columns: [], start, end, days, tooLong: true };
  const columns: { start: number; end: number; label: string }[] = [];
  for (let cursor = start; cursor < end;) {
    const date = new Date(cursor);
    const next =
      scale === 'month'
        ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
        : cursor + (scale === 'week' ? 7 : 1) * DAY;
    columns.push({
      start: cursor,
      end: Math.min(next, end),
      label: date.toLocaleDateString('en-US', {
        month: 'short',
        ...(scale === 'month' ? { year: 'numeric' } : { day: 'numeric' }),
        timeZone: 'UTC',
      }),
    });
    cursor = next;
  }
  return { rows, invalid, columns, start, end, days, tooLong: false };
}
