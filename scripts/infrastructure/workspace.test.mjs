import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { before, after, test } from 'node:test';
import {
  cp,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  rename,
  symlink,
  readdir,
  mkdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createSigningKeyPair, signKit } from './releases.mjs';
import { openWorkspace } from './workspace.mjs';
import { createWorkspaceServer } from './workspace-server.mjs';

let root, kit, keys, attestation, profile, alternate;
const epoch = Date.UTC(2026, 9, 27, 12);
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'aegis-workspace-tests-'));
  kit = join(root, 'kit');
  await cp(resolve('agent-kit'), kit, { recursive: true });
  keys = createSigningKeyPair();
  attestation = await signKit(kit, { privateKeyPem: keys.privateKeyPem });
  profile = await readJson(join(kit, 'profiles/aegis.json'));
  alternate = {
    ...profile,
    id: 'alternate',
    name: 'Alternate project language',
    radius: 'compact',
  };
});
after(async () => {
  await rm(root, { recursive: true, force: true });
});
async function fixture(t) {
  const parent = await mkdtemp(join(root, 'case-')),
    location = join(parent, 'workspace');
  let time = epoch;
  const workspace = await openWorkspace({
    directory: location,
    create: true,
    trustedKeys: [{ keyId: keys.keyId, publicKeyPem: keys.publicKeyPem }],
    clock: () => time,
    environment: {},
  });
  t.after(() => workspace.close());
  const bootstrap = workspace.catalog.bootstrap(),
    admin = workspace.catalog.authenticate(bootstrap.token);
  const release = await workspace.installKit({ sourceDirectory: kit, attestation }, admin);
  const project = await workspace.createProject(
    { id: 'alpha', name: 'Alpha', kitDigest: release.digest, profile },
    admin,
  );
  const issue = (role, projectIds = ['alpha']) => {
    const value = workspace.catalog.issueToken(
      { label: `${role} test`, role, projectIds, expiresAt: time + 7 * 86400000 },
      admin,
    );
    return { ...value, actor: workspace.catalog.authenticate(value.token) };
  };
  return {
    workspace,
    location,
    admin,
    token: bootstrap.token,
    project,
    release,
    issue,
    advance: (ms) => {
      time += ms;
    },
  };
}
const activation = (plan) => ({
  planId: plan.id,
  planDigest: plan.planDigest,
  expectedRevision: plan.expectedRevision,
  reason: 'Reviewed the generated project and release comparison.',
});

test('signed installation creates isolated pinned projects, with disabled collection and AI', async (t) => {
  const f = await fixture(t);
  const status = await f.workspace.status('alpha', f.admin);
  assert.equal(status.health.status, 'healthy');
  assert.equal(status.workspace.releaseVerified, true);
  assert.equal(status.workspace.signingKeyId, keys.keyId);
  assert.equal(status.usage.telemetryEnabled, false);
  assert.equal(status.ai.configured, false);
  await f.workspace.createProject(
    { id: 'beta', name: 'Beta', kitDigest: f.release.digest, profile: alternate },
    f.admin,
  );
  assert.equal(f.workspace.catalog.listProjects(f.issue('viewer').actor).length, 1);
  await assert.rejects(
    f.workspace.status('beta', f.issue('viewer').actor),
    /scope|permission|authorized|permit/i,
  );
  await assert.rejects(
    f.workspace.installKit({ sourceDirectory: kit, attestation }, f.issue('owner').actor),
  );
  await assert.rejects(
    f.workspace.createProject(
      { id: 'alpha', name: 'Replacement', kitDigest: f.release.digest, profile: alternate },
      f.admin,
    ),
    /already exists/,
  );
});

test('ingestion-only credentials can submit allowed facts without reading or reconfiguring a project', async (t) => {
  const f = await fixture(t),
    ingest = f.issue('ingest');
  assert.equal(
    (
      await f.workspace.execute(
        'alpha',
        'usage',
        { events: [], batchId: 'empty-batch' },
        ingest.actor,
      )
    ).status,
    'disabled',
  );
  await assert.rejects(f.workspace.status('alpha', ingest.actor));
  await assert.rejects(f.workspace.execute('alpha', 'telemetry', { enabled: true }, ingest.actor));
  await f.workspace.execute('alpha', 'telemetry', { enabled: true }, f.admin);
  const policy = await readJson(
    join(f.location, 'generations', f.project.currentGeneration, 'usage-policy.json'),
  );
  const event = {
    version: 1,
    timestamp: epoch,
    registryId: 'alpha',
    registryRevision: 1,
    componentId: Object.keys(policy.components)[0],
    profileId: profile.id,
    kind: 'render',
    mode: 'light',
    presentation: 'fundamental',
  };
  assert.equal(
    (
      await f.workspace.execute(
        'alpha',
        'usage',
        { events: [event], batchId: 'one-batch' },
        ingest.actor,
      )
    ).accepted,
    1,
  );
  assert.equal(
    (
      await f.workspace.execute(
        'alpha',
        'usage',
        { events: [event], batchId: 'one-batch' },
        ingest.actor,
      )
    ).status,
    'duplicate',
  );
  assert.equal((await f.workspace.status('alpha', f.admin)).usage.eventCount, 1);
});

