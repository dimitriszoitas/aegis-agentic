import { InlineEdit } from '@/components/inline-edit';
import type { AnatomyDefinition } from './types';
export const inlineEditAnatomy: AnatomyDefinition = {
  render: () => (
    <InlineEdit
      data-anatomy="inline-edit"
      label="Project name"
      value="Atlas research"
      onSave={() => {}}
    />
  ),
  parts: [
    {
      name: 'Visible field name',
      description: 'Names the value and the edit action.',
      selector: '[data-anatomy="inline-edit"] .aegis-inline-edit-label',
      anchor: 'top-left',
    },
    {
      name: 'Committed value',
      description: 'The host-owned value shown outside the local draft.',
      selector: '[data-anatomy="inline-edit"] .aegis-inline-edit-value',
      anchor: 'bottom-left',
    },
    {
      name: 'Edit action',
      description: 'Opens a local draft and focuses its native input.',
      selector: '[data-anatomy="inline-edit"] button',
      anchor: 'right',
    },
  ],
  note: 'Display state. Editing replaces the value with a Field, native TextInput, explicit Save/Cancel actions and pending/error feedback. This specimen does not persist changes.',
};
