import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile, rm, stat, chmod, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runWorkspaceCli, workspaceMaintenanceService } from './workspace-cli.mjs';
import { createMaintenanceLoop } from './retention.mjs';

async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), 'aegis-workspace-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function run(args, dependencies = {}) {
  let stdout = '',
    stderr = '';
  const code = await runWorkspaceCli(args, {
    environment: {},
    ...dependencies,
    stdout: (text) => {
      stdout += text;
      dependencies.stdout?.(text);
    },
    stderr: (text) => {
      stderr += text;
    },
  });
  return {
    code,
    stdout,
    stderr,
    value: stdout && !stdout.startsWith('Aegis') ? JSON.parse(stdout) : null,
  };
}
async function credential(root) {
  const path = join(root, 'credential.token');
  await writeFile(path, 'fixture-token\n', { mode: 0o600 });
  return path;
}
function stubWorkspace() {
  const calls = [];
  const actor = { id: 'actor' };
  const workspace = {
    location: '/fixture/workspace',
    policy: { requireSignature: true },
    catalog: {
      authenticate: (token) => {
        calls.push(['authenticate', token]);
        return actor;
      },
      authorize: (...args) => calls.push(['authorize', ...args]),
      listProjects: () => [{ id: 'alpha' }],
      audit: (_actor, options) => {
        calls.push(['audit', options]);
        return [];
      },
      generations: (id) => [{ id }],
    },
    close: () => calls.push(['close']),
    status: async (id) => {
      calls.push(['status', id]);
      return { health: { status: 'healthy' } };
    },
    inventory: async (id) => ({ id }),
    execute: async (...args) => {
      calls.push(['execute', ...args]);
      return { status: 'proposal-only' };
    },
    prepareUpdate: async (...args) => {
      calls.push(['prepareUpdate', ...args]);
      return { status: 'prepared-not-active' };
    },
    prepareRollback: async (...args) => {
      calls.push(['prepareRollback', ...args]);
      return { status: 'prepared-not-active' };
    },
    activate: async (...args) => {
      calls.push(['activate', ...args]);
      return { revision: 2 };
    },
  };
  return { workspace, calls, actor, openWorkspaceImpl: async () => workspace };
}

test('workspace CLI help and parsing never initialize or modify a workspace', async () => {
  let opened = false;
  const dependencies = {
    openWorkspaceImpl: async () => {
      opened = true;
      throw new Error('unexpected');
    },
  };
  assert.equal((await run(['help'], dependencies)).code, 0);
  for (const args of [
    ['unknown'],
    ['init', '--workspace', 'x', '--workspace', 'y'],
    ['status', '--use-ai'],
    ['activate', '--plan-id'],
    ['token-issue', '--token', 'raw-token'],
    ['help', '--workspace', 'x'],
  ])
    assert.equal((await run(args, dependencies)).code, 1, JSON.stringify(args));
  assert.equal(opened, false);
});

test('workspace CLI signed initialization requires trust; bootstrap credentials stay in a 0600 file', async (t) => {
  const root = await temporary(t),
    path = join(root, 'workspace');
  assert.equal((await run(['init', '--workspace', path])).code, 1);
  await assert.rejects(stat(path), { code: 'ENOENT' });
  const keys = await run(['release-keygen', '--out', join(root, 'keys')]);
  assert.equal(keys.code, 0, keys.stderr);
  assert.equal((await stat(keys.value.privateKeyFile)).mode & 0o777, 0o600);
  assert.equal(keys.stdout.includes('PRIVATE KEY'), false);
  const initialized = await run([
    'init',
    '--workspace',
    path,
    '--trusted-keys',
    keys.value.publicKeyFile,
  ]);
  assert.equal(initialized.code, 0, initialized.stderr);
  assert.equal(initialized.value.policy.requireSignature, true);
  const token = (await readFile(initialized.value.outputFile, 'utf8')).trim();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal((await stat(initialized.value.outputFile)).mode & 0o777, 0o600);
  assert.equal(initialized.stdout.includes(token), false);
  assert.equal(initialized.stderr.includes(token), false);
  assert.equal((await run(['init', '--workspace', path, '--allow-unsigned-local'])).code, 1);
  assert.equal((await run(['projects', '--workspace', path])).code, 0);
});

