// Candidate behavior specification only. No renderer, React, or DOM dependency.
export const normalize = value => value.normalize('NFC').trim();
export const identity = value => normalize(value).toLowerCase();
const split = text => text.split(/[,\r\n\t]+/).map(normalize).filter(Boolean);
const equal = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const result = (state, effects = [], preventDefault = false) => ({ state, effects, preventDefault });
function checkedValues(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value || normalize(value) !== value || /[,\r\n\t]/.test(value))) {
    throw new TypeError('Controlled values must be nonempty, trimmed NFC strings without delimiters.');
  }
  if (new Set(values.map(identity)).size !== values.length) throw new TypeError('Controlled values must be unique.');
  return [...values];
}
export function createState({ value = [], label = 'Project labels', id = 'project-labels', disabled = false, suggestions = null } = {}) {
  if (!label.trim() || !id.trim()) throw new TypeError('A label and stable id are required.');
  return {
    value: checkedValues(value), label, id, disabled: Boolean(disabled),
    suggestions: suggestions === null ? null : checkedValues(suggestions),
    draft: '', draftRevision: 0, error: null, status: '',
    focus: disabled ? null : { part: 'input' }, composing: false,
    suggestionsOpen: false, activeSuggestion: -1, pending: null, requestId: 0,
  };
}
export function visibleSuggestions(state) {
  const taken = new Set(state.value.map(identity));
  const query = identity(state.draft);
  return (state.suggestions ?? []).filter(value => !taken.has(identity(value)) && identity(value).includes(query));
}
function commit(state, raw, validate, reason) {
  if (state.pending) return result(state, [], true);
  const entries = split(raw);
  if (!entries.length) return result(state, [], true);
  const errors = [];
  for (const value of entries) {
    try {
      const message = validate(value);
      if (message !== null && message !== undefined && message !== true) {
        errors.push({ value, message: typeof message === 'string' && message ? message : 'Invalid label.' });
      }
    } catch {
      errors.push({ value, message: 'Validation could not complete. Try again.' });
    }
  }
  if (errors.length) return result({ ...state, error: errors, status: '', suggestionsOpen: false, activeSuggestion: -1 }, [], true);
  const seen = new Set(state.value.map(identity));
  const added = [];
  let skipped = 0;
  for (const value of entries) {
    const key = identity(value);
    if (seen.has(key)) skipped += 1;
    else { seen.add(key); added.push(value); }
  }
  const status = `${added.length} label${added.length === 1 ? '' : 's'} added; ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped.`;
  if (!added.length) return result({ ...state, draft: '', draftRevision: state.draftRevision + 1, error: null, status, suggestionsOpen: false, activeSuggestion: -1 }, [], true);
  const nextValue = [...state.value, ...added];
  const requestId = state.requestId + 1;
  const pending = { requestId, value: nextValue, draftRevision: state.draftRevision, clearDraft: true, status, focus: { part: 'input' } };
  return result({ ...state, pending, requestId, error: null, status: 'Waiting for value update.', suggestionsOpen: false, activeSuggestion: -1 }, [{ type: 'value-change-request', requestId, value: nextValue, reason }], true);
}
function remove(state, index) {
  if (state.pending || !Number.isInteger(index) || index < 0 || index >= state.value.length) return result(state);
  const nextValue = state.value.filter((_, i) => i !== index);
  const requestId = state.requestId + 1;
  const focus = nextValue.length ? { part: 'remove', index: Math.min(index, nextValue.length - 1) } : { part: 'input' };
  const pending = { requestId, value: nextValue, clearDraft: false, status: `${state.value[index]} removed.`, focus };
  return result({ ...state, pending, requestId, status: 'Waiting for value update.' }, [{ type: 'value-change-request', requestId, value: nextValue, reason: 'remove' }], true);
}
export function reduce(state, event, { validate = () => null } = {}) {
  // Controlled synchronization remains possible while disabled.
  if (event.type === 'sync-value') {
    const value = checkedValues(event.value);
    const pending = state.pending;
    const accepted = pending && equal(value, pending.value);
    const clearDraft = accepted && pending.clearDraft && state.draftRevision === pending.draftRevision;
    let focus = accepted ? pending.focus : state.focus;
    if (focus?.part === 'remove' && focus.index >= value.length) focus = value.length ? { part: 'remove', index: value.length - 1 } : { part: 'input' };
    if (state.disabled || state.focus === null) focus = null;
    return result({ ...state, value, pending: null, draft: clearDraft ? '' : state.draft,
      draftRevision: state.draftRevision + (clearDraft ? 1 : 0), focus,
      status: accepted ? pending.status : pending ? 'Change not accepted; draft preserved.' : state.status });
  }
  if (event.type === 'set-disabled') return result({ ...state, disabled: Boolean(event.disabled), focus: event.disabled ? null : state.focus, composing: false, suggestionsOpen: false, activeSuggestion: -1 });
  if (event.type === 'sync-suggestions') return result({ ...state, suggestions: event.value === null ? null : checkedValues(event.value), suggestionsOpen: false, activeSuggestion: -1 });
  if (state.disabled) return result(state);
  if (event.type === 'input') return result({ ...state, draft: event.value, draftRevision: state.draftRevision + 1, error: null, status: '', activeSuggestion: -1, suggestionsOpen: state.suggestions !== null });
  if (event.type === 'composition-start') return result({ ...state, composing: true });
  if (event.type === 'composition-end') return result({ ...state, composing: false });
  if (event.type === 'blur') return result({ ...state, focus: null, suggestionsOpen: false, activeSuggestion: -1 });
  if (event.type === 'focus-input') return result({ ...state, focus: { part: 'input' } });
  if (event.type === 'focus-remove') return result(Number.isInteger(event.index) && event.index >= 0 && event.index < state.value.length ? { ...state, focus: { part: 'remove', index: event.index } } : state);
  if (event.type === 'remove') return remove(state, event.index);
  if (event.type === 'paste') {
    // Adapter supplies the whole resulting draft, including insertion/replacement
    // at the actual selection. Do not append blindly to the previous draft.
    const next = { ...state, draft: event.nextDraft, draftRevision: state.draftRevision + 1, error: null, status: '', activeSuggestion: -1, suggestionsOpen: false };
    return state.composing ? result(next) : commit(next, event.nextDraft, validate, 'paste');
  }
  if (event.type === 'choose-suggestion') {
    const suggestion = visibleSuggestions(state)[event.index];
    return suggestion === undefined || state.composing ? result(state) : commit(state, suggestion, validate, 'suggestion');
  }
  if (event.type !== 'key') return result(state);
  if (state.composing || event.isComposing || event.keyCode === 229) return result(state);
  if (event.key === 'Escape') return result({ ...state, suggestionsOpen: false, activeSuggestion: -1 }, [], state.suggestionsOpen);
  if (state.focus?.part === 'remove') {
    const index = state.focus.index;
    if (['Enter', ' ', 'Delete', 'Backspace'].includes(event.key)) return remove(state, index);
    if (event.key === 'ArrowLeft') return result({ ...state, focus: { part: 'remove', index: Math.max(0, index - 1) } }, [], true);
    if (event.key === 'ArrowRight') return result({ ...state, focus: index + 1 < state.value.length ? { part: 'remove', index: index + 1 } : { part: 'input' } }, [], true);
    return result(state);
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const count = visibleSuggestions(state).length;
    if (!count) return result(state);
    const activeSuggestion = state.activeSuggestion < 0 ? (event.key === 'ArrowDown' ? 0 : count - 1) : (state.activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
    return result({ ...state, suggestionsOpen: true, activeSuggestion }, [], true);
  }
  if (event.key === 'Enter') {
    const suggestion = state.suggestionsOpen ? visibleSuggestions(state)[state.activeSuggestion] : undefined;
    return commit(state, suggestion ?? state.draft, validate, suggestion === undefined ? 'enter' : 'suggestion');
  }
  if ((event.key === 'Backspace' || event.key === 'ArrowLeft') && state.draft === '' && state.value.length) {
    return result({ ...state, focus: { part: 'remove', index: state.value.length - 1 }, suggestionsOpen: false, activeSuggestion: -1 }, [], true);
  }
  return result(state);
}
export function accessibility(state) {
  const options = visibleSuggestions(state);
  const expanded = !state.disabled && state.suggestionsOpen && options.length > 0;
  return {
    label: { text: state.label, htmlFor: state.id },
    input: {
      id: state.id, disabled: state.disabled, 'aria-invalid': Boolean(state.error),
      'aria-describedby': `${state.id}-description${state.error ? ` ${state.id}-error` : ''}`,
      ...(state.suggestions !== null ? { role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': expanded, 'aria-controls': `${state.id}-suggestions`,
        ...(expanded && state.activeSuggestion >= 0 ? { 'aria-activedescendant': `${state.id}-option-${state.activeSuggestion}` } : {}) } : {}),
    },
    tokens: state.value.map((value, index) => ({ value, remove: { type: 'button', disabled: state.disabled, 'aria-label': `Remove ${value}`, focusRequested: state.focus?.part === 'remove' && state.focus.index === index } })),
    description: { id: `${state.id}-description`, text: 'Press Enter to add labels. Paste comma, tab, or line separated labels. Duplicates are skipped.' },
    error: state.error ? { id: `${state.id}-error`, role: 'alert', text: state.error.map(error => `${error.value}: ${error.message}`).join(' ') } : null,
    status: { role: 'status', 'aria-live': 'polite', text: state.status },
    suggestions: state.suggestions === null ? null : { id: `${state.id}-suggestions`, role: 'listbox', hidden: !expanded,
      options: options.map((value, index) => ({ id: `${state.id}-option-${index}`, role: 'option', 'aria-selected': state.activeSuggestion === index, text: value })) },
  };
}
