import { describe, expect, it } from 'vitest';
import { registry } from './registry';
import {
  assessRepair,
  demoEvidence,
  planMaintenance,
  type MaintenanceEvidence,
  type RepairResult,
} from './maintenance';
const evidence: MaintenanceEvidence = {
  id: 'local-drift',
  kind: 'derived-drift',
  origin: 'local-check',
  summary: 'Generated index differs from source.',
  artifact: 'registry-index',
  sourceRevision: registry.revision,
  observedRevision: 0,
};
const success: RepairResult = {
  registryRevision: registry.revision,
  attempt: 1,
  changedFiles: ['agentic-dist/registry-index.json'],
  artifactPaths: ['agentic-dist/registry-index.json'],
  sourceChanged: false,
  testsChanged: false,
  oracleChanged: false,
  checksPassed: true,
  driftRemaining: false,
};
describe('bounded deterministic maintenance', () => {
  it('never treats examples as evidence authorizing mutation', () => {
    const plan = planMaintenance(demoEvidence, { expectedRegistryRevision: registry.revision });
    expect(plan.automatic).toEqual([]);
    expect(plan.review).toHaveLength(3);
  });
  it('allows only observed local derived drift for automatic regeneration', () => {
    const plan = planMaintenance([evidence], { expectedRegistryRevision: registry.revision });
    expect(plan.status).toBe('local-regeneration-available');
    expect(plan.automatic[0].operation).toBe('regenerate-derived-artifact');
    expect(assessRepair(plan, success).status).toBe('verified');
  });
  it.each(['behavior-defect', 'new-capability', 'test-failure'] as const)(
    'routes %s to review',
    (kind) => {
      const plan = planMaintenance([{ ...evidence, kind }], { expectedRegistryRevision: registry.revision });
      expect(plan.automatic).toEqual([]);
      expect(plan.status).toBe('owner-review-required');
    },
  );
  it('rejects stale planning and stale execution', () => {
    expect(() => planMaintenance([evidence], { expectedRegistryRevision: 0 })).toThrow(/Stale/);
    const plan = planMaintenance([evidence], { expectedRegistryRevision: registry.revision });
    expect(assessRepair(plan, { ...success, registryRevision: registry.revision + 1 }).status).toBe(
      'owner-review-required',
    );
  });
  it.each(['sourceChanged', 'testsChanged', 'oracleChanged'] as const)('protects %s', (flag) => {
    const plan = planMaintenance([evidence], { expectedRegistryRevision: registry.revision });
    expect(assessRepair(plan, { ...success, [flag]: true }).status).toBe('owner-review-required');
  });
  it('does not trust caller-provided artifact paths as permission', () => {
    const plan = planMaintenance([evidence], { expectedRegistryRevision: registry.revision });
    expect(
      assessRepair(plan, {
        ...success,
        changedFiles: ['src/agentic/registry.test.ts'],
        artifactPaths: ['src/agentic/registry.test.ts'],
      }).status,
    ).toBe('owner-review-required');
    expect(
      assessRepair(plan, { ...success, changedFiles: ['agentic-dist/../package.json'] }).status,
    ).toBe('owner-review-required');
  });
  it('enforces repair limits without weakening checks', () => {
    expect(() =>
      planMaintenance([evidence], { expectedRegistryRevision: registry.revision, maxAttempts: 3 }),
    ).toThrow(/bounded/);
    const plan = planMaintenance([evidence], { expectedRegistryRevision: registry.revision, maxAttempts: 2 });
    expect(
      assessRepair(plan, { ...success, checksPassed: false, driftRemaining: true }).status,
    ).toBe('retry-allowed');
    expect(
      assessRepair(plan, { ...success, attempt: 2, checksPassed: false, driftRemaining: true })
        .status,
    ).toBe('owner-review-required');
    expect(assessRepair(plan, { ...success, attempt: 3 }).status).toBe('owner-review-required');
  });
});
