import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInfrastructureServer } from './server.mjs';
import { createInfrastructure } from './store.mjs';

const allowedOrigin = 'http://127.0.0.1:4175';
const postHeaders = { 'Content-Type': 'application/json', 'X-Aegis-Client': 'sdk' };

// All requests use an actual ephemeral loopback listener. Stub methods deliberately
// isolate HTTP routing from service validation; the final test uses persisted state.
function stubService(overrides = {}) {
  const calls = [];
  const invoke = (name, value) => async (...args) => {
    calls.push({ name, args });
    return typeof value === 'function' ? value(...args) : value;
  };
  return {
    calls,
    service: {
      status: invoke('status', { project: { id: 'http-test' }, health: { status: 'healthy' } }),
      inventory: invoke('inventory', { schemaVersion: 1, status: 'ready', components: [] }),
      plan: invoke('plan', { status: 'proposal-only' }),
      reconcile: invoke('reconcile', { status: 'healthy' }),
      setTelemetry: invoke('setTelemetry', enabled => ({ enabled })),
      ingest: invoke('ingest', events => ({ status: 'recorded', accepted: events.length, retained: events.length })),
      ...overrides,
    },
  };
}

async function listen(t, service, options = {}) {
  const server = createInfrastructureServer(service, options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const port = server.address().port;
  function request({ method = 'GET', path = '/api/aegis/status', headers = {}, body = '' } = {}) {
    return new Promise((resolve, reject) => {
      const client = httpRequest({
        hostname: '127.0.0.1', port, method, path, agent: false,
        headers: { Host: `127.0.0.1:${port}`, Connection: 'close', ...headers },
      }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: response.statusCode, headers: response.headers, raw, body: raw ? JSON.parse(raw) : null }); }
          catch (error) { reject(error); }
        });
      });
      client.setTimeout(5000, () => client.destroy(new Error('Local HTTP test timed out.')));
      client.on('error', reject);
      client.end(body);
    });
  }
  const post = (path, value = {}, headers = postHeaders) => request({ method: 'POST', path, headers, body: JSON.stringify(value) });
  return { port, request, post, endpoint: `http://127.0.0.1:${port}/api/aegis/usage` };
}

test('HTTP status and configurability return service data with non-cacheable JSON headers', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  const status = await request();
  assert.equal(status.status, 200);
  assert.equal(status.body.project.id, 'http-test');
  assert.equal(status.headers['content-type'], 'application/json');
  assert.equal(status.headers['cache-control'], 'no-store');
  assert.equal(status.headers['x-content-type-options'], 'nosniff');
  assert.equal(status.headers['access-control-allow-origin'], undefined);
  const inventory = await request({ path: '/api/aegis/configurability' });
  assert.deepEqual(inventory.body, { schemaVersion: 1, status: 'ready', components: [] });
  assert.deepEqual(calls.map(call => call.name), ['status', 'inventory']);
});

test('HTTP allowed origins receive exact CORS headers; forbidden and opaque origins cannot call services', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  const accepted = await request({ headers: { Origin: allowedOrigin } });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.headers['access-control-allow-origin'], allowedOrigin);
  assert.equal(accepted.headers.vary, 'Origin');
  assert.equal(accepted.headers['access-control-allow-credentials'], undefined);
  for (const origin of ['https://untrusted.example', `${allowedOrigin}.evil`, 'null']) {
    const rejected = await request({ headers: { Origin: origin } });
    assert.equal(rejected.status, 403, origin);
    assert.equal(rejected.headers['access-control-allow-origin'], undefined);
  }
  assert.equal(calls.length, 1);
});

test('HTTP origin allowlists can be explicitly replaced', async t => {
  const { service } = stubService();
  const custom = 'http://localhost:9999';
  const { request } = await listen(t, service, { allowedOrigins: [custom] });
  assert.equal((await request({ headers: { Origin: allowedOrigin } })).status, 403);
  assert.equal((await request({ headers: { Origin: custom } })).headers['access-control-allow-origin'], custom);
});

test('HTTP Host must name localhost or 127.0.0.1 with the actual bound port', async t => {
  const { service, calls } = stubService();
  const { request, port } = await listen(t, service);
  assert.equal((await request({ headers: { Host: `localhost:${port}` } })).status, 200);
  for (const host of [`evil.example:${port}`, `127.0.0.1:${port + 1}`, `localhost.evil:${port}`, 'localhost', `[::1]:${port}`])
    assert.equal((await request({ headers: { Host: host, Origin: allowedOrigin } })).status, 403, host);
  assert.equal(calls.length, 1);
});

