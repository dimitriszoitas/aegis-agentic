import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduce, accessibility, identity } from './model.mjs';

const validate = value => value.includes('!') ? 'Exclamation marks are not allowed.' : [...value].length > 32 ? 'Use at most 32 characters.' : null;
const config = { validate, suggestions: ['Design', 'Ops', 'Bad!'] };
const act = (state, action) => reduce(state, action, config);
const input = (state, value) => act(state, { type: 'input', value }).state;
const enter = state => act(state, { type: 'key', key: 'Enter' });
const create = options => createState(options);

test('Enter trims and commits new free text, preserving display case', () => {
  const result = enter(input(create(), '  Project Phoenix  '));
  assert.deepEqual(result.state.value, ['Project Phoenix']);
  assert.equal(result.state.draft, '');
  assert.equal(result.effects[0].reason, 'commit');
  assert.equal(result.preventDefault, true);
});

test('empty or whitespace-only submission does not create a value', () => {
  const result = enter(input(create(), '  '));
  assert.deepEqual(result.state.value, []);
  assert.equal(result.state.draft, '  ');
  assert.equal(result.state.errors[0].code, 'empty');
});

test('validation error preserves exact draft and existing values', () => {
  const result = enter(input(create({ value: ['Ops'] }), '  Bad!  '));
  assert.deepEqual(result.state.value, ['Ops']);
  assert.equal(result.state.draft, '  Bad!  ');
  assert.equal(result.state.errors[0].code, 'invalid');
  assert.equal(result.effects.some(effect => effect.type === 'change-request'), false);
});

test('correcting a validation error permits retry', () => {
  const failed = enter(input(create(), 'Bad!')).state;
  const edited = input(failed, 'Good');
  assert.deepEqual(edited.errors, []);
  assert.deepEqual(enter(edited).state.value, ['Good']);
});

test('case and surrounding whitespace do not bypass duplicate rejection', () => {
  const result = enter(input(create({ value: ['Design'] }), '  DESIGN  '));
  assert.deepEqual(result.state.value, ['Design']);
  assert.equal(result.state.draft, '  DESIGN  ');
  assert.equal(result.state.errors[0].code, 'duplicate');
});

test('canonically equivalent Unicode strings count as duplicates', () => {
  assert.equal(identity('Cafe\u0301'), identity('Café'));
  assert.equal(enter(input(create({ value: ['Café'] }), 'Cafe\u0301')).state.errors[0].code, 'duplicate');
});

test('comma is literal label text, not a commit key or paste separator', () => {
  let state = input(create(), 'Design, research');
  assert.strictEqual(act(state, { type: 'key', key: ',' }).state, state);
  assert.deepEqual(enter(state).state.value, ['Design, research']);
  state = act(create(), { type: 'paste', text: 'Alpha, Beta' }).state;
  assert.equal(state.draft, 'Alpha, Beta');
  assert.deepEqual(state.value, []);
});

test('blur preserves both a valid draft and an invalid draft without a change', () => {
  for (const draft of ['Design', 'Bad!']) {
    const state = input(create(), draft);
    const before = draft === 'Bad!' ? enter(state).state : state;
    const result = act(before, { type: 'blur' });
    assert.equal(result.state.draft, draft);
    assert.deepEqual(result.state.errors, before.errors);
    assert.deepEqual(result.effects, []);
    assert.deepEqual(result.state.value, []);
  }
});

test('multi-value paste commits lines and tabs in order, skipping empty segments', () => {
  const result = act(create(), { type: 'paste', text: ' Alpha\r\n\r\nBeta\t Gamma\n' });
  assert.deepEqual(result.state.value, ['Alpha', 'Beta', 'Gamma']);
  assert.equal(result.state.draft, '');
  assert.equal(result.effects[0].reason, 'paste');
});

test('paste replaces only the selected draft substring before parsing', () => {
  const state = input(create(), 'Old tail');
  const result = act(state, { type: 'paste', text: 'New\nOther', start: 0, end: 3 });
  assert.deepEqual(result.state.value, ['New', 'Other tail']);
});

test('one invalid pasted value rejects entire batch and retains exact pasted input', () => {
  const text = 'Good\r\nBad!\tOther ';
  const result = act(create({ value: ['Existing'] }), { type: 'paste', text });
  assert.deepEqual(result.state.value, ['Existing']);
  assert.equal(result.state.draft, text);
  assert.equal(result.state.errors[0].index, 1);
  assert.equal(result.state.errors[0].value, 'Bad!');
  assert.equal(result.effects.some(effect => effect.type === 'change-request'), false);
});

