import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { FormErrorSummary, type FormErrorSummaryItem } from './form-error-summary';
import { formErrorSummaryAnatomy } from '@/stories/component-docs/anatomy/form-error-summary';
const meta = {
  id: 'patterns-formerrorsummary',
  title: 'Components/Feedback/FormErrorSummary',
  component: FormErrorSummary,
  tags: ['autodocs'],
  args: {
    title: 'Check the following fields',
    description: 'Correct these entries before saving.',
    errors: [
      {
        id: 'email-required',
        fieldId: 'summary-playground-email',
        message: 'Enter an email address.',
      },
    ],
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    errors: { control: false },
    focusField: { control: false },
    focusRequestKey: { control: 'number' },
  },
  render: (args) => (
    <div className="stack">
      <FormErrorSummary {...args} />
      <Field id="summary-playground-email" label="Email">
        <TextInput />
      </Field>
    </div>
  ),
} satisfies Meta<typeof FormErrorSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Empty: Story = { args: { errors: [] } };
export function ErrorSummaryExample() {
  const [errors, setErrors] = useState<FormErrorSummaryItem[]>([]);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  return (
    <form
      noValidate
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = !String(values.get('email') ?? '').includes('@')
          ? [
              {
                id: 'email-invalid',
                fieldId: 'summary-example-email',
                message: 'Enter a valid email address.',
              },
            ]
          : [];
        setErrors(next);
        setAttempt((value) => value + 1);
        setSaved(!next.length);
      }}
    >
      <FormErrorSummary
        errors={errors}
        focusRequestKey={attempt}
        description="Local validation example."
      />
      <Field
        id="summary-example-email"
        label="Email"
        error={errors.length ? 'Enter a valid email address.' : undefined}
      >
        <TextInput name="email" />
      </Field>
      <Button type="submit">Save locally</Button>
      {saved && <p role="status">Saved locally.</p>}
    </form>
  );
}
export const ValidationAndFocus: Story = {
  render: () => <ErrorSummaryExample />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Save locally' }));
    await expect(c.getByRole('region', { name: 'Check the following fields' })).toHaveFocus();
    await userEvent.click(c.getByRole('link', { name: 'Enter a valid email address.' }));
    await expect(c.getByRole('textbox', { name: 'Email' })).toHaveFocus();
    await userEvent.type(c.getByRole('textbox', { name: 'Email' }), 'alex@example.com');
    await userEvent.click(c.getByRole('button', { name: 'Save locally' }));
    await expect(c.getByRole('status')).toHaveTextContent('Saved locally.');
    await expect(
      c.queryByRole('region', { name: 'Check the following fields' }),
    ).not.toBeInTheDocument();
  },
};
export const Anatomy: Story = { render: () => <>{formErrorSummaryAnatomy.render()}</> };
