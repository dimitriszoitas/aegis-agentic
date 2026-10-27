import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInfrastructure } from './store.mjs';
import { createInfrastructureServer } from './server.mjs';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const now = Date.UTC(2026, 9, 27, 12);
const today = '2026-10-27';
let sandbox;
let kitDirectory;
let core;
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'aegis-infrastructure-tests-'));
  kitDirectory = join(sandbox, 'kit');
  // Freeze one built kit so a concurrent build cannot change a running project's pin.
  await cp(join(root, 'agent-kit'), kitDirectory, { recursive: true });
  core = await import(pathToFileURL(join(kitDirectory, 'runtime/core.mjs')).href);
});
after(async () => {
  if (sandbox) await rm(sandbox, { recursive: true, force: true });
});

async function fixture(t) {
  const directory = await mkdtemp(join(sandbox, 'case-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const projectDirectory = join(directory, 'project');
  const calls = [];
  let providerFails = false;
  const reopen = () =>
    createInfrastructure({
      kitDirectory,
      projectDirectory,
      core,
      clock: () => now,
      environment: { OPENAI_API_KEY: 'test-only-placeholder', PATH: process.env.PATH },
      aiRequest: async (request) => {
        calls.push(structuredClone(request));
        if (providerFails) throw new Error('Mock provider failed.');
        return { summary: 'No action is supported by this test evidence.', proposals: [] };
      },
    });
  const service = reopen();
  const initial = await service.initialize({
    id: 'review-project',
    name: 'Private project display name',
    profile: core.designProfiles[0],
  });
  assert.equal(initial.health.status, 'healthy');
  const file = (path) => join(projectDirectory, path);
  const policy = await readJson(file('usage-policy.json'));
  const event = {
    version: 1,
    timestamp: now,
    registryId: 'review-project',
    registryRevision: core.registry.revision,
    componentId: Object.keys(policy.components)[0],
    profileId: core.designProfiles[0].id,
    kind: 'render',
    mode: 'light',
    presentation: 'fundamental',
  };
  return {
    service,
    reopen,
    initial,
    directory,
    file,
    event,
    calls,
    failProvider: () => {
      providerFails = true;
    },
  };
}

const protectedPaths = [
  'project.json',
  'release.json',
  'profile.json',
  'generated/profile.json',
  'generated/profile-lock.json',
];
async function contents(file, paths = protectedPaths) {
  return Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, await readFile(file(path), 'utf8')])),
  );
}
const hasIssue = (health, code) => health.issues.some((issue) => issue.code === code);

test('initialization pins a healthy release, disables collection and AI, and never overwrites an existing project', async (t) => {
  const f = await fixture(t);
  assert.equal(f.initial.usage.telemetryEnabled, false);
  assert.equal(f.initial.usage.eventCount, 0);
  assert.equal(f.initial.ai.configured, false);
  assert.equal(f.initial.ai.provider, 'none');
  assert.ok(f.initial.capabilities.components > 0);
  assert.equal(f.initial.capabilities.verifiedConfigurations, 0);
  const config = await readJson(f.file('project.json'));
  const release = await readJson(f.file('release.json'));
  assert.deepEqual(config.pin, release.pin);
  assert.equal(config.pin.projectId, 'review-project');
  assert.equal(
    await readFile(f.file('generated/profile-tokens.css'), 'utf8'),
    core.compileProfile(core.designProfiles[0]).css,
  );
  const before = await contents(f.file);
  await assert.rejects(
    f.service.initialize({ id: 'replacement', profile: core.designProfiles[1] }),
    /EEXIST/,
  );
  assert.deepEqual(await contents(f.file), before);
  assert.equal(f.calls.length, 0);
});

