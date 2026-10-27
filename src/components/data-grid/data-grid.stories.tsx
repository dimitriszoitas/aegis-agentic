import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '../button';
import { BulkActionsBar } from '../bulk-actions-bar';
import { EntityCell, NumberCell, SeverityCell, TimeCell } from '../data-grid-cells';
import { SideSheet, SideSheetField, SideSheetSection } from '../side-sheet';
import {
  records,
  owners,
  generateRecords,
  referenceTime,
  type WorkRecord,
} from '../../sample-data';
import { DataGrid, type GridDensity } from './data-grid';
import { DataGridPresentation } from './data-grid-presentation';

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const columns: ColumnDef<WorkRecord>[] = [
  {
    accessorKey: 'severity',
    header: 'Severity',
    size: 120,
    minSize: 104,
    maxSize: 180,
    sortingFn: (a, b) => severityOrder[a.original.severity] - severityOrder[b.original.severity],
    cell: ({ row }) => <SeverityCell severity={row.original.severity} />,
  },
  {
    accessorKey: 'title',
    header: 'Record title',
    size: 410,
    minSize: 220,
    maxSize: 650,
    enableHiding: false,
    cell: ({ row }) => <span title={row.original.title}>{row.original.title}</span>,
  },
  {
    id: 'subject',
    accessorFn: (row) => row.subject.name,
    header: 'Subject',
    size: 220,
    minSize: 160,
    maxSize: 320,
    cell: ({ row }) => <EntityCell entity={row.original.subject} />,
  },
  {
    accessorKey: 'eventCount',
    header: 'Updates',
    size: 96,
    minSize: 80,
    maxSize: 180,
    meta: { align: 'right' },
    cell: ({ row }) => <NumberCell value={row.original.eventCount} />,
  },
  {
    accessorKey: 'lastSeen',
    header: 'Last seen',
    size: 150,
    minSize: 120,
    maxSize: 260,
    cell: ({ row }) => <TimeCell value={row.original.lastSeen} now={referenceTime} />,
  },
];
const getRowId = (row: WorkRecord) => row.id;
const rowLabel = (row: WorkRecord) => `${row.id}: ${row.title}`;
function ExpandedEvents({ record }: { record: WorkRecord }) {
  return (
    <section aria-label={`History updates for ${record.id}`}>
      <h3
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--title-weight)',
          marginBottom: 'var(--space-3)',
        }}
      >
        {record.events.length} history updates
      </h3>
      <table className="aegis-grid-event-table" aria-label={`Record history for ${record.id}`}>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Action</th>
            <th scope="col">Owner</th>
            <th scope="col">Subject</th>
          </tr>
        </thead>
        <tbody>
          {record.events.map((event) => (
            <tr key={event.id}>
              <td>
                <code>{event.timestamp.slice(11, 19)}</code>
              </td>
              <td>{event.action}</td>
              <td>
                <code>{event.actor}</code>
              </td>
              <td>
                <code>{event.subject}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
const renderExpandedRow = (row: WorkRecord) => <ExpandedEvents record={row} />;
const meta = {
  id: 'components-data-datagrid',
  title: 'Components/Data Display/DataGrid',
  component: DataGrid<WorkRecord>,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The full presentation offers either toolbar filters or a push FilterPanel. Search, relative or absolute time ranges, active filters, and facet counts all filter the same records. Switching Filter layout preserves active criteria; applied chips appear in toolbar mode or while the sidebar is closed. Use the toolbar for density and column visibility. The first header click sorts ascending, the next descending; Shift-click keeps multiple sorts. Hover or focus a header for its three-dot menu to pin left/right, unpin, sort, hide, or move a column with the keyboard. Drag a column header or its title to reorder within a pinned or unpinned group. Selection, expansion, and the first data column start pinned left; a final Actions column starts pinned right. The last visible data column fills spare viewport space; a trailing Actions column retains its compact configured width at the right edge. Invisible hit areas just inside each right edge support dragging, double-click autosize, and keyboard resizing. Hover or focus an edge to show its guide through the visible table body. Row selection, cross-page bulk assignment/status updates, inline history expansion, raw JSON, editable record details, and streaming AI review all work locally. Switch browsing mode to continuous virtual scrolling and choose 1,000 records to explore a large result set. Presentation options also expose reversible loading, empty and retryable error states. Focused examples below document each grid capability separately.',
      },
    },
  },
  args: { data: records, columns, getRowId, rowLabel, label: 'Work records', renderExpandedRow },
} satisfies Meta<typeof DataGrid<WorkRecord>>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FullPresentation: Story = {
  name: 'Full presentation',
  render: () => <DataGridPresentation />,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    docs: { story: { inline: false, height: 1080 } },
  },
  play: async ({ canvasElement, step }) => {
    const user = userEvent.setup();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await step('Keep push filters and removable chips in sync', async () => {
      const panel = canvas.getByRole('complementary', { name: /Filters/ });
      const critical = within(panel).getByRole('checkbox', { name: /Critical/ });
      await user.click(critical);
      await expect(
        canvas.queryByRole('button', { name: 'Remove Critical severity filter' }),
      ).not.toBeInTheDocument();
      await user.click(canvas.getByRole('button', { name: 'Hide filter panel' }));
      await waitFor(() => {
        const actionsHeader = canvasElement.querySelector<HTMLElement>(
          'th[data-column-id="actions"]',
        );
        const actionsCell = canvasElement.querySelector<HTMLElement>(
          'td[data-column-id="actions"]',
        );
        const scroll = canvasElement.querySelector<HTMLElement>('.aegis-grid-scroll');
        if (!actionsHeader || !actionsCell || !scroll)
          throw new Error('Expected compact pinned Actions column');
        expect(actionsHeader.getBoundingClientRect().width).toBeCloseTo(116, 0);
        expect(actionsCell.getBoundingClientRect().width).toBeCloseTo(116, 0);
        expect(actionsHeader.getBoundingClientRect().right).toBeCloseTo(
          scroll.getBoundingClientRect().left + scroll.clientWidth,
          0,
        );
      });
      await expect(
        canvas.getByRole('button', { name: 'Remove Critical severity filter' }),
      ).toBeVisible();
      await user.click(canvas.getByRole('button', { name: 'Remove Critical severity filter' }));
      await user.click(canvas.getByRole('button', { name: 'Show filter panel' }));
      await expect(
        within(canvas.getByRole('complementary', { name: /Filters/ })).getByRole('checkbox', {
          name: /Critical/,
        }),
      ).not.toBeChecked();
      await user.type(canvas.getByRole('searchbox', { name: 'Search records' }), 'project');
      await expect(canvas.getByRole('grid', { name: 'Records' })).toBeVisible();
      await user.clear(canvas.getByRole('searchbox', { name: 'Search records' }));
    });
    await step('Adjust density, sort multiple columns, and resize a column', async () => {
      await user.click(canvas.getByRole('button', { name: 'Compact rows' }));
      await expect(canvas.getByRole('button', { name: 'Compact rows' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const grid = within(canvas.getByRole('grid', { name: 'Records' }));
      await user.click(grid.getByRole('button', { name: 'Severity' }));
      await user.keyboard('{Shift>}');
      await user.click(grid.getByRole('button', { name: 'Updates' }));
      await user.keyboard('{/Shift}');
      for (const [id, rank] of [
        ['severity', '1'],
        ['eventCount', '2'],
      ] as const) {
        const header = canvasElement.querySelector(`th[data-column-id="${id}"]`);
        await expect(header).toHaveAttribute('aria-sort', 'other');
        await expect(header).toHaveAttribute(
          'aria-description',
          `Ascending, sort priority ${rank} of 2`,
        );
        await expect(header?.querySelector('sup')).toHaveTextContent(rank);
      }
      const resize = grid.getByRole('separator', { name: 'Resize Record column' });
      const previous = Number(resize.getAttribute('aria-valuenow'));
      resize.focus();
      await user.keyboard('{ArrowRight}');
      await expect(resize).toHaveAttribute('aria-valuenow', String(previous + 8));
    });
    await step('Select records and apply an actual bulk status change', async () => {
      const grid = within(canvas.getByRole('grid', { name: 'Records' }));
      const checkboxes = grid.getAllByRole('checkbox', { name: /^Select REC-/ });
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);
      const selectedLabels = checkboxes
        .slice(0, 2)
        .map((checkbox) => checkbox.getAttribute('aria-label')!);
      await user.click(canvas.getByRole('combobox', { name: 'Browsing mode' }));
      await user.click(page.getByRole('option', { name: 'Continuous virtual scrolling' }));
      await expect(canvas.getByRole('grid', { name: 'Records' })).toHaveAttribute(
        'aria-rowcount',
        '151',
      );
      await expect(grid.getAllByRole('row').length).toBeLessThan(151);
      for (const [id, rank] of [
        ['severity', '1'],
        ['eventCount', '2'],
      ] as const) {
        const header = canvasElement.querySelector(`th[data-column-id="${id}"]`);
        await expect(header).toHaveAttribute('aria-sort', 'other');
        await expect(header).toHaveAttribute(
          'aria-description',
          `Ascending, sort priority ${rank} of 2`,
        );
        await expect(header?.querySelector('sup')).toHaveTextContent(rank);
      }
      for (const label of selectedLabels)
        await expect(grid.getByRole('checkbox', { name: label })).toBeChecked();
      await user.click(canvas.getByRole('combobox', { name: 'Browsing mode' }));
      await user.click(page.getByRole('option', { name: 'Paginated results' }));
      await expect(canvas.getByRole('grid', { name: 'Records' })).toHaveAttribute(
        'aria-rowcount',
        '26',
      );
      for (const label of selectedLabels)
        await expect(grid.getByRole('checkbox', { name: label })).toBeChecked();
      await user.click(canvas.getByRole('button', { name: 'Change status' }));
      await user.click(page.getByRole('menuitem', { name: 'In progress' }));
      await expect(canvas.getByText('2 records updated in this local demo.')).toBeVisible();
      await user.click(canvas.getByRole('button', { name: 'Clear selected records' }));
    });
    await step('Open event evidence and record details', async () => {
      const grid = within(canvas.getByRole('grid', { name: 'Records' }));
      await user.click(grid.getAllByRole('button', { name: /^Expand REC-/ })[0]);
      await expect(canvas.getByText(/Record history · REC-/)).toBeVisible();
      const row = grid.getAllByRole('row', { name: /^REC-/ })[0];
      row.focus();
      await user.keyboard('{Enter}');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('tab', { name: /^History/ })).toBeVisible();
      await user.click(page.getByRole('button', { name: 'Close detail panel' }));
      await waitFor(() => expect(page.queryByRole('dialog')).not.toBeInTheDocument());
    });
    await user.click(canvas.getByRole('button', { name: 'Restore demo' }));
    canvasElement.ownerDocument.defaultView?.scrollTo({ top: 0 });
  },
};
export const FilterLayoutSwitching: Story = {
  render: () => <DataGridPresentation />,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    docs: { story: { inline: false, height: 1080 } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const layout = canvas.getByRole('combobox', { name: 'Filter layout' });
    await userEvent.click(
      within(canvas.getByRole('complementary', { name: /Filters/ })).getByRole('checkbox', {
        name: /^Critical/,
      }),
    );
    await expect(
      canvas.queryByRole('button', { name: 'Remove Critical severity filter' }),
    ).not.toBeInTheDocument();
    await userEvent.click(layout);
    await userEvent.click(await page.findByRole('option', { name: 'Toolbar filters' }));
    await waitFor(() => expect(layout).toHaveFocus());
    await expect(canvas.queryByRole('complementary', { name: /Filters/ })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Add filter' })).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Remove Critical severity filter' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Critical severity filter' }));
    await userEvent.click(layout);
    await userEvent.click(await page.findByRole('option', { name: 'Sidebar filters' }));
    await waitFor(() => expect(layout).toHaveFocus());
    await expect(canvas.queryByRole('button', { name: 'Add filter' })).not.toBeInTheDocument();
    await expect(
      within(canvas.getByRole('complementary', { name: /Filters/ })).getByRole('checkbox', {
        name: /^Critical/,
      }),
    ).not.toBeChecked();
  },
};
export const FullVirtualizedPresentation: Story = {
  name: 'Full presentation · 1,000 rows',
  render: () => <DataGridPresentation initialCount={1000} initialMode="virtual" />,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    docs: {
      story: { inline: false, height: 1080 },
      description: {
        story:
          'The same working filters and review actions with 1,000 records, continuous virtual scrolling, sticky headers, and inline history rows. Filtering reduces the backing data; the viewport mounts only the visible row window.',
      },
    },
  },
};
export const Default: Story = {};
export const HeaderControls: Story = {
  args: { data: records.slice(0, 10), pagination: false },
  parameters: {
    docs: {
      description: {
        story:
          'Hover or focus a header to reveal sorting and its column menu. Pin columns to either edge, hide optional fields, or use Move left/right as the keyboard alternative to dragging the header or its title. Selection and expansion remain anchored. The last visible data column takes spare width while a trailing Actions column stays compact; hover or focus just inside a column’s right edge to reveal the full-height resize guide. Both dotted handles are absent; header clicks still sort, and the menu remains independent of dragging.',
      },
    },
  },
  play: async ({ canvasElement, step }) => {
    const user = userEvent.setup();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const header = (id: string) =>
      canvasElement.querySelector<HTMLTableCellElement>(`th[data-column-id="${id}"]`)!;
    const menu = async (name: string, action: string) => {
      await user.click(canvas.getByRole('button', { name: `${name} column actions` }));
      await user.click(page.getByRole('menuitem', { name: action }));
    };
    await step('Reveal the resize guide from the invisible inside edge', async () => {
      const edge = canvas.getByRole('separator', { name: 'Resize Record title column' });
      const guide = canvasElement.querySelector<HTMLElement>('.aegis-grid-resize-guide');
      if (!guide) throw new Error('Expected a full-height resize guide');
      await expect(canvasElement.querySelector('.aegis-grid-drag')).toBeNull();
      await expect(edge.querySelector('svg')).toBeNull();
      await user.hover(edge);
      await expect(guide).toBeVisible();
      expect(edge.getBoundingClientRect().right).toBeLessThanOrEqual(
        header('title').getBoundingClientRect().right,
      );
      await user.unhover(edge);
      await expect(guide).not.toBeVisible();
    });
    await step('Sort ascending, descending, and clear from the header', async () => {
      await user.click(canvas.getByRole('button', { name: 'Updates' }));
      await expect(header('eventCount')).toHaveAttribute('aria-sort', 'ascending');
      await user.click(canvas.getByRole('button', { name: 'Updates' }));
      await expect(header('eventCount')).toHaveAttribute('aria-sort', 'descending');
      await menu('Updates', 'Sort A to Z');
      await expect(header('eventCount')).toHaveAttribute('aria-sort', 'ascending');
      await user.click(canvas.getByRole('button', { name: 'Updates' }));
      await expect(header('eventCount')).toHaveAttribute('aria-sort', 'descending');
      await user.click(canvas.getByRole('button', { name: 'Updates' }));
      await expect(header('eventCount')).not.toHaveAttribute('aria-sort');
    });
    await step('Pin and unpin a column without losing its menu', async () => {
      await menu('Subject', 'Pin right');
      await expect(header('subject')).toHaveAttribute('data-pinned', 'right');
      await menu('Subject', 'Unpin column');
      await expect(header('subject')).not.toHaveAttribute('data-pinned');
    });
    await step('Reorder from the keyboard and restore hidden fields', async () => {
      const trigger = canvas.getByRole('button', { name: 'Subject column actions' });
      trigger.focus();
      await user.keyboard('{Enter}');
      page.getByRole('menuitem', { name: 'Move left' }).focus();
      await user.keyboard('{Enter}');
      await waitFor(() =>
        expect(header('subject').cellIndex).toBeLessThan(header('title').cellIndex),
      );
      await menu('Subject', 'Move right');
      await menu('Subject', 'Hide column');
      await expect(canvasElement.querySelector('th[data-column-id="subject"]')).toBeNull();
      await user.click(canvas.getByRole('button', { name: 'Columns' }));
      await user.click(page.getByRole('menuitemcheckbox', { name: 'Subject' }));
      await user.keyboard('{Escape}');
      await expect(header('subject')).toBeVisible();
    });
  },
};
export const DensityMatrix: Story = {
  argTypes: {
    data: { control: false },
    density: { control: false },
    pagination: { control: false },
  },
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {(['compact', 'default', 'comfortable'] as GridDensity[]).map((density) => (
        <DataGrid
          {...args}
          key={density}
          data={records.slice(0, 3)}
          density={density}
          pagination={false}
          renderToolbar={(api) =>
            api.selectionActions ?? (
              <strong style={{ textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>
                {density} density
              </strong>
            )
          }
        />
      ))}
    </div>
  ),
};
export const MultiSort: Story = {
  args: {
    initialSorting: [
      { id: 'severity', desc: false },
      { id: 'eventCount', desc: true },
    ],
  },
};
export const ExpandedEvidence: Story = {
  args: { defaultExpandedRowIds: [records[0].id], data: records.slice(0, 8), pagination: false },
};
export const ExpandedWithoutSelection: Story = {
  args: {
    defaultExpandedRowIds: [records[0].id],
    data: records.slice(0, 8),
    enableSelection: false,
    pagination: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The evidence connector follows the expansion chevron without reserving space for an absent selection column. Expanded evidence stays inside the visible viewport while the outer grid scrolls horizontally.',
      },
    },
  },
};
export const HiddenColumns: Story = {
  args: { initialColumnVisibility: { subject: false, lastSeen: false } },
};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { data: [] } };
function RetryExample() {
  const [failed, setFailed] = useState(true);
  return (
    <DataGrid
      {...meta.args}
      error={
        failed
          ? 'The event service could not be reached. Your review has been preserved.'
          : undefined
      }
      onRetry={() => setFailed(false)}
    />
  );
}
export const ErrorAndRetry: Story = { render: () => <RetryExample /> };
function ControlledSelection() {
  const [selected, setSelected] = useState([records[0].id, records[1].id, records[2].id]);
  const [message, setMessage] = useState('3 records are selected for review.');
  return (
    <>
      <DataGrid
        {...meta.args}
        selectedRowIds={selected}
        onSelectedRowsChange={setSelected}
        renderBulkActions={(rows, clear) => (
          <BulkActionsBar
            selectedCount={rows.length}
            owners={owners}
            onAssign={(ownerId) =>
              setMessage(
                `${rows.length} records assigned to ${owners.find((owner) => owner.id === ownerId)?.name ?? 'no owner'}.`,
              )
            }
            onStatusChange={(status) =>
              setMessage(`${rows.length} records changed to ${status.replaceAll('-', ' ')}.`)
            }
            onSummarize={() =>
              setMessage(`AI summary requested for ${rows.length} selected records.`)
            }
            onClear={clear}
            position="inline"
          />
        )}
      />
      <p
        role="status"
        style={{
          marginTop: 'var(--space-3)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-sm)',
        }}
      >
        {message}
      </p>
    </>
  );
}
export const SelectionAndBulkActions: Story = { render: () => <ControlledSelection /> };
function ReviewExample() {
  const [record, setRecord] = useState<WorkRecord>();
  return (
    <>
      <DataGrid {...meta.args} onRowClick={setRecord} />
      <SideSheet
        title={record?.title ?? 'Record details'}
        description={record?.id}
        open={!!record}
        onOpenChange={(open) => {
          if (!open) setRecord(undefined);
        }}
        footer={
          <Button intent="function" onClick={() => setRecord(undefined)}>
            Return to records
          </Button>
        }
      >
        <SideSheetSection title="Review details">
          <SideSheetField label="Subject">{record?.subject.name}</SideSheetField>
          <SideSheetField label="Category">
            {record?.category.id} · {record?.category.name}
          </SideSheetField>
          <SideSheetField label="Event count">{record?.eventCount}</SideSheetField>
        </SideSheetSection>
      </SideSheet>
    </>
  );
}
export const KeyboardReview: Story = { render: () => <ReviewExample /> };
const thousandRecords = generateRecords(1000, 2026);
export const VirtualizedThousandRows: Story = {
  args: {
    data: thousandRecords,
    pagination: false,
    virtualize: true,
    height: 560,
    defaultExpandedRowIds: [thousandRecords[0].id],
  },
};
export const KeyboardResizing: Story = {
  args: { data: records.slice(0, 10), pagination: false },
  parameters: {
    docs: {
      description: {
        story:
          'Focus a column resize handle and press Left or Right to adjust by 8px, Shift+Arrow for 24px, Home/End for min/max, or Enter to autosize. A guide follows the active column edge through the visible table body. Pointer drag and double-click autosize use the same constraints.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handle = canvas.getByRole('separator', { name: 'Resize Record title column' });
    const previous = Number(handle.getAttribute('aria-valuenow'));
    const guide = canvasElement.querySelector<HTMLElement>('.aegis-grid-resize-guide');
    const header = handle.closest('th');
    if (!guide || !header) throw new Error('Expected a resize guide and its column header');
    handle.focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await expect(handle).toHaveAttribute('aria-valuenow', String(previous + 24));
    await waitFor(() => {
      expect(guide).toBeVisible();
      expect(
        Math.abs(guide.getBoundingClientRect().right - header.getBoundingClientRect().right),
      ).toBeLessThanOrEqual(2);
      expect(guide.getBoundingClientRect().height).toBeGreaterThan(
        header.getBoundingClientRect().height,
      );
    });
    await userEvent.tab();
    await expect(guide).not.toBeVisible();
  },
};