test('workspace CLI token issue/list/revoke persists no raw token in output and refuses overwrite', async (t) => {
  const root = await temporary(t),
    path = join(root, 'workspace');
  assert.equal((await run(['init', '--workspace', path, '--allow-unsigned-local'])).code, 0);
  const out = join(root, 'operator.token');
  const args = [
    'token-issue',
    '--workspace',
    path,
    '--role',
    'admin',
    '--label',
    'CLI test',
    '--expires-in-days',
    '1',
    '--out',
    out,
  ];
  const issued = await run(args);
  assert.equal(issued.code, 0, issued.stderr);
  const token = (await readFile(out, 'utf8')).trim();
  assert.equal((await stat(out)).mode & 0o777, 0o600);
  assert.equal(issued.stdout.includes(token), false);
  const before = await run(['token-list', '--workspace', path]);
  assert.equal(before.value.credentials.length, 2);
  assert.equal(before.stdout.includes(token), false);
  assert.equal((await run(args)).code, 1);
  assert.equal((await run(['token-list', '--workspace', path])).value.credentials.length, 2);
  assert.equal(
    (await run(['token-revoke', '--workspace', path, '--id', issued.value.credential.id])).code,
    0,
  );
  assert.equal((await run(['projects', '--workspace', path, '--token-file', out])).code, 1);
});

test('workspace CLI rejects public, linked and oversized credential files before opening state', async (t) => {
  const root = await temporary(t),
    token = await credential(root);
  let opened = false;
  const dependencies = {
    openWorkspaceImpl: async () => {
      opened = true;
      throw new Error('unexpected');
    },
  };
  await chmod(token, 0o644);
  assert.equal(
    (await run(['projects', '--workspace', root, '--token-file', token], dependencies)).code,
    1,
  );
  await chmod(token, 0o600);
  const linked = join(root, 'linked.token');
  await symlink(token, linked);
  assert.equal(
    (await run(['projects', '--workspace', root, '--token-file', linked], dependencies)).code,
    1,
  );
  await writeFile(token, 'a'.repeat(257));
  assert.equal(
    (await run(['projects', '--workspace', root, '--token-file', token], dependencies)).code,
    1,
  );
  assert.equal(opened, false);
});

test('workspace CLI signs and verifies the actual portable kit without exposing the signing key', async (t) => {
  const root = await temporary(t),
    kit = resolve('agent-kit');
  const keys = await run(['release-keygen', '--out', join(root, 'keys')]);
  const out = join(root, 'release.json');
  const signed = await run([
    'release-sign',
    '--kit',
    kit,
    '--private-key',
    keys.value.privateKeyFile,
    '--out',
    out,
    '--created-at',
    '2026-10-27T12:00:00.000Z',
  ]);
  assert.equal(signed.code, 0, signed.stderr);
  assert.equal(signed.stdout.includes('PRIVATE KEY'), false);
  const verified = await run([
    'release-verify',
    '--kit',
    kit,
    '--attestation',
    out,
    '--trusted-keys',
    keys.value.publicKeyFile,
  ]);
  assert.equal(verified.code, 0, verified.stderr);
  assert.equal(verified.value.verified, true);
  assert.equal(verified.value.digest, signed.value.digest);
  assert.equal((await run(['release-verify', '--kit', kit])).code, 1);
  assert.equal(
    (await run(['release-verify', '--kit', kit, '--allow-unsigned-local'])).value.verified,
    false,
  );
  assert.equal(
    (
      await run([
        'release-sign',
        '--kit',
        kit,
        '--private-key',
        keys.value.privateKeyFile,
        '--out',
        join(kit, 'forbidden-signature.json'),
      ])
    ).code,
    1,
  );
  await assert.rejects(stat(join(kit, 'forbidden-signature.json')), { code: 'ENOENT' });
});

test('workspace CLI only requests AI when plan explicitly includes --use-ai', async (t) => {
  const root = await temporary(t),
    token = await credential(root),
    stub = stubWorkspace();
  const args = ['plan', '--workspace', root, '--token-file', token, '--project', 'alpha'];
  assert.equal((await run(args, stub)).code, 0);
  assert.equal((await run([...args, '--use-ai'], stub)).code, 0);
  const operations = stub.calls.filter((call) => call[0] === 'execute');
  assert.deepEqual(
    operations.map((call) => call.slice(1, 4)),
    [
      ['alpha', 'plan', { useAI: false }],
      ['alpha', 'plan', { useAI: true }],
    ],
  );
});

