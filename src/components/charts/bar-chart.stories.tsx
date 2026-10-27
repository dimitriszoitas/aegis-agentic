import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarChart } from './charts';
import { records, timeSeries } from '@/sample-data';
const sources = ['Projects', 'Customers', 'Billing', 'Workspace'].map((source) => ({
  label: source,
  open: records.filter(
    (record) => record.source === source && !['completed', 'cancelled'].includes(record.status),
  ).length,
  completed: records.filter(
    (record) => record.source === source && ['completed', 'cancelled'].includes(record.status),
  ).length,
}));
const meta = {
  id: 'components-charts-bar-chart',
  title: 'Components/Data Visualization/Bar chart',
  component: BarChart,
  tags: ['autodocs'],
  args: {
    title: 'Record workload by source',
    description: 'Open and completed reviews',
    data: sources,
    series: [
      { key: 'open', label: 'Open records', color: 'function' },
      { key: 'completed', label: 'Completed', color: 'success' },
    ],
  },
} satisfies Meta<typeof BarChart>;
export default meta;
export const GroupedSources: StoryObj<typeof meta> = {};
export const StackedSeverity: StoryObj<typeof meta> = {
  args: {
    title: 'Severity stacks',
    description: 'Event activity by half-hour bucket',
    data: timeSeries,
    series: [
      { key: 'info', label: 'Info', color: 'info' },
      { key: 'low', label: 'Low', color: 'low' },
      { key: 'medium', label: 'Medium', color: 'medium' },
      { key: 'high', label: 'High', color: 'high' },
      { key: 'critical', label: 'Critical', color: 'critical' },
    ],
    stacked: true,
  },
};
