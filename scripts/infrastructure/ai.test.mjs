import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestAdvisory, validateAdvisory } from './ai.mjs';
const context = { componentIds: ['button'], evidenceIds: ['usage'], aggregates: { renders: 12 } };
const valid = { summary: 'Review coverage for the frequently used button.', proposals: [{ id: 'button-coverage', kind: 'coverage-gap', componentId: 'button', rationale: 'Usage is recorded, but full coverage is unknown.', evidenceIds: ['usage'], suggestedAction: 'Review required button configurations.' }] };
const response = data => ({ ok: true, status: 200, text: async () => JSON.stringify(data) });
const completed = value => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }], usage: { input_tokens: 20, output_tokens: 30 } });
test('provider uses stateless structured output and returns evidence-bound proposals only', async () => {
  const result = await requestAdvisory({ apiKey: 'test-placeholder', model: 'test-model', context, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    assert.equal(body.tools, undefined); assert.equal(body.max_output_tokens, 3000);
    assert.deepEqual(JSON.parse(body.input[0].content), context);
    return response(completed(valid));
  } });
  assert.equal(result.verification, 'proposal-only'); assert.equal(result.usage.inputTokens, 20);
});
test('unknown components, invented evidence and executable extra fields are rejected', () => {
  for (const change of [{ componentId: 'unknown' }, { evidenceIds: ['invented'] }, { execute: 'anything' }]) {
    assert.throws(() => validateAdvisory({ ...valid, proposals: [{ ...valid.proposals[0], ...change }] }, context));
  }
  assert.throws(() => validateAdvisory({ ...valid, proposals: Array(9).fill(valid.proposals[0]) }, context));
});
test('refusal, truncation, non-JSON and provider failures do not become successful plans', async () => {
  for (const data of [{ status: 'incomplete' }, { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] }, { status: 'completed', output: [] }]) {
    await assert.rejects(requestAdvisory({ apiKey: 'test', model: 'test-model', context, fetchImpl: async () => response(data) }));
  }
  await assert.rejects(requestAdvisory({ apiKey: 'test', model: 'test-model', context, fetchImpl: async () => ({ ok: false, status: 429 }) }), /HTTP 429/);
  await assert.rejects(requestAdvisory({ apiKey: 'test', model: 'test-model', context, fetchImpl: async () => { throw new Error('secret-provider-details'); } }), error => !error.message.includes('secret-provider-details'));
});
test('no implicit model or missing credential can initiate a request', async () => {
  let called = false;
  await assert.rejects(requestAdvisory({ apiKey: '', model: '', context, fetchImpl: async () => { called = true; } }));
  assert.equal(called, false);
});