test('workspace CLI installs, creates, inspects, prepares and explicitly activates a real project generation', async (t) => {
  const root = await temporary(t),
    workspace = join(root, 'workspace'),
    kit = resolve('agent-kit');
  const common = ['--workspace', workspace];
  const success = async (args) => {
    const result = await run(args);
    assert.equal(result.code, 0, result.stderr);
    return result.value;
  };
  await success(['init', ...common, '--allow-unsigned-local']);
  const installed = await success(['install', ...common, '--kit', kit]);
  const project = await success([
    'create-project',
    ...common,
    '--id',
    'alpha',
    '--kit-digest',
    installed.digest,
    '--profile',
    join(kit, 'profiles/aegis.json'),
  ]);
  assert.equal(project.revision, 1);
  assert.equal((await success(['projects', ...common])).projects.length, 1);
  assert.equal((await success(['kits', ...common])).kits.length, 1);
  const scoped = [...common, '--project', 'alpha'];
  assert.equal((await success(['status', ...scoped])).health.status, 'healthy');
  assert.equal((await success(['inventory', ...scoped])).status, 'ready');
  assert.equal((await success(['plan', ...scoped])).source, 'rules');
  assert.equal((await success(['reconcile', ...scoped])).status, 'healthy');
  assert.equal((await success(['retention', ...scoped])).status, 'no-op');
  const plan = await success([
    'update-prepare',
    ...scoped,
    '--kit-digest',
    installed.digest,
    '--profile',
    join(kit, 'profiles/atlas.json'),
    '--expected-revision',
    '1',
  ]);
  assert.equal(plan.status, 'prepared-not-active');
  assert.equal((await success(['status', ...scoped])).workspace.projectRevision, 1);
  const activate = [
    'activate',
    ...scoped,
    '--plan-id',
    plan.id,
    '--plan-digest',
    plan.planDigest,
    '--expected-revision',
    '1',
    '--reason',
    'Reviewed the profile and generated outputs.',
  ];
  assert.equal((await success(activate)).revision, 2);
  assert.equal((await run(activate)).code, 1);
  assert.equal((await success(['generations', ...scoped])).generations.length, 2);
  const rollback = await success([
    'rollback-prepare',
    ...scoped,
    '--generation-id',
    project.currentGeneration,
    '--expected-revision',
    '2',
  ]);
  assert.equal(rollback.status, 'prepared-not-active');
  assert.equal((await success(['status', ...scoped])).workspace.projectRevision, 2);
  assert.ok((await success(['audit', ...scoped, '--limit', '10'])).events.length > 0);
});

test('workspace CLI requires exact activation fields and forwards revision-bound preparation inputs', async (t) => {
  const root = await temporary(t),
    token = await credential(root),
    stub = stubWorkspace();
  const common = ['--workspace', root, '--token-file', token, '--project', 'alpha'];
  assert.equal(
    (
      await run(
        [
          'activate',
          ...common,
          '--plan-id',
          'plan',
          '--plan-digest',
          'digest',
          '--expected-revision',
          '1',
        ],
        stub,
      )
    ).code,
    1,
  );
  assert.equal(
    stub.calls.some((call) => call[0] === 'activate'),
    false,
  );
  assert.equal(
    (
      await run(
        [
          'activate',
          ...common,
          '--plan-id',
          'plan',
          '--plan-digest',
          'digest',
          '--expected-revision',
          '1',
          '--reason',
          'Reviewed',
        ],
        stub,
      )
    ).code,
    0,
  );
  assert.deepEqual(stub.calls.find((call) => call[0] === 'activate').slice(1, 3), [
    'alpha',
    { planId: 'plan', planDigest: 'digest', expectedRevision: 1, reason: 'Reviewed' },
  ]);
  assert.equal(
    (
      await run(
        ['rollback-prepare', ...common, '--generation-id', 'retained', '--expected-revision', '2'],
        stub,
      )
    ).code,
    0,
  );
  const profile = join(root, 'profile.json');
  await writeFile(profile, '{"id":"atlas"}');
  assert.equal(
    (
      await run(
        [
          'update-prepare',
          ...common,
          '--kit-digest',
          'digest',
          '--profile',
          profile,
          '--expected-revision',
          '2',
        ],
        stub,
      )
    ).code,
    0,
  );
  assert.deepEqual(stub.calls.find((call) => call[0] === 'prepareUpdate').slice(1, 3), [
    'alpha',
    { expectedRevision: 2, kitDigest: 'digest', profile: { id: 'atlas' } },
  ]);
});

