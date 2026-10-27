import { describe, expect, it, vi } from 'vitest';
import {
  createUsageClient,
  usageClientLimits,
  type UsageFetch,
  type UsageTransportResponse,
} from './usage-client';
import type { UsagePolicy, UsageRecord } from './telemetry';

const policy: UsagePolicy = {
  version: 1,
  registries: ['aegis'],
  profiles: ['atlas'],
  components: {
    button: {
      props: { disabled: { type: 'boolean' }, size: { type: 'enum', values: ['sm', 'md'] } },
    },
  },
};
const record: UsageRecord = {
  registryId: 'aegis',
  registryRevision: 1,
  componentId: 'button',
  profileId: 'atlas',
  kind: 'action',
  mode: 'light',
  presentation: 'fundamental',
  props: { disabled: false, size: 'md' },
};
const clock = () => 1_800_000_000_000;
const ids = () => {
  let id = 0;
  return () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`;
};
const response = (body: unknown, status = 200): UsageTransportResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const success: UsageFetch = async (_url, init) => {
  const body = JSON.parse(String(init.body));
  return response({
    status: 'recorded',
    accepted: body.events.length,
    retained: body.events.length,
  });
};
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const options = (fetch: UsageFetch = success) => ({
  policy,
  enabled: true,
  fetch,
  clock,
  idFactory: ids(),
});

describe('explicit browser usage SDK', () => {
  it('defaults to disabled and never reads event data, clock or transport before opt-in', async () => {
    const fetch = vi.fn(success),
      time = vi.fn(clock);
    const client = createUsageClient({ policy, fetch, clock: time, idFactory: ids() });
    const getter = vi.fn(() => {
      throw Error('Do not read');
    });
    const input = Object.defineProperty({}, 'metadata', { enumerable: true, get: getter });
    expect(client.record(input)).toEqual({ accepted: false, reason: 'disabled', issues: [] });
    expect((await client.flush()).status).toBe('disabled');
    expect(client.pendingCount).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    expect(time).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });
  it('validates policies even when disabled and requires a boolean opt-in', () => {
    expect(() =>
      createUsageClient({ policy: { ...policy, version: 2 } as unknown as UsagePolicy }),
    ).toThrow();
    expect(() => createUsageClient({ policy, enabled: 'yes' as unknown as boolean })).toThrow();
    const client = createUsageClient({ policy });
    expect(() => client.setEnabled('yes' as unknown as boolean)).toThrow();
    expect(client.enabled).toBe(false);
  });
  it('requires explicit flush and sends only safe event fields with no credentials', async () => {
    const fetch = vi.fn(success);
    const client = createUsageClient(options(fetch));
    expect(client.record(record).accepted).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(client.pendingCount).toBe(1);
    const result = await client.flush();
    expect(result).toMatchObject({ status: 'recorded', accepted: 1, retained: 1, pendingCount: 0 });
    const [endpoint, init] = fetch.mock.calls[0];
    expect(endpoint).toBe('/api/aegis/usage');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Aegis-Client': 'sdk' },
    });
    const body = JSON.parse(String(init.body));
    expect(Object.keys(body).sort()).toEqual(['batchId', 'events']);
    expect(body.events).toEqual([{ ...record, version: 1, timestamp: clock() }]);
    expect(Object.keys(init.headers!)).not.toContain('Authorization');
  });
  it('rejects arbitrary metadata, sensitive props and caller-supplied timestamps', async () => {
    const fetch = vi.fn(success),
      client = createUsageClient(options(fetch));
    for (const input of [
      { ...record, metadata: { email: 'private@example.test' } },
      { ...record, props: { label: 'private text' } },
      { ...record, props: { size: 'unapproved' } },
      { ...record, timestamp: 1 },
      { ...record, version: 1 },
    ])
      expect(client.record(input).accepted).toBe(false);
    expect((await client.flush()).status).toBe('empty');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not invoke accessors while rejecting event metadata', () => {
    const getter = vi.fn(() => 'secret');
    const input = Object.defineProperty({ ...record }, 'metadata', {
      enumerable: true,
      get: getter,
    });
    expect(createUsageClient(options()).record(input).accepted).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });
  it('copies policy and events so later caller mutations cannot expand or change a batch', async () => {
    const inputPolicy = structuredClone(policy),
      input = structuredClone(record),
      fetch = vi.fn(success);
    const client = createUsageClient({ ...options(fetch), policy: inputPolicy });
    client.record(input);
    input.props!.size = 'sm';
    inputPolicy.components.other = {};
    inputPolicy.components.button.props!.secret = { type: 'boolean' };
    expect(client.record({ ...record, componentId: 'other' }).accepted).toBe(false);
    expect(client.record({ ...record, props: { secret: true } }).accepted).toBe(false);
    await client.flush();
    expect(JSON.parse(String(fetch.mock.calls[0][1].body)).events[0].props.size).toBe('md');
  });
  it('rejects unsafe endpoints and never accepts URL credentials or query API keys', () => {
    for (const endpoint of [
      'https://user:password@example.test/usage',
      '/usage?apiKey=secret',
      'https://example.test/usage?token=secret',
      '//example.test/usage',
      '/\\example.test/usage',
      'javascript:alert(1)',
      '/usage#secret',
    ])
      expect(() => createUsageClient({ policy, endpoint })).toThrow();
    expect(() =>
      createUsageClient({ policy, endpoint: 'https://example.test/api/aegis/usage' }),
    ).not.toThrow();
    expect(() =>
      createUsageClient({ policy, endpoint: 'http://127.0.0.1:4317/api/aegis/usage' }),
    ).not.toThrow();
  });
  it('bounds default buffering at 500 and rejects new records without dropping existing ones', async () => {
    const fetch = vi.fn(success),
      client = createUsageClient(options(fetch));
    for (let index = 0; index < 500; index++) expect(client.record(record).accepted).toBe(true);
    expect(client.record(record)).toMatchObject({ accepted: false, reason: 'buffer-full' });
    expect(client.pendingCount).toBe(500);
    await client.flush();
    expect(client.pendingCount).toBe(400);
    expect(JSON.parse(String(fetch.mock.calls[0][1].body)).events).toHaveLength(100);
  });
  it('enforces the hard 1000 limit and rejects invalid queue sizes', () => {
    for (const maxEvents of [0, -1, 1.5, 1001, Infinity, NaN])
      expect(() => createUsageClient({ policy, maxEvents })).toThrow();
    const client = createUsageClient({ ...options(), maxEvents: 1000 });
    for (let index = 0; index < 1000; index++) client.record(record);
    expect(client.pendingCount).toBe(1000);
    expect(client.record(record).reason).toBe('buffer-full');
    expect(usageClientLimits.serverReceiptWindow).toBe(1000);
  });
  it('flushes at most 100 events per explicit call without automatically draining the queue', async () => {
    const fetch = vi.fn(success),
      client = createUsageClient(options(fetch));
    for (let index = 0; index < 205; index++) client.record(record);
    expect((await client.flush()).pendingCount).toBe(105);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await client.flush()).pendingCount).toBe(5);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await client.flush()).pendingCount).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(([, init]) => JSON.parse(String(init.body)).events.length)).toEqual(
      [100, 100, 5],
    );
  });
  it('retains the exact batch ID and body after ambiguous transport failure', async () => {
    const fetch = vi
      .fn<UsageFetch>()
      .mockRejectedValueOnce(Error('sensitive transport message'))
      .mockImplementation(success);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const failed = await client.flush();
    expect(failed).toMatchObject({ status: 'error', pendingCount: 1 });
    expect(JSON.stringify(failed)).not.toContain('sensitive');
    expect(fetch).toHaveBeenCalledTimes(1);
    client.record({ ...record, kind: 'render' });
    const retried = await client.flush();
    expect(retried.batchId).toBe(failed.batchId);
    expect(retried.pendingCount).toBe(1);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
  });
  it('splits large allowlisted events into bodies below 60 KiB and retries the exact bounded batch', async () => {
    const props = Object.fromEntries(
      Array.from({ length: 16 }, (_, index) => [`configurationAxis${index}`, 'a'.repeat(48)]),
    );
    const largePolicy: UsagePolicy = {
      ...policy,
      components: {
        button: {
          props: Object.fromEntries(
            Object.entries(props).map(([key, value]) => [
              key,
              { type: 'enum' as const, values: [value] },
            ]),
          ),
        },
      },
    };
    const fetch = vi
      .fn<UsageFetch>()
      .mockRejectedValueOnce(Error('lost acknowledgment'))
      .mockImplementation(success);
    const client = createUsageClient({ ...options(fetch), policy: largePolicy });
    const largeRecord = { ...record, props };
    for (let index = 0; index < 100; index++)
      expect(client.record(largeRecord).accepted).toBe(true);
    expect((await client.flush()).status).toBe('error');
    const firstBody = String(fetch.mock.calls[0][1].body);
    const firstBatch = JSON.parse(firstBody);
    expect(firstBatch.events.length).toBeGreaterThan(0);
    expect(firstBatch.events.length).toBeLessThan(100);
    expect(new TextEncoder().encode(firstBody).byteLength).toBeLessThanOrEqual(60 * 1_024);
    expect(
      new TextEncoder().encode(
        JSON.stringify({ ...firstBatch, events: [...firstBatch.events, firstBatch.events[0]] }),
      ).byteLength,
    ).toBeGreaterThan(60 * 1_024);
    expect(client.pendingCount).toBe(100);
    expect(client.record(largeRecord).accepted).toBe(true);
    expect((await client.flush()).status).toBe('recorded');
    expect(fetch.mock.calls[1][1].body).toBe(firstBody);
    expect(client.pendingCount).toBe(101 - firstBatch.events.length);
    while (client.pendingCount) expect((await client.flush()).status).toBe('recorded');
    const acknowledgedBatches = fetch.mock.calls
      .slice(1)
      .map(([, init]) => JSON.parse(String(init.body)));
    expect(acknowledgedBatches.reduce((count, body) => count + body.events.length, 0)).toBe(101);
    for (const [, init] of fetch.mock.calls)
      expect(new TextEncoder().encode(String(init.body)).byteLength).toBeLessThanOrEqual(
        usageClientLimits.batchBytes,
      );
  });
  it('accepts duplicate receipts as successful delivery and removes the delivered prefix', async () => {
    const fetch = vi
      .fn<UsageFetch>()
      .mockRejectedValueOnce(Error('ack lost'))
      .mockResolvedValueOnce(response({ status: 'duplicate', accepted: 0, retained: 13 }));
    const client = createUsageClient(options(fetch));
    client.record(record);
    await client.flush();
    client.record({ ...record, kind: 'render' });
    const result = await client.flush();
    expect(result).toMatchObject({
      status: 'duplicate',
      accepted: 0,
      retained: 13,
      pendingCount: 1,
    });
  });
  it('preserves new records added during a flush after the older batch is acknowledged', async () => {
    const request = deferred<UsageTransportResponse>();
    const fetch = vi.fn<UsageFetch>().mockReturnValue(request.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const pending = client.flush();
    await Promise.resolve();
    client.record({ ...record, kind: 'render' });
    request.resolve(response({ status: 'recorded', accepted: 1, retained: 1 }));
    expect((await pending).pendingCount).toBe(1);
    expect(client.pendingCount).toBe(1);
  });
  it('shares a single operation across concurrent flush calls', async () => {
    const request = deferred<UsageTransportResponse>();
    const fetch = vi.fn<UsageFetch>().mockReturnValue(request.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const first = client.flush(),
      second = client.flush();
    expect(first).toBe(second);
    expect(client.inFlight).toBe(true);
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    request.resolve(response({ status: 'recorded', accepted: 1, retained: 1 }));
    await first;
    expect(client.inFlight).toBe(false);
  });
  it('disabling aborts and clears queued/pending data even if transport later resolves', async () => {
    const request = deferred<UsageTransportResponse>();
    const fetch = vi.fn<UsageFetch>().mockReturnValue(request.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const pending = client.flush();
    await Promise.resolve();
    const signal = fetch.mock.calls[0][1].signal!;
    client.setEnabled(false);
    expect(signal.aborted).toBe(true);
    expect(client.pendingCount).toBe(0);
    expect(client.inFlight).toBe(false);
    request.resolve(response({ status: 'recorded', accepted: 1, retained: 1 }));
    expect((await pending).status).toBe('cancelled');
    expect(client.pendingCount).toBe(0);
    expect(client.record(record).reason).toBe('disabled');
  });
  it('does not send at all if disabled between flush and transport start', async () => {
    const fetch = vi.fn(success),
      client = createUsageClient(options(fetch));
    client.record(record);
    const pending = client.flush();
    client.setEnabled(false);
    expect((await pending).status).toBe('cancelled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('an obsolete response cannot clear a newer generation or overwrite its in-flight state', async () => {
    const old = deferred<UsageTransportResponse>(),
      current = deferred<UsageTransportResponse>();
    const fetch = vi
      .fn<UsageFetch>()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const oldFlush = client.flush();
    await Promise.resolve();
    client.setEnabled(false);
    client.setEnabled(true);
    client.record(record);
    const newFlush = client.flush();
    await Promise.resolve();
    old.resolve(response({ status: 'recorded', accepted: 1, retained: 1 }));
    expect((await oldFlush).status).toBe('cancelled');
    expect(client.inFlight).toBe(true);
    expect(client.pendingCount).toBe(1);
    current.resolve(response({ status: 'recorded', accepted: 1, retained: 2 }));
    expect((await newFlush).status).toBe('recorded');
    expect(client.pendingCount).toBe(0);
    expect(client.inFlight).toBe(false);
  });
  it('explicit clear cancels pending work but preserves the chosen enabled setting', async () => {
    const request = deferred<UsageTransportResponse>();
    const fetch = vi.fn<UsageFetch>().mockReturnValue(request.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const pending = client.flush();
    await Promise.resolve();
    client.clear();
    expect(client.enabled).toBe(true);
    expect(client.pendingCount).toBe(0);
    request.reject(new Error('aborted'));
    expect((await pending).status).toBe('cancelled');
  });
  it('server-disabled acknowledgment clears all local events and requires fresh explicit opt-in', async () => {
    const request = deferred<UsageTransportResponse>();
    const fetch = vi.fn<UsageFetch>().mockReturnValue(request.promise);
    const client = createUsageClient(options(fetch));
    client.record(record);
    const pending = client.flush();
    await Promise.resolve();
    client.record(record);
    request.resolve(response({ status: 'disabled', accepted: 0 }));
    expect((await pending).status).toBe('disabled');
    expect(client.enabled).toBe(false);
    expect(client.pendingCount).toBe(0);
    expect(client.record(record).reason).toBe('disabled');
    client.setEnabled(true);
    expect(client.record(record).accepted).toBe(true);
  });
  it('keeps the complete batch on HTTP failure, malformed JSON or partial acknowledgments', async () => {
    const invalidResponses = [
      response({ status: 'recorded', accepted: 1, retained: 1 }, 500),
      {
        ok: true,
        status: 200,
        json: async () => {
          throw Error('private body');
        },
      },
      response({ status: 'recorded', accepted: 1, retained: 1 }),
      response({ status: 'duplicate', accepted: 2, retained: 2 }),
      response({ status: 'recorded', accepted: 2, retained: 2, metadata: 'unexpected' }),
    ];
    for (const invalid of invalidResponses) {
      const fetch = vi.fn<UsageFetch>().mockResolvedValueOnce(invalid).mockImplementation(success);
      const client = createUsageClient(options(fetch));
      client.record(record);
      client.record(record);
      const result = await client.flush();
      expect(result.status).toBe('error');
      expect(client.pendingCount).toBe(2);
      await client.flush();
      expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
    }
  });
  it('rejects invalid or reused injected batch IDs without sending or discarding events', async () => {
    const fetch = vi.fn(success),
      id = ids()();
    const client = createUsageClient({ ...options(fetch), idFactory: () => id });
    client.record(record);
    await client.flush();
    client.record(record);
    expect((await client.flush()).status).toBe('error');
    expect(client.pendingCount).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    const invalid = createUsageClient({
      ...options(fetch),
      idFactory: () => 'private arbitrary string',
    });
    invalid.record(record);
    expect((await invalid.flush()).issues[0].code).toBe('batch-identity');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('sanitizes an invalid clock failure and sends nothing', async () => {
    const fetch = vi.fn(success),
      client = createUsageClient({ ...options(fetch), clock: () => NaN });
    expect(client.record(record).accepted).toBe(false);
    expect((await client.flush()).status).toBe('empty');
    expect(fetch).not.toHaveBeenCalled();
  });
});
