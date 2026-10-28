import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { UnsavedNavigationGuard } from './unsaved-navigation-guard';
import { unsavedNavigationGuardAnatomy } from '@/stories/component-docs/anatomy/unsaved-navigation-guard';
const meta = {
  id: 'patterns-unsavednavigationguard',
  title: 'Patterns/Workflows/UnsavedNavigationGuard',
  component: UnsavedNavigationGuard,
  tags: ['autodocs'],
  args: {
    dirty: true,
    beforeUnload: true,
    title: 'Discard unsaved changes?',
    description: 'Your changes have not been saved.',
    leaveLabel: 'Discard and leave',
    stayLabel: 'Keep editing',
    children: () => null,
  },
  argTypes: {
    dirty: { control: 'boolean' },
    beforeUnload: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    leaveLabel: { control: 'text' },
    stayLabel: { control: 'text' },
    children: { control: false },
    onDiscard: { control: false },
  },
  render: function GuardPlayground(args) {
    const [, updateArgs] = useArgs();
    const [route, setRoute] = useState('Editor');
    return (
      <UnsavedNavigationGuard {...args} onDiscard={() => updateArgs({ dirty: false })}>
        {({ requestNavigation, pending }) => (
          <div className="stack">
            <p role="status">Local route: {route}</p>
            <Button
              disabled={pending}
              onClick={() => void requestNavigation(() => setRoute('Overview'))}
            >
              Open overview
            </Button>
          </div>
        )}
      </UnsavedNavigationGuard>
    );
  },
} satisfies Meta<typeof UnsavedNavigationGuard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export function NavigationGuardExample() {
  const [draft, setDraft] = useState('');
  const [route, setRoute] = useState('Editor');
  return (
    <UnsavedNavigationGuard dirty={!!draft} onDiscard={() => setDraft('')}>
      {({ requestNavigation, pending }) => (
        <div className="stack">
          <TextInput label="Unsaved note" value={draft} onValueChange={setDraft} />
          <p role="status">Local route: {route}</p>
          <Button
            disabled={pending}
            onClick={() => void requestNavigation(() => setRoute('Overview'))}
          >
            Open overview
          </Button>
        </div>
      )}
    </UnsavedNavigationGuard>
  );
}
export const ConfirmOrStay: Story = {
  render: () => <NavigationGuardExample />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const input = c.getByRole('textbox', { name: 'Unsaved note' });
    await userEvent.type(input, 'Keep me');
    const navigate = c.getByRole('button', { name: 'Open overview' });
    await userEvent.click(navigate);
    await expect(body.getByRole('alertdialog')).toBeVisible();
    await userEvent.click(body.getByRole('button', { name: 'Keep editing' }));
    await expect(input).toHaveValue('Keep me');
    await expect(c.getByRole('status')).toHaveTextContent('Editor');
    await userEvent.click(navigate);
    await userEvent.click(body.getByRole('button', { name: 'Discard and leave' }));
    await expect(c.getByRole('status')).toHaveTextContent('Overview');
    await expect(input).toHaveValue('');
  },
};
export const Anatomy: Story = { render: () => <>{unsavedNavigationGuardAnatomy.render()}</> };
