import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { RichTextEditor, type RichTextDocument } from './rich-text-editor';
import { richTextEditorAnatomy } from '@/stories/component-docs/anatomy/rich-text-editor';
const initial: RichTextDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Project brief' }] }],
};
const meta = {
  id: 'components-forms-richtexteditor',
  title: 'Components/Inputs & Selection/RichTextEditor',
  component: RichTextEditor,
  tags: ['autodocs'],
  args: { label: 'Description', defaultValue: initial },
} satisfies Meta<typeof RichTextEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {
  args: {
    value: initial,
    defaultValue: undefined,
    readOnly: false,
    disabled: false,
    invalid: false,
    required: false,
    showToolbar: true,
  },
  argTypes: {
    value: { control: 'object' },
    label: { control: 'text' },
    readOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    showToolbar: { control: 'boolean' },
    onValueChange: { control: false },
  },
  render: function Playground(args) {
    const [, updateArgs] = useArgs();
    return <RichTextEditor {...args} onValueChange={(value) => updateArgs({ value })} />;
  },
};
export const FormattingAndForm: Story = {
  render: function FormExample() {
    const [submitted, setSubmitted] = useState('');
    return (
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get('body')));
        }}
      >
        <RichTextEditor label="Message" name="body" />
        <Button type="submit">Submit document</Button>
        <output aria-label="Submitted document">{submitted}</output>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = await c.findByRole('textbox', { name: 'Message' });
    await userEvent.click(c.getByRole('button', { name: 'Bold' }));
    await userEvent.type(input, 'Important');
    await expect(input.querySelector('strong')).toHaveTextContent('Important');
    await userEvent.click(c.getByRole('button', { name: 'Bold' }));
    await userEvent.click(c.getByRole('button', { name: 'Bullet list' }));
    await expect(input.querySelector('ul li')).toBeInTheDocument();
    await userEvent.click(c.getByRole('button', { name: 'Submit document' }));
    await expect(c.getByLabelText('Submitted document')).toHaveTextContent('bulletList');
    await expect(c.getByLabelText('Submitted document')).toHaveTextContent('bold');
  },
};
export const LinkValidation: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const editor = await c.findByRole('textbox', { name: 'Description' });
    editor.focus();
    const selection = canvasElement.ownerDocument.getSelection();
    const range = canvasElement.ownerDocument.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
    await userEvent.click(c.getByRole('button', { name: 'Link' }));
    const body = within(canvasElement.ownerDocument.body);
    const url = body.getByRole('textbox', { name: 'Link URL' });
    await userEvent.type(url, 'javascript:alert(1)');
    await userEvent.click(body.getByRole('button', { name: 'Apply link' }));
    await expect(body.getByText('Use an HTTP(S), mailto or relative URL.')).toBeVisible();
    await userEvent.clear(url);
    await userEvent.type(url, 'https://example.com');
    await userEvent.click(body.getByRole('button', { name: 'Apply link' }));
    await expect(editor.querySelector('a')).toHaveAttribute('href', 'https://example.com');
  },
};
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const editor = await c.findByRole('textbox', { name: 'Description' });
    await expect(editor).toHaveAttribute('contenteditable', 'false');
    const before = editor.innerHTML;
    const bold = c.getByRole('button', { name: 'Bold' });
    // Base UI's toolbar keeps disabled actions discoverable with aria-disabled.
    await expect(bold).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(bold);
    bold.focus();
    await userEvent.keyboard('{Enter}');
    await expect(editor.innerHTML).toBe(before);
    await expect(editor.querySelector('strong')).not.toBeInTheDocument();
  },
};
export const Anatomy: Story = { render: () => <>{richTextEditorAnatomy.render()}</> };
