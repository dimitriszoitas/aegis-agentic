import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { PageHeader } from '@dimitriszoitas/aegis-agentic/patterns/page-header';
import { DataGrid, type DataGridProps } from '@dimitriszoitas/aegis-agentic/data-grid';
import { Button } from '@dimitriszoitas/aegis-agentic/button';
import { Tag } from '@dimitriszoitas/aegis-agentic/tag';
import { Avatar } from '@dimitriszoitas/aegis-agentic/avatar';
import { SideSheet } from '@dimitriszoitas/aegis-agentic/side-sheet';
import { Modal } from '@dimitriszoitas/aegis-agentic/modal';
import { Field } from '@dimitriszoitas/aegis-agentic/field';
import { TextInput } from '@dimitriszoitas/aegis-agentic/text-input';
import { Textarea } from '@dimitriszoitas/aegis-agentic/textarea';
import { Select } from '@dimitriszoitas/aegis-agentic/select';
import { DescriptionList } from '@dimitriszoitas/aegis-agentic/description-list';
import { TokenInput } from '@dimitriszoitas/aegis-agentic/agentic';
import { RelayCollectionCount, RelayFilters, RequestStatusTag } from './patterns';
import {
  type RequestsPageProps,
  type RelayRequest,
  type NewRequestInput,
  type RequestPatch,
  requestStatusOptions,
  requestStatusLabels,
  priorityLabels,
  labelSuggestions,
  formatDate,
} from './model';

type RequestDraft = Required<Pick<NewRequestInput, 'title' | 'customerId' | 'priority' | 'description'>>;
type DraftErrors = Partial<Record<'title' | 'customerId', string>>;

const priorityOptions = Object.entries(priorityLabels).map(([value, label]) => ({ value, label }));
const editableStatusOptions = requestStatusOptions.filter((option) => option.value !== 'all');

function emptyDraft(): RequestDraft {
  return { title: '', customerId: '', priority: 'normal', description: '' };
}

