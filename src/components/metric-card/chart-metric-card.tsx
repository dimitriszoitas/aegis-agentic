import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from '@/components/icon';
import { Card, type CardProps } from '@/components/card';
import {
  AreaChart,
  BarChart,
  ChartDataTable,
  chartColor,
  type ChartColor,
} from '@/components/charts';
import { MiniBarChart } from '@/components/mini-bar-chart';
import { cn } from '@/lib/utils';
import './chart-metric-card.css';

export interface ChartMetricDatum {
  label: string;
  value: number;
  /** Optional category color for the full bar variant. Area and compact variants use the series color. */
  color?: ChartColor;
}
export type ChartMetricCardVariant = 'bar' | 'area' | 'compact';
export interface ChartMetricCardProps extends Omit<CardProps, 'children' | 'title'> {
  label: string;
  /** Summary metric, which may be a total, rate, or other caller-defined aggregation. */
  metric: number | string;
  /** Ordered oldest to newest. Compact bars require non-negative values. */
  data: readonly ChartMetricDatum[];
  /** Percentage change; its desirability is independent of its direction. */
  delta?: number;
  period?: string;
  variant?: ChartMetricCardVariant;
  /** Shared semantic color for the series. Individual full-size bars may override it through data.color. */
  color?: ChartColor;
  /** Omit for a neutral change. Set explicitly when the change is favorable or unfavorable. */
  trendIsPositive?: boolean;
  /** Formats numeric summary, latest value, chart ticks, and tooltips. The data table stays exact. */
  valueFormatter?: (value: number) => string;
  /** Plot height in pixels; defaults to 220, or 80 for compact bars. */
  height?: number;
}
const compactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/** One metric, its explicit comparison, and the underlying time series. */
export function ChartMetricCard({
  label,
  metric,
  data,
  delta,
  period,
  variant = 'bar',
  color = 'chart-2',
  trendIsPositive,
  valueFormatter = compactNumber,
  height,
  className,
  ...props
}: ChartMetricCardProps) {
  const tokens = useComponentTokenNumbers([
    'data-viz.metric-chart-height',
    'data-viz.metric-chart-compact-height',
    'data-viz.metric-chart-min-height',
    'data-viz.metric-chart-initial-width',
  ]);
  const headingId = useId();
  const change = delta !== undefined && Number.isFinite(delta) ? delta : undefined;
  const trend =
    change === undefined || change === 0 || trendIsPositive === undefined
      ? 'neutral'
      : trendIsPositive
        ? 'success'
        : 'destroy';
  const Arrow = change === 0 ? Minus : (change ?? 0) < 0 ? ArrowDownRight : ArrowUpRight;
  const plotHeight =
    height !== undefined && Number.isFinite(height)
      ? Math.max(tokens['data-viz.metric-chart-min-height'], height)
      : variant === 'compact'
        ? tokens['data-viz.metric-chart-compact-height']
        : tokens['data-viz.metric-chart-height'];
  const invalid = data.some(
    ({ value }) => !Number.isFinite(value) || (variant === 'compact' && value < 0),
  );
  const latest = invalid ? undefined : data.at(-1);
  const series = [{ key: 'value', label, color }];
  const Chart = variant === 'area' ? AreaChart : BarChart;
  const chartTitle = `${label} by interval`;
  const displayMetric = typeof metric === 'number' ? valueFormatter(metric) : metric;

  return (
    <Card
      {...props}
      className={cn('aegis-chart-metric-card', className)}
      data-variant={variant}
      aria-labelledby={props['aria-label'] ? undefined : (props['aria-labelledby'] ?? headingId)}
    >
      <header className="aegis-chart-metric-header">
        <h3 id={headingId}>{label}</h3>
        <div className="aegis-chart-metric-summary">
          <span
            className="aegis-chart-metric-value"
            title={typeof metric === 'number' ? metric.toLocaleString('en-GB') : undefined}
          >
            {displayMetric}
          </span>
          {(change !== undefined || period) && (
            <div className="aegis-chart-metric-comparison">
              {change !== undefined && (
                <span className="aegis-chart-metric-delta" data-trend={trend}>
                  <Arrow size={componentToken('data-viz.icon-inline')} aria-hidden="true" />
                  <span>
                    {change > 0 ? '+' : ''}
                    {change.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%
                  </span>
                  {trend !== 'neutral' && (
                    <span className="sr-only">
                      , {trend === 'success' ? 'favorable' : 'unfavorable'} change
                    </span>
                  )}
                </span>
              )}
              {period && <span>{period}</span>}
            </div>
          )}
        </div>
      </header>
      {latest && (
        <div className="aegis-chart-metric-latest">
          <span>
            <span className="sr-only">Latest interval: </span>
            {latest.label}
          </span>
          <strong>{valueFormatter(latest.value)}</strong>
        </div>
      )}
      {invalid ? (
        <p className="aegis-chart-metric-empty">
          Chart data is unavailable. Supply finite{variant === 'compact' ? ', non-negative' : ''}{' '}
          values.
        </p>
      ) : variant === 'compact' ? (
        <>
          {data.length ? (
            <div className="aegis-chart-metric-mini">
              <MiniBarChart
                data={data.map(({ value }) => value)}
                width={tokens['data-viz.metric-chart-initial-width']}
                height={plotHeight}
                preserveAspectRatio="none"
                style={{ color: chartColor(color), height: plotHeight }}
                label={`${chartTitle}: ${data.length} intervals, latest ${latest?.label}, ${latest?.value.toLocaleString('en-GB')}. Exact values are available in the chart data table.`}
              />
              <div className="aegis-chart-metric-range" aria-hidden="true">
                <span>{data[0].label}</span>
                <span>{latest?.label}</span>
              </div>
            </div>
          ) : (
            <p className="aegis-chart-metric-empty">No data for this period.</p>
          )}
          {data.length > 0 && (
            <ChartDataTable data={data} series={series} xKey="label" title={chartTitle} />
          )}
        </>
      ) : (
        <Chart
          className="aegis-chart-metric-plot"
          title={chartTitle}
          data={data}
          series={series}
          {...(variant === 'bar' && data.some((datum) => datum.color) ? { colorKey: 'color' } : {})}
          height={plotHeight}
          valueFormatter={valueFormatter}
          showLegend={false}
          showDataTable
          compact
        />
      )}
    </Card>
  );
}
