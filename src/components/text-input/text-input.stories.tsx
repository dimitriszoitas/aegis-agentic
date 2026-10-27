import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Globe, KeyRound, ShieldCheck, User } from '@/components/icon';
import { TextInput, type TextInputSize } from './text-input';
import { Field } from '@/components/field';

const meta = {
  id: 'components-forms-textinput',
  title: 'Components/Inputs & Selection/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  args: { label: 'Project name', defaultValue: 'Customer portal' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    prefix: { control: false },
    suffix: { control: false },
  },
} satisfies Meta<typeof TextInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="stack">
      {(['sm', 'md', 'lg'] as TextInputSize[]).map((size) => (
        <section key={size} className="stack">
          <h3>
            {size === 'sm' ? 'Small · 28px' : size === 'md' ? 'Medium · 34px' : 'Large · 40px'}
          </h3>
          <div className="story-grid">
            <TextInput label="Project name" size={size} defaultValue="Customer portal" />
            <TextInput
              label="Filter expression"
              size={size}
              placeholder="source:projects status:active"
            />
            <TextInput
              label="Member"
              size={size}
              defaultValue="k.nakamura"
              prefix={<User size={16} aria-hidden="true" />}
              clearable
            />
            <Field label="Source address" error="Enter an IPv4 or IPv6 address.">
              <TextInput
                size={size}
                defaultValue="185.220.101"
                prefix={<Globe size={16} aria-hidden="true" />}
              />
            </Field>
            <TextInput label="Managed project" size={size} defaultValue="PRJ-2026-0042" disabled />
            <TextInput
              label="Event identifier"
              size={size}
              defaultValue="EVT-2026-084721"
              readOnly
              suffix={<ShieldCheck size={16} aria-label="Verified event" />}
            />
          </div>
        </section>
      ))}
    </div>
  ),
};

export const PrefixAndSuffix: Story = {
  render: () => (
    <div className="story-grid">
      <TextInput
        label="Workspace URL"
        prefix="https://"
        defaultValue="ingest.aegis.internal"
        suffix="/v1/events"
      />
      <TextInput
        label="API token"
        type="password"
        prefix={<KeyRound size={16} aria-hidden="true" />}
        defaultValue="aegis_local_demo_token"
        autoComplete="off"
      />
      <TextInput
        label="Retention period"
        type="number"
        defaultValue="90"
        min={1}
        max={365}
        suffix="days"
      />
    </div>
  ),
};

export const Clearable: Story = {
  render: function ClearableExample() {
    const [value, setValue] = useState('Customer portal');
    return (
      <div className="stack">
        <TextInput
          label="Project name"
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          clearable
        />
        <output aria-live="polite">
          {value ? `Filtering project: ${value}` : 'All projects included'}
        </output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear input' }));
    await expect(canvas.getByRole('textbox', { name: 'Project name' })).toHaveValue('');
    await expect(canvas.getByRole('textbox', { name: 'Project name' })).toHaveFocus();
    await expect(canvas.getByText('All projects included')).toBeInTheDocument();
  },
};

export const Playground: Story = {
  args: {
    label: 'Project name',
    value: 'Customer portal',
    defaultValue: undefined,
    placeholder: 'Name this project',
    size: 'md',
    type: 'text',
    clearable: true,
    prefix: '',
    suffix: '',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    type: { control: 'select', options: ['text', 'email', 'url', 'password', 'number'] },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: function TextInputPlayground(args) {
    const [, updateArgs] = useArgs();
    return (
      <TextInput
        {...args}
        defaultValue={undefined}
        onValueChange={(value) => updateArgs({ value })}
      />
    );
  },
};
