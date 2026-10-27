/** Explicit, local usage events only. This module never reads UI, storage, or the network. */
export type UsageKind = 'render' | 'action' | 'configuration' | 'error';
export type UsageMode = 'light' | 'dark';
export type UsagePresentation = 'fundamental' | 'fundamental-floating';
export type UsagePropRule = { type: 'boolean' } | { type: 'enum'; values: readonly string[] };
export type UsagePolicy = {
  version: 1;
  registries: readonly string[];
  profiles: readonly string[];
  components: Record<string, { props?: Record<string, UsagePropRule> }>;
};
export type UsageEvent = {
  version: 1;
  timestamp: number;
  registryId: string;
  registryRevision: number;
  componentId: string;
  profileId: string;
  kind: UsageKind;
  mode: UsageMode;
  presentation: UsagePresentation;
  props?: Record<string, boolean | string>;
};
export type Event = UsageEvent;
export type UsageRecord = Omit<UsageEvent, 'version' | 'timestamp'>;
export type UsageExport = { version: 1; events: UsageEvent[] };
export type UsageIssue = { code: string; message: string };
export type UsageValidation = { valid: boolean; issues: UsageIssue[] };
export type UsageSummary = {
  version: 1;
  eventCount: number;
  rejectedEvents: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  byKind: Record<UsageKind, number>;
  byComponent: Record<string, number>;
  byProfile: Record<string, number>;
  byMode: Record<UsageMode, number>;
  byPresentation: Record<UsagePresentation, number>;
  byRegistry: Record<string, number>;
  byRegistryRevision: Record<string, Record<string, number>>;
  byPropValue: Record<string, Record<string, Record<string, number>>>;
};

export const usageLimits = Object.freeze({
  defaultMaxEvents: 500,
  maxEvents: 10_000,
  defaultMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxAgeMs: 90 * 24 * 60 * 60 * 1000,
  // Accommodates 10000 maximum-shape valid events while bounding JSON parsing.
  maxStoredCharacters: 32 * 1024 * 1024,
  maxComponents: 1_000,
  maxProps: 16,
  maxEnumValues: 32,
});

const kinds: readonly string[] = ['render', 'action', 'configuration', 'error'];
const modes: readonly string[] = ['light', 'dark'];
const presentations: readonly string[] = ['fundamental', 'fundamental-floating'];
const eventKeys = [
  'version',
  'timestamp',
  'registryId',
  'registryRevision',
  'componentId',
  'profileId',
  'kind',
  'mode',
  'presentation',
  'props',
];
const idPattern = /^[a-z][a-z0-9-]{0,63}$/;
const tokenPattern = /^[A-Za-z][A-Za-z0-9_-]{0,47}$/;
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
// A finite enum is not permission to collect content or credentials under a familiar prop name.
const contentPropNames = new Set([
  'label',
  'arialabel',
  'arialabelledby',
  'title',
  'description',
  'text',
  'content',
  'children',
  'name',
  'id',
  'url',
  'href',
  'src',
  'html',
  'innerhtml',
  'outerhtml',
  'dom',
  'metadata',
  'password',
  'credential',
  'credentials',
  'secret',
  'token',
  'apikey',
  'authorization',
  'cookie',
  'email',
  'username',
]);
type JsonObject = Record<string, unknown>;

function object(value: unknown): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  // Getters and symbols are not JSON data. Do not invoke accessors while validating.
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    return typeof key === 'string' && descriptor.enumerable && 'value' in descriptor;
  });
}

function keys(value: JsonObject, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function array(value: unknown, maximum: number): value is unknown[] {
  if (
    !Array.isArray(value) ||
    value.length > maximum ||
    Object.getPrototypeOf(value) !== Array.prototype
  )
    return false;
  const names = Reflect.ownKeys(value);
  if (names.length !== value.length + 1) return false;
  return names.every((name) => {
    if (name === 'length') return true;
    if (typeof name !== 'string' || !/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= value.length)
      return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, name)!;
    return descriptor.enumerable && 'value' in descriptor;
  });
}

function identifier(value: unknown): value is string {
  return typeof value === 'string' && idPattern.test(value) && !reserved.has(value);
}

function token(value: unknown): value is string {
  return typeof value === 'string' && tokenPattern.test(value) && !reserved.has(value);
}

function propName(value: unknown): value is string {
  return token(value) && !contentPropNames.has(value.replace(/[-_]/g, '').toLowerCase());
}

function list(value: unknown, maximum: number, check: (value: unknown) => boolean) {
  return (
    array(value, maximum) &&
    value.length > 0 &&
    value.every(check) &&
    new Set(value).size === value.length
  );
}

