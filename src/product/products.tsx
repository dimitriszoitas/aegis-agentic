import { FormaFilterToolbar } from './filter-toolbar';
import { PageHeader } from '@/patterns/page-header';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/card';
import { Field } from '@/components/field';
import { Download, Layers, Plus } from '@/components/icon';
import { Modal } from '@/components/modal';
import { SearchInput } from '@/components/search-input';
import { Select } from '@/components/select';
import { Tag } from '@/components/tag';
import { TextInput } from '@/components/text-input';
import { Textarea } from '@/components/textarea';
import { componentToken } from '@/lib/component-design-tokens';
import { downloadCsv, money, uid } from './model';
import type { FormaProduct, FormaStore } from './types';
import './commerce.css';

const categories = ['Subscription', 'Add-on', 'Service'] as const;
const statuses = ['Active', 'Draft', 'Archived'] as const;
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

export function ProductsPage({ state, update, notice }: FormaStore) {
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editing, setEditing] = useState<FormaProduct | 'new' | null>(null);
  const filtered = useMemo(
    () =>
      state.products.filter(
        (product) =>
          (!selectedStatuses.length || selectedStatuses.includes(product.status)) &&
          (!selectedCategories.length || selectedCategories.includes(product.category)) &&
          `${product.name} ${product.sku} ${product.description}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [state.products, query, selectedStatuses, selectedCategories],
  );

  function clearFilters() {
    setQuery('');
    setSelectedStatuses([]);
    setSelectedCategories([]);
  }

  function save(product: FormaProduct) {
    update((current) => ({
      ...current,
      products: current.products.some((item) => item.id === product.id)
        ? current.products.map((item) => (item.id === product.id ? product : item))
        : [...current.products, product],
    }));
    notice(`${product.name} ${editing === 'new' ? 'added to your catalog' : 'updated'}.`);
    setEditing(null);
  }

  function toggleArchive(product: FormaProduct) {
    const next = product.status === 'Archived' ? 'Active' : 'Archived';
    update((current) => ({
      ...current,
      products: current.products.map((item) =>
        item.id === product.id ? { ...item, status: next } : item,
      ),
    }));
    notice(
      `${product.name} ${next === 'Active' ? 'reactivated' : 'archived'}. Existing invoices are unchanged.`,
    );
  }

  return (
    <div className="forma-page">
      <PageHeader
        title="Products"
        description="Manage your catalogue, pricing, and availability."
        actions={
          <>
            <Button
              emphasis="secondary"
              leadingIcon={<Download size={componentToken('application.icon-sm')} />}
              onClick={() => {
                downloadCsv(
                  'forma-products.csv',
                  ['Name', 'SKU', 'Category', 'Status', `Price (${state.settings.currency})`],
                  filtered.map((product) => [
                    product.name,
                    product.sku,
                    product.category,
                    product.status,
                    product.price,
                  ]),
                );
                notice(`Exported ${filtered.length} products.`);
              }}
            >
              Export
            </Button>
            <Button
              intent="function"
              leadingIcon={<Plus size={componentToken('application.icon-sm')} />}
              onClick={() => setEditing('new')}
            >
              Add product
            </Button>
          </>
        }
      />
      <FormaFilterToolbar
        label="Filter products"
        noun="product"
        resultCount={filtered.length}
        query={query}
        onClearQuery={() => setQuery('')}
        onClearAll={clearFilters}
        facets={[
          {
            id: 'category',
            label: 'Category',
            options: options(categories),
            values: selectedCategories,
            onValueChange: setSelectedCategories,
          },
          {
            id: 'status',
            label: 'Status',
            options: options(statuses),
            values: selectedStatuses,
            onValueChange: setSelectedStatuses,
          },
        ]}
        search={
          <SearchInput
            aria-label="Search products"
            placeholder="Search products or SKU…"
            value={query}
            onValueChange={setQuery}
          />
        }
      >
        {filtered.length ? (
          <div className="forma-product-grid">
            {filtered.map((product) => (
              <Card key={product.id} className="forma-product-card" elevation="raised">
                <CardHeader>
                  <div className="forma-product-top">
                    <span className="forma-product-symbol" data-category={product.category}>
                      <Layers
                        size={componentToken('application.icon-navigation')}
                        aria-hidden="true"
                      />
                    </span>
                    <Tag
                      variant="status"
                      intent={
                        product.status === 'Active'
                          ? 'success'
                          : product.status === 'Draft'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {product.status}
                    </Tag>
                  </div>
                  <span className="forma-product-category">{product.category}</span>
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description || 'No description yet.'}</CardDescription>
                </CardHeader>
                <CardContent className="forma-product-price-block">
                  <span className="forma-product-price">
                    {money(product.price, state.settings.currency)}
                  </span>
                  <span className="forma-muted">
                    {product.category === 'Subscription'
                      ? 'per month'
                      : product.category === 'Service'
                        ? 'per engagement'
                        : 'per unit'}
                  </span>
                  <span className="forma-product-sku">{product.sku}</span>
                </CardContent>
                <CardFooter>
                  <Button
                    size="sm"
                    emphasis="tertiary"
                    onClick={() => toggleArchive(product)}
                    aria-label={`${product.status === 'Archived' ? 'Reactivate' : 'Archive'} ${product.name}`}
                  >
                    {product.status === 'Archived' ? 'Reactivate' : 'Archive'}
                  </Button>
                  <Button
                    size="sm"
                    emphasis="secondary"
                    onClick={() => setEditing(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    Edit product
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="forma-empty">
            <Layers size={componentToken('application.icon-navigation')} aria-hidden="true" />
            <h2>No products found</h2>
            <p>Try a different search or add your first product.</p>
            <Button emphasis="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </FormaFilterToolbar>
      {editing && (
        <ProductEditor
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? undefined : editing}
          products={state.products}
          currency={state.settings.currency}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  products,
  currency,
  onClose,
  onSave,
}: {
  product?: FormaProduct;
  products: FormaProduct[];
  currency: string;
  onClose: () => void;
  onSave: (product: FormaProduct) => void;
}) {
  const formId = useId();
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [category, setCategory] = useState<FormaProduct['category']>(
    product?.category ?? 'Subscription',
  );
  const [status, setStatus] = useState<FormaProduct['status']>(product?.status ?? 'Active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter a product name.';
    if (!sku.trim()) next.sku = 'Enter a SKU.';
    else if (
      products.some(
        (item) => item.id !== product?.id && item.sku.toLowerCase() === sku.trim().toLowerCase(),
      )
    )
      next.sku = 'This SKU is already used by another product.';
    if (
      !price.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      Number(price) > 1_000_000
    )
      next.price = 'Enter a price between 0 and 1,000,000.';
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document
          .getElementById(formId)
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    onSave({
      id: product?.id ?? uid('product'),
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      description: description.trim(),
      price: Math.round(Number(price) * 100) / 100,
      category,
      status,
    });
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={product ? 'Edit product' : 'Add product'}
      description="Build your catalog. Prices are stored in your workspace currency."
      footer={
        <>
          <Button emphasis="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="function" type="submit" form={formId}>
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="forma-stack">
        <Field label="Product name" required error={errors.name}>
          <TextInput
            value={name}
            onValueChange={setName}
            maxLength={100}
            autoComplete="off"
            placeholder="e.g. Enterprise workspace"
          />
        </Field>
        <div className="forma-two-col">
          <Field label="SKU" required error={errors.sku}>
            <TextInput
              value={sku}
              onValueChange={setSku}
              maxLength={40}
              autoComplete="off"
              placeholder="FORMA-ENT"
            />
          </Field>
          <Field label={`Price (${currency})`} required error={errors.price}>
            <TextInput
              type="number"
              value={price}
              onValueChange={setPrice}
              min="0"
              max="1000000"
              step="0.01"
              placeholder="0.00"
            />
          </Field>
        </div>
        <Field label="Description" optional>
          <Textarea
            value={description}
            onValueChange={setDescription}
            maxLength={300}
            placeholder="What makes this product useful?"
          />
        </Field>
        <div className="forma-two-col">
          <Field label="Category">
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as FormaProduct['category'])}
              options={options(categories)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as FormaProduct['status'])}
              options={options(statuses)}
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
