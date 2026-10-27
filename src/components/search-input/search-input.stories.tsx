import { useArgs, useState as useStoryState } from 'storybook/preview-api';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SearchInput } from './search-input';

const meta = {
  id: 'components-forms-searchinput',
  title: 'Components/Inputs & Selection/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  args: {
    label: 'Search records',
    placeholder: 'Search project, customer, or owner',
    shortcut: '⌘ K',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Immediate input feedback with a cancelable debounced onSearch callback. The shortcut is a hint; the owning page handles the shortcut action. Native onChange and onValueChange remain immediate.',
      },
    },
  },
} satisfies Meta<typeof SearchInput>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <SearchInput label="Search events" size="sm" defaultValue="PRJ-0042" shortcut="/" />
      <SearchInput label="Search records" size="md" defaultValue="Portal" shortcut="⌘ K" />
      <SearchInput label="Search projects" size="lg" placeholder="Search project name or owner" />
      <SearchInput label="Search archived records" defaultValue="source:projects" disabled />
      <SearchInput label="Saved query" defaultValue="severity:critical status:new" readOnly />
      <SearchInput
        label="Invalid query"
        defaultValue="severity:"
        invalid
        aria-describedby="search-syntax-error"
      />
      <p id="search-syntax-error" className="muted">
        Add a severity value, such as severity:critical.
      </p>
    </div>
  ),
};

const records = [
  'Customer portal redesign',
  'Customer onboarding checklist',
  'Invoice approval pending',
];
export const DebouncedSearch: Story = {
  render: function SearchExample() {
    const [query, setQuery] = useState('');
    const matches = records.filter((record) => record.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className="stack">
        <SearchInput label="Search projects" debounceMs={200} onSearch={setQuery} />
        <div role="status">{matches.length} matching projects</div>
        <ul>
          {matches.map((record) => (
            <li key={record}>{record}</li>
          ))}
        </ul>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search projects' }), 'Portal');
    await waitFor(() =>
      expect(canvas.getByRole('status')).toHaveTextContent('1 matching projects'),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
    await waitFor(() =>
      expect(canvas.getByRole('status')).toHaveTextContent('3 matching projects'),
    );
  },
};

export const Playground: Story = {
  args: {
    label: 'Search projects',
    value: '',
    placeholder: 'Search by project name',
    shortcut: '⌘ K',
    size: 'md',
    debounceMs: 250,
    clearable: true,
    disabled: false,
    readOnly: false,
    invalid: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    placeholder: { control: 'text' },
    shortcut: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    debounceMs: { control: { type: 'number', min: 0, max: 2000, step: 50 } },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
  render: function SearchPlayground(args) {
    const [, updateArgs] = useArgs();
    const [query, setQuery] = useStoryState(args.value ?? '');
    const matches = records.filter((record) => record.toLowerCase().includes(query.toLowerCase()));
    return (
      <div className="stack">
        <SearchInput
          {...args}
          onValueChange={(value) => updateArgs({ value })}
          onSearch={setQuery}
        />
        <p role="status">{matches.length} matching projects</p>
        <ul>
          {matches.map((record) => (
            <li key={record}>{record}</li>
          ))}
        </ul>
      </div>
    );
  },
};
