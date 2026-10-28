import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { InlineEdit } from './inline-edit';
import { inlineEditAnatomy } from '@/stories/component-docs/anatomy/inline-edit';
const meta = {
  id: 'components-forms-inlineedit',
  title: 'Components/Inputs & Selection/InlineEdit',
  component: InlineEdit,
  tags: ['autodocs'],
  args: { label: 'Project name', value: 'Atlas', onSave: () => {} },
} satisfies Meta<typeof InlineEdit>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: { disabled: false, readOnly: false, required: true, emptyText: 'Not set' },
  argTypes: {
    value: { control: 'text' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    onSave: { control: false },
    validate: { control: false },
  },
  render: function Playground(args) {
    const [, updateArgs] = useArgs();
    return <InlineEdit {...args} onSave={(value) => updateArgs({ value })} />;
  },
};
export const DraftLifecycle: Story = {
  render: function Lifecycle() {
    const [value, setValue] = useState('Atlas');
    return (
      <InlineEdit
        label="Project name"
        value={value}
        onSave={setValue}
        validate={(draft) => (draft.length < 3 ? 'Use at least three characters.' : undefined)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Edit Project name' }));
    const input = c.getByRole('textbox', { name: 'Project name' });
    await expect(input).toHaveFocus();
    await userEvent.clear(input);
    await userEvent.type(input, 'No{Enter}');
    await expect(c.getByText('Use at least three characters.')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(c.getByText('Atlas')).toBeVisible();
    await expect(c.getByRole('button', { name: 'Edit Project name' })).toHaveFocus();
    await userEvent.click(c.getByRole('button', { name: 'Edit Project name' }));
    await userEvent.clear(c.getByRole('textbox'));
    await userEvent.type(c.getByRole('textbox'), 'Orion{Enter}');
    await expect(c.getByText('Orion')).toBeVisible();
    await expect(c.queryByRole('textbox')).not.toBeInTheDocument();
  },
};
export const AsyncFailureAndConflict: Story = {
  render: function AsyncExample() {
    const [value, setValue] = useState('Atlas');
    const [fail, setFail] = useState(true);
    return (
      <div className="stack">
        <InlineEdit
          label="Project"
          value={value}
          onSave={async (next) => {
            if (fail) throw new Error('Example unavailable');
            setValue(next);
          }}
        />
        <Button onClick={() => setFail(false)}>Allow save</Button>
        <Button onClick={() => setValue('Server update')}>External update</Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Edit Project' }));
    await userEvent.clear(c.getByRole('textbox'));
    await userEvent.type(c.getByRole('textbox'), 'Draft');
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
    await expect(c.getByText('Could not save. Try again.')).toBeVisible();
    await expect(c.getByRole('textbox')).toHaveValue('Draft');
    await userEvent.click(c.getByRole('button', { name: 'Allow save' }));
    await userEvent.click(c.getByRole('button', { name: 'External update' }));
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
    await expect(
      c.getByText('This value changed while you were editing. Cancel and edit the latest value.'),
    ).toBeVisible();
    await userEvent.click(c.getByRole('button', { name: 'Cancel' }));
    await expect(c.getByText('Server update')).toBeVisible();
  },
};
export const Anatomy: Story = { render: () => <>{inlineEditAnatomy.render()}</> };
