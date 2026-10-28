import { describe, expect, it } from 'vitest';
import {
  contractCatalogue,
  getContractCoverage,
  getContractEntry,
  searchContracts,
} from './contracts';

describe('canonical contract discovery', () => {
  it('reports API documentation and authored requirements separately', () => {
    const coverage = getContractCoverage();
    expect(coverage.apiFamilies).toBe(103);
    expect(coverage.authoredComponentPatternContracts).toBe(27);
    expect(coverage.apiFamiliesWithAuthoredBehavior).toBe(25);
    expect(coverage.apiFamiliesWithoutAuthoredBehavior).toBe(78);
    expect(coverage.authoredOnlyEntries).toBe(2);
    expect(coverage.systemProtocolContracts).toBe(2);
  });
  it('resolves explicit registry/API identities without conflating related patterns', () => {
    expect(getContractEntry(' dialog ')).toBe(getContractEntry('components-overlays-modal'));
    expect(getContractEntry('page-layout')).toBe(getContractEntry('patterns-pagelayout'));
    expect(getContractEntry('dataset-filtering')?.contract?.id).toBe('dataset-filtering');
    expect(getContractEntry('patterns-filterbar')?.contract?.id).toBe('filter-bar');
    expect(getContractEntry('filter-bar')).not.toBe(getContractEntry('dataset-filtering'));
    expect(getContractEntry('components-people-avatar')?.contract).toBeNull();
    expect(getContractEntry('not-present')).toBeUndefined();
  });
  it('searches task aliases while retaining explicit coverage distinctions', () => {
    expect(
      searchContracts('atomic multi').some((entry) => entry.registryId === 'token-input'),
    ).toBe(true);
    expect(searchContracts('filter bar').some((entry) => entry.id === 'dataset-filtering')).toBe(
      true,
    );
    expect(searchContracts('nonexistent-capability')).toEqual([]);
    expect(searchContracts('')).toHaveLength(contractCatalogue.entries.length);
  });
  it('keeps protocol requirements outside component behavior counts', () => {
    const protocol = getContractEntry('workspace-api');
    expect(protocol?.kind).toBe('protocol');
    expect(protocol?.coverage.systemContractAuthored).toBe(true);
    expect(protocol?.coverage.behaviorAuthored).toBe(false);
    expect(protocol?.contract?.version).toBeNull();
  });
  it('exposes exact raw requirements and reported evidence without certifying them', () => {
    const token = getContractEntry('token-input')!;
    expect(JSON.parse(token.contract!.raw)).toEqual(token.contract!.document);
    expect(token.evidence[0].reportedStatus).toBeTruthy();
    expect(token.limitations.join(' ')).toContain(
      'does not rerun checks or establish owner approval',
    );
    expect(getContractEntry('button')?.coverage.checksLinked).toBe(false);
  });
  it('does not let callers mutate shared catalogue state', () => {
    expect(Object.isFrozen(contractCatalogue)).toBe(true);
    expect(Object.isFrozen(getContractEntry('token-input')!.contract!.document)).toBe(true);
    const results = searchContracts('');
    results.pop();
    expect(searchContracts('')).toHaveLength(contractCatalogue.entries.length);
  });
});
