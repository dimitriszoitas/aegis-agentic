import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { PhoneInput } from './phone-input';
import { phoneInputAnatomy } from '@/stories/component-docs/anatomy/phone-input';
const meta = {
  id: 'components-forms-phoneinput',
  title: 'Components/Inputs & Selection/PhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  args: { label: 'Telephone', defaultCountry: 'US', countries: ['US', 'GB', 'GR', 'DE'] },
  parameters: {
    docs: {
      description: {
        component:
          'Telephone drafting with a country selector and libphonenumber-js formatting. Raw text is preserved by default. Opt into normalization on blur explicitly. Metadata-based possible/valid results do not prove reachability, ownership or allocation. The named native input submits its displayed draft; use the parsed callback for a separate persistence policy.',
      },
    },
  },
} satisfies Meta<typeof PhoneInput>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: {
    value: '2025550123',
    size: 'md',
    country: 'US',
    countryLocale: 'en',
    format: 'international',
    formatOnBlur: false,
    showFormattedValue: true,
    disabled: false,
    readOnly: false,
    required: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    country: { control: 'select', options: ['US', 'GB', 'GR', 'DE'] },
    countryLocale: { control: 'inline-radio', options: ['en', 'de', 'el'] },
    format: { control: 'inline-radio', options: ['national', 'international'] },
    formatOnBlur: { control: 'boolean' },
    showFormattedValue: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    invalid: { control: 'boolean' },
    countries: { control: false },
  },
  render: function Example(args) {
    const [, updateArgs] = useArgs();
    return (
      <PhoneInput
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value);
          updateArgs({ value });
        }}
        onCountryChange={(country) => {
          args.onCountryChange?.(country);
          updateArgs({ country });
        }}
      />
    );
  },
};
export const Anatomy: Story = { render: () => <>{phoneInputAnatomy.render()}</> };
export const DraftAndForm: Story = {
  render: function Example() {
    const [raw, setRaw] = useState('');
    const [parsed, setParsed] = useState('');
    const [saved, setSaved] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(String(new FormData(e.currentTarget).get('phone')));
        }}
      >
        <Field
          id="phone-example"
          label="Telephone"
          helpText="We preserve the exact draft until you choose to normalize it."
        >
          <PhoneInput
            name="phone"
            value={raw}
            onValueChange={setRaw}
            defaultCountry="US"
            countries={['US', 'GB']}
            onValueCommit={(result) => setParsed(result.e164 ?? 'unparsed')}
          />
        </Field>
        <Button type="submit">Save draft</Button>
        <output aria-label="Parsed candidate">{parsed}</output>
        <output aria-label="Submitted draft">{saved}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Telephone' });
    await userEvent.type(input, '(202) 555-0123');
    await userEvent.tab();
    await expect(input).toHaveValue('(202) 555-0123');
    await expect(canvas.getByLabelText('Parsed candidate')).toHaveTextContent('+12025550123');
    await userEvent.click(canvas.getByRole('button', { name: 'Save draft' }));
    await expect(canvas.getByLabelText('Submitted draft')).toHaveTextContent('(202) 555-0123');
    await expect(canvas.getByRole('combobox', { name: 'Country' })).not.toHaveAttribute(
      'id',
      input.id,
    );
  },
};
export const ExplicitNormalization: Story = {
  args: { defaultValue: '2025550123', formatOnBlur: true, value: undefined },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('textbox', { name: 'Telephone' });
    await userEvent.click(input);
    await userEvent.tab();
    await expect(input).toHaveValue('+1 202 555 0123');
  },
};
