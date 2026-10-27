import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ChartMetricCard, type ChartMetricDatum } from './chart-metric-card';

const data: readonly ChartMetricDatum[] = [10100, 9300, 9900, 6100, 7000, 9700, 9700].map(
  (value, index) => ({ label: `Oct ${15 + index}`, value }),
);
const metric = data.reduce((total, point) => total + point.value, 0);
const meta = {
  id: 'components-charts-chart-metric-card',
  title: 'Components/Data Visualization/Chart metric card',
  component: ChartMetricCard,
  tags: ['autodocs'],
  args: {
    label: 'Processed records',
    metric,
    data,
    delta: 364.3,
    period: 'in past 7d',
    trendIsPositive: true,
    variant: 'bar',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['bar', 'area', 'compact'] },
    trendIsPositive: {
      description:
        'Explicit desirability of the change. Omit for neutral styling; a volume increase is not inherently good.',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A summary metric and its underlying series in one card. Bar and area variants retain the shared chart keyboard inspection and tooltips. Compact bars are a static overview; every variant exposes an exact data table. The latest readout comes from the final supplied interval. Example values are illustrative, sum to 61,800, and end at 9,700 on Oct 21; the +364.3% comparison is supplied separately. The example explicitly marks that comparison favorable for presentation, not as a business performance assessment.',
      },
    },
  },
} satisfies Meta<typeof ChartMetricCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const StandardBar: Story = { args: { style: { maxWidth: 760 } } };
export const AreaTrend: Story = { args: { variant: 'area', style: { maxWidth: 760 } } };
export const CompactBar: Story = { args: { variant: 'compact', style: { maxWidth: 520 } } };
export const CombinedShowcase: Story = {
  argTypes: { variant: { control: false } },
  render: (args) => (
    <div className="aegis-chart-metric-showcase">
      {(['bar', 'area', 'compact'] as const).map((variant) => (
        <ChartMetricCard {...args} key={variant} variant={variant} />
      ))}
    </div>
  ),
};
export const NeutralChange: Story = {
  args: { trendIsPositive: undefined, style: { maxWidth: 760 } },
};
export const Empty: Story = {
  args: { data: [], metric: '—', delta: undefined, style: { maxWidth: 760 } },
};
export const KeyboardAndExactData: Story = {
  args: { style: { maxWidth: 760 } },
  parameters: { docs: { story: { inline: true, autoplay: false } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('61.8K')).toBeVisible();
    await expect(canvas.getByText('9.7K')).toBeVisible();
    const plot = canvas.getByRole('application', { name: /Processed records by interval/ });
    plot.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(canvasElement.querySelector('.aegis-chart-tooltip')).toBeVisible());
    const summary = canvas.getByText('View chart data');
    await userEvent.click(summary);
    await waitFor(() => expect(summary.closest('details')).toHaveAttribute('open'));
    const table = canvas.getByRole('table', { name: 'Processed records by interval' });
    const values = within(table)
      .getAllByRole('cell')
      .map((cell) => Number(cell.textContent));
    await expect(values.reduce((sum, value) => sum + value, 0)).toBe(61800);
    await waitFor(() =>
      expect(within(table).getByRole('row', { name: 'Oct 21 9700' })).toBeVisible(),
    );
  },
};
