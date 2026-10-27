import {
  createUsageCollector,
  type UsageEvent,
  type UsageIssue,
  type UsagePolicy,
  type UsageRecordResult,
} from './telemetry';

export const usageClientLimits = Object.freeze({
  defaultMaxEvents: 500,
  maxEvents: 1_000,
  batchSize: 100,
  batchBytes: 60 * 1_024,
  serverReceiptWindow: 1_000,
});
export type UsageTransportResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};
export type UsageFetch = (
  endpoint: string,
  options: RequestInit,
) => Promise<UsageTransportResponse>;
export type UsageClientOptions = {
  policy: UsagePolicy;
  enabled?: boolean;
  endpoint?: string;
  maxEvents?: number;
  fetch?: UsageFetch;
  clock?: () => number;
  idFactory?: () => string;
};
export type UsageClientRecordResult = Omit<UsageRecordResult, 'reason'> & {
  reason?: 'disabled' | 'invalid-event' | 'buffer-full';
};
export type UsageFlushResult = {
  status: 'recorded' | 'duplicate' | 'disabled' | 'empty' | 'error' | 'cancelled';
  accepted: number;
  retained: number | null;
  pendingCount: number;
  batchId: string | null;
  issues: UsageIssue[];
};
export type UsageClient = {
  readonly enabled: boolean;
  readonly pendingCount: number;
  readonly inFlight: boolean;
  setEnabled(value: boolean): void;
  clear(): void;
  record(input: unknown): UsageClientRecordResult;
  flush(): Promise<UsageFlushResult>;
};
type Batch = { id: string; events: UsageEvent[]; body: string };
type Receipt =
  | { status: 'recorded' | 'duplicate'; accepted: number; retained: number }
  | { status: 'disabled'; accepted: 0 };