test('duplicates inside a pasted batch reject all values', () => {
  const result = act(create(), { type: 'paste', text: 'Alpha\nALPHA' });
  assert.deepEqual(result.state.value, []);
  assert.equal(result.state.draft, 'Alpha\nALPHA');
  assert.equal(result.state.errors[0].code, 'duplicate');
});

test('duplicates against committed values reject the entire pasted batch', () => {
  const result = act(create({ value: ['Alpha'] }), { type: 'paste', text: 'Beta\nalpha' });
  assert.deepEqual(result.state.value, ['Alpha']);
  assert.equal(result.state.draft, 'Beta\nalpha');
});

test('all validation errors are returned with their positions', () => {
  const result = act(create(), { type: 'paste', text: 'Bad!\nToo!\nFine' });
  assert.deepEqual(result.state.errors.map(error => error.index), [0, 1]);
  assert.deepEqual(result.state.value, []);
});

test('failed batch can be corrected and resubmitted without duplicating valid siblings', () => {
  const failed = act(create(), { type: 'paste', text: 'Alpha\nBad!' }).state;
  const result = enter(input(failed, 'Alpha\nGood'));
  assert.deepEqual(result.state.value, ['Alpha', 'Good']);
});

test('single pasted text stays in the draft until explicit submission', () => {
  const result = act(input(create(), 'pre'), { type: 'paste', text: 'fix' });
  assert.equal(result.state.draft, 'prefix');
  assert.deepEqual(result.state.value, []);
  assert.deepEqual(enter(result.state).state.value, ['prefix']);
});

test('editing Backspace never removes a token', () => {
  const state = input(create({ value: ['Alpha'] }), 'B');
  const result = act(state, { type: 'key', key: 'Backspace' });
  assert.strictEqual(result.state, state);
  assert.equal(result.preventDefault, undefined);
});

test('empty Backspace first focuses last remove control; second explicit key removes it', () => {
  const first = act(create({ value: ['Alpha', 'Beta'] }), { type: 'key', key: 'Backspace' });
  assert.deepEqual(first.state.value, ['Alpha', 'Beta']);
  assert.deepEqual(first.state.focus, { kind: 'remove', index: 1 });
  const second = act(first.state, { type: 'key', key: 'Backspace' });
  assert.deepEqual(second.state.value, ['Alpha']);
  assert.deepEqual(second.state.focus, { kind: 'remove', index: 0 });
});

test('Enter and Space activate a focused remove button and return focus when empty', () => {
  for (const key of ['Enter', ' ']) {
    const state = act(create({ value: ['Alpha'] }), { type: 'focus-remove', index: 0 }).state;
    const result = act(state, { type: 'key', key });
    assert.deepEqual(result.state.value, []);
    assert.deepEqual(result.state.focus, { kind: 'input' });
  }
});

test('removal focuses the next value at that position and preserves draft', () => {
  const result = act(input(create({ value: ['Alpha', 'Beta', 'Gamma'] }), 'unfinished'), { type: 'remove', index: 1 });
  assert.deepEqual(result.state.value, ['Alpha', 'Gamma']);
  assert.deepEqual(result.state.focus, { kind: 'remove', index: 1 });
  assert.equal(result.state.draft, 'unfinished');
});

test('invalid removal targets are no-ops', () => {
  const state = create({ value: ['Alpha'] });
  for (const index of [-1, 1, 0.5]) assert.strictEqual(act(state, { type: 'remove', index }).state, state);
});

test('IME Enter and Shift+Enter do not accidentally commit', () => {
  const state = input(create(), '東京');
  assert.strictEqual(act(state, { type: 'key', key: 'Enter', isComposing: true }).state, state);
  assert.strictEqual(act(state, { type: 'key', key: 'Enter', shiftKey: true }).state, state);
  const composing = act(state, { type: 'composition-start' }).state;
  assert.strictEqual(enter(composing).state, composing);
  assert.deepEqual(enter(act(composing, { type: 'composition-end' }).state).state.value, ['東京']);
});

test('paste during IME composition preserves text without committing', () => {
  const state = act(create(), { type: 'composition-start' }).state;
  const result = act(state, { type: 'paste', text: 'Alpha\nBeta' });
  assert.equal(result.state.draft, 'Alpha\nBeta');
  assert.deepEqual(result.state.value, []);
});

