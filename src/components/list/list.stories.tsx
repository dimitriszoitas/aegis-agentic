import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Bell, Check, Server, Shield, UserRound } from '@/components/icon';
import { List, ListItem, type ListProps } from './list';
import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { SeverityBadge } from '@/components/severity-badge';
import { Tag } from '@/components/tag';
import { Button } from '@/components/button';

const meta = {
  id: 'components-lists-list',
  title: 'Components/Data Display/List',
  component: List,
  subcomponents: { ListItem },
  tags: ['autodocs'],
} satisfies Meta<typeof List>;
export default meta;
type Story = StoryObj<typeof meta>;
const records = [
  {
    title: 'Customer portal redesign',
    description: 'Customer experience · PRJ-0042 · 18 tasks',
    severity: 'critical' as const,
    icon: Server,
  },
  {
    title: 'Customer onboarding checklist',
    description: 'Customer success · PRJ-0082 · 6 tasks',
    severity: 'high' as const,
    icon: UserRound,
  },
  {
    title: 'Quarterly account review',
    description: 'Account management · PRJ-0128 · 14 tasks',
    severity: 'medium' as const,
    icon: Shield,
  },
];
function RecordListDemo() {
  const [selected, setSelected] = useState('');
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  return (
    <div className="story-layout" style={{ width: '100%', maxWidth: 960 }}>
      <List aria-label="Records to review">
        {records.map((record) => (
          <ListItem
            key={record.title}
            title={record.title}
            description={record.description}
            icon={<record.icon size={20} />}
            meta={<SeverityBadge severity={record.severity} />}
            selectable
            selected={selected === record.title}
            onSelect={() => setSelected(selected === record.title ? '' : record.title)}
            actions={
              <IconButton
                aria-label={`${acknowledged.includes(record.title) ? 'Acknowledged' : 'Acknowledge'} ${record.title}`}
                size="sm"
                disabled={acknowledged.includes(record.title)}
                onClick={() => setAcknowledged((current) => [...current, record.title])}
              >
                {acknowledged.includes(record.title) ? <Check size={16} /> : <Bell size={16} />}
              </IconButton>
            }
          />
        ))}
      </List>
      <p className="muted" aria-live="polite" style={{ margin: 'var(--space-4) 0 0' }}>
        {selected ? `Selected: ${selected}` : 'Select a record to review the project.'}
      </p>
    </div>
  );
}
export const SelectableRecords: Story = { render: () => <RecordListDemo /> };
export const Members: Story = {
  render: () => (
    <div className="story-layout" style={{ width: '100%', maxWidth: 960 }}>
      <List divided aria-label="Project team">
        <ListItem
          title="Eleni Papadopoulos"
          description="Senior product designer · Athens"
          avatar={<Avatar name="Eleni Papadopoulos" status="online" />}
          meta="4 assigned"
        />
        <ListItem
          title="Marcus Chen"
          description="Project manager · London"
          avatar={<Avatar name="Marcus Chen" status="busy" />}
          meta="7 assigned"
        />
        <ListItem
          title="Aisha Okafor"
          description="Customer success · Amsterdam"
          avatar={<Avatar name="Aisha Okafor" status="away" />}
          meta="2 assigned"
        />
      </List>
    </div>
  ),
};
export const Densities: Story = {
  render: () => (
    <div className="story-grid">
      {(['compact', 'default', 'comfortable'] as const).map((density) => (
        <section className="story-layout" key={density}>
          <h3>{density[0].toUpperCase() + density.slice(1)} density</h3>
          <List density={density}>
            {records.map((record) => (
              <ListItem
                key={record.title}
                title={record.title}
                description={record.description}
                icon={<record.icon size={17} />}
              />
            ))}
          </List>
        </section>
      ))}
    </div>
  ),
};
export const Disabled: Story = {
  render: () => (
    <List style={{ width: '100%', maxWidth: 960 }}>
      <ListItem
        title="Archived project PRJ-2026-0184"
        description="Resolved by Eleni Papadopoulos · Read-only retention"
        icon={<Shield size={20} />}
        selectable
        disabled
      />
    </List>
  ),
};

