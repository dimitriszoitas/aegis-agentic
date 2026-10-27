import type { Meta, StoryObj } from '@storybook/react-vite';
import { Spinner } from './spinner';
const meta = {
  id: 'components-feedback-spinner',
  title: 'Components/Feedback/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  args: { label: 'Loading record details' },
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sizes: Story = {
  render: () => (
    <div className="row" style={{ gap: 'var(--space-8)' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="stack" style={{ alignItems: 'center' }}>
          <Spinner size={size} label={`Loading ${size} record preview`} />
          <span className="muted">{size}</span>
        </div>
      ))}
    </div>
  ),
};
export const InlineStatus: Story = {
  render: () => (
    <div className="story-layout row" role="status">
      <Spinner />
      <span>Correlating 1,284 events across 3 sources…</span>
    </div>
  ),
};
export const AiIntent: Story = {
  render: () => (
    <div className="row" style={{ color: 'var(--color-ai-fg)' }} role="status">
      <Spinner size="sm" />
      <span>Preparing an project summary…</span>
    </div>
  ),
};

export const Playground: Story = {
  args: { size: 'md', label: 'Loading records' },
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
};
