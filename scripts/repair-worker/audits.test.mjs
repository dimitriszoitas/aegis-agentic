import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyOracleResult, containmentFailures, getAudit, audits } from './audits.mjs';

const rectangle = (left, right, top, bottom) => ({
  left,
  right,
  top,
  bottom,
  width: right - left,
  height: bottom - top,
});
const geometry = () => ({
  contentLeft: 20,
  contentRight: 300,
  contentTop: 20,
  contentBottom: 180,
  value: rectangle(20, 180, 30, 70),
  chart: rectangle(190, 300, 30, 70),
  overflow: false,
});

test('trusted registry has finite exact CSS scope and rejects prototype names', () => {
  const audit = getAudit('metric-containment');
  assert.deepEqual(audit.allowedPaths, [
    'src/components/metric-card/metric-card.css',
    'src/components/sparkline/sparkline.css',
  ]);
  assert.equal(audit.maxAttempts, 2);
  assert.equal(audit.policyVersion, '1');
  assert.match(audit.instructions, /visibly painted sparkline/);
  assert.equal(audit.reproduce, audit.verify);
  assert(Object.isFrozen(audits) && Object.isFrozen(audit) && Object.isFrozen(audit.allowedPaths));
  for (const id of ['__proto__', 'constructor', 'other'])
    assert.throws(() => getAudit(id), /Unknown trusted/);
});

test('canonical oracle accepts wrapping that preserves visibility and separation', () => {
  assert.deepEqual(containmentFailures(geometry()), []);
  const wrapped = geometry();
  wrapped.chart = rectangle(20, 130, 90, 130);
  assert.deepEqual(containmentFailures(wrapped), []);
});

test('canonical oracle rejects escaping chart, overlapping value and collapsed chart', () => {
  const escape = geometry();
  escape.chart = rectangle(190, 400, 30, 70);
  escape.overflow = true;
  assert.deepEqual(containmentFailures(escape), [
    'sparkline stays inside card padding',
    'Metric has no horizontal overflow',
  ]);
  const overlap = geometry();
  overlap.chart = rectangle(170, 280, 30, 70);
  assert.deepEqual(containmentFailures(overlap), ['Value and sparkline do not overlap']);
  const hidden = geometry();
  hidden.chart = rectangle(190, 190, 30, 70);
  assert(containmentFailures(hidden).includes('sparkline remains visible'));
  const transparent = geometry();
  transparent.visible = { value: true, sparkline: false };
  assert(containmentFailures(transparent).includes('sparkline remains visibly rendered'));
  const widened = geometry();
  widened.hostOverflow = true;
  widened.documentOverflow = true;
  assert.deepEqual(containmentFailures(widened), [
    'Metric stays inside its allocated host',
    'Document has no horizontal overflow',
  ]);
  const collapsed = geometry();
  collapsed.chartBelowMinimum = true;
  assert(
    containmentFailures(collapsed).includes('Sparkline preserves its approved minimum dimensions'),
  );
});

test('transport success is insufficient without the complete existing browser matrix', () => {
  const report = { checks: Array.from({ length: 28 }, () => ({})), errors: [] };
  assert.equal(classifyOracleResult({ status: 'passed', blocked: [] }, report, 0), 'passed');
  assert.equal(classifyOracleResult({ status: 'passed' }, { ...report, checks: [] }, 0), 'error');
  assert.equal(classifyOracleResult({ status: 'passed' }, report, 1), 'error');
  assert.equal(classifyOracleResult(undefined, report, 0), 'error');
  assert.equal(classifyOracleResult({ status: 'passed' }, undefined, 0), 'error');
});

test('only authentic assertion failures allow repair; runtime, blocked network and timeout cannot', () => {
  const report = { checks: [], errors: [] };
  assert.equal(classifyOracleResult({ status: 'failed' }, report, 1), 'failed');
  assert.equal(classifyOracleResult({ status: 'failed' }, report, null), 'error');
  assert.equal(classifyOracleResult({ status: 'error' }, report, 1), 'error');
  assert.equal(
    classifyOracleResult({ status: 'failed', blocked: ['https://example.com'] }, report, 1),
    'error',
  );
  assert.equal(
    classifyOracleResult({ status: 'failed' }, { ...report, errors: ['Runtime error'] }, 1),
    'error',
  );
});
