import { describe, expect, it } from 'vitest';
import buttonFacts from '../../public/ai/components/components-actions-button.json';
import {
  buildConfigurabilityInventory,
  type ConfigurabilityInput,
  type ConfigurationRecord,
} from './configurability';

const pin = {
  projectId: 'project-a',
  releaseId: 'release-1',
  kitVersion: '0.1.0-experiment.0',
  registryRevision: 1,
};
const facts: ConfigurabilityInput['components'][number] = {
  schemaVersion: 1,
  id: 'button',
  name: 'Button',
  importPaths: ['@example/button'],
  props: [
    { component: 'Button', name: 'size', type: '"sm" | "md" | undefined', defaultValue: '"md"' },
    { component: 'Button', name: 'disabled', type: 'boolean | undefined', defaultValue: 'false' },
    { component: 'Button', name: 'children', type: 'ReactNode' },
  ],
  variants: [{ name: 'size', values: ['md', 'sm'], default: 'md' }],
};
const fixture = (): ConfigurabilityInput => ({
  schemaVersion: 1,
  pin: { ...pin },
  components: [structuredClone(facts)],
  themeAxes: { mode: ['light', 'dark'], presentation: ['fundamental', 'fundamental-floating'] },
});
const record = (overrides: Partial<ConfigurationRecord> = {}): ConfigurationRecord => ({
  schemaVersion: 1,
  id: 'verified-1',
  pin: { ...pin },
  componentId: 'button',
  status: 'passed',
  configuration: {
    props: { 'Button.size': 'md', 'Button.disabled': false },
    theme: { mode: 'light', presentation: 'fundamental' },
  },
  evidencePath: 'artifacts/button-light.json',
  verifiedAt: '2026-10-27T12:00:00Z',
  checks: ['keyboard', 'render'],
  ...overrides,
});