function OptionalPartsDemo() {
  const [selected, setSelected] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  return (
    <div className="story-layout" style={{ width: '100%', maxWidth: 960 }}>
      <List aria-label="Project work" divided>
        <ListItem
          title="Customer portal"
          subtitle="Atlas Commerce · Design handoff"
          avatar={<Avatar name="Maya Chen" size="sm" />}
          checkbox={{ checked, onCheckedChange: (value) => setChecked(value === true) }}
          selectable
          selected={selected}
          onSelect={() => setSelected(!selected)}
          tags={
            <Tag variant="interactive" selected={pinned} onSelectedChange={setPinned}>
              Priority
            </Tag>
          }
          actions={
            <Button size="sm" emphasis="ghost" onClick={() => setReviewed(!reviewed)}>
              {reviewed ? 'Undo review' : 'Review'}
            </Button>
          }
          counter={24}
          counterLabel="open tasks"
        />
        <ListItem
          title="Quarterly planning"
          checkbox={{ defaultChecked: true, readOnly: true }}
          avatar={<Avatar name="Eleni Papadopoulos" size="sm" />}
          tags={<Tag>Read only</Tag>}
          counter={0}
          counterLabel="open tasks"
        />
        <ListItem
          title="Archived workspace"
          subtitle="Completed projects remain available in the archive."
          checkbox={{ defaultChecked: true }}
          avatar={<Avatar name="Marcus Chen" size="sm" />}
          disabled
          counter={128}
          counterMax={99}
          counterLabel="archived tasks"
        />
      </List>
      <p className="muted" aria-live="polite">
        {checked ? '1 project checked' : 'No projects checked'} ·{' '}
        {selected ? 'Customer portal selected' : 'No row selected'} ·{' '}
        {reviewed ? 'Review completed' : 'Review pending'}
      </p>
    </div>
  );
}
export const OptionalParts: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'One-line and two-line rows with independent checkboxes, avatars, tags, actions, and compact counters. Checkbox and row selection are separate controlled states. Narrow containers place supplementary controls below the title and subtitle.',
      },
    },
  },
  render: () => <OptionalPartsDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByRole('button', { name: 'Customer portal' });
    const checkbox = canvas.getByRole('checkbox', { name: 'Customer portal' });
    await expect(row).toHaveAccessibleDescription('Atlas Commerce · Design handoff');
    await expect(checkbox).toHaveAccessibleDescription('Atlas Commerce · Design handoff');
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(canvas.getByRole('button', { name: 'Priority' }));
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(canvas.getByRole('button', { name: 'Review' }));
    await expect(canvas.getByText('Review completed', { exact: false })).toBeVisible();
    await expect(row).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(row);
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    checkbox.focus();
    await userEvent.keyboard(' ');
    await expect(checkbox).not.toBeChecked();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    const readOnly = canvas.getByRole('checkbox', { name: 'Quarterly planning' });
    await userEvent.click(readOnly);
    await expect(readOnly).toBeChecked();
    await expect(readOnly).toHaveAttribute('aria-readonly', 'true');
    await expect(canvas.getByRole('checkbox', { name: 'Archived workspace' })).toBeDisabled();
    await expect(canvas.getByText('0 open tasks')).toBeInTheDocument();
    await expect(canvas.getByText('128 archived tasks')).toBeInTheDocument();
  },
};

