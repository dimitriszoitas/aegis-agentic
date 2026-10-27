import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import {
  NotificationCenter,
  type NotificationCenterItem,
  type NotificationCenterProps,
} from './notification-center';
const now = Date.parse('2026-10-24T12:00:00Z');
const items: NotificationCenterItem[] = [
  {
    id: 'project',
    title: 'Project approved',
    description: 'Maya approved the customer portal scope.',
    timestamp: '2026-10-24T11:55:00Z',
    read: false,
    intent: 'success',
  },
  {
    id: 'invoice',
    title: 'Invoice due tomorrow',
    description: 'Invoice INV-2026-024 is ready for a payment reminder.',
    timestamp: '2026-10-24T11:30:00Z',
    read: false,
    intent: 'warning',
  },
  {
    id: 'summary',
    title: 'Weekly summary ready',
    description: 'Aegis AI prepared a draft from your workspace updates.',
    timestamp: '2026-10-24T10:45:00Z',
    read: true,
    intent: 'ai',
  },
];
function Example(args: NotificationCenterProps) {
  const [entries, setEntries] = useState(args.items);
  const [message, setMessage] = useState('');
  return (
    <>
      <NotificationCenter
        {...args}
        items={entries}
        onReadChange={(ids, read) =>
          setEntries((current) =>
            current.map((item) => (ids.includes(item.id) ? { ...item, read } : item)),
          )
        }
        onDismiss={(id) => setEntries((current) => current.filter((item) => item.id !== id))}
        onOpenItem={(item) => setMessage(`Opened ${item.title}.`)}
      />
      <p role="status">{message}</p>
    </>
  );
}
const meta = {
  id: 'patterns-notificationcenter',
  title: 'Patterns/Communication/NotificationCenter',
  component: NotificationCenter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      story: { inline: false, height: 640 },
      description: {
        component:
          'A notification inbox that slides in from the right. Search and All/Unread views stay local; read, dismiss and open callbacks let the host persist changes. Async callbacks are guarded and failures stay visible without removing the original notification.',
      },
    },
  },
  args: { items, now },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof NotificationCenter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Notifications, 2 unread' }));
    const dialog = page.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('tab', { name: /^Unread/ }));
    await expect(within(dialog).queryByText('Weekly summary ready')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Mark read' })[0]);
    await expect(within(dialog).queryByText('Project approved')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByRole('searchbox', { name: 'Search notifications' })).toHaveFocus(),
    );
    await userEvent.type(
      within(dialog).getByRole('searchbox', { name: 'Search notifications' }),
      'invoice',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Dismiss Invoice due tomorrow' }),
    );
    await expect(within(dialog).getByText('No matching notifications')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Notifications' })).toHaveFocus(),
    );
  },
};
export const OpenInbox: Story = { args: { defaultOpen: true } };
export const Empty: Story = { args: { items: [], defaultOpen: true } };
export const Loading: Story = { args: { items: [], defaultOpen: true, loading: true } };
export const Error: Story = {
  args: {
    defaultOpen: true,
    error: 'Updates could not be loaded. Try again when the connection is restored.',
  },
  render: function ErrorDemo(args) {
    const [error, setError] = useState(args.error);
    return <Example {...args} error={error} onRetry={() => setError(undefined)} />;
  },
};
export const FailedUpdate: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <NotificationCenter
      {...args}
      onReadChange={async () => {
        throw new globalThis.Error(
          'The update could not be saved. Your notifications are unchanged.',
        );
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole('button', { name: 'Mark all read' }));
    await expect(page.getByRole('alert')).toHaveTextContent('Your notifications are unchanged');
    await expect(page.getByText('2 unread')).toBeVisible();
  },
};
