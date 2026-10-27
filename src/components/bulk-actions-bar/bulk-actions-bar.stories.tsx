import { useState } from 'react';
import { useArgs } from 'storybook/preview-api';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BulkActionsBar, type BulkActionsBarProps } from './bulk-actions-bar';
import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { SeverityBadge, type Severity } from '@/components/severity-badge';
import { StatusBadge, type RecordStatus } from '@/components/status-badge';

const meta = {
  id: 'components-data-grid-bulk-actions-bar',
  title: 'Components/Data Display/Data grid/Bulk actions bar',
  component: BulkActionsBar,
  tags: ['autodocs'],
} satisfies Meta<typeof BulkActionsBar>;
export default meta;
const owners = [
  { id: 'eleni', name: 'Eleni Papadopoulos', initials: 'EP' },
  { id: 'marcus', name: 'Marcus Chen', initials: 'MC' },
  { id: 'aisha', name: 'Aisha Okafor', initials: 'AO' },
];
interface DemoWorkRecord {
  id: string;
  title: string;
  severity: Severity;
  status: RecordStatus;
  assignee: string | null;
  count: number;
}
const initialWorkRecords: DemoWorkRecord[] = [
  {
    id: 'REC-2026-0842',
    title: 'Project delivery review',
    severity: 'critical',
    status: 'new',
    assignee: null,
    count: 18,
  },
  {
    id: 'REC-2026-0841',
    title: 'Customer onboarding follow-up',
    severity: 'high',
    status: 'new',
    assignee: null,
    count: 6,
  },
  {
    id: 'REC-2026-0839',
    title: 'Invoice payment follow-up',
    severity: 'medium',
    status: 'in-review',
    assignee: 'marcus',
    count: 1284,
  },
];
function BulkSelectionDemo({
  position = 'inline',
  failAssignment = false,
}: {
  position?: 'fixed' | 'inline';
  failAssignment?: boolean;
}) {
  const [records, setRecords] = useState(initialWorkRecords);
  const [selected, setSelected] = useState(initialWorkRecords.map((record) => record.id));
  const [notice, setNotice] = useState('');
  const [summary, setSummary] = useState('');
  const selectedRows = records.filter((record) => selected.includes(record.id));
  async function pause() {
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return (
    <div className="stack" style={{ maxWidth: 1000, padding: 'var(--space-6)', minHeight: 460 }}>
      <div className="between">
        <div>
          <h3 style={{ marginBottom: 'var(--space-1)' }}>Selected record queue</h3>
          <p className="muted" style={{ margin: 0 }}>
            Assign owners, update status, or request an AI review summary.
          </p>
        </div>
        <Button
          size="sm"
          emphasis="ghost"
          onClick={() => setSelected(records.map((record) => record.id))}
        >
          Select all records
        </Button>
      </div>
      <div className="story-layout stack">
        {records.map((record) => (
          <div
            key={record.id}
            className="between"
            style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}
          >
            <Checkbox
              checked={selected.includes(record.id)}
              onCheckedChange={(checked) =>
                setSelected((current) =>
                  checked === true
                    ? [...current, record.id]
                    : current.filter((id) => id !== record.id),
                )
              }
              label={record.title}
              description={
                owners.find((owner) => owner.id === record.assignee)?.name ?? 'Unassigned'
              }
            />
            <div className="row">
              <SeverityBadge severity={record.severity} />
              <StatusBadge status={record.status} />
            </div>
          </div>
        ))}
      </div>
      {notice && (
        <p className="muted" role="status" style={{ margin: 0 }}>
          {notice}
        </p>
      )}
      {summary && (
        <Banner intent="ai" title="AI generated review summary">
          {summary} Review the evidence before applying a verdict.
        </Banner>
      )}
      <div style={{ marginTop: 'auto' }}>
        <BulkActionsBar
          position={position}
          selectedCount={selected.length}
          owners={owners}
          onAssign={async (ownerId) => {
            await pause();
            if (failAssignment)
              throw new Error(
                'The owner assignment service is temporarily unavailable. Try again in a moment.',
              );
            setRecords((current) =>
              current.map((record) =>
                selected.includes(record.id) ? { ...record, assignee: ownerId } : record,
              ),
            );
            setNotice(
              `${selected.length} records ${ownerId ? `assigned to ${owners.find((owner) => owner.id === ownerId)?.name}` : 'returned to the unassigned queue'}.`,
            );
          }}
          onStatusChange={async (status) => {
            await pause();
            setRecords((current) =>
              current.map((record) =>
                selected.includes(record.id) ? { ...record, status } : record,
              ),
            );
            setNotice(`${selected.length} record statuses updated.`);
          }}
          onSummarize={async () => {
            await pause();
            setSummary(
              `${selectedRows.length} selected records contain ${selectedRows.reduce((total, record) => total + record.count, 0).toLocaleString()} history updates. ${selectedRows.filter((record) => record.severity === 'critical').length} critical records require immediate owner review. Evidence includes ${selectedRows.map((record) => record.title.toLowerCase()).join('; ')}.`,
            );
          }}
          onClear={() => {
            setSelected([]);
            setNotice('Record selection cleared.');
          }}
        />
      </div>
    </div>
  );
}
export const InteractiveSelection: StoryObj = { render: () => <BulkSelectionDemo /> };
export const FloatingAtBottom: StoryObj = {
  render: () => <BulkSelectionDemo position="fixed" />,
  parameters: { layout: 'fullscreen' },
};
export const FailedAssignment: StoryObj = { render: () => <BulkSelectionDemo failAssignment /> };

function BulkPlayground({
  args,
  updateArgs,
}: {
  args: BulkActionsBarProps;
  updateArgs: (patch: Partial<BulkActionsBarProps>) => void;
}) {
  const [message, setMessage] = useState('Choose an action for the selected records.');
  return (
    <div className="stack" style={{ width: '100%', minHeight: 160 }}>
      <BulkActionsBar
        {...args}
        onAssign={(id) =>
          setMessage(
            id
              ? `Assigned to ${args.owners.find((owner) => owner.id === id)?.name ?? id}`
              : 'Assignment cleared',
          )
        }
        onStatusChange={(status) => setMessage(`Status changed to ${status}`)}
        onSummarize={() =>
          setMessage(`Requested a summary for ${args.selectedCount} selected records`)
        }
        onClear={() => {
          updateArgs({ selectedCount: 0 });
          setMessage('Selection cleared');
        }}
      />
      <p role="status">{message}</p>
      {args.selectedCount === 0 && (
        <Button size="sm" emphasis="secondary" onClick={() => updateArgs({ selectedCount: 3 })}>
          Select three records
        </Button>
      )}
    </div>
  );
}

export const Playground: StoryObj<typeof BulkActionsBar> = {
  args: {
    selectedCount: 3,
    owners,
    position: 'inline',
    loading: false,
    onAssign: () => undefined,
    onStatusChange: () => undefined,
    onSummarize: () => undefined,
    onClear: () => undefined,
  },
  argTypes: {
    selectedCount: { control: { type: 'number', min: 0, step: 1 } },
    position: { control: 'select', options: ['inline', 'fixed'] },
    owners: { control: 'object' },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs<BulkActionsBarProps>();
    return <BulkPlayground args={args} updateArgs={updateArgs} />;
  },
};
