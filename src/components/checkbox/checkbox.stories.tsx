import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Checkbox } from './checkbox';
import { Field } from '@/components/field';

const meta = {
  id: 'components-forms-checkbox',
  title: 'Components/Inputs & Selection/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: { label: 'Include resolved records' },
  parameters: {
    docs: {
      description: {
        component:
          'Supports checked, unchecked and indeterminate states, keyboard Space, label clicks and native form submission. Controlled checked accepts boolean or "indeterminate".',
      },
    },
  },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <Checkbox label="Include resolved records" />
      <Checkbox
        label="Include identity events"
        defaultChecked
        description="Include customer updates alongside project activity."
      />
      <Checkbox label="Some severity levels selected" checked="indeterminate" />
      <Checkbox label="Include archived cases" disabled />
      <Checkbox label="Managed notifications enabled" disabled defaultChecked />
      <Checkbox label="Partially inherited permissions" disabled checked="indeterminate" />
      <Field
        label="Confirm review"
        required
        error="Review the details before approving this change."
      >
        <Checkbox />
      </Field>
    </div>
  ),
};

export const Compact: Story = {
  args: { size: 'sm' },
  render: () => (
    <div className="stack">
      <Checkbox size="sm" label="Include resolved records" />
      <Checkbox size="sm" label="Include identity events" defaultChecked />
      <Checkbox size="sm" label="Some severity levels selected" checked="indeterminate" />
      <Checkbox size="sm" label="Include archived cases" disabled />
    </div>
  ),
};

export const ReadOnlyAndDisabled: Story = {
  render: () => (
    <div className="stack">
      <Checkbox label="Unchecked read-only" readOnly />
      <Checkbox label="Checked read-only" readOnly defaultChecked />
      <Checkbox label="Unchecked disabled" disabled />
      <Checkbox label="Checked disabled" disabled defaultChecked />
      <Checkbox label="Editable checkbox" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const unchecked = canvas.getByRole('checkbox', { name: 'Unchecked read-only' });
    const checked = canvas.getByRole('checkbox', { name: 'Checked read-only' });
    for (const control of [unchecked, checked]) {
      await expect(control).toHaveAttribute('aria-readonly', 'true');
      await expect(control).not.toBeDisabled();
      await userEvent.click(control);
      await expect(control).toHaveFocus();
      await userEvent.keyboard(' ');
    }
    await userEvent.click(canvas.getByText('Unchecked read-only'));
    await userEvent.click(canvas.getByText('Checked read-only'));
    await expect(unchecked).not.toBeChecked();
    await expect(checked).toBeChecked();
    const disabled = canvas.getByRole('checkbox', { name: 'Unchecked disabled' });
    await expect(disabled).toBeDisabled();
    await expect(canvas.getByRole('checkbox', { name: 'Checked disabled' })).toBeChecked();
    checked.focus();
    await userEvent.tab();
    const editable = canvas.getByRole('checkbox', { name: 'Editable checkbox' });
    await expect(editable).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(editable).toBeChecked();
  },
};

export const SelectAll: Story = {
  render: function SelectAllExample() {
    const [selected, setSelected] = useState<string[]>(['critical']);
    const options = [
      { value: 'critical', label: 'Critical records' },
      { value: 'high', label: 'High severity records' },
      { value: 'medium', label: 'Medium severity records' },
    ];
    return (
      <div className="stack">
        <Checkbox
          label="Select all severity levels"
          checked={
            selected.length === options.length ? true : selected.length ? 'indeterminate' : false
          }
          onCheckedChange={(checked) =>
            setSelected(checked === true ? options.map(({ value }) => value) : [])
          }
        />
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) =>
              setSelected((current) =>
                checked
                  ? [...current, option.value]
                  : current.filter((value) => value !== option.value),
              )
            }
          />
        ))}
        <output aria-live="polite">{selected.length} severity levels included</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole('checkbox', { name: 'Select all severity levels' });
    await expect(all).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(all);
    await expect(all).toBeChecked();
    await expect(canvas.getByText('3 severity levels included')).toBeInTheDocument();
    await userEvent.keyboard(' ');
    await expect(all).not.toBeChecked();
  },
};

export const Playground: Story = {
  args: {
    label: 'Include completed projects',
    description: 'Show completed work in this view.',
    checked: false,
    size: 'md',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: false,
  },
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    checked: { control: 'select', options: [false, true, 'indeterminate'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: function CheckboxPlayground(args) {
    const [, updateArgs] = useArgs();
    return <Checkbox {...args} onCheckedChange={(checked) => updateArgs({ checked })} />;
  },
};
