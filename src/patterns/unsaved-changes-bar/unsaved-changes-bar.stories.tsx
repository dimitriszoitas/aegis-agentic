import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { TextInput } from '@/components/text-input';
import { UnsavedChangesBar, type UnsavedChangesBarProps } from './unsaved-changes-bar';
const meta = {
  id: 'patterns-unsavedchangesbar',
  title: 'Patterns/Workflows/UnsavedChangesBar',
  component: UnsavedChangesBar,
  tags: ['autodocs'],
  args: { dirty: true, onSave: async () => {}, onDiscard: () => {} },
} satisfies Meta<typeof UnsavedChangesBar>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
function EditableFormExample(args: UnsavedChangesBarProps) {
  const [saved, setSaved] = useState('Customer portal'),
    [draft, setDraft] = useState('Customer portal');
  const field = useRef<HTMLInputElement>(null);
  return (
    <div className="stack">
      <TextInput ref={field} label="Project name" value={draft} onValueChange={setDraft} />
      <UnsavedChangesBar
        {...args}
        dirty={draft !== saved}
        onSave={async () => {
          await new Promise((resolve) => setTimeout(resolve, 300));
          setSaved(draft);
          field.current?.focus();
        }}
        onDiscard={() => {
          setDraft(saved);
          field.current?.focus();
        }}
      />
      <p role="status">Saved name: {saved}</p>
    </div>
  );
}
export const EditableForm: StoryObj<typeof meta> = {
  render: (args) => <EditableFormExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByRole('textbox', { name: 'Project name' }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Project name' }),
      'Workspace refresh',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(await canvas.findByText('Saved name: Workspace refresh')).toBeVisible();
  },
};
export const SaveFailure: StoryObj<typeof meta> = {
  args: {
    onSave: async () => {
      throw new Error('The service is unavailable. Your changes are still here.');
    },
  },
};
