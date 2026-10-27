import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import { Sparkline } from '@/components/sparkline';
import type { ChartContainerProps } from './charts';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChartContainer, ChartLegend, ChartTooltip, ChartDataTable } from './charts';
import { Button } from '@/components/button';
const meta = {
  id: 'components-charts-chart-container',
  title: 'Components/Data Visualization/Chart container',
  component: ChartContainer,
  subcomponents: { ChartTooltip, ChartLegend, ChartDataTable },
  tags: ['autodocs'],
  args: {
    title: 'Workspace events',
    description: 'Workspace activity over the last 24 hours',
  },
} satisfies Meta<typeof ChartContainer>;
export default meta;
function FailureExample() {
  const [error, setError] = useState('The workspace activity source did not respond.');
  return (
    <ChartContainer
      title="Workspace history"
      error={error}
      empty={!error}
      onRetry={() => setError('')}
    />
  );
}
export const States: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-grid">
      <ChartContainer title="Loading project events" loading />
      <ChartContainer title="No matching workspace events" empty />
      <FailureExample />
    </div>
  ),
};
export const TooltipAndLegend: StoryObj<typeof meta> = {
  render: () => (
    <ChartContainer
      title="Event volume"
      description="Floating tooltip and tokenized legend"
      height={170}
      action={
        <Button
          size="sm"
          emphasis="ghost"
          onClick={() =>
            navigator.clipboard?.writeText('08:00 UTC: 42 project, 28 workspace events')
          }
        >
          Copy values
        </Button>
      }
      legend={
        <ChartLegend
          series={[
            { key: 'project', label: 'Project', color: 'function' },
            { key: 'workspace', label: 'Workspace', color: 'ai' },
          ]}
        />
      }
    >
      <div style={{ padding: 'var(--space-6)', width: 280 }}>
        <ChartTooltip
          active
          label="08:00 UTC"
          payload={[
            { name: 'Project', value: 42, color: 'var(--color-chart-function)' },
            { name: 'Workspace', value: 28, color: 'var(--color-chart-ai)' },
          ]}
        />
      </div>
    </ChartContainer>
  ),
};

type ChartPlaygroundArgs = ChartContainerProps & {
  data: number[];
  showLegend: boolean;
  showDataTable: boolean;
};
export const Playground: StoryObj<ChartPlaygroundArgs> = {
  args: {
    title: 'Completed projects',
    description: 'Seven daily totals',
    height: 200,
    compact: false,
    loading: false,
    empty: false,
    error: '',
    data: [12, 16, 9, 22, 18, 24, 30],
    showLegend: true,
    showDataTable: true,
  },
  argTypes: {
    data: { control: 'object' },
    showLegend: { control: 'boolean' },
    showDataTable: { control: 'boolean' },
    height: { control: { type: 'number', min: 120, max: 480 } },
    description: { control: 'text' },
    error: { control: 'text' },
  },
  render: function Render({ data, showLegend, showDataTable, ...args }) {
    const [, updateArgs] = useArgs<ChartPlaygroundArgs>();
    const series = [{ key: 'value', label: 'Projects', color: 'function' as const }];
    return (
      <div style={{ width: 'min(100%, 620px)' }}>
        <ChartContainer
          {...args}
          onRetry={() => updateArgs({ error: '' })}
          legend={showLegend ? <ChartLegend series={series} /> : undefined}
          footer={
            showDataTable ? (
              <ChartDataTable
                title={args.title}
                xKey="day"
                series={series}
                data={data.map((value, index) => ({ day: `Day ${index + 1}`, value }))}
              />
            ) : undefined
          }
        >
          <Sparkline
            data={data}
            variant="bar"
            width={320}
            height={Math.max(60, (args.height ?? 200) - 32)}
            label="Daily completed projects"
          />
        </ChartContainer>
      </div>
    );
  },
};
