import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from '@/components/button';
import { Select } from '@/components/select';
import { CollectionToolbar, type CollectionToolbarProps } from './collection-toolbar';
import { collectionToolbarAnatomy } from '@/stories/component-docs/anatomy/collection-toolbar';

const statuses = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];
type PlaygroundArgs = Omit<CollectionToolbarProps, 'filters' | 'actions' | 'onQueryChange'> & {
  showFilters: boolean;
  showActions: boolean;
  status: string;
};

const meta = {
  id: 'patterns-collectiontoolbar',
  title: 'Patterns/Filtering/CollectionToolbar',
  component: CollectionToolbar,
  tags: ['autodocs'],
  args: {
    label: 'Request controls',
    searchLabel: 'Search requests',
    query: '',
    resultCount: 3,
    searchPlaceholder: 'Search by title',
    busy: false,
    disabled: false,
    showFilters: true,
    showActions: true,
    status: 'all',
  },
  argTypes: {
    query: { control: 'text' },
    resultCount: { control: { type: 'number', min: 0, step: 1 } },
    busy: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showFilters: { control: 'boolean' },
    showActions: { control: 'boolean' },
    status: { control: 'inline-radio', options: ['all', 'open', 'closed'] },
  },
  render: function PlaygroundRenderer({ showFilters, showActions, status, ...args }) {
    const [, updateArgs] = useArgs();
    return (
      <CollectionToolbar
        {...args}
        onQueryChange={(query) => updateArgs({ query })}
        filters={
          showFilters
            ? ({ disabled }) => (
                <Select
                  aria-label="Status"
                  options={statuses}
                  value={status}
                  onValueChange={(status) => updateArgs({ status })}
                  disabled={disabled}
                />
              )
            : undefined
        }
        actions={
          showActions
            ? ({ disabled }) => (
                <Button
                  emphasis="secondary"
                  disabled={disabled}
                  onClick={() => updateArgs({ query: '', status: 'all' })}
                >
                  Clear criteria
                </Button>
              )
            : undefined
        }
      />
    );
  },
  parameters: {
    docs: {
      description: {
        component:
          'A generic collection control row with immediate controlled search, explicit filter/action slots and a live result count. The host owns filtering and fetching. Busy exposes pending work without disabling input; disabled locks search and is supplied to slot renderers. This does not replace DataGrid toolbar behavior or the WorkRecord-specific FilterBar.',
      },
    },
  },
} satisfies Omit<Meta<PlaygroundArgs>, 'component'> & { component: typeof CollectionToolbar };
export default meta;
type Story = StoryObj<PlaygroundArgs>;
export const Playground: Story = {};
export const Busy: Story = { args: { busy: true, query: 'invoice' } };
export const Disabled: Story = { args: { disabled: true, query: 'invoice' } };

function CollectionToolbarExample() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const records = [
    { title: 'Invoice correction', status: 'open' },
    { title: 'Workspace access', status: 'open' },
    { title: 'Invoice export', status: 'closed' },
  ];
  const matches = records.filter(
    (record) =>
      record.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === 'all' || status === record.status),
  );
  return (
    <div className="stack">
      <CollectionToolbar
        label="Local request controls"
        searchLabel="Search local requests"
        query={query}
        onQueryChange={setQuery}
        resultCount={matches.length}
        resultsId="collection-example-results"
        filters={({ disabled }) => (
          <Select
            aria-label="Request status"
            options={statuses}
            value={status}
            onValueChange={setStatus}
            disabled={disabled}
          />
        )}
        actions={({ disabled }) => (
          <Button
            emphasis="secondary"
            disabled={disabled}
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
          >
            Clear criteria
          </Button>
        )}
      />
      <ul id="collection-example-results" aria-label="Local requests">
        {matches.map((record) => (
          <li key={record.title}>{record.title}</li>
        ))}
      </ul>
      <p>Local illustrative records; no backend is connected.</p>
    </div>
  );
}
export const LocalFiltering: Story = {
  render: () => <CollectionToolbarExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('searchbox', { name: 'Search local requests' });
    await userEvent.type(input, 'invoice');
    await expect(canvas.getByRole('status')).toHaveTextContent('2 results');
    await userEvent.click(canvas.getByRole('combobox', { name: 'Request status' }));
    await userEvent.click(
      within(canvasElement.ownerDocument.body).getByRole('option', { name: 'Open' }),
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('1 result');
    await userEvent.click(canvas.getByRole('button', { name: 'Clear criteria' }));
    await expect(input).toHaveValue('');
    await expect(canvas.getByRole('status')).toHaveTextContent('3 results');
  },
};
export const Anatomy: Story = {
  render: () => <>{collectionToolbarAnatomy.render()}</>,
  parameters: { docs: { description: { story: collectionToolbarAnatomy.note } } },
};
