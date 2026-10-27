import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkline } from './sparkline';
import { records } from '@/sample-data';
const meta = {
  id: 'components-charts-sparkline',
  title: 'Components/Data Visualization/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
  args: { data: records[1].sparkline, label: 'Invoice follow-up events over the last 24 hours' },
} satisfies Meta<typeof Sparkline>;
export default meta;
export const VariantsAndIntents: StoryObj<typeof meta> = {
  argTypes: {
    variant: { control: false },
    intent: { control: false },
    width: { control: false },
  },
  render: (args) => (
    <div className="story-layout stack" style={{ maxWidth: 540 }}>
      {(['line', 'area', 'bar'] as const).map((variant) => (
        <div className="between" key={variant}>
          <span className="muted">{variant}</span>
          {(['function', 'ai', 'success', 'warning', 'destroy'] as const).map((intent) => (
            <Sparkline {...args} key={intent} variant={variant} intent={intent} width={72} />
          ))}
        </div>
      ))}
    </div>
  ),
};
export const States: StoryObj<typeof meta> = {
  argTypes: {
    loading: { control: false },
    data: { control: false },
    variant: { control: false },
    intent: { control: false },
  },
  render: (args) => (
    <div className="story-layout row" style={{ gap: 'var(--space-6)' }}>
      <Sparkline {...args} loading />
      <Sparkline data={[]} />
      <Sparkline data={[12]} />
      <Sparkline data={[4, 4, 4, 4]} />
      <Sparkline data={[0, 0, 0, 0]} variant="bar" />
    </div>
  ),
};
