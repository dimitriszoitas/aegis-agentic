import { componentToken } from '@/lib/component-design-tokens';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowUpRight, Pencil, Plus, Sparkles } from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { EmptyState } from '@/components/empty-state';
import { Field } from '@/components/field';
import { MetricCard } from '@/components/metric-card';
import { Modal } from '@/components/modal';
import { ProgressBar } from '@/components/progress-bar';
import { Select } from '@/components/select';
import { Tabs } from '@/components/tabs';
import { Tag, type TagProps } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { Timeline } from '@/components/timeline';
import {
  businessReferenceDate,
  currentMemberId,
  formatBusinessDate,
  formatMoney,
  type BusinessActivity,
  type BusinessCustomer,
  type BusinessData,
  type BusinessProject,
  type BusinessViewProps,
  type RecordPage,
  type TeamMember,
} from './business-types';
import './business-details.css';

export interface BusinessDetailsProps extends BusinessViewProps {
  kind: RecordPage;
  id: string;
}

const projectStatuses: BusinessProject['status'][] = ['Planned', 'Active', 'On hold', 'Completed'];
const customerStatuses: BusinessCustomer['status'][] = ['Active', 'Prospect', 'Paused'];
const customerPlans: BusinessCustomer['plan'][] = ['Standard', 'Business', 'Enterprise'];
const memberRoles: TeamMember['role'][] = ['Admin', 'Manager', 'Member'];
const memberStatuses: TeamMember['status'][] = ['Active', 'Invited', 'Away'];
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

function recordActivity(
  data: BusinessData,
  page: RecordPage,
  recordId: string,
  text: string,
): BusinessActivity[] {
  return [
    {
      id: crypto.randomUUID(),
      actorId: currentMemberId,
      text,
      date: new Date().toISOString(),
      page,
      recordId,
    },
    ...data.activity,
  ];
}

function Status({ value }: { value: string }) {
  const intent: TagProps['intent'] = ['Active', 'Completed', 'Paid'].includes(value)
    ? 'success'
    : ['On hold', 'Paused', 'Away', 'Overdue'].includes(value)
      ? 'warning'
      : 'default';
  return (
    <Tag variant="status" intent={intent} size="sm">
      {value}
    </Tag>
  );
}

function DetailCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="aegis-business-detail-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DetailHeader({
  title,
  subtitle,
  kind,
  status,
  onEdit,
  onAskAi,
  avatar,
}: {
  title: string;
  subtitle: string;
  kind: RecordPage;
  status: string;
  onEdit: () => void;
  onAskAi: () => void;
  avatar?: ReactNode;
}) {
  const singular = kind === 'projects' ? 'project' : kind === 'customers' ? 'customer' : 'profile';
  return (
    <header className="aegis-business-detail-header">
      <div className="aegis-business-detail-heading-row">
        {avatar}
        <div className="aegis-business-detail-heading">
          <div className="aegis-business-detail-title">
            <h1>{title}</h1>
            <Status value={status} />
          </div>
          <p>{subtitle}</p>
        </div>
        <div className="aegis-business-detail-actions">
          <Button
            intent="ai"
            emphasis="secondary"
            leadingIcon={<Sparkles size={componentToken('application.icon-md')} />}
            onClick={onAskAi}
          >
            Ask Aegis AI
          </Button>
          <Button
            emphasis="tertiary"
            leadingIcon={<Pencil size={componentToken('application.icon-md')} />}
            onClick={onEdit}
          >
            Edit {singular}
          </Button>
        </div>
      </div>
    </header>
  );
}

function MemberLink({
  member,
  onNavigate,
}: {
  member?: TeamMember;
  onNavigate: BusinessViewProps['onNavigate'];
}) {
  if (!member) return <span className="aegis-business-detail-muted">Unassigned</span>;
  return (
    <button
      type="button"
      className="aegis-business-detail-member"
      onClick={() => onNavigate({ page: 'team', recordId: member.id })}
    >
      <Avatar name={member.name} initials={member.initials} size="sm" aria-hidden="true" />
      <span>
        <strong>{member.name}</strong>
        <small>{member.title}</small>
      </span>
      <ArrowUpRight size={componentToken('application.icon-sm')} aria-hidden="true" />
    </button>
  );
}

