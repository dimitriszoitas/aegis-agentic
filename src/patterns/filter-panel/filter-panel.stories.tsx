import { useId, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { records, owners, referenceTime } from '@/sample-data';
import { FilterBar } from '@/patterns/filter-bar';
import { SeverityBadge } from '@/components/severity-badge';
import { EmptyState } from '@/components/empty-state';
import { applyRecordFilters, createDefaultFilters } from '@/lib/filters';
import { FilterPanel, type FilterPanelProps } from './filter-panel';

function Demo(args: FilterPanelProps) {
  const [filters, setFilters] = useState(args.value);
  return (
    <FilterPanel
      {...args}
      style={{ height: 760 }}
      value={filters}
      onValueChange={(next) => {
        setFilters(next);
        args.onValueChange(next);
      }}
    />
  );
}
function SynchronizedDemo(args: FilterPanelProps) {
  const [filters, setFilters] = useState(args.value);
  const [panelOpen, setPanelOpen] = useState(true);
  const panelId = useId();
  const filtered = applyRecordFilters(args.records, filters, referenceTime);
  const update = (next: typeof filters) => {
    setFilters(next);
    args.onValueChange(next);
  };
  return (
    <div className="surface" style={{ padding: 0, width: 'min(1100px, 100%)' }}>
      <FilterBar
        value={filters}
        onValueChange={update}
        owners={owners}
        now={referenceTime}
        filterMode="panel"
        filterPanelOpen={panelOpen}
        panelId={panelId}
        onTogglePanel={() => setPanelOpen((open) => !open)}
      />
      <div className="aegis-filter-sync-preview">
        {panelOpen && (
          <FilterPanel
            {...args}
            id={panelId}
            style={{ height: 700 }}
            value={filters}
            onValueChange={update}
          />
        )}
        <section className="aegis-filter-sync-results" aria-label="Matching record preview">
          <h3>{filtered.length} matching records</h3>
          {filtered.length ? (
            <ul>
              {filtered.slice(0, 8).map((record) => (
                <li key={record.id}>
                  <SeverityBadge severity={record.severity} />
                  <span>
                    {record.title}
                    <small>
                      {record.subject.name} · {record.source}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact />
          )}
        </section>
      </div>
    </div>
  );
}
const meta = {
  id: 'patterns-filterpanel',
  title: 'Patterns/Filtering/FilterPanel',
  component: FilterPanel,
  parameters: { layout: 'padded' },
  args: {
    records,
    owners,
    now: referenceTime,
    value: createDefaultFilters(),
    onValueChange: fn(),
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof FilterPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Applied: Story = {
  args: {
    value: {
      ...createDefaultFilters(),
      severities: ['critical', 'high'],
      sources: ['Projects'],
      statuses: ['new'],
    },
  },
};
export const FilterSearch: Story = { args: { defaultSearch: 'severity' } };
export const LongOptionGroup: Story = {
  args: {
    defaultSearch: 'assignee',
    owners: Array.from({ length: 12 }, (_, index) => ({
      id: `owner-${index + 1}`,
      name: `Member ${String(index + 1).padStart(2, '0')}`,
      initials: `A${index + 1}`,
      role: 'Operations member',
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(8);
    const showAll = canvas.getByRole('button', { name: 'Show all 13 Assignee options' });
    showAll.focus();
    await userEvent.keyboard('{Enter}');
    await expect(showAll).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(13);
    await userEvent.click(canvas.getByRole('checkbox', { name: /^Member 09/ }));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show first 8 of 13 Assignee options' }),
    );
    await expect(canvas.queryByRole('checkbox', { name: /^Member 09/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Show all 13 Assignee options' }));
    await expect(canvas.getByRole('checkbox', { name: /^Member 09/ })).toBeChecked();
    const search = canvas.getByRole('searchbox', { name: 'Search filter options' });
    await userEvent.clear(search);
    await userEvent.type(search, 'Member 09');
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(1);
    await expect(
      canvas.queryByRole('button', { name: /Show all|Show first 8/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(canvas.getByRole('checkbox', { name: /^Member 09/ })).not.toBeChecked();
  },
};
export const NoOptions: Story = { args: { defaultSearch: 'unavailable-source' } };
export const NoData: Story = { args: { records: [] } };
export const Disabled: Story = {
  args: { disabled: true, value: { ...createDefaultFilters(), severities: ['critical'] } },
};
export const Synchronized: Story = {
  render: (args) => <SynchronizedDemo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = () => within(canvas.getByRole('complementary', { name: /Filters/ }));
    await userEvent.click(panel().getByRole('checkbox', { name: /^Critical/ }));
    await expect(
      canvas.queryByRole('button', { name: 'Remove Critical severity filter' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Hide filter panel' }));
    await expect(
      canvas.getByRole('button', { name: 'Remove Critical severity filter' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Critical severity filter' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Show filter panel' }));
    await expect(panel().getByRole('checkbox', { name: /^Critical/ })).not.toBeChecked();
    await userEvent.click(panel().getByRole('checkbox', { name: /^Unassigned/ }));
    await userEvent.click(canvas.getByRole('button', { name: 'Hide filter panel' }));
    await expect(
      canvas.getByRole('button', { name: 'Remove Unassigned assignee filter' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show filter panel' }));
    await expect(panel().getByRole('checkbox', { name: /^Unassigned/ })).toBeChecked();
    await userEvent.click(panel().getByRole('button', { name: 'Clear all' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Hide filter panel' }));
    await expect(
      canvas.queryByRole('button', { name: 'Remove Unassigned assignee filter' }),
    ).not.toBeInTheDocument();
  },
};
export const SearchAndExpand: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole('searchbox', { name: 'Search filter options' }),
      'billing',
    );
    await expect(canvas.getByRole('checkbox', { name: /^Billing/ })).toBeVisible();
    await expect(canvas.queryByRole('checkbox', { name: /^Critical/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filter option search' }));
    await expect(canvas.getByRole('checkbox', { name: /^Critical/ })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Severity' }));
    await expect(canvas.queryByRole('checkbox', { name: /^Critical/ })).not.toBeInTheDocument();
  },
};
export const KeyboardFacets: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const severity = canvas.getByRole('button', { name: 'Severity' });
    const critical = canvas.getByRole('checkbox', { name: /^Critical/ });
    critical.focus();
    await userEvent.keyboard(' ');
    await expect(critical).toBeChecked();
    severity.focus();
    await userEvent.keyboard('{Enter}');
    await expect(severity).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('button', { name: 'Status' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: /^Critical/ })).toBeChecked());
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(canvas.getByRole('checkbox', { name: /^Critical/ })).not.toBeChecked();
  },
};
