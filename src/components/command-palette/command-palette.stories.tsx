import { useArgs, useState as useStoryState } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { useState } from 'react';
import { Folder, FileCode, Search, Clock, Plus } from '@/components/icon';
import { CommandPalette, type CommandAction } from './command-palette';
import { Button } from '@/components/button';
export default {
  id: 'components-navigation-commandpalette',
  title: 'Components/Navigation/CommandPalette',
  component: CommandPalette,
  parameters: { docs: { story: { inline: false, height: 620 } } },
} satisfies Meta<typeof CommandPalette>;
function Commands({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen),
    [result, setResult] = useState('Use ⌘K or Ctrl+K to search your workspace.');
  const actions: CommandAction[] = [
    {
      id: 'records',
      label: 'Go to records',
      group: 'Navigation',
      icon: <Folder />,
      shortcut: 'G A',
      onSelect: () => setResult('Records workspace selected'),
    },
    {
      id: 'rules',
      label: 'Workflow rules',
      group: 'Navigation',
      icon: <FileCode />,
      onSelect: () => setResult('Workflow rules workspace selected'),
    },
    {
      id: 'new-rule',
      label: 'Create workflow rule',
      group: 'Actions',
      icon: <Plus />,
      onSelect: () => setResult('Workflow rule creation selected'),
    },
    {
      id: 'search-milestones',
      label: 'Search project milestones',
      group: 'Actions',
      icon: <Search />,
      onSelect: () => setResult('Project milestone search opened'),
    },
    {
      id: 'recent-record',
      label: 'Customer onboarding checklist',
      group: 'Recent records',
      icon: <Clock />,
      onSelect: () => setResult('REC-1048 project selected'),
    },
  ];
  return (
    <div className="stack">
      <Button leadingIcon={<Search size={16} />} onClick={() => setOpen(true)}>
        Search workspace
      </Button>
      <p role="status" className="muted">
        {result}
      </p>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        actions={actions}
        onAskAi={(query) => setResult(`Aegis AI received ${query || 'your selected records'}.`)}
      />
    </div>
  );
}
export const Matrix: StoryObj<typeof CommandPalette> = { render: () => <Commands /> };
export const OpenPalette: StoryObj<typeof CommandPalette> = {
  render: () => <Commands defaultOpen />,
};
export const KeyboardFocus: StoryObj<typeof CommandPalette> = {
  render: () => <Commands />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const portal = within(document.body);
    const opener = canvas.getByRole('button', { name: 'Search workspace' });
    opener.focus();
    await userEvent.keyboard('{Enter}');
    const input = await portal.findByRole('combobox', { name: 'Search commands' });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
    await userEvent.keyboard('{Enter}');
    await userEvent.type(await portal.findByRole('combobox'), 'Go to records');
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByRole('status')).toHaveTextContent('Records workspace selected');
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

interface CommandPlaygroundOptions {
  open: boolean;
  shortcut: boolean;
  showAi: boolean;
  showIcons: boolean;
  actionSet: 'all' | 'navigation' | 'empty';
}
export const Playground: StoryObj<CommandPlaygroundOptions> = {
  args: { open: false, shortcut: true, showAi: true, showIcons: true, actionSet: 'all' },
  argTypes: {
    open: { control: 'boolean' },
    shortcut: { control: 'boolean' },
    showAi: { control: 'boolean' },
    showIcons: { control: 'boolean' },
    actionSet: { control: 'inline-radio', options: ['all', 'navigation', 'empty'] },
  },
  render: function CommandPlayground(args) {
    const [, updateArgs] = useArgs();
    const [result, setResult] = useStoryState('Choose an action to preview its result.');
    const actions: CommandAction[] = [
      {
        id: 'projects',
        label: 'Go to projects',
        group: 'Navigation',
        icon: args.showIcons ? <Folder /> : undefined,
        onSelect: () => setResult('Projects selected'),
      },
      {
        id: 'customers',
        label: 'Go to customers',
        group: 'Navigation',
        icon: args.showIcons ? <Search /> : undefined,
        onSelect: () => setResult('Customers selected'),
      },
      {
        id: 'create',
        label: 'Create project',
        group: 'Actions',
        icon: args.showIcons ? <Plus /> : undefined,
        onSelect: () => setResult('Project creation selected'),
      },
    ];
    return (
      <div className="stack">
        <Button onClick={() => updateArgs({ open: true })}>Search workspace</Button>
        <p className="muted" role="status">
          {result}
        </p>
        <CommandPalette
          open={args.open}
          onOpenChange={(open) => updateArgs({ open })}
          shortcut={args.shortcut}
          actions={
            args.actionSet === 'empty'
              ? []
              : args.actionSet === 'navigation'
                ? actions.filter((action) => action.group === 'Navigation')
                : actions
          }
          onAskAi={
            args.showAi
              ? (query) => setResult(`Aegis AI request: ${query || 'current workspace'}`)
              : undefined
          }
        />
      </div>
    );
  },
};
