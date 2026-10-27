import { useId, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { records, owners, referenceTime } from '@/sample-data';
import { createDefaultFilters, type FilterColumn, type FilterDensity } from '@/lib/filters';
import { FilterPanel } from '@/patterns/filter-panel';
import { FilterBar, type FilterBarProps } from './filter-bar';

const initialColumns: FilterColumn[] = [
  { id: 'title', label: 'Record title', visible: true, hideable: false },
  { id: 'severity', label: 'Severity', visible: true },
  { id: 'source', label: 'Source', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'assignee', label: 'Assignee', visible: false },
];
function Demo(args: FilterBarProps) {
  const [filters, setFilters] = useState(args.value);
  const [density, setDensity] = useState<FilterDensity>('default');
  const [columns, setColumns] = useState(initialColumns);
  const [panelOpen, setPanelOpen] = useState(args.filterPanelOpen ?? false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const update = (next: FilterBarProps['value']) => {
    setFilters(next);
    args.onValueChange(next);
  };
  const showPanel = args.filterMode !== 'bar' && panelOpen;
  return (
    <div
      ref={root}
      className="surface"
      style={{ padding: 0, display: 'flex', alignItems: 'stretch' }}
    >
      {showPanel && (
        <FilterPanel
          id={panelId}
          records={records}
          owners={owners}
          value={filters}
          onValueChange={update}
          now={referenceTime}
          disabled={args.disabled}
          onClose={() => {
            root.current
              ?.querySelector<HTMLButtonElement>('[aria-label="Hide filter panel"]')
              ?.focus();
            setPanelOpen(false);
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <FilterBar
          {...args}
          value={filters}
          onValueChange={update}
          density={density}
          onDensityChange={setDensity}
          columns={columns}
          onColumnVisibilityChange={(id, visible) =>
            setColumns((current) =>
              current.map((column) => (column.id === id ? { ...column, visible } : column)),
            )
          }
          filterPanelOpen={showPanel}
          panelId={panelId}
          onTogglePanel={() => setPanelOpen((open) => !open)}
        />
        <p className="muted" style={{ margin: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
          Viewing {density} rows · {columns.filter((column) => column.visible).length} columns
          visible
        </p>
      </div>
    </div>
  );
}
const meta = {
  id: 'patterns-filterbar',
  title: 'Patterns/Filtering/FilterBar',
  component: FilterBar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Choose one editing mode. Panel mode keeps search and table controls in the toolbar and edits facets in the sidebar; removable applied chips appear only while that sidebar is closed. Bar mode uses one compact filter picker and never opens a sidebar. Neither mode exposes unused facet options or saved-filter controls. Search is capped at 500px and shrinks with its container.',
      },
    },
  },
  args: {
    value: createDefaultFilters(),
    onValueChange: fn(),
    owners,
    now: referenceTime,
    filterMode: 'panel',
  },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof FilterBar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AppliedFilters: Story = {
  args: {
    value: {
      ...createDefaultFilters(),
      severities: ['critical', 'high'],
      statuses: ['new'],
      sources: ['Projects'],
      assignees: [owners[0].id],
      rules: [{ id: 'category', field: 'category', operator: 'contains', value: 'delivery' }],
      timeRange: { mode: 'relative', preset: '7d' },
    },
  },
};
export const Disabled: Story = {
  args: { disabled: true, value: { ...createDefaultFilters(), severities: ['high'] } },
};
export const BarMode: Story = { args: { filterMode: 'bar' } };
export const PanelOpen: Story = {
  args: { filterPanelOpen: true, value: { ...createDefaultFilters(), severities: ['critical'] } },
};
export const QueryAndClear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search records' }), 'Project');
    await expect(canvas.getByRole('button', { name: 'Remove search filter' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(canvas.getByRole('searchbox', { name: 'Search records' })).toHaveValue('');
    await expect(canvas.getByRole('searchbox', { name: 'Search records' })).toHaveFocus();
    await expect(canvas.queryByRole('group', { name: 'Applied filters' })).not.toBeInTheDocument();
  },
};
export const ViewControls: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Compact rows' }));
    await expect(canvas.getByRole('button', { name: 'Compact rows' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Column settings' }));
    await userEvent.click(body.getByRole('checkbox', { name: 'Assignee' }));
    await expect(body.getByRole('checkbox', { name: 'Assignee' })).toBeChecked();
    await userEvent.keyboard('{Escape}');
    await expect(
      canvas.queryByRole('button', {
        name: /Saved filters|Save filter|New filter|Customise filters|Severity: Any/,
      }),
    ).not.toBeInTheDocument();
  },
};
export const BarFilterPicker: Story = {
  args: { filterMode: 'bar' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement),
      body = within(canvasElement.ownerDocument.body);
    await expect(
      canvas.queryByRole('button', { name: /Show filter panel|Hide filter panel/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(body.getByRole('combobox', { name: 'Value' }));
    await userEvent.click(body.getByRole('option', { name: 'Critical' }));
    await userEvent.click(body.getByRole('button', { name: 'Apply filter' }));
    await expect(
      canvas.getByRole('button', { name: 'Remove Critical severity filter' }),
    ).toBeVisible();
    await expect(args.onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severities: ['critical'] }),
    );
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Add filter' })).toHaveFocus());
    await userEvent.click(canvas.getByRole('button', { name: 'Add filter' }));
    await userEvent.click(body.getByRole('combobox', { name: 'Field' }));
    await userEvent.click(body.getByRole('option', { name: 'Category' }));
    await userEvent.click(body.getByRole('combobox', { name: 'Operator' }));
    await userEvent.click(body.getByRole('option', { name: 'contains' }));
    await userEvent.type(body.getByRole('textbox', { name: 'Value' }), 'delivery');
    await userEvent.click(body.getByRole('button', { name: 'Apply filter' }));
    await expect(
      canvas.getByRole('button', { name: 'Remove Category contains delivery filter' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
  },
};
export const PanelVisibility: Story = {
  args: { filterPanelOpen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = canvas.getByRole('complementary', { name: /Filters/ });
    await userEvent.click(within(panel).getByRole('checkbox', { name: /Critical/ }));
    await expect(canvas.queryByRole('group', { name: 'Applied filters' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Hide filter panel' }));
    await expect(
      canvas.getByRole('button', { name: 'Remove Critical severity filter' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Show filter panel' }));
    await expect(canvas.queryByRole('group', { name: 'Applied filters' })).not.toBeInTheDocument();
    await expect(
      within(canvas.getByRole('complementary', { name: /Filters/ })).getByRole('checkbox', {
        name: /Critical/,
      }),
    ).toBeChecked();
  },
};
export const RemoveLastFilter: Story = {
  args: { value: { ...createDefaultFilters(), severities: ['high'] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const remove = canvas.getByRole('button', { name: 'Remove High severity filter' });
    remove.focus();
    await userEvent.keyboard('{Delete}');
    await expect(canvas.queryByRole('group', { name: 'Applied filters' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('searchbox', { name: 'Search records' })).toHaveFocus();
  },
};
