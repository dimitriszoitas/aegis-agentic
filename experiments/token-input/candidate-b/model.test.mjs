import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce, accessibility, visibleSuggestions } from './model.mjs';
const input = (state, value) => reduce(state, { type: 'input', value }).state;
const key = (state, key, config) => reduce(state, { type: 'key', key }, config);
const accept = outcome => reduce(outcome.state, { type: 'sync-value', value: outcome.effects[0].value }).state;
const validate = value => value.startsWith('!') ? 'Labels cannot start with !.' : null;

test('Enter requests normalized values without changing the controlled value until accepted', () => {
  const initial = input(createState(), '  Cafe\u0301  ');
  const outcome = key(initial, 'Enter');
  assert.deepEqual(outcome.state.value, []);
  assert.equal(outcome.state.draft, '  Cafe\u0301  ');
  assert.deepEqual(outcome.effects[0].value, ['Café']);
  assert.equal(outcome.preventDefault, true);
  const final = accept(outcome);
  assert.deepEqual(final.value, ['Café']);
  assert.equal(final.draft, '');
});
test('whitespace does not create an empty token or emit a change', () => {
  const outcome = key(input(createState(), ' \t '), 'Enter');
  assert.equal(outcome.effects.length, 0);
  assert.deepEqual(outcome.state.value, []);
});
test('typing a comma waits for Enter, then commits the explicit batch', () => {
  const state = input(createState(), 'alpha,beta');
  assert.equal(key(state, ',').preventDefault, false);
  assert.equal(key(state, ',').effects.length, 0);
  assert.deepEqual(key(state, 'Enter').effects[0].value, ['alpha', 'beta']);
});
test('bulk paste accepts comma, CRLF, tab, ignores blanks, and preserves order', () => {
  const outcome = reduce(createState(), { type: 'paste', nextDraft: ' alpha,\r\nbeta\tgamma,, ' });
  assert.deepEqual(outcome.effects[0].value, ['alpha', 'beta', 'gamma']);
  assert.equal(accept(outcome).draft, '');
});
test('paste uses the full insertion result instead of appending to stale input', () => {
  const state = input(createState(), 'project old');
  const outcome = reduce(state, { type: 'paste', nextDraft: 'project new, other' });
  assert.deepEqual(outcome.effects[0].value, ['project new', 'other']);
});
test('one invalid paste entry rejects the whole batch and preserves exact draft', () => {
  const draft = ' valid, !bad\r\nanother ';
  const outcome = reduce(createState({ value: ['prior'] }), { type: 'paste', nextDraft: draft }, { validate });
  assert.deepEqual(outcome.state.value, ['prior']);
  assert.equal(outcome.effects.length, 0);
  assert.equal(outcome.state.draft, draft);
  assert.deepEqual(outcome.state.error, [{ value: '!bad', message: 'Labels cannot start with !.' }]);
  const fixed = input(outcome.state, 'valid, fixed\nanother');
  assert.equal(fixed.error, null);
  assert.deepEqual(key(fixed, 'Enter', { validate }).effects[0].value, ['prior', 'valid', 'fixed', 'another']);
});
test('validation examines each normalized entry and reports all failures', () => {
  const examined = [];
  const outcome = key(input(createState(), ' !first, good, !second '), 'Enter', { validate: value => { examined.push(value); return validate(value); } });
  assert.deepEqual(examined, ['!first', 'good', '!second']);
  assert.equal(outcome.state.error.length, 2);
  assert.equal(outcome.effects.length, 0);
});
test('validator failure preserves the draft and emits no partial value', () => {
  const outcome = key(input(createState(), 'keep me'), 'Enter', { validate() { throw new Error('offline'); } });
  assert.equal(outcome.state.draft, 'keep me');
  assert.equal(outcome.effects.length, 0);
  assert.equal(outcome.state.error[0].message, 'Validation could not complete. Try again.');
});
test('duplicates are skipped against existing and same-batch values using NFC and case folding', () => {
  const outcome = reduce(createState({ value: ['Café'] }), { type: 'paste', nextDraft: ' CAFE\u0301, New, new, Other ' });
  assert.deepEqual(outcome.effects[0].value, ['Café', 'New', 'Other']);
  assert.equal(accept(outcome).status, '2 labels added; 2 duplicates skipped.');
});
test('duplicate-only submission reports the skip without a value-change request', () => {
  const outcome = key(input(createState({ value: ['Alpha'] }), ' alpha '), 'Enter');
  assert.equal(outcome.effects.length, 0);
  assert.equal(outcome.state.draft, '');
  assert.equal(outcome.state.error, null);
  assert.equal(outcome.state.status, '0 labels added; 1 duplicate skipped.');
});
test('blur and Tab preserve unfinished and invalid drafts without committing', () => {
  const invalid = key(input(createState(), '!bad'), 'Enter', { validate }).state;
  const tab = key(invalid, 'Tab');
  assert.equal(tab.preventDefault, false);
  assert.equal(tab.effects.length, 0);
  const blurred = reduce(tab.state, { type: 'blur' });
  assert.equal(blurred.effects.length, 0);
  assert.equal(blurred.state.draft, '!bad');
  assert.deepEqual(blurred.state.error, invalid.error);
});
test('Backspace while editing never requests token removal', () => {
  const outcome = key(input(createState({ value: ['Alpha'] }), 'x'), 'Backspace');
  assert.equal(outcome.effects.length, 0);
  assert.equal(outcome.preventDefault, false);
  assert.deepEqual(outcome.state.focus, { part: 'input' });
});
test('empty Backspace focuses the last remove control; another explicit key requests removal', () => {
  const first = key(createState({ value: ['A', 'B'] }), 'Backspace');
  assert.equal(first.effects.length, 0);
  assert.deepEqual(first.state.focus, { part: 'remove', index: 1 });
  const second = key(first.state, 'Backspace');
  assert.deepEqual(second.state.value, ['A', 'B']);
  assert.deepEqual(second.effects[0].value, ['A']);
  assert.deepEqual(accept(second).focus, { part: 'remove', index: 0 });
});
test('removing the only token returns focus to input and preserves the draft', () => {
  const state = input(createState({ value: ['A'] }), 'unfinished');
  const final = accept(reduce(state, { type: 'remove', index: 0 }));
  assert.deepEqual(final.value, []);
  assert.deepEqual(final.focus, { part: 'input' });
  assert.equal(final.draft, 'unfinished');
});
test('remove navigation uses left/right; Enter, Space, Delete activate removal', () => {
  const last = key(createState({ value: ['A', 'B'] }), 'ArrowLeft').state;
  assert.deepEqual(last.focus, { part: 'remove', index: 1 });
  const first = key(last, 'ArrowLeft').state;
  assert.deepEqual(first.focus, { part: 'remove', index: 0 });
  assert.deepEqual(key(last, 'ArrowRight').state.focus, { part: 'input' });
  for (const activation of ['Enter', ' ', 'Delete']) assert.deepEqual(key(first, activation).effects[0].value, ['B']);
});
test('disabled blocks all user editing, paste, suggestion, keyboard, and remove actions', () => {
  const state = createState({ value: ['A'], disabled: true, suggestions: ['B'] });
  for (const event of [
    { type: 'input', value: 'B' }, { type: 'paste', nextDraft: 'B,C' },
    { type: 'remove', index: 0 }, { type: 'choose-suggestion', index: 0 },
    { type: 'key', key: 'Enter' }, { type: 'key', key: 'Backspace' }, { type: 'focus-input' },
  ]) {
    const outcome = reduce(state, event);
    assert.equal(outcome.state, state);
    assert.deepEqual(outcome.effects, []);
  }
  assert.deepEqual(reduce(state, { type: 'sync-value', value: ['Parent'] }).state.value, ['Parent']);
});
test('IME composition Enter does not commit; Enter after composition does', () => {
  const draft = input(createState(), '東京');
  const composing = reduce(draft, { type: 'composition-start' }).state;
  assert.equal(key(composing, 'Enter').effects.length, 0);
  assert.equal(key(composing, 'Enter').preventDefault, false);
  assert.equal(reduce(draft, { type: 'key', key: 'Enter', isComposing: true }).effects.length, 0);
  assert.equal(reduce(draft, { type: 'key', key: 'Enter', keyCode: 229 }).effects.length, 0);
  assert.deepEqual(key(reduce(composing, { type: 'composition-end' }).state, 'Enter').effects[0].value, ['東京']);
});
test('controlled rejection retains draft and allows retry', () => {
  const pending = key(input(createState(), 'retry'), 'Enter');
  const refused = reduce(pending.state, { type: 'sync-value', value: [] }).state;
  assert.equal(refused.draft, 'retry');
  assert.equal(refused.pending, null);
  assert.equal(refused.status, 'Change not accepted; draft preserved.');
  assert.deepEqual(key(refused, 'Enter').effects[0].value, ['retry']);
});
test('repeated commit during pending update emits no extra request', () => {
  const pending = key(input(createState(), 'A'), 'Enter');
  assert.equal(key(pending.state, 'Enter').effects.length, 0);
  assert.equal(reduce(pending.state, { type: 'remove', index: 0 }).effects.length, 0);
});
test('new typing during a pending controlled update survives parent acceptance', () => {
  const pending = key(input(createState(), 'A'), 'Enter');
  const edited = input(pending.state, 'B');
  const final = reduce(edited, { type: 'sync-value', value: ['A'] }).state;
  assert.deepEqual(final.value, ['A']);
  assert.equal(final.draft, 'B');
});
test('late acceptance cannot move focus back after blur or disabling', () => {
  const pending = key(input(createState(), 'A'), 'Enter');
  for (const event of [{ type: 'blur' }, { type: 'set-disabled', disabled: true }]) {
    const changed = reduce(pending.state, event).state;
    assert.equal(reduce(changed, { type: 'sync-value', value: ['A'] }).state.focus, null);
  }
});
test('optional suggestions allow keyboard selection but do not constrain free text', () => {
  const state = input(createState({ suggestions: ['Alpha', 'Alpine', 'Beta'] }), 'Al');
  assert.deepEqual(visibleSuggestions(state), ['Alpha', 'Alpine']);
  const down = key(state, 'ArrowDown').state;
  assert.equal(down.activeSuggestion, 0);
  assert.deepEqual(key(down, 'Enter').effects[0].value, ['Alpha']);
  assert.equal(key(down, 'ArrowUp').state.activeSuggestion, 1);
  const fresh = input(state, 'Novel');
  assert.deepEqual(key(fresh, 'Enter').effects[0].value, ['Novel']);
});
test('Escape closes suggestions and preserves text without clearing tokens', () => {
  const state = key(input(createState({ value: ['Prior'], suggestions: ['Alpha'] }), 'Al'), 'ArrowDown').state;
  const outcome = key(state, 'Escape');
  assert.equal(outcome.state.suggestionsOpen, false);
  assert.equal(outcome.state.draft, 'Al');
  assert.deepEqual(outcome.state.value, ['Prior']);
  assert.deepEqual(key(outcome.state, 'Enter').effects[0].value, ['Prior', 'Al']);
});
test('suggestion validation failure preserves the actual typed input', () => {
  const state = input(createState({ suggestions: ['!bad'] }), 'bad');
  const outcome = reduce(state, { type: 'choose-suggestion', index: 0 }, { validate });
  assert.equal(outcome.state.draft, 'bad');
  assert.equal(outcome.effects.length, 0);
  assert.equal(outcome.state.error[0].value, '!bad');
});
test('accessibility model associates label, hint, errors, remove names, and suggestion focus', () => {
  const state = key(input(createState({ value: ['Alpha'], id: 'labels', label: 'Project labels', suggestions: ['Beta'] }), 'Be'), 'ArrowDown').state;
  const view = accessibility(state);
  assert.equal(view.label.htmlFor, view.input.id);
  assert.equal(view.tokens[0].remove['aria-label'], 'Remove Alpha');
  assert.equal(view.tokens[0].remove.type, 'button');
  assert.equal(view.input['aria-activedescendant'], view.suggestions.options[0].id);
  assert.equal(view.input['aria-controls'], view.suggestions.id);
  const error = accessibility(key(input(state, '!bad'), 'Enter', { validate }).state);
  assert.equal(error.input['aria-invalid'], true);
  assert.ok(error.input['aria-describedby'].includes(error.error.id));
  assert.equal(error.error.role, 'alert');
  assert.equal(error.status['aria-live'], 'polite');
});
test('plain input has no combobox role; disabled names remain present', () => {
  const view = accessibility(createState({ value: ['A'], disabled: true }));
  assert.equal(view.input.role, undefined);
  assert.equal(view.input.disabled, true);
  assert.equal(view.tokens[0].remove.disabled, true);
  assert.equal(view.tokens[0].remove['aria-label'], 'Remove A');
});
test('invalid controlled arrays fail early instead of silently normalizing parent state', () => {
  for (const value of [[''], [' untrimmed'], ['A', 'a'], ['one,two'], ['Cafe\u0301']]) assert.throws(() => createState({ value }), TypeError);
});
test('reducer does not mutate its input state or parent arrays', () => {
  const value = Object.freeze(['A']);
  const state = createState({ value });
  Object.freeze(state.value);
  Object.freeze(state.focus);
  Object.freeze(state);
  const next = reduce(state, { type: 'remove', index: 0 });
  assert.deepEqual(state.value, ['A']);
  assert.deepEqual(next.effects[0].value, []);
});
