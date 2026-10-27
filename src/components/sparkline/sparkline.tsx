import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, type ComponentProps } from 'react';
import { Skeleton } from '@/components/skeleton';
import { cn } from '@/lib/utils';
import './sparkline.css';

export interface SparklineProps extends Omit<
  ComponentProps<'svg'>,
  'children' | 'width' | 'height'
> {
  data: readonly number[];
  variant?: 'line' | 'area' | 'bar';
  intent?: 'function' | 'ai' | 'success' | 'warning' | 'destroy';
  width?: number;
  height?: number;
  label?: string;
  loading?: boolean;
}
const sparklineColors: Record<NonNullable<SparklineProps['intent']>, string> = {
  function: 'var(--group-data-viz-chart-color-chart-function)',
  ai: 'var(--group-data-viz-chart-color-chart-ai)',
  success: 'var(--group-data-viz-chart-color-chart-success)',
  warning: 'var(--group-data-viz-chart-color-chart-warning)',
  destroy: 'var(--group-data-viz-chart-color-chart-destroy)',
};
/** Lightweight SVG series for dense tables and metrics. It never animates or captures focus. */
export function Sparkline({
  data,
  variant = 'line',
  intent = 'function',
  width: requestedWidth,
  height: requestedHeight,
  label,
  loading = false,
  className,
  style,
  ...props
}: SparklineProps) {
  const tokens = useComponentTokenNumbers([
    'sparkline-width',
    'sparkline-height',
    'sparkline-min-width',
    'sparkline-min-height',
    'sparkline-inset',
    'sparkline-baseline-inset',
    'sparkline-bar-gap',
    'sparkline-bar-min-width',
  ]);
  const width = requestedWidth ?? tokens['sparkline-width'];
  const height = requestedHeight ?? tokens['sparkline-height'];
  const inset = tokens['sparkline-inset'];
  const baseline = tokens['sparkline-baseline-inset'];
  const barGap = tokens['sparkline-bar-gap'];
  const id = useId().replaceAll(':', '');
  const values = data.map((value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const w = Number.isFinite(width)
      ? Math.max(tokens['sparkline-min-width'], width)
      : tokens['sparkline-width'],
    h = Number.isFinite(height)
      ? Math.max(tokens['sparkline-min-height'], height)
      : tokens['sparkline-height'];
  const peak = Math.max(1, ...values),
    low = Math.min(...values),
    spread = peak - low;
  const points = values.map((value, index) => [
    values.length === 1 ? w / 2 : inset + (index / (values.length - 1)) * (w - inset * 2),
    spread === 0 ? h / 2 : h - inset - ((value - low) / spread) * (h - inset * 2),
  ]);
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L${points.at(-1)?.[0] ?? 0},${h - baseline} L${points[0]?.[0] ?? 0},${h - baseline} Z`;
  const paint = intent === 'ai' ? `url(#${id}-sparkline-ai)` : 'currentColor';
  if (loading)
    return (
      <span role="status" aria-label={`Loading ${label ?? 'activity trend'}`}>
        <Skeleton variant="block" width={w} height={h} />
      </span>
    );
  if (!values.length)
    return (
      <span
        className="aegis-sparkline-empty"
        style={{ width: w, height: h }}
        role="img"
        aria-label={label ?? 'No activity data'}
      >
        —
      </span>
    );
  return (
    <svg
      {...props}
      role="img"
      aria-label={
        label ??
        `Activity across ${values.length} time buckets: latest ${values.at(-1)} events, peak ${Math.max(...values)}`
      }
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn('aegis-sparkline', className)}
      style={{ color: sparklineColors[intent], ...style }}
    >
      {intent === 'ai' && (
        <defs>
          <linearGradient id={`${id}-sparkline-ai`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--group-data-viz-chart-color-ai-bg)" />
            <stop offset="50%" stopColor="var(--group-data-viz-chart-color-ai-pink-bg)" />
            <stop
              offset="100%"
              stopColor="var(--group-data-viz-chart-color-ai-purple-bg, var(--group-data-viz-chart-color-ai-blue-bg))"
            />
          </linearGradient>
        </defs>
      )}
      {variant === 'bar' ? (
        values.map((value, index) => (
          <rect
            key={index}
            x={(index * w) / values.length + barGap / 2}
            y={h - (value / peak) * (h - inset)}
            width={Math.max(tokens['sparkline-bar-min-width'], w / values.length - barGap)}
            height={(value / peak) * (h - inset)}
            rx={componentToken('sparkline-bar-radius')}
            fill={paint}
          />
        ))
      ) : (
        <>
          {variant === 'area' && (
            <path d={area} fill={paint} opacity={componentToken('sparkline-area-opacity')} />
          )}
          {values.length === 1 ? (
            <circle cx={w / 2} cy={h / 2} r={componentToken('sparkline-dot-radius')} fill={paint} />
          ) : (
            <path
              d={line}
              fill="none"
              stroke={paint}
              strokeWidth={componentToken('sparkline-stroke')}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </>
      )}
    </svg>
  );
}
