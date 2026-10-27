import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ShieldCheck, Plus, RotateCcw, X } from '@/components/icon';
import { EmptyState } from './empty-state';
import { Button } from '@/components/button';
import { Banner } from '@/components/banner';
const meta = {
  id: 'components-feedback-empty-state',
  title: 'Components/Feedback/Empty state',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;
export default meta;
type Story = StoryObj<typeof meta>;
function PresetDemo({ preset }: { preset: 'no-results' | 'no-data' | 'error' }) {
  const [resolved, setResolved] = useState(false);
  if (resolved)
    return (
      <div className="story-layout">
        <Banner
          intent="success"
          title={
            preset === 'no-results'
              ? 'Filters cleared'
              : preset === 'error'
                ? 'Connection restored'
                : 'Source setup started'
          }
        >
          {preset === 'no-results'
            ? 'Showing all 150 records in your workspace.'
            : preset === 'error'
              ? 'Your record queue is available again.'
              : 'Connect your project tracker, billing account, or customer directory to get started.'}
        </Banner>
        <Button
          emphasis="ghost"
          size="sm"
          onClick={() => setResolved(false)}
          style={{ marginTop: 'var(--space-3)' }}
        >
          Reset example
        </Button>
      </div>
    );
  return (
    <div className="story-layout">
      <EmptyState
        preset={preset}
        action={
          <Button intent="function" onClick={() => setResolved(true)}>
            {preset === 'no-results' ? (
              <>
                <X size={15} />
                Clear filters
              </>
            ) : preset === 'error' ? (
              <>
                <RotateCcw size={15} />
                Retry loading
              </>
            ) : (
              <>
                <Plus size={15} />
                Connect a source
              </>
            )}
          </Button>
        }
      />
    </div>
  );
}
export const Presets: Story = {
  render: () => (
    <div
      className="story-grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
    >
      {(['no-results', 'no-data', 'error'] as const).map((preset) => (
        <PresetDemo preset={preset} key={preset} />
      ))}
    </div>
  ),
};
export const Compact: Story = {
  render: () => (
    <div className="story-layout" style={{ maxWidth: 420 }}>
      <EmptyState
        compact
        icon={<ShieldCheck size={24} />}
        title="No critical records"
        description="No critical issues were found in the selected time range. New records will appear as your team adds them."
      />
    </div>
  ),
};
export const CustomWorkspace: Story = {
  render: () => (
    <EmptyState
      icon={<ShieldCheck size={25} />}
      title="All caught up"
      description="You’ve reviewed every record assigned to you. Your team has 3 connected workspaces."
    />
  ),
};

export const Playground: Story = {
  args: { preset: 'no-results', compact: false },
  argTypes: {
    preset: { control: 'select', options: ['no-results', 'no-data', 'error'] },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  render: (args) => (
    <div style={{ width: 'min(100%, 540px)' }}>
      <EmptyState {...args} />
    </div>
  ),
};
