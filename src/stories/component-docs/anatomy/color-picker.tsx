import colors from '@/stories/fixtures/color-picker-values.json';
import { Field } from '@/components/field';
import { ColorPicker } from '@/components/color-picker';
import type { AnatomyDefinition } from './types';
export const colorPickerAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="color-picker">
      <Field
        id="color-picker-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <ColorPicker
          defaultValue={colors.blueHalf}
          alpha
          swatches={[
            { value: colors.blue, label: 'Blue' },
            { value: colors.purple, label: 'Purple' },
          ]}
        />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="color-picker"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="color-picker"] input[type="text"]',
      name: 'Hex draft',
      description: 'Invalid text remains visible without replacing the committed color.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="color-picker"] .aegis-color-native',
      name: 'Native RGB picker',
      description: 'Browser-owned RGB selection; alpha is separate.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="color-picker"] .aegis-number-input',
      name: 'Opacity',
      description: 'A shared NumberInput expresses alpha as a percentage.',
      anchor: 'bottom-right',
    },
    {
      selector: '[data-anatomy="color-picker"] .aegis-color-swatches',
      name: 'Named swatches',
      description:
        'Real Buttons expose names and pressed state; the chip only shows user color data.',
      anchor: 'bottom-left',
    },
    {
      selector: '[data-anatomy="color-picker"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'left',
    },
    {
      selector: '[data-anatomy="color-picker"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'top-left',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
