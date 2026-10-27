import { componentToken } from '@/lib/component-design-tokens';
import { ArrowDownRight, ArrowUpRight, Minus } from '@/components/icon';
import { Card, type CardProps } from '@/components/card';
import { Skeleton } from '@/components/skeleton';
import { Sparkline, type SparklineProps } from '@/components/sparkline';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { cn } from '@/lib/utils';
import './metric-card.css';

export interface MetricCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  /** Set explicitly when a decrease is desirable, such as mean time to resolution. */
  trendIsPositive?: boolean;
  sparkline?: readonly number[];
  sparklineLabel?: string;
  sparklineVariant?: SparklineProps['variant'];
  /** Gives the metric a semantic accent, independently of whether its delta is favorable. */
  intent?: SparklineProps['intent'];
  loading?: boolean;
  format?: Intl.NumberFormatOptions;
}
export function MetricCard({
  label,
  value,
  unit,
  delta,
  deltaLabel = 'vs previous 24h',
  trendIsPositive,
  sparkline,
  sparklineLabel,
  sparklineVariant = 'line',
  intent,
  loading = false,
  format,
  className,
  ...props
}: MetricCardProps) {
  const change = delta === undefined || !Number.isFinite(delta) ? undefined : delta;
  const positive = trendIsPositive ?? (change !== undefined && change > 0);
  const trend = change === undefined || change === 0 ? 'neutral' : positive ? 'success' : 'destroy';
  const Arrow = change === 0 ? Minus : (change ?? 0) < 0 ? ArrowDownRight : ArrowUpRight;
  const TrendChart = sparklineVariant === 'bar' ? MiniBarChart : Sparkline;
  return (
    <Card
      {...props}
      className={cn('aegis-metric-card', className)}
      data-intent={intent}
      aria-label={label}
      aria-busy={loading || undefined}
    >
      <div className="aegis-metric-label">{label}</div>
      {loading ? (
        <div
          className="aegis-metric-loading"
          role="status"
          aria-label={`Loading ${label.toLowerCase()}`}
        >
          <Skeleton
            width={componentToken('metric-skeleton-width')}
            height={componentToken('metric-skeleton-height')}
          />
          <Skeleton width={componentToken('metric-skeleton-description-width')} />
        </div>
      ) : (
        <>
          <div className="aegis-metric-main">
            <div className="aegis-metric-value">
              {typeof value === 'number'
                ? new Intl.NumberFormat('en-GB', format).format(value)
                : value}
              {unit && <span>{unit}</span>}
            </div>
            {sparkline && (
              <TrendChart
                data={sparkline}
                variant={sparklineVariant}

                intent={intent ?? (trend === 'neutral' ? 'function' : trend)}
                label={sparklineLabel ?? `${label} over the last 24 hours`}
              />
            )}
          </div>
          {change !== undefined && (
            <div className="aegis-metric-comparison">
              <span className="aegis-metric-delta" data-trend={trend}>
                <Arrow size={componentToken('data-display.icon-sm')} aria-hidden="true" />
                <span>
                  {change > 0 ? '+' : ''}
                  {change.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%
                </span>
                <span className="sr-only">
                  {change === 0
                    ? ', unchanged'
                    : positive
                      ? ', favorable change'
                      : ', unfavorable change'}
                </span>
              </span>
              <span>{deltaLabel}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
