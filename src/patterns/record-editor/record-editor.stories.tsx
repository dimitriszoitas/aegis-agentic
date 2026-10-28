import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { RecordEditor, type RecordEditorProps } from './record-editor';
import { recordEditorAnatomy } from '@/stories/component-docs/anatomy/record-editor';
type Contact = { name: string };
const sample: Contact = { name: 'Alex Morgan' };
const defaults: RecordEditorProps<Contact> = {
  recordId: 'local-contact',
  record: sample,
  version: 1,
  title: 'Contact',
  createDraft: (record) => ({ ...record }),
  isEqual: (a, b) => a.name === b.name,
  renderView: (record) => <p>{record.name}</p>,
  renderFields: ({ draft, onDraftChange, disabled }) => (
    <Field label="Name">
      <TextInput
        name="name"
        required
        value={draft.name}
        disabled={disabled}
        onValueChange={(name) => onDraftChange({ name })}
      />
    </Field>
  ),
  onSave: async (record, operation) => ({ record, version: Number(operation.expectedVersion) + 1 }),
  onDelete: async () => {},
};
const meta = {
  id: 'patterns-recordeditor',
  title: 'Patterns/Workflows/RecordEditor',
  component: RecordEditor<Contact>,
  tags: ['autodocs'],
  args: {
    ...defaults,
    disabled: false,
    editLabel: 'Edit',
    saveLabel: 'Save changes',
    cancelLabel: 'Cancel editing',
    deleteLabel: 'Delete record',
    reloadLabel: 'Reload latest version',
  },
  argTypes: {
    title: { control: 'text' },
    disabled: { control: 'boolean' },
    editLabel: { control: 'text' },
    saveLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    deleteLabel: { control: 'text' },
    reloadLabel: { control: 'text' },
    record: { control: false },
    version: { control: false },
    recordId: { control: false },
    createDraft: { control: false },
    isEqual: { control: false },
    renderView: { control: false },
    renderFields: { control: false },
    onSave: { control: false },
    onDelete: { control: false },
    onDeleted: { control: false },
  },
} satisfies Meta<typeof RecordEditor<Contact>>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export function RecordEditorExample() {
  const [record, setRecord] = useState(sample);
  const [version, setVersion] = useState(1);
  const [fail, setFail] = useState(true);
  return (
    <div className="stack">
      <Button
        onClick={() => {
          setRecord({ name: 'Server revision' });
          setVersion((v) => v + 1);
        }}
      >
        Simulate remote change
      </Button>
      <RecordEditor
        {...defaults}
        record={record}
        version={version}
        onSave={async (draft, operation) => {
          if (fail) {
            setFail(false);
            throw new Error('Local save failed. Try again.');
          }
          if (operation.expectedVersion !== version) throw new Error('Version conflict');
          const next = version + 1;
          setRecord(draft);
          setVersion(next);
          return { record: draft, version: next };
        }}
      />
    </div>
  );
}
export const SaveFailureAndConflict: Story = {
  render: () => <RecordEditorExample />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole('button', { name: 'Edit' }));
    const input = c.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Sam Rivera');
    await userEvent.click(c.getByRole('button', { name: 'Save changes' }));
    await expect(c.getByRole('alert')).toHaveTextContent('Local save failed');
    await expect(input).toHaveValue('Sam Rivera');
    await userEvent.click(c.getByRole('button', { name: 'Save changes' }));
    await expect(c.getByText('Sam Rivera', { exact: true })).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Edit' }));
    await userEvent.clear(c.getByRole('textbox', { name: 'Name' }));
    await userEvent.type(c.getByRole('textbox', { name: 'Name' }), 'Local draft');
    await userEvent.click(c.getByRole('button', { name: 'Simulate remote change' }));
    await expect(c.getByRole('textbox', { name: 'Name' })).toHaveValue('Local draft');
    await expect(c.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await userEvent.click(c.getByRole('button', { name: 'Reload latest version' }));
    await userEvent.click(
      within(body.getByRole('alertdialog')).getByRole('button', { name: 'Reload latest version' }),
    );
    await expect(c.getByRole('textbox', { name: 'Name' })).toHaveValue('Server revision');
  },
};
export const Anatomy: Story = { render: () => <>{recordEditorAnatomy.render()}</> };
