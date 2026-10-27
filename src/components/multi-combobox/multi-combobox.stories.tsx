import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Fingerprint, Globe, Monitor, Shield } from '@/components/icon';
import { MultiCombobox, type MultiComboboxOption } from './multi-combobox';
import { Field } from '@/components/field';

const sources: MultiComboboxOption[] = [
  {
    value: 'projects',
    label: 'Project tracker',
    description: 'Project milestones and delivery schedules.',
    icon: <Monitor size={16} />,
    group: 'Planning',
    keywords: ['planning', 'projects'],
  },
  {
    value: 'tasks',
    label: 'Task board',
    description: 'Team tasks and workload planning.',
    icon: <Shield size={16} />,
    group: 'Planning',
    keywords: ['planning', 'tasks'],
  },
  {
    value: 'customers',
    label: 'Customer directory',
    description: 'Customer accounts and relationship updates.',
    icon: <Fingerprint size={16} />,
    group: 'Customers',
  },
  {
    value: 'contacts',
    label: 'Contact list',
    description: 'Customer contacts and communication preferences.',
    icon: <Fingerprint size={16} />,
    group: 'Customers',
  },
  {
    value: 'billing',
    label: 'Billing platform',
    description: 'Invoices, subscriptions, and payments.',
    icon: <Globe size={16} />,
    group: 'Finance',
  },
  {
    value: 'retired',
    label: 'Archived workspace',
    description: 'Connector disabled after migration.',
    disabled: true,
    group: 'Finance',
  },
];
const meta = {
  id: 'components-forms-multicombobox',
  title: 'Components/Inputs & Selection/MultiCombobox',
  component: MultiCombobox,
  tags: ['autodocs'],
  args: { label: 'Included sources', options: sources },
  parameters: {
    docs: {
      story: { inline: false, height: 480 },
      description: {
        component:
          'A multi-select popover with Base UI Combobox primitives. Checked state and active keyboard focus remain independent. Type to filter, use Arrow/Home/End to navigate, Enter to toggle, Escape to close and Backspace on an empty search to remove the last selection. Select all applies to enabled filtered options. Set filterOptions=false for externally searched results.',
      },
    },
  },
} satisfies Meta<typeof MultiCombobox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <MultiCombobox label="Included sources" options={sources} />
      <MultiCombobox
        label="Planning sources"
        options={sources}
        defaultValue={['projects', 'tasks']}
      />
      <MultiCombobox
        label="All active sources"
        options={sources}
        defaultValue={['projects', 'tasks', 'customers', 'contacts', 'billing']}
        maxVisible={2}
      />
      <MultiCombobox
        label="Managed scope"
        options={sources}
        defaultValue={['customers', 'contacts']}
        disabled
      />
      <Field label="Project scope" required error="Choose at least one source for this project.">
        <MultiCombobox options={sources} />
      </Field>
    </div>
  ),
};
export const OpenGrouped: Story = {
  args: { defaultOpen: true, defaultValue: ['projects', 'customers'] },
};
export const Loading: Story = { args: { defaultOpen: true, loading: true, options: [] } };
export const EmptyResults: Story = {
  args: { defaultOpen: true, options: [], emptyLabel: 'No sources match this project scope' },
};
export const AsyncResults: Story = {
  render: function AsyncSources() {
    const [search, setSearch] = useState('');
    // The caller owns search state and may replace these results after an API request.
    const results = sources.filter((source) =>
      source.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    );
    return (
      <MultiCombobox
        label="Connected sources"
        options={results}
        search={search}
        onSearchChange={setSearch}
        filterOptions={false}
        defaultOpen
      />
    );
  },
};
export const KeyboardSelection: Story = {
  render: function ControlledSelection() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <div className="stack">
        <MultiCombobox
          label="Included sources"
          options={sources}
          value={value}
          onValueChange={setValue}
        />
        <output aria-live="polite">{value.length} connected sources included</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Included sources' }));
    const input = await body.findByRole('combobox', { name: 'Search sources' });
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.type(input, 'planning');
    await userEvent.keyboard('{Home}{Enter}');
    await expect(body.getByRole('option', { name: /Project tracker/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(canvas.getByText('2 connected sources included')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvas.getByRole('combobox', { name: 'Included sources' })).toHaveFocus(),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Project tracker' }));
    await expect(canvas.getByText('1 connected sources included')).toBeInTheDocument();
  },
};
export const KeyboardChipRemoval: Story = {
  args: { defaultValue: ['projects', 'tasks', 'customers', 'contacts'], maxVisible: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Remove Project tracker' }).focus();
    await userEvent.keyboard('{Delete}');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Remove Task board' })).toHaveFocus(),
    );
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Remove Customer directory' })).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Remove Contact list' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Remove Task board' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Delete}');
    await waitFor(() =>
      expect(canvas.getByRole('combobox', { name: 'Included sources' })).toHaveFocus(),
    );
    await expect(canvas.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  },
};
