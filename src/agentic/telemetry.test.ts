import { describe, expect, it, vi } from 'vitest';
import {
  createUsageCollector,
  summarizeUsage,
  usageLimits,
  validateStoredUsage,
  validateUsageEvent,
  validateUsagePolicy,
  type UsageEvent,
  type UsagePolicy,
  type UsageRecord,
} from './telemetry';

const policy: UsagePolicy = {
  version: 1,
  registries: ['aegis'],
  profiles: ['aegis', 'atlas'],
  components: {
    button: {
      props: {
        variant: { type: 'enum', values: ['primary', 'secondary'] },
        disabled: { type: 'boolean' },
      },
    },
    'token-input': { props: { duplicatePolicy: { type: 'enum', values: ['ignore', 'reject'] } } },
  },
};
const record: UsageRecord = {
  registryId: 'aegis',
  registryRevision: 1,
  componentId: 'button',
  profileId: 'aegis',
  kind: 'render',
  mode: 'light',
  presentation: 'fundamental',
  props: { variant: 'primary', disabled: false },
};
const event: UsageEvent = { version: 1, timestamp: 1000, ...record };

describe('explicit usage telemetry', () => {
  it('accepts only versioned finite policies and approved coarse events', () => {
    expect(validateUsagePolicy(policy)).toEqual({ valid: true, issues: [] });
    expect(validateUsageEvent(event, policy).valid).toBe(true);
    for (const invalid of [
      null,
      { ...policy, version: 2 },
      { ...policy, metadata: {} },
      { ...policy, registries: ['aegis', 'aegis'] },
      { ...policy, profiles: ['https://private.example'] },
      { ...policy, components: { button: { props: { text: { type: 'string' } } } } },
      {
        ...policy,
        components: { button: { props: { label: { type: 'enum', values: ['private'] } } } },
      },
      { ...policy, components: { button: { props: { apiKey: { type: 'boolean' } } } } },
      {
        ...policy,
        components: {
          button: { props: { variant: { type: 'enum', values: ['private user text'] } } },
        },
      },
      {
        ...policy,
        components: {
          button: { props: { variant: { type: 'enum', values: ['x'], metadata: true } } },
        },
      },
    ])
      expect(validateUsagePolicy(invalid).valid).toBe(false);
  });

  it('rejects unknown fields, free text, unapproved identifiers and malformed context without echoing them', () => {
    const secret = 'a private email@example.org';
    for (const invalid of [
      null,
      [],
      { ...event, version: 2 },
      { ...event, timestamp: -1 },
      { ...event, timestamp: NaN },
      { ...event, timestamp: '2026-10-27' },
      { ...event, registryRevision: 0 },
      { ...event, registryRevision: Number.MAX_SAFE_INTEGER + 1 },
      { ...event, registryId: 'unknown' },
      { ...event, componentId: 'unknown' },
      { ...event, profileId: 'unknown' },
      { ...event, kind: 'keypress' },
      { ...event, mode: 'auto' },
      { ...event, presentation: 'custom' },
      { ...event, [secret]: secret },
      { ...event, props: { [secret]: secret } },
      { ...event, props: { variant: secret } },
      { ...event, props: { disabled: 'false' } },
      { ...event, props: { label: secret } },
      { ...event, props: undefined },
      { ...event, props: { variant: { value: 'primary' } } },
      { ...event, props: { variant: 'primary', url: 'https://private.example' } },
      { ...event, props: JSON.parse('{"__proto__":"primary"}') },
    ]) {
      const result = validateUsageEvent(invalid, policy);
      expect(result.valid).toBe(false);
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    const getter = vi.fn(() => secret);
    const accessor = { ...event };
    Object.defineProperty(accessor, 'label', { get: getter, enumerable: true });
    expect(validateUsageEvent(accessor, policy).valid).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(validateUsageEvent(Object.assign(Object.create({}), event), policy).valid).toBe(false);
    const registryIds = ['aegis'];
    Object.defineProperty(registryIds, '0', { get: getter, enumerable: true });
    expect(validateUsagePolicy({ ...policy, registries: registryIds }).valid).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it('collects nothing by default, does not inspect disabled input, and clears when disabled', () => {
    const clock = vi.fn(() => 1000);
    const collector = createUsageCollector({ policy, clock });
    expect(collector.enabled).toBe(false);
    expect(collector.record(record)).toEqual({ accepted: false, reason: 'disabled', issues: [] });
    collector.restore({ version: 1, events: [event] });
    expect(collector.getEvents()).toEqual([]);
    expect(collector.export()).toEqual({ version: 1, events: [] });
    expect(collector.summarize().eventCount).toBe(0);
    expect(clock).not.toHaveBeenCalled();
    collector.setEnabled(true);
    expect(collector.record(record).accepted).toBe(true);
    collector.setEnabled(false);
    collector.setEnabled(true);
    expect(collector.getEvents()).toEqual([]);
  });

  it('assigns time itself, rejects entire events containing unapproved data and keeps diagnostics clean', () => {
    const collector = createUsageCollector({ policy, enabled: true, clock: () => 1000 });
    expect(collector.record({ ...record, timestamp: 0 }).accepted).toBe(false);
    expect(collector.record(event).accepted).toBe(false);
    const rejected = collector.record({
      ...record,
      props: { variant: 'primary', label: 'private text' },
    });
    expect(rejected.accepted).toBe(false);
    expect(JSON.stringify(rejected)).not.toContain('private text');
    expect(collector.getEvents()).toHaveLength(0);
    expect(collector.record(record).accepted).toBe(true);
    expect(collector.getEvents()).toEqual([event]);
    collector.clear();
    expect(collector.summarize().eventCount).toBe(0);
  });

  it('captures permission policy and event values without sharing mutable references', () => {
    const mutablePolicy = structuredClone(policy);
    const input = structuredClone(record);
    const collector = createUsageCollector({
      policy: mutablePolicy,
      enabled: true,
      clock: () => 1000,
    });
    mutablePolicy.components.button.props!.extra = { type: 'boolean' };
    expect(collector.record({ ...record, props: { extra: true } }).accepted).toBe(false);
    collector.record(input);
    input.props!.variant = 'secondary';
    const exported = collector.export();
    exported.events[0].props!.variant = 'secondary';
    collector.getEvents()[0].props!.variant = 'secondary';
    expect(collector.getEvents()[0].props!.variant).toBe('primary');
    const restored = collector.restore({ version: 1, events: [event] });
    restored.events[0].props!.variant = 'secondary';
    expect(collector.getEvents()[0].props!.variant).toBe('primary');
  });

  it('bounds retained events and expires events at reads as well as writes', () => {
    let now = 1000;
    const collector = createUsageCollector({
      policy,
      enabled: true,
      maxEvents: 2,
      maxAgeMs: 100,
      clock: () => now,
    });
    collector.record(record);
    now = 1010;
    collector.record({ ...record, kind: 'action' });
    now = 1020;
    collector.record({ ...record, kind: 'error' });
    expect(collector.getEvents().map((item) => item.timestamp)).toEqual([1010, 1020]);
    expect(collector.summarize().byKind).toEqual({
      render: 0,
      action: 1,
      configuration: 0,
      error: 1,
    });
    now = 1110;
    expect(collector.getEvents()).toHaveLength(2);
    now = 1111;
    expect(collector.export().events.map((item) => item.kind)).toEqual(['error']);
    now = 1121;
    expect(collector.summarize().eventCount).toBe(0);
  });

  it('enforces hard limits and refuses invalid clocks and policy', () => {
    for (const maxEvents of [0, -1, 1.5, usageLimits.maxEvents + 1, NaN])
      expect(() => createUsageCollector({ policy, maxEvents })).toThrow();
    for (const maxAgeMs of [0, 1.1, usageLimits.maxAgeMs + 1, Infinity])
      expect(() => createUsageCollector({ policy, maxAgeMs })).toThrow();
    expect(() =>
      createUsageCollector({ policy: { ...policy, version: 2 } as unknown as UsagePolicy }),
    ).toThrow();
    expect(() =>
      createUsageCollector({ policy, enabled: true, clock: () => NaN }).record(record),
    ).toThrow(/clock/);
    expect(() => summarizeUsage(Array(usageLimits.maxEvents + 1).fill(event), policy)).toThrow(
      /bounded/,
    );
  });

  it('salvages safe stored records, removes expired/future ones and keeps newest records deterministically', () => {
    const persisted = {
      version: 1,
      events: [
        { ...event, timestamp: 990, kind: 'action' },
        { ...event, timestamp: 950 },
        { ...event, timestamp: 995, kind: 'error' },
        { ...event, timestamp: 900 },
        { ...event, timestamp: 1001 },
        { ...event, timestamp: 999, label: 'private text' },
        { ...event, timestamp: 990, kind: 'configuration' },
      ],
    };
    const result = validateStoredUsage(JSON.stringify(persisted), policy, {
      maxEvents: 2,
      maxAgeMs: 50,
      now: 1000,
    });
    expect(result.events.map((item) => item.kind)).toEqual(['configuration', 'error']);
    expect(result).toMatchObject({ rejected: 2, expired: 1, truncated: 2 });
    expect(JSON.stringify(result)).not.toContain('private text');
    expect(result.issues.map((item) => item.code)).toEqual([
      'future-timestamp',
      'invalid-event-shape',
    ]);
    for (const corrupt of [
      '{',
      'null',
      null,
      [],
      { version: 2, events: [] },
      { version: 1, events: [event], metadata: 'private' },
      { version: 1, events: Array(usageLimits.maxEvents + 1).fill(event) },
      { version: 1, events: Array(1) },
    ])
      expect(validateStoredUsage(corrupt, policy, { now: 1000 })).toMatchObject({
        events: [],
        rejected: 1,
      });
  });

  it('reports deterministic window counts rather than retaining raw event content', () => {
    const events = [
      event,
      {
        ...event,
        timestamp: 1030,
        kind: 'action',
        mode: 'dark',
        profileId: 'atlas',
        props: { variant: 'secondary', disabled: true },
      },
      {
        ...event,
        timestamp: 1020,
        registryRevision: 2,
        componentId: 'token-input',
        kind: 'configuration',
        presentation: 'fundamental-floating',
        props: { duplicatePolicy: 'reject' },
      },
      { ...event, timestamp: 1010, kind: 'error', props: {} },
    ];
    const summary = summarizeUsage([...events, { ...event, url: 'private' }], policy);
    expect(summary).toEqual({
      version: 1,
      eventCount: 4,
      rejectedEvents: 1,
      firstTimestamp: 1000,
      lastTimestamp: 1030,
      byKind: { render: 1, action: 1, configuration: 1, error: 1 },
      byComponent: { button: 3, 'token-input': 1 },
      byProfile: { aegis: 3, atlas: 1 },
      byMode: { light: 3, dark: 1 },
      byPresentation: { fundamental: 3, 'fundamental-floating': 1 },
      byRegistry: { aegis: 4 },
      byRegistryRevision: { aegis: { '1': 3, '2': 1 } },
      byPropValue: {
        button: { disabled: { false: 1, true: 1 }, variant: { primary: 1, secondary: 1 } },
        'token-input': { duplicatePolicy: { reject: 1 } },
      },
    });
    expect(JSON.stringify(summarizeUsage(events, policy))).toBe(
      JSON.stringify(summarizeUsage([...events].reverse(), policy)),
    );
    expect(summarizeUsage([], policy)).toMatchObject({
      eventCount: 0,
      firstTimestamp: null,
      lastTimestamp: null,
      byComponent: {},
    });
  });
});
