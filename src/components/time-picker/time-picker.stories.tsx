import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TimePicker } from './time-picker';
import { timePickerAnatomy } from '@/stories/component-docs/anatomy/time-picker';
const meta = {
  id: 'components-forms-timepicker',
  title: 'Components/Inputs & Selection/TimePicker',
  component: TimePicker,
  tags: ['autodocs'],
  args: { label: 'Opening time', value: '09:30' },
  parameters: {
    docs: {
      description: {
        component:
          'Enter a local time without a date or time zone. Native controls own localization, keyboard segments and constraints.',
      },
    },
  },
} satisfies Meta<typeof TimePicker>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: { size: 'md', disabled: false, readOnly: false, required: false, invalid: false, step: 60 },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    step: { control: 'number' },
    min: { control: 'text' },
    max: { control: 'text' },
  },
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    return (
      <TimePicker
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{timePickerAnatomy.render()}</> };
export const NativeForm: Story = {
  render: function Example() {
    const [value, setValue] = useState('09:30');
    const [saved, setSaved] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(String(new FormData(e.currentTarget).get('value')));
        }}
      >
        <Field label="Opening time" helpText="Native local value; the host owns scheduling rules.">
          <TimePicker name="value" value={value} onValueChange={setValue} required />
        </Field>
        <TimePicker label="Read-only value" defaultValue="09:30" readOnly />
        <TimePicker label="Disabled value" disabled />
        <Button onClick={() => setValue('14:45')}>Set afternoon value</Button>
        <Button type="submit">Save value</Button>
        <output aria-label="Form result">{saved}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Opening time');
    await expect(input).toHaveValue('09:30');
    await expect(input).toHaveAttribute('type', 'time');
    await userEvent.click(canvas.getByRole('button', { name: 'Set afternoon value' }));
    await expect(input).toHaveValue('14:45');
    await userEvent.click(canvas.getByRole('button', { name: 'Save value' }));
    await expect(canvas.getByLabelText('Form result')).toHaveTextContent('14:45');
    await expect(canvas.getByLabelText('Read-only value')).toHaveAttribute('readonly');
    await expect(canvas.getByLabelText('Disabled value')).toBeDisabled();
  },
};
