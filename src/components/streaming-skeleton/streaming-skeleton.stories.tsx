import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreamingSkeleton } from './streaming-skeleton';
const meta = {
  id: 'components-ai-streamingskeleton',
  title: 'Components/AI/StreamingSkeleton',
  component: StreamingSkeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof StreamingSkeleton>;
export default meta;
export const PendingBlocks: StoryObj<typeof meta> = {
  render: () => (
    <div className="story-grid">
      <div className="stack">
        <h3>Review summary</h3>
        <StreamingSkeleton lines={4} />
      </div>
      <StreamingSkeleton variant="card" lines={5} label="Preparing a configuration review" />
    </div>
  ),
};

export const Playground: StoryObj<typeof meta> = {
  args: { lines: 4, variant: 'text', label: 'Preparing a project summary' },
  argTypes: {
    lines: { control: { type: 'number', min: 1, max: 12, step: 1 } },
    variant: { control: 'select', options: ['text', 'card'] },
    label: { control: 'text' },
  },
  render: (args) => (
    <div style={{ width: '100%', maxWidth: 480 }}>
      <StreamingSkeleton {...args} />
    </div>
  ),
};
