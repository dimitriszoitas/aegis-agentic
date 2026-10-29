import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPushGeometry, checkDensityMeasurements } from './oracles.mjs';
import { buildRequirementInventory, plannedExecutions } from './catalogue.mjs';
import { sha256, verifiedRecords } from './evidence.mjs';

const geometry = {
  before: { x: 0, y: 0, width: 1200, height: 500 },
  after: { x: 300, y: 0, width: 900, height: 500 },
  panel: { x: 0, y: 0, width: 280, height: 500 },
  viewport: 1200,
  documentWidth: 1200,
  narrow: false,
};
test('push geometry accepts reserved space and narrow stacking', () => {
  assert.equal(checkPushGeometry(geometry).adaptation, 'push');
  assert.equal(
    checkPushGeometry({
      ...geometry,
      viewport: 390,
      documentWidth: 390,
      narrow: true,
      panel: { x: 0, y: 0, width: 390, height: 200 },
      after: { x: 0, y: 220, width: 390, height: 500 },
    }).adaptation,
    'stack',
  );
});
test('overlay instead of push fails even though panel is visible', () => {
  assert.throws(
    () => checkPushGeometry({ ...geometry, after: geometry.before }),
    /reduces results width/,
  );
  assert.throws(
    () => checkPushGeometry({ ...geometry, panel: { ...geometry.panel, x: 100 } }),
    /do not overlap/,
  );
});
test('overflow and narrow overlay fail', () => {
  assert.throws(() => checkPushGeometry({ ...geometry, documentWidth: 1500 }), /page overflow/);
  assert.throws(() => checkPushGeometry({ ...geometry, narrow: true }), /stacks before results/);
});
const measurements = (heights) =>
  ['compact', 'default', 'comfortable'].map((density, index) => ({
    density,
    selected: true,
    height: heights[index],
  }));
test('density measures real geometry rather than just changed state', () => {
  assert.equal(checkDensityMeasurements(measurements([36, 48, 60])).length, 3);
  assert.throws(() => checkDensityMeasurements(measurements([48, 48, 48])), /rendered row height/);
  assert.throws(() => checkDensityMeasurements(measurements([36, 60, 48])), /rendered row height/);
  assert.throws(
    () =>
      checkDensityMeasurements(
        measurements([36, 48, 60]).map((row) => ({ ...row, selected: false })),
      ),
    /selected control/,
  );
});
const contracts = [
  {
    id: 'data-grid',
    requirements: [
      { id: 'density-state-and-geometry', kind: 'host' },
      { id: 'unmapped', kind: 'component' },
    ],
  },
];
const plans = plannedExecutions().filter((plan) => plan.caseId === 'density-changes-rows');
test('written requirements without executed scenarios are never presented as passing', () => {
  const result = buildRequirementInventory(contracts);
  assert.equal(result[0].status, 'not-run');
  assert.equal(result[1].status, 'unsupported');
  assert.equal(result[1].executed, 0);
});
test('partial matrix stays not-run, complete matrix passes its partial scenario, and failure wins', () => {
  assert.equal(
    buildRequirementInventory(contracts, [{ ...plans[0], status: 'passed' }])[0].status,
    'not-run',
  );
  const records = plans.map((plan) => ({ ...plan, status: 'passed' }));
  assert.equal(buildRequirementInventory(contracts, records)[0].status, 'passed');
  assert.equal(buildRequirementInventory(contracts, records)[0].coverage, 'partial-scenario');
  records[0].status = 'failed';
  assert.equal(buildRequirementInventory(contracts, records)[0].status, 'failed');
});
test('host recipe evidence is not attributed to the WorkRecord FilterPanel contract', () => {
  const contract = { id: 'filter-panel', requirements: [{ id: 'panel-lifecycle', kind: 'host' }] };
  const records = plannedExecutions()
    .filter((plan) => plan.caseId === 'push-filter-layout' && plan.context.surface === 'forma')
    .map((plan) => ({ ...plan, status: 'passed' }));
  const inventory = buildRequirementInventory([contract], records)[0];
  assert.equal(inventory.status, 'not-run');
  assert.equal(inventory.executed, 0);
});
test('stale, tampered or unstable evidence is rejected before inventory joining', () => {
  const report = {
    schemaVersion: 1,
    kind: 'finite-browser-acceptance',
    sourceStableDuringRun: true,
    source: { digest: 'current' },
    records: [{ ...plans[0], sourceDigest: 'current', status: 'passed' }],
  };
  report.reportDigest = sha256(JSON.stringify(report));
  assert.equal(verifiedRecords(report, 'current').length, 1);
  assert.equal(verifiedRecords(report, 'stale').length, 0);
  assert.equal(
    verifiedRecords({ ...report, records: [{ ...report.records[0], status: 'failed' }] }, 'current')
      .length,
    0,
  );
  const unstable = { ...report, sourceStableDuringRun: false };
  delete unstable.reportDigest;
  unstable.reportDigest = sha256(JSON.stringify(unstable));
  assert.equal(verifiedRecords(unstable, 'current').length, 0);
});
