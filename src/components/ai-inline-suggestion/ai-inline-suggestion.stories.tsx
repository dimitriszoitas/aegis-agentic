import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Field } from '@/components/field';
import { Button } from '@/components/button';
import { AiInlineSuggestion, type AiInlineSuggestionProps } from './ai-inline-suggestion';

const fullName = 'Invoice follow-up for overdue accounts';
function Demo(args: AiInlineSuggestionProps) {
  const [value, setValue] = useState(args.defaultValue ?? 'Invoice follow-up');
  return (
    <div className="stack" style={{ maxWidth: 700 }}>
      <AiInlineSuggestion
        {...args}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
      <Button>Next step</Button>
    </div>
  );
}
const meta = {
  id: 'components-ai-aiinlinesuggestion',
  title: 'Components/AI/AiInlineSuggestion',
  component: AiInlineSuggestion,
  args: {
    label: 'Workflow name',
    defaultValue: 'Invoice follow-up',
    suggestion: fullName,
    onValueChange: fn(),
    onAccept: fn(),
    onDismiss: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof AiInlineSuggestion>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const TextareaSuggestion: Story = {
  args: {
    as: 'textarea',
    label: 'Workflow description',
    defaultValue: 'Routes unpaid invoices ',
    suggestion: 'Routes unpaid invoices to their account owner and adds a workspace notification.',
    rows: 3,
  },
};
export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <AiInlineSuggestion
        label="Short workflow name"
        size="sm"
        defaultValue="Invoice "
        suggestion={fullName}
      />
      <Field
        label="Required description"
        required
        helpText="Describe the records this workflow should handle."
      >
        <AiInlineSuggestion
          as="textarea"
          defaultValue="Routes "
          suggestion="Routes unpaid invoices to their account owner for review."
        />
      </Field>
      <Field
        label="Workflow name needs review"
        error="Choose a name that identifies the observed behavior."
      >
        <AiInlineSuggestion defaultValue="Invoice " suggestion={fullName} />
      </Field>
      <AiInlineSuggestion
        label="Read-only workflow"
        readOnly
        defaultValue="Invoice follow-up"
        suggestion={fullName}
      />
      <Field label="Disabled workflow name" disabled>
        <AiInlineSuggestion defaultValue="Invoice follow-up" suggestion={fullName} />
      </Field>
      <AiInlineSuggestion
        label="Unrelated edit"
        defaultValue="Project handoff"
        suggestion={fullName}
      />
    </div>
  ),
};
export const EmptyPrefix: Story = {
  args: { defaultValue: '', placeholder: 'Name this workflow configuration' },
};
export const LengthLimit: Story = { args: { maxLength: 24 } };
export const KeyboardAccept: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      input = canvas.getByRole('textbox', { name: 'Workflow name' });
    await userEvent.click(input);
    await userEvent.keyboard('{End}{Tab}');
    await expect(input).toHaveValue(fullName);
    await expect(args.onAccept).toHaveBeenCalledWith(fullName);
    await expect(input).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Next step' })).toHaveFocus();
  },
};
export const ButtonAccept: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Accept suggestion' }));
    await expect(canvas.getByRole('textbox', { name: 'Workflow name' })).toHaveValue(fullName);
    await expect(args.onAccept).toHaveBeenCalledTimes(1);
  },
};
export const DismissAndKeepTyping: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      input = canvas.getByRole('textbox', { name: 'Workflow name' });
    await userEvent.click(input);
    await userEvent.keyboard('{End}{Escape}');
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
    await expect(input).toHaveValue('Invoice follow-up');
    await expect(
      canvas.queryByRole('button', { name: 'Accept suggestion' }),
    ).not.toBeInTheDocument();
    await userEvent.keyboard(' workflow');
    await expect(input).toHaveValue('Invoice follow-up workflow');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Next step' })).toHaveFocus();
  },
};