function NestedListDemo() {
  const [selected, setSelected] = useState('');
  const [checked, setChecked] = useState(false);
  const select = (title: string) => ({
    selectable: true,
    selected: selected === title,
    onSelect: () => setSelected(title),
  });
  return (
    <div className="story-layout" style={{ width: '100%', maxWidth: 960 }}>
      <List aria-label="Workspace projects" density="compact">
        <ListItem
          title="Northstar workspace"
          subtitle="Client operations"
          counter={8}
          counterLabel="projects"
          {...select('Northstar workspace')}
        >
          <List aria-label="Northstar projects">
            <ListItem
              title="Customer portal"
              icon={<Server size={20} />}
              counter={24}
              counterLabel="tasks"
              {...select('Customer portal')}
            >
              <List aria-label="Customer portal workstreams">
                <ListItem
                  title="Design handoff"
                  subtitle="Review before development starts"
                  tags={<Tag intent="function">In review</Tag>}
                  counter={4}
                  counterLabel="deliverables"
                  {...select('Design handoff')}
                >
                  <List aria-label="Design handoff deliverables">
                    <ListItem
                      title="Navigation specification"
                      subtitle="Maya Chen · Updated today"
                      avatar={<Avatar name="Maya Chen" size="sm" />}
                      checkbox={{ checked, onCheckedChange: (value) => setChecked(value === true) }}
                      counter={3}
                      counterLabel="comments"
                      {...select('Navigation specification')}
                    />
                    <ListItem
                      title="Responsive layouts"
                      checkbox={{ defaultChecked: 'indeterminate' }}
                      counter={12}
                      counterLabel="comments"
                    />
                  </List>
                </ListItem>
              </List>
            </ListItem>
            <ListItem
              title="Account onboarding"
              subtitle="Templates and approval steps"
              counter={6}
              counterLabel="tasks"
              {...select('Account onboarding')}
            />
          </List>
        </ListItem>
      </List>
      <p className="muted" aria-live="polite">
        {selected ? `Selected: ${selected}` : 'Select any project or deliverable.'}
      </p>
    </div>
  );
}
export const Nested: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Four levels of native nested lists. Each child List belongs inside its parent ListItem. Density is inherited, each row owns its selection, and nested lists do not introduce tree keyboard behavior.',
      },
    },
  },
  render: () => <NestedListDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const nested = canvas.getByRole('list', { name: 'Design handoff deliverables' });
    await expect(nested).toHaveAttribute('data-depth', '4');
    await expect(nested).toHaveAttribute('data-density', 'compact');
    await expect(nested.parentElement).toHaveRole('listitem');
    const leaf = canvas.getByRole('button', { name: 'Navigation specification' });
    await userEvent.click(leaf);
    await expect(leaf).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('button', { name: 'Design handoff' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const checkbox = canvas.getByRole('checkbox', { name: 'Navigation specification' });
    checkbox.focus();
    await userEvent.keyboard(' ');
    await expect(checkbox).toBeChecked();
    await expect(leaf).toHaveAttribute('aria-pressed', 'true');
    const mixed = canvas.getByRole('checkbox', { name: 'Responsive layouts' });
    await expect(mixed).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(mixed);
    await expect(mixed).toBeChecked();
  },
};

