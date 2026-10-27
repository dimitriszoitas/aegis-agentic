import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Line,
  Area,
  Bar,
  Pie,
  Cell,
  Rectangle,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  type BarShapeProps,
} from 'recharts';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import type { Severity } from '@/components/severity-badge';
import { cn } from '@/lib/utils';
import './charts.css';

// Coalesce measurements during the sidebar's 120ms width transition.

export type ChartColor =
  | 'function'
  | 'ai'
  | 'success'
  | 'warning'
  | 'destroy'
  | Severity
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-6';
export interface ChartSeries {
  key: string;
  label: string;
  color?: ChartColor;
}
export const chartPalette: readonly ChartColor[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
];
const chartColorTokens: Record<ChartColor, string> = {
  function: 'var(--group-data-viz-chart-color-chart-function)',
  ai: 'var(--group-data-viz-chart-color-chart-ai)',
  success: 'var(--group-data-viz-chart-color-chart-success)',
  warning: 'var(--group-data-viz-chart-color-chart-warning)',
  destroy: 'var(--group-data-viz-chart-color-chart-destroy)',
  critical: 'var(--group-data-viz-chart-color-chart-severity-critical)',
  high: 'var(--group-data-viz-chart-color-chart-severity-high)',
  medium: 'var(--group-data-viz-chart-color-chart-severity-medium)',
  low: 'var(--group-data-viz-chart-color-chart-severity-low)',
  info: 'var(--group-data-viz-chart-color-chart-severity-info)',
  'chart-1': 'var(--group-data-viz-chart-color-chart-1)',
  'chart-2': 'var(--group-data-viz-chart-color-chart-2)',
  'chart-3': 'var(--group-data-viz-chart-color-chart-3)',
  'chart-4': 'var(--group-data-viz-chart-color-chart-4)',
  'chart-5': 'var(--group-data-viz-chart-color-chart-5)',
  'chart-6': 'var(--group-data-viz-chart-color-chart-6)',
};
export function chartColor(color: ChartColor = 'chart-1'): string {
  return chartColorTokens[color];
}
const chartColors = new Set<string>([
  ...chartPalette,
  'function',
  'ai',
  'success',
  'warning',
  'destroy',
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);
function datumColor(datum: unknown, colorKey?: string): ChartColor | undefined {
  if (!colorKey || !datum || typeof datum !== 'object') return undefined;
  const value = (datum as Record<string, unknown>)[colorKey];
  return typeof value === 'string' && chartColors.has(value) ? (value as ChartColor) : undefined;
}
export interface ChartContainerProps extends Omit<ComponentProps<'figure'>, 'title'> {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  height?: number;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  error?: string;
  onRetry?: () => void;
  legend?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}
export function ChartContainer({
  title,
  description,
  action,
  height: requestedHeight,
  loading = false,
  empty = false,
  emptyTitle = 'No events in this time range',
  error,
  onRetry,
  legend,
  footer,
  compact = false,
  className,
  children,
  ...props
}: ChartContainerProps) {
  const tokens = useComponentTokenNumbers(['chart-height']);
  const height = requestedHeight ?? tokens['chart-height'];
  const titleId = useId();
  return (
    <figure
      {...props}
      className={cn('aegis-chart-container', className)}
      data-compact={compact}
      aria-labelledby={titleId}
    >
      <figcaption className="aegis-chart-header">
        <div>
          <h3 id={titleId}>{title}</h3>
          {description && <div className="aegis-chart-description">{description}</div>}
        </div>
        {action && <div className="aegis-chart-action">{action}</div>}
      </figcaption>
      <div className="aegis-chart-plot" style={{ height }} aria-busy={loading || undefined}>
        {loading ? (
          <div
            className="aegis-chart-loading"
            role="status"
            aria-label={`Loading ${title.toLowerCase()}`}
          >
            <Skeleton variant="block" height="100%" />
          </div>
        ) : error ? (
          <EmptyState
            preset="error"
            compact
            title="Chart unavailable"
            description={error}
            action={
              onRetry && (
                <Button size="sm" onClick={onRetry}>
                  Retry loading
                </Button>
              )
            }
          />
        ) : empty ? (
          <EmptyState
            compact
            title={emptyTitle}
            description="Choose a wider time range or adjust the active filters to see event activity."
          />
        ) : (
          children
        )}
      </div>
      {!loading && !error && !empty && legend && (
        <div className="aegis-chart-legend-wrap">{legend}</div>
      )}
      {footer && <div className="aegis-chart-footer">{footer}</div>}
    </figure>
  );
}

export interface ChartTooltipEntry {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
  dataKey?: unknown;
  payload?: unknown;
}
export interface ChartTooltipProps {
  active?: boolean;
  label?: ReactNode;
  payload?: readonly ChartTooltipEntry[];
  valueFormat?: (value: number) => string;
  /** Optional semantic color field in the underlying datum, used by categorical bars. */
  colorKey?: string;
}
export function ChartTooltip({
  active,
  label,
  payload,
  valueFormat = (value) => value.toLocaleString('en-GB'),
  colorKey,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="aegis-chart-tooltip">
      {label !== undefined && <div className="aegis-chart-tooltip-label">{label}</div>}
      {payload.map((entry, index) => (
        <div className="aegis-chart-tooltip-row" key={`${entry.name}-${index}`}>
          <span className="aegis-chart-tooltip-name">
            <span
              className="aegis-chart-swatch"
              style={{
                background: datumColor(entry.payload, colorKey)
                  ? chartColor(datumColor(entry.payload, colorKey))
                  : (entry.color ?? chartColor(chartPalette[index % chartPalette.length])),
              }}
            />
            <span>{entry.name}</span>
          </span>
          <strong>
            {typeof entry.value === 'number'
              ? valueFormat(entry.value)
              : Array.isArray(entry.value)
                ? entry.value.join(' – ')
                : entry.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
export interface ChartLegendProps {
  series: readonly ChartSeries[];
  hidden?: readonly string[];
  onToggle?: (key: string) => void;
}
export function ChartLegend({ series, hidden = [], onToggle }: ChartLegendProps) {
  return (
    <div className="aegis-chart-legend" aria-label="Chart series">
      {series.map((series, index) => {
        const content = (
          <>
            <span
              className="aegis-chart-swatch"
              style={{
                background: chartColor(series.color ?? chartPalette[index % chartPalette.length]),
              }}
            />
            <span>{series.label}</span>
          </>
        );
        return onToggle ? (
          <button
            key={series.key}
            type="button"
            aria-pressed={!hidden.includes(series.key)}
            data-hidden={hidden.includes(series.key)}
            onClick={() => onToggle(series.key)}
          >
            {content}
          </button>
        ) : (
          <span className="aegis-chart-legend-item" key={series.key}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
export interface ChartDataTableProps {
  data: readonly object[];
  series: readonly ChartSeries[];
  xKey: string;
  title: string;
}
export function ChartDataTable({ data, series, xKey, title }: ChartDataTableProps) {
  return (
    <details className="aegis-chart-data">
      <summary>View chart data</summary>
      <div
        className="aegis-chart-data-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${title} data`}
      >
        <table>
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Time or category</th>
              {series.map((item) => (
                <th scope="col" key={item.key}>
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <th scope="row">{String((row as Record<string, unknown>)[xKey] ?? index + 1)}</th>
                {series.map((item) => (
                  <td key={item.key}>
                    {String((row as Record<string, unknown>)[item.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
export interface ChartBrushRange {
  startIndex: number;
  endIndex: number;
}
export interface CartesianChartProps extends Omit<
  ChartContainerProps,
  'children' | 'empty' | 'legend' | 'footer'
> {
  data: readonly object[];
  series: readonly ChartSeries[];
  xKey?: string;
  stacked?: boolean;
  showLegend?: boolean;
  showDataTable?: boolean;
  xFormatter?: (value: string | number) => string;
  valueFormatter?: (value: number) => string;
  brush?: boolean;
  brushRange?: ChartBrushRange;
  onBrushChange?: (range: ChartBrushRange) => void;
}
interface CartesianPlotProps extends CartesianChartProps {
  kind: 'line' | 'area' | 'bar';
  colorKey?: string;
}
function CartesianPlot({
  kind,
  colorKey,
  title,
  data,
  series,
  xKey = 'label',
  stacked = false,
  showLegend = true,
  showDataTable = false,
  xFormatter,
  valueFormatter,
  brush = false,
  brushRange,
  onBrushChange,
  height: requestedHeight,
  ...container
}: CartesianPlotProps) {
  const tokens = useComponentTokenNumbers([
    'chart-height',
    'chart-initial-width',
    'chart-margin-top',
    'chart-margin-right',
    'chart-margin-left',
    'chart-tick-font-size',
    'chart-tick-gap',
    'chart-tick-margin',
    'chart-y-axis-width',
    'chart-dot-radius',
    'chart-stroke',
    'chart-bar-radius',
    'chart-bar-max-width',
    'chart-brush-height',
    'chart-brush-handle-width',
    'chart-resize-delay',
  ]);
  const height = requestedHeight ?? tokens['chart-height'];
  const [hidden, setHidden] = useState<string[]>([]);
  const id = useId().replaceAll(':', '');
  const Chart =
    kind === 'line' ? RechartsLineChart : kind === 'area' ? RechartsAreaChart : RechartsBarChart;
  const values = [...data];
  return (
    <ChartContainer
      {...container}
      title={title}
      height={height}
      empty={!data.length || !series.length}
      legend={
        showLegend && (
          <ChartLegend
            series={series}
            hidden={hidden}
            onToggle={(key) =>
              setHidden((current) =>
                current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
              )
            }
          />
        )
      }
      footer={
        showDataTable && data.length > 0 ? (
          <ChartDataTable data={data} series={series} xKey={xKey} title={title} />
        ) : undefined
      }
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        debounce={tokens['chart-resize-delay']}
        initialDimension={{ width: tokens['chart-initial-width'], height }}
      >
        <Chart
          data={values}
          accessibilityLayer
          aria-label={`${title}. Use left and right arrows to inspect values.`}
          margin={{
            top: tokens['chart-margin-top'],
            right: tokens['chart-margin-right'],
            bottom: 0,
            left: tokens['chart-margin-left'],
          }}
        >
          <defs>
            {series.map((item, index) => (
              <linearGradient key={item.key} id={`${id}-area-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={chartColor(item.color ?? chartPalette[index % chartPalette.length])}
                  stopOpacity={componentToken('chart-area-opacity-top')}
                />
                <stop
                  offset="100%"
                  stopColor={chartColor(item.color ?? chartPalette[index % chartPalette.length])}
                  stopOpacity={componentToken('chart-area-opacity-bottom')}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--group-data-viz-chart-color-border-subtle)"
            strokeDasharray={`${componentToken('chart-grid-dash')} ${componentToken('chart-grid-dash')}`}
          />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'var(--group-data-viz-chart-color-content-secondary)',
              fontSize: tokens['chart-tick-font-size'],
            }}
            minTickGap={tokens['chart-tick-gap']}
            tickMargin={tokens['chart-tick-margin']}
            tickFormatter={xFormatter}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: 'var(--group-data-viz-chart-color-content-secondary)',
              fontSize: tokens['chart-tick-font-size'],
            }}
            width={tokens['chart-y-axis-width']}
            tickFormatter={
              valueFormatter ??
              ((value) => Number(value).toLocaleString('en-GB', { notation: 'compact' }))
            }
            allowDecimals={false}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormat={valueFormatter}
                colorKey={kind === 'bar' ? colorKey : undefined}
              />
            }
            cursor={
              kind === 'bar'
                ? {
                    fill: 'var(--group-data-viz-chart-color-surface-hover)',
                    fillOpacity: componentToken('chart-cursor-opacity'),
                  }
                : {
                    stroke: 'var(--group-data-viz-chart-color-border-strong)',
                    strokeDasharray: `${componentToken('chart-grid-dash')} ${componentToken('chart-grid-dash')}`,
                  }
            }
            isAnimationActive={false}
          />
          {series.map((item, index) => {
            const color = chartColor(item.color ?? chartPalette[index % chartPalette.length]);
            const coloredBar = colorKey
              ? (shapeProps: unknown) => {
                  const shape = shapeProps as BarShapeProps;
                  const fill = chartColor(
                    datumColor(shape.payload, colorKey) ??
                      item.color ??
                      chartPalette[index % chartPalette.length],
                  );
                  return (
                    <Rectangle
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      radius={
                        stacked ? 0 : [tokens['chart-bar-radius'], tokens['chart-bar-radius'], 0, 0]
                      }
                      fill={
                        shape.isActive
                          ? `color-mix(in srgb, ${fill} ${componentToken('chart-active-color-mix')}, var(--group-data-viz-chart-color-content-primary))`
                          : fill
                      }
                    />
                  );
                }
              : undefined;
            const common = {
              dataKey: item.key,
              name: item.label,
              hide: hidden.includes(item.key),
              isAnimationActive: false,
            };
            return kind === 'line' ? (
              <Line
                key={item.key}
                {...common}
                type="monotone"
                stroke={color}
                strokeWidth={componentToken('chart-stroke')}
                dot={false}
                activeDot={{
                  r: tokens['chart-dot-radius'],
                  stroke: 'var(--group-data-viz-chart-color-surface-surface)',
                  strokeWidth: tokens['chart-stroke'],
                }}
                connectNulls={false}
              />
            ) : kind === 'area' ? (
              <Area
                key={item.key}
                {...common}
                type="monotone"
                stroke={color}
                strokeWidth={componentToken('chart-stroke')}
                fill={stacked ? color : `url(#${id}-area-${index})`}
                fillOpacity={stacked ? componentToken('chart-stacked-opacity') : 1}
                stackId={stacked ? 'series' : undefined}
                connectNulls={false}
              />
            ) : (
              <Bar
                key={item.key}
                {...common}
                fill={color}
                shape={coloredBar}
                activeBar={
                  coloredBar ?? {
                    fill: `color-mix(in srgb, ${color} ${componentToken('chart-active-color-mix')}, var(--group-data-viz-chart-color-content-primary))`,
                  }
                }
                stackId={stacked ? 'series' : undefined}
                radius={
                  stacked ? 0 : [tokens['chart-bar-radius'], tokens['chart-bar-radius'], 0, 0]
                }
                maxBarSize={tokens['chart-bar-max-width']}
              />
            );
          })}
          {brush && data.length > 1 && (
            <Brush
              dataKey={xKey}
              height={tokens['chart-brush-height']}
              travellerWidth={tokens['chart-brush-handle-width']}
              fill="var(--group-data-viz-chart-color-surface-surface)"
              stroke="var(--group-data-viz-chart-color-border-strong)"
              startIndex={brushRange?.startIndex}
              endIndex={brushRange?.endIndex}
              onChange={onBrushChange}
              ariaLabel={`${title} time range`}
              tickFormatter={xFormatter}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
export type LineChartProps = CartesianChartProps;
export function LineChart(props: LineChartProps) {
  return <CartesianPlot {...props} kind="line" />;
}
export type AreaChartProps = CartesianChartProps;
export function AreaChart(props: AreaChartProps) {
  return <CartesianPlot {...props} kind="area" />;
}
export interface BarChartProps extends CartesianChartProps {
  /** Datum field containing a ChartColor. Invalid or absent values fall back to the series color. */
  colorKey?: string;
}
export function BarChart(props: BarChartProps) {
  return <CartesianPlot {...props} kind="bar" />;
}

export interface DonutDatum {
  name: string;
  value: number;
  color?: ChartColor;
}
export interface DonutChartProps extends Omit<
  ChartContainerProps,
  'children' | 'empty' | 'legend' | 'footer'
> {
  data: readonly DonutDatum[];
  showLegend?: boolean;
  showDataTable?: boolean;
  totalLabel?: string;
}
export function DonutChart({
  title,
  data,
  height: requestedHeight,
  showLegend = true,
  showDataTable = false,
  totalLabel = 'Total records',
  ...props
}: DonutChartProps) {
  const tokens = useComponentTokenNumbers([
    'chart-height',
    'chart-resize-delay',
    'donut-initial-width',
    'donut-inner-radius',
    'donut-outer-radius',
    'donut-padding-angle',
  ]);
  const height = requestedHeight ?? tokens['chart-height'];
  const values = data.map((item) => ({
    ...item,
    value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
  }));
  const total = values.reduce((sum, item) => sum + item.value, 0);
  return (
    <ChartContainer
      {...props}
      title={title}
      height={height}
      empty={!total}
      legend={
        showLegend && (
          <ChartLegend
            series={values.map((item, index) => ({
              key: item.name,
              label: `${item.name} · ${item.value.toLocaleString()}`,
              color: item.color ?? chartPalette[index % chartPalette.length],
            }))}
          />
        )
      }
      footer={
        showDataTable && values.length > 0 ? (
          <ChartDataTable
            data={values}
            series={[{ key: 'value', label: 'Records' }]}
            xKey="name"
            title={title}
          />
        ) : undefined
      }
    >
      <div className="aegis-donut-plot">
        <ResponsiveContainer
          width="100%"
          height="100%"
          debounce={tokens['chart-resize-delay']}
          initialDimension={{ width: tokens['donut-initial-width'], height }}
        >
          <RechartsPieChart
            accessibilityLayer
            aria-label={`${title}. Use arrow keys to inspect categories.`}
          >
            <Pie
              data={values}
              dataKey="value"
              nameKey="name"
              innerRadius={`${tokens['donut-inner-radius']}%`}
              outerRadius={`${tokens['donut-outer-radius']}%`}
              paddingAngle={tokens['donut-padding-angle']}
              stroke="var(--group-data-viz-chart-color-surface-surface)"
              strokeWidth={componentToken('donut-stroke')}
              isAnimationActive={false}
            >
              {values.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={chartColor(item.color ?? chartPalette[index % chartPalette.length])}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
          </RechartsPieChart>
        </ResponsiveContainer>
        <div className="aegis-donut-total" aria-hidden="true">
          <strong>{total.toLocaleString('en-GB')}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
    </ChartContainer>
  );
}
