import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Copy, Download } from '@/components/icon';
import { SplitButton } from './split-button';

const meta = {
  id: 'components-actions-splitbutton',
  title: 'Components/Triggers/SplitButton',
  component: SplitButton,
  tags: ['autodocs'],
  args: { children: 'Save project', onAction: () => undefined, actions: [] },
  parameters: {
    docs: {
      story: { inline: false, height: 360 },
      description: {
        component:
          'Pair one frequent action with a menu of alternatives. Both segments use native buttons; Tab reaches each, Enter or Space runs the primary action, and the menu supports Arrow keys, Home/End, Enter, and Escape. Promise-returning callbacks disable both segments until completion, prevent duplicate requests, and display a recoverable error on rejection. Focus returns after completion unless the user moved elsewhere. Use menuLabel to describe the alternatives.',
      },
    },
  },
} satisfies Meta<typeof SplitButton>;
export default meta;
type Story = StoryObj<typeof meta>;

function Example({ fail = false }: { fail?: boolean }) {
  const [result, setResult] = useState('No export requested');
  const [count, setCount] = useState(0);
  async function exportData(format: string) {
    setCount((value) => value + 1);
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (fail) throw new Error('The sample export service is unavailable.');
    setResult(`${format} export prepared locally`);
  }
  return (
    <div className="stack">
      <SplitButton
        leadingIcon={<Download size={16} />}
        intent="function"
        onAction={() => exportData('CSV')}
        menuLabel="Export options"
        actions={[
          { id: 'json', label: 'Export JSON', onSelect: () => exportData('JSON') },
          {
            id: 'copy',
            label: 'Copy export preview',
            icon: <Copy size={16} />,
            onSelect: () => setResult('Export preview selected'),
          },
          { id: 'pdf', label: 'Export PDF', disabled: true, onSelect: () => exportData('PDF') },
        ]}
      >
        Export CSV
      </SplitButton>
      <p role="status" aria-label="Export status">
        {result}
      </p>
      <output aria-label="Export requests">{count}</output>
    </div>
  );
}
export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div className="stack" key={size}>
          {(['primary', 'secondary', 'tertiary', 'ghost'] as const).map((emphasis) => (
            <SplitButton
              key={emphasis}
              size={size}
              emphasis={emphasis}
              onAction={() => undefined}
              actions={[{ id: 'draft', label: 'Save draft', onSelect: () => undefined }]}
            >
              Save project
            </SplitButton>
          ))}
        </div>
      ))}
      <SplitButton disabled onAction={() => undefined} actions={[]}>
        Unavailable
      </SplitButton>
      <SplitButton loading onAction={() => undefined} actions={[]}>
        Saving project
      </SplitButton>
    </div>
  ),
};
export const KeyboardAndAsync: Story = {
  render: () => <Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const primary = canvas.getByRole('button', { name: 'Export CSV' });
    primary.focus();
    await userEvent.keyboard('{Enter}');
    await expect(primary).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Export options' })).toBeDisabled();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(primary).toBeEnabled());
    await expect(canvas.getByLabelText('Export requests')).toHaveTextContent('1');
    await expect(primary).toHaveFocus();
    await userEvent.tab();
    const trigger = canvas.getByRole('button', { name: 'Export options' });
    await expect(trigger).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const option = await page.findByRole('menuitem', { name: 'Export JSON' });
    await waitFor(() => expect(option).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Export status' })).toHaveTextContent(
        'JSON export prepared locally',
      ),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await page.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
export const FailureAndRetry: Story = {
  render: () => <Example fail />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const primary = canvas.getByRole('button', { name: 'Export CSV' });
    await userEvent.click(primary);
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'The action could not be completed. Try again.',
    );
    await expect(primary).toBeEnabled();
    await userEvent.click(primary);
    await waitFor(() => expect(canvas.getByLabelText('Export requests')).toHaveTextContent('2'));
    await waitFor(() => expect(primary).toBeEnabled());
  },
};

export const Playground: Story = {
  args: {
    children: 'Export CSV',
    size: 'md',
    intent: 'function',
    emphasis: 'secondary',
    disabled: false,
    loading: false,
    menuLabel: 'Export formats',
  },
  argTypes: {
    children: { control: 'text', name: 'Label' },
    menuLabel: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    intent: { control: 'select', options: ['default', 'function', 'destroy', 'ai'] },
    emphasis: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'ghost'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    actions: { control: false },
    onAction: { control: false },
  },
  render: function Playground(args) {
    const [result, setResult] = useState('Choose an export format.');
    return (
      <div className="stack">
        <SplitButton
          {...args}
          onAction={() => setResult('CSV export prepared locally')}
          actions={[
            {
              id: 'json',
              label: 'Export JSON',
              onSelect: () => setResult('JSON export prepared locally'),
            },
            {
              id: 'text',
              label: 'Export text',
              onSelect: () => setResult('Text export prepared locally'),
            },
          ]}
        />
        <p role="status" className="muted">
          {result}
        </p>
      </div>
    );
  },
};
