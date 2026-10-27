import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { workflows, proposedWorkflow } from '@/sample-data';
import { Button } from '@/components/button';
import { DiffView, type DiffViewProps } from './diff-view';

const original = workflows[2].yaml;
const proposed = proposedWorkflow.replace('enabled: true', 'enabled: false');
const meta = {
  id: 'components-code-diffview',
  title: 'Components/Code/DiffView',
  component: DiffView,
  args: {
    original,
    modified: proposed,
    language: 'yaml',
    label: 'Invoice follow-up configuration changes',
    originalLabel: 'Current configuration',
    modifiedLabel: 'Proposed configuration',
    maxHeight: 440,
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'CodeMirror computes real line and inline changes. Red minus markers identify removals; green plus markers identify additions. The legend counts affected lines. Focus changes folds unchanged context, and Show all lines restores it. Split and unified layouts share the same documents and change navigation.',
      },
    },
  },
} satisfies Meta<typeof DiffView>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Split: Story = {};
export const Unified: Story = { args: { defaultMode: 'unified' } };
export const NoChanges: Story = { args: { modified: original } };
export const Empty: Story = { args: { original: '', modified: '', minHeight: 120 } };
export const AddedFile: Story = {
  args: { original: '', defaultMode: 'unified', originalLabel: 'No previous configuration' },
};
export const RemovedFile: Story = {
  args: { modified: '', defaultMode: 'unified', modifiedLabel: 'Configuration removed' },
};
export const HighlightedChanges: Story = {
  args: {
    collapseUnchanged: true,
    focusFirstChange: true,
    modifiedIntent: 'ai',
    modifiedLabel: 'AI proposal',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/^− [1-9]\d* removed$/)).toBeVisible();
    await expect(canvas.getByText(/^\+ [1-9]\d* added$/)).toBeVisible();
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('.cm-changedText').length).toBeGreaterThan(0),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Show all lines' }));
    await expect(canvas.getByRole('button', { name: 'Focus changes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await waitFor(() => expect(canvasElement.querySelector('.cm-collapsedLines')).toBeNull());
    await userEvent.click(canvas.getByRole('button', { name: 'Unified view' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Focus changes' }));
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('.cm-changedText').length).toBeGreaterThan(0),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Next change' }));
    await expect(canvas.getByRole('textbox', { name: /unified comparison/ })).toHaveFocus();
  },
};
export const CollapsedContext: Story = {
  args: {
    collapseUnchanged: true,
    defaultMode: 'unified',
    modified: original.replace('level: high', 'level: critical'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const collapsed = await canvas.findAllByRole('button', { name: /Expand .* unchanged lines/ });
    const first = collapsed[0];
    first.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(first).not.toBeInTheDocument());
    await expect(canvas.getByRole('textbox', { name: /unified comparison/ })).toHaveFocus();
  },
};
export const Json: Story = {
  args: {
    language: 'json',
    original: '{\n  "severity": "high",\n  "enabled": true,\n  "threshold": 5\n}',
    modified:
      '{\n  "severity": "critical",\n  "enabled": true,\n  "threshold": 3,\n  "window": "15m"\n}',
    label: 'Workflow configuration changes',
    minHeight: 180,
  },
};
export const LayoutAndNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Unified view' }));
    await expect(canvas.getByRole('button', { name: 'Unified view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Next change' }));
    await expect(canvas.getByRole('textbox', { name: /unified comparison/ })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Split view' }));
    await expect(canvas.getByRole('textbox', { name: /Current configuration$/ })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: /Proposed configuration$/ })).toBeVisible();
  },
};
function EditingExample(args: DiffViewProps) {
  const [value, setValue] = useState(args.modified);
  return (
    <div className="stack">
      <DiffView
        {...args}
        modified={value}
        onModifiedChange={(next) => {
          setValue(next);
          args.onModifiedChange?.(next);
        }}
      />
      <Button>Save proposed configuration</Button>
    </div>
  );
}
export const EditableProposal: Story = {
  args: {
    readOnly: false,
    onModifiedChange: fn(),
    original: 'level: high\n',
    modified: 'level: critical\n',
    minHeight: 140,
  },
  render: (args) => <EditingExample {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('textbox', { name: /Proposed configuration$/ }));
    await userEvent.keyboard('{End}{Enter}# Reviewed');
    await waitFor(() =>
      expect(args.onModifiedChange).toHaveBeenCalledWith(expect.stringContaining('# Reviewed')),
    );
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Save proposed configuration' })).toHaveFocus();
  },
};
