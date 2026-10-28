import { useEffect, useId, useRef, useState } from 'react';
import { Field } from '@/components/field';
import { Textarea } from '@/components/textarea';
import { Tag } from '@/components/tag';
import { Button } from '@/components/button';
import { evaluateTokenBatch, type TokenValidator } from './token-input-model';
import './TokenInput.css';

export type TokenInputRequest = { requestId: string; signal: AbortSignal };
export type TokenInputAcknowledgment = {
  requestId: string;
  status: 'accepted' | 'rejected';
  message?: string;
};
export interface TokenInputProps {
  label: string;
  values: readonly string[];
  /** Echo the requested ordered values. Return false for immediate refusal. */
  onValuesChange: (values: string[], request: TokenInputRequest) => void | false;
  /** Use request confirmation for asynchronous hosts; values mode supports synchronous state setters. */
  confirmationMode?: 'values' | 'request';
  acknowledgment?: TokenInputAcknowledgment;
  suggestions?: readonly string[];
  duplicatePolicy?: 'reject' | 'ignore';
  commitKeys?: readonly string[];
  commitOnBlur?: boolean;
  validateValue?: TokenValidator;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

type PendingChange = {
  requestId: string;
  controller: AbortController;
  values: string[];
  draftRevision: number | null;
  announcement: string;
};
/**
 * Controlled free-text entry. Commas are literal unless explicitly configured as commit keys.
 * Newline/tab batches validate atomically and preserve the exact rejected draft. Async hosts
 * should use request confirmation, echo accepted values, and honor the request's abort signal.
 */
export function TokenInput({
  label,
  values,
  onValuesChange,
  confirmationMode = 'values',
  acknowledgment,
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
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [armedRemoval, setArmedRemoval] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const pendingRef = useRef<PendingChange | null>(null);
  const draftRevision = useRef(0);
  const sequence = useRef(0);
  const composing = useRef(false);
  useEffect(() => () => pendingRef.current?.controller.abort(), []);
  useEffect(() => {
    if (!pending) return;
    if (confirmationMode === 'request') {
      if (acknowledgment?.requestId !== pending.requestId) return;
      if (acknowledgment.status === 'rejected') {
        pending.controller.abort();
        pendingRef.current = null;
        setPending(null);
        setMessage(
          acknowledgment.message || 'The host did not accept this change. Your draft is preserved.',
        );
        setAnnouncement('Change rejected. Your draft is preserved.');
        return;
      }
    }
    if (
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
  }, [pending, values, confirmationMode, acknowledgment]);
  function requestValues(next: string[], revision: number | null, acceptedMessage: string) {
    const request: PendingChange = {
      requestId: `${id}-${++sequence.current}`,
      controller: new AbortController(),
      values: next,
      draftRevision: revision,
      announcement: acceptedMessage,
    };
    pendingRef.current = request;
    setPending(request);
    setAnnouncement('Change requested. Waiting for the host to confirm it.');
    try {
      if (
        onValuesChange(next, {
          requestId: request.requestId,
          signal: request.controller.signal,
        }) !== false
      )
        return;
      setMessage('The host did not accept this change. Your draft is preserved.');
    } catch {
      setMessage('The host could not apply this change. Your draft is preserved.');
    }
    request.controller.abort();
    pendingRef.current = null;
    setPending(null);
    setAnnouncement('Change rejected. Your draft is preserved.');
  }
  function commit(text: string, restoreFocus = true, preserveDraft = false) {
    if (disabled || pendingRef.current || composing.current) return;
    const result = evaluateTokenBatch(text, values, {
      duplicatePolicy,
      commaDelimiter: commitKeys.includes(','),
      validateValue,
    });
    if (!text.trim()) return;
    const revision = preserveDraft ? null : ++draftRevision.current;
    if (!preserveDraft) setDraft(text);
    setArmedRemoval(null);
    setMessage(result.errors.join(' '));
    if (result.errors.length) {
      setAnnouncement('No values were added. Correct the rejected batch and try again.');
    } else if (!result.added) {
      if (!preserveDraft) setDraft('');
      setAnnouncement(
        `${result.skipped} duplicate${result.skipped === 1 ? '' : 's'} skipped. No values added.`,
      );
    } else {
      requestValues(
        result.values,
        revision,
        `${result.added} value${result.added === 1 ? '' : 's'} added. ${result.skipped} duplicates skipped. ${result.values.length} total.`,
      );
    }
    if (restoreFocus) input.current?.focus();
  }
  function remove(value: string) {
    if (disabled || pendingRef.current || composing.current) return;
    requestValues(
      values.filter((item) => item !== value),
      null,
      `${value} removed.`,
    );
    setArmedRemoval(null);
    input.current?.focus();
  }
  return (
    <div className="agentic-token-input" data-testid="token-input" aria-busy={!!pending}>
      <Field
        label={label}
        disabled={disabled}
        error={error || message}
        helpText={`${commitKeys.map((key) => (key === ',' ? 'comma' : key)).join(' or ')} or Add commits. Shift+Enter inserts a line. Pasted lines and tabs form an atomic batch; rejected text stays intact. Commas ${commitKeys.includes(',') ? 'separate values' : 'are literal text'}. Duplicates are ${duplicatePolicy === 'reject' ? 'reported' : 'skipped with a count'} (case-insensitive).${commitOnBlur ? ' Leaving the input also submits its draft.' : ''}`}
      >
        <div className="agentic-token-entry">
          <Textarea
            ref={input}
            value={draft}
            rows={1}
            autoGrow
            maxRows={4}
            onValueChange={(value) => {
              setDraft(value);
              draftRevision.current++;
              setArmedRemoval(null);
              setMessage('');
            }}
            disabled={disabled}
            placeholder={placeholder}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              if (
                composing.current ||
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229
              )
                return;
              if (
                commitKeys.includes(event.key as 'Enter' | ',') &&
                !(event.key === 'Enter' && event.shiftKey)
              ) {
                event.preventDefault();
                commit(draft);
              }
              if (
                event.key === 'Backspace' &&
                !draft &&
                values.length &&
                !pendingRef.current &&
                !event.repeat
              ) {
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
              setArmedRemoval(null);
              if (commitOnBlur && draft.trim()) commit(draft, false);
            }}
            onPaste={(event) => {
              if (composing.current) return;
              const pasted = event.clipboardData.getData('text');
              if ((commitKeys.includes(',') ? /[,\r\n\t]/ : /[\r\n\t]/).test(pasted)) {
                event.preventDefault();
                const start = event.currentTarget.selectionStart ?? draft.length;
                const end = event.currentTarget.selectionEnd ?? draft.length;
                const text = `${draft.slice(0, start)}${pasted}${draft.slice(end)}`;
                if (pendingRef.current) {
                  setDraft(text);
                  draftRevision.current++;
                } else commit(text);
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
      </Field>
      {suggestions.length > 0 && (
        <div className="agentic-token-suggestions" role="group" aria-label={`${label} suggestions`}>
          {[...new Set(suggestions)].map((value) => (
            <Button
              key={value}
              emphasis="ghost"
              size="sm"
              disabled={disabled || !!pending}
              aria-label={`Add suggestion ${value}`}
              onClick={() => commit(value, true, true)}
            >
              {value}
            </Button>
          ))}
        </div>
      )}
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
            disabled={disabled}
            onClick={() => {
              pendingRef.current?.controller.abort();
              pendingRef.current = null;
              setPending(null);
              setAnnouncement(
                'Request cancelled. Keep editing; the host must discard cancelled work.',
              );
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
