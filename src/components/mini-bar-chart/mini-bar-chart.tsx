import { useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { Sparkline, type SparklineProps } from '@/components/sparkline';

export type MiniBarChartProps = Omit<SparklineProps, 'variant'>;

/** Compact, zero-based bars for metrics and table cells. Shares Sparkline's
 * semantic colors, accessible summary, loading state, and non-interactive SVG. */
export function MiniBarChart({
  width: requestedWidth,
  height: requestedHeight,
  ...props
}: MiniBarChartProps) {
  const tokens = useComponentTokenNumbers(['mini-bar-width', 'mini-bar-height']);
  const width = requestedWidth ?? tokens['mini-bar-width'];
  const height = requestedHeight ?? tokens['mini-bar-height'];
  return <Sparkline {...props} variant="bar" width={width} height={height} />;
}
