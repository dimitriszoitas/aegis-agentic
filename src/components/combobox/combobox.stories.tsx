import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Combobox } from './combobox';
import { comboboxAnatomy } from '@/stories/component-docs/anatomy/combobox';
const options = [
  { value: 'ath', label: 'Athens', description: 'Greece', keywords: ['hellas'] },
  { value: 'ber', label: 'Berlin', description: 'Germany' },
  { value: 'rom', label: 'Rome', disabled: true },
];
const meta = {
  id: 'components-forms-combobox',
  title: 'Components/Inputs & Selection/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  args: { label: 'Destination', options },
  parameters: {
    docs: {
      description: {
        component:
          'Searchable single selection backed by Base UI. Selected IDs and search text remain separate. Native form submission uses the selected ID, not the typed query. For remote search, disable filtering and let the host own requests, race handling, result options and loading.',
      },
    },
  },
} satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: {
    value: null,
    placeholder: 'Search cities',
    size: 'md',
    disabled: false,
    readOnly: false,
    required: false,
    invalid: false,
    loading: false,
    filterOptions: true,
    clearable: true,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'select', options: [null, 'ath', 'ber', 'rom'] },
    placeholder: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    loading: { control: 'boolean' },
    filterOptions: { control: 'boolean' },
    clearable: { control: 'boolean' },
    options: { control: false },
    inputProps: { control: false },
  },
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    return (
      <Combobox
        {...args}
        onValueChange={(value, details) => {
          args.onValueChange?.(value, details);
          if (!details.isCanceled) updateArgs({ value });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{comboboxAnatomy.render()}</> };
export const KeyboardAndForm: Story = {
  render: function Example() {
    const [value, setValue] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(String(new FormData(e.currentTarget).get('destination')));
        }}
      >
        <Field label="Destination" helpText="Search the list; the selected city ID is submitted.">
          <Combobox options={options} value={value} onValueChange={setValue} name="destination" />
        </Field>
        <Button type="submit">Save destination</Button>
        <output aria-label="Submitted ID">{submitted}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Destination' });
    await userEvent.click(input);
    await userEvent.type(input, 'hellas');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(input).toHaveValue('Athens');
    await userEvent.click(canvas.getByRole('button', { name: 'Save destination' }));
    await expect(canvas.getByLabelText('Submitted ID')).toHaveTextContent('ath');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear selection' }));
    await expect(input).toHaveValue('');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{Escape}');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  },
};
export const RemoteResults: Story = {
  render: function Example() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    return (
      <div className="stack">
        <Combobox
          label="Remote destination"
          options={loading ? [] : options}
          inputValue={query}
          onInputValueChange={setQuery}
          filterOptions={false}
          loading={loading}
        />
        <Button onClick={() => setLoading(false)}>Deliver remote results</Button>
        <output aria-label="Search request">{query}</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Remote destination' });
    await userEvent.type(input, 'zz');
    await expect(canvas.getByLabelText('Search request')).toHaveTextContent('zz');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(canvas.getByRole('button', { name: 'Deliver remote results' }));
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(input).toHaveValue('Athens');
  },
};
export const CancelledSelection: Story = {
  args: { defaultValue: 'ath', onValueChange: (_, details) => details.cancel() },
  render: function Example(args) {
    const [attempt, setAttempt] = useState('');
    const [submitted, setSubmitted] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get('guarded-city')));
        }}
      >
        <Combobox
          {...args}
          name="guarded-city"
          onValueChange={(value, details) => {
            args.onValueChange?.(value, details);
            setAttempt(
              `${value}:${details.reason}:${details.isCanceled ? 'cancelled' : 'accepted'}`,
            );
          }}
        />
        <output aria-label="Selection attempt">{attempt}</output>
        <Button type="submit" emphasis="secondary">
          Save guarded destination
        </Button>
        <output aria-label="Guarded submitted ID">{submitted}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Destination' });
    const submittedInput = canvasElement.querySelector('input[name="guarded-city"]');
    await userEvent.click(input);
    await userEvent.clear(input);
    await expect(canvas.getByLabelText('Selection attempt')).toHaveTextContent(
      'null:input-clear:cancelled',
    );
    await expect(input).toHaveValue('');
    await userEvent.type(input, 'Berlin');
    await waitFor(() =>
      expect(
        within(canvasElement.ownerDocument.body).getByRole('option', { name: /Berlin/ }),
      ).toBeVisible(),
    );
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant'));
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByLabelText('Selection attempt')).toHaveTextContent(
      'ber:item-press:cancelled',
    );
    await expect(submittedInput).toHaveValue('ath');
    // Rejection retains the active search query. Dismiss explicitly before expecting the selected label.
    await expect(input).toHaveValue('Berlin');
    await userEvent.keyboard('{Escape}');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await expect(input).toHaveValue('Athens');
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, 'Berlin');
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('option', { name: /Berlin/ }),
    );
    await expect(canvas.getByLabelText('Selection attempt')).toHaveTextContent(
      'ber:item-press:cancelled',
    );
    await expect(submittedInput).toHaveValue('ath');
    await userEvent.keyboard('{Escape}');
    await expect(input).toHaveValue('Athens');
    await userEvent.click(canvas.getByRole('button', { name: 'Save guarded destination' }));
    await expect(canvas.getByLabelText('Guarded submitted ID')).toHaveTextContent('ath');
  },
};
