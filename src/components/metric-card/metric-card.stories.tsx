import type { Meta, StoryObj } from '@storybook/react-vite';
import { MetricCard } from './metric-card';
import { records, timeSeries } from '@/sample-data';
const meta = {
  id: 'components-charts-metric-card',
  title: 'Components/Data Display/Metric card',
  component: MetricCard,
  tags: ['autodocs'],
  args: { label: 'Open records', value: 86 },
} satisfies Meta<typeof MetricCard>;
export default meta;
export const ConsoleMetrics: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-grid" style={{ maxWidth: 1400 }}>
      <MetricCard
        label="Open records"
        value={
          records.filter((record) => !['completed', 'cancelled'].includes(record.status)).length
        }
        delta={12.4}
        trendIsPositive={false}
        sparkline={timeSeries.slice(-24).map((bucket) => bucket.total)}
      />
      <MetricCard
        label="Critical records"
        intent="destroy"
        value={records.filter((record) => record.severity === 'critical').length}
        delta={-8.3}
        trendIsPositive
        sparkline={timeSeries.slice(-24).map((bucket) => bucket.critical)}
      />
      <MetricCard
        label="Mean time to resolution"
        intent="success"
        value={24}
        unit="min"
        delta={-18.2}
        trendIsPositive
        sparkline={[52, 48, 46, 49, 41, 38, 42, 37, 33, 35, 31, 28, 26, 24]}
      />
      <MetricCard
        label="Events per second"
        value={8421}
        delta={4.8}
        trendIsPositive
        sparkline={timeSeries.slice(-24).map((bucket) => bucket.total)}
      />
    </div>
  ),
};
export const States: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-grid">
      <MetricCard label="Open records" value={0} delta={0} />
      <MetricCard
        label="Workflow coverage"
        value={0.984}
        format={{ style: 'percent', maximumFractionDigits: 1 }}
        delta={2.1}
      />
      <MetricCard label="Events awaiting review" value={1284} />
      <MetricCard label="Critical records" value={0} loading />
    </div>
  ),
};

export const Playground: StoryObj<typeof MetricCard> = {
  args: {
    label: 'Completed projects',
    value: 1284,
    unit: 'projects',
    delta: 12.4,
    deltaLabel: 'vs previous month',
    trendIsPositive: true,
    loading: false,
    intent: 'function',
    sparklineVariant: 'line',
    sparkline: [3, 5, 4, 8, 7, 11, 14],
    sparklineLabel: 'Completed projects over seven days',
  },
  argTypes: {
    intent: { control: 'select', options: ['function', 'ai', 'success', 'warning', 'destroy'] },
    sparklineVariant: { control: 'select', options: ['line', 'area', 'bar'] },
    sparkline: { control: 'object' },
    format: { control: 'object' },
  },
  render: (args) => (
    <div style={{ width: 'min(100%, 420px)' }}>
      <MetricCard {...args} />
    </div>
  ),
};
