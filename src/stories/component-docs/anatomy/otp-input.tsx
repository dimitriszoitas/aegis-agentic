import { Field } from '@/components/field';
import { OtpInput } from '@/components/otp-input';
import type { AnatomyDefinition } from './types';
export const otpInputAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="otp-input">
      <Field
        id="otp-input-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <OtpInput defaultValue="123456" length={6} />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="otp-input"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="otp-input"] input',
      name: 'Complete code',
      description:
        'One native input owns selection, paste, autocomplete and form naming. There are no fake per-cell inputs.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="otp-input"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="otp-input"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'bottom-right',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
