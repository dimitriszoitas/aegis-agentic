import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Eye, UserRound } from '@/components/icon';
import { Tabs } from './tabs';

const items = [
  {
    value: 'all',
    label: 'All records',
    icon: <Bell />,
    count: 150,
    content: '150 records across projects, customers, billing, and workspace activity.',
  },
  {
    value: 'review',
    label: 'Needs review',
    icon: <Eye />,
    count: 48,
    content: '48 records need a team review before the next handoff.',
  },
  {
    value: 'assigned',
    label: 'Assigned to me',
    icon: <UserRound />,
    count: 12,
    content: '12 records are assigned to Maya Chen.',
  },
];
const meta = {
  id: 'components-navigation-tabs',
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  args: { items, label: 'Record views' },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const VariantMatrix: Story = {
  argTypes: { variant: { control: false } },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
      <Tabs {...args} variant="line" />
      <Tabs {...args} variant="pill" />
    </div>
  ),
};
export const DisabledAndOverflow: Story = {
  args: {
    items: [
      ...items,
      {
        value: 'escalated',
        label: 'Escalated requests',
        count: 8,
        content: '8 escalated requests.',
      },
      {
        value: 'archived',
        label: 'Archived records',
        disabled: true,
        content: 'Archive access requires the workspace manager role.',
      },
      {
        value: 'resolved',
        label: 'Recently resolved',
        count: 86,
        content: '86 records were resolved in the last 24 hours.',
      },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 440 }}>
        <Story />
      </div>
    ),
  ],
};
function ControlledTabs() {
  const [value, setValue] = useState('review');
  return (
    <>
      <Tabs
        items={items}
        value={value}
        onValueChange={setValue}
        variant="pill"
        label="Controlled record views"
      />
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Active view: {items.find((item) => item.value === value)?.label}
      </p>
    </>
  );
}
export const Controlled: Story = { render: () => <ControlledTabs /> };
