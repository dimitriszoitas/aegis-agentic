import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import type { AnatomyDefinition } from '@/stories/component-docs/anatomy/types';
import { FormSection } from '@/patterns/form-section';

export const formSectionAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="form-section">
      <FormSection
        legend="Contact details"
        description="A related group of individually labeled fields."
        maxColumns={2}
        actions={<Button type="button">Host action</Button>}
      >
        <Field label="Name">
          <TextInput defaultValue="Alex Morgan" />
        </Field>
        <Field label="Email">
          <TextInput type="email" defaultValue="alex@example.com" />
        </Field>
      </FormSection>
    </div>
  ),
  note: 'One native fieldset with all optional regions present. Field supplies each control label; ContentGrid owns the responsive field layout. The action remains caller-owned.',
  parts: [
    {
      name: 'Legend',
      description: 'Native accessible name for the field group; keep it noninteractive.',
      selector: '[data-anatomy="form-section"] [data-form-section-slot="legend"]',
    },
    {
      name: 'Description',
      description: 'Associated with the fieldset through aria-describedby.',
      selector: '[data-anatomy="form-section"] [data-form-section-slot="description"]',
    },
    {
      name: 'Field grid',
      description: 'Existing ContentGrid adapts the maximum column count to the container.',
      selector: '[data-anatomy="form-section"] [data-form-section-slot="fields"]',
    },
    {
      name: 'Actions',
      description: 'Host controls after the fields, inside the native disabled boundary.',
      selector: '[data-anatomy="form-section"] [data-form-section-slot="actions"]',
    },
  ],
};