test('usage needs opt-in, rejects a whole invalid batch, persists dedup receipts across restart, and clears on opt-out', async (t) => {
  const f = await fixture(t);
  const empty = await readFile(f.file('usage.json'), 'utf8');
  assert.deepEqual(await f.service.ingest([f.event], 'disabled-batch'), {
    accepted: 0,
    status: 'disabled',
  });
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), empty);
  await f.service.setTelemetry(true);
  await assert.rejects(
    f.service.ingest([f.event, { ...f.event, label: 'private text' }], 'invalid-batch'),
    /unsupported/,
  );
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), empty);
  await assert.rejects(f.service.ingest(Array(101).fill(f.event), 'too-many'), /at most 100/);
  const events = [f.event, { ...f.event, kind: 'action' }];
  assert.deepEqual(await f.service.ingest(events, 'same-batch'), {
    accepted: 2,
    retained: 2,
    status: 'recorded',
  });
  const stored = await readFile(f.file('usage.json'), 'utf8');
  const restarted = f.reopen();
  assert.deepEqual(await restarted.ingest(events, 'same-batch'), {
    accepted: 0,
    retained: 2,
    status: 'duplicate',
  });
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), stored);
  await assert.rejects(
    restarted.ingest([{ ...f.event, kind: 'error' }], 'same-batch'),
    /different events/,
  );
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), stored);
  const summary = (await restarted.status()).usage;
  assert.equal(summary.eventCount, 2);
  assert.equal(summary.byKind.render, 1);
  assert.equal(summary.byKind.action, 1);
  await restarted.setTelemetry(false);
  assert.deepEqual(await readJson(f.file('usage.json')), { version: 1, events: [], receipts: [] });
  assert.equal((await restarted.status()).usage.eventCount, 0);
  assert.equal((await restarted.ingest(events, 'after-opt-out')).status, 'disabled');
  assert.equal(f.calls.length, 0);
});

test('pin disagreement blocks ingestion and update planning before persistent usage changes', async (t) => {
  const f = await fixture(t);
  await f.service.setTelemetry(true);
  const config = await readJson(f.file('project.json'));
  config.pin.registryRevision++;
  await writeJson(f.file('project.json'), config);
  const before = await readFile(f.file('usage.json'), 'utf8');
  const health = await f.service.health();
  assert.equal(health.status, 'review-required');
  assert.ok(hasIssue(health, 'pin-mismatch'));
  await assert.rejects(
    f.service.ingest(
      [{ ...f.event, registryRevision: config.pin.registryRevision }],
      'wrong-revision',
    ),
    /integrity/,
  );
  await assert.rejects(f.service.updatePlan(await readJson(f.file('release.json'))), /integrity/);
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), before);
});

test('repair restores only known derived drift and missing outputs while preserving all approved inputs', async (t) => {
  const f = await fixture(t);
  const protectedBefore = await contents(f.file);
  const derived = await contents(f.file, [
    'generated/profile-tokens.css',
    'generated/profile-tokens.json',
  ]);
  await writeFile(f.file('generated/profile-tokens.css'), 'local derived drift\n');
  await rm(f.file('generated/profile-tokens.json'));
  assert.equal((await f.service.health()).status, 'drift');
  const repair = await f.service.reconcile();
  assert.equal(repair.status, 'verified');
  assert.equal(repair.health.status, 'healthy');
  assert.deepEqual(await contents(f.file), protectedBefore);
  assert.deepEqual(await contents(f.file, Object.keys(derived)), derived);
  const run = (await f.service.status()).recentRuns.find((entry) => entry.kind === 'reconcile');
  const evidence = await readJson(join(run.evidenceDirectory, 'report.json'));
  assert.equal(evidence.attempt, 1);
  assert.equal(evidence.protectedInputsUnchanged, true);
  assert.equal(evidence.changed.length, 2);
  assert.equal(
    await readFile(join(run.evidenceDirectory, 'profile-tokens.css.before'), 'utf8'),
    'local derived drift\n',
  );
  const evidenceDirectories = await readdir(f.file('generated/.aegis-maintenance'));
  assert.equal((await f.service.reconcile()).status, 'healthy');
  assert.deepEqual(await readdir(f.file('generated/.aegis-maintenance')), evidenceDirectories);
});

test('changed approved profile source requires review and cannot be silently repaired or sent to AI', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  const profile = await readJson(f.file('profile.json'));
  profile.brand = core.designProfiles[1].brand;
  await writeJson(f.file('profile.json'), profile);
  await writeFile(f.file('generated/profile-tokens.css'), 'preserve disputed output');
  const before = await contents(f.file, [
    ...protectedPaths,
    'generated/profile-tokens.css',
    'ai-budget.json',
  ]);
  const health = await f.service.health();
  assert.ok(hasIssue(health, 'profile-source-change'));
  assert.equal((await f.service.reconcile()).status, 'review-required');
  await assert.rejects(f.service.plan({ useAI: true }), /integrity/);
  assert.equal(f.calls.length, 0);
  assert.deepEqual(await contents(f.file, Object.keys(before)), before);
});

