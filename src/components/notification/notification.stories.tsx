import { useEffect, useId, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/button';
import {
  Notification,
  NotificationViewport,
  dismissNotification,
  showNotification,
  type NotificationProps,
} from './index';

const examples = [
  {
    intent: 'info',
    title: 'New project updates are available',
    description: '6 project updates were added to REC-00842.',
  },
  {
    intent: 'success',
    title: 'Workflow enabled',
    description: 'The customer portal workflow is now available to the project team.',
  },
  {
    intent: 'warning',
    title: 'Data sync is delayed',
    description: 'Identity events are arriving 8 minutes behind schedule.',
  },
  {
    intent: 'destroy',
    title: 'Workflow validation failed',
    description: 'Add a condition before enabling this workflow.',
  },
  {
    intent: 'ai',
    title: 'AI summary is ready',
    description: 'Review the supporting details before taking action.',
  },
  {
    intent: 'loading',
    title: 'Correlating event sources',
    description: 'Comparing project milestones and customer requirements.',
  },
] as const satisfies readonly NotificationProps[];

const meta = {
  id: 'components-feedback-notification',
  title: 'Components/Feedback/Notification',
  component: Notification,
  subcomponents: { NotificationViewport },
  tags: ['autodocs'],
  args: {
    variant: 'inline',
    intent: 'info',
    title: 'New data source connected',
    description: 'Customer records are now available in your workspace.',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['inline', 'floating'] },
    intent: { control: 'select', options: examples.map((example) => example.intent) },
  },
  parameters: {
    docs: {
      description: {
        component:
          'One notification family for inline feedback and floating messages. Inline notifications use a semantic outline with no background fill; floating notifications use a neutral surface. Use `action` for a labeled callback, `actions` for custom controls, and `onDismiss` for a dismiss button. The floating variant styles the message; `NotificationViewport` and `showNotification` place it above the application.\n\nMount one `NotificationViewport` per application shell, then call `showNotification`. Its action callback also dismisses that message. Loading notifications stay visible until replaced or dismissed; other notifications default to 5 seconds. `Banner`/`Callout` and `Toast`/`Toaster`/`showToast` remain compatibility APIs for the same family.\n\n| NotificationViewport prop | Type | Default / behavior |\n| --- | --- | --- |\n| position | top-left, top-center, top-right, bottom-left, bottom-center, bottom-right | bottom-right |\n| offset | number, string, or side-offset object | 12 |\n| gap | number | 12 |\n| visibleToasts | number | 4 |\n| duration | number | Sonner host timeout in milliseconds; individual calls may override it |\n| theme | light, dark, system | Optional host appearance; message content uses Aegis theme tokens |\n| expand / closeButton | boolean | Expand the stack / show a host close control |\n| hotkey | string[] | Keyboard shortcut that focuses the notification region |\n| containerAriaLabel | string | Accessible name for the notification region |\n| toastOptions | ToastOptions | Shared host settings; Aegis unstyled content remains enabled |\n| className / style | string / CSSProperties | Host presentation props |',
      },
    },
  },
} satisfies Meta<typeof Notification>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {};
export const InlineIntents: Story = {
  render: () => (
    <div className="stack" style={{ maxWidth: 840 }}>
      {examples.map((example) => (
        <Notification key={example.intent} {...example} />
      ))}
    </div>
  ),
};

