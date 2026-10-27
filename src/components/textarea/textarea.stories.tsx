import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Textarea } from './textarea';
import { Field } from '@/components/field';

const notes =
  'The customer portal redesign is ready for review. Confirm the onboarding flow, account settings, and billing requirements with the customer team before scheduling the next milestone.';
const meta = {
  id: 'components-forms-textarea',
  title: 'Components/Inputs & Selection/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: { label: 'Project notes', defaultValue: notes },
  parameters: {
    docs: {
      description: {
        component:
          'A multiline field with optional automatic growth bounded by maxRows and an accessible character counter. Native maxLength limits user input; counts use the same UTF-16 length as HTML.',
      },
    },
  },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <Textarea label="Project notes" defaultValue={notes} />
      <Textarea
        label="Review summary"
        placeholder="Record the decisions and next steps for the project."
        showCount
        maxLength={500}
      />
      <Textarea
        label="Project rationale"
        defaultValue={notes}
        showCount
        maxLength={500}
        autoGrow
        rows={2}
        maxRows={8}
      />
      <Field label="Resolution reason" required error="Explain why this record can be closed.">
        <Textarea defaultValue="" showCount maxLength={300} />
      </Field>
      <Textarea
        label="Archived notes"
        disabled
        defaultValue="This project was archived on 6 October 2026."
      />
      <Textarea
        label="Audit record"
        readOnly
        defaultValue="Katerina Nikolaou assigned the project to the customer experience team."
      />
    </div>
  ),
};

export const AutoGrowAndCounter: Story = {
  render: function GrowingExample() {
    const [value, setValue] = useState('');
    return (
      <Textarea
        label="Member handoff"
        value={value}
        onValueChange={setValue}
        autoGrow
        rows={2}
        maxRows={5}
        maxLength={280}
        showCount
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Member handoff' });
    await userEvent.type(input, 'Review project PRJ-0042.');
    await expect(input).toHaveValue('Review project PRJ-0042.');
    await expect(canvas.getByText('24 / 280 characters')).toBeInTheDocument();
  },
};

export const Playground: Story = {
  args: {
    label: 'Project notes',
    value: 'Review the onboarding flow with the customer team.',
    defaultValue: undefined,
    placeholder: 'Add a note',
    size: 'md',
    appearance: 'default',
    rows: 3,
    maxRows: 8,
    maxLength: 280,
    showCount: true,
    autoGrow: false,
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
    appearance: { control: 'inline-radio', options: ['default', 'plain'] },
    rows: { control: { type: 'number', min: 1, max: 12, step: 1 } },
    maxRows: { control: { type: 'number', min: 1, max: 20, step: 1 } },
    maxLength: { control: { type: 'number', min: 1, max: 2000, step: 1 } },
    showCount: { control: 'boolean' },
    autoGrow: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  render: function TextareaPlayground(args) {
    const [, updateArgs] = useArgs();
    return (
      <Textarea
        {...args}
        defaultValue={undefined}
        onValueChange={(value) => updateArgs({ value })}
      />
    );
  },
};
