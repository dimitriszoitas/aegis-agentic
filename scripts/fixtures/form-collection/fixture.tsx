import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/package/reset.css';
import '@/package/styles.css';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Select } from '@/components/select';
import { Switch } from '@/components/switch';
import { TextInput } from '@/components/text-input';
import { FormSection } from '@/patterns/form-section';
import { CollectionToolbar } from '@/patterns/collection-toolbar';
import './fixture.css';

function Fixture() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [disabled, setDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Alex');
  const [saved, setSaved] = useState('Nothing saved.');
  const records = [
    { id: '1', title: 'Invoice correction', status: 'open' },
    { id: '2', title: 'Workspace access', status: 'open' },
    { id: '3', title: 'Invoice export', status: 'closed' },
  ];
  const matches = records.filter(
    (record) =>
      record.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === 'all' || status === record.status),
  );
  return (
    <main className="collection-pattern-fixture">
      <h1>Local pattern fixture</h1>
      <Switch label="Disable controls" checked={disabled} onCheckedChange={setDisabled} />
      <Switch label="Results busy" checked={busy} onCheckedChange={setBusy} />
      <CollectionToolbar
        label="Request controls"
        searchLabel="Search requests"
        query={query}
        onQueryChange={setQuery}
        resultCount={matches.length}
        busy={busy}
        disabled={disabled}
        resultsId="local-results"
        filters={({ disabled }) => (
          <Select
            aria-label="Request status"
            value={status}
            onValueChange={setStatus}
            disabled={disabled}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        )}
        actions={({ disabled }) => (
          <Button
            emphasis="secondary"
            disabled={disabled}
            onClick={() => {
              setQuery('');
              setStatus('all');
            }}
          >
            Clear criteria
          </Button>
        )}
      />
      <ul id="local-results" aria-label="Local requests">
        {matches.map((record) => (
          <li key={record.id}>{record.title}</li>
        ))}
      </ul>
      <form
        aria-label="Contact form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSaved(`Saved locally: ${data.get('name')} · ${data.get('email')}`);
        }}
      >
        <FormSection
          legend="Contact details"
          description="These are local editable fields, with no remote save."
          maxColumns={2}
          disabled={disabled}
          actions={
            <>
              <Button type="submit">Save contact</Button>
              <Button type="button" emphasis="secondary" onClick={() => setName('Alex')}>
                Reset name
              </Button>
            </>
          }
        >
          <Field label="Name" required>
            <TextInput name="name" value={name} onValueChange={setName} required />
          </Field>
          <Field label="Email" required>
            <TextInput name="email" type="email" defaultValue="alex@example.com" required />
          </Field>
        </FormSection>
      </form>
      <p role="status" aria-label="Save result">
        {saved}
      </p>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
