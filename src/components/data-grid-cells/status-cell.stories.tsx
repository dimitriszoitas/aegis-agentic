import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusCell } from './data-grid-cells';
export default {
  id: 'components-data-grid-status-cell',
  title: 'Components/Data Display/Data grid/Status cell',
  component: StatusCell,
  tags: ['autodocs'],
  args: { status: 'new' },
} satisfies Meta<typeof StatusCell>;
export const Matrix: StoryObj<typeof StatusCell> = {
  render: () => (
    <div className="row">
      {(['new', 'in-review', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
        <StatusCell key={status} status={status} />
      ))}
    </div>
  ),
};

export const Playground: StoryObj<typeof StatusCell> = {
  args: { status: 'new' },
  argTypes: {
    status: {
      control: 'select',
      options: ['new', 'in-review', 'in-progress', 'completed', 'cancelled'],
    },
  },
};
