import { Field } from '@/components/field';
import { KeyRound } from '@/components/icon';
import { componentToken } from '@/lib/component-design-tokens';
import type { AnatomyDefinition } from '@/stories/component-docs/anatomy/types';
import { PasswordInput } from '@/components/password-input';

/** The central annotation renderer measures these actual rendered DOM parts. */
export const passwordInputAnatomy: AnatomyDefinition = {
  render: () => (
    <div data-anatomy="password-input">
      <Field
        label="New password"
        helpText="Use a unique password for this account."
        error="This example needs a longer password."
        required
      >
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          defaultValue="example-only"
          prefix={<KeyRound size={componentToken('input.icon-sm')} aria-hidden="true" />}
        />
      </Field>
    </div>
  ),
  parts: [
    {
      name: 'Label and requirement',
      description: 'Field names the native input and supplies the required association.',
      selector: '[data-anatomy="password-input"] .aegis-field-label',
      anchor: 'top-left',
    },
    {
      name: 'Optional prefix',
      description:
        'A caller-supplied visual; a decorative key is hidden from assistive technology.',
      selector: '[data-anatomy="password-input"] .aegis-input-prefix',
      anchor: 'left',
    },
    {
      name: 'Native password input',
      description:
        'The real form control receives the public ref, value, name and native properties.',
      selector: '[data-anatomy="password-input"] input',
      anchor: 'bottom',
    },
    {
      name: 'Visibility action',
      description: 'A named, non-submitting IconButton reveals or conceals the same native input.',
      selector: '[data-anatomy="password-input"] .aegis-password-toggle button',
      anchor: 'right',
    },
    {
      name: 'Help text',
      description: 'Field includes supporting instructions in the input description.',
      selector: '[data-anatomy="password-input"] .aegis-field-help',
      anchor: 'left',
    },
    {
      name: 'Validation feedback',
      description:
        'Field supplies the error association and invalid state; validation belongs to the host.',
      selector: '[data-anatomy="password-input"] .aegis-field-error',
      anchor: 'bottom-right',
    },
  ],
  note: 'Demonstration text only. Revealing changes the native input type and preserves its value; the action keeps focus.',
};