function DismissibleDemo() {
  const [visible, setVisible] = useState(true);
  const [retried, setRetried] = useState(false);
  return (
    <div style={{ maxWidth: 800 }}>
      {visible ? (
        <Notification
          intent={retried ? 'success' : 'warning'}
          title={retried ? 'Connection restored' : 'CrowdStrike connector needs attention'}
          description={
            retried
              ? 'Event ingestion has resumed. The backlog will be processed automatically.'
              : 'The last synchronization failed 8 minutes ago. Existing event data is still available.'
          }
          actions={
            !retried && (
              <Button size="sm" emphasis="secondary" onClick={() => setRetried(true)}>
                Retry connection
              </Button>
            )
          }
          onDismiss={() => setVisible(false)}
        />
      ) : (
        <Button
          emphasis="ghost"
          onClick={() => {
            setVisible(true);
            setRetried(false);
          }}
        >
          Show connector notification
        </Button>
      )}
    </div>
  );
}
export const WithActionsAndDismiss: Story = {
  render: () => <DismissibleDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole('button', { name: 'Retry connection' });
    retry.focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByText('Connection restored')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss notification' }));
    await expect(canvas.queryByText('Connection restored')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Show connector notification' }));
    await expect(canvas.getByText('CrowdStrike connector needs attention')).toBeVisible();
  },
};
export const InlineCallout: Story = {
  args: {
    intent: 'ai',
    title: 'Member review required',
    description: undefined,
    children:
      'This proposed workflow change updates task ownership and milestone dates. Review the changes before applying them.',
    style: { maxWidth: 620 },
  },
};
export const Floating: Story = {
  args: {
    variant: 'floating',
    intent: 'success',
    title: 'Record assigned to Maya Chen',
    description: 'REC-00842 is ready for project.',
    style: { maxWidth: 400 },
  },
};
export const FloatingIntents: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-4)',
        maxWidth: 850,
      }}
    >
      {examples.map((example) => (
        <Notification key={example.intent} {...example} variant="floating" />
      ))}
    </div>
  ),
};

function LiveDemo({ undo = false }: { undo?: boolean }) {
  const toasterId = useId();
  const ids = useRef<(string | number)[]>([]);
  const [feedback, setFeedback] = useState('Notifications appear in the lower-right corner.');
  useEffect(
    () => () => {
      ids.current.forEach((id) => dismissNotification(id));
    },
    [],
  );
  const notify = (example: (typeof examples)[number]) => {
    ids.current.push(
      showNotification({
        ...example,
        toasterId,
        duration: Infinity,
        action:
          example.intent === 'loading'
            ? undefined
            : {
                label: 'Open project',
                onClick: () => setFeedback('Project REC-00842 opened.'),
              },
      }),
    );
  };
  return (
    <div className="stack">
      <NotificationViewport id={toasterId} />
      {undo ? (
        <Notification
          variant="floating"
          intent="success"
          title="Record marked as resolved"
          description="The resolution is saved in the project history."
          style={{ maxWidth: 400 }}
          action={{
            label: 'Undo resolution',
            onClick: () => {
              setFeedback('Resolution undone.');
              ids.current.push(
                showNotification({
                  title: 'Record reopened',
                  description: 'REC-00842 is ready for review.',
                  intent: 'info',
                  toasterId,
                  duration: Infinity,
                }),
              );
            },
          }}
        />
      ) : (
        <div className="row">
          {examples.map((example) => (
            <Button key={example.intent} emphasis="secondary" onClick={() => notify(example)}>
              Show{' '}
              {example.intent === 'destroy'
                ? 'error'
                : example.intent === 'ai'
                  ? 'AI summary'
                  : example.intent}
            </Button>
          ))}
        </div>
      )}
      <p role="status" className="muted">
        {feedback}
      </p>
    </div>
  );
}
const floatingDocs = { docs: { story: { inline: false, height: 560 } } };
export const LiveFloating: Story = {
  render: () => <LiveDemo />,
  parameters: floatingDocs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Show success' }));
    await expect(await body.findByText('Workflow enabled')).toBeVisible();
    await userEvent.click(body.getByRole('button', { name: 'Open project' }));
    await expect(canvas.getByText('Project REC-00842 opened.')).toBeVisible();
    await waitFor(() => expect(body.queryByText('Workflow enabled')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Show warning' }));
    await expect(await body.findByText('Data sync is delayed')).toBeVisible();
    const dismiss = body.getByRole('button', { name: 'Dismiss notification' });
    dismiss.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(body.queryByText('Data sync is delayed')).toBeNull());
  },
};
export const FloatingWithAction: Story = {
  render: () => <LiveDemo undo />,
  parameters: floatingDocs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Undo resolution' }));
    await expect(await body.findByText('Record reopened')).toBeVisible();
    await expect(canvas.getByText('Resolution undone.')).toBeVisible();
    await userEvent.click(body.getByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(body.queryByText('Record reopened')).toBeNull());
  },
};
