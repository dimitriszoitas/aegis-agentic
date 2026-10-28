import { useState } from 'react';
import { UnsavedNavigationGuard } from '@/patterns/unsaved-navigation-guard';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import type { AnatomyDefinition } from './types';
function Specimen() {
  const [route, setRoute] = useState('Editor');
  return (
    <div data-anatomy="unsaved-navigation-guard">
      <UnsavedNavigationGuard dirty>
        {({ requestNavigation, pending }) => (
          <div className="stack">
            <TextInput label="Local draft" defaultValue="Unsaved text" />
            <Button
              disabled={pending}
              onClick={() => void requestNavigation(() => setRoute('Overview'))}
            >
              Request navigation
            </Button>
            <p role="status">{route}</p>
          </div>
        )}
      </UnsavedNavigationGuard>
    </div>
  );
}
export const unsavedNavigationGuardAnatomy: AnatomyDefinition = {
  render: () => <Specimen />,
  note: 'Activate Request navigation to inspect the actual shared ConfirmDialog. The adapter never discovers or intercepts application routes automatically.',
  parts: [
    {
      name: 'Guarded host region',
      description: 'Host content and explicit transition adapter.',
      selector: '[data-anatomy="unsaved-navigation-guard"] .aegis-unsaved-navigation-guard',
    },
    {
      name: 'Host draft',
      description: 'Host retains dirty state and actual data.',
      selector: '[data-anatomy="unsaved-navigation-guard"] input',
    },
    {
      name: 'Transition request',
      description: 'Calls requestNavigation with the host’s real destination callback.',
      selector: '[data-anatomy="unsaved-navigation-guard"] button',
    },
    {
      name: 'Local destination',
      description: 'A bounded local navigation result.',
      selector: '[data-anatomy="unsaved-navigation-guard"] [role="status"]',
    },
  ],
};
