import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { cn } from '@/lib/utils';
import './inline-edit.css';

export interface InlineEditSaveContext {
  previousValue: string;
}
export interface InlineEditProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange'
> {
  label: string;
  value: string;
  onSave: (value: string, context: InlineEditSaveContext) => void | Promise<void>;
  validate?: (draft: string) => string | null | undefined;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  emptyText?: string;
  editLabel?: string;
  saveLabel?: string;
  cancelLabel?: string;
  savingLabel?: string;
  errorMessage?: string;
  conflictMessage?: string;
}

/** A local draft with explicit save/cancel. The host owns the committed value and persistence. */
export function InlineEdit({
  label,
  value,
  onSave,
  validate,
  disabled = false,
  readOnly = false,
  required = false,
  emptyText = 'Not set',
  editLabel = 'Edit',
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  savingLabel = 'Saving…',
  errorMessage = 'Could not save. Try again.',
  conflictMessage = 'This value changed while you were editing. Cancel and edit the latest value.',
  className,
  ...props
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const original = useRef(value);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const returnFocus = useRef(false);
  const operation = useRef(0);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      operation.current++;
    },
    [],
  );
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (returnFocus.current) {
      trigger.current?.querySelector('button')?.focus();
      returnFocus.current = false;
    }
  }, [editing]);
  const finish = () => {
    returnFocus.current = true;
    setEditing(false);
    setError(undefined);
  };
  const cancel = () => {
    if (!inFlight.current) finish();
  };
  const save = async () => {
    if (inFlight.current || disabled || readOnly) return;
    if (value !== original.current) {
      setError(conflictMessage);
      return;
    }
    let problem: string | null | undefined;
    try {
      problem = required && !draft.trim() ? 'Enter a value.' : validate?.(draft);
    } catch {
      problem = errorMessage;
    }
    if (problem) {
      setError(problem);
      input.current?.focus();
      return;
    }
    if (draft === original.current) {
      finish();
      return;
    }
    const request = ++operation.current;
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await onSave(draft, { previousValue: original.current });
      if (operation.current === request) finish();
    } catch {
      if (operation.current === request) setError(errorMessage);
    } finally {
      if (operation.current === request) {
        inFlight.current = false;
        setPending(false);
      }
    }
  };
  return (
    <div {...props} className={cn('aegis-inline-edit', className)} aria-busy={pending}>
      {editing ? (
        <>
          <Field label={label} error={error} required={required}>
            <TextInput
              ref={input}
              value={draft}
              onValueChange={(next) => {
                setDraft(next);
                setError(undefined);
              }}
              disabled={disabled || pending}
              readOnly={readOnly}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancel();
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void save();
                }
              }}
            />
          </Field>
          <div className="aegis-inline-edit-actions">
            <Button onClick={() => void save()} disabled={disabled || readOnly} loading={pending}>
              {saveLabel}
            </Button>
            <Button emphasis="secondary" onClick={cancel} disabled={pending}>
              {cancelLabel}
            </Button>
          </div>
          {pending && (
            <p className="aegis-inline-edit-status" role="status">
              {savingLabel}
            </p>
          )}
        </>
      ) : (
        <>
          <span className="aegis-inline-edit-label">{label}</span>
          <div className="aegis-inline-edit-display">
            <span className="aegis-inline-edit-value">{value || emptyText}</span>
            {!readOnly && (
              <span ref={trigger}>
                <Button
                  emphasis="ghost"
                  size="sm"
                  disabled={disabled}
                  aria-label={`${editLabel} ${label}`}
                  onClick={() => {
                    original.current = value;
                    setDraft(value);
                    setError(undefined);
                    setEditing(true);
                  }}
                >
                  {editLabel}
                </Button>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
