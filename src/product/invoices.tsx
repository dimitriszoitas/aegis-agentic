import { FormaFilterToolbar } from './filter-toolbar';
import { PageHeader } from '@/patterns/page-header';
import { useId, useMemo, useState, type FormEvent } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/button';
import { DataGrid } from '@/components/data-grid';
import { Field } from '@/components/field';
import { Check, Download, Plus } from '@/components/icon';
import { Modal } from '@/components/modal';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { SideSheet } from '@/components/side-sheet';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { componentToken } from '@/lib/component-design-tokens';
import { dateLabel, downloadCsv, invoiceTotal, money, today, uid } from './model';
import type { FormaInvoice, FormaState, FormaStore } from './types';
import './commerce.css';

const statuses = ['Paid', 'Pending', 'Overdue', 'Draft'] as const;
function InvoiceStatus({ status }: { status: FormaInvoice['status'] }) {
  return (
    <Tag
      variant="status"
      intent={
        status === 'Paid'
          ? 'success'
          : status === 'Overdue'
            ? 'destroy'
            : status === 'Pending'
              ? 'warning'
              : 'default'
      }
    >
      {status}
    </Tag>
  );
}

export function InvoicesPage({ state, update, notice, navigate }: FormaStore) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const selected = state.invoices.find((invoice) => invoice.id === selectedId);
  const filtered = useMemo(
    () =>
      state.invoices.filter(
        (invoice) =>
          (status === 'all' || invoice.status === status) &&
          `${invoice.number} ${invoice.customer} ${invoice.email}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [state.invoices, query, status],
  );
  const currency = state.settings.currency;
  const columns = useMemo<ColumnDef<FormaInvoice>[]>(
    () => [
      {
        accessorKey: 'number',
        header: 'Invoice',
        cell: ({ row }) => <span className="forma-strong">{row.original.number}</span>,
      },
      {
        accessorKey: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="forma-cell-person">
            <span>{row.original.customer}</span>
            <span className="forma-muted">{row.original.email}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <InvoiceStatus status={row.original.status} />,
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorFn: invoiceTotal,
        cell: ({ row }) => (
          <span className="forma-strong">{money(invoiceTotal(row.original), currency)}</span>
        ),
      },
      {
        accessorKey: 'issued',
        header: 'Issued',
        cell: ({ row }) => dateLabel(row.original.issued),
      },
      { accessorKey: 'due', header: 'Due date', cell: ({ row }) => dateLabel(row.original.due) },
    ],
    [currency],
  );
  const paid = state.invoices
    .filter((invoice) => invoice.status === 'Paid')
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const outstanding = state.invoices
    .filter((invoice) => invoice.status === 'Pending' || invoice.status === 'Overdue')
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const overdue = state.invoices
    .filter((invoice) => invoice.status === 'Overdue')
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  function exportInvoices(invoices: FormaInvoice[]) {
    downloadCsv(
      'forma-invoices.csv',
      ['Invoice', 'Customer', 'Email', 'Status', 'Issued', 'Due', `Amount (${currency})`],
      invoices.map((invoice) => [
        invoice.number,
        invoice.customer,
        invoice.email,
        invoice.status,
        invoice.issued,
        invoice.due,
        invoiceTotal(invoice),
      ]),
    );
    notice(`Exported ${invoices.length} invoices.`);
  }
  function markPaid(invoice: FormaInvoice) {
    update((current) => ({
      ...current,
      invoices: current.invoices.map((item) =>
        item.id === invoice.id ? { ...item, status: 'Paid' } : item,
      ),
    }));
    notice(`${invoice.number} marked as paid in this workspace. No payment was processed.`);
  }
  return (
    <div className="forma-page">
      <PageHeader
        title="Invoices"
        description="Track your invoices, payments, and outstanding balances."
        actions={
          <>
            <Button
              emphasis="secondary"
              leadingIcon={<Download size={componentToken('application.icon-sm')} />}
              onClick={() => exportInvoices(filtered)}
            >
              Export
            </Button>
            <Button
              intent="function"
              leadingIcon={<Plus size={componentToken('application.icon-sm')} />}
              onClick={() => setCreating(true)}
            >
              Create invoice
            </Button>
          </>
        }
      />
      <div className="forma-summary-grid">
        <div className="forma-summary">
          <span>Collected</span>
          <strong>{money(paid, currency)}</strong>
          <span className="forma-muted">All paid invoices</span>
        </div>
        <div className="forma-summary">
          <span>Outstanding</span>
          <strong>{money(outstanding, currency)}</strong>
          <span className="forma-muted">Pending and overdue</span>
        </div>
        <div className="forma-summary">
          <span>Overdue</span>
          <strong>{money(overdue, currency)}</strong>
          <span className="forma-muted">Needs your attention</span>
        </div>
      </div>
      <FormaFilterToolbar
        label="Filter invoices"
        search={
          <SearchInput
            aria-label="Search invoices"
            placeholder="Search invoice or customer…"
            value={query}
            onValueChange={setQuery}
          />
        }
      >
        <Select
          aria-label="Invoice status"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'all', label: 'All statuses' },
            ...statuses.map((value) => ({ value, label: value })),
          ]}
        />
        {(query || status !== 'all') && (
          <Button
            emphasis="tertiary"
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </FormaFilterToolbar>
      <DataGrid
        data={filtered}
        columns={columns}
        getRowId={(invoice) => invoice.id}
        label="Invoices"
        noun="invoices"
        rowLabel={(invoice) => `${invoice.number}, ${invoice.customer}`}
        onRowClick={(invoice) => setSelectedId(invoice.id)}
        density={state.settings.density}
        onDensityChange={(density) =>
          update((current) => ({ ...current, settings: { ...current.settings, density } }))
        }
        pagination
        pageSize={10}
        initialSorting={[{ id: 'issued', desc: true }]}
        emptyTitle="No invoices found"
        emptyDescription="Try another search or create an invoice."
        renderBulkActions={(invoices, clear) => (
          <>
            <span>{invoices.length} selected</span>
            <Button size="sm" emphasis="secondary" onClick={() => exportInvoices(invoices)}>
              Export selected
            </Button>
            <Button
              size="sm"
              intent="function"
              disabled={invoices.every((invoice) => invoice.status === 'Paid')}
              onClick={() => {
                const ids = new Set(invoices.map((invoice) => invoice.id));
                const count = invoices.filter((invoice) => invoice.status !== 'Paid').length;
                update((current) => ({
                  ...current,
                  invoices: current.invoices.map((invoice) =>
                    ids.has(invoice.id) ? { ...invoice, status: 'Paid' } : invoice,
                  ),
                }));
                clear();
                notice(`${count} invoices marked as paid locally. No payments were processed.`);
              }}
            >
              Mark selected paid
            </Button>
            <Button size="sm" emphasis="ghost" onClick={clear}>
              Clear selection
            </Button>
          </>
        )}
      />
      <SideSheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        title={selected?.number ?? 'Invoice details'}
        description={selected ? `Invoice for ${selected.customer}` : undefined}
        size="md"
        resizable
        footer={
          selected ? (
            <>
              <Button
                emphasis="secondary"
                leadingIcon={<Download size={componentToken('application.icon-sm')} />}
                onClick={() => exportInvoices([selected])}
              >
                Export invoice
              </Button>
              {selected.status !== 'Paid' && (
                <Button
                  intent="function"
                  leadingIcon={<Check size={componentToken('application.icon-sm')} />}
                  onClick={() => markPaid(selected)}
                >
                  Mark as paid
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="forma-stack">
            <section className="forma-panel-section">
              <div className="forma-inline">
                <h2>{selected.customer}</h2>
                <InvoiceStatus status={selected.status} />
              </div>
              <p className="forma-muted">{selected.email}</p>
            </section>
            <dl className="forma-definition">
              <div>
                <dt>Invoice number</dt>
                <dd>{selected.number}</dd>
              </div>
              <div>
                <dt>Issued</dt>
                <dd>{dateLabel(selected.issued)}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{dateLabel(selected.due)}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>{currency}</dd>
              </div>
            </dl>
            <section className="forma-panel-section">
              <h2>Line items</h2>
              <table className="forma-invoice-lines">
                <caption className="sr-only">Items for {selected.number}</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line, index) => (
                    <tr key={`${line.productId}-${index}`}>
                      <td>
                        {line.description}
                        <div className="forma-muted">{money(line.price, currency)} each</div>
                      </td>
                      <td>{line.quantity}</td>
                      <td>{money(line.price * line.quantity, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="forma-invoice-total">
                <span>Total</span>
                <strong>{money(invoiceTotal(selected), currency)}</strong>
              </div>
              <p className="forma-invoice-note">
                Customer and product details are saved with this invoice. Later catalog edits do not
                change its line items. Taxes are not included.
              </p>
            </section>
            <p className="forma-invoice-note">
              Local billing record. Marking an invoice paid records its status; it does not charge a
              customer or send an email.
            </p>
          </div>
        )}
      </SideSheet>
      {creating && (
        <InvoiceEditor
          state={state}
          onClose={() => setCreating(false)}
          onNavigate={(page) => {
            setCreating(false);
            navigate(page);
          }}
          onSave={(invoice) => {
            update((current) => ({ ...current, invoices: [invoice, ...current.invoices] }));
            setCreating(false);
            setSelectedId(invoice.id);
            notice(`${invoice.number} created locally. No email was sent.`);
          }}
        />
      )}
    </div>
  );
}

function InvoiceEditor({
  state,
  onClose,
  onSave,
  onNavigate,
}: {
  state: FormaState;
  onClose: () => void;
  onSave: (invoice: FormaInvoice) => void;
  onNavigate: FormaStore['navigate'];
}) {
  const formId = useId();
  const [userId, setUserId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [due, setDue] = useState(() => {
    const date = new Date(`${today()}T12:00:00`);
    date.setDate(date.getDate() + 30);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const products = state.products.filter((product) => product.status === 'Active');
  const users = state.users.filter((user) => user.status !== 'Suspended');
  const product = products.find((item) => item.id === productId);
  const canCreate = users.length > 0 && products.length > 0;
  const numericQuantity = Number(quantity);
  const estimated =
    product && Number.isInteger(numericQuantity) && numericQuantity > 0
      ? product.price * numericQuantity
      : 0;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const user = users.find((item) => item.id === userId);
    if (!user) errors.userId = 'Choose a customer.';
    if (!product) errors.productId = 'Choose an active product.';
    if (!Number.isInteger(numericQuantity) || numericQuantity < 1 || numericQuantity > 10_000)
      errors.quantity = 'Enter a whole quantity from 1 to 10,000.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !Number.isFinite(Date.parse(due)) || due < today())
      errors.due = 'Choose today or a future due date.';
    setErrors(errors);
    if (Object.keys(errors).length || !user || !product) {
      requestAnimationFrame(() =>
        document
          .getElementById(formId)
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    const nextNumber =
      state.invoices.reduce(
        (max, invoice) => Math.max(max, Number(invoice.number.match(/\d+$/)?.[0]) || 0),
        1000,
      ) + 1;
    onSave({
      id: uid('invoice'),
      number: `INV-${String(nextNumber).padStart(4, '0')}`,
      userId: user.id,
      customer: user.name,
      email: user.email,
      issued: today(),
      due,
      status: 'Pending',
      lines: [
        {
          productId: product.id,
          description: product.name,
          quantity: numericQuantity,
          price: product.price,
        },
      ],
    });
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Create invoice"
      description="Create a billing record using your users and product catalog."
      footer={
        <>
          <Button emphasis="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="function" type="submit" form={formId} disabled={!canCreate}>
            Create invoice
          </Button>
        </>
      }
    >
      {!canCreate ? (
        <div className="forma-empty">
          <h2>{!users.length ? 'Add a customer first' : 'Add an active product first'}</h2>
          <p>An invoice needs a customer and at least one active product.</p>
          <Button onClick={() => onNavigate(!users.length ? 'users' : 'products')}>
            {!users.length ? 'Go to users' : 'Go to products'}
          </Button>
        </div>
      ) : (
        <form id={formId} onSubmit={submit} noValidate className="forma-stack">
          <Field label="Customer" required error={errors.userId}>
            <Select
              value={userId}
              onValueChange={setUserId}
              placeholder="Choose a customer"
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
                description: user.email,
              }))}
            />
          </Field>
          <Field label="Product" required error={errors.productId}>
            <Select
              value={productId}
              onValueChange={setProductId}
              placeholder="Choose an active product"
              options={products.map((product) => ({
                value: product.id,
                label: product.name,
                description: money(product.price, state.settings.currency),
              }))}
            />
          </Field>
          <div className="forma-two-col">
            <Field label="Quantity" required error={errors.quantity}>
              <TextInput
                type="number"
                value={quantity}
                onValueChange={setQuantity}
                min="1"
                max="10000"
                step="1"
              />
            </Field>
            <Field label="Due date" required error={errors.due}>
              <TextInput type="date" value={due} onValueChange={setDue} min={today()} />
            </Field>
          </div>
          <div className="forma-invoice-total">
            <span>Invoice total</span>
            <strong>{money(estimated, state.settings.currency)}</strong>
          </div>
          <p className="forma-invoice-note">
            No tax or payment processing. Customer details and the current product price will be
            saved with this invoice.
          </p>
        </form>
      )}
    </Modal>
  );
}
