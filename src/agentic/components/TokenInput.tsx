import { useEffect, useId, useRef, useState } from 'react';
import { Field } from '@/components/field';
import { TextInput } from '@/components/text-input';
import { Tag } from '@/components/tag';
import { Button } from '@/components/button';
import './TokenInput.css';

export interface TokenInputProps {
  label: string;
  values: readonly string[];
  /** Return false to refuse. Otherwise echo the requested ordered values to acknowledge. */
  onValuesChange: (values: string[]) => void | false;
  suggestions?: readonly string[];
  duplicatePolicy?: 'reject' | 'ignore';
  commitKeys?: readonly string[];
  commitOnBlur?: boolean;
  validateValue?: (value: string) => string | undefined;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

/**
 * Controlled free-text entry with native suggestions. Typed commas are literal unless comma
 * is a commit key. Pasted comma/newline batches validate atomically. Single-value paste edits
 * the draft. A draft clears only when the host echoes the requested ordered values.
 */
export function TokenInput({
  label,
  values,
  onValuesChange,
  suggestions = [],
  duplicatePolicy = 'reject',
  commitKeys = ['Enter'],
  commitOnBlur = false,
  validateValue,
  disabled = false,
  error,
  placeholder = 'Type a value, then press Enter',
}: TokenInputProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [armedRemoval, setArmedRemoval] = useState<string | null>(null);
  type PendingChange = { values: string[]; draftRevision: number | null; announcement: string };
  const [pending, setPending] = useState<PendingChange | null>(null);
  const pendingRef = useRef<PendingChange | null>(null);
  const draftRevision = useRef(0);
  useEffect(() => {
    if (
      !pending ||
      values.length !== pending.values.length ||
      !values.every((value, index) => value === pending.values[index])
    )
      return;
    if (pending.draftRevision !== null && pending.draftRevision === draftRevision.current)
      setDraft('');
    setAnnouncement(pending.announcement);
    setMessage('');
    setPending(null);
    pendingRef.current = null;
  }, [pending, values]);
  function requestValues(next: string[], revision: number | null, acceptedMessage: string) {
    const request = { values: next, draftRevision: revision, announcement: acceptedMessage };
    pendingRef.current = request;
    setPending(request);
    setAnnouncement('Change requested. Waiting for the host to confirm it.');
    try {
      if (onValuesChange(next) === false) {
        pendingRef.current = null;
        setPending(null);
        setMessage('The host did not accept this change. Your draft is preserved.');
      }
    } catch {
      pendingRef.current = null;
      setPending(null);
      setMessage('The host could not apply this change. Your draft is preserved.');
    }
  }
  function commit(text: string, restoreFocus = true, pastedBatch = false) {
    if (disabled || pendingRef.current) return;
    const delimiter = pastedBatch || commitKeys.includes(',') ? /[,\n]/ : /\n/;
    const candidates = text
      .split(delimiter)
      .map((raw) => ({ raw, value: raw.trim() }))
      .filter((item) => item.value);
    if (!candidates.length) return;
    const next = [...values];
    const rejected: string[] = [];
    for (const { value: candidate } of candidates) {
      let invalid: string | undefined;
      try {
        invalid = validateValue?.(candidate);
      } catch {
        invalid = 'Validation could not complete. Retry this value.';
      }
      if (invalid) {
        rejected.push(`${candidate}: ${invalid}`);
        continue;
      }
      if (next.some((value) => value.toLocaleLowerCase() === candidate.toLocaleLowerCase())) {
        if (duplicatePolicy === 'reject') {
          rejected.push(`${candidate} is already added.`);
        }
        continue;
      }
      next.push(candidate);
    }
    draftRevision.current++;
    setDraft(text);
    setArmedRemoval(null);
    setMessage(rejected.join(' '));
    if (rejected.length) {
      setAnnouncement('No values were added. Correct the rejected batch and try again.');
    } else if (next.length === values.length) {
      setDraft('');
      setAnnouncement('No new values. Existing duplicates were ignored.');
    } else {
      requestValues(
        next,
        draftRevision.current,
        `${next.length - values.length} values added. ${next.length} total.`,
      );
    }
    if (restoreFocus) input.current?.focus();
  }
  function remove(value: string) {
    if (disabled || pendingRef.current) return;
    requestValues(
      values.filter((item) => item !== value),
      null,
      `${value} removed.`,
    );
    setArmedRemoval(null);
    input.current?.focus();
  }
  return (
    <div className="agentic-token-input" data-testid="token-input">
      <Field
        label={label}
        disabled={disabled}
        error={error || message}
        helpText={`${commitKeys.map((key) => (key === ',' ? 'comma' : key)).join(' or ')} adds a value. Pasted comma-separated batches are atomic: a rejected batch stays intact. Duplicates are ${duplicatePolicy === 'reject' ? 'reported' : 'ignored'} (case-insensitive).${commitOnBlur ? ' Leaving the input also submits its draft.' : ''}`}
      >
        <div className="agentic-token-entry">
          <TextInput
            ref={input}
            value={draft}
            onValueChange={(value) => {
              setDraft(value);
              draftRevision.current++;
              setArmedRemoval(null);
              setMessage('');
            }}
            disabled={disabled}
            placeholder={placeholder}
            list={suggestions.length ? `${id}-suggestions` : undefined}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
              if (commitKeys.includes(event.key)) {
                event.preventDefault();
                commit(draft);
              }
              if (event.key === 'Backspace' && !draft && values.length) {
                event.preventDefault();
                const last = values[values.length - 1];
                if (armedRemoval === last) remove(last);
                else {
                  setArmedRemoval(last);
                  setAnnouncement(
                    `${last} selected for removal. Press Backspace again to remove, or Escape to cancel.`,
                  );
                }
              }
              if (event.key === 'Escape') {
                setArmedRemoval(null);
                setAnnouncement('Removal cancelled.');
              }
            }}
            onBlur={() => {
              if (commitOnBlur && draft.trim()) commit(draft, false);
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text');
              if (/[,\n]/.test(pasted)) {
                event.preventDefault();
                const start = event.currentTarget.selectionStart ?? draft.length;
                const end = event.currentTarget.selectionEnd ?? draft.length;
                commit(`${draft.slice(0, start)}${pasted}${draft.slice(end)}`, true, true);
              }
            }}
          />
          <Button
            emphasis="secondary"
            disabled={disabled || !!pending || !draft.trim()}
            onClick={() => commit(draft)}
          >
            Add
          </Button>
        </div>
        {suggestions.length > 0 && (
          <datalist id={`${id}-suggestions`}>
            {suggestions.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        )}
      </Field>
      {values.length > 0 && (
        <ul className="agentic-token-list" aria-label={`${label} values`}>
          {values.map((value) => (
            <li key={value}>
              <Tag
                variant="removable"
                disabled={disabled || !!pending}
                selected={armedRemoval === value}
                onRemove={() => remove(value)}
                removeLabel={`Remove ${value}`}
              >
                {value}
              </Tag>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <div role="status">
          <p>Waiting for the host to confirm this change. Your draft is preserved.</p>
          <Button
            emphasis="ghost"
            size="sm"
            onClick={() => {
              pendingRef.current = null;
              setPending(null);
              setAnnouncement('You can keep editing. A later host update may still arrive.');
            }}
          >
            Keep editing
          </Button>
        </div>
      )}
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </div>
  );
}
