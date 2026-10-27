/** Experimental behavioral model. No rendering or production accessibility claim. */
export const behavior = Object.freeze({ freeText: true, commitKeys: ['Enter'], duplicatePolicy: 'reject', commitOnBlur: false });
const noop = () => null;
const equal = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
export const normalize = value => value.trim().normalize('NFC');
export const identity = value => normalize(value).toLowerCase();
const segments = text => text.split(/\r\n|[\n\r\t]/).map(normalize).filter(Boolean);

function assertValues(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value || normalize(value) !== value)) {
    throw new TypeError('Values must be an array of nonempty, trimmed NFC strings.');
  }
  if (new Set(values.map(identity)).size !== values.length) throw new TypeError('Controlled values must be unique.');
  return [...values];
}

export function createState({ value = [], controlled = false, disabled = false, label = 'Project labels', id = 'project-labels' } = {}) {
  if (typeof label !== 'string' || !label.trim() || typeof id !== 'string' || !id.trim()) throw new TypeError('A nonempty visible label and stable id are required.');
  return { value: assertValues(value), controlled, disabled, label, id, draft: '', errors: [], composing: false, focus: { kind: 'input' }, pending: null, nextRequestId: 1 };
}

function errorResult(state, errors, extra = {}) {
  return { state: { ...state, errors }, effects: [{ type: 'announce', message: errors.map(error => error.message).join(' ') }], ...extra };
}

function request(state, nextValue, reason, { clearDraft = false, focus = state.focus } = {}) {
  const requestId = state.nextRequestId;
  const pending = { requestId, nextValue: [...nextValue], reason, clearDraft, draftAtRequest: state.draft, focus };
  const effect = { type: 'change-request', requestId, value: [...nextValue], reason };
  if (state.controlled) return { state: { ...state, pending, nextRequestId: requestId + 1, errors: [] }, effects: [effect] };
  return {
    state: { ...state, value: [...nextValue], draft: clearDraft ? '' : state.draft, focus, errors: [], nextRequestId: requestId + 1 },
    effects: [effect, { type: 'announce', message: reason === 'remove' ? 'Label removed.' : 'Labels added.' }]
  };
}

function add(state, values, reason, validate, clearDraft) {
  if (state.pending) return { state, effects: [] };
  const errors = [];
  const seen = new Set(state.value.map(identity));
  if (!values.length) errors.push({ code: 'empty', message: 'Enter at least one label.' });
  values.forEach((value, index) => {
    const key = identity(value);
    if (seen.has(key)) errors.push({ code: 'duplicate', index, value, message: `Label ${index + 1}: “${value}” is already included.` });
    seen.add(key);
    try {
      const result = validate(value);
      if (result !== null && result !== undefined && typeof result !== 'string') throw new TypeError('Validation must return a message or null.');
      if (typeof result === 'string' && result.length) errors.push({ code: 'invalid', index, value, message: `Label ${index + 1}: ${result}` });
    } catch {
      errors.push({ code: 'validation-unavailable', index, value, message: `Label ${index + 1}: validation could not complete. Try again.` });
    }
  });
  return errors.length ? errorResult(state, errors) : request(state, [...state.value, ...values], reason, { clearDraft, focus: { kind: 'input' } });
}

/** Every transition returns a new state or the original object; effects are data only.
 * Controlled hosts consume change-request and respond with sync(value, requestId)
 * or reject(requestId). Without acknowledgment no submitted draft is discarded.
 */
