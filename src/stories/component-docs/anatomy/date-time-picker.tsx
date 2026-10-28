import { Field } from '@/components/field';
import { DateTimePicker } from '@/components/date-time-picker';
import type { AnatomyDefinition } from './types';
export const dateTimePickerAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="date-time-picker">
      <Field
        id="date-time-picker-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <DateTimePicker defaultValue="2027-04-12T09:30" timeZone="Europe/Athens" />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="date-time-picker"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="date-time-picker"] input[type="datetime-local"]',
      name: 'Local date/time',
      description: 'An offset-free wall time, never an automatically converted UTC instant.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="date-time-picker"] .aegis-date-time-zone',
      name: 'Zone policy',
      description: 'The explicit interpretation is always visible and linked as input description.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="date-time-picker"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'bottom-right',
    },
    {
      selector: '[data-anatomy="date-time-picker"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'bottom-left',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
