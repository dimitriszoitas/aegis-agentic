import { FormaFilterToolbar } from './filter-toolbar';
import { PageHeader } from '@/patterns/page-header';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DataGrid } from '@/components/data-grid';
import { Field } from '@/components/field';
import { Download, Plus, Trash2 } from '@/components/icon';
import { ConfirmDialog, Modal } from '@/components/modal';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { SideSheet, SideSheetField, SideSheetSection } from '@/components/side-sheet';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { componentToken, useComponentTokenNumbers } from '@/lib/component-design-tokens';
import { dateLabel, downloadCsv, invoiceTotal, money, uid, today } from './model';
import type { FormaStore, FormaUser, UserRole, UserStatus } from './types';

const roleOptions = ['Admin', 'Member', 'Viewer'].map((value) => ({ value, label: value }));
const statusOptions = ['Active', 'Invited', 'Suspended'].map((value) => ({ value, label: value }));
const planOptions = ['Starter', 'Pro', 'Business'].map((value) => ({ value, label: value }));
const emptyDraft = {
  name: '',
  email: '',
  company: '',
  location: '',
  role: 'Member' as UserRole,
  status: 'Active' as UserStatus,
  plan: 'Pro' as FormaUser['plan'],
};
type UserDraft = typeof emptyDraft;
type DraftErrors = Partial<Record<'name' | 'email', string>>;

function UserStatusTag({ status }: { status: UserStatus }) {
  return (
    <Tag
      variant="status"
      intent={status === 'Active' ? 'success' : status === 'Invited' ? 'function' : 'warning'}
    >
      {status}
    </Tag>
  );
}

function exportUsers(users: FormaUser[]) {
  downloadCsv(
    'forma-users.csv',
    ['Name', 'Email', 'Company', 'Role', 'Status', 'Plan', 'Joined', 'Location'],
    users.map((user) => [
      user.name,
      user.email,
      user.company,
      user.role,
      user.status,
      user.plan,
      user.joined,
      user.location,
    ]),
  );
}