function fail(code: string, message: string): UsageValidation {
  return { valid: false, issues: [{ code, message }] };
}

/** Policies contain only technical identifiers and finite choices, never user-provided content. */
export function validateUsagePolicy(input: unknown): UsageValidation {
  if (
    !object(input) ||
    !keys(input, ['version', 'registries', 'profiles', 'components']) ||
    input.version !== 1
  )
    return fail('invalid-policy', 'A version 1 policy with only supported fields is required.');
  if (!list(input.registries, 64, identifier) || !list(input.profiles, 128, identifier))
    return fail(
      'invalid-policy-identifiers',
      'Registry and profile allowlists require unique safe identifiers within their limits.',
    );
  if (!object(input.components) || Object.keys(input.components).length > usageLimits.maxComponents)
    return fail(
      'invalid-policy-components',
      'The component allowlist must be an object within its limit.',
    );
  for (const [id, component] of Object.entries(input.components)) {
    if (!identifier(id) || !object(component) || !keys(component, ['props']))
      return fail(
        'invalid-policy-component',
        'Component rules require a safe identifier and supported fields.',
      );
    if (!Object.hasOwn(component, 'props')) continue;
    if (!object(component.props) || Object.keys(component.props).length > usageLimits.maxProps)
      return fail('invalid-policy-props', 'Prop allowlists must be objects within their limit.');
    for (const [name, rule] of Object.entries(component.props)) {
      if (!propName(name) || !object(rule))
        return fail(
          'invalid-policy-prop',
          'Prop rules require safe technical names and finite boolean or enum choices; content and credential props are prohibited.',
        );
      if (rule.type === 'boolean' && keys(rule, ['type'])) continue;
      if (
        rule.type === 'enum' &&
        keys(rule, ['type', 'values']) &&
        list(rule.values, usageLimits.maxEnumValues, token)
      )
        continue;
      return fail(
        'invalid-policy-prop',
        'Prop rules require finite boolean or enum choices within their limits.',
      );
    }
  }
  return { valid: true, issues: [] };
}

function assertPolicy(policy: UsagePolicy): UsagePolicy {
  const validation = validateUsagePolicy(policy);
  if (!validation.valid) throw new Error(validation.issues[0].message);
  return policy;
}

function validateEvent(input: unknown, policy: UsagePolicy): UsageValidation {
  if (!object(input) || !keys(input, eventKeys))
    return fail(
      'invalid-event-shape',
      'Usage events must be plain JSON objects with only supported fields.',
    );
  if (input.version !== 1) return fail('invalid-event-version', 'Usage event version must be 1.');
  if (!Number.isSafeInteger(input.timestamp) || (input.timestamp as number) < 0)
    return fail(
      'invalid-timestamp',
      'Timestamp must be a nonnegative integer in epoch milliseconds.',
    );
  if (!Number.isSafeInteger(input.registryRevision) || (input.registryRevision as number) < 1)
    return fail('invalid-registry-revision', 'Registry revision must be a positive safe integer.');
  if (!identifier(input.registryId) || !policy.registries.includes(input.registryId))
    return fail('unapproved-registry', 'Registry identifier is not allowlisted.');
  if (!identifier(input.profileId) || !policy.profiles.includes(input.profileId))
    return fail('unapproved-profile', 'Profile identifier is not allowlisted.');
  if (!identifier(input.componentId) || !Object.hasOwn(policy.components, input.componentId))
    return fail('unapproved-component', 'Component identifier is not allowlisted.');
  if (typeof input.kind !== 'string' || !kinds.includes(input.kind))
    return fail('invalid-kind', 'Usage kind must be render, action, configuration, or error.');
  if (typeof input.mode !== 'string' || !modes.includes(input.mode))
    return fail('invalid-mode', 'Usage mode must be light or dark.');
  if (typeof input.presentation !== 'string' || !presentations.includes(input.presentation))
    return fail(
      'invalid-presentation',
      'Usage presentation must be fundamental or fundamental-floating.',
    );
  if (Object.hasOwn(input, 'props')) {
    if (!object(input.props) || Object.keys(input.props).length > usageLimits.maxProps)
      return fail('invalid-props', 'Usage props must be a JSON object within the prop limit.');
    const allowed = policy.components[input.componentId].props ?? {};
    for (const [name, value] of Object.entries(input.props)) {
      if (!Object.hasOwn(allowed, name))
        return fail(
          'unapproved-prop',
          'A supplied prop is not explicitly allowlisted for this component.',
        );
      const rule = allowed[name];
      if (rule.type === 'boolean' && typeof value === 'boolean') continue;
      if (rule.type === 'enum' && typeof value === 'string' && rule.values.includes(value))
        continue;
      return fail(
        'unapproved-prop-value',
        'A supplied prop value is outside its approved boolean or enum choices.',
      );
    }
  }
  return { valid: true, issues: [] };
}

