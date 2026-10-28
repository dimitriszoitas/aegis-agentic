import { describe, expect, it } from 'vitest';
import {
  applyConsolidation,
  compareProposals as compareAgainstRegistry,
  discoverRegistry,
  planConsolidation as planAgainstRegistry,
  proposals,
  registry as currentRegistry,
  proposalExampleRegistry as registry,
  validateProposal as validateAgainstRegistry,
  validateRegistry,
  type OwnerApproval,
} from './registry';

// Exercise the original conflict fixture against its real revision, not the installed registry.
const compareProposals: typeof compareAgainstRegistry = (a, b, source = registry) => compareAgainstRegistry(a, b, source);
const planConsolidation: typeof planAgainstRegistry = (ids, options, source = registry, candidates = proposals) => planAgainstRegistry(ids, options, source, candidates);
const validateProposal: typeof validateAgainstRegistry = (proposal, source = registry) => validateAgainstRegistry(proposal, source);

describe('canonical registry and proposal review', () => {
  it('discovers the experimental consolidated implementation without fabricating owner approval', () => {
    expect(validateRegistry(currentRegistry).valid).toBe(true);
    const entry = discoverRegistry('token-input').find((item) => item.id === 'token-input');
    expect(entry?.importPath).toBe('@dimitriszoitas/aegis-agentic/agentic');
    expect(entry?.version).toBe(2);
    expect(entry?.provenance.reviewedBy).toBeNull();
    expect(() => planAgainstRegistry(proposals.map((p) => p.id), { expectedRevision: currentRegistry.revision })).toThrow();
  });
  it('validates imported registry shape, canonical identity and provenance', () => {
    expect(validateRegistry(registry).valid).toBe(true);
    expect(validateRegistry(null).valid).toBe(false);
    expect(validateRegistry({ ...registry, revision: 0 }).valid).toBe(false);
    expect(
      validateRegistry({
        ...registry,
        entries: [registry.entries[0], registry.entries[0]],
      }).issues.some((issue) => issue.code === 'duplicate-id'),
    ).toBe(true);
    expect(
      validateRegistry({
        ...registry,
        entries: [{ ...registry.entries[0], capabilities: ['same', 'same'] }],
      }).valid,
    ).toBe(false);
    expect(
      validateRegistry({
        ...registry,
        entries: [
          {
            ...registry.entries[0],
            provenance: {
              origin: 'owner-reviewed-proposal',
              source: 'candidate',
              reviewedBy: null,
            },
          },
        ],
      }).valid,
    ).toBe(false);
  });
  it('discovers canonical components by alias and capability', () => {
    expect(discoverRegistry('modal')[0].id).toBe('dialog');
    expect(discoverRegistry('filter dataset')[0].id).toBe('dataset-filtering');
    expect(discoverRegistry('unicorn')).toEqual([]);
    expect(discoverRegistry('')).toHaveLength(currentRegistry.entries.length);
  });
  it('does not misrepresent fixtures as independent generation', () => {
    expect(proposals.every((proposal) => proposal.evidence === 'illustrative-fixture')).toBe(true);
    expect(proposals.every((proposal) => validateProposal(proposal).valid)).toBe(true);
  });
  it('finds duplicate intent and preserves behavioral conflicts', () => {
    const comparison = compareProposals(proposals[0], proposals[1]);
    expect(comparison.duplicate).toBe(true);
    expect(comparison.conflicts.map((conflict) => conflict.field)).toEqual([
      'behavior.duplicatePolicy',
      'behavior.commitKeys',
    ]);
    expect(comparison.recommendation).toBe('consolidate-after-owner-review');
  });
  it('rejects malformed, missing-state and unknown-property proposals', () => {
    expect(validateProposal(null).valid).toBe(false);
    expect(
      validateProposal({ ...proposals[0], requiredStates: ['empty'] }).issues.some(
        (issue) => issue.code === 'required-states',
      ),
    ).toBe(true);
    expect(validateProposal({ ...proposals[0], themeOverride: '#ff0000' }).valid).toBe(false);
    expect(
      validateProposal({ ...proposals[0], behavior: { ...proposals[0].behavior, freeText: false } })
        .valid,
    ).toBe(false);
  });
  it('rejects stale candidate revisions and stale consolidation requests', () => {
    expect(
      validateProposal({ ...proposals[0], baseRegistryRevision: 0 }).issues.some(
        (issue) => issue.code === 'stale-revision',
      ),
    ).toBe(true);
    expect(() =>
      planConsolidation(
        proposals.map((proposal) => proposal.id),
        { expectedRevision: 0 },
      ),
    ).toThrow(/Stale/);
  });
  it('produces a reviewable plan without mutating the registry', () => {
    const before = JSON.stringify(registry);
    const plan = planConsolidation(
      proposals.map((proposal) => proposal.id),
      { expectedRevision: registry.revision },
    );
    expect(plan.requiresOwnerReview).toBe(true);
    expect(plan.conflicts).toHaveLength(2);
    expect(JSON.stringify(registry)).toBe(before);
  });
  it('requires explicit owner identity, rationale and verification evidence', () => {
    const plan = planConsolidation(
      proposals.map((proposal) => proposal.id),
      { expectedRevision: registry.revision },
    );
    expect(() => applyConsolidation(registry, plan, {} as OwnerApproval)).toThrow(
      /Explicit owner approval/,
    );
    const approval: OwnerApproval = {
      decision: 'approve',
      reviewedBy: 'test-owner',
      rationale: 'Test-only fixture approval.',
      acceptedBehavior: proposals[0].behavior,
      verification: {
        testsPassed: true,
        visualReviewed: true,
        evidencePath: 'test-only-evidence.json',
      },
    };
    const result = applyConsolidation(registry, plan, approval);
    expect(() =>
      applyConsolidation(
        registry,
        { ...plan, candidate: { ...plan.candidate, name: 'Tampered' } },
        approval,
      ),
    ).toThrow(/differs from current proposals/);
    expect(result.revision).toBe(2);
    expect(result.entries.at(-1)?.behavior?.duplicatePolicy).toBe('reject');
    expect(result.entries.at(-1)?.provenance.reviewedBy).toBe('test-owner');
    expect(registry.revision).toBe(1);
    expect(() => applyConsolidation(result, plan, approval)).toThrow(/Stale/);
  });
  it('rejects unknown or repeated proposal IDs', () => {
    expect(() => planConsolidation(['missing', 'also-missing'], { expectedRevision: 1 })).toThrow(
      /Unknown/,
    );
    expect(() =>
      planConsolidation([proposals[0].id, proposals[0].id], { expectedRevision: 1 }),
    ).toThrow(/distinct/);
  });
  it('cannot promote candidate A implementation while approving candidate B behavior', () => {
    const candidates = [
      {
        ...structuredClone(proposals[0]),
        id: 'reviewed-candidate-a',
        implementation: 'reviewed/candidate-a/model.mjs',
        behavior: { ...proposals[0].behavior, commitKeys: ['Enter'] },
      },
      {
        ...structuredClone(proposals[1]),
        id: 'reviewed-candidate-b',
        implementation: 'reviewed/candidate-b/model.mjs',
      },
    ];
    const before = JSON.stringify({ registry, candidates });
    const planA = planConsolidation(
      candidates.map((candidate) => candidate.id),
      { expectedRevision: registry.revision },
      registry,
      candidates,
    );
    const approvalB: OwnerApproval = {
      decision: 'approve',
      reviewedBy: 'test-owner',
      rationale: 'Select the reviewed candidate B implementation and its ignore policy.',
      acceptedBehavior: candidates[1].behavior,
      verification: {
        testsPassed: true,
        visualReviewed: true,
        evidencePath: 'reviewed/candidate-b/evidence.json',
      },
    };
    expect(() => applyConsolidation(registry, planA, approvalB, candidates)).toThrow(
      /Accepted behavior differs from the reviewed implementation candidate/,
    );
    expect(JSON.stringify({ registry, candidates })).toBe(before);

    // A newly reviewed plan selecting B is valid and retains B's actual source path.
    const planB = planConsolidation(
      [candidates[1].id, candidates[0].id],
      { expectedRevision: registry.revision },
      registry,
      candidates,
    );
    const promoted = applyConsolidation(registry, planB, approvalB, candidates).entries.at(-1);
    expect(promoted?.importPath).toBe(candidates[1].implementation);
    expect(promoted?.behavior).toEqual(candidates[1].behavior);
    expect(promoted?.behavior?.duplicatePolicy).toBe('ignore');
  });
});
