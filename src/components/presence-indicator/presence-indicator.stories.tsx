import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PresenceIndicator } from './presence-indicator';
import { presenceIndicatorAnatomy } from '@/stories/component-docs/anatomy/presence-indicator';
const meta = {
  id: 'components-people-presenceindicator',
  title: 'Components/Data Display/PresenceIndicator',
  component: PresenceIndicator,
  args: { status: 'online', showLabel: true, size: 'md' },
  argTypes: {
    status: { control: 'select', options: ['online', 'away', 'busy', 'offline'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Display host-provided availability with a visible label by default. Dot-only presence has an accessible name. Presence is not a record workflow status, a connectivity probe, or a live announcement service.',
      },
    },
  },
} satisfies Meta<typeof PresenceIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const DotOnly: Story = { args: { status: 'away', showLabel: false, label: 'Alex is away' } };
export const States: Story = {
  render: () => (
    <div className="row">
      {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
        <PresenceIndicator status={status} key={status} />
      ))}
    </div>
  ),
};
export const Anatomy: Story = { render: () => <>{presenceIndicatorAnatomy.render()}</> };
export const AccessibleMeaning: Story = {
  args: { showLabel: false, label: 'Alex is online' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('img', { name: 'Alex is online' })).toBeVisible();
    await expect(c.queryByRole('status')).not.toBeInTheDocument();
  },
};