test('HTTP preflight requires an allowed origin and only advertises supported headers and methods', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  const accepted = await request({ method: 'OPTIONS', headers: { Origin: allowedOrigin } });
  assert.equal(accepted.status, 204);
  assert.equal(accepted.raw, '');
  assert.equal(accepted.headers['access-control-allow-origin'], allowedOrigin);
  assert.equal(accepted.headers['access-control-allow-methods'], 'GET, POST, OPTIONS');
  assert.equal(accepted.headers['access-control-allow-headers'], 'Content-Type, X-Aegis-Client');
  assert.equal((await request({ method: 'OPTIONS' })).status, 403);
  assert.equal((await request({ method: 'OPTIONS', headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.deepEqual(calls, []);
});

test('HTTP rejects non-local URL forms and handles malformed percent paths without crashing', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  for (const path of ['//%', '//evil.example/api/aegis/status', 'http://evil.example/api/aegis/status'])
    assert.equal((await request({ path })).status, 400, path);
  for (const path of ['/%', '/%ZZ', '/api/aegis/%E0%A4%A'])
    assert.ok([400, 404].includes((await request({ path })).status), path);
  assert.deepEqual(calls, []);
  assert.equal((await request()).status, 200);
});

test('HTTP mutations require an explicit sdk or console client marker', async t => {
  const { service, calls } = stubService();
  const { post } = await listen(t, service);
  for (const marker of [undefined, 'other', 'SDK']) {
    const headers = { 'Content-Type': 'application/json', ...(marker ? { 'X-Aegis-Client': marker } : {}) };
    assert.equal((await post('/api/aegis/reconcile', {}, headers)).status, 403);
  }
  for (const marker of ['sdk', 'console'])
    assert.equal((await post('/api/aegis/reconcile', {}, { ...postHeaders, 'X-Aegis-Client': marker })).status, 200);
  assert.deepEqual(calls.map(call => call.name), ['reconcile', 'reconcile']);
});

test('HTTP mutations accept the JSON media type with parameters and reject lookalikes', async t => {
  const { service, calls } = stubService();
  const { post } = await listen(t, service);
  for (const type of [undefined, 'text/plain', 'application/jsonp', 'application/json-extra']) {
    const headers = { 'X-Aegis-Client': 'sdk', ...(type ? { 'Content-Type': type } : {}) };
    assert.equal((await post('/api/aegis/reconcile', {}, headers)).status, 415, String(type));
  }
  for (const type of ['application/json', 'application/json; charset=utf-8', 'Application/JSON'])
    assert.equal((await post('/api/aegis/reconcile', {}, { ...postHeaders, 'Content-Type': type })).status, 200, type);
  assert.equal(calls.length, 3);
});

test('HTTP malformed JSON and non-object envelopes never reach service methods', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  for (const body of ['{', '{"enabled":}', 'null', '[]', 'true', '1', '"text"']) {
    const response = await request({ method: 'POST', path: '/api/aegis/usage/settings', headers: postHeaders, body });
    assert.equal(response.status, 400, body);
  }
  assert.deepEqual(calls, []);
});

test('HTTP unsupported fields and incorrect top-level field types are rejected atomically', async t => {
  const { service, calls } = stubService();
  const { post } = await listen(t, service);
  const invalid = [
    ['/api/aegis/plan', { useAI: 'true' }],
    ['/api/aegis/plan', { useAI: false, model: 'unapproved' }],
    ['/api/aegis/reconcile', { execute: true }],
    ['/api/aegis/usage/settings', {}],
    ['/api/aegis/usage/settings', { enabled: 1 }],
    ['/api/aegis/usage/settings', { enabled: true, metadata: {} }],
    ['/api/aegis/usage', { events: {} }],
    ['/api/aegis/usage', { events: [], metadata: 'unapproved' }],
    ['/api/aegis/usage', JSON.parse('{"events":[],"__proto__":{}}')],
  ];
  for (const [path, body] of invalid) assert.equal((await post(path, body)).status, 400, JSON.stringify(body));
  assert.deepEqual(calls, []);
});

test('HTTP approved routes forward only their explicit arguments to stub services', async t => {
  const { service, calls } = stubService();
  const { post } = await listen(t, service);
  assert.equal((await post('/api/aegis/plan', { useAI: false })).status, 200);
  assert.equal((await post('/api/aegis/reconcile')).status, 200);
  assert.deepEqual((await post('/api/aegis/usage/settings', { enabled: true })).body, { enabled: true });
  const events = [{ componentId: 'button' }]; // The stub intentionally does not validate event fields.
  assert.deepEqual((await post('/api/aegis/usage', { batchId: 'test-batch', events })).body, { status: 'recorded', accepted: 1, retained: 1 });
  assert.deepEqual(calls, [
    { name: 'plan', args: [{ useAI: false }] },
    { name: 'reconcile', args: [] },
    { name: 'setTelemetry', args: [true] },
    { name: 'ingest', args: [events, 'test-batch'] },
  ]);
});

test('HTTP body cap accepts exactly 65536 bytes and rejects 65537 bytes before ingestion', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  const valid = JSON.stringify({ events: [] });
  const options = { method: 'POST', path: '/api/aegis/usage', headers: postHeaders };
  assert.equal((await request({ ...options, body: valid.padEnd(65536, ' ') })).status, 200);
  assert.equal((await request({ ...options, body: valid.padEnd(65537, ' ') })).status, 413);
  assert.equal(calls.length, 1);
});