test('workspace CLI rejects unsafe serving and invalid numeric limits before creating a listener', async (t) => {
  const root = await temporary(t),
    token = await credential(root),
    stub = stubWorkspace();
  let bound = false;
  const dependencies = {
    ...stub,
    createServer: () => {
      bound = true;
      throw new Error('unexpected');
    },
  };
  const common = ['serve', '--workspace', root, '--token-file', token];
  for (const options of [
    ['--host', '0.0.0.0'],
    ['--host', 'remote.example'],
    ['--port', '80'],
    ['--port', '1e4'],
    ['--reconcile-interval', '1'],
    ['--tls-cert', 'alone.pem'],
  ])
    assert.equal((await run([...common, ...options], dependencies)).code, 1);
  stub.workspace.policy.requireSignature = false;
  assert.equal(
    (
      await run(
        [
          ...common,
          '--host',
          '0.0.0.0',
          '--tls-cert',
          'cert',
          '--tls-key',
          'key',
          '--allowed-hosts',
          'example.test:4178',
          '--allowed-origins',
          'https://example.test',
        ],
        dependencies,
      )
    ).code,
    1,
  );
  assert.equal(bound, false);
});

test('workspace CLI wires optional maintenance status/resume and closes state after shutdown', async (t) => {
  const root = await temporary(t),
    token = await credential(root),
    stub = stubWorkspace();
  const signals = new EventEmitter();
  let serverOptions,
    bound,
    maintenanceOptions,
    stopped = false,
    resumed = false;
  const server = new EventEmitter();
  server.listen = (port, host, ready) => {
    bound = { port, host };
    server.listening = true;
    queueMicrotask(ready);
  };
  server.close = (callback) => {
    server.listening = false;
    queueMicrotask(() => {
      server.emit('close');
      callback?.();
    });
  };
  const result = await run(
    ['serve', '--workspace', root, '--token-file', token, '--reconcile-interval', '30'],
    {
      ...stub,
      signals,
      createServer: (_workspace, options) => {
        serverOptions = options;
        return server;
      },
      createMaintenance: (options) => {
        maintenanceOptions = options;
        return {
          status: () => ({ running: false, stopped }),
          stop: () => {
            stopped = true;
          },
          resume: () => {
            resumed = true;
          },
        };
      },
      stdout: () =>
        queueMicrotask(() => {
          serverOptions.maintenance.resume();
          signals.emit('SIGTERM');
        }),
    },
  );
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(bound, { port: 4178, host: '127.0.0.1' });
  assert.equal(maintenanceOptions.intervalMs, 30000);
  assert.equal(resumed, true);
  assert.equal(stopped, true);
  assert.equal(stub.calls.at(-1)[0], 'close');
  assert.equal(result.value.automaticDerivedRepair, true);
});

test('workspace maintenance discovers current projects, retains first, repairs derived drift and never plans', async () => {
  const stub = stubWorkspace();
  let projects = [{ id: 'alpha' }];
  stub.workspace.catalog.listProjects = () => projects;
  stub.workspace.status = async (id) => {
    stub.calls.push(['health', id]);
    return { health: { status: id === 'alpha' ? 'drift' : 'healthy' } };
  };
  stub.workspace.execute = async (id, action) => {
    stub.calls.push([action, id]);
    return action === 'retention'
      ? { status: 'no-op' }
      : { status: 'verified', health: { status: 'healthy' } };
  };
  const service = workspaceMaintenanceService(stub.workspace, stub.actor);
  const loop = createMaintenanceLoop({
    service,
    intervalMs: 30000,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
  });
  assert.equal((await loop.tick()).status, 'completed');
  assert.deepEqual(stub.calls, [
    ['retention', 'alpha'],
    ['health', 'alpha'],
    ['reconcile', 'alpha'],
  ]);
  projects = [...projects, { id: 'beta' }];
  stub.calls.length = 0;
  await loop.tick();
  assert.deepEqual(stub.calls, [
    ['retention', 'alpha'],
    ['retention', 'beta'],
    ['health', 'alpha'],
    ['health', 'beta'],
    ['reconcile', 'alpha'],
  ]);
  service.stop();
  loop.stop();
});

test('workspace aggregate maintenance pauses repair after repeated failure while retention continues', async () => {
  const stub = stubWorkspace();
  let retained = 0;
  stub.workspace.execute = async (_id, action) => {
    assert.equal(action, 'retention');
    retained++;
    return { status: 'no-op' };
  };
  stub.workspace.status = async () => ({ health: { status: 'review-required' } });
  const loop = createMaintenanceLoop({
    service: workspaceMaintenanceService(stub.workspace, stub.actor),
    intervalMs: 30000,
    setIntervalImpl: () => 1,
    clearIntervalImpl: () => {},
  });
  for (let i = 0; i < 4; i++) await loop.tick();
  assert.equal(retained, 4);
  assert.equal(loop.status().repairPaused, true);
  loop.resume();
  assert.equal(loop.status().repairPaused, false);
  loop.stop();
});
