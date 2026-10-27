import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataGrid } from '@/components/data-grid';
import { MetricCard } from '@/components/metric-card';
import { MiniBarChart } from './mini-bar-chart';

const hourlyEvents = [12, 18, 14, 26, 21, 34, 28, 42, 31, 48, 39, 54];
const sources = [
  { id: 'projects', name: 'Project updates', total: 367, values: hourlyEvents },
  {
    id: 'workspace',
    name: 'Workspace events',
    total: 211,
    values: [8, 14, 19, 16, 23, 18, 28, 22, 17, 15, 18, 13],
  },
  {
    id: 'network',
    name: 'Network activity',
    total: 185,
    values: [24, 18, 21, 16, 12, 19, 14, 10, 16, 13, 12, 10],
  },
];

const meta = {
  id: 'components-charts-mini-bar-chart',
  title: 'Components/Data Visualization/Mini bar chart',
  component: MiniBarChart,
  tags: ['autodocs'],
  args: {
    data: hourlyEvents,
    label: 'Events per hour over the last 12 hours; latest 54 events',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A small bar chart for counts and activity in metric cards or dense tables. Bars share a zero baseline and use semantic colors. Like Sparkline, it has no axes, animation, tooltip, or focus target; provide an accessible label describing the measurement and period. Reuses Sparkline’s bar renderer.',
      },
    },
  },
} satisfies Meta<typeof MiniBarChart>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Intents: Story = {
  argTypes: { intent: { control: false } },
  render: (args) => (
    <div className="row" style={{ gap: 'var(--space-6)' }}>
      {(['function', 'ai', 'success', 'warning', 'destroy'] as const).map((intent) => (
        <div className="stack" key={intent}>
          <span className="muted">{intent}</span>
          <MiniBarChart {...args} intent={intent} />
        </div>
      ))}
    </div>
  ),
};
export const InMetricCards: Story = {
  render: () => (
    <div className="story-grid" style={{ maxWidth: 960 }}>
      <MetricCard
        label="Evidence events"
        value={367}
        sparkline={hourlyEvents}
        sparklineVariant="bar"
        sparklineLabel="Evidence events per hour over the last 12 hours"
      />
      <MetricCard
        label="Resolved records"
        value={84}
        intent="success"
        sparkline={[3, 5, 4, 8, 6, 9, 7, 10, 6, 8, 7, 11]}
        sparklineVariant="bar"
        sparklineLabel="Resolved records per hour over the last 12 hours"
      />
      <MetricCard
        label="Critical records"
        value={18}
        intent="destroy"
        sparkline={[1, 0, 2, 1, 3, 0, 2, 1, 4, 1, 2, 1]}
        sparklineVariant="bar"
        sparklineLabel="Critical records per hour over the last 12 hours"
      />
    </div>
  ),
};
export const InTableCells: Story = {
  render: () => (
    <div style={{ maxWidth: 720 }}>
      <DataGrid
        data={sources}
        getRowId={(source) => source.id}
        label="Event source activity"
        noun="sources"
        enableSelection={false}
        height={220}
        columns={[
          { accessorKey: 'name', header: 'Source', size: 280 },
          { accessorKey: 'total', header: 'Events', size: 128, meta: { align: 'right' } },
          {
            id: 'activity',
            header: 'Last 12 hours',
            size: 180,
            cell: ({ row }) => (
              <MiniBarChart
                data={row.original.values}
                label={`${row.original.name} per hour over the last 12 hours`}
              />
            ),
          },
        ]}
      />
    </div>
  ),
};
export const States: Story = {
  render: () => (
    <div className="row" style={{ gap: 'var(--space-6)' }}>
      <MiniBarChart data={[]} loading label="Event volume" />
      <MiniBarChart data={[]} label="No event data available" />
      <MiniBarChart data={[0, 0, 0, 0]} label="No events in the last four hours" />
      <MiniBarChart data={[12]} label="12 events in the last hour" />
      <MiniBarChart data={[8, 8, 8, 8]} label="Eight events in each of the last four hours" />
    </div>
  ),
};