interface ListPlaygroundOptions extends Pick<ListProps, 'density' | 'divided'> {
  lines: 'one' | 'two';
  showCheckbox: boolean;
  leading: 'none' | 'icon' | 'avatar';
  showTags: boolean;
  showMetadata: boolean;
  showActions: boolean;
  showCounter: boolean;
  counter: number;
  levels: number;
  selectable: boolean;
  selected: boolean;
  disabled: boolean;
}
function PlaygroundList(options: ListPlaygroundOptions) {
  const [selectedRows, setSelectedRows] = useState<number[]>(options.selected ? [0] : []);
  const [checkedRows, setCheckedRows] = useState<number[]>([]);
  const [priorityRows, setPriorityRows] = useState<number[]>([]);
  const [reviewedRows, setReviewedRows] = useState<number[]>([]);
  const toggle = (values: number[], index: number) =>
    values.includes(index) ? values.filter((value) => value !== index) : [...values, index];
  const items = [
    { title: 'Northstar workspace', subtitle: 'Client operations', owner: 'Maya Chen' },
    {
      title: 'Customer portal',
      subtitle: 'Atlas Commerce · Implementation',
      owner: 'Eleni Papadopoulos',
    },
    {
      title: 'Design handoff',
      subtitle: 'Product design · Ready for review',
      owner: 'Marcus Chen',
    },
    {
      title: 'Navigation specification',
      subtitle: 'Documentation · Updated today',
      owner: 'Maya Chen',
    },
  ];
  const levelCount = Math.max(1, Math.min(4, Math.floor(options.levels)));
  const renderLevel = (index: number) => {
    const item = items[index];
    return (
      <List
        aria-label={index === 0 ? 'List playground' : `${items[index - 1].title} children`}
        density={index === 0 ? options.density : undefined}
        divided={options.divided}
      >
        <ListItem
          title={item.title}
          subtitle={options.lines === 'two' ? item.subtitle : undefined}
          checkbox={
            options.showCheckbox
              ? {
                  checked: checkedRows.includes(index),
                  onCheckedChange: () => setCheckedRows((current) => toggle(current, index)),
                }
              : undefined
          }
          avatar={options.leading === 'avatar' ? <Avatar name={item.owner} size="sm" /> : undefined}
          icon={options.leading === 'icon' ? <Server size={20} /> : undefined}
          tags={
            options.showTags ? (
              <Tag
                variant="interactive"
                selected={priorityRows.includes(index)}
                onSelectedChange={() => setPriorityRows((current) => toggle(current, index))}
                disabled={options.disabled}
              >
                Priority
              </Tag>
            ) : undefined
          }
          meta={options.showMetadata ? 'Today' : undefined}
          actions={
            options.showActions ? (
              <IconButton
                size="sm"
                aria-label={`${reviewedRows.includes(index) ? 'Undo review for' : 'Review'} ${item.title}`}
                disabled={options.disabled}
                onClick={() => setReviewedRows((current) => toggle(current, index))}
              >
                {reviewedRows.includes(index) ? <Check size={16} /> : <Bell size={16} />}
              </IconButton>
            ) : undefined
          }
          counter={options.showCounter ? options.counter : undefined}
          counterLabel="open tasks"
          selectable={options.selectable}
          selected={selectedRows.includes(index)}
          onSelect={
            options.selectable
              ? () => setSelectedRows((current) => toggle(current, index))
              : undefined
          }
          disabled={options.disabled}
        >
          {index + 1 < levelCount ? renderLevel(index + 1) : undefined}
        </ListItem>
        {index === 0 && (
          <ListItem
            title="Account onboarding"
            subtitle={
              options.lines === 'two' ? 'Customer success · Templates and approvals' : undefined
            }
            counter={options.showCounter ? 6 : undefined}
            counterLabel="open tasks"
          />
        )}
      </List>
    );
  };
  return (
    <div className="story-layout" style={{ width: '100%', maxWidth: 960 }}>
      {renderLevel(0)}
      <p className="muted" aria-live="polite">
        {checkedRows.length} checked · {selectedRows.length} selected · {reviewedRows.length}{' '}
        reviewed
      </p>
    </div>
  );
}
export const Playground: StoryObj<ListPlaygroundOptions> = {
  args: {
    lines: 'two',
    showCheckbox: true,
    leading: 'avatar',
    showTags: true,
    showMetadata: false,
    showActions: true,
    showCounter: true,
    counter: 24,
    levels: 1,
    density: 'default',
    divided: false,
    selectable: true,
    selected: false,
    disabled: false,
  },
  argTypes: {
    lines: {
      control: 'inline-radio',
      options: ['one', 'two'],
      description: 'Show the primary line only or include its supporting subtitle.',
    },
    showCheckbox: { control: 'boolean', name: 'Checkbox' },
    leading: {
      control: 'inline-radio',
      options: ['none', 'icon', 'avatar'],
      name: 'Leading visual',
    },
    showTags: { control: 'boolean', name: 'Tags' },
    showMetadata: { control: 'boolean', name: 'Metadata' },
    showActions: { control: 'boolean', name: 'Actions' },
    showCounter: { control: 'boolean', name: 'Counter' },
    counter: { control: { type: 'number', min: 0, max: 999, step: 1 }, name: 'Counter value' },
    levels: { control: { type: 'range', min: 1, max: 4, step: 1 }, name: 'Nesting levels' },
    density: { control: 'inline-radio', options: ['compact', 'default', 'comfortable'] },
    divided: { control: 'boolean' },
    selectable: { control: 'boolean' },
    selected: {
      control: 'boolean',
      description: 'Initial selected state of the first row. The preview remains interactive.',
    },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Configure the list composition. Controls reset the preview to the requested state; row selection, checkboxes, priority tags, and review actions remain functional. Each nested list uses native list semantics.',
      },
    },
  },
  render: (args) => <PlaygroundList key={JSON.stringify(args)} {...args} />,
};
