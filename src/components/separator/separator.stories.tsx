import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';
const meta = {
  id: 'components-surfaces-separator',
  title: 'Components/Layout/Separator',
  component: Separator,
  tags: ['autodocs'],
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Orientations: Story = {
  render: () => (
    <div className="story-layout stack" style={{ maxWidth: 580 }}>
      <div>
        <h3>Customer activity</h3>
        <p className="muted" style={{ margin: 0 }}>
          Customer records from the connected workspace
        </p>
      </div>
      <Separator decorative={false} />
      <div className="row" style={{ gap: 'var(--space-4)' }}>
        <span>24 records</span>
        <Separator orientation="vertical" decorative={false} />
        <span>6 identities</span>
        <Separator orientation="vertical" decorative={false} />
        <span className="muted">Last 24 hours</span>
      </div>
    </div>
  ),
};
export const InToolbar: Story = {
  render: () => (
    <div className="story-layout row">
      <span>All records</span>
      <Separator orientation="vertical" />
      <span className="muted">Updated 30 seconds ago</span>
    </div>
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="stack" style={{ maxWidth: 580 }}>
      {(['light', 'normal'] as const).map((emphasis) => (
        <section key={emphasis} className="story-layout stack">
          <h3>{emphasis === 'light' ? 'Light emphasis' : 'Normal emphasis'}</h3>
          <Separator emphasis={emphasis} />
          <div className="row">
            <span>24 records</span>
            <Separator orientation="vertical" emphasis={emphasis} />
            <span>6 identities</span>
            <Separator variant="dot" emphasis={emphasis} />
            <span className="muted">Last 24 hours</span>
          </div>
        </section>
      ))}
    </div>
  ),
};
export const DotSeparators: Story = {
  render: () => (
    <div className="row">
      <span>Elena Vasquez</span>
      <Separator variant="dot" />
      <span className="muted">Senior member</span>
      <Separator variant="dot" emphasis="light" />
      <span className="muted">Athens workspace</span>
    </div>
  ),
};

export const Playground: Story = {
  args: { orientation: 'horizontal', variant: 'line', emphasis: 'normal', decorative: true },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['line', 'dot'] },
    emphasis: { control: 'select', options: ['normal', 'light'] },
    decorative: { control: 'boolean' },
  },
  render: (args) => (
    <div
      className={args.orientation === 'horizontal' && args.variant === 'line' ? 'stack' : 'row'}
      style={{ width: '100%', maxWidth: 480 }}
    >
      <span>Project overview</span>
      <Separator {...args} />
      <span className="muted">Updated today</span>
    </div>
  ),
};
