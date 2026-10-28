import { Field } from '@/components/field';
import { PhoneInput } from '@/components/phone-input';
import type { AnatomyDefinition } from './types';
export const phoneInputAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="phone-input">
      <Field
        id="phone-input-anatomy"
        label="Example value"
        helpText="Instructions belong to the host task."
        error="Review this example value."
      >
        <PhoneInput defaultValue="2025550123" defaultCountry="US" countries={['US', 'GB', 'GR']} />
      </Field>
    </div>
  ),
  parts: [
    {
      selector: '[data-anatomy="phone-input"] .aegis-field-label',
      name: 'Field label',
      description: 'Visible name linked to the primary input.',
      anchor: 'top-left',
    },
    {
      selector: '[data-anatomy="phone-input"] .aegis-select-trigger',
      name: 'Country context',
      description:
        'Country selection supplies the default calling context; it does not rewrite raw text.',
      anchor: 'top',
    },
    {
      selector: '[data-anatomy="phone-input"] input[type="tel"]',
      name: 'Raw telephone draft',
      description: 'One named native tel input preserves user editing.',
      anchor: 'right',
    },
    {
      selector: '[data-anatomy="phone-input"] .aegis-phone-preview',
      name: 'Formatting preview',
      description:
        'Metadata-backed formatting is a candidate, not ownership or reachability verification.',
      anchor: 'bottom-right',
    },
    {
      selector: '[data-anatomy="phone-input"] .aegis-field-help',
      name: 'Description',
      description: 'Field associates useful instructions with the primary input.',
      anchor: 'bottom-left',
    },
    {
      selector: '[data-anatomy="phone-input"] .aegis-field-error',
      name: 'Host validation',
      description: 'The host supplies domain-specific recovery guidance.',
      anchor: 'left',
    },
  ],
  note: 'Input group styles own this family; actual nested components retain their own token groups. This specimen demonstrates structure, not a verified business value.',
};