test('optional suggestion adds a validated value without destroying unrelated free-text draft', () => {
  const result = act(input(create(), 'Later'), { type: 'suggest', value: 'Design' });
  assert.deepEqual(result.state.value, ['Design']);
  assert.equal(result.state.draft, 'Later');
  assert.deepEqual(enter(result.state).state.value, ['Design', 'Later']);
});

test('suggestions obey validation and duplicate rules', () => {
  const invalid = act(input(create(), 'Keep me'), { type: 'suggest', value: 'Bad!' });
  assert.equal(invalid.state.draft, 'Keep me');
  assert.equal(invalid.state.errors[0].code, 'invalid');
  const duplicate = act(create({ value: ['Design'] }), { type: 'suggest', value: 'Design' });
  assert.equal(duplicate.state.errors[0].code, 'duplicate');
  const state = create();
  assert.strictEqual(act(state, { type: 'suggest', value: 'Unknown' }).state, state);
  assert.deepEqual(enter(input(state, 'Unknown')).state.value, ['Unknown']);
});

test('disabled state blocks input, keyboard, paste, removal, suggestion and commit', () => {
  const state = { ...input(create({ value: ['Alpha'] }), 'Draft'), disabled: true };
  for (const action of [{ type: 'input', value: 'Changed' }, { type: 'key', key: 'Enter' }, { type: 'paste', text: 'One\nTwo' }, { type: 'remove', index: 0 }, { type: 'suggest', value: 'Design' }, { type: 'commit' }]) {
    const result = act(state, action);
    assert.strictEqual(result.state, state);
    assert.deepEqual(result.effects, []);
  }
});

test('controlled request does not mutate value or clear draft before acknowledgment', () => {
  const result = enter(input(create({ controlled: true, value: ['Alpha'] }), '  Beta  '));
  assert.deepEqual(result.state.value, ['Alpha']);
  assert.equal(result.state.draft, '  Beta  ');
  assert.deepEqual(result.effects[0].value, ['Alpha', 'Beta']);
  assert.equal(result.state.pending.requestId, 1);
  const accepted = act(result.state, { type: 'sync', value: ['Alpha', 'Beta'], requestId: 1 });
  assert.deepEqual(accepted.state.value, ['Alpha', 'Beta']);
  assert.equal(accepted.state.draft, '');
  assert.equal(accepted.state.pending, null);
});

test('controlled rejection preserves submitted draft and allows retry', () => {
  const requested = enter(input(create({ controlled: true }), 'Beta')).state;
  const rejected = act(requested, { type: 'reject', requestId: 1, message: 'No access to edit labels.' }).state;
  assert.equal(rejected.draft, 'Beta');
  assert.deepEqual(rejected.value, []);
  assert.equal(rejected.errors[0].code, 'controlled-rejection');
  assert.equal(enter(rejected).state.pending.requestId, 2);
});

test('draft edits made while a controlled request is pending survive acceptance', () => {
  const requested = enter(input(create({ controlled: true }), 'Alpha')).state;
  const edited = input(requested, 'Beta');
  const accepted = act(edited, { type: 'sync', requestId: 1, value: ['Alpha'] }).state;
  assert.equal(accepted.draft, 'Beta');
  assert.deepEqual(accepted.value, ['Alpha']);
});

test('pending requests block duplicate commits and removal but keep the draft editable', () => {
  const requested = enter(input(create({ controlled: true, value: ['Existing'] }), 'Alpha')).state;
  assert.deepEqual(enter(requested).effects, []);
  assert.strictEqual(act(requested, { type: 'remove', index: 0 }).state, requested);
  const pasted = act(requested, { type: 'paste', text: '\nBeta' }).state;
  assert.equal(pasted.draft, 'Alpha\nBeta');
  assert.equal(pasted.pending.requestId, 1);
});

test('unrelated external value update cancels pending request and preserves draft', () => {
  const requested = enter(input(create({ controlled: true }), 'Alpha')).state;
  const result = act(requested, { type: 'sync', value: ['Remote'] });
  assert.deepEqual(result.state.value, ['Remote']);
  assert.equal(result.state.draft, 'Alpha');
  assert.equal(result.state.pending, null);
  assert.equal(result.state.errors[0].code, 'controlled-conflict');
});

