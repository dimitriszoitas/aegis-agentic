import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Fingerprint, Folder, Globe, Monitor, Server } from '@/components/icon';
import { TreeView, type TreeViewItem } from './tree-view';

const records: TreeViewItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: <Monitor size={16} />,
    count: 1248,
    children: [
      {
        id: 'experience',
        label: 'Customer experience',
        icon: <Folder size={16} />,
        count: 862,
        children: [
          { id: 'ath', label: 'Customer portal', icon: <Monitor size={16} />, count: 428 },
          { id: 'lon', label: 'Account settings', icon: <Monitor size={16} />, count: 434 },
        ],
      },
      {
        id: 'platform',
        label: 'Platform delivery',
        icon: <Folder size={16} />,
        count: 386,
        children: [
          { id: 'prod', label: 'Billing workspace', icon: <Server size={16} />, count: 386 },
          {
            id: 'offline',
            label: 'Archived migration',
            description: 'Project archived',
            disabled: true,
            icon: <Server size={16} />,
            count: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: <Fingerprint size={16} />,
    count: 672,
    children: [
      { id: 'northstar', label: 'Northstar Labs', count: 512 },
      { id: 'atlas', label: 'Atlas Commerce', count: 160 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <Globe size={16} />,
    count: 2840,
    children: [
      { id: 'invoices', label: 'Invoices', count: 2201 },
      { id: 'subscriptions', label: 'Subscriptions', count: 639 },
    ],
  },
];
const meta = {
  id: 'components-forms-treeview',
  title: 'Components/Inputs & Selection/TreeView',
  component: TreeView,
  tags: ['autodocs'],
  args: { label: 'Workspace records', items: records },
  parameters: {
    docs: {
      description: {
        component:
          'Stores selected leaf IDs and derives parent checked/mixed state. Selecting a branch affects enabled descendants only. Arrow keys navigate and expand/collapse; Home/End jump; Space/Enter toggle; typing searches visible labels; * expands siblings; Control/Command+A selects all enabled leaves. Selection and expansion each support controlled and uncontrolled state.',
      },
    },
  },
} satisfies Meta<typeof TreeView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <TreeView label="Collapsed records" items={records} />
      <TreeView
        label="Partially selected records"
        items={records}
        defaultExpandedIds={['projects', 'experience']}
        defaultSelectedIds={['ath']}
      />
      <TreeView
        label="Selected projects branch"
        items={records}
        defaultExpandedIds={['projects', 'platform']}
        defaultSelectedIds={['ath', 'lon', 'prod']}
      />
      <TreeView
        label="Locked project scope"
        items={records}
        disabled
        defaultExpandedIds={['customers']}
        defaultSelectedIds={['northstar']}
      />
    </div>
  ),
};
export const FullyExpanded: Story = {
  args: {
    defaultExpandedIds: ['projects', 'experience', 'platform', 'customers', 'finance'],
    defaultSelectedIds: ['ath', 'northstar'],
  },
};
export const Empty: Story = {
  args: { items: [], emptyLabel: 'No connected records match the current filters' },
};
export const KeyboardAndTriState: Story = {
  render: function ControlledTree() {
    const [selected, setSelected] = useState<string[]>(['ath']);
    const [expanded, setExpanded] = useState<string[]>(['projects', 'experience']);
    return (
      <div className="stack">
        <TreeView
          label="Workspace records"
          items={records}
          selectedIds={selected}
          onSelectedChange={setSelected}
          expandedIds={expanded}
          onExpandedChange={setExpanded}
        />
        <output aria-live="polite">{selected.length} records selected</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const projects = canvas.getByRole('treeitem', { name: 'Projects' });
    await expect(projects).toHaveAttribute('aria-checked', 'mixed');
    projects.focus();
    await userEvent.keyboard(' ');
    await expect(projects).toHaveAttribute('aria-checked', 'true');
    await expect(canvas.getByText('3 records selected')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('treeitem', { name: 'Customer experience' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByRole('treeitem', { name: 'Customer experience' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await userEvent.keyboard('{ArrowLeft}');
    await expect(projects).toHaveFocus();
  },
};