export function reduce(state, action, { validate = noop, suggestions = [] } = {}) {
  const unchanged = () => ({ state, effects: [] });
  // External state is authoritative, including while the widget is disabled.
  if (action.type === 'sync') {
    if (!state.controlled) throw new TypeError('sync is only supported for a controlled value.');
    const value = assertValues(action.value);
    const pending = state.pending;
    // A response to an obsolete request cannot roll back a newer request/value.
    if (action.requestId !== undefined && action.requestId !== pending?.requestId) return unchanged();
    if (pending && action.requestId === pending.requestId && equal(value, pending.nextValue)) {
      const focus = state.disabled || state.focus.kind === 'outside' ? { kind: 'outside' } : pending.focus;
      return { state: { ...state, value, pending: null, errors: [], focus, draft: pending.clearDraft && state.draft === pending.draftAtRequest ? '' : state.draft }, effects: [{ type: 'announce', message: pending.reason === 'remove' ? 'Label removed.' : 'Labels added.' }] };
    }
    // An uncorrelated external update invalidates a pending transaction, preserving input.
    const next = { ...state, value, pending: null, focus: state.focus.kind === 'outside' || state.disabled ? { kind: 'outside' } : { kind: 'input' } };
    return pending ? errorResult(next, [{ code: 'controlled-conflict', message: 'The labels changed before this request was accepted. Review your input and try again.' }]) : { state: next, effects: [] };
  }
  if (action.type === 'reject') {
    if (action.requestId !== state.pending?.requestId) return unchanged();
    return errorResult({ ...state, pending: null }, [{ code: 'controlled-rejection', message: action.message || 'This change was not accepted. Your input is preserved.' }]);
  }
  if (action.type === 'disabled') return { state: { ...state, disabled: Boolean(action.value), composing: false }, effects: [] };
  if (state.disabled) return unchanged();
  if (action.type === 'input') return { state: { ...state, draft: String(action.value), errors: [], focus: { kind: 'input' } }, effects: [] };
  if (action.type === 'composition-start') return { state: { ...state, composing: true }, effects: [] };
  if (action.type === 'composition-end') return { state: { ...state, composing: false }, effects: [] };
  if (action.type === 'blur') return { state: { ...state, focus: { kind: 'outside' } }, effects: [] };
  if (action.type === 'focus-input') return { state: { ...state, focus: { kind: 'input' } }, effects: [] };
  if (action.type === 'focus-remove') {
    if (state.pending || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.value.length) return unchanged();
    return { state: { ...state, focus: { kind: 'remove', index: action.index } }, effects: [] };
  }
  if (action.type === 'paste') {
    const start = action.start ?? state.draft.length;
    const end = action.end ?? start;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > state.draft.length || typeof action.text !== 'string') throw new TypeError('Paste needs valid draft selection offsets and text.');
    const draft = state.draft.slice(0, start) + action.text + state.draft.slice(end);
    const next = { ...state, draft, errors: [], focus: { kind: 'input' } };
    if (!/[\n\r\t]/.test(action.text) || state.composing || state.pending) return { state: next, effects: [], preventDefault: true };
    return { ...add(next, segments(draft), 'paste', validate, true), preventDefault: true };
  }
  if (action.type === 'commit') {
    if (state.composing) return unchanged();
    return add(state, segments(state.draft), 'commit', validate, true);
  }
  if (action.type === 'suggest') {
    if (typeof action.value !== 'string' || !suggestions.includes(action.value)) return unchanged();
    const value = normalize(action.value);
    return add(state, value ? [value] : [], 'suggestion', validate, false);
  }
  if (action.type === 'remove') {
    if (state.pending || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.value.length) return unchanged();
    const nextValue = state.value.filter((_, index) => index !== action.index);
    const focus = nextValue.length ? { kind: 'remove', index: Math.min(action.index, nextValue.length - 1) } : { kind: 'input' };
    return request(state, nextValue, 'remove', { focus });
  }
  if (action.type === 'key') {
    if (state.composing || action.isComposing) return unchanged();
    if (state.focus.kind === 'remove' && ['Enter', ' ', 'Delete', 'Backspace'].includes(action.key)) {
      return { ...reduce(state, { type: 'remove', index: state.focus.index }, { validate, suggestions }), preventDefault: true };
    }
    if (state.focus.kind !== 'input') return unchanged();
    if (action.key === 'Enter' && !action.shiftKey) return { ...reduce(state, { type: 'commit' }, { validate, suggestions }), preventDefault: true };
    if (action.key === 'Backspace' && !state.pending && state.draft === '' && state.value.length) return { state: { ...state, focus: { kind: 'remove', index: state.value.length - 1 } }, effects: [], preventDefault: true };
  }
  return unchanged();
}

/** Render-adapter requirements, not a claim of DOM/screen-reader verification. */
export function accessibility(state, suggestions = []) {
  const errorId = `${state.id}-error`;
  return {
    label: { text: state.label, htmlFor: state.id },
    input: { element: 'textarea', id: state.id, 'aria-invalid': state.errors.length > 0, 'aria-describedby': `${state.id}-hint${state.errors.length ? ` ${errorId}` : ''}`, disabled: state.disabled },
    hint: { id: `${state.id}-hint`, text: 'Enter adds labels. Paste one label per line or tab. Commas are part of a label. Shift+Enter starts another line.' },
    error: { id: errorId, text: state.errors.map(error => error.message).join(' ') },
    status: { role: 'status', 'aria-live': 'polite', 'aria-atomic': true },
    add: { element: 'button', type: 'button', name: 'Add labels', disabled: state.disabled || Boolean(state.pending) },
    tokenList: { element: 'ul', label: `${state.label}: selected labels` },
    remove: state.value.map(value => ({ element: 'button', type: 'button', name: `Remove label ${value}`, disabled: state.disabled || Boolean(state.pending) })),
    suggestions: suggestions.map(value => ({ element: 'button', type: 'button', name: `Add suggested label ${value}`, disabled: state.disabled || Boolean(state.pending) })),
    suggestionGroupName: 'Suggested labels',
    busy: Boolean(state.pending)
  };
}