test('a separately recompiled generated profile cannot replace the project approved profile', async (t) => {
  const f = await fixture(t);
  await execute(process.execPath, [
    join(kitDirectory, 'bin/aegis.mjs'),
    'profile',
    'compile',
    join(kitDirectory, 'profiles/atlas.json'),
    '--out',
    f.file('generated'),
  ]);
  assert.equal((await readJson(f.file('generated/profile.json'))).id, 'atlas');
  assert.equal((await readJson(f.file('profile.json'))).id, 'aegis');
  const before = await contents(f.file, [...protectedPaths, 'generated/profile-tokens.css']);
  const health = await f.service.health();
  assert.equal(health.status, 'review-required');
  assert.ok(hasIssue(health, 'generated-profile-mismatch'));
  assert.equal((await f.service.reconcile()).status, 'review-required');
  assert.deepEqual(await contents(f.file, Object.keys(before)), before);
});

test('changed release metadata is filtered from summaries and blocks remote evidence before budget consumption', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  const release = await readJson(f.file('release.json'));
  release.inventory.summary.privateNotes = 'sensitive-local-note';
  await writeJson(f.file('release.json'), release);
  const before = await readFile(f.file('ai-budget.json'), 'utf8');
  const current = await f.service.status();
  assert.ok(hasIssue(current.health, 'release-source-change'));
  assert.equal(JSON.stringify(current.capabilities).includes('sensitive-local-note'), false);
  await assert.rejects(f.service.plan({ useAI: true }), /integrity/);
  assert.equal(f.calls.length, 0);
  assert.equal(await readFile(f.file('ai-budget.json'), 'utf8'), before);
  assert.deepEqual(await readdir(f.file('plans')), []);
});

test('a generated directory symlink cannot redirect repair outside its project', async (t) => {
  const f = await fixture(t);
  const outside = join(f.directory, 'outside-generated');
  await rename(f.file('generated'), outside);
  await symlink(outside, f.file('generated'));
  await writeFile(join(outside, 'profile-tokens.css'), 'external content must stay unchanged');
  const before = await readFile(join(outside, 'profile-tokens.css'), 'utf8');
  assert.equal((await f.service.health()).status, 'review-required');
  assert.equal((await f.service.reconcile()).status, 'review-required');
  assert.equal(await readFile(join(outside, 'profile-tokens.css'), 'utf8'), before);
  assert.equal((await readdir(outside)).includes('.aegis-maintenance'), false);
});

test('a plans directory symlink cannot redirect a plan write or consume an AI request', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  const outside = join(f.directory, 'outside-plans');
  await rename(f.file('plans'), outside);
  await symlink(outside, f.file('plans'));
  await assert.rejects(f.service.plan(), /symlink/);
  const before = await readFile(f.file('ai-budget.json'), 'utf8');
  await assert.rejects(f.service.plan({ useAI: true }), /symlink/);
  assert.deepEqual(await readdir(outside), []);
  assert.equal(f.calls.length, 0);
  assert.equal(await readFile(f.file('ai-budget.json'), 'utf8'), before);
});

test('an evidence directory symlink cannot redirect repair backups outside its project', async (t) => {
  const f = await fixture(t);
  const outside = join(f.directory, 'outside-evidence');
  await mkdir(outside);
  await symlink(outside, f.file('generated/.aegis-maintenance'));
  await writeFile(
    f.file('generated/profile-tokens.css'),
    'preserve derived drift until destination review',
  );
  const repair = await f.service.reconcile();
  assert.equal(repair.status, 'review-required');
  assert.deepEqual(await readdir(outside), []);
  assert.equal(
    await readFile(f.file('generated/profile-tokens.css'), 'utf8'),
    'preserve derived drift until destination review',
  );
});

