import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { Select } from '@/components/select';
import { Tag } from '@/components/tag';
import { validateCompositionSpec, type CompositionSpec } from '../composition';
import './FilteredDataset.css';

export interface FilteredDatasetRecord {
  id: string;
  name: string;
  domain: string;
  owner: string;
  status: 'Active' | 'Trial' | 'Paused';
  plan: string;
  seats: number;
}
export interface FilteredDatasetProps {
  spec: CompositionSpec;
  records: readonly FilteredDatasetRecord[];
  description?: ReactNode;
  sourceLabel?: string;
}

/** Executable renderer for the finite dataset-filtering contract. Records stay host-owned. */
export function FilteredDataset({ spec, records, description, sourceLabel }: FilteredDatasetProps) {
  const headingId = useId();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [applied, setApplied] = useState({ query: '', status: 'all' });
  const validation = validateCompositionSpec(spec);
  if (!validation.valid)
    return (
      <div role="alert">
        Invalid dataset specification: {validation.issues.map((issue) => issue.message).join(' ')}
      </div>
    );
  const queryControl = spec.filters.controls.find((control) => control.id === 'query');
  const statusControl = spec.filters.controls.find((control) => control.id === 'status');
  const options = statusControl?.options ?? [];
  const defaultStatus = options.some((option) => option.value === 'all')
    ? 'all'
    : (options[0]?.value ?? 'all');
  const validStatus = (value: string) =>
    options.some((option) => option.value === value) ? value : defaultStatus;
  const deferred = spec.filters.application === 'explicit';
  const pending = {
    query: queryControl ? query : '',
    status: statusControl ? validStatus(status) : 'all',
  };
  const active = deferred
    ? {
        query: queryControl ? applied.query : '',
        status: statusControl ? validStatus(applied.status) : 'all',
      }
    : pending;
  const rows = records.filter(
    (record) =>
      `${record.name} ${record.domain} ${record.owner}`
        .toLocaleLowerCase()
        .includes(active.query.toLocaleLowerCase()) &&
      (active.status === 'all' || record.status === active.status),
  );
  const dirty = pending.query !== active.query || pending.status !== active.status;
  function reset() {
    setQuery('');
    setStatus(defaultStatus);
    setApplied({ query: '', status: defaultStatus });
  }
  return (
    <section
      className="agentic-filtered-dataset"
      data-theme={spec.mode}
      data-layout-theme={spec.presentation}
      aria-labelledby={headingId}
      data-testid="filtered-dataset"
    >
      <header className="afd-heading">
        <div>
          <span className="afd-eyebrow">CUSTOMER OPERATIONS</span>
          <h2 id={headingId}>{spec.content.title}</h2>
          {description && <p>{description}</p>}
        </div>
        <Tag>{records.length} customers</Tag>
      </header>
      <div className="afd-filters">
        {queryControl && (
          <TextInput
            label={queryControl.label}
            placeholder={`${queryControl.label}…`}
            value={query}
            onValueChange={setQuery}
            clearable
          />
        )}
        {statusControl && (
          <Select
            label={statusControl.label}
            value={validStatus(status)}
            onValueChange={setStatus}
            options={options}
          />
        )}
        {deferred && (
          <Button intent="function" onClick={() => setApplied(pending)}>
            Apply filters
          </Button>
        )}
        <Button emphasis="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
      <div className="afd-results" role="status">
        {rows.length} of {records.length} customers{' '}
        {deferred && dirty && <Tag intent="warning">Unapplied changes</Tag>}
      </div>
      <div className="afd-scroll" tabIndex={0} role="region" aria-label="Customer results table">
        <table className="afd-table" data-density={spec.density}>
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col">Plan</th>
              <th scope="col">Seats</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((record) => (
              <tr key={record.id}>
                <td>
                  <span className="afd-company">
                    <span className="afd-avatar" aria-hidden="true">
                      {record.name.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{record.name}</strong>
                      <small>{record.domain}</small>
                    </span>
                  </span>
                </td>
                <td>{record.owner}</td>
                <td>
                  <Tag
                    intent={
                      record.status === 'Active'
                        ? 'success'
                        : record.status === 'Trial'
                          ? 'function'
                          : 'warning'
                    }
                  >
                    {record.status}
                  </Tag>
                </td>
                <td>{record.plan}</td>
                <td>{record.seats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="afd-empty">
          <h3>{spec.content.emptyMessage}</h3>
          <p>Try a different search or reset the filters.</p>
          <Button emphasis="secondary" onClick={reset}>
            Clear filters
          </Button>
        </div>
      )}
      {sourceLabel && <p className="afd-source">{sourceLabel}</p>}
    </section>
  );
}
