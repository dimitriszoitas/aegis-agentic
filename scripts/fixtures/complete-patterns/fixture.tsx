import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/package/reset.css';
import '@/package/styles.css';
import { AppShell } from '@/patterns/app-shell';
import { FormErrorSummary, type FormErrorSummaryItem } from '@/patterns/form-error-summary';
import { ResourceState } from '@/patterns/resource-state';
import { RecordEditor } from '@/patterns/record-editor';
import { UnsavedNavigationGuard } from '@/patterns/unsaved-navigation-guard';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { Field } from '@/components/field';
import { Checkbox } from '@/components/checkbox';
import './fixture.css';
function SummaryExample() {
  const [errors, setErrors] = useState<FormErrorSummaryItem[]>([]);
  const [attempt, setAttempt] = useState(0);
  return (
    <form
      noValidate
      className="pattern-fixture-section"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setErrors(
          String(data.get('email') ?? '').includes('@')
            ? []
            : [{ id: 'email', fieldId: 'fixture-email', message: 'Enter a valid email.' }],
        );
        setAttempt((x) => x + 1);
      }}
    >
      <h2>Form errors</h2>
      <FormErrorSummary errors={errors} focusRequestKey={attempt} />
      <Field id="fixture-email" label="Email">
        <TextInput name="email" />
      </Field>
      <Button type="submit">Validate locally</Button>
    </form>
  );
}
function ResourceExample() {
  const [status, setStatus] = useState<'ready' | 'refreshing' | 'stale'>('ready');
  return (
    <section className="pattern-fixture-section" aria-label="Resource example">
      <h2>Resource lifecycle</h2>
      <div>
        <Button onClick={() => setStatus('refreshing')}>Refresh locally</Button>
        <Button onClick={() => setStatus('stale')}>Simulate resource failure</Button>
      </div>
      <ResourceState label="Customer resource" status={status} onRetry={() => setStatus('ready')}>
        <TextInput label="Retained resource note" defaultValue="Original" />
      </ResourceState>
    </section>
  );
}
function EditorExample() {
  const [record, setRecord] = useState({ name: 'Alex' });
  const [version, setVersion] = useState(1);
  const [identity, setIdentity] = useState('one');
  const [fail, setFail] = useState(true);
  const [failDelete, setFailDelete] = useState(true);
  const [hold, setHold] = useState(false);
  const release = useRef<(() => void) | null>(null);
  return (
    <section className="pattern-fixture-section" aria-label="Record example">
      <h2>Record lifecycle</h2>
      <div>
        <Button
          onClick={() => {
            setRecord({ name: 'Server revision' });
            setVersion((x) => x + 1);
          }}
        >
          Remote change
        </Button>
        <Button
          onClick={() => {
            setIdentity('two');
            setRecord({ name: 'Other record' });
            setVersion(1);
          }}
        >
          Change record
        </Button>
        <Checkbox label="Hold save" checked={hold} onCheckedChange={(value) => setHold(!!value)} />
        <Button onClick={() => release.current?.()}>Finish pending save</Button>
      </div>
      <RecordEditor
        recordId={identity}
        record={record}
        version={version}
        title="Contact"
        createDraft={(record) => ({ ...record })}
        isEqual={(a, b) => a.name === b.name}
        renderView={(record) => <p>{record.name}</p>}
        renderFields={({ draft, onDraftChange, disabled }) => (
          <Field label="Contact name">
            <TextInput
              name="contact-name"
              required
              disabled={disabled}
              value={draft.name}
              onValueChange={(name) => onDraftChange({ name })}
            />
          </Field>
        )}
        onSave={async (draft, operation) => {
          if (hold)
            await new Promise<void>((resolve) => {
              release.current = resolve;
            });
          if (operation.signal.aborted) throw new Error('Aborted');
          if (fail) {
            setFail(false);
            throw new Error('Local save failed.');
          }
          if (operation.expectedVersion !== version) throw new Error('Version conflict');
          const next = version + 1;
          setRecord(draft);
          setVersion(next);
          return { record: draft, version: next };
        }}
        onDelete={async () => {
          if (failDelete) {
            setFailDelete(false);
            throw new Error('Local delete failed.');
          }
        }}
      />
    </section>
  );
}
function GuardExample() {
  const [draft, setDraft] = useState('');
  const [route, setRoute] = useState('Editor');
  const fail = useRef(true);
  const [second, setSecond] = useState('none');
  return (
    <section className="pattern-fixture-section" aria-label="Navigation example">
      <h2>Guarded local navigation</h2>
      <UnsavedNavigationGuard dirty={!!draft} onDiscard={() => setDraft('')}>
        {({ requestNavigation, pending }) => (
          <>
            <TextInput label="Unsaved note" value={draft} onValueChange={setDraft} />
            <p role="status">
              Local route: {route}; second request: {second}
            </p>
            <Button
              disabled={pending}
              onClick={() => {
                void requestNavigation(() => {
                  if (fail.current) {
                    fail.current = false;
                    throw new Error('Local route failed. Try again.');
                  }
                  setRoute('Overview');
                });
              }}
            >
              Request overview
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                void requestNavigation(() => setRoute('First'));
                void requestNavigation(() => setRoute('Second')).then((value) =>
                  setSecond(String(value)),
                );
              }}
            >
              Request twice
            </Button>
          </>
        )}
      </UnsavedNavigationGuard>
    </section>
  );
}
function Fixture() {
  const [route, setRoute] = useState('Requests');
  return (
    <AppShell
      brand="Local pattern fixture"
      header="No remote operations"
      navigation={({ closeNavigation }) => (
        <div className="pattern-fixture-section">
          {['Requests', 'Customers'].map((name) => (
            <Button
              key={name}
              emphasis="ghost"
              onClick={() => {
                setRoute(name);
                closeNavigation();
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    >
      <h1>{route}</h1>
      <div className="pattern-fixture-section">
        <SummaryExample />
        <ResourceExample />
        <EditorExample />
        <GuardExample />
      </div>
    </AppShell>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
