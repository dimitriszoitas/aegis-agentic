import type { Meta, StoryObj } from '@storybook/react-vite';
import { records } from '../../sample-data';
import { JsonViewer } from './json-viewer';

const eventPayload = {
  '@timestamp': '2026-10-06T08:24:16.481Z',
  event: { id: 'EVT-1002-3', category: 'project', action: 'handoff-requested', outcome: 'success' },
  project: { id: 'PRJ-204', name: 'Customer portal refresh', archived: false },
  owner: { id: 'elena', name: 'Elena Voss', team: 'Product operations' },
  checklist: {
    completed: 8,
    total: 10,
    next: { title: 'Confirm the delivery owner', dueDate: '2026-10-09' },
    description:
      'Review the project delivery checklist, confirm the customer handoff, and update the next milestone before sharing the release note with the workspace.',
    approvedAt: null,
  },
  review: { confidence: 0.94, requested: true, tags: ['delivery', 'handoff'] },
};
const meta = {
  id: 'components-data-jsonviewer',
  title: 'Components/Code/JsonViewer',
  component: JsonViewer,
  tags: ['autodocs'],
  args: { value: eventPayload, label: 'Project update payload', defaultExpandedDepth: 2 },
} satisfies Meta<typeof JsonViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NestedEvent: Story = {};
export const ArraysAndNulls: Story = {
  args: {
    rootName: 'batch',
    value: {
      related_events: [
        records[0].events[0].payload,
        null,
        { confirmed: false, confidence: 0, source: 'Workspace', evidence: [] },
      ],
      external_context: null,
      tags: [],
      annotations: {},
    },
    defaultExpandedDepth: 3,
  },
};
export const PrimitiveValues: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <JsonViewer label="Workflow enabled" rootName="enabled" value={true} />
      <JsonViewer label="Unassigned owner" rootName="assignee" value={null} />
      <JsonViewer label="Workspace name" rootName="workspace" value="Product operations" />
      <JsonViewer label="Related event count" rootName="event_count" value={1284} />
    </div>
  ),
};
export const LargePayload: Story = {
  args: {
    label: 'Related event batch',
    rootName: 'events',
    value: records.flatMap((record) =>
      record.events.map((event) => ({ id: event.id, record_id: record.id, ...event.payload })),
    ),
    maxVisibleItems: 25,
    maxHeight: 420,
    defaultExpandedDepth: 1,
  },
};
export const ComplexPaths: Story = {
  args: {
    label: 'Imported workspace fields',
    value: {
      'workspace.account.id': 'ACC-204',
      'import options': {
        'source name': 'Customer portal',
        'batch-id': 'batch-72c9d10f',
      },
      'object[0]': { 'display"name': 'Customer handoff', observed: true },
    },
    defaultExpandedDepth: 3,
  },
};
export const Collapsed: Story = { args: { defaultExpandedDepth: 0 } };