function ActivityList({
  entries,
  data,
  onNavigate,
}: {
  entries: BusinessActivity[];
  data: BusinessData;
  onNavigate: BusinessViewProps['onNavigate'];
}) {
  if (!entries.length)
    return (
      <EmptyState
        compact
        title="No activity yet"
        description="Updates to this record will appear here."
      />
    );
  return (
    <Timeline
      label="Record activity"
      now={Math.max(
        Date.parse(businessReferenceDate),
        ...entries.map((entry) => Date.parse(entry.date)),
      )}
      items={[...entries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((entry) => ({
          id: entry.id,
          title: entry.text,
          timestamp: entry.date,
          actor: data.team.find((member) => member.id === entry.actorId)?.name ?? 'Team member',
          actions:
            entry.page && entry.recordId ? (
              <Button
                size="sm"
                emphasis="ghost"
                onClick={() => onNavigate({ page: entry.page!, recordId: entry.recordId })}
              >
                View record
              </Button>
            ) : undefined,
        }))}
    />
  );
}

function ProjectRows({
  projects,
  data,
  onNavigate,
}: {
  projects: BusinessProject[];
  data: BusinessData;
  onNavigate: BusinessViewProps['onNavigate'];
}) {
  if (!projects.length)
    return (
      <EmptyState
        compact
        title="No projects yet"
        description="Projects connected to this record will appear here."
      />
    );
  return (
    <ul className="aegis-business-detail-projects">
      {projects.map((project) => (
        <li key={project.id}>
          <button
            type="button"
            className="aegis-business-detail-project-link"
            onClick={() => onNavigate({ page: 'projects', recordId: project.id })}
          >
            <span>
              <strong>{project.name}</strong>
              <small>
                {data.customers.find((customer) => customer.id === project.customerId)?.name ??
                  'No customer'}{' '}
                · Due {formatBusinessDate(project.dueDate)}
              </small>
            </span>
            <ArrowUpRight size={componentToken('application.icon-md')} aria-hidden="true" />
          </button>
          <div className="aegis-business-detail-project-progress">
            <Status value={project.status} />
            <ProgressBar value={project.progress} label={`${project.name} progress`} />
            <span>{project.progress}%</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EditDialog({
  title,
  description,
  children,
  onClose,
  onSave,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const formId = useId();
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button emphasis="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Save changes
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="aegis-business-detail-form" onSubmit={onSave}>
        {children}
      </form>
    </Modal>
  );
}

function ProjectEditor({
  project,
  team,
  onClose,
  onSave,
}: {
  project: BusinessProject;
  team: TeamMember[];
  onClose: () => void;
  onSave: (change: Partial<BusinessProject>) => void;
}) {
  const [draft, setDraft] = useState({
    name: project.name,
    description: project.description,
    status: project.status,
    ownerId: project.ownerId,
    dueDate: project.dueDate.slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const patch = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Enter a project name.';
    if (!draft.description.trim()) next.description = 'Add a short project description.';
    if (!team.some((member) => member.id === draft.ownerId))
      next.ownerId = 'Choose a project owner.';
    if (!draft.dueDate || Number.isNaN(Date.parse(draft.dueDate)))
      next.dueDate = 'Choose a valid due date.';
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.name) nameRef.current?.focus();
      return;
    }
    onSave({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
  }
  return (
    <EditDialog
      title="Edit project"
      description="Update the project brief and delivery details."
      onClose={onClose}
      onSave={save}
    >
      <Field label="Project name" required error={errors.name}>
        <TextInput
          ref={nameRef}
          value={draft.name}
          onValueChange={(value) => patch('name', value)}
          maxLength={120}
        />
      </Field>
      <Field label="Description" required error={errors.description}>
        <Textarea
          value={draft.description}
          onValueChange={(value) => patch('description', value)}
          rows={4}
          maxLength={2000}
        />
      </Field>
      <div className="aegis-business-detail-form-grid">
        <Field label="Status" required>
          <Select
            value={draft.status}
            options={options(projectStatuses)}
            onValueChange={(value) => patch('status', value as BusinessProject['status'])}
          />
        </Field>
        <Field label="Due date" required error={errors.dueDate}>
          <TextInput
            type="date"
            value={draft.dueDate}
            onValueChange={(value) => patch('dueDate', value)}
          />
        </Field>
      </div>
      <Field label="Project owner" required error={errors.ownerId}>
        <Select
          value={draft.ownerId}
          options={team.map((member) => ({
            value: member.id,
            label: member.name,
            description: member.title,
          }))}
          onValueChange={(value) => patch('ownerId', value)}
        />
      </Field>
    </EditDialog>
  );
}

function ProjectDetails({ project, ...props }: BusinessViewProps & { project: BusinessProject }) {
  const { data, onNavigate, onChange, onAskAi } = props;
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteAdded, setNoteAdded] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const owner = data.team.find((member) => member.id === project.ownerId);
  const customer = data.customers.find((item) => item.id === project.customerId);
  const members = data.team.filter((member) => project.memberIds.includes(member.id));
  const completed = project.tasks.filter((task) => task.done).length;
  const activities = data.activity.filter(
    (entry) => entry.page === 'projects' && entry.recordId === project.id,
  );
  function update(change: Partial<BusinessProject>, message: string) {
    onChange(
      {
        activity: recordActivity(data, 'projects', project.id, message),
        projects: data.projects.map((item) =>
          item.id === project.id
            ? { ...item, ...change, updatedAt: new Date().toISOString() }
            : item,
        ),
      },
      message,
    );
  }
  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) {
      setNoteError('Write a note before adding it.');
      noteRef.current?.focus();
      return;
    }
    update(
      {
        notes: [
          ...project.notes,
          {
            id: crypto.randomUUID(),
            authorId: currentMemberId,
            text: note.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      },
      `Note added to ${project.name}`,
    );
    setNote('');
    setNoteError('');
    setNoteAdded('Note added.');
    noteRef.current?.focus();
  }
  const summary = (
    <div className="aegis-business-detail-columns">
      <div className="aegis-business-detail-stack">
        <DetailCard title="Project brief">
          <p className="aegis-business-detail-prose">
            {project.description || 'No description added yet.'}
          </p>
          <div className="aegis-business-detail-progress">
            <ProgressBar value={project.progress} label="Project completion" showValue />
            <p>
              {completed} of {project.tasks.length} tasks complete
            </p>
          </div>
        </DetailCard>
        <DetailCard title="Project notes">
          <ol className="aegis-business-detail-notes">
            {project.notes.map((entry) => (
              <li key={entry.id}>
                <div className="aegis-business-detail-note-heading">
                  <MemberLink
                    member={data.team.find((member) => member.id === entry.authorId)}
                    onNavigate={onNavigate}
                  />
                  <time dateTime={entry.createdAt}>{formatBusinessDate(entry.createdAt)}</time>
                </div>
                <p>{entry.text}</p>
              </li>
            ))}
          </ol>
          {!project.notes.length && (
            <p className="aegis-business-detail-muted">
              Keep decisions and handoffs with the project.
            </p>
          )}
          <form className="aegis-business-detail-note-form" onSubmit={addNote} noValidate>
            <Field label="Add a project note" error={noteError}>
              <Textarea
                ref={noteRef}
                value={note}
                onValueChange={(value) => {
                  setNote(value);
                  setNoteAdded('');
                }}
                placeholder="Share an update with the team…"
                maxLength={2000}
                rows={3}
              />
            </Field>
            <div>
              <span role="status" className="aegis-business-detail-muted">
                {noteAdded}
              </span>
              <Button
                type="submit"
                size="sm"
                leadingIcon={<Plus size={componentToken('application.icon-sm')} />}
              >
                Add note
              </Button>
            </div>
          </form>
        </DetailCard>
      </div>
      <div className="aegis-business-detail-stack">
        <DetailCard title="Details">
          <dl className="aegis-business-detail-facts">
            <div>
              <dt>Customer</dt>
              <dd>
                {customer ? (
                  <button
                    className="aegis-business-detail-link"
                    onClick={() => onNavigate({ page: 'customers', recordId: customer.id })}
                  >
                    {customer.name}
                    <ArrowUpRight size={componentToken('application.icon-sm')} aria-hidden="true" />
                  </button>
                ) : (
                  'No customer linked'
                )}
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                <MemberLink member={owner} onNavigate={onNavigate} />
              </dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{formatBusinessDate(project.dueDate)}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                <Tag size="sm" intent={project.priority === 'High' ? 'warning' : 'default'}>
                  {project.priority}
                </Tag>
              </dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatBusinessDate(project.updatedAt)}</dd>
            </div>
          </dl>
        </DetailCard>
        <DetailCard title={`Project team · ${members.length}`}>
          <ul className="aegis-business-detail-members">
            {members.map((member) => (
              <li key={member.id}>
                <MemberLink member={member} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
          {!members.length && (
            <p className="aegis-business-detail-muted">No team members assigned.</p>
          )}
        </DetailCard>
      </div>
    </div>
  );
  const tasks = (
    <DetailCard
      title="Delivery checklist"
      action={
        <span className="aegis-business-detail-muted">
          {completed} / {project.tasks.length} complete
        </span>
      }
    >
      {project.tasks.length ? (
        <ul className="aegis-business-detail-tasks">
          {project.tasks.map((task) => (
            <li key={task.id} data-complete={task.done}>
              <Checkbox
                checked={task.done}
                label={task.title}
                onCheckedChange={(checked) => {
                  const nextTasks = project.tasks.map((item) =>
                    item.id === task.id ? { ...item, done: checked === true } : item,
                  );
                  update(
                    {
                      tasks: nextTasks,
                      progress: Math.round(
                        (nextTasks.filter((item) => item.done).length / nextTasks.length) * 100,
                      ),
                    },
                    `${task.title} marked ${checked === true ? 'complete' : 'incomplete'}`,
                  );
                }}
              />
              <MemberLink
                member={data.team.find((member) => member.id === task.assigneeId)}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          compact
          title="No tasks yet"
          description="Tasks assigned to this project will appear here."
        />
      )}
    </DetailCard>
  );
  return (
    <div className="aegis-business-detail">
      <DetailHeader
        title={project.name}
        subtitle={`${project.id} · ${customer?.name ?? 'No customer linked'}`}
        kind="projects"
        status={project.status}
        onEdit={() => setEditing(true)}
        onAskAi={() =>
          onAskAi(`Summarize the progress, budget, and next steps for project ${project.name}.`, {
            page: 'projects',
            recordId: project.id,
          })
        }
      />
      <div className="aegis-business-detail-metrics">
        <MetricCard label="Project budget" value={formatMoney(project.budget)} />
        <MetricCard label="Spent to date" value={formatMoney(project.spent)} />
        <MetricCard
          label="Remaining budget"
          value={formatMoney(project.budget - project.spent)}
          intent={project.spent > project.budget ? 'destroy' : undefined}
        />
        <MetricCard label="Completion" value={`${project.progress}%`} />
      </div>
      <Tabs
        label="Project details"
        items={[
          { value: 'overview', label: 'Overview', content: summary },
          { value: 'tasks', label: `Tasks (${project.tasks.length})`, content: tasks },
          {
            value: 'activity',
            label: 'Activity',
            content: (
              <DetailCard title="Project activity">
                <ActivityList entries={activities} data={data} onNavigate={onNavigate} />
              </DetailCard>
            ),
          },
        ]}
      />
      {editing && (
        <ProjectEditor
          project={project}
          team={data.team}
          onClose={() => setEditing(false)}
          onSave={(change) => {
            update(change, `${change.name ?? project.name} updated`);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function CustomerEditor({
  customer,
  team,
  onClose,
  onSave,
}: {
  customer: BusinessCustomer;
  team: TeamMember[];
  onClose: () => void;
  onSave: (change: Partial<BusinessCustomer>) => void;
}) {
  const [draft, setDraft] = useState(customer);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const patch = <K extends keyof BusinessCustomer>(key: K, value: BusinessCustomer[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Enter an account name.';
    if (!draft.contact.trim()) next.contact = 'Enter a contact name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      next.email = 'Enter a valid contact email.';
    if (!team.some((member) => member.id === draft.ownerId))
      next.ownerId = 'Choose an account owner.';
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.name) nameRef.current?.focus();
      return;
    }
    const { name, contact, email, industry, location, plan, status, ownerId } = draft;
    onSave({
      name: name.trim(),
      contact: contact.trim(),
      email: email.trim(),
      industry: industry.trim(),
      location: location.trim(),
      plan,
      status,
      ownerId,
    });
  }
  return (
    <EditDialog
      title="Edit customer"
      description="Keep the account and its primary contact up to date."
      onClose={onClose}
      onSave={save}
    >
      <Field label="Account name" required error={errors.name}>
        <TextInput
          ref={nameRef}
          value={draft.name}
          onValueChange={(value) => patch('name', value)}
          maxLength={120}
        />
      </Field>
      <div className="aegis-business-detail-form-grid">
        <Field label="Industry">
          <TextInput value={draft.industry} onValueChange={(value) => patch('industry', value)} />
        </Field>
        <Field label="Location">
          <TextInput value={draft.location} onValueChange={(value) => patch('location', value)} />
        </Field>
      </div>
      <div className="aegis-business-detail-form-grid">
        <Field label="Contact name" required error={errors.contact}>
          <TextInput value={draft.contact} onValueChange={(value) => patch('contact', value)} />
        </Field>
        <Field label="Contact email" required error={errors.email}>
          <TextInput
            type="email"
            value={draft.email}
            onValueChange={(value) => patch('email', value)}
          />
        </Field>
      </div>
      <div className="aegis-business-detail-form-grid">
        <Field label="Plan">
          <Select
            value={draft.plan}
            options={options(customerPlans)}
            onValueChange={(value) => patch('plan', value as BusinessCustomer['plan'])}
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            options={options(customerStatuses)}
            onValueChange={(value) => patch('status', value as BusinessCustomer['status'])}
          />
        </Field>
      </div>
      <Field label="Account owner" required error={errors.ownerId}>
        <Select
          value={draft.ownerId}
          options={team.map((member) => ({ value: member.id, label: member.name }))}
          onValueChange={(value) => patch('ownerId', value)}
        />
      </Field>
    </EditDialog>
  );
}

function CustomerDetails({
  customer,
  data,
  onNavigate,
  onChange,
  onAskAi,
}: BusinessViewProps & { customer: BusinessCustomer }) {
  const [editing, setEditing] = useState(false);
  const projects = data.projects.filter((project) => project.customerId === customer.id);
  const invoices = data.invoices.filter((invoice) => invoice.customerId === customer.id);
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paid = invoices
    .filter((invoice) => invoice.status === 'Paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdue = invoices
    .filter((invoice) => invoice.status === 'Overdue')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  return (
    <div className="aegis-business-detail">
      <DetailHeader
        title={customer.name}
        subtitle={`${customer.id} · ${customer.industry}`}
        kind="customers"
        status={customer.status}
        onEdit={() => setEditing(true)}
        onAskAi={() =>
          onAskAi(
            `Review the customer account ${customer.name}, its projects, and outstanding invoices.`,
            { page: 'customers', recordId: customer.id },
          )
        }
      />
      <div className="aegis-business-detail-metrics">
        <MetricCard label="Total invoiced" value={formatMoney(total)} />
        <MetricCard label="Paid" value={formatMoney(paid)} />
        <MetricCard label="Outstanding" value={formatMoney(total - paid)} />
        <MetricCard
          label="Overdue"
          value={formatMoney(overdue)}
          intent={overdue > 0 ? 'warning' : undefined}
        />
      </div>
      <div className="aegis-business-detail-columns">
        <div className="aegis-business-detail-stack">
          <DetailCard title={`Related projects · ${projects.length}`}>
            <ProjectRows projects={projects} data={data} onNavigate={onNavigate} />
          </DetailCard>
          <DetailCard
            title="Invoices"
            action={
              <Button emphasis="ghost" size="sm" onClick={() => onNavigate({ page: 'invoices' })}>
                View all invoices
              </Button>
            }
          >
            {invoices.length ? (
              <div
                className="aegis-business-detail-table-wrap"
                role="region"
                aria-label="Customer invoices"
                tabIndex={0}
              >
                <table className="aegis-business-detail-table">
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th>
                      <th scope="col">Due date</th>
                      <th scope="col">Status</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="mono">{invoice.id}</td>
                        <td>{formatBusinessDate(invoice.dueDate)}</td>
                        <td>
                          <Status value={invoice.status} />
                        </td>
                        <td>{formatMoney(invoice.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="aegis-business-detail-muted">No invoices for this customer yet.</p>
            )}
          </DetailCard>
        </div>
        <div className="aegis-business-detail-stack">
          <DetailCard title="Account details">
            <dl className="aegis-business-detail-facts">
              <div>
                <dt>Plan</dt>
                <dd>
                  <Tag>{customer.plan}</Tag>
                </dd>
              </div>
              <div>
                <dt>Primary contact</dt>
                <dd>{customer.contact}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a className="aegis-business-detail-link" href={`mailto:${customer.email}`}>
                    {customer.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{customer.location || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Customer since</dt>
                <dd>{formatBusinessDate(customer.joinedAt)}</dd>
              </div>
              <div>
                <dt>Account owner</dt>
                <dd>
                  <MemberLink
                    member={data.team.find((member) => member.id === customer.ownerId)}
                    onNavigate={onNavigate}
                  />
                </dd>
              </div>
            </dl>
          </DetailCard>
          <DetailCard title="Account activity">
            <ActivityList
              entries={data.activity.filter(
                (entry) => entry.page === 'customers' && entry.recordId === customer.id,
              )}
              data={data}
              onNavigate={onNavigate}
            />
          </DetailCard>
        </div>
      </div>
      {editing && (
        <CustomerEditor
          customer={customer}
          team={data.team}
          onClose={() => setEditing(false)}
          onSave={(change) => {
            onChange(
              {
                activity: recordActivity(
                  data,
                  'customers',
                  customer.id,
                  `${change.name ?? customer.name} updated`,
                ),
                customers: data.customers.map((item) =>
                  item.id === customer.id ? { ...item, ...change } : item,
                ),
              },
              `${change.name ?? customer.name} updated`,
            );
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function MemberEditor({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (change: Partial<TeamMember>) => void;
}) {
  const [draft, setDraft] = useState(member);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const patch = <K extends keyof TeamMember>(key: K, value: TeamMember[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = 'Enter a full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      next.email = 'Enter a valid email address.';
    if (!draft.title.trim()) next.title = 'Enter a job title.';
    setErrors(next);
    if (Object.keys(next).length) {
      if (next.name) nameRef.current?.focus();
      return;
    }
    const name = draft.name.trim();
    const initials = name
      .split(/\s+/)
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
    const { email, title, department, location, bio, role, status } = draft;
    onSave({
      name,
      initials,
      email: email.trim(),
      title: title.trim(),
      department: department.trim(),
      location: location.trim(),
      bio: bio.trim(),
      role,
      status,
    });
  }
  return (
    <EditDialog
      title="Edit profile"
      description="Update this team member’s profile and workspace role."
      onClose={onClose}
      onSave={save}
    >
      <Field label="Full name" required error={errors.name}>
        <TextInput
          ref={nameRef}
          value={draft.name}
          onValueChange={(value) => patch('name', value)}
          maxLength={100}
        />
      </Field>
      <Field label="Email" required error={errors.email}>
        <TextInput
          type="email"
          value={draft.email}
          onValueChange={(value) => patch('email', value)}
        />
      </Field>
      <div className="aegis-business-detail-form-grid">
        <Field label="Job title" required error={errors.title}>
          <TextInput value={draft.title} onValueChange={(value) => patch('title', value)} />
        </Field>
        <Field label="Department">
          <TextInput
            value={draft.department}
            onValueChange={(value) => patch('department', value)}
          />
        </Field>
      </div>
      <Field label="Location">
        <TextInput value={draft.location} onValueChange={(value) => patch('location', value)} />
      </Field>
      <Field label="Bio">
        <Textarea
          value={draft.bio}
          onValueChange={(value) => patch('bio', value)}
          rows={3}
          maxLength={1000}
        />
      </Field>
      <div className="aegis-business-detail-form-grid">
        <Field label="Workspace role">
          <Select
            value={draft.role}
            options={options(memberRoles)}
            onValueChange={(value) => patch('role', value as TeamMember['role'])}
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            options={options(memberStatuses)}
            onValueChange={(value) => patch('status', value as TeamMember['status'])}
          />
        </Field>
      </div>
    </EditDialog>
  );
}

function MemberDetails({
  member,
  data,
  onNavigate,
  onChange,
  onAskAi,
}: BusinessViewProps & { member: TeamMember }) {
  const [editing, setEditing] = useState(false);
  const projects = data.projects.filter(
    (project) => project.ownerId === member.id || project.memberIds.includes(member.id),
  );
  const tasks = projects
    .flatMap((project) => project.tasks)
    .filter((task) => task.assigneeId === member.id);
  const activities = data.activity.filter(
    (entry) =>
      entry.actorId === member.id || (entry.page === 'team' && entry.recordId === member.id),
  );
  return (
    <div className="aegis-business-detail">
      <DetailHeader
        title={member.name}
        subtitle={`${member.title} · ${member.department}`}
        avatar={
          <Avatar name={member.name} initials={member.initials} size="lg" aria-hidden="true" />
        }
        kind="team"
        status={member.status}
        onEdit={() => setEditing(true)}
        onAskAi={() =>
          onAskAi(`Summarize ${member.name}’s assigned projects and open tasks.`, {
            page: 'team',
            recordId: member.id,
          })
        }
      />
      <div className="aegis-business-detail-metrics aegis-business-detail-metrics-three">
        <MetricCard label="Assigned projects" value={projects.length} />
        <MetricCard label="Open tasks" value={tasks.filter((task) => !task.done).length} />
        <MetricCard label="Completed tasks" value={tasks.filter((task) => task.done).length} />
      </div>
      <div className="aegis-business-detail-columns">
        <div className="aegis-business-detail-stack">
          <DetailCard title="About">
            <p className="aegis-business-detail-prose">
              {member.bio || 'This team member has not added a bio yet.'}
            </p>
          </DetailCard>
          <DetailCard title="Assigned projects">
            <ProjectRows projects={projects} data={data} onNavigate={onNavigate} />
          </DetailCard>
          <DetailCard title="Recent activity">
            <ActivityList entries={activities} data={data} onNavigate={onNavigate} />
          </DetailCard>
        </div>
        <DetailCard title="Profile details">
          <dl className="aegis-business-detail-facts">
            <div>
              <dt>Workspace role</dt>
              <dd>
                <Tag>{member.role}</Tag>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a className="aegis-business-detail-link" href={`mailto:${member.email}`}>
                  {member.email}
                </a>
              </dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{member.department || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{member.location || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatBusinessDate(member.joinedAt)}</dd>
            </div>
          </dl>
        </DetailCard>
      </div>
      {editing && (
        <MemberEditor
          member={member}
          onClose={() => setEditing(false)}
          onSave={(change) => {
            onChange(
              {
                activity: recordActivity(
                  data,
                  'team',
                  member.id,
                  `${change.name ?? member.name} updated`,
                ),
                team: data.team.map((item) =>
                  item.id === member.id ? { ...item, ...change } : item,
                ),
              },
              `${change.name ?? member.name} updated`,
            );
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

export function BusinessDetails({ kind, id, ...props }: BusinessDetailsProps) {
  const project =
    kind === 'projects' ? props.data.projects.find((record) => record.id === id) : undefined;
  const customer =
    kind === 'customers' ? props.data.customers.find((record) => record.id === id) : undefined;
  const member = kind === 'team' ? props.data.team.find((record) => record.id === id) : undefined;
  if (project) return <ProjectDetails key={project.id} project={project} {...props} />;
  if (customer) return <CustomerDetails key={customer.id} customer={customer} {...props} />;
  if (member) return <MemberDetails key={member.id} member={member} {...props} />;
  return (
    <EmptyState
      title="Record not found"
      description="This record is no longer available. Return to the list to choose another."
      action={<Button onClick={() => props.onNavigate({ page: kind })}>Back to {kind}</Button>}
    />
  );
}