test('stale acknowledgments and rejections cannot roll back state', () => {
  const requested = enter(input(create({ controlled: true }), 'Alpha')).state;
  assert.strictEqual(act(requested, { type: 'sync', requestId: 99, value: ['Wrong'] }).state, requested);
  assert.strictEqual(act(requested, { type: 'reject', requestId: 99 }).state, requested);
});

test('controlled removal awaits acceptance and preserves input', () => {
  const requested = act(input(create({ controlled: true, value: ['Alpha', 'Beta'] }), 'Draft'), { type: 'remove', index: 0 }).state;
  assert.deepEqual(requested.value, ['Alpha', 'Beta']);
  const accepted = act(requested, { type: 'sync', requestId: 1, value: ['Beta'] }).state;
  assert.deepEqual(accepted.value, ['Beta']);
  assert.equal(accepted.draft, 'Draft');
  assert.deepEqual(accepted.focus, { kind: 'remove', index: 0 });
});

test('external controlled updates work while disabled without requesting focus', () => {
  const state = create({ controlled: true, disabled: true });
  const result = act(state, { type: 'sync', value: ['Remote'] });
  assert.deepEqual(result.state.value, ['Remote']);
  assert.deepEqual(result.state.focus, { kind: 'outside' });
});

test('late acceptance does not steal focus after blur', () => {
  const requested = enter(input(create({ controlled: true }), 'Alpha')).state;
  const blurred = act(requested, { type: 'blur' }).state;
  assert.deepEqual(act(blurred, { type: 'sync', requestId: 1, value: ['Alpha'] }).state.focus, { kind: 'outside' });
});

test('accessibility descriptors provide visible label, error association and named non-submit buttons', () => {
  const state = enter(input(create({ value: ['Alpha'] }), 'Bad!')).state;
  const a11y = accessibility(state, ['Design']);
  assert.equal(a11y.label.htmlFor, a11y.input.id);
  assert.equal(a11y.label.text, 'Project labels');
  assert.equal(a11y.input.element, 'textarea');
  assert.equal(a11y.input['aria-invalid'], true);
  assert.ok(a11y.input['aria-describedby'].split(' ').includes(a11y.error.id));
  assert.equal(a11y.remove[0].name, 'Remove label Alpha');
  assert.equal(a11y.suggestions[0].name, 'Add suggested label Design');
  assert.equal(a11y.remove[0].type, 'button');
  assert.equal(a11y.add.name, 'Add labels');
  assert.equal(a11y.status['aria-live'], 'polite');
});

test('disabled and pending accessibility descriptors disable all mutation buttons', () => {
  const disabled = accessibility(create({ disabled: true, value: ['Alpha'] }), ['Design']);
  assert.equal(disabled.input.disabled, true);
  assert.equal(disabled.remove[0].disabled, true);
  assert.equal(disabled.suggestions[0].disabled, true);
  const pending = accessibility(enter(input(create({ controlled: true, value: ['Alpha'] }), 'Beta')).state, ['Design']);
  assert.equal(pending.add.disabled, true);
  assert.equal(pending.remove[0].disabled, true);
  assert.equal(pending.suggestions[0].disabled, true);
  assert.equal(pending.input.disabled, false);
});

test('validation exceptions or asynchronous results fail safely without data loss', () => {
  const state = input(create(), 'Alpha');
  for (const validate of [() => { throw Error('Service failure'); }, () => Promise.resolve(null)]) {
    const result = reduce(state, { type: 'commit' }, { validate });
    assert.equal(result.state.draft, 'Alpha');
    assert.deepEqual(result.state.value, []);
    assert.equal(result.state.errors[0].code, 'validation-unavailable');
  }
});

test('invalid host values and missing accessible names fail explicitly', () => {
  for (const value of [[''], [' Alpha '], ['Alpha', 'alpha'], [4]]) assert.throws(() => create({ value }), TypeError);
  assert.throws(() => create({ label: ' ' }), TypeError);
  assert.throws(() => create({ id: '' }), TypeError);
  assert.throws(() => act(create(), { type: 'sync', value: [] }), TypeError);
});

test('transitions do not mutate the input state or event data', () => {
  const state = input(create({ value: ['Existing'] }), 'Alpha');
  const original = structuredClone(state);
  Object.freeze(state.value);
  Object.freeze(state.errors);
  Object.freeze(state.focus);
  Object.freeze(state);
  const action = Object.freeze({ type: 'commit' });
  assert.deepEqual(act(state, action).state.value, ['Existing', 'Alpha']);
  assert.deepEqual(state, original);
});
