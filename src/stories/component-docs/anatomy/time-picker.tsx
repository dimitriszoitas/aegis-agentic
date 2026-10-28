import { Field } from '@/components/field';
import { TimePicker } from '@/components/time-picker';
import type { AnatomyDefinition } from './types';
export const timePickerAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="time-picker">
      <Field
        id="time-picker-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <TimePicker defaultValue="09:30" min="08:00" max="18:00" />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="time-picker"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="time-picker"] input[type="time"]',
      name: 'Local time',
      description:
        'The native control keeps HH:mm values; the browser owns the visible segments and picker.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="time-picker"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="time-picker"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'bottom-right',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
