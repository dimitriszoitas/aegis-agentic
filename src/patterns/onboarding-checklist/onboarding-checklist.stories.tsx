import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
import { Button } from '@/components/button';
import {
  OnboardingChecklist,
  type OnboardingChecklistProps,
  type OnboardingStep,
} from './onboarding-checklist';
const steps: OnboardingStep[] = [
  {
    id: 'profile',
    title: 'Add your workspace details',
    description: 'Set a name and a short description for your team.',
    completed: true,
  },
  {
    id: 'team',
    title: 'Add your first team member',
    description: 'Invite someone to collaborate on the sample workspace.',
    completed: false,
  },
  {
    id: 'project',
    title: 'Create a project',
    description: 'Organize your first milestone and its owner.',
    completed: false,
  },
  {
    id: 'notifications',
    title: 'Choose notification preferences',
    description: 'Decide which updates matter to you.',
    completed: false,
    optional: true,
  },
];
function Example(args: OnboardingChecklistProps) {
  const [items, setItems] = useState(args.items);
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState('');
  return (
    <div style={{ maxWidth: 620 }}>
      {visible ? (
        <OnboardingChecklist
          {...args}
          items={items.map((item) =>
            item.id === 'project'
              ? {
                  ...item,
                  actionLabel: 'Create locally',
                  onAction: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 180));
                    setItems((current) =>
                      current.map((step) =>
                        step.id === 'project' ? { ...step, completed: true } : step,
                      ),
                    );
                    setMessage('A local sample project was created.');
                  },
                }
              : item,
          )}
          onCompletedChange={(id, completed) =>
            setItems((current) =>
              current.map((item) => (item.id === id ? { ...item, completed } : item)),
            )
          }
          onReset={() => {
            setItems(steps.map((item) => ({ ...item, completed: false })));
            requestAnimationFrame(() =>
              document
                .getElementById('sample-checklist')
                ?.querySelector<HTMLButtonElement>('[role=checkbox]')
                ?.focus(),
            );
          }}
          onDismiss={() => {
            setVisible(false);
            requestAnimationFrame(() => document.getElementById('restore-checklist')?.focus());
          }}
          id="sample-checklist"
        />
      ) : (
        <Button id="restore-checklist" emphasis="secondary" onClick={() => setVisible(true)}>
          Restore checklist
        </Button>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
const meta = {
  id: 'patterns-onboardingchecklist',
  title: 'Patterns/Workflows/OnboardingChecklist',
  component: OnboardingChecklist,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A controlled setup checklist with explicit completion, optional action callbacks, and progress. Async actions do not imply completion; the application updates the items after its work succeeds. Optional steps are labeled and included in the displayed total.',
      },
    },
  },
  args: { items: steps },
  render: (args) => <Example {...args} />,
} satisfies Meta<typeof OnboardingChecklist>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Interactive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const team = canvas.getByRole('checkbox', { name: 'Add your first team member' });
    team.focus();
    await userEvent.keyboard(' ');
    await expect(team).toBeChecked();
    await expect(canvas.getByRole('progressbar', { name: 'Workspace setup' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Create locally' }));
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Create a project' })).toBeChecked(),
    );
    await userEvent.click(
      canvas.getByRole('checkbox', { name: /Choose notification preferences/ }),
    );
    await expect(canvas.getByText('Your workspace is ready.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse checklist' }));
    await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Expand checklist' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Start again' }));
    await waitFor(() =>
      expect(canvas.getByRole('checkbox', { name: 'Add your workspace details' })).toHaveFocus(),
    );
  },
};
export const Complete: Story = {
  args: { items: steps.map((item) => ({ ...item, completed: true })) },
};
export const Collapsed: Story = { args: { defaultCollapsed: true } };
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { items: [] } };
export const Error: Story = {
  args: { error: 'Setup steps could not be loaded.' },
  render: function ErrorDemo(args) {
    const [error, setError] = useState(args.error);
    return <Example {...args} error={error} onRetry={() => setError(undefined)} />;
  },
};
export const FailedAction: Story = {
  render: (args) => (
    <OnboardingChecklist
      {...args}
      items={[
        {
          id: 'connect',
          title: 'Connect a workspace',
          description: 'The local example returns an error so the retry state can be reviewed.',
          completed: false,
          actionLabel: 'Connect',
          onAction: async () => {
            throw new globalThis.Error('The connection could not be completed. Try again.');
          },
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }));
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'The connection could not be completed',
    );
    await expect(canvas.getByRole('checkbox', { name: 'Connect a workspace' })).not.toBeChecked();
  },
};