function safeEndpoint(endpoint: string): string {
  if (
    typeof endpoint !== 'string' ||
    !endpoint ||
    /[\\\s]/.test(endpoint) ||
    [...endpoint].some((character) => character.charCodeAt(0) < 32)
  )
    throw new TypeError(
      'Usage endpoint must be an explicit HTTP(S) URL or absolute path without credentials or query data.',
    );
  if (endpoint.startsWith('/') && !endpoint.startsWith('//')) {
    if (/[?#]/.test(endpoint))
      throw new TypeError('Usage endpoint must not include query data or a fragment.');
    return endpoint;
  }
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new TypeError('Usage endpoint must be an HTTP(S) URL or absolute path.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new TypeError('Usage endpoint must not include credentials, query data or a fragment.');
  return url.href;
}

function receipt(input: unknown, count: number): Receipt | null {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  )
    return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (
    Reflect.ownKeys(input).some(
      (key) =>
        typeof key !== 'string' ||
        !['accepted', 'retained', 'status'].includes(key) ||
        !descriptors[key].enumerable ||
        !('value' in descriptors[key]),
    )
  )
    return null;
  const value = input as Record<string, unknown>;
  if (
    value.status === 'disabled' &&
    value.accepted === 0 &&
    (value.retained === undefined || value.retained === 0)
  )
    return { status: 'disabled', accepted: 0 };
  if (!Number.isSafeInteger(value.retained) || Number(value.retained) < 0) return null;
  if (value.status === 'recorded' && value.accepted === count)
    return { status: 'recorded', accepted: count, retained: value.retained as number };
  if (value.status === 'duplicate' && value.accepted === 0)
    return { status: 'duplicate', accepted: 0, retained: value.retained as number };
  return null;
}

/**
 * Disabled by default. Only record() collects caller-supplied, allowlisted facts;
 * only flush() sends one batch of at most 100 events and 60 KiB of UTF-8 JSON.
 * No DOM observers, timers, storage or automatic retry.
 *
 * Queued records stay in memory only. A full buffer rejects new records, preserving
 * an ambiguous in-flight batch. Retrying flush() reuses that batch's exact ID/body.
 * Service receipts deduplicate only the last 1000 batches; retries after eviction
 * are not guaranteed exactly-once. A duplicate receipt acknowledges delivery.
 *
 * clear()/disable abort best-effort and invalidate local pending work. They cannot
 * retract a batch already accepted remotely. A server-disabled receipt also opts
 * this client out and clears its queue; resumption requires explicit setEnabled(true).
 */
export function createUsageClient(options: UsageClientOptions): UsageClient {
  const maximum = options.maxEvents ?? usageClientLimits.defaultMaxEvents;
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > usageClientLimits.maxEvents)
    throw new RangeError('Usage client buffer must contain between 1 and 1000 events.');
  if (options.enabled !== undefined && typeof options.enabled !== 'boolean')
    throw new TypeError('Usage opt-in must be an explicit boolean.');
  const endpoint = safeEndpoint(options.endpoint ?? '/api/aegis/usage');
  // The collector owns policy validation, defensive policy cloning, event-key
  // validation and safe technical-prop allowlists. Its tiny staging buffer never
  // replaces this transport queue or changes the order of pending deliveries.
  const collector = createUsageCollector({
    policy: options.policy,
    enabled: options.enabled === true,
    maxEvents: 1,
    clock: options.clock,
  });
  const transport: UsageFetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const idFactory = options.idFactory ?? (() => globalThis.crypto.randomUUID());
  let queue: UsageEvent[] = [];
  let batch: Batch | null = null;
  let generation = 0;
  let active: { controller: AbortController; promise: Promise<UsageFlushResult> } | null = null;
  const recentIds: string[] = [];
  const result = (
    status: UsageFlushResult['status'],
    batchId: string | null = null,
    accepted = 0,
    retained: number | null = null,
    issues: UsageIssue[] = [],
  ): UsageFlushResult => ({
    status,
    accepted,
    retained,
    pendingCount: queue.length,
    batchId,
    issues,
  });
  const clear = () => {
    generation++;
    queue = [];
    batch = null;
    collector.clear();
    active?.controller.abort();
    active = null;
  };
  const setEnabled = (value: boolean) => {
    collector.setEnabled(value);
    if (!value) clear();
  };
  return {
    get enabled() {
      return collector.enabled;
    },
    get pendingCount() {
      return queue.length;
    },
    get inFlight() {
      return active !== null;
    },
    setEnabled,
    clear,
    record(input) {
      if (!collector.enabled) return { accepted: false, reason: 'disabled', issues: [] };
      if (queue.length >= maximum)
        return {
          accepted: false,
          reason: 'buffer-full',
          issues: [
            {
              code: 'buffer-full',
              message:
                'The bounded usage queue is full. Flush or clear it explicitly before recording more events.',
            },
          ],
        };
      try {
        const validation = collector.record(input);
        if (!validation.accepted) return validation;
        const event = collector.getEvents()[0];
        collector.clear();
        if (!event)
          return {
            accepted: false,
            reason: 'invalid-event',
            issues: [
              {
                code: 'invalid-clock',
                message: 'The usage clock did not produce a current event.',
              },
            ],
          };
        queue.push(event);
        return { accepted: true, issues: [] };
      } catch {
        collector.clear();
        return {
          accepted: false,
          reason: 'invalid-event',
          issues: [
            {
              code: 'invalid-record',
              message: 'The usage record or injected clock could not be validated.',
            },
          ],
        };
      }
    },
    flush() {
      if (!collector.enabled) return Promise.resolve(result('disabled'));
      if (active) return active.promise;
      if (!queue.length) return Promise.resolve(result('empty'));
      if (!batch) {
        try {
          const id = idFactory();
          if (
            typeof id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
            recentIds.includes(id)
          )
            throw new Error('Invalid batch identity.');
          const encoder = new TextEncoder();
          let bytes = encoder.encode(JSON.stringify({ batchId: id, events: [] })).byteLength;
          const events: UsageEvent[] = [];
          for (const event of queue.slice(0, usageClientLimits.batchSize)) {
            const addedBytes =
              encoder.encode(JSON.stringify(event)).byteLength + (events.length ? 1 : 0);
            if (bytes + addedBytes > usageClientLimits.batchBytes) break;
            events.push(event);
            bytes += addedBytes;
          }
          if (!events.length)
            return Promise.resolve(
              result('error', null, 0, null, [
                {
                  code: 'batch-size',
                  message:
                    'The next event exceeds the transport body limit. The queue is preserved.',
                },
              ]),
            );
          batch = { id, events, body: JSON.stringify({ batchId: id, events }) };
          recentIds.push(id);
          if (recentIds.length > usageClientLimits.serverReceiptWindow) recentIds.shift();
        } catch {
          return Promise.resolve(
            result('error', null, 0, null, [
              {
                code: 'batch-identity',
                message:
                  'A fresh UUID batch identity could not be created. The queue is preserved.',
              },
            ]),
          );
        }
      }
      const submitted = batch;
      const requestGeneration = generation;
      const controller = new AbortController();
      const current = () =>
        generation === requestGeneration && collector.enabled && !controller.signal.aborted;
      // Install active synchronously; transport starts in a microtask. Simultaneous
      // flush calls share one promise and cannot create a second request.
      const operation: Promise<UsageFlushResult> = Promise.resolve()
        .then(async () => {
          if (!current()) return result('cancelled', submitted.id);
          try {
            const response = await transport(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Aegis-Client': 'sdk' },
              credentials: 'omit',
              referrerPolicy: 'no-referrer',
              redirect: 'error',
              cache: 'no-store',
              body: submitted.body,
              signal: controller.signal,
            });
            if (!current()) return result('cancelled', submitted.id);
            if (!response.ok)
              return result('error', submitted.id, 0, null, [
                {
                  code: 'transport-rejected',
                  message:
                    'The service did not acknowledge this batch. The same batch is retained for an explicit retry.',
                },
              ]);
            const acknowledged = receipt(await response.json(), submitted.events.length);
            if (!current()) return result('cancelled', submitted.id);
            if (!acknowledged)
              return result('error', submitted.id, 0, null, [
                {
                  code: 'invalid-receipt',
                  message:
                    'The service response did not acknowledge the complete batch. The same batch is retained.',
                },
              ]);
            if (acknowledged.status === 'disabled') {
              setEnabled(false);
              return result('disabled', submitted.id);
            }
            // New records appended during transport remain after the acknowledged prefix.
            queue = queue.slice(submitted.events.length);
            batch = null;
            return result(
              acknowledged.status,
              submitted.id,
              acknowledged.accepted,
              acknowledged.retained,
            );
          } catch {
            if (!current()) return result('cancelled', submitted.id);
            return result('error', submitted.id, 0, null, [
              {
                code: 'transport-uncertain',
                message:
                  'Delivery was not acknowledged. Retry explicitly with the retained batch ID; no automatic retry occurs.',
              },
            ]);
          }
        })
        .finally(() => {
          if (active?.promise === operation) active = null;
        });
      active = { controller, promise: operation };
      return operation;
    },
  };
}
