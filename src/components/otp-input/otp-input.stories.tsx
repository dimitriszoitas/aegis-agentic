import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { OtpInput } from './otp-input';
import { otpInputAnatomy } from '@/stories/component-docs/anatomy/otp-input';
const meta = {
  id: 'components-forms-otpinput',
  title: 'Components/Inputs & Selection/OtpInput',
  component: OtpInput,
  tags: ['autodocs'],
  args: { label: 'Verification code' },
  parameters: {
    docs: {
      description: {
        component:
          'One real input for a whole one-time code. Paste removes unsupported characters, native one-time-code autocomplete remains available, and length constrains the candidate. Completion does not submit, authenticate or consume a code.',
      },
    },
  },
} satisfies Meta<typeof OtpInput>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: {
    value: '',
    length: 6,
    mode: 'numeric',
    masked: false,
    size: 'md',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: true,
    placeholder: '123456',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    length: { control: { type: 'number', min: 1, max: 32 } },
    mode: { control: 'inline-radio', options: ['numeric', 'alphanumeric'] },
    masked: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  render: function PlaygroundExample(args) {
    const [, updateArgs] = useArgs();
    return (
      <OtpInput
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{otpInputAnatomy.render()}</> };
export const PasteAndForm: Story = {
  render: function Example() {
    const [value, setValue] = useState('');
    const [completed, setCompleted] = useState('');
    const [submitted, setSubmitted] = useState('');
    const [nativeChanges, setChanges] = useState(0);
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(String(new FormData(e.currentTarget).get('code')));
        }}
      >
        <Field label="Verification code" helpText="Use the six digits from your message.">
          <OtpInput
            name="code"
            value={value}
            onValueChange={setValue}
            onChange={() => setChanges((n) => n + 1)}
            onComplete={setCompleted}
            required
          />
        </Field>
        <OtpInput label="Read-only code" defaultValue="654321" readOnly />
        <Button type="submit">Verify candidate</Button>
        <Button onClick={() => setValue('')}>Clear from host</Button>
        <output aria-label="Completed candidate">{completed}</output>
        <output aria-label="Submitted code">{submitted}</output>
        <output aria-label="Native changes">{nativeChanges}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Verification code' });
    await userEvent.click(input);
    await userEvent.paste('12 34-56');
    await expect(input).toHaveValue('123456');
    await expect(canvas.getByLabelText('Completed candidate')).toHaveTextContent('123456');
    await expect(canvas.getByLabelText('Native changes')).toHaveTextContent('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Verify candidate' }));
    await expect(canvas.getByLabelText('Submitted code')).toHaveTextContent('123456');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear from host' }));
    await expect(input).toHaveValue('');
    await userEvent.type(input, '1a2b');
    await expect(input).toHaveValue('12');
    await userEvent.keyboard('{Backspace}');
    await expect(input).toHaveValue('1');
    await expect(canvas.getByRole('textbox', { name: 'Read-only code' })).toHaveAttribute(
      'readonly',
    );
  },
};
export const Alphanumeric: Story = {
  args: { mode: 'alphanumeric', length: 4, defaultValue: '', value: undefined },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Verification code' });
    await userEvent.click(input);
    await userEvent.paste('ab-9z');
    await expect(input).toHaveValue('AB9Z');
  },
};
