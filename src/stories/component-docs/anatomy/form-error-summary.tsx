import { FormErrorSummary } from '@/patterns/form-error-summary';
import { TextInput } from '@/components/text-input';
import type { AnatomyDefinition } from './types';
export const formErrorSummaryAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="form-error-summary" className="stack">
      <FormErrorSummary
        description="Review the fields below."
        errors={[
          { id: 'email', fieldId: 'anatomy-summary-email', message: 'Enter an email address.' },
        ]}
      />
      <TextInput id="anatomy-summary-email" label="Email" invalid />
    </div>
  ),
  note: 'Real summary and field target. The host supplies validation messages; activating a link focuses its associated input.',
  parts: [
    {
      name: 'Summary title',
      description: 'Names the focusable summary region.',
      selector: '[data-anatomy="form-error-summary"] [data-form-error-slot="title"]',
    },
    {
      name: 'Description',
      description: 'Optional recovery instructions.',
      selector: '[data-anatomy="form-error-summary"] [data-form-error-slot="description"]',
    },
    {
      name: 'Error links',
      description: 'Native links to host-owned field IDs.',
      selector: '[data-anatomy="form-error-summary"] [data-form-error-slot="errors"]',
    },
    {
      name: 'Field target',
      description: 'The host retains field state and validation.',
      selector: '[data-anatomy="form-error-summary"] input',
    },
  ],
};