/** Rejected values and field names are deliberately absent from diagnostics. */
export function validateUsageEvent(input: unknown, policy: UsagePolicy): UsageValidation {
  const validation = validateUsagePolicy(policy);
  return validation.valid ? validateEvent(input, policy) : validation;
}

function copyEvent(event: UsageEvent): UsageEvent {
  return {
    version: 1,
    timestamp: event.timestamp,
    registryId: event.registryId,
    registryRevision: event.registryRevision,
    componentId: event.componentId,
    profileId: event.profileId,
    kind: event.kind,
    mode: event.mode,
    presentation: event.presentation,
    ...(event.props
      ? {
          props: Object.fromEntries(
            Object.entries(event.props).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
          ),
        }
      : {}),
  };
}

function count(values: string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Counts describe the supplied window, not lifetime usage or unique people. Invalid events are omitted. */
export function summarizeUsage(input: readonly unknown[], policy: UsagePolicy): UsageSummary {
  assertPolicy(policy);
  if (!array(input, usageLimits.maxEvents))
    throw new RangeError('Usage summary input exceeds the bounded event limit.');
  const events = input.filter((event): event is UsageEvent => validateEvent(event, policy).valid);
  const byKind = { render: 0, action: 0, configuration: 0, error: 0 };
  const byMode = { light: 0, dark: 0 };
  const byPresentation = { fundamental: 0, 'fundamental-floating': 0 };
  for (const event of events) {
    byKind[event.kind]++;
    byMode[event.mode]++;
    byPresentation[event.presentation]++;
  }
  const byComponent = count(events.map((event) => event.componentId));
  const byRegistry = count(events.map((event) => event.registryId));
  const byRegistryRevision = Object.fromEntries(
    Object.keys(byRegistry).map((id) => [
      id,
      count(
        events
          .filter((event) => event.registryId === id)
          .map((event) => String(event.registryRevision)),
      ),
    ]),
  );
  const byPropValue = Object.fromEntries(
    Object.keys(byComponent).map((id) => {
      const componentEvents = events.filter((event) => event.componentId === id);
      const names = [
        ...new Set(componentEvents.flatMap((event) => Object.keys(event.props ?? {}))),
      ].sort();
      return [
        id,
        Object.fromEntries(
          names.map((name) => [
            name,
            count(
              componentEvents
                .filter((event) => Object.hasOwn(event.props ?? {}, name))
                .map((event) => String(event.props![name])),
            ),
          ]),
        ),
      ];
    }),
  );
  const timestamps = events.map((event) => event.timestamp);
  return {
    version: 1,
    eventCount: events.length,
    rejectedEvents: input.length - events.length,
    firstTimestamp: events.length ? Math.min(...timestamps) : null,
    lastTimestamp: events.length ? Math.max(...timestamps) : null,
    byKind,
    byComponent,
    byProfile: count(events.map((event) => event.profileId)),
    byMode,
    byPresentation,
    byRegistry,
    byRegistryRevision,
    byPropValue,
  };
}

export type UsageRetention = { maxEvents?: number; maxAgeMs?: number };
export type StoredUsageResult = {
  events: UsageEvent[];
  rejected: number;
  expired: number;
  truncated: number;
  issues: UsageIssue[];
};

function retention(options: UsageRetention) {
  const maxEvents = options.maxEvents ?? usageLimits.defaultMaxEvents;
  const maxAgeMs = options.maxAgeMs ?? usageLimits.defaultMaxAgeMs;
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > usageLimits.maxEvents)
    throw new RangeError('Event retention must be between 1 and 10000.');
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 1 || maxAgeMs > usageLimits.maxAgeMs)
    throw new RangeError('Age retention must be a positive integer no greater than 90 days.');
  return { maxEvents, maxAgeMs };
}

function currentTime(now: number) {
  if (!Number.isSafeInteger(now) || now < 0)
    throw new RangeError('Usage clock must return nonnegative integer epoch milliseconds.');
  return now;
}

