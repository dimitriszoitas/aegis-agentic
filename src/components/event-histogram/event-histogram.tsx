import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import {
  BarChart,
  type BarChartProps,
  type ChartBrushRange,
  type ChartSeries,
} from '@/components/charts';
import { formatTimeRange, resolveTimeRange, type TimeRange } from '@/lib/time-range';
import type { SeverityBucket } from '@/sample-data/types';

export const severityChartSeries: readonly ChartSeries[] = [
  { key: 'info', label: 'Info', color: 'info' },
  { key: 'low', label: 'Low', color: 'low' },
  { key: 'medium', label: 'Medium', color: 'medium' },
  { key: 'high', label: 'High', color: 'high' },
  { key: 'critical', label: 'Critical', color: 'critical' },
];
export interface EventHistogramProps extends Omit<
  BarChartProps,
  'data' | 'series' | 'stacked' | 'xKey' | 'brushRange' | 'onBrushChange' | 'title'
> {
  data: readonly SeverityBucket[];
  title?: string;
  value?: TimeRange;
  onValueChange?: (range: TimeRange) => void;
  now?: Date | number;
}
/** Severity stacks and optional brush share the same absolute range contract as TimeRangePicker. */
export function EventHistogram({
  data,
  title = 'Events over time',
  value,
  onValueChange,
  now,
  brush = false,
  height: requestedHeight,
  description,
  ...props
}: EventHistogramProps) {
  const tokens = useComponentTokenNumbers(['histogram-height']);
  const height = requestedHeight ?? tokens['histogram-height'];
  const bucketDuration =
    data.length > 1
      ? Math.max(1, Date.parse(data[1].time) - Date.parse(data[0].time))
      : 30 * 60_000;
  const endOfData = data.length
    ? Date.parse(data[data.length - 1].time) + bucketDuration
    : Date.now();
  const range = value ? resolveTimeRange(value, now ?? endOfData) : undefined;
  const inside = range
    ? data
        .map((bucket, index) => ({ index, start: Date.parse(bucket.time) }))
        .filter((bucket) => bucket.start < +range.to && bucket.start + bucketDuration > +range.from)
        .map((bucket) => bucket.index)
    : [];
  const brushRange =
    range && inside.length
      ? { startIndex: inside[0], endIndex: inside[inside.length - 1] }
      : undefined;
  const visibleData = brush
    ? inside.length || !range
      ? data
      : []
    : range
      ? data.filter(
          (bucket) =>
            Date.parse(bucket.time) < +range.to &&
            Date.parse(bucket.time) + bucketDuration > +range.from,
        )
      : data;
  function updateBrush({ startIndex, endIndex }: ChartBrushRange) {
    const from = data[startIndex]?.time;
    const to = data[endIndex]
      ? new Date(Date.parse(data[endIndex].time) + bucketDuration).toISOString()
      : undefined;
    if (from && to) onValueChange?.({ mode: 'absolute', from, to });
  }
  return (
    <BarChart
      {...props}
      title={title}
      description={
        description ??
        (value ? formatTimeRange(value) : 'Events by severity · 30-minute buckets · UTC')
      }
      data={visibleData}
      series={severityChartSeries}
      xKey="label"
      stacked
      height={height}
      brush={brush}
      brushRange={brushRange}
      onBrushChange={onValueChange ? updateBrush : undefined}
    />
  );
}
