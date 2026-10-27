import type { Meta, StoryObj } from '@storybook/react-vite';
import { Kbd } from './kbd';
const meta = {
  id: 'components-tags-kbd',
  title: 'Components/Data Display/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  args: { children: '⌘ K' },
} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Sizes: Story = {
  render: () => (
    <div className="stack">
      <div className="row">
        <span className="muted">Search commands</span>
        <Kbd aria-label="Command K">⌘ K</Kbd>
      </div>
      <div className="row">
        <span className="muted">Open record</span>
        <Kbd size="md" aria-label="Enter">
          ↵
        </Kbd>
      </div>
    </div>
  ),
};
export const WorkspaceShortcuts: Story = {
  render: () => (
    <div className="story-layout stack" style={{ maxWidth: 400 }}>
      {[
        ['Search records', '/'],
        ['Next record', 'J'],
        ['Previous record', 'K'],
        ['Assign to me', 'A'],
        ['Close detail', 'Esc'],
      ].map(([label, shortcut]) => (
        <div className="between" key={label}>
          <span>{label}</span>
          <Kbd>{shortcut}</Kbd>
        </div>
      ))}
    </div>
  ),
};

export const Playground: Story = {
  args: { children: '⌘ K', size: 'sm', 'aria-label': 'Command K' },
  argTypes: {
    children: { control: 'text', name: 'Keys' },
    size: { control: 'select', options: ['sm', 'md'] },
    'aria-label': { control: 'text', name: 'Accessible label' },
  },
  render: (args) => <Kbd {...args} />,
};