/** Validates an explicit export or JSON string before storage/SDK ingestion. No storage is accessed. */
export function validateStoredUsage(
  input: unknown,
  policy: UsagePolicy,
  options: UsageRetention & { now?: number } = {},
): StoredUsageResult {
  assertPolicy(policy);
  const limits = retention(options);
  const now = currentTime(options.now ?? Date.now());
  const result: StoredUsageResult = {
    events: [],
    rejected: 0,
    expired: 0,
    truncated: 0,
    issues: [],
  };
  const corrupt = () => ({
    ...result,
    rejected: 1,
    issues: [
      {
        code: 'invalid-stored-usage',
        message: 'Stored usage must be a bounded version 1 export with only supported fields.',
      },
    ],
  });
  let data = input;
  if (typeof data === 'string') {
    if (data.length > usageLimits.maxStoredCharacters) return corrupt();
    try {
      data = JSON.parse(data);
    } catch {
      return corrupt();
    }
  }
  if (
    !object(data) ||
    !keys(data, ['version', 'events']) ||
    data.version !== 1 ||
    !array(data.events, usageLimits.maxEvents)
  )
    return corrupt();
  const codes = new Map<string, UsageIssue>();
  for (const inputEvent of data.events) {
    const validation = validateEvent(inputEvent, policy);
    if (!validation.valid) {
      result.rejected++;
      for (const issue of validation.issues) codes.set(issue.code, issue);
      continue;
    }
    const event = inputEvent as UsageEvent;
    if (event.timestamp > now) {
      result.rejected++;
      codes.set('future-timestamp', {
        code: 'future-timestamp',
        message: 'Events dated after the supplied current time are rejected.',
      });
    } else if (event.timestamp < now - limits.maxAgeMs) result.expired++;
    else result.events.push(copyEvent(event));
  }
  result.events.sort((a, b) => a.timestamp - b.timestamp);
  result.truncated = Math.max(0, result.events.length - limits.maxEvents);
  result.events = result.events.slice(result.truncated);
  result.issues = [...codes.values()].sort((a, b) => (a.code < b.code ? -1 : 1));
  return result;
}

export type UsageRecordResult = {
  accepted: boolean;
  reason?: 'disabled' | 'invalid-event';
  issues: UsageIssue[];
};
export type UsageCollectorOptions = UsageRetention & {
  policy: UsagePolicy;
  enabled?: boolean;
  clock?: () => number;
};

/** Disabled by default. Disabling clears retained data. Persistence requires explicit export/restore. */
export function createUsageCollector(options: UsageCollectorOptions) {
  assertPolicy(options.policy);
  // Capture policy so later caller mutations cannot silently expand collection permissions.
  const policy = JSON.parse(JSON.stringify(options.policy)) as UsagePolicy;
  const limits = retention(options);
  const clock = options.clock ?? Date.now;
  let enabled = options.enabled === true;
  let events: UsageEvent[] = [];
  const prune = () => {
    if (!enabled) return;
    events = validateStoredUsage({ version: 1, events }, policy, {
      ...limits,
      now: currentTime(clock()),
    }).events;
  };
  return {
    get enabled() {
      return enabled;
    },
    setEnabled(value: boolean) {
      if (typeof value !== 'boolean')
        throw new TypeError('Usage opt-in must be an explicit boolean.');
      enabled = value;
      if (!enabled) events = [];
    },
    record(input: unknown): UsageRecordResult {
      if (!enabled) return { accepted: false, reason: 'disabled', issues: [] };
      if (
        !object(input) ||
        !keys(
          input,
          eventKeys.filter((key) => key !== 'version' && key !== 'timestamp'),
        )
      )
        return {
          accepted: false,
          reason: 'invalid-event',
          issues: fail(
            'invalid-record-shape',
            'Records contain only supported event fields; version and time are assigned by the collector.',
          ).issues,
        };
      const now = currentTime(clock());
      const candidate = { ...input, version: 1, timestamp: now };
      const validation = validateEvent(candidate, policy);
      if (!validation.valid)
        return { accepted: false, reason: 'invalid-event', issues: validation.issues };
      // Prune before appending so the hard ingestion bound is never exceeded.
      events = validateStoredUsage({ version: 1, events }, policy, { ...limits, now }).events;
      events.push(copyEvent(candidate as UsageEvent));
      if (events.length > limits.maxEvents) events.shift();
      return { accepted: true, issues: [] };
    },
    clear() {
      events = [];
    },
    getEvents() {
      prune();
      return events.map(copyEvent);
    },
    export(): UsageExport {
      prune();
      return { version: 1, events: events.map(copyEvent) };
    },
    summarize() {
      prune();
      return summarizeUsage(events, policy);
    },
    restore(input: unknown): StoredUsageResult {
      if (!enabled)
        return {
          events: [],
          rejected: 0,
          expired: 0,
          truncated: 0,
          issues: [
            { code: 'disabled', message: 'Usage collection is disabled; no records were loaded.' },
          ],
        };
      const result = validateStoredUsage(input, policy, { ...limits, now: currentTime(clock()) });
      events = result.events.map(copyEvent);
      return result;
    },
  };
}
