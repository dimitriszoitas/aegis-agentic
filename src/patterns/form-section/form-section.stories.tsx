import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { FormSection } from './form-section';
import { formSectionAnatomy } from '@/stories/component-docs/anatomy/form-section';

const meta = {
  id: 'patterns-formsection',
  title: 'Patterns/Page Structure/FormSection',
  component: FormSection,
  tags: ['autodocs'],
  args: {
    legend: 'Contact details',
    description: 'Use the address where this customer receives updates.',
    maxColumns: 2,
    minItemWidth: 'regular',
    disabled: false,
    children: null,
  },
  argTypes: {
    legend: { control: 'text' },
    description: { control: 'text' },
    disabled: { control: 'boolean' },
    maxColumns: { control: 'inline-radio', options: [1, 2, 3, 4] },
    minItemWidth: { control: 'inline-radio', options: ['small', 'regular', 'large'] },
    children: { control: false },
    actions: { control: false },
  },
  render: (args) => (
    <FormSection {...args}>
      <Field label="Name">
        <TextInput name="contactName" defaultValue="Alex Morgan" />
      </Field>
      <Field label="Email">
        <TextInput name="email" type="email" defaultValue="alex@example.com" />
      </Field>
    </FormSection>
  ),
  parameters: {
    docs: {
      description: {
        component:
          'A native fieldset and legend with associated description and a shared responsive ContentGrid. It does not render a form, assign names to fields, validate data or submit values. Native disabled inheritance covers DOM descendants; portaled or custom controls still require their explicit disabled props. Keep legends noninteractive.',
      },
    },
  },
} satisfies Meta<typeof FormSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Disabled: Story = { args: { disabled: true } };

function FormSectionExample({ disabled = false }: { disabled?: boolean }) {
  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex@example.com');
  const [saved, setSaved] = useState('No local changes saved.');
  return (
    <form
      aria-label="Local contact form"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setSaved(`Saved locally: ${values.get('contactName')} · ${values.get('email')}`);
      }}
    >
      <FormSection
        legend="Contact details"
        description="Local demo. Fields retain their own labels and validation."
        disabled={disabled}
        maxColumns={2}
        actions={<Button type="submit">Save contact</Button>}
      >
        <Field label="Name" required>
          <TextInput name="contactName" required value={name} onValueChange={setName} />
        </Field>
        <Field label="Email" required>
          <TextInput name="email" type="email" required value={email} onValueChange={setEmail} />
        </Field>
      </FormSection>
      <p role="status">{saved}</p>
    </form>
  );
}
export const NativeForm: Story = {
  render: () => <FormSectionExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('group', { name: 'Contact details' })).toBeInTheDocument();
    const input = canvas.getByRole('textbox', { name: 'Name (required)' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Sam Rivera');
    await userEvent.click(canvas.getByRole('button', { name: 'Save contact' }));
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Saved locally: Sam Rivera · alex@example.com',
    );
  },
};
export const NativeDisabled: Story = {
  render: () => <FormSectionExample disabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Name (required)' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Save contact' })).toBeDisabled();
  },
};
export const Anatomy: Story = {
  render: () => <>{formSectionAnatomy.render()}</>,
  parameters: { docs: { description: { story: formSectionAnatomy.note } } },
};
