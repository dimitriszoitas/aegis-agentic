import { registry, type Registry } from './registry';

export type MaintenanceEvidence = {
  id: string;
  kind: 'derived-drift' | 'behavior-defect' | 'new-capability' | 'test-failure';
  origin: 'illustrative-fixture' | 'local-check';
  summary: string;
  artifact?: 'registry-index' | 'profile-tokens' | 'contract-docs';
  sourceRevision: number;
  observedRevision?: number;
};
export const demoEvidence: MaintenanceEvidence[] = [
  {
    id: 'example-index-drift',
    kind: 'derived-drift',
    origin: 'illustrative-fixture',
    summary: 'Example: generated discovery index refers to an older canonical revision.',
    artifact: 'registry-index',
    sourceRevision: 1,
    observedRevision: 0,
  },
  {
    id: 'example-duplicate-policy',
    kind: 'behavior-defect',
    origin: 'illustrative-fixture',
    summary: 'Example: two TokenInput proposals disagree about duplicate feedback.',
    sourceRevision: 1,
  },
  {
    id: 'example-new-capability',
    kind: 'new-capability',
    origin: 'illustrative-fixture',
    summary: 'Example: a consumer requests asynchronous value validation.',
    sourceRevision: 1,
  },
];
export type MaintenancePlan = {
  expectedRegistryRevision: number;
  maxAttempts: number;
  automatic: {
    evidenceId: string;
    artifact: NonNullable<MaintenanceEvidence['artifact']>;
    operation: 'regenerate-derived-artifact';
    sourceRevision: number;
  }[];
  review: { evidenceId: string; reason: string }[];
  status: 'local-regeneration-available' | 'owner-review-required' | 'no-action';
  preserves: ['source-contracts', 'acceptance-tests', 'visual-oracles'];
  prohibited: string[];
};

/** Plans deterministic derived-file repair only. No model, file write, commit or publication occurs. */
export function planMaintenance(
  evidence: MaintenanceEvidence[],
  options: { expectedRegistryRevision: number; maxAttempts?: number },
  source: Registry = registry,
): MaintenancePlan {
  if (options.expectedRegistryRevision !== source.revision)
    throw new Error('Stale registry revision. Refresh maintenance evidence before planning.');
  const maxAttempts = options.maxAttempts ?? 1;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2)
    throw new Error('Repair attempts must be bounded to one or two.');
  const automatic: MaintenancePlan['automatic'] = [];
  const review: MaintenancePlan['review'] = [];
  const ids = new Set<string>();
  for (const item of evidence) {
    if (!item.id?.trim() || ids.has(item.id) || !item.summary?.trim())
      throw new Error('Evidence needs a unique ID and a nonempty summary.');
    ids.add(item.id);
    if (!['derived-drift', 'behavior-defect', 'new-capability', 'test-failure'].includes(item.kind))
      throw new Error('Unknown evidence kind.');
    if (!['illustrative-fixture', 'local-check'].includes(item.origin))
      throw new Error('Unknown evidence origin.');
    if (!Number.isSafeInteger(item.sourceRevision) || item.sourceRevision < 1)
      throw new Error('Evidence source revision must be positive.');
    if (item.origin === 'illustrative-fixture') {
      review.push({
        evidenceId: item.id,
        reason:
          'Illustrative evidence demonstrates classification only; run a local check before any repair.',
      });
      continue;
    }
    if (item.sourceRevision !== source.revision) {
      review.push({
        evidenceId: item.id,
        reason: 'Evidence is stale; rerun the local check against the current source revision.',
      });
      continue;
    }
    if (item.kind !== 'derived-drift') {
      review.push({
        evidenceId: item.id,
        reason:
          item.kind === 'test-failure'
            ? 'A failing acceptance test requires diagnosis. Never rewrite the test or expected result to obtain a pass.'
            : 'Behavior and capability changes require an owner-reviewed proposal.',
      });
      continue;
    }
    if (
      !item.artifact ||
      !['registry-index', 'profile-tokens', 'contract-docs'].includes(item.artifact)
    )
      throw new Error('Derived repair supports only allowlisted generated artifacts.');
    if (
      !Number.isSafeInteger(item.observedRevision) ||
      Number(item.observedRevision) < 0 ||
      Number(item.observedRevision) > source.revision
    )
      throw new Error('Observed revision must be a valid past or current revision.');
    automatic.push({
      evidenceId: item.id,
      artifact: item.artifact,
      operation: 'regenerate-derived-artifact',
      sourceRevision: source.revision,
    });
  }
  return {
    expectedRegistryRevision: source.revision,
    maxAttempts,
    automatic,
    review,
    status: automatic.length
      ? 'local-regeneration-available'
      : review.length
        ? 'owner-review-required'
        : 'no-action',
    preserves: ['source-contracts', 'acceptance-tests', 'visual-oracles'],
    prohibited: [
      'Change canonical source or behavior without owner review.',
      'Delete, relax or rewrite acceptance tests or visual baselines.',
      'Commit, push, publish or install dependencies as an automatic repair.',
      'Retry beyond the recorded attempt budget.',
    ],
  };
}

export type RepairResult = {
  registryRevision: number;
  attempt: number;
  changedFiles: string[];
  artifactPaths: string[];
  sourceChanged: boolean;
  testsChanged: boolean;
  oracleChanged: boolean;
  checksPassed: boolean;
  driftRemaining: boolean;
};
export function assessRepair(
  plan: MaintenancePlan,
  result: RepairResult,
): { status: 'verified' | 'retry-allowed' | 'owner-review-required'; reason: string } {
  if (!Number.isInteger(result.attempt) || result.attempt < 1)
    throw new Error('Attempt number must be positive.');
  if (result.registryRevision !== plan.expectedRegistryRevision)
    return {
      status: 'owner-review-required',
      reason: 'The registry changed during repair. Rebase and rerun local checks.',
    };
  if (!plan.automatic.length)
    return {
      status: 'owner-review-required',
      reason: 'This plan does not authorize regeneration.',
    };
  if (result.attempt > plan.maxAttempts)
    return { status: 'owner-review-required', reason: 'The repair attempt budget is exhausted.' };
  if (result.sourceChanged || result.testsChanged || result.oracleChanged)
    return {
      status: 'owner-review-required',
      reason: 'Protected source, tests or visual oracles changed. The repair cannot be accepted.',
    };
  const permittedPaths: Record<NonNullable<MaintenanceEvidence['artifact']>, string[]> = {
    'registry-index': ['agentic-dist/registry-index.json'],
    'profile-tokens': ['agentic-dist/profile-tokens.css', 'agentic-dist/profile-tokens.json'],
    'contract-docs': ['agentic-dist/contracts.json'],
  };
  const allowlist = plan.automatic.flatMap((action) => permittedPaths[action.artifact]);
  if (
    result.changedFiles.some((path) => !allowlist.includes(path)) ||
    result.artifactPaths.some((path) => !allowlist.includes(path))
  )
    return {
      status: 'owner-review-required',
      reason: 'Repair touched a file outside the generated-artifact allowlist.',
    };
  if (result.checksPassed && !result.driftRemaining)
    return {
      status: 'verified',
      reason:
        'Local checks confirm derived files match unchanged source. No behavioral repair is claimed.',
    };
  return result.attempt < plan.maxAttempts
    ? {
        status: 'retry-allowed',
        reason:
          'One bounded regeneration attempt remains; protected checks and source must stay unchanged.',
      }
    : {
        status: 'owner-review-required',
        reason: 'Regeneration did not resolve the issue within the attempt budget.',
      };
}
