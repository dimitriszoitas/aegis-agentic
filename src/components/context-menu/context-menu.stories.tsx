import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Clipboard, ExternalLink, Trash2, UserRound } from '@/components/icon';
import { ContextMenu, type ContextMenuEntry } from './context-menu';

const items: ContextMenuEntry[] = [
  {
    type: 'group',
    id: 'actions',
    label: 'REC-00842 · Record actions',
    items: [
      { id: 'open', label: 'Open project', icon: <ExternalLink />, shortcut: '↵' },
      { id: 'copy', label: 'Copy record identifier', icon: <Clipboard />, shortcut: '⌘C' },
      {
        type: 'submenu',
        id: 'assign',
        label: 'Assign member',
        icon: <UserRound />,
        items: [
          { id: 'maya', label: 'Maya Chen' },
          { id: 'nikos', label: 'Nikos Papadopoulos' },
        ],
      },
    ],
  },
  { type: 'separator', id: 'divider' },
  { id: 'delete', label: 'Delete project note', icon: <Trash2 />, intent: 'destroy' },
];
const meta = {
  id: 'components-lists-contextmenu',
  title: 'Components/Triggers/ContextMenu',
  component: ContextMenu,
  parameters: { docs: { story: { inline: false, height: 460 } } },
  tags: ['autodocs'],
  args: {
    children: (
      <div className="aegis-context-target">
        Customer portal redesign
        <br />
        <small>Right-click or press Shift+F10 to open record actions.</small>
      </div>
    ),
    items,
  },
} satisfies Meta<typeof ContextMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const OpenActions: Story = { args: { defaultOpen: true } };
export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <div className="aegis-context-target">
        Archived project · Context actions are unavailable.
      </div>
    ),
  },
};
function Preferences({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [pinned, setPinned] = useState(true);
  const [view, setView] = useState('documents');
  return (
    <ContextMenu
      defaultOpen={defaultOpen}
      items={[
        {
          type: 'checkbox',
          id: 'pin',
          label: 'Pin documents panel',
          checked: pinned,
          onCheckedChange: setPinned,
        },
        { type: 'separator', id: 'divider' },
        {
          type: 'radio-group',
          id: 'view',
          label: 'Project view',
          value: view,
          onValueChange: setView,
          options: [
            { value: 'documents', label: 'Documents' },
            { value: 'timeline', label: 'Timeline' },
            { value: 'rule', label: 'Workflow settings' },
          ],
        },
      ]}
    >
      <div className="aegis-context-target">
        Project workspace
        <br />
        <small>Right-click or press Shift+F10 to adjust the view.</small>
      </div>
    </ContextMenu>
  );
}
export const CheckboxAndRadio: Story = { render: () => <Preferences /> };
export const OpenCheckboxAndRadio: Story = { render: () => <Preferences defaultOpen /> };
