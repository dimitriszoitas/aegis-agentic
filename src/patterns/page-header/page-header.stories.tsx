import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Plus } from '@/components/icon';
import { Tag } from '@/components/tag';
import { PageHeader } from './page-header';

const meta = {
  id: 'patterns-pageheader',
  title: 'Patterns/Page Structure/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  args: {
    title: 'Projects',
    description: 'Plan delivery, track progress, and keep the team aligned.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'A shared page-heading composition with optional breadcrumbs or a back destination, leading visual, metadata, actions, and content below. The default heading is h1; choose headingLevel to match the surrounding document. A back destination replaces breadcrumbs. Supply native links for navigation, buttons for actions, and the action component’s loading/disabled state for asynchronous work. On narrow screens, actions move below the title without changing keyboard order.',
      },
    },
  },
} satisfies Meta<typeof PageHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
export const WithBreadcrumbsAndActions: Story = {
  args: {
    breadcrumbs: [{ label: 'Workspace', href: '#workspace' }, { label: 'Projects' }],
    actions: (
      <>
        <Button emphasis="tertiary">Import</Button>
        <Button leadingIcon={<Plus size={16} />}>New project</Button>
      </>
    ),
    metadata: (
      <>
        <span>32 projects</span>
        <Tag intent="success">24 active</Tag>
      </>
    ),
  },
};
export const Detail: Story = {
  args: {
    title: 'Customer portal redesign',
    description: 'Atlas Commerce · Customer experience',
    back: { label: 'Projects', href: '#projects' },
    leading: <Avatar name="Atlas Commerce" size="lg" />,
    metadata: (
      <>
        <Tag variant="status" intent="function">
          In progress
        </Tag>
        <span>Owner: Alex Morgan</span>
        <code>PRJ-0042</code>
      </>
    ),
    actions: (
      <>
        <Button emphasis="tertiary">Share project</Button>
        <Button>Edit project</Button>
      </>
    ),
  },
};
export const NarrowAndLongTitle: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: 'Customer onboarding and account management redesign for Northstar Labs',
    description: 'Coordinate the next milestone with the customer and delivery teams.',
    back: { label: 'Projects', href: '#projects' },
    actions: (
      <>
        <Button emphasis="tertiary">Share</Button>
        <Button>Review changes</Button>
      </>
    ),
  },
};
export const NavigationAndActions: Story = {
  render: function Example() {
    const [view, setView] = useState('Project details');
    const [editing, setEditing] = useState(false);
    return (
      <div className="stack">
        <PageHeader
          title="Customer portal redesign"
          back={{ label: 'Projects', onClick: () => setView('Projects list selected') }}
          breadcrumbs={[{ label: 'Workspace', href: '#workspace' }, { label: 'Projects' }]}
          actions={
            <Button onClick={() => setEditing(!editing)}>
              {editing ? 'Done editing' : 'Edit project'}
            </Button>
          }
          metadata={<Tag variant="status">{editing ? 'Editing' : 'In progress'}</Tag>}
        />
        <p role="status">{view}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Customer portal redesign' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
    const back = canvas.getByRole('button', { name: 'Projects' });
    back.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Projects list selected');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Edit project' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('button', { name: 'Done editing' })).toHaveFocus();
    await expect(canvas.getByText('Editing')).toBeVisible();
  },
};
