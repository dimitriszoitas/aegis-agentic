import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { ResourceState, type ResourceStateProps } from './resource-state';
import { resourceStateAnatomy } from '@/stories/component-docs/anatomy/resource-state';
const meta = {
  id: 'patterns-resourcestate',
  title: 'Components/Feedback/ResourceState',
  component: ResourceState,
  tags: ['autodocs'],
  args: {
    label: 'Customer resource',
    status: 'ready',
    children: null,
    retrying: false,
    loadingLabel: 'Loading customers…',
    retryLabel: 'Try again',
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['initial-loading', 'ready', 'refreshing', 'stale', 'error', 'empty'],
    },
    label: { control: 'text' },
    message: { control: 'text' },
    loadingLabel: { control: 'text' },
    retryLabel: { control: 'text' },
    retrying: { control: 'boolean' },
    children: { control: false },
    loadingContent: { control: false },
    emptyAction: { control: false },
    onRetry: { control: false },
  },
  render: (args) => {
    if (args.status === 'ready' || args.status === 'refreshing' || args.status === 'stale')
      return (
        <ResourceState {...args}>
          <TextInput label="Local draft" defaultValue="Alex Morgan" />
        </ResourceState>
      );
    return <ResourceState {...args} children={undefined} />;
  },
} satisfies Meta<ResourceStateProps>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export function ResourceStateExample() {
  const [status, setStatus] = useState<'ready' | 'refreshing' | 'stale'>('ready');
  return (
    <div className="stack">
      <div>
        <Button onClick={() => setStatus('refreshing')}>Refresh locally</Button>
        <Button onClick={() => setStatus('stale')}>Simulate failure</Button>
      </div>
      <ResourceState label="Saved customer" status={status} onRetry={() => setStatus('ready')}>
        <TextInput label="Customer note" defaultValue="Original note" />
      </ResourceState>
    </div>
  );
}
export const RefreshAndRetry: Story = {
  render: () => <ResourceStateExample />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole('textbox', { name: 'Customer note' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Keep this draft');
    await userEvent.click(c.getByRole('button', { name: 'Refresh locally' }));
    await expect(c.getByRole('region', { name: 'Saved customer' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect(input).toHaveValue('Keep this draft');
    await userEvent.click(c.getByRole('button', { name: 'Simulate failure' }));
    await expect(input).toHaveValue('Keep this draft');
    await userEvent.click(c.getByRole('button', { name: 'Try again' }));
    await expect(input).toHaveValue('Keep this draft');
    await expect(c.getByRole('region', { name: 'Saved customer' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
  },
};
export const Anatomy: Story = { render: () => <>{resourceStateAnatomy.render()}</> };