describe('configurability inventory from supplied API facts', () => {
  it('extracts finite variants, booleans, defaults and unconstrained props', () => {
    const result = buildConfigurabilityInventory(fixture());
    expect(result.status).toBe('ready');
    expect(result.components[0].dimensions.find((value) => value.name === 'size')).toMatchObject({
      id: 'Button.size',
      allowedValues: ['md', 'sm'],
      defaultValue: 'md',
      defaultKnown: true,
      axis: 'presentation',
      axisBasis: 'name-heuristic',
    });
    expect(result.components[0].booleanControls).toEqual(['Button.disabled']);
    expect(result.components[0].unconstrainedProps).toEqual(['Button.children']);
    expect(result.summary).toEqual({
      components: 1,
      configurableDimensions: 3,
      constrainedProps: 2,
      unconstrainedProps: 1,
      verifiedConfigurations: 0,
      plannedRecords: 0,
    });
  });
  it('consumes actual public API component metadata without loading a catalogue into core', () => {
    const result = buildConfigurabilityInventory({
      schemaVersion: 1,
      pin: { ...pin, kitVersion: buttonFacts.package.version },
      components: [buttonFacts],
    });
    expect(result.status).toBe('ready');
    expect(result.components[0].componentId).toBe('components-actions-button');
    expect(
      result.components[0].dimensions.find((value) => value.name === 'intent')?.allowedValues,
    ).toEqual(['ai', 'default', 'destroy', 'function']);
    expect(result.components[0].unconstrainedProps).toContain('Button.leadingIcon');
  });
  it('calls Cartesian counts estimates and never converts possible variants into coverage', () => {
    const component = buildConfigurabilityInventory(fixture()).components[0];
    expect(component.estimate).toEqual({
      combinations: 16,
      cap: 1_000_000,
      capped: false,
      kind: 'finite-cartesian-estimate-not-coverage',
      excludesUnconstrainedProps: true,
      conditionalCombinationsVerified: false,
    });
    expect(component.coverage).toMatchObject({
      verifiedConfigurations: 0,
      verifiedRecordIds: [],
      status: 'unverified',
    });
  });
  it('caps estimates without pretending the cap is an exhaustive count', () => {
    const result = buildConfigurabilityInventory(fixture(), { combinationCap: 5 });
    expect(result.components[0].estimate).toMatchObject({ combinations: 5, cap: 5, capped: true });
    expect(buildConfigurabilityInventory(fixture(), { combinationCap: 0 }).status).toBe('blocked');
  });
  it('parses only finite literal source types and never executes source expressions', () => {
    const input = fixture();
    input.components[0].props = [
      {
        name: 'placement',
        type: "'top' | 'bottom' | undefined",
        defaultValue: "'top'",
        axis: 'presentation',
      },
      { name: 'count', type: '1 | 2 | undefined', defaultValue: '2' },
      { name: 'custom', type: 'string | FancyType', defaultValue: 'computeDefault()' },
      { name: 'callback', type: '(value: "a" | "b") => void' },
    ];
    input.components[0].variants = [];
    const result = buildConfigurabilityInventory(input);
    expect(
      result.components[0].dimensions.find((value) => value.name === 'placement'),
    ).toMatchObject({
      allowedValues: ['bottom', 'top'],
      defaultValue: 'top',
      axisBasis: 'declared',
    });
    expect(
      result.components[0].dimensions.find((value) => value.name === 'count')?.allowedValues,
    ).toEqual(['1', '2']);
    expect(result.components[0].dimensions.find((value) => value.name === 'custom')).toMatchObject({
      kind: 'unconstrained',
      defaultKnown: false,
      defaultSource: 'computeDefault()',
    });
    expect(result.components[0].unconstrainedProps).toContain('Button.callback');
  });
  it('keeps compound prop identities distinct and avoids applying ambiguous variants', () => {
    const input = fixture();
    input.components[0].props.push({ component: 'ButtonIcon', name: 'size', type: 'number' });
    const result = buildConfigurabilityInventory(input);
    expect(
      result.components[0].dimensions.find((value) => value.id === 'ButtonIcon.size')
        ?.allowedValues,
    ).toBeNull();
    expect(
      result.components[0].dimensions.find((value) => value.id === 'Button.size')?.allowedValues,
    ).toEqual(['md', 'sm']);
  });
  it('rejects unknown schema, kit and package identities rather than guessing compatibility', () => {
    for (const change of [
      { schemaVersion: 2 },
      { pin: { ...pin, kitVersion: '99.0.0' } },
      { pin: { ...pin, kitVersion: 'latest' } },
      { pin: { ...pin, registryRevision: 0 } },
    ])
      expect(buildConfigurabilityInventory({ ...fixture(), ...change }).status).toBe('blocked');
    const input = fixture();
    input.components[0].schemaVersion = 2;
    expect(buildConfigurabilityInventory(input).status).toBe('blocked');
    input.components[0].schemaVersion = 1;
    input.components[0].package = { name: 'other', version: '2.0.0' };
    expect(buildConfigurabilityInventory(input).status).toBe('blocked');
    expect(
      buildConfigurabilityInventory(
        { ...fixture(), pin: { ...pin, kitVersion: '0.2.0' } },
        { supportedKitVersions: ['0.2.0'] },
      ).status,
    ).toBe('ready');
  });
  it('rejects duplicate component/prop IDs and invalid declared defaults', () => {
    const input = fixture();
    input.components.push(structuredClone(input.components[0]));
    expect(buildConfigurabilityInventory(input).status).toBe('blocked');
    input.components.pop();
    input.components[0].props.push(structuredClone(input.components[0].props[0]));
    expect(buildConfigurabilityInventory(input).status).toBe('blocked');
    input.components[0].props.pop();
    input.components[0].variants![0].default = 'xl';
    expect(buildConfigurabilityInventory(input).status).toBe('blocked');
  });
  it('is deterministic despite catalogue, prop, variant-value and theme order', () => {
    const input = fixture();
    const reordered = structuredClone(input);
    reordered.components[0].props.reverse();
    reordered.components[0].variants![0].values.reverse();
    reordered.themeAxes = {
      presentation: ['fundamental-floating', 'fundamental'],
      mode: ['dark', 'light'],
    };
    expect(buildConfigurabilityInventory(reordered)).toEqual(buildConfigurabilityInventory(input));
  });
  it('counts only explicitly verified configurations, deduplicating equivalent records', () => {
    const input = fixture();
    input.verification = [record(), record({ id: 'verified-2' })];
    const result = buildConfigurabilityInventory(input);
    expect(result.summary.verifiedConfigurations).toBe(1);
    expect(result.components[0].coverage.verifiedRecordIds).toEqual(['verified-1', 'verified-2']);
    expect(result.components[0].coverage.status).toBe('explicit-records-only');
  });
  it('does not count planned or failed records as verification', () => {
    const input = fixture();
    input.verification = [
      record({ id: 'plan', status: 'planned' }),
      record({ id: 'failure', status: 'failed' }),
    ];
    const result = buildConfigurabilityInventory(input);
    expect(result.summary).toMatchObject({ verifiedConfigurations: 0, plannedRecords: 1 });
    expect(result.components[0].coverage.failedRecordIds).toEqual(['failure']);
  });
  it('rejects all records sharing an identity rather than accepting an arbitrary first result', () => {
    const input = fixture();
    input.verification = [record(), record({ status: 'failed' })];
    const result = buildConfigurabilityInventory(input);
    expect(result.summary.verifiedConfigurations).toBe(0);
    expect(result.rejectedVerification).toHaveLength(2);
  });
  it('rejects stale, incomplete, unsupported and evidence-free verification records explicitly', () => {
    const input = fixture();
    input.verification = [
      record({ id: 'stale', pin: { ...pin, releaseId: 'other' } }),
      record({ id: 'no-evidence', evidencePath: '' }),
      record({ id: 'bad-date', verifiedAt: 'later' }),
      record({ id: 'partial', configuration: { props: { 'Button.size': 'md' }, theme: {} } }),
      record({
        id: 'unknown-option',
        configuration: {
          props: { 'Button.size': 'xl', 'Button.disabled': false },
          theme: { mode: 'light', presentation: 'fundamental' },
        },
      }),
      { ...record({ id: 'future-schema' }), schemaVersion: 2 } as unknown as ConfigurationRecord,
    ];
    const result = buildConfigurabilityInventory(input);
    expect(result.status).toBe('ready');
    expect(result.summary.verifiedConfigurations).toBe(0);
    expect(result.rejectedVerification).toHaveLength(6);
  });
  it('keeps input immutable and returns JSON-compatible data', () => {
    const input = fixture();
    const before = structuredClone(input);
    const result = buildConfigurabilityInventory(input);
    expect(input).toEqual(before);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
