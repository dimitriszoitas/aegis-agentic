import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { records } from '@/sample-data';
import type { AiContextItem } from '@/lib/ai';
import { PromptInput } from './prompt-input';
const context: AiContextItem[] = records.slice(0, 3).map((record) => ({
  id: record.id,
  label: record.id,
  description: record.title,
  kind: 'record',
}));
function Demo({ fail = false }: { fail?: boolean }) {
  const [sent, setSent] = useState('');
  return (
    <div style={{ maxWidth: 560 }}>
      <PromptInput
        availableContext={context}
        onSend={(prompt, attached) => {
          if (fail)
            throw new Error('The assistant is temporarily unavailable. Your draft is preserved.');
          setSent(`${prompt} · ${attached.length} records attached`);
        }}
      />
      <p role="status">{sent}</p>
    </div>
  );
}
const meta = {
  id: 'patterns-ai-promptinput',
  title: 'Patterns/AI Assistance/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
  args: { availableContext: context, onSend: () => {} },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 560, padding: 'var(--space-4)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PromptInput>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { render: () => <Demo /> };
export const AttachedContext: Story = {
  args: { context, defaultValue: 'Summarize these records and suggest what to inspect next.' },
};
export const Generating: Story = {
  args: {
    generating: true,
    onStop: () => {},
    context,
    defaultValue: 'Draft a follow-up while the response streams…',
  },
};
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Waiting for review permissions.' },
};
export const FailedSend: Story = { render: () => <Demo fail /> };
export const KeyboardComposer: Story = {
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Message to AI assistant' });
    await userEvent.click(input);
    await userEvent.keyboard('/');
    const page = within(canvasElement.ownerDocument.body);
    const commands = await page.findByRole('combobox', { name: 'Search prompt commands' });
    await waitFor(() => expect(commands).toHaveFocus());
    await userEvent.type(commands, 'summarize');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(input).toHaveValue('Summarize the attached records for a handoff.');
      expect(input).toHaveFocus();
    });
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    await expect(input).toHaveValue('Summarize the attached records for a handoff.\n');
    await userEvent.keyboard('Include record identifiers.');
    await expect(input).toHaveValue(
      'Summarize the attached records for a handoff.\nInclude record identifiers.',
    );
    await userEvent.keyboard('{Enter}');
    await expect(input).toHaveValue('');
    await expect(canvas.getByRole('status')).toHaveTextContent('Include record identifiers.');
  },
};
export const OpenCommands: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Prompt commands' }));
  },
};
export const OpenAttachments: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Attach context' }));
  },
};

const workspaceContext: AiContextItem[] = [
  { id: 'projects', label: 'Project portfolio', kind: 'scope' },
  { id: 'customers', label: 'Customer accounts', kind: 'scope' },
  {
    id: 'quarterly-review',
    label: 'Quarterly planning and cross-team delivery review',
    kind: 'config',
  },
];
function HeroDemo() {
  const [attached, setAttached] = useState(workspaceContext.slice(0, 1));
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  return (
    <>
      <PromptInput
        presentation="hero"
        placeholder="Work with Aegis AI…"
        availableContext={workspaceContext}
        context={attached}
        onContextChange={setAttached}
        generating={generating}
        onSend={(prompt, items) => {
          setStatus(`Requested: ${prompt} · ${items.length} context items`);
          setGenerating(true);
        }}
        onStop={() => {
          setGenerating(false);
          setStatus('Generation stopped.');
        }}
      />
      <p role="status">{status}</p>
    </>
  );
}
export const Hero: Story = {
  render: () => <HeroDemo />,
};
export const HeroKeyboardComposer: Story = {
  render: () => <HeroDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const input = canvas.getByRole('textbox', { name: 'Message to AI assistant' });
    await userEvent.click(canvas.getByRole('button', { name: 'Attach context' }));
    const attachmentSearch = await page.findByRole('combobox', { name: 'Search attach context' });
    await waitFor(() => expect(attachmentSearch).toHaveFocus());
    await userEvent.type(attachmentSearch, 'customer');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveFocus());
    await expect(canvas.getByRole('region', { name: 'Attached context' })).toHaveTextContent(
      'Customer accounts',
    );
    await userEvent.keyboard('/');
    const commands = await page.findByRole('combobox', { name: 'Search prompt commands' });
    await waitFor(() => expect(commands).toHaveFocus());
    await userEvent.type(commands, 'summarize');
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}Include owners.');
    await expect(input).toHaveValue(
      'Summarize the attached records for a handoff.\nInclude owners.',
    );
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(input).toHaveValue(''));
    await expect(canvas.getByRole('status')).toHaveTextContent('2 context items');
    await userEvent.click(canvas.getByRole('button', { name: 'Stop generation' }));
    await waitFor(() => expect(input).toHaveFocus());
    await expect(canvas.getByRole('status')).toHaveTextContent('Generation stopped.');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove Customer accounts from context' }),
    );
    await waitFor(() => expect(input).toHaveFocus());
    await expect(canvas.getByRole('region', { name: 'Attached context' })).not.toHaveTextContent(
      'Customer accounts',
    );
  },
};
export const HeroLongContext: Story = {
  args: { presentation: 'hero', context: workspaceContext, placeholder: 'Work with Aegis AI…' },
};
