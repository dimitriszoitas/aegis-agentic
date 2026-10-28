import { useArgs } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { NumberInput } from './number-input';

const meta = {
  id: 'components-forms-numberinput',
  title: 'Components/Inputs & Selection/NumberInput',
  component: NumberInput,
  tags: ['autodocs'],
  args: { label: 'Seats', defaultValue: 4, locale: 'en-US' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    format: { control: false },
    hiddenInputRef: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Numeric entry with Base UI NumberField. Empty values are null; the displayed text is locale-aware while the form submits the raw number. Arrow Up/Down step, Shift uses largeStep, Alt uses smallStep, and Home/End use defined bounds. Steppers remain available to pointer/touch users and are omitted from the Tab sequence. Use Field for help and host-owned validation errors. Currency formatting is not financial arithmetic.',
      },
    },
  },
} satisfies Meta<typeof NumberInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    label: 'Seats',
    value: 4,
    defaultValue: undefined,
    placeholder: 'Enter a quantity',
    size: 'md',
    min: 0,
    max: 100,
    step: 1,
    smallStep: 0.1,
    largeStep: 10,
    showSteppers: true,
    decrementLabel: 'Decrease seats',
    incrementLabel: 'Increase seats',
    disabled: false,
    readOnly: false,
    invalid: false,
    required: false,
    snapOnStep: false,
    allowOutOfRange: false,
    allowWheelScrub: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'number' },
    defaultValue: { control: false },
    placeholder: { control: 'text' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    smallStep: { control: 'number' },
    largeStep: { control: 'number' },
    locale: { control: 'inline-radio', options: ['en-US', 'de-DE', 'fr-FR'] },
    showSteppers: { control: 'boolean' },
    decrementLabel: { control: 'text' },
    incrementLabel: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    snapOnStep: { control: 'boolean' },
    allowOutOfRange: { control: 'boolean' },
    allowWheelScrub: { control: 'boolean' },
  },
  render: function NumberInputPlayground(args) {
    const [, updateArgs] = useArgs();
    return (
      <NumberInput
        {...args}
        onValueChange={(value, details) => {
          args.onValueChange?.(value, details);
          if (!details.isCanceled) updateArgs({ value });
        }}
      />
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="story-grid">
      <NumberInput label="Small quantity" size="sm" defaultValue={2} />
      <NumberInput label="Medium quantity" defaultValue={4} />
      <NumberInput label="Large quantity" size="lg" defaultValue={6} />
      <NumberInput label="Optional quantity" placeholder="Leave blank if unknown" />
      <NumberInput label="Read-only allocation" defaultValue={8} readOnly />
      <NumberInput label="Disabled allocation" defaultValue={8} disabled />
      <NumberInput
        label="Decimal without steppers"
        defaultValue={1.5}
        step="any"
        showSteppers={false}
      />
      <Field
        label="Reserved seats"
        helpText="The project owner approves changes."
        error="This allocation exceeds your project allowance."
      >
        <NumberInput defaultValue={12} min={0} />
      </Field>
    </div>
  ),
};

export const KeyboardAndBounds: Story = {
  render: function KeyboardExample() {
    const [value, setValue] = useState<number | null>(2);
    const [change, setChange] = useState('none');
    const [commit, setCommit] = useState('none');
    return (
      <div className="stack">
        <NumberInput
          label="Allocation"
          value={value}
          min={0}
          max={10}
          step={2}
          smallStep={0.5}
          largeStep={4}
          locale="en-US"
          onValueChange={(next, details) => {
            setValue(next);
            setChange(details.reason);
          }}
          onValueCommitted={(next, details) => setCommit(`${String(next)}:${details.reason}`)}
        />
        <output aria-label="Numeric state">{value === null ? 'empty' : value}</output>
        <output aria-label="Change reason">{change}</output>
        <output aria-label="Committed state">{commit}</output>
        <Button onClick={() => setValue(3)}>Set allocation to three</Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Allocation' });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('4');
    await expect(canvas.getByLabelText('Committed state')).toHaveTextContent('4:keyboard');
    await userEvent.keyboard('{ArrowDown}{Shift>}{ArrowUp}{/Shift}{Alt>}{ArrowUp}{/Alt}');
    await expect(input).toHaveValue('6.5');
    await userEvent.keyboard('{End}');
    await expect(input).toHaveValue('10');
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('10');
    await userEvent.keyboard('{Home}');
    await expect(input).toHaveValue('0');
    await userEvent.clear(input);
    await expect(canvas.getByLabelText('Numeric state')).toHaveTextContent('empty');
    await expect(canvas.getByLabelText('Change reason')).toHaveTextContent('input-clear');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Set allocation to three' })).toHaveFocus();
    await expect(canvas.getByLabelText('Committed state')).toHaveTextContent('null:input-clear');
    await userEvent.click(canvas.getByRole('button', { name: 'Set allocation to three' }));
    await expect(input).toHaveValue('3');
    await userEvent.click(canvas.getByRole('button', { name: 'Increase value' }));
    await expect(input).toHaveValue('5');
  },
};

export const LocaleAndForm: Story = {
  render: function LocaleExample() {
    const [submitted, setSubmitted] = useState('Not submitted');
    return (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()]));
        }}
      >
        <Field label="Distance" helpText="Kilometres, using German decimal punctuation.">
          <NumberInput
            name="distance"
            defaultValue={1234.5}
            locale="de-DE"
            step="any"
            format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
        </Field>
        <Button type="submit">Save distance</Button>
        <output aria-label="Form result">{submitted}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Distance' });
    await expect(input).toHaveValue('1.234,50');
    await userEvent.clear(input);
    await userEvent.type(input, '42,75');
    await userEvent.tab();
    await expect(input).toHaveValue('42,75');
    await userEvent.click(canvas.getByRole('button', { name: 'Save distance' }));
    await expect(canvas.getByLabelText('Form result')).toHaveTextContent('[["distance","42.75"]]');
  },
};

export const FieldAndLockedStates: Story = {
  render: () => (
    <div className="stack">
      <Field
        id="number-readonly"
        label="Managed seats"
        helpText="Configured by your administrator."
        error="Contact your administrator to change the limit."
      >
        <NumberInput defaultValue={4} readOnly />
      </Field>
      <NumberInput label="Unavailable seats" defaultValue={7} disabled />
      <NumberInput label="Editable seats" defaultValue={2} showSteppers={false} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const locked = canvas.getByRole('textbox', { name: 'Managed seats' });
    await expect(locked).toHaveAttribute('readonly');
    await expect(locked).toHaveAttribute('aria-invalid', 'true');
    await expect(locked).toHaveAttribute(
      'aria-describedby',
      'number-readonly-help number-readonly-error',
    );
    await userEvent.click(locked);
    await userEvent.keyboard('{ArrowUp}8');
    await expect(locked).toHaveValue('4');
    await expect(canvas.getByRole('textbox', { name: 'Unavailable seats' })).toBeDisabled();
    await userEvent.tab();
    await expect(canvas.getByRole('textbox', { name: 'Editable seats' })).toHaveFocus();
  },
};

export const CancelledChange: Story = {
  render: () => (
    <div className="stack">
      <NumberInput
        label="Guarded quantity"
        defaultValue={2}
        onValueChange={(next, details) => {
          if (next !== null && next > 2) details.cancel();
        }}
      />
      <p>
        This host vetoes increases through the primitive callback details; decreases remain
        available.
      </p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Guarded quantity' });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('2');
    await userEvent.keyboard('{ArrowDown}');
    await expect(input).toHaveValue('1');
  },
};