export function RequestsPage({
  requests,
  customers,
  onCreateRequest,
  onUpdateRequest,
}: RequestsPageProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<RequestDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const titleInput = useRef<HTMLInputElement>(null);
  const formId = useId();
  const customerControlId = `${formId}-customer`;
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers],
  );
  const customerOptions = useMemo(
    () => customers.map((customer) => ({
      value: customer.id,
      label: `${customer.name} · ${customer.company}`,
      description: customer.email,
    })),
    [customers],
  );
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return requests.filter((request) => {
      if (status !== 'all' && request.status !== status) return false;
      if (!search) return true;
      const customer = customersById.get(request.customerId);
      return [
        request.id,
        request.title,
        request.description,
        requestStatusLabels[request.status],
        priorityLabels[request.priority],
        ...request.labels,
        customer?.name ?? '',
        customer?.company ?? '',
        customer?.email ?? '',
      ].join(' ').toLocaleLowerCase().includes(search);
    });
  }, [requests, query, status, customersById]);

  const selected = requests.find((request) => request.id === selectedId);
  const selectedCustomer = selected ? customersById.get(selected.customerId) : undefined;
  const columns: DataGridProps<RelayRequest>['columns'] = useMemo(() => [
    {
      accessorKey: 'title',
      header: 'Request',
      cell: ({ row }) => (
        <div>
          <strong className="relay-cell-main relay-cell-truncate" title={row.original.title}>
            {row.original.title}
          </strong>
          <span className="relay-cell-secondary">{row.original.id}</span>
        </div>
      ),
      meta: { getText: (request) => `${request.title} ${request.id}` },
    },
    {
      id: 'customer',
      header: 'Customer',
      accessorFn: (request) => customersById.get(request.customerId)?.name ?? 'Unknown customer',
      cell: ({ row }) => {
        const customer = customersById.get(row.original.customerId);
        return customer ? (
          <div className="relay-person-cell">
            <Avatar name={customer.name} size="sm" />
            <div>
              <span className="relay-cell-main">{customer.name}</span>
              <span className="relay-cell-secondary">{customer.company}</span>
            </div>
          </div>
        ) : <span className="relay-cell-secondary">Unknown customer</span>;
      },
      meta: {
        getText: (request) => {
          const customer = customersById.get(request.customerId);
          return customer ? `${customer.name} ${customer.company}` : 'Unknown customer';
        },
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <RequestStatusTag status={row.original.status} />,
      meta: { getText: (request) => requestStatusLabels[request.status] },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => <span>{priorityLabels[row.original.priority]}</span>,
      sortingFn: (a, b) =>
        priorityOptions.findIndex((option) => option.value === a.original.priority) -
        priorityOptions.findIndex((option) => option.value === b.original.priority),
      meta: { getText: (request) => priorityLabels[request.priority] },
    },
    {
      accessorKey: 'labels',
      header: 'Labels',
      cell: ({ row }) => row.original.labels.length ? (
        <div className="relay-inline-tags">
          {row.original.labels.map((label) => <Tag key={label} size="sm">{label}</Tag>)}
        </div>
      ) : <span className="relay-cell-secondary">No labels</span>,
      meta: { getText: (request) => request.labels.join(', ') || 'No labels' },
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => (
        <time className="relay-cell-secondary" dateTime={row.original.updatedAt}>
          {formatDate(row.original.updatedAt)}
        </time>
      ),
      meta: { getText: (request) => formatDate(request.updatedAt) },
    },
  ], [customersById]);

  function closeCreate() {
    setCreateOpen(false);
    setDraft(emptyDraft());
    setErrors({});
  }

  function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: DraftErrors = {};
    if (!draft.title.trim()) nextErrors.title = 'Enter a request title.';
    if (!customersById.has(draft.customerId)) {
      nextErrors.customerId = customers.length
        ? 'Choose an existing customer.'
        : 'A customer must be available before you can create a request.';
    }
    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.customerId) {
      requestAnimationFrame(() => {
        if (nextErrors.title) titleInput.current?.focus();
        else document.getElementById(customerControlId)?.focus();
      });
      return;
    }
    const input: NewRequestInput = {
      title: draft.title.trim(),
      customerId: draft.customerId,
      priority: draft.priority,
      description: draft.description.trim(),
    };
    onCreateRequest(input);
    closeCreate();
  }

  function updateSelected(patch: RequestPatch) {
    if (selected) onUpdateRequest(selected.id, patch);
  }

  return (
    <section className="relay-page" aria-labelledby="requests-heading">
      <PageHeader
        headingId="requests-heading"
        title="Requests"
        description="Keep every customer conversation moving forward."
        metadata={<RelayCollectionCount count={requests.length} noun="requests" />}
        actions={<Button onClick={() => setCreateOpen(true)}>New request</Button>}
      />
      <div className="relay-collection">
        <RelayFilters
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          statusOptions={requestStatusOptions}
          resultCount={visible.length}
          noun="requests"
          searchPlaceholder="Search requests, customers, or labels…"
        />
        <DataGrid<RelayRequest>
          data={visible}
          columns={columns}
          getRowId={(request) => request.id}
          label="Requests"
          noun="requests"
          rowLabel={(request) => `${request.id}: ${request.title}`}
          density="default"
          enableSelection={false}
          pagination
          pageSize={10}
          onRowClick={(request) => setSelectedId(request.id)}
          emptyTitle={requests.length ? 'No requests found' : 'No requests yet'}
          emptyDescription={requests.length
            ? 'Try another search or clear the filters to see more requests.'
            : 'Create a request to start tracking a customer conversation.'}
        />
      </div>
      <SideSheet
        open={Boolean(selected)}
        onOpenChange={(open) => { if (!open) setSelectedId(null); }}
        title={selected?.title ?? 'Request details'}
        description={selected?.id}
        size="md"
        footer={<Button emphasis="secondary" onClick={() => setSelectedId(null)}>Done</Button>}
      >
        {selected && (
          <div className="relay-detail">
            <div className="relay-detail-identity">
              {selectedCustomer && <Avatar name={selectedCustomer.name} size="lg" />}
              <div>
                <strong>{selectedCustomer?.name ?? 'Unknown customer'}</strong>
                <span className="relay-cell-secondary">{selectedCustomer?.company ?? selected.customerId}</span>
                {selectedCustomer && <span className="relay-cell-secondary">{selectedCustomer.email}</span>}
              </div>
              <RequestStatusTag status={selected.status} />
            </div>
            <div className="relay-form-grid">
              <Field label="Status">
                <Select
                  value={selected.status}
                  options={editableStatusOptions}
                  onValueChange={(value) => updateSelected({ status: value as RelayRequest['status'] })}
                />
              </Field>
              <Field label="Priority">
                <Select
                  value={selected.priority}
                  options={priorityOptions}
                  onValueChange={(value) => updateSelected({ priority: value as RelayRequest['priority'] })}
                />
              </Field>
            </div>
            <div className="relay-field-stack">
              <h2 className="relay-section-title">Description</h2>
              <p className="relay-detail-copy">{selected.description || 'No description provided.'}</p>
            </div>
            <TokenInput
              key={selected.id}
              label="Labels"
              values={selected.labels}
              onValuesChange={(labels, request) => {
                if (request.signal.aborted) return false;
                updateSelected({ labels });
              }}
              suggestions={labelSuggestions}
              duplicatePolicy="reject"
              placeholder="Add a label…"
            />
            <DescriptionList
              columns={2}
              items={[
                { id: 'created', label: 'Created', value: formatDate(selected.createdAt) },
                { id: 'updated', label: 'Updated', value: formatDate(selected.updatedAt) },
              ]}
            />
            <p className="relay-local-note">Changes are saved in this local demo. No customer is contacted.</p>
          </div>
        )}
      </SideSheet>
      <Modal
        open={createOpen}
        onOpenChange={(open) => { if (!open) closeCreate(); }}
        title="New request"
        description="Start a conversation for an existing customer."
        size="regular"
        closeOnOutsideClick={false}
        footer={
          <>
            <Button emphasis="secondary" onClick={closeCreate}>Cancel</Button>
            <Button type="submit" form={formId}>Create request</Button>
          </>
        }
      >
        <form id={formId} className="relay-form" onSubmit={createRequest} noValidate>
          <Field label="Title" required error={errors.title}>
            <TextInput
              ref={titleInput}
              name="title"
              value={draft.title}
              placeholder="What does the customer need help with?"
              onValueChange={(title) => {
                setDraft((current) => ({ ...current, title }));
                setErrors((current) => ({ ...current, title: undefined }));
              }}
            />
          </Field>
          <Field id={customerControlId} label="Customer" required error={errors.customerId}>
            <Select
              id={customerControlId}
              name="customerId"
              value={draft.customerId}
              options={customerOptions}
              placeholder="Choose a customer"
              onValueChange={(customerId) => {
                setDraft((current) => ({ ...current, customerId }));
                setErrors((current) => ({ ...current, customerId: undefined }));
              }}
            />
          </Field>
          <Field label="Priority">
            <Select
              name="priority"
              value={draft.priority}
              options={priorityOptions}
              onValueChange={(priority) => setDraft((current) => ({
                ...current,
                priority: priority as RelayRequest['priority'],
              }))}
            />
          </Field>
          <Field label="Description" optional>
            <Textarea
              name="description"
              value={draft.description}
              placeholder="Add context that will help the team respond."
              onValueChange={(description) => setDraft((current) => ({ ...current, description }))}
            />
          </Field>
          <p className="relay-local-note">New requests start Open. Creating a request only changes this local demo.</p>
        </form>
      </Modal>
    </section>
  );
}
