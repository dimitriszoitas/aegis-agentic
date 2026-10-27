import { describe, expect, it } from 'vitest';
import { buildConfigurabilityInventory, type InfrastructurePin } from './configurability';
import { planInfrastructureUpdate, type InfrastructureUpdateSnapshot } from './updates';

const pin = (releaseId = 'release-1'): InfrastructurePin => ({
  projectId: 'project-a',
  releaseId,
  kitVersion: '0.1.0-experiment.0',
  registryRevision: 1,
});
const inventory = (releaseId: string) =>
  buildConfigurabilityInventory({
    schemaVersion: 1,
    pin: pin(releaseId),
    components: [
      {
        schemaVersion: 1,
        id: 'button',
        name: 'Button',
        importPaths: ['@example/button'],
        props: [
          { name: 'size', type: '"sm" | "md" | undefined', defaultValue: '"md"' },
          { name: 'disabled', type: 'boolean | undefined', defaultValue: 'false' },
        ],
        variants: [],
      },
    ],
    themeAxes: { mode: ['light', 'dark'] },
  });
const snapshot = (releaseId = 'release-1'): InfrastructureUpdateSnapshot => ({
  schemaVersion: 1,
  pin: pin(releaseId),
  registry: {
    schemaVersion: 1,
    revision: 1,
    entries: [
      {
        id: 'button',
        importPath: '@example/button',
        version: 1,
        capabilities: ['activate'],
        behavior: { commitOnBlur: false },
      },
    ],
  },
  inventory: inventory(releaseId),
  tokenManifest: {
    version: 1,
    configurations: ['fundamental.light', 'fundamental.dark'],
    tokens: { '--group-button-fill': { tier: 'group', value: 'var(--semantic-fill)' } },
  },
});
const options = {
  projectId: 'project-a',
  pinnedReleaseId: 'release-1',
  usageCounts: { button: 7 },
};

