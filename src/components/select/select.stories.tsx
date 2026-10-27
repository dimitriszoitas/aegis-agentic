import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Fingerprint, Globe, Monitor, RadioTower } from '@/components/icon';
import { Select, type SelectOption } from './select';
import { Field } from '@/components/field';

const sources: SelectOption[] = [
  {
    value: 'projects',
    label: 'Project tracker',
    description: 'Milestones, tasks, and delivery updates.',
    icon: <Monitor size={16} />,
    group: 'Workspace sources',
  },
  {
    value: 'customers',
    label: 'Customer directory',
    description: 'Accounts, contacts, and relationship updates.',
    icon: <Fingerprint size={16} />,
    group: 'Workspace sources',
  },
  {
    value: 'billing',
    label: 'Billing platform',
    description: 'Invoices, subscriptions, and payment status.',
    icon: <Globe size={16} />,
    group: 'Connected services',
  },
  {
    value: 'calendar',
    label: 'Team calendar',
    description: 'Meetings, deadlines, and availability.',
    icon: <RadioTower size={16} />,
    group: 'Connected services',
  },
  {
    value: 'archive',
    label: 'Archived workspace',
    description: 'Restore this workspace before selecting it.',
    disabled: true,
    group: 'Connected services',
  },
];
const meta = {
  id: 'components-forms-select',
  title: 'Components/Inputs & Selection/Select',
  component: Select,
  tags: ['autodocs'],
  args: { label: 'Data source', options: sources, placeholder: 'Choose an data source' },
  parameters: {
    docs: {
      story: { inline: false, height: 460 },
      description: {
        component:
          'A single-selection Base UI listbox with labeled groups, descriptive options, icons, typeahead, Arrow/Home/End navigation, Escape dismissal and native form participation. Values must be nonempty strings.',
      },
    },
  },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Matrix: Story = {
  render: () => (
    <div className="story-grid">
      <Select label="Small source picker" options={sources} size="sm" defaultValue="projects" />
      <Select label="Default source picker" options={sources} defaultValue="customers" />
      <Select label="Large source picker" options={sources} size="lg" defaultValue="billing" />
      <Select label="Unselected source" options={sources} placeholder="Choose a source" />
      <Select label="Managed source" options={sources} defaultValue="projects" disabled />
      <Field label="Required source" required error="Choose the data source for this project.">
        <Select options={sources} placeholder="Choose a source" />
      </Field>
    </div>
  ),
};
export const OpenMenu: Story = { args: { defaultOpen: true, defaultValue: 'projects' } };
export const NoSources: Story = { args: { options: [], defaultOpen: true } };
export const KeyboardSelection: Story = {
  render: function ControlledSource() {
    const [source, setSource] = useState('projects');
    return (
      <div className="stack">
        <Select label="Data source" options={sources} value={source} onValueChange={setSource} />
        <output aria-live="polite">Selected source: {source}</output>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Data source' }));
    await waitFor(() =>
      expect(within(document.body).getByRole('option', { name: /^Project tracker/ })).toHaveFocus(),
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await expect(canvas.getByText('Selected source: customers')).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.getByRole('combobox', { name: 'Data source' })).toHaveFocus(),
    );
  },
};
