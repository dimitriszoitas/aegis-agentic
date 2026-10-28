import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { DateTimePicker } from './date-time-picker';
import { dateTimePickerAnatomy } from '@/stories/component-docs/anatomy/date-time-picker';
const meta = {
  id: 'components-forms-datetimepicker',
  title: 'Components/Inputs & Selection/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
  args: { label: 'Appointment', value: '2027-04-12T09:30', timeZone: 'Europe/Athens' },
  parameters: {
    docs: {
      description: {
        component:
          'Enter an offset-free date/time with an explicit displayed zone policy. The host resolves daylight-saving ambiguity and persistence.',
      },
    },
  },
} satisfies Meta<typeof DateTimePicker>;
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
    timeZone: { control: 'select', options: ['local', 'Europe/Athens', 'America/New_York', 'UTC'] },
    timeZoneLabel: { control: 'text' },
  },
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    return (
      <DateTimePicker
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{dateTimePickerAnatomy.render()}</> };
export const NativeForm: Story = {
  render: function Example() {
    const [value, setValue] = useState('2027-04-12T09:30');
    const [saved, setSaved] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(String(new FormData(e.currentTarget).get('value')));
        }}
      >
        <Field label="Appointment" helpText="Native local value; the host owns scheduling rules.">
          <DateTimePicker
            name="value"
            value={value}
            onValueChange={setValue}
            timeZone="Europe/Athens"
            required
          />
        </Field>
        <DateTimePicker
          label="Read-only value"
          defaultValue="2027-04-12T09:30"
          timeZone="Europe/Athens"
          readOnly
        />
        <DateTimePicker label="Disabled value" timeZone="Europe/Athens" disabled />
        <Button onClick={() => setValue('2027-04-12T14:45')}>Set afternoon value</Button>
        <Button type="submit">Save value</Button>
        <output aria-label="Form result">{saved}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Appointment');
    await expect(input).toHaveValue('2027-04-12T09:30');
    await expect(input).toHaveAttribute('type', 'datetime-local');
    await userEvent.click(canvas.getByRole('button', { name: 'Set afternoon value' }));
    await expect(input).toHaveValue('2027-04-12T14:45');
    await userEvent.click(canvas.getByRole('button', { name: 'Save value' }));
    await expect(canvas.getByLabelText('Form result')).toHaveTextContent('2027-04-12T14:45');
    await expect(canvas.getByLabelText('Read-only value')).toHaveAttribute('readonly');
    await expect(canvas.getByLabelText('Disabled value')).toBeDisabled();
  },
};
