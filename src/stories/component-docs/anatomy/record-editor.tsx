import { RecordEditor } from '@/patterns/record-editor';
import { TextInput } from '@/components/text-input';
import { Field } from '@/components/field';
import type { AnatomyDefinition } from './types';
export const recordEditorAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="record-editor">
      <RecordEditor
        recordId="anatomy-contact"
        record={{ name: 'Alex' }}
        version={1}
        title="Contact"
        defaultEditing
        createDraft={(record) => ({ ...record, name: 'Alex Morgan' })}
        isEqual={(a, b) => a.name === b.name}
        renderView={(record) => <p>{record.name}</p>}
        renderFields={({ draft, onDraftChange, disabled }) => (
          <Field label="Name">
            <TextInput
              value={draft.name}
              disabled={disabled}
              onValueChange={(name) => onDraftChange({ name })}
            />
          </Field>
        )}
        onSave={async (record, operation) => ({
          record,
          version: Number(operation.expectedVersion) + 1,
        })}
        onDelete={async () => {}}
      />
    </div>
  ),
  note: 'An edit session with a deliberately changed local draft. Saving returns a new local version; no remote persistence is implied.',
  parts: [
    {
      name: 'Record header',
      description: 'Record identity and mode actions.',
      selector: '[data-anatomy="record-editor"] .aegis-record-editor-header',
    },
    {
      name: 'Native edit form',
      description: 'Host-rendered fields and native constraint validation.',
      selector: '[data-anatomy="record-editor"] form',
    },
    {
      name: 'Draft fields',
      description: 'Native disabled boundary; portaled controls also receive disabled.',
      selector: '[data-anatomy="record-editor"] .aegis-record-editor-fields',
    },
    {
      name: 'Save and discard',
      description: 'Shared UnsavedChangesBar invokes this session’s operations.',
      selector: '[data-anatomy="record-editor"] .aegis-unsaved-bar',
    },
  ],
};
