import { useState } from 'react';
import { Button } from '@/components/button';
import { Select } from '@/components/select';
import type { AnatomyDefinition } from '@/stories/component-docs/anatomy/types';
import { CollectionToolbar } from '@/patterns/collection-toolbar';

function Specimen() {
  const [query, setQuery] = useState('Invoice');
  const [status, setStatus] = useState('open');
  return (
    <div data-anatomy="collection-toolbar">
      <CollectionToolbar
        label="Request controls"
        searchLabel="Search requests"
        query={query}
        onQueryChange={setQuery}
        resultCount={2}
        filters={({ disabled }) => (
          <Select
            aria-label="Status"
            value={status}
            onValueChange={setStatus}
            disabled={disabled}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        )}
        actions={({ disabled }) => (
          <Button disabled={disabled} onClick={() => setQuery('')}>
            Clear search
          </Button>
        )}
      />
    </div>
  );
}
export const collectionToolbarAnatomy: AnatomyDefinition = {
  render: () => <Specimen />,
  note: 'One real toolbar with search, a host-controlled filter, a host action and a result count. SearchInput, Select and Button keep their own styling and interactions.',
  parts: [
    {
      name: 'Search',
      description: 'Shared controlled SearchInput with a consistent token-backed basis.',
      selector: '[data-anatomy="collection-toolbar"] [data-collection-slot="search"]',
    },
    {
      name: 'Filters',
      description: 'Host controls rendered with explicit busy and disabled state.',
      selector: '[data-anatomy="collection-toolbar"] [data-collection-slot="filters"]',
    },
    {
      name: 'Actions',
      description: 'Host-owned collection actions after the filters.',
      selector: '[data-anatomy="collection-toolbar"] [data-collection-slot="actions"]',
    },
    {
      name: 'Result status',
      description: 'The count supplied by the host, or the pending-work message.',
      selector: '[data-anatomy="collection-toolbar"] [data-collection-slot="count"]',
    },
  ],
};