export function UsersPage({ state, update, notice, navigate }: FormaStore) {
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const tokens = useComponentTokenNumbers([
    'application.grid-column-3xl',
    'application.grid-column-sm',
    'application.grid-column-md',
  ]);
  const detail = state.users.find((user) => user.id === detailId);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return state.users.filter(
      (user) =>
        (!search || `${user.name} ${user.email} ${user.company}`.toLowerCase().includes(search)) &&
        (!roles.length || roles.includes(user.role)) &&
        (!statuses.length || statuses.includes(user.status)),
    );
  }, [state.users, query, roles, statuses]);
  const relatedInvoices = detail
    ? state.invoices.filter((invoice) => invoice.userId === detail.id)
    : [];
  const columns = useMemo<ColumnDef<FormaUser>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'User',
        size: tokens['application.grid-column-3xl'],
        enableHiding: false,
        cell: ({ row }) => (
          <div className="forma-inline">
            <Avatar name={row.original.name} size="sm" />
            <div className="forma-cell-person">
              <span className="forma-strong">{row.original.name}</span>
              <span className="forma-muted">{row.original.email}</span>
            </div>
          </div>
        ),
        meta: { label: 'User', getText: (user) => `${user.name} ${user.email}` },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: tokens['application.grid-column-sm'],
        cell: ({ row }) => <UserStatusTag status={row.original.status} />,
      },
      { accessorKey: 'role', header: 'Role', size: tokens['application.grid-column-sm'] },
      { accessorKey: 'company', header: 'Company' },
      {
        accessorKey: 'plan',
        header: 'Plan',
        size: tokens['application.grid-column-sm'],
        cell: ({ row }) => <Tag>{row.original.plan}</Tag>,
      },
      {
        accessorKey: 'joined',
        header: 'Joined',
        size: tokens['application.grid-column-md'],
        cell: ({ row }) => dateLabel(row.original.joined),
      },
      { accessorKey: 'location', header: 'Location' },
    ],
    [tokens],
  );

  function changeUser(id: string, changes: Partial<FormaUser>) {
    update((current) => ({
      ...current,
      users: current.users.map((user) => (user.id === id ? { ...user, ...changes } : user)),
    }));
  }

  function clearFilters() {
    setQuery('');
    setRoles([]);
    setStatuses([]);
    setSelectedIds([]);
  }

  function changeDraft<K extends keyof UserDraft>(key: K, value: UserDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key === 'name' || key === 'email')
      setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = draft.email.trim().toLowerCase();
    const nextErrors: DraftErrors = {};
    if (!draft.name.trim()) nextErrors.name = 'Enter the user’s full name.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      nextErrors.email = 'Enter a valid email address.';
    else if (state.users.some((user) => user.email.toLowerCase() === email))
      nextErrors.email = 'A user with this email already exists.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      (nextErrors.name ? nameRef : emailRef).current?.focus();
      return;
    }
    const user: FormaUser = {
      ...draft,
      id: uid('user'),
      name: draft.name.trim(),
      email,
      company: draft.company.trim(),
      location: draft.location.trim(),
      joined: today(),
      lastActive: '',
      notes: '',
    };
    update((current) => ({ ...current, users: [user, ...current.users] }));
    setAddOpen(false);
    clearFilters();
    notice(`${user.name} was added to your local workspace.`);
  }

  function deleteUser() {
    if (!detail) return;
    const name = detail.name;
    update((current) => ({
      ...current,
      users: current.users.filter((user) => user.id !== detail.id),
    }));
    setSelectedIds((current) => current.filter((id) => id !== detail.id));
    setDeleteOpen(false);
    setDetailId(null);
    notice(`${name} was removed. Existing invoices have been preserved.`);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  return (
    <section className="forma-page" aria-label="User management">
      <PageHeader
        title="Users"
        description="Manage the people and permissions in your workspace."
        actions={
          <>
            <Button
              emphasis="secondary"
              leadingIcon={<Download size={componentToken('application.icon-md')} />}
              disabled={!filtered.length}
              onClick={() => {
                exportUsers(filtered);
                notice(`Exported ${filtered.length} users.`);
              }}
            >
              Export
            </Button>
            <Modal
              title="Add user"
              description="Create a user in this workspace. No invitation email is sent."
              open={addOpen}
              onOpenChange={(open) => {
                if (open) {
                  setDraft(emptyDraft);
                  setErrors({});
                }
                setAddOpen(open);
              }}
              trigger={
                <Button
                  intent="function"
                  leadingIcon={<Plus size={componentToken('application.icon-md')} />}
                >
                  Add user
                </Button>
              }
              closeOnOutsideClick={false}
              footer={
                <>
                  <Button emphasis="ghost" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" form="forma-add-user" intent="function">
                    Create user
                  </Button>
                </>
              }
            >
              <form id="forma-add-user" className="forma-stack" onSubmit={addUser} noValidate>
                <Field label="Full name" required error={errors.name}>
                  <TextInput
                    ref={nameRef}
                    value={draft.name}
                    onValueChange={(value) => changeDraft('name', value)}
                    autoComplete="name"
                    placeholder="e.g. Jordan Lee"
                    maxLength={120}
                  />
                </Field>
                <Field label="Email address" required error={errors.email}>
                  <TextInput
                    ref={emailRef}
                    type="email"
                    value={draft.email}
                    onValueChange={(value) => changeDraft('email', value)}
                    autoComplete="email"
                    placeholder="jordan@company.com"
                    maxLength={254}
                  />
                </Field>
                <div className="forma-two-col">
                  <Field label="Company" optional>
                    <TextInput
                      value={draft.company}
                      onValueChange={(value) => changeDraft('company', value)}
                      autoComplete="organization"
                      placeholder="Company name"
                      maxLength={160}
                    />
                  </Field>
                  <Field label="Location" optional>
                    <TextInput
                      value={draft.location}
                      onValueChange={(value) => changeDraft('location', value)}
                      placeholder="City, country"
                      maxLength={160}
                    />
                  </Field>
                </div>
                <div className="forma-two-col">
                  <Field label="Role">
                    <Select
                      value={draft.role}
                      options={roleOptions}
                      onValueChange={(value) => changeDraft('role', value as UserRole)}
                    />
                  </Field>
                  <Field label="Plan">
                    <Select
                      value={draft.plan}
                      options={planOptions}
                      onValueChange={(value) => changeDraft('plan', value as FormaUser['plan'])}
                    />
                  </Field>
                </div>
                <Field
                  label="Status"
                  helpText="Roles and statuses are local records; they do not grant account access."
                >
                  <Select
                    value={draft.status}
                    options={statusOptions}
                    onValueChange={(value) => changeDraft('status', value as UserStatus)}
                  />
                </Field>
              </form>
            </Modal>
          </>
        }
      />
      <div className="forma-summary-grid" aria-label="User summary">
        <div className="forma-summary">
          <span>Total users</span>
          <strong>{state.users.length}</strong>
        </div>
        <div className="forma-summary">
          <span>Active</span>
          <strong>{state.users.filter((user) => user.status === 'Active').length}</strong>
        </div>
        <div className="forma-summary">
          <span>Invited</span>
          <strong>{state.users.filter((user) => user.status === 'Invited').length}</strong>
        </div>
        <div className="forma-summary">
          <span>Business plan</span>
          <strong>{state.users.filter((user) => user.plan === 'Business').length}</strong>
        </div>
      </div>
      <FormaFilterToolbar
        label="Filter users"
        noun="user"
        resultCount={filtered.length}
        query={query}
        onClearQuery={() => {
          setQuery('');
          setSelectedIds([]);
        }}
        onClearAll={clearFilters}
        facets={[
          {
            id: 'role',
            label: 'Role',
            options: roleOptions,
            values: roles,
            onValueChange: (values) => {
              setRoles(values);
              setSelectedIds([]);
            },
          },
          {
            id: 'status',
            label: 'Status',
            options: statusOptions,
            values: statuses,
            onValueChange: (values) => {
              setStatuses(values);
              setSelectedIds([]);
            },
          },
        ]}
        search={
          <SearchInput
            ref={searchRef}
            aria-label="Search users"
            placeholder="Search name, email or company…"
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              setSelectedIds([]);
            }}
          />
        }
      />
      <DataGrid
        data={filtered}
        columns={columns}
        getRowId={(user) => user.id}
        label="All users"
        noun="users"
        rowLabel={(user) => user.name}
        onRowClick={(user) => setDetailId(user.id)}
        selectedRowIds={selectedIds}
        onSelectedRowsChange={setSelectedIds}
        density={state.settings.density}
        onDensityChange={(density) =>
          update((current) => ({ ...current, settings: { ...current.settings, density } }))
        }
        pageSize={10}
        initialColumnVisibility={{ location: false }}
        emptyTitle={
          state.users.length ? 'No users match your filters' : 'Your people, in one place'
        }
        emptyDescription={
          state.users.length
            ? 'Try a different name, email, role or status, or clear the filters above.'
            : 'Choose Add user to create your first user.'
        }
        renderBulkActions={(selected, clear) => (
          <>
            <span>{selected.length} selected</span>
            <Button
              size="sm"
              emphasis="secondary"
              onClick={() => {
                const ids = new Set(selected.map((user) => user.id));
                update((current) => ({
                  ...current,
                  users: current.users.map((user) =>
                    ids.has(user.id) ? { ...user, status: 'Active' } : user,
                  ),
                }));
                clear();
                notice(`${selected.length} users marked active.`);
              }}
            >
              Activate
            </Button>
            <Button
              size="sm"
              emphasis="secondary"
              onClick={() => {
                const ids = new Set(selected.map((user) => user.id));
                update((current) => ({
                  ...current,
                  users: current.users.map((user) =>
                    ids.has(user.id) ? { ...user, status: 'Suspended' } : user,
                  ),
                }));
                clear();
                notice(`${selected.length} users suspended.`);
              }}
            >
              Suspend
            </Button>
            <Button
              size="sm"
              emphasis="ghost"
              onClick={() => {
                exportUsers(selected);
                notice(`Exported ${selected.length} selected users.`);
              }}
            >
              Export selected
            </Button>
            <Button size="sm" emphasis="ghost" onClick={clear}>
              Clear selection
            </Button>
          </>
        )}
      />
      <p className="forma-muted">
        Select a row to explore user details. Use column menus to sort, pin or customize your view.
      </p>
      <SideSheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        title={detail?.name ?? 'User details'}
        description={detail?.email}
        size="md"
        footer={
          <>
            <Button
              intent="destroy"
              emphasis="ghost"
              leadingIcon={<Trash2 size={componentToken('application.icon-md')} />}
              onClick={() => setDeleteOpen(true)}
            >
              Delete user
            </Button>
            <Button emphasis="secondary" onClick={() => setDetailId(null)}>
              Done
            </Button>
          </>
        }
      >
        {detail && (
          <>
            <SideSheetSection>
              <div className="forma-inline">
                <Avatar name={detail.name} size="lg" />
                <div className="forma-cell-person">
                  <span className="forma-strong">{detail.company || 'Independent'}</span>
                  <span className="forma-muted">{detail.location || 'No location added'}</span>
                </div>
                <UserStatusTag status={detail.status} />
              </div>
            </SideSheetSection>
            <SideSheetSection title="Account details">
              <SideSheetField label="Joined">{dateLabel(detail.joined)}</SideSheetField>
              <SideSheetField label="Last active">
                {detail.lastActive ? dateLabel(detail.lastActive) : 'No activity recorded'}
              </SideSheetField>
              <SideSheetField label="User ID">{detail.id}</SideSheetField>
            </SideSheetSection>
            <SideSheetSection title="Workspace profile">
              <div className="forma-stack">
                <div className="forma-two-col">
                  <Field label="User role">
                    <Select
                      value={detail.role}
                      options={roleOptions}
                      onValueChange={(value) => changeUser(detail.id, { role: value as UserRole })}
                    />
                  </Field>
                  <Field label="User status">
                    <Select
                      value={detail.status}
                      options={statusOptions}
                      onValueChange={(value) =>
                        changeUser(detail.id, { status: value as UserStatus })
                      }
                    />
                  </Field>
                </div>
                <Field label="User plan">
                  <Select
                    value={detail.plan}
                    options={planOptions}
                    onValueChange={(value) =>
                      changeUser(detail.id, { plan: value as FormaUser['plan'] })
                    }
                  />
                </Field>
                <Field label="Internal notes" optional>
                  <Textarea
                    value={detail.notes}
                    onValueChange={(notes) => changeUser(detail.id, { notes })}
                    placeholder="Add useful context for your team…"
                    maxLength={2000}
                    showCount
                  />
                </Field>
                <p className="forma-muted">Profile changes save automatically in this browser.</p>
              </div>
            </SideSheetSection>
            <SideSheetSection title="Billing history">
              {relatedInvoices.length ? (
                <div className="forma-stack">
                  <SideSheetField label="Total paid">
                    {money(
                      relatedInvoices
                        .filter((invoice) => invoice.status === 'Paid')
                        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0),
                      state.settings.currency,
                    )}
                  </SideSheetField>
                  {relatedInvoices.map((invoice) => (
                    <div key={invoice.id} className="forma-inline">
                      <span className="forma-strong">{invoice.number}</span>
                      <span className="forma-muted">{invoice.status}</span>
                      <span>{money(invoiceTotal(invoice), state.settings.currency)}</span>
                    </div>
                  ))}
                  <Button emphasis="secondary" onClick={() => navigate('invoices')}>
                    Manage invoices
                  </Button>
                </div>
              ) : (
                <p className="forma-muted">No invoices for this user yet.</p>
              )}
            </SideSheetSection>
            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              onConfirm={deleteUser}
              title={`Delete ${detail.name}?`}
              description="This removes the user from this local workspace. Existing invoices retain their customer details. This action cannot be undone."
              confirmLabel="Delete user"
            />
          </>
        )}
      </SideSheet>
    </section>
  );
}