test('corrupt, future and exhausted budgets fail closed, while a valid earlier day rolls over', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  for (const budget of [
    [],
    {},
    { date: today, used: -1 },
    { date: today, used: 1.5 },
    { date: today, used: 5 },
    { date: today, used: 0, extra: true },
    { date: '2026-02-30', used: 0 },
    { date: '2026-10-28', used: 0 },
  ]) {
    await writeJson(f.file('ai-budget.json'), budget);
    const before = await readFile(f.file('ai-budget.json'), 'utf8');
    await assert.rejects(f.service.plan({ useAI: true }), /budget/i);
    assert.equal(await readFile(f.file('ai-budget.json'), 'utf8'), before);
    assert.equal(f.calls.length, 0);
  }
  await writeJson(f.file('ai-budget.json'), { date: '2026-10-26', used: 20 });
  const result = await f.service.plan({ useAI: true });
  assert.equal(result.verification, 'proposal-only');
  assert.equal(f.calls.length, 1);
  assert.deepEqual(await readJson(f.file('ai-budget.json')), { date: today, used: 1 });
});

test('provider failures consume budget, leave no plan, and cannot exceed the daily request limit', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  f.failProvider();
  for (let attempt = 1; attempt <= 5; attempt++) {
    await assert.rejects(f.service.plan({ useAI: true }), /Mock provider failed/);
    assert.equal(f.calls.length, attempt);
    assert.deepEqual(await readJson(f.file('ai-budget.json')), { date: today, used: attempt });
  }
  await assert.rejects(f.service.plan({ useAI: true }), /budget/);
  assert.equal(f.calls.length, 5);
  assert.deepEqual(await readdir(f.file('plans')), []);
  const failed = (await f.service.status()).recentRuns.filter((run) => run.kind === 'ai-plan');
  assert.equal(failed.length, 5);
  assert.ok(failed.every((run) => run.status === 'failed'));
});

test('AI receives selected aggregates without project text, raw events, profile IDs or configurable prop values', async (t) => {
  const f = await fixture(t);
  await f.service.setAI({ enabled: true, model: 'test-model' });
  await f.service.setTelemetry(true);
  const policy = await readJson(f.file('usage-policy.json'));
  policy.components[f.event.componentId].props = { disabled: { type: 'boolean' } };
  await writeJson(f.file('usage-policy.json'), policy);
  await f.service.ingest([{ ...f.event, props: { disabled: true } }], 'aggregate-batch');
  const before = await contents(f.file);
  const result = await f.service.plan({ useAI: true });
  assert.equal(result.source, 'openai');
  assert.equal(result.verification, 'proposal-only');
  const context = f.calls[0].context;
  assert.deepEqual(Object.keys(context).sort(), [
    'capabilities',
    'componentIds',
    'evidenceIds',
    'health',
    'usage',
  ]);
  assert.deepEqual(Object.keys(context.usage).sort(), [
    'byComponent',
    'byKind',
    'byMode',
    'byPresentation',
    'eventCount',
  ]);
  assert.equal(context.usage.eventCount, 1);
  assert.equal(context.usage.byComponent[f.event.componentId], 1);
  for (const sensitive of [
    'Private project display name',
    'review-project',
    'test-only-placeholder',
    'props',
    'timestamp',
    'profileId',
  ])
    assert.equal(JSON.stringify(context).includes(sensitive), false);
  assert.deepEqual(await contents(f.file), before);
  assert.equal((await readJson(f.file(`plans/${result.id}.json`))).verification, 'proposal-only');
});

test('malformed paths are handled as requests and local cross-origin guards run before service calls', async () => {
  let statusCalls = 0;
  const server = createInfrastructureServer({
    status: async () => {
      statusCalls++;
      return { ok: true };
    },
  });
  const handler = server.listeners('request')[0];
  async function invoke(url, headers = {}) {
    let responseStatus;
    let body;
    const response = {
      writeHead(status) {
        responseStatus = status;
      },
      end(value) {
        body = value;
      },
      setHeader() {},
    };
    await handler(
      { url, method: 'GET', headers: { host: '127.0.0.1:4177', ...headers } },
      response,
    );
    return { status: responseStatus, body: body ? JSON.parse(body) : null };
  }
  assert.equal((await invoke('//%')).status, 400);
  assert.equal((await invoke('https://unrelated.example/')).status, 400);
  assert.equal(
    (await invoke('/api/aegis/status', { origin: 'https://unrelated.example' })).status,
    403,
  );
  assert.equal((await invoke('/api/aegis/status', { host: 'unrelated.example' })).status, 403);
  assert.equal(statusCalls, 0);
  assert.equal((await invoke('/api/aegis/status')).status, 200);
  assert.equal(statusCalls, 1);
});
