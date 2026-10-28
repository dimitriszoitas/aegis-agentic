import { useRef, useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { PasswordInput } from './password-input';
import { passwordInputAnatomy } from '@/stories/component-docs/anatomy/password-input';

const meta = {
  id: 'components-forms-passwordinput',
  title: 'Components/Inputs & Selection/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  args: { label: 'Password', autoComplete: 'current-password' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    prefix: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A native password field built on TextInput, with an accessible Show password / Hide password action. It starts concealed. Read-only values remain revealable; a disabled Field disables the input and reveal action. The button never submits the form, changes the value or moves focus. Controlled/uncontrolled values, native input properties, both change callbacks and the public input ref retain TextInput behavior. Supply current-password or new-password autocomplete to match the task; no strength checking, authentication or secure storage is provided.',
      },
    },
  },
} satisfies Meta<typeof PasswordInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const States: Story = {
  render: () => (
    <div className="story-grid">
      <PasswordInput label="Current password" name="password" autoComplete="current-password" />
      <Field
        label="New password"
        helpText="Use a unique password."
        error="Enter a longer password."
      >
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          defaultValue="demo"
          required
        />
      </Field>
      <Field label="Disabled password" disabled helpText="The account is managed elsewhere.">
        <PasswordInput defaultValue="example-only" />
      </Field>
      <PasswordInput label="Read-only example" defaultValue="example-only" readOnly />
    </div>
  ),
};

export const Anatomy: Story = {
  render: () => <>{passwordInputAnatomy.render()}</>,
  parameters: {
    docs: {
      description: {
        story:
          'Populated anatomy specimen: Field label and requirement, optional key prefix, native input, visibility action, help text and validation feedback. The canonical anatomy definition identifies each actual DOM part for the shared annotation view.',
      },
    },
  },
};

export const KeyboardAndForm: Story = {
  render: function KeyboardFormExample() {
    const input = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState('');
    const [changes, setChanges] = useState(0);
    const [submissions, setSubmissions] = useState(0);
    const [submittedLength, setSubmittedLength] = useState(0);
    return (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSubmittedLength(String(data.get('password') ?? '').length);
          setSubmissions((count) => count + 1);
        }}
      >
        <Field label="Account password" helpText="Example form; no credentials are sent.">
          <PasswordInput
            ref={input}
            name="password"
            autoComplete="current-password"
            value={value}
            onValueChange={setValue}
            onChange={() => setChanges((count) => count + 1)}
          />
        </Field>
        <Button onClick={() => input.current?.focus()}>Focus password</Button>
        <Button type="submit">Continue</Button>
        <p role="status">
          {changes} native changes; {submissions} submissions; {submittedLength} submitted
          characters
        </p>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Account password');
    await expect(input).toHaveAttribute('type', 'password');
    await userEvent.type(input, 'sample');
    await expect(input).toHaveValue('sample');
    await expect(canvas.getByRole('status')).toHaveTextContent('6 native changes; 0 submissions');
    await userEvent.click(canvas.getByRole('button', { name: 'Focus password' }));
    await expect(input).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Show password' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveValue('sample');
    await expect(canvas.getByRole('button', { name: 'Hide password' })).toHaveFocus();
    await expect(canvas.getByRole('status')).toHaveTextContent('6 native changes; 0 submissions');
    await userEvent.keyboard(' ');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(canvas.getByRole('button', { name: 'Show password' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '1 submissions; 6 submitted characters',
    );
  },
};

export const ReadOnlyReveal: Story = {
  args: { label: 'Read-only password', defaultValue: 'example-only', readOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Read-only password');
    await expect(input).toHaveAttribute('readonly');
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'changed');
    await expect(input).toHaveValue('example-only');
  },
};

export const UncontrolledEntry: Story = {
  args: { label: 'New password', defaultValue: 'sample', autoComplete: 'new-password' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('New password');
    await userEvent.type(input, '-only');
    await userEvent.click(canvas.getByRole('button', { name: 'Show password' }));
    await expect(input).toHaveValue('sample-only');
    await expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Hide password' }));
    await expect(input).toHaveValue('sample-only');
    await expect(input).toHaveAttribute('type', 'password');
  },
};

export const Playground: Story = {
  args: {
    label: 'Password',
    value: '',
    defaultValue: undefined,
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
    size: 'md',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: false,
    showPasswordLabel: 'Show password',
    hidePasswordLabel: 'Hide password',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    autoComplete: { control: 'inline-radio', options: ['current-password', 'new-password', 'off'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    showPasswordLabel: { control: 'text' },
    hidePasswordLabel: { control: 'text' },
  },
  render: function PasswordInputPlayground(args) {
    const [, updateArgs] = useArgs();
    return (
      <PasswordInput
        {...args}
        defaultValue={undefined}
        onValueChange={(value) => updateArgs({ value })}
      />
    );
  },
};