test('updates stay inactive until owner activation and stale competing plans cannot win', async (t) => {
  const f = await fixture(t),
    owner = f.issue('owner').actor;
  const input = { expectedRevision: 1, kitDigest: f.release.digest, profile: alternate };
  const plan = await f.workspace.prepareUpdate('alpha', input, owner);
  const competitor = await f.workspace.prepareUpdate('alpha', input, owner);
  assert.equal(plan.status, 'prepared-not-active');
  assert.equal(plan.profileChange.changed, true);
  assert.equal(
    f.workspace.catalog.project('alpha', owner).currentGeneration,
    f.project.currentGeneration,
  );
  await assert.rejects(f.workspace.activate('alpha', activation(plan), f.issue('operator').actor));
  const changed = await f.workspace.activate('alpha', activation(plan), owner);
  assert.equal(changed.revision, 2);
  assert.equal(changed.currentGeneration, plan.targetGeneration);
  assert.equal((await f.workspace.status('alpha', owner)).usage.telemetryEnabled, false);
  await assert.rejects(f.workspace.activate('alpha', activation(competitor), owner), /stale/);
  await assert.rejects(f.workspace.activate('alpha', activation(plan), owner), /stale/);
  assert.equal(f.workspace.catalog.generations('alpha', owner).length, 2);
});

test('rollback prepares a fresh generation and preserves activation history', async (t) => {
  const f = await fixture(t);
  const plan = await f.workspace.prepareUpdate(
    'alpha',
    { expectedRevision: 1, kitDigest: f.release.digest, profile: alternate },
    f.admin,
  );
  await f.workspace.activate('alpha', activation(plan), f.admin);
  const rollback = await f.workspace.prepareRollback(
    'alpha',
    { expectedRevision: 2, generationId: f.project.currentGeneration },
    f.admin,
  );
  assert.notEqual(rollback.targetGeneration, f.project.currentGeneration);
  assert.equal(f.workspace.catalog.project('alpha', f.admin).revision, 2);
  const changed = await f.workspace.activate('alpha', activation(rollback), f.admin);
  assert.equal(changed.revision, 3);
  assert.deepEqual(
    await readJson(join(f.location, 'generations', changed.currentGeneration, 'profile.json')),
    profile,
  );
  assert.equal(f.workspace.catalog.generations('alpha', f.admin).length, 3);
});

test('expired, edited, and drifted preparations cannot be activated', async (t) => {
  const f = await fixture(t);
  const plan = await f.workspace.prepareUpdate(
    'alpha',
    { expectedRevision: 1, kitDigest: f.release.digest, profile: alternate },
    f.admin,
  );
  await writeFile(
    join(f.location, 'generations', plan.targetGeneration, 'generated/profile-tokens.css'),
    'unreviewed drift',
  );
  await assert.rejects(f.workspace.activate('alpha', activation(plan), f.admin), /verification/);
  const clean = await f.workspace.prepareUpdate(
    'alpha',
    { expectedRevision: 1, kitDigest: f.release.digest, profile },
    f.admin,
  );
  f.advance(86400001);
  await assert.rejects(f.workspace.activate('alpha', activation(clean), f.admin), /expired/);
  const next = await f.workspace.prepareUpdate(
    'alpha',
    { expectedRevision: 1, kitDigest: f.release.digest, profile },
    f.admin,
  );
  const path = join(f.location, 'plans', `${next.id}.json`),
    stored = await readJson(path);
  stored.proposal.profileSha256 = '0'.repeat(64);
  await writeFile(path, JSON.stringify(stored));
  await assert.rejects(f.workspace.activate('alpha', activation(next), f.admin), /changed/);
  assert.equal(f.workspace.catalog.project('alpha', f.admin).revision, 1);
});

test('changed installed release is rejected before loading or using runtime code', async (t) => {
  const f = await fixture(t);
  const path = join(f.location, 'kits', f.release.digest, 'runtime/core.mjs');
  await writeFile(path, 'throw new Error("UNTRUSTED-RUNTIME-EXECUTED");');
  await assert.rejects(
    f.workspace.status('alpha', f.admin),
    (error) =>
      !error.message.includes('UNTRUSTED-RUNTIME-EXECUTED') &&
      /hash|sha256|integrity|digest/i.test(error.message),
  );
});

