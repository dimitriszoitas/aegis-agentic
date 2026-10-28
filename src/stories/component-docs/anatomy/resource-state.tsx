import { useState } from 'react';
import { ResourceState } from '@/patterns/resource-state';
import { TextInput } from '@/components/text-input';
import type { AnatomyDefinition } from './types';
function Specimen() {
  const [stale, setStale] = useState(true);
  return (
    <div data-anatomy="resource-state">
      <ResourceState
        label="Customer data"
        status={stale ? 'stale' : 'ready'}
        message="Showing the last successful response."
        onRetry={() => setStale(false)}
      >
        <TextInput label="Retained customer note" defaultValue="Editable while stale" />
      </ResourceState>
    </div>
  );
}
export const resourceStateAnatomy: AnatomyDefinition = {
  render: () => <Specimen />,
  note: 'Stale state retains the same content subtree. Retry changes only this local illustrative state.',
  parts: [
    {
      name: 'Named resource',
      description: 'Host resource name and explicit busy state.',
      selector: '[data-anatomy="resource-state"] .aegis-resource-state',
    },
    {
      name: 'State feedback',
      description: 'Shared notice and optional host retry action.',
      selector: '[data-anatomy="resource-state"] [data-resource-slot="feedback"]',
    },
    {
      name: 'Retained content',
      description: 'Host content stays mounted for ready, refresh and stale states.',
      selector: '[data-anatomy="resource-state"] [data-resource-slot="content"]',
    },
  ],
};
