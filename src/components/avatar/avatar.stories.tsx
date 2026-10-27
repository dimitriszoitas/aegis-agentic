import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarGroup } from './avatar';
const members = [
  { name: 'Eleni Papadopoulos', status: 'online' as const },
  { name: 'Marcus Chen', status: 'busy' as const },
  { name: 'Aisha Okafor', status: 'away' as const },
  { name: 'Kenji Nakamura', status: 'offline' as const },
  { name: 'Sofia Rossi' },
  { name: 'Noah Williams' },
];
const meta = {
  id: 'components-people-avatar',
  title: 'Components/Data Display/Avatar',
  component: Avatar,
  subcomponents: { AvatarGroup },
  tags: ['autodocs'],
  args: { name: 'Eleni Papadopoulos' },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SizesAndPresence: Story = {
  render: () => (
    <div className="stack">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className="row" key={size} style={{ gap: 'var(--space-6)' }}>
          {members.slice(0, 4).map((member) => (
            <div className="row" key={member.name}>
              <Avatar {...member} size={size} />
              <span className="muted">{member.status}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};
export const Groups: Story = {
  render: () => (
    <div className="story-layout stack" style={{ maxWidth: 460 }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className="between" key={size}>
          <span>Identity response team</span>
          <AvatarGroup avatars={members} max={3} size={size} />
        </div>
      ))}
    </div>
  ),
};
export const InitialsFallback: Story = {
  render: () => (
    <div className="row" style={{ gap: 'var(--space-4)' }}>
      <Avatar name="Eleni Papadopoulos" size="lg" />
      <div>
        <strong>Eleni Papadopoulos</strong>
        <p className="muted" style={{ margin: 0 }}>
          Senior product designer · Athens
        </p>
      </div>
    </div>
  ),
};

export const Playground: Story = {
  args: { name: 'Maya Chen', initials: '', src: '', size: 'md', status: 'online' },
  argTypes: {
    name: { control: 'text' },
    initials: { control: 'text' },
    src: { control: 'text', name: 'Image URL' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: ['online', 'away', 'busy', 'offline'] },
  },
  render: (args) => <Avatar {...args} />,
};
