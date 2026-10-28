import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { SortableList, type SortableListItem } from './sortable-list';
import { sortableListAnatomy } from '@/stories/component-docs/anatomy/sortable-list';
const items = [
  { id: 'discover', label: 'Discover', description: 'Understand the problem' },
  { id: 'design', label: 'Design', description: 'Explore solutions' },
  { id: 'deliver', label: 'Deliver', description: 'Ship and learn' },
];
const applyOrder = (current: readonly SortableListItem[], ids: string[]) =>
  ids.map((id) => current.find((item) => item.id === id)!);
const meta = {
  id: 'components-data-sortablelist',
  title: 'Components/Data Display/SortableList',
  component: SortableList,
  tags: ['autodocs'],
  args: { label: 'Project stages', items, onReorder: () => {} },
} satisfies Meta<typeof SortableList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: { disabled: false, emptyText: 'No stages' },
  argTypes: {
    items: { control: 'object' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    onReorder: { control: false },
    renderItem: { control: false },
  },
  render: function Playground(args) {
    const [, updateArgs] = useArgs();
    return (
      <SortableList
        {...args}
        onReorder={(ids) => updateArgs({ items: applyOrder(args.items, ids) })}
      />
    );
  },
};
export const KeyboardReorder: Story = {
  render: function KeyboardExample() {
    const [current, setCurrent] = useState<SortableListItem[]>(items);
    return (
      <SortableList
        label="Stages"
        items={current}
        onReorder={(ids) => setCurrent((before) => applyOrder(before, ids))}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const handle = c.getByRole('button', { name: 'Reorder Discover' });
    handle.focus();
    await userEvent.keyboard(' ', { delay: 30 });
    await userEvent.keyboard('{ArrowDown}', { delay: 30 });
    await userEvent.keyboard(' ', { delay: 30 });
    await expect(c.getAllByRole('listitem')[0]).toHaveAttribute('data-item-id', 'design');
    await expect(handle).toHaveFocus();
    await userEvent.keyboard(' ', { delay: 30 });
    await userEvent.keyboard('{ArrowDown}', { delay: 30 });
    await userEvent.keyboard('{Escape}');
    await expect(c.getAllByRole('listitem')[1]).toHaveAttribute('data-item-id', 'discover');
    await userEvent.click(c.getByRole('button', { name: 'Move Discover up' }));
    await expect(c.getAllByRole('listitem')[0]).toHaveAttribute('data-item-id', 'discover');
    await expect(c.getByRole('button', { name: 'Move Discover up' })).toBeDisabled();
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const Empty: Story = { args: { items: [] } };
export const Anatomy: Story = { render: () => <>{sortableListAnatomy.render()}</> };