test('opt-out clears usage in retained generations and reopening retains revision and role boundaries', async (t) => {
  const f = await fixture(t);
  await f.workspace.execute('alpha', 'telemetry', { enabled: true }, f.admin);
  const plan = await f.workspace.prepareUpdate(
    'alpha',
    { expectedRevision: 1, kitDigest: f.release.digest, profile: alternate },
    f.admin,
  );
  await f.workspace.activate('alpha', activation(plan), f.admin);
  await f.workspace.execute('alpha', 'telemetry', { enabled: false }, f.admin);
  assert.equal(
    (await readJson(join(f.location, 'generations', f.project.currentGeneration, 'project.json')))
      .telemetryEnabled,
    false,
  );
  const viewer = f.issue('viewer');
  f.workspace.close();
  const reopened = await openWorkspace({ directory: f.location, clock: () => epoch });
  t.after(() => reopened.close());
  assert.equal(
    (await reopened.status('alpha', reopened.catalog.authenticate(viewer.token))).workspace
      .projectRevision,
    2,
  );
  await assert.rejects(
    reopened.execute('alpha', 'reconcile', {}, reopened.catalog.authenticate(viewer.token)),
  );
});

async function serve(t, f, options = {}) {
  const server = createWorkspaceServer(f.workspace, options);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, { token = f.token, body, headers = {}, ...rest } = {}) =>
    fetch(`${base}${path}`, {
      ...rest,
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined
          ? {}
          : { 'Content-Type': 'application/json', 'X-Aegis-Client': 'console' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { request, base };
}
test('HTTP authentication, project scope, consent roles, revocation, and non-disclosure are enforced', async (t) => {
  const f = await fixture(t),
    { request } = await serve(t, f),
    viewer = f.issue('viewer');
  const endpoint = '/api/aegis-workspace/projects/alpha';
  assert.equal((await request('/healthz', { token: null })).status, 200);
  assert.equal((await request(`${endpoint}/status`, { token: null })).status, 401);
  assert.equal((await request(`${endpoint}/status`, { token: viewer.token })).status, 200);
  assert.equal(
    (await request(`${endpoint}/reconcile`, { token: viewer.token, body: {} })).status,
    403,
  );
  assert.equal(
    (await request('/api/aegis-workspace/projects/hidden/status', { token: viewer.token })).status,
    403,
  );
  assert.equal(
    (await request(`${endpoint}/telemetry`, { body: { enabled: true, extra: 'forbidden' } }))
      .status,
    400,
  );
  f.workspace.catalog.revokeToken(viewer.record.id, f.admin);
  assert.equal((await request(`${endpoint}/status`, { token: viewer.token })).status, 401);
  const text = await (await request(`${endpoint}/status?token=${f.token}`)).text();
  assert.ok(!text.includes(f.token));
  assert.ok(!text.includes(f.location));
  const metadata = await (await request('/api/aegis-workspace/projects')).json();
  assert.equal(metadata.projects.length, 1);
  assert.equal(metadata.actor.role, 'admin');
});
test('HTTP rejects hostile origins, hosts, unsupported bodies, and excess request rates', async (t) => {
  const f = await fixture(t),
    { request, base } = await serve(t, f, { maximumRequestsPerMinute: 4 });
  const endpoint = '/api/aegis-workspace/projects/alpha/status';
  assert.equal(
    (await request(endpoint, { headers: { Origin: 'https://evil.invalid' } })).status,
    403,
  );
  const hostileHost = await new Promise((resolve, reject) => {
    const req = httpRequest(
      base + endpoint,
      { headers: { Host: 'evil.invalid', Authorization: `Bearer ${f.token}` } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(hostileHost, 403);
  assert.equal(
    (await request(endpoint, { headers: { Origin: 'http://127.0.0.1:4175' } })).status,
    200,
  );
  assert.equal(
    (
      await request('/api/aegis-workspace/projects/alpha/usage', {
        body: { events: [], batchId: 'a' },
        headers: { 'X-Aegis-Client': '' },
      })
    ).status,
    403,
  );
  assert.equal((await request(endpoint)).status, 200);
  assert.equal((await request(endpoint)).status, 200);
  assert.equal((await request(endpoint)).status, 429);
});

test('replaced workspace directories cannot redirect installation, attestation or update writes', async (t) => {
  for (const name of ['kits', 'attestations', 'plans']) {
    const f = await fixture(t);
    const outside = join(root, `outside-${f.project.currentGeneration}`);
    await mkdir(outside);
    await rename(join(f.location, name), join(f.location, `${name}-retained`));
    await symlink(outside, join(f.location, name));
    await assert.rejects(
      f.workspace.installKit({ sourceDirectory: kit, attestation }, f.admin),
      /symbolic links/,
    );
    await assert.rejects(
      f.workspace.prepareUpdate(
        'alpha',
        { expectedRevision: 1, kitDigest: f.release.digest, profile },
        f.admin,
      ),
      /symbolic links/,
    );
    await assert.rejects(f.workspace.status('alpha', f.admin), /symbolic links/);
    assert.deepEqual(await readdir(outside), []);
  }
});
