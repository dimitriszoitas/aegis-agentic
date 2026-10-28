import { Field } from '@/components/field';
import { Combobox } from '@/components/combobox';
import type { AnatomyDefinition } from './types';
export const comboboxAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="combobox">
      <Field
        id="combobox-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <Combobox
          defaultValue="ath"
          options={[
            { value: 'ath', label: 'Athens' },
            { value: 'ber', label: 'Berlin' },
          ]}
        />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="combobox"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="combobox"] input[role="combobox"]',
      name: 'Search and selection',
      description: 'The visible input edits a query; Base UI selects stable option IDs.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="combobox"] button[aria-label="Clear selection"]',
      name: 'Clear action',
      description: 'Shared IconButton requests an empty selection.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="combobox"] button[aria-label="Show options"]',
      name: 'Open action',
      description: 'Base UI controls the listbox; the nested IconButton retains trigger tokens.',
      anchor: 'bottom-right',
    },
    {
      selector: '[data-anatomy="combobox"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'bottom-left',
    },
    {
      selector: '[data-anatomy="combobox"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'left',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
