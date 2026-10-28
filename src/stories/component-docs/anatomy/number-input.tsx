import { Field } from '@/components/field';
import type { AnatomyDefinition } from '@/stories/component-docs/anatomy/types';
import { NumberInput } from '@/components/number-input';

/** Documentation-only specimen; not exported by the component's public entry. */
export const numberInputAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="number-input">
      <Field
        id="number-anatomy"
        label="Reserved seats"
        helpText="Use whole seats for this allocation."
        error="The project owner must approve this allocation."
      >
        <NumberInput
          defaultValue={12}
          min={0}
          step={1}
          decrementLabel="Decrease reserved seats"
          incrementLabel="Increase reserved seats"
        />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="number-input"] .aegis-field-label',
      name: 'Field label',
      description:
        'A visible name linked to the editable control; a standalone label prop is the alternative.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="number-input"] .aegis-number-input-control',
      name: 'Numeric entry',
      description:
        'Base UI owns locale-aware editing and keyboard stepping. Clearing requests null.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="number-input"] button[aria-label="Decrease reserved seats"]',
      name: 'Decrement',
      description:
        'Base UI stepping rendered through a shared IconButton. It retains trigger tokens.',
      anchor: 'left',
    },
    {
      selector: '[data-anatomy="number-input"] button[aria-label="Increase reserved seats"]',
      name: 'Increment',
      description: 'Optional pointer/touch action; both steppers stay outside the Tab sequence.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="number-input"] .aegis-field-help',
      name: 'Description',
      description: 'Field merges this help reference into the input accessible description.',
      anchor: 'bottom-left',
    },
    {
      selector: '[data-anatomy="number-input"] .aegis-field-error',
      name: 'Host error',
      description: 'The application decides validation and supplies useful recovery text.',
      anchor: 'bottom-right',
    },
  ],
  note: 'The form-associated numeric input is intentionally hidden. It submits the raw number; the visible input presents the localized text. Steppers can be hidden without removing keyboard stepping.',
};