test('HTTP body limit counts encoded bytes rather than JavaScript string length', async t => {
  const { service, calls } = stubService();
  const { request } = await listen(t, service);
  const body = JSON.stringify({ events: ['é'.repeat(33000)] });
  assert.ok(body.length < 65536);
  assert.ok(Buffer.byteLength(body) > 65536);
  const response = await request({ method: 'POST', path: '/api/aegis/usage', headers: postHeaders, body });
  assert.equal(response.status, 413);
  assert.deepEqual(calls, []);
});

test('HTTP unknown endpoints and unsupported methods cannot trigger service operations', async t => {
  const { service, calls } = stubService();
  const { request, post } = await listen(t, service);
  assert.equal((await request({ path: '/api/aegis/unknown' })).status, 404);
  assert.equal((await request({ method: 'PUT', path: '/api/aegis/reconcile' })).status, 404);
  assert.equal((await post('/api/aegis/unknown')).status, 400);
  assert.deepEqual(calls, []);
});

test('HTTP rejected service operations return a controlled conflict and do not kill the listener', async t => {
  const { service } = stubService({ ingest: async () => { throw new Error('Invalid usage batch.'); } });
  const { post, request } = await listen(t, service);
  const result = await post('/api/aegis/usage', { events: [] });
  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { error: 'Invalid usage batch.' });
  assert.equal((await request()).status, 200);
});

test('HTTP SDK and persisted service preserve batch identity across lost acknowledgments and honor opt-out', async t => {
  const core = await import('../../agent-kit/runtime/core.mjs');
  assert.equal(typeof core.createUsageClient, 'function', 'Build the portable kit before running infrastructure tests.');
  const directory = await mkdtemp(join(tmpdir(), 'aegis-http-sdk-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const kitDirectory = fileURLToPath(new URL('../../agent-kit', import.meta.url));
  const projectDirectory = join(directory, 'project');
  const clock = () => 1_800_000_000_000;
  let providerCalls = 0;
  const configuration = { kitDirectory, projectDirectory, core, clock, environment: {}, aiRequest: async () => { providerCalls++; throw new Error('Provider calls are forbidden in this test.'); } };
  const service = createInfrastructure(configuration);
  const profile = JSON.parse(await readFile(join(kitDirectory, 'profiles/atlas.json'), 'utf8'));
  const initialized = await service.initialize({ id: 'http-sdk-test', profile });
  assert.equal(initialized.usage.telemetryEnabled, false);
  const { post, request, endpoint } = await listen(t, service);
  assert.equal((await post('/api/aegis/usage/settings', { enabled: true })).status, 200);
  const policy = JSON.parse(await readFile(join(projectDirectory, 'usage-policy.json'), 'utf8'));
  const bodies = [];
  const client = core.createUsageClient({
    policy, enabled: true, endpoint, clock,
    fetch: async (url, options) => {
      bodies.push(options.body);
      const response = await fetch(url, options);
      if (bodies.length === 1) {
        assert.equal(response.status, 200);
        assert.equal((await response.json()).status, 'recorded');
        throw new Error('Simulated lost acknowledgment after server commit.');
      }
      return response;
    },
  });
  const event = { registryId: 'http-sdk-test', registryRevision: initialized.release.registryRevision, componentId: 'components-actions-button', profileId: profile.id, kind: 'render', mode: 'light', presentation: 'fundamental' };
  assert.equal(client.record({ ...event, metadata: 'private content' }).accepted, false);
  assert.deepEqual(client.record(event), { accepted: true, issues: [] });
  assert.equal((await client.flush()).status, 'error');
  assert.equal(client.pendingCount, 1);
  const stored = JSON.parse(await readFile(join(projectDirectory, 'usage.json'), 'utf8'));
  assert.equal(stored.events.length, 1);
  assert.equal(stored.receipts.length, 1);
  const result = await client.flush();
  assert.equal(result.status, 'duplicate');
  assert.equal(result.accepted, 0);
  assert.equal(client.pendingCount, 0);
  assert.equal(bodies[1], bodies[0]);
  const reopened = createInfrastructure(configuration);
  assert.equal((await reopened.status()).usage.eventCount, 1);
  const reused = JSON.parse(bodies[0]);
  assert.equal((await post('/api/aegis/usage', { ...reused, events: [{ ...reused.events[0], kind: 'action' }] })).status, 409);
  assert.equal((await post('/api/aegis/usage', { ...reused, batchId: 42 })).status, 409);
  assert.equal(client.record(event).accepted, true);
  assert.equal((await post('/api/aegis/usage/settings', { enabled: false })).status, 200);
  assert.equal((await client.flush()).status, 'disabled');
  assert.equal(client.enabled, false);
  assert.equal(client.pendingCount, 0);
  assert.equal((await request()).body.usage.telemetryEnabled, false);
  assert.equal(providerCalls, 0);
});