describe('static infrastructure update planning', () => {
  it('returns no-op for unchanged contracts without inferring new verified coverage', () => {
    const plan = planInfrastructureUpdate(snapshot(), snapshot(), options);
    expect(plan.status).toBe('no-op');
    expect(plan.impacts).toEqual([]);
    expect(plan.requiresOwnerReview).toBe(false);
    expect(plan.evidence).toMatchObject({
      migration: 'planned-not-executed',
      runtimeVerification: 'not-performed',
      coverageInherited: false,
    });
  });
  it('detects removed components and changed import paths as breaking', () => {
    const next = snapshot('release-2');
    next.registry!.entries = [];
    let plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts.find((impact) => impact.kind === 'component-removed')).toMatchObject({
      severity: 'breaking',
      componentId: 'button',
      affectedUsageCount: 7,
    });
    next.registry!.entries = [{ id: 'button', importPath: '@example/new-button' }];
    plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts.find((impact) => impact.kind === 'import-changed')?.severity).toBe(
      'breaking',
    );
  });
  it('reports removed props and enum options as breaking and changed defaults as review', () => {
    const next = snapshot('release-2');
    const dimensions = next.inventory!.components[0].dimensions;
    next.inventory!.components[0].dimensions = dimensions.filter(
      (prop) => prop.name !== 'disabled',
    );
    const size = next.inventory!.components[0].dimensions[0];
    size.allowedValues = ['sm'];
    size.defaultValue = 'sm';
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(
      plan.impacts.filter((impact) => impact.severity === 'breaking').map((impact) => impact.kind),
    ).toEqual(['enum-value-removed', 'prop-removed']);
    expect(plan.impacts.find((impact) => impact.kind === 'default-changed')?.severity).toBe(
      'review',
    );
  });
  it('classifies optional API and enum additions as additive review', () => {
    const next = snapshot('release-2');
    const size = next.inventory!.components[0].dimensions.find((prop) => prop.name === 'size')!;
    size.allowedValues!.push('lg');
    next.registry!.entries.push({ id: 'card', importPath: '@example/card' });
    next.inventory!.components[0].dimensions.push({
      ...size,
      id: 'Button.align',
      name: 'align',
      defaultValue: 'sm',
    });
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.status).toBe('review-required');
    expect(
      plan.impacts.filter((impact) =>
        ['enum-value-added', 'component-added', 'prop-added'].includes(impact.kind),
      ),
    ).toHaveLength(3);
    expect(plan.impacts.every((impact) => impact.severity === 'additive')).toBe(true);
    expect(plan.requiresOwnerReview).toBe(true);
  });
  it('treats newly required props and unbounded-domain narrowing conservatively', () => {
    const before = snapshot();
    const next = snapshot('release-2');
    before.inventory!.components[0].dimensions[0].allowedValues = null;
    next.inventory!.components[0].dimensions[0].required = true;
    const plan = planInfrastructureUpdate(before, next, options);
    expect(plan.impacts.find((impact) => impact.kind === 'prop-domain-changed')?.severity).toBe(
      'breaking',
    );
    expect(plan.impacts.find((impact) => impact.kind === 'prop-required-changed')?.severity).toBe(
      'breaking',
    );
  });
  it('routes behavior changes to review without calling them verified repairs', () => {
    const next = snapshot('release-2');
    next.registry!.entries[0].behavior = { commitOnBlur: true };
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts.find((impact) => impact.kind === 'behavior-changed')).toMatchObject({
      severity: 'review',
      before: { commitOnBlur: false },
      after: { commitOnBlur: true },
    });
    expect(plan.applied).toBe(false);
    expect(plan.automaticActions).toEqual([]);
  });
  it('detects removed, added, re-tiered and changed token definitions', () => {
    const next = snapshot('release-2');
    next.tokenManifest!.tokens = {
      '--group-new-fill': { tier: 'group', value: 'var(--semantic-new)' },
    };
    let plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts.map((impact) => impact.kind)).toEqual(['token-added', 'token-removed']);
    next.tokenManifest = structuredClone(snapshot().tokenManifest);
    next.tokenManifest!.tokens['--group-button-fill'].value = 'var(--semantic-other)';
    plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts[0]).toMatchObject({
      kind: 'token-definition-changed',
      severity: 'review',
      affectedUsageCount: 7,
      usageBasis: 'all-supplied-components-potential',
    });
    next.tokenManifest!.tokens['--group-button-fill'].tier = 'semantic';
    expect(planInfrastructureUpdate(snapshot(), next, options).impacts[0].severity).toBe(
      'breaking',
    );
  });
  it('detects configuration and theme domain removals', () => {
    const next = snapshot('release-2');
    next.tokenManifest!.configurations.pop();
    next.inventory!.themeAxes.mode = ['light'];
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts.map((impact) => impact.kind)).toEqual([
      'configuration-removed',
      'theme-value-removed',
    ]);
    expect(plan.impacts.every((impact) => impact.severity === 'breaking')).toBe(true);
  });
  it('does not double-count supplied instances across multiple impacts', () => {
    const next = snapshot('release-2');
    next.registry!.entries[0].importPath = '@example/new';
    next.registry!.entries[0].behavior = { changed: true };
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.impacts).toHaveLength(2);
    expect(plan.summary).toMatchObject({
      affectedComponents: 1,
      affectedUsageCount: 7,
      usageComplete: true,
    });
  });
  it('distinguishes missing usage evidence from a measured zero', () => {
    const next = snapshot('release-2');
    next.registry!.entries[0].behavior = { changed: true };
    const unknown = planInfrastructureUpdate(snapshot(), next, {
      projectId: 'project-a',
      pinnedReleaseId: 'release-1',
    });
    expect(unknown.impacts[0].affectedUsageCount).toBeNull();
    expect(unknown.summary.usageComplete).toBe(false);
    const zero = planInfrastructureUpdate(snapshot(), next, {
      ...options,
      usageCounts: { button: 0 },
    });
    expect(zero.impacts[0].affectedUsageCount).toBe(0);
    expect(zero.summary.usageComplete).toBe(true);
  });
  it('requires identical comparison dimensions on both snapshots', () => {
    const next = snapshot('release-2');
    delete next.inventory;
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.status).toBe('blocked');
    expect(plan.issues[0].code).toBe('incomplete-comparison');
    expect(plan.impacts).toEqual([]);
  });
  it('blocks unknown schema versions and unknown or nonliteral kit versions', () => {
    for (const version of ['99.0.0', 'latest', '^0.1.0']) {
      const next = snapshot('release-2');
      next.pin.kitVersion = version;
      expect(planInfrastructureUpdate(snapshot(), next, options).status).toBe('blocked');
    }
    for (const field of ['schemaVersion', 'registry', 'tokenManifest', 'inventory'] as const) {
      const next = snapshot('release-2') as unknown as Record<string, unknown>;
      if (field === 'schemaVersion') next[field] = 2;
      else
        (next[field] as Record<string, unknown>)[
          field === 'tokenManifest' ? 'version' : 'schemaVersion'
        ] = 2;
      expect(planInfrastructureUpdate(snapshot(), next, options).status).toBe('blocked');
    }
  });
  it('requires matching project and pinned source identity', () => {
    expect(
      planInfrastructureUpdate(snapshot(), snapshot('release-2'), {
        ...options,
        projectId: 'other',
      }).status,
    ).toBe('blocked');
    expect(
      planInfrastructureUpdate(snapshot(), snapshot('release-2'), {
        ...options,
        pinnedReleaseId: 'outdated',
      }).status,
    ).toBe('blocked');
    const next = snapshot('release-2');
    next.inventory!.pin!.releaseId = 'different';
    expect(planInfrastructureUpdate(snapshot(), next, options).status).toBe('blocked');
  });
  it('blocks content changes under an unchanged immutable release identity', () => {
    const next = snapshot();
    next.registry!.entries[0].behavior = { changed: true };
    const plan = planInfrastructureUpdate(snapshot(), next, options);
    expect(plan.status).toBe('blocked');
    expect(plan.issues[0].code).toBe('immutable-release-changed');
    expect(plan.impacts).toEqual([]);
  });
  it('blocks registry rollbacks and invalid usage data', () => {
    const before = snapshot();
    before.pin.registryRevision = 2;
    before.registry!.revision = 2;
    before.inventory!.pin!.registryRevision = 2;
    expect(planInfrastructureUpdate(before, snapshot('release-2'), options).status).toBe('blocked');
    expect(
      planInfrastructureUpdate(snapshot(), snapshot('release-2'), {
        ...options,
        usageCounts: { button: -1 },
      }).status,
    ).toBe('blocked');
  });
  it('ignores ordering changes while retaining deterministic plans and caller data', () => {
    const before = snapshot();
    const next = snapshot('release-2');
    next.inventory!.components[0].dimensions.reverse();
    next.inventory!.themeAxes.mode.reverse();
    next.tokenManifest!.configurations.reverse();
    const saved = structuredClone(next);
    const plan = planInfrastructureUpdate(before, next, options);
    expect(plan.status).toBe('no-op');
    expect(next).toEqual(saved);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });
  it('supports registry-only snapshots and explicit known kit upgrades', () => {
    const before = snapshot();
    const next = snapshot('release-2');
    delete before.inventory;
    delete before.tokenManifest;
    delete next.inventory;
    delete next.tokenManifest;
    next.pin.kitVersion = '0.2.0';
    const plan = planInfrastructureUpdate(before, next, {
      ...options,
      supportedKitVersions: ['0.1.0-experiment.0', '0.2.0'],
    });
    expect(plan.status).toBe('review-required');
    expect(plan.impacts[0].kind).toBe('kit-version-changed');
  });
  it('rejects cyclic/non-JSON snapshots and absent project pins without throwing', () => {
    const cyclic: Record<string, unknown> = { ...snapshot() };
    cyclic.cycle = cyclic;
    expect(planInfrastructureUpdate(cyclic, snapshot(), options).status).toBe('blocked');
    expect(
      planInfrastructureUpdate({ ...snapshot(), execute: () => {} }, snapshot(), options).status,
    ).toBe('blocked');
    expect(planInfrastructureUpdate(snapshot(), snapshot()).status).toBe('blocked');
  });
});
