export const timePresets = [
  { value: '15m', label: 'Last 15 minutes', short: 'Last 15m', duration: 15 * 60_000 },
  { value: '1h', label: 'Last hour', short: 'Last 1h', duration: 60 * 60_000 },
  { value: '24h', label: 'Last 24 hours', short: 'Last 24h', duration: 24 * 60 * 60_000 },
  { value: '7d', label: 'Last 7 days', short: 'Last 7d', duration: 7 * 24 * 60 * 60_000 },
  { value: '30d', label: 'Last 30 days', short: 'Last 30d', duration: 30 * 24 * 60 * 60_000 },
] as const;
export type TimePreset = (typeof timePresets)[number]['value'];
export type TimeRange =
  { mode: 'relative'; preset: TimePreset } | { mode: 'absolute'; from: string; to: string };
export function parseTimePreset(value: string): TimePreset {
  const normalized = value
    .toLowerCase()
    .replace(/^last\s*/, '')
    .trim();
  const preset = timePresets.find((p) => p.value === normalized);
  if (!preset) throw new RangeError(`Unsupported time preset: ${value}`);
  return preset.value;
}
export function resolveTimeRange(
  range: TimeRange,
  now: Date | number = Date.now(),
): { from: Date; to: Date } {
  if (range.mode === 'relative') {
    const to = new Date(now);
    const preset = timePresets.find((p) => p.value === range.preset);
    if (!preset || Number.isNaN(+to)) throw new RangeError('Invalid relative time range');
    return { from: new Date(+to - preset.duration), to };
  }
  const from = new Date(range.from),
    to = new Date(range.to);
  if (!Number.isFinite(+from) || !Number.isFinite(+to) || +from > +to)
    throw new RangeError('The start of the range must be before its end');
  return { from, to };
}
export function formatTimeRange(range: TimeRange): string {
  if (range.mode === 'relative')
    return timePresets.find((p) => p.value === range.preset)?.short ?? 'Last 24h';
  const { from, to } = resolveTimeRange(range);
  const format = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(d);
  return `${format(from)} – ${format(to)} UTC`;
}
