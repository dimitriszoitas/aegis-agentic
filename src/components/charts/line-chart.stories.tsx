import type { Meta, StoryObj } from '@storybook/react-vite';
import { LineChart } from './charts';
import { timeSeries } from '@/sample-data';
const meta = {
  id: 'components-charts-line-chart',
  title: 'Components/Data Visualization/Line chart',
  component: LineChart,
  tags: ['autodocs'],
  args: {
    title: 'High-priority record activity',
    description: 'Critical and high-severity events · UTC',
    data: timeSeries,
    series: [
      { key: 'critical', label: 'Critical', color: 'critical' },
      { key: 'high', label: 'High', color: 'high' },
    ],
    showDataTable: true,
  },
} satisfies Meta<typeof LineChart>;
export default meta;
export const MultipleSeries: StoryObj<typeof meta> = {};
export const SingleSeries: StoryObj<typeof meta> = {
  args: {
    title: 'All workspace events',
    series: [{ key: 'total', label: 'Events', color: 'function' }],
  },
};
export const States: StoryObj<typeof meta> = {
  render: (args) => (
    <div className="story-grid">
      <LineChart {...args} loading />
      <LineChart {...args} data={[]} />
    </div>
  ),
};
