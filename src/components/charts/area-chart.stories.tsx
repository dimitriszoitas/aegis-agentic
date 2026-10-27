import type { Meta, StoryObj } from '@storybook/react-vite';
import { AreaChart } from './charts';
import { timeSeries } from '@/sample-data';
const meta = {
  id: 'components-charts-area-chart',
  title: 'Components/Data Visualization/Area chart',
  component: AreaChart,
  tags: ['autodocs'],
  args: {
    title: 'Event ingestion volume',
    description: '48 half-hour buckets · UTC',
    data: timeSeries,
    series: [{ key: 'total', label: 'Ingested events', color: 'function' }],
  },
} satisfies Meta<typeof AreaChart>;
export default meta;
export const EventVolume: StoryObj<typeof meta> = {};
export const StackedSeverity: StoryObj<typeof meta> = {
  args: {
    title: 'Severity composition over time',
    series: [
      { key: 'medium', label: 'Medium', color: 'medium' },
      { key: 'high', label: 'High', color: 'high' },
      { key: 'critical', label: 'Critical', color: 'critical' },
    ],
    stacked: true,
    showDataTable: true,
  },
};
