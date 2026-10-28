import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/button';
import { Banner } from '@/components/banner';
import { ConfirmDialog } from '@/components/modal';
import { UnsavedChangesBar } from '@/patterns/unsaved-changes-bar';
import './record-editor.css';

export type RecordVersion = string | number;
export interface RecordEditorOperation {
  recordId: string;
  expectedVersion: RecordVersion;
  signal: AbortSignal;
}
export interface RecordEditorSaved<T> {
  record: T;
  version: RecordVersion;
}
export interface RecordEditorFields<T> {
  draft: T;
  onDraftChange: (draft: T) => void;
  disabled: boolean;
}
export interface RecordEditorProps<T> {
  recordId: string;
  record: T;
  version: RecordVersion;
  title: string;
  /** Return an independent editable snapshot. The pattern never guesses how to clone domain objects. */
  createDraft: (record: T) => T;
  isEqual: (draft: T, record: T) => boolean;
  renderView: (record: T) => ReactNode;
  renderFields: (fields: RecordEditorFields<T>) => ReactNode;
  /** Resolve with the authoritative saved record/version; reject to retain the draft. */
  onSave: (draft: T, operation: RecordEditorOperation) => Promise<RecordEditorSaved<T>>;
  onDelete?: (operation: RecordEditorOperation) => Promise<void>;
  onDeleted?: () => void;
  disabled?: boolean;
  /** Initial mode only; changing this prop does not reset an active session. */
  defaultEditing?: boolean;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  conflictMessage?: string;
  reloadLabel?: string;
}
/** Generic record workflow. Hosts must enforce expectedVersion atomically at their persistence boundary. */
export function RecordEditor<T>(props: RecordEditorProps<T>) {
  // A record identity change deliberately starts a fresh editor and aborts the previous instance.
  return <RecordEditorSession key={props.recordId} {...props} />;
}
function RecordEditorSession<T>({
  recordId,
  record,
  version,
  title,
  createDraft,
  isEqual,
  renderView,
  renderFields,
  onSave,
  onDelete,
  onDeleted,
  disabled = false,
  defaultEditing = false,
  editLabel = 'Edit',
  saveLabel = 'Save changes',
  cancelLabel = 'Cancel editing',
  deleteLabel = 'Delete record',
  conflictMessage = 'This record changed while you were editing. Your draft is preserved. Reload the latest version before saving.',
  reloadLabel = 'Reload latest version',
}: RecordEditorProps<T>) {
  const [snapshot, setSnapshot] = useState({ record, version });
  const [base, setBase] = useState({ record, version });
  const [draft, setDraft] = useState(() => createDraft(record));
  const [editing, setEditing] = useState(defaultEditing);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteVersion = useRef<RecordVersion>(version);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const mounted = useRef(true);
  const operation = useRef<AbortController | null>(null);
  const incoming = useRef({ record, version });
  const latest = useRef({ record, version });
  latest.current = { record, version };
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      operation.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (Object.is(incoming.current.version, version) && incoming.current.record === record) return;
    incoming.current = { record, version };
    setSnapshot({ record, version });
  }, [record, version]);
  const conflict = editing && !Object.is(snapshot.version, base.version);
  const dirty = editing && !isEqual(draft, base.record);
  const locked = disabled || pending;
  function startEditing() {
    setBase(snapshot);
    setDraft(createDraft(snapshot.record));
    setEditing(true);
    setSaveError('');
    setMessage('');
  }
  function discard() {
    setEditing(false);
    setDraft(createDraft(snapshot.record));
    setSaveError('');
    setMessage('Changes discarded.');
    heading.current?.focus();
  }
  function reload() {
    setBase(snapshot);
    setDraft(createDraft(snapshot.record));
    setSaveError('');
    setMessage('Latest version loaded.');
  }
  async function save() {
    if (operation.current || disabled || conflict || !editing || !dirty) return;
    if (!form.current?.reportValidity()) return;
    const controller = new AbortController();
    operation.current = controller;
    setPending(true);
    setSaveError('');
    const observedVersion = latest.current.version;
    try {
      const saved = await onSave(draft, {
        recordId,
        expectedVersion: base.version,
        signal: controller.signal,
      });
      if (!mounted.current || controller.signal.aborted) return;
      // A host may publish the saved version before resolving. A different newer version requires review.
      if (
        !Object.is(latest.current.version, observedVersion) &&
        !Object.is(latest.current.version, saved.version)
      )
        throw new Error(
          'A newer record version arrived while saving. Reload the latest version before continuing.',
        );
      setSnapshot(saved);
      setBase(saved);
      setDraft(createDraft(saved.record));
      setEditing(false);
      setMessage('Changes saved.');
      heading.current?.focus();
    } catch (error) {
      if (mounted.current && !controller.signal.aborted)
        setSaveError(error instanceof Error ? error.message : 'Changes could not be saved.');
    } finally {
      if (operation.current === controller) operation.current = null;
      if (mounted.current) setPending(false);
    }
  }
  async function remove() {
    if (!onDelete || operation.current || disabled) return;
    if (!Object.is(snapshot.version, deleteVersion.current))
      throw new Error(
        'The record changed. Close this dialog and review the latest version before deleting.',
      );
    const controller = new AbortController();
    operation.current = controller;
    setPending(true);
    const expectedVersion = deleteVersion.current;
    const observedVersion = latest.current.version;
    try {
      await onDelete({ recordId, expectedVersion, signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      if (!Object.is(latest.current.version, observedVersion))
        throw new Error('The record changed while deleting. Refresh its status before continuing.');
      setDeleted(true);
      setEditing(false);
      setMessage('Record deleted.');
      heading.current?.focus();
      onDeleted?.();
    } finally {
      if (operation.current === controller) operation.current = null;
      if (mounted.current) setPending(false);
    }
  }
  return (
    <section className="aegis-record-editor" aria-labelledby={titleId} aria-busy={pending}>
      <header className="aegis-record-editor-header">
        <h2 id={titleId} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        {!deleted && (
          <div className="aegis-record-editor-actions">
            {!editing ? (
              <Button disabled={locked} onClick={startEditing}>
                {editLabel}
              </Button>
            ) : (
              <Button
                emphasis="secondary"
                disabled={locked}
                onClick={() => (dirty ? setDiscardOpen(true) : discard())}
              >
                {cancelLabel}
              </Button>
            )}
            {onDelete && (
              <Button
                intent="destroy"
                emphasis="secondary"
                disabled={locked}
                onClick={() => {
                  deleteVersion.current = snapshot.version;
                  setDeleteOpen(true);
                }}
              >
                {deleteLabel}
              </Button>
            )}
          </div>
        )}
      </header>
      <p role="status" data-record-editor-slot="status">
        {message}
      </p>
      {!deleted &&
        (editing ? (
          <form
            ref={form}
            aria-label={`Edit ${title}`}
            onSubmit={(event) => {
              event.preventDefault();
              void save().catch(() => {
                /* The inline error retains the draft. */
              });
            }}
          >
            {conflict && (
              <Banner
                intent="warning"
                title={conflictMessage}
                action={
                  <Button disabled={locked} onClick={() => setReloadOpen(true)}>
                    {reloadLabel}
                  </Button>
                }
              />
            )}
            {saveError && <Banner intent="destroy" title={saveError} />}
            <fieldset className="aegis-record-editor-fields" disabled={locked}>
              <legend className="sr-only">{title} fields</legend>
              {renderFields({
                draft,
                onDraftChange: (next) => {
                  if (!locked) setDraft(next);
                },
                disabled: locked,
              })}
            </fieldset>
            <UnsavedChangesBar
              dirty={dirty}
              onSave={save}
              onDiscard={() => setDiscardOpen(true)}
              saveLabel={saveLabel}
              disabled={locked || conflict}
            />
            <button
              type="submit"
              hidden
              aria-hidden="true"
              tabIndex={-1}
              disabled={locked || conflict || !dirty}
            >
              Save
            </button>
          </form>
        ) : (
          <div data-record-editor-slot="view">{renderView(snapshot.record)}</div>
        ))}
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard this draft?"
        confirmLabel="Discard draft"
        onConfirm={discard}
      />
      <ConfirmDialog
        open={reloadOpen}
        onOpenChange={setReloadOpen}
        title="Replace your draft with the latest version?"
        description="Your current draft will be discarded."
        confirmLabel={reloadLabel}
        onConfirm={reload}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${title}?`}
        description={
          dirty
            ? 'This also discards your unsaved draft.'
            : 'This action is performed by your application.'
        }
        confirmLabel={deleteLabel}
        onConfirm={remove}
      />
    </section>
  );
}
