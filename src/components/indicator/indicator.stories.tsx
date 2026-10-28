import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Indicator } from './indicator';
import { indicatorAnatomy } from '@/stories/component-docs/anatomy/indicator';
const meta = {
  id: 'components-data-indicator',
  title: 'Components/Data Display/Indicator',
  component: Indicator,
  args: { label: '8 unread notifications', count: 8, children: <Button>Notifications</Button> },
  argTypes: {
    children: { control: false },
    placement: {
      control: 'select',
      options: ['top-start', 'top-end', 'bottom-start', 'bottom-end'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Position a dot or CountBadge around existing content. Logical placements follow writing direction. The marker never intercepts pointer events or changes child semantics. Supply its full accessible meaning; use decorative only when that meaning is already available. Counts do not announce themselves as live updates.',
      },
    },
  },
} satisfies Meta<typeof Indicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Dot: Story = { args: { count: undefined, label: 'New activity' } };
export const Overflow: Story = { args: { count: 120, label: '120 unread notifications' } };
export const Zero: Story = { args: { count: 0, label: 'No unread notifications', showZero: true } };
export const Anatomy: Story = { render: () => <>{indicatorAnatomy.render()}</> };
export const Interaction: Story = {
  render: function Example() {
    const [count, setCount] = useState(120);
    return (
      <div className="stack">
        <Indicator count={count} label={`${count} unread notifications`}>
          <Button onClick={() => setCount(0)}>Read all notifications</Button>
        </Indicator>
        <p role="status">{count} unread notifications</p>
        <div dir="rtl">
          <Indicator label="New activity" placement="top-start">
            <Button>Activity</Button>
          </Indicator>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('img', { name: '120 unread notifications' })).toHaveTextContent('99+');
    const action = c.getByRole('button', { name: 'Read all notifications' });
    await userEvent.click(action);
    await expect(
      c.queryByRole('img', { name: '120 unread notifications' }),
    ).not.toBeInTheDocument();
    await expect(action).toHaveFocus();
    await expect(c.getByRole('status')).toHaveTextContent('0 unread');
    await expect(c.getByRole('img', { name: 'New activity' })).toBeVisible();
  },
};
