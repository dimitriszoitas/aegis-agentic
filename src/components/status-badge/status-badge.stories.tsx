import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBadge, StatusDot } from './status-badge';
export default {
  id: 'components-tags-statusbadge',
  title: 'Components/Data Display/StatusBadge',
  component: StatusBadge,
  subcomponents: { StatusDot },
} satisfies Meta<typeof StatusBadge>;
export const Matrix: StoryObj<typeof StatusBadge> = {
  render: () => (
    <div className="stack">
      <div className="row">
        {(['new', 'in-review', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
          <StatusBadge status={status} key={status} />
        ))}
      </div>
      <div className="row">
        {(['new', 'in-review', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
          <StatusDot status={status} key={status} />
        ))}
      </div>
    </div>
  ),
};

export const Playground: StoryObj<typeof StatusBadge> = {
  args: { status: 'in-progress' },
  argTypes: {
    status: {
      control: 'select',
      options: ['new', 'in-review', 'in-progress', 'completed', 'cancelled'],
    },
  },
  render: (args) => <StatusBadge {...args} />,
};
