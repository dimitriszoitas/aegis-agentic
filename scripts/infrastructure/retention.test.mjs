import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import {
  cp,
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  rename,
  rm,
  symlink,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createInfrastructure } from './store.mjs';
import { createMaintenanceLoop, planRetention, retentionLimits } from './retention.mjs';

const now = Date.UTC(2026, 9, 27, 12);
const day = 86400000;
let sandbox, kitDirectory, core;
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value)}\n`);
const planId = (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const proposal = (index, timestamp = now) => ({
  id: planId(index),
  status: 'no-action',
  createdAt: new Date(timestamp).toISOString(),
  source: 'rules',
  summary: 'Private proposal text must not appear in retention audit.',
  proposals: [],
  deterministic: {},
  verification: 'proposal-only',
});

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'aegis-retention-tests-'));
  kitDirectory = join(sandbox, 'kit');
  await cp(resolve('agent-kit'), kitDirectory, { recursive: true });
  core = await import(pathToFileURL(join(kitDirectory, 'runtime/core.mjs')).href);
});
after(async () => {
  if (sandbox) await rm(sandbox, { recursive: true, force: true });
});
async function fixture(t) {
  const parent = await mkdtemp(join(sandbox, 'case-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const projectDirectory = join(parent, 'project');
  const service = createInfrastructure({ kitDirectory, projectDirectory, core, clock: () => now });
  await service.initialize({ id: 'retention-test', profile: core.designProfiles[0] });
  const file = (name) => join(projectDirectory, name);
  const policy = await readJson(file('usage-policy.json'));
  const event = {
    version: 1,
    timestamp: now,
    registryId: 'retention-test',
    registryRevision: core.registry.revision,
    componentId: Object.keys(policy.components)[0],
    profileId: core.designProfiles[0].id,
    kind: 'render',
    mode: 'light',
    presentation: 'fundamental',
  };
  return { service, file, event, policy, parent };
}

test('idle retention physically prunes expired/excess usage and proposals, preserves receipts and repair evidence, and audits only counts', async (t) => {
  const f = await fixture(t);
  const expired = [
    { ...f.event, timestamp: now - 31 * day },
    { ...f.event, timestamp: now - 30 * day - 1 },
  ];
  const current = Array.from({ length: 10003 }, (_, index) => ({
    ...f.event,
    timestamp: now - index,
  }));
  const receipts = [{ id: 'received-batch', sha256: 'a'.repeat(64) }];
  await writeJson(f.file('usage.json'), { version: 1, events: [...expired, ...current], receipts });
  const plans = [
    ...Array.from({ length: 101 }, (_, index) => proposal(index + 1, now - index * 1000)),
    proposal(102, now - 31 * day),
    proposal(103, now - 30 * day - 1),
  ];
  await Promise.all(plans.map((plan) => writeJson(f.file(`plans/${plan.id}.json`), plan)));
  await mkdir(f.file('generated/.aegis-maintenance/evidence'), { recursive: true });
  await writeFile(
    f.file('generated/.aegis-maintenance/evidence/report.json'),
    'preserved repair evidence',
  );
  const result = await f.service.maintainRetention();
  assert.equal(result.status, 'maintained');
  assert.deepEqual(result.usage, { before: 10005, retained: 10000, expired: 2, overflow: 3 });
  assert.deepEqual(result.plans, { before: 103, retained: 100, expired: 2, overflow: 1 });
  assert.deepEqual(await readJson(f.file('usage.json')), {
    version: 1,
    events: current.slice(3),
    receipts,
  });
  assert.deepEqual(
    (await readdir(f.file('plans'))).sort(),
    plans
      .slice(0, 100)
      .map((plan) => `${plan.id}.json`)
      .sort(),
  );
  assert.equal(
    await readFile(f.file('generated/.aegis-maintenance/evidence/report.json'), 'utf8'),
    'preserved repair evidence',
  );
  const audit = (await readJson(f.file('runs.json'))).at(-1);
  assert.equal(audit.kind, 'retention');
  assert.deepEqual(audit.counts, { usage: result.usage, plans: result.plans });
  assert(!JSON.stringify(audit).includes('componentId'));
  assert(!JSON.stringify(audit).includes('Private proposal'));
  const usageBefore = await readFile(f.file('usage.json'), 'utf8');
  assert.equal((await f.service.maintainRetention()).status, 'no-op');
  assert.equal(await readFile(f.file('usage.json'), 'utf8'), usageBefore);
});

test('cutoff is inclusive and equal-date proposal eviction is deterministic regardless of directory order', async (t) => {
  const f = await fixture(t);
  const entries = Array.from({ length: 102 }, (_, index) => ({
    name: `${planId(index + 1)}.json`,
    value: proposal(index + 1, now - 30 * day),
  }));
  const input = {
    usage: { version: 1, events: [{ ...f.event, timestamp: now - 30 * day }], receipts: [] },
    plans: entries,
    policy: f.policy,
    registryRevision: core.registry.revision,
    core,
    now,
  };
  const result = planRetention(input);
  assert.equal(result.counts.usage.expired, 0);
  assert.equal(result.counts.plans.expired, 0);
  assert.deepEqual(result.removePlans, [`${planId(101)}.json`, `${planId(102)}.json`]);
  assert.deepEqual(planRetention({ ...input, plans: [...entries].reverse() }), result);
});

test('malformed proposals, invalid usage, future events, and changed approved sources prevent all retention mutations', async (t) => {
  const f = await fixture(t);
  const expiredUsage = {
    version: 1,
    events: [{ ...f.event, timestamp: now - 31 * day }],
    receipts: [],
  };
  const oldPlan = proposal(1, now - 31 * day);
  await writeJson(f.file('usage.json'), expiredUsage);
  await writeJson(f.file(`plans/${oldPlan.id}.json`), oldPlan);
  const snapshots = async () => ({
    usage: await readFile(f.file('usage.json'), 'utf8'),
    plan: await readFile(f.file(`plans/${oldPlan.id}.json`), 'utf8'),
    history: await readFile(f.file('runs.json'), 'utf8'),
  });
  await writeFile(f.file(`plans/${planId(2)}.json`), '{ malformed private proposal');
  const before = await snapshots();
  assert.equal((await f.service.maintainRetention()).status, 'review-required');
  assert.deepEqual(await snapshots(), before);
  assert.equal(
    await readFile(f.file(`plans/${planId(2)}.json`), 'utf8'),
    '{ malformed private proposal',
  );
  await rm(f.file(`plans/${planId(2)}.json`));
  for (const invalid of [
    { ...f.event, privateText: 'must stay in evidence' },
    { ...f.event, timestamp: now + 1 },
  ]) {
    await writeJson(f.file('usage.json'), {
      version: 1,
      events: [...expiredUsage.events, invalid],
      receipts: [],
    });
    const protectedBefore = await snapshots();
    const refused = await f.service.maintainRetention();
    assert.equal(refused.status, 'review-required');
    assert(!JSON.stringify(refused).includes('must stay in evidence'));
    assert.deepEqual(await snapshots(), protectedBefore);
  }
  await writeJson(f.file('usage.json'), expiredUsage);
  const profile = await readJson(f.file('profile.json'));
  profile.name = 'Unapproved source change';
  await writeJson(f.file('profile.json'), profile);
  const protectedBefore = await snapshots();
  assert.equal((await f.service.maintainRetention()).issues[0].code, 'retention-source');
  assert.deepEqual(await snapshots(), protectedBefore);
});

test('retention rejects symlink files/directories and an existing operation lock without touching external targets', async (t) => {
  const f = await fixture(t);
  const outside = join(f.parent, 'outside.json');
  const oldPlan = proposal(1, now - 31 * day);
  await writeJson(outside, oldPlan);
  const outsideBytes = await readFile(outside, 'utf8');
  await symlink(outside, f.file(`plans/${oldPlan.id}.json`));
  assert.equal((await f.service.maintainRetention()).status, 'review-required');
  assert.equal(await readFile(outside, 'utf8'), outsideBytes);
  await rm(f.file(`plans/${oldPlan.id}.json`));
  await rename(f.file('plans'), f.file('plans-original'));
  await symlink(f.file('plans-original'), f.file('plans'));
  assert.equal((await f.service.maintainRetention()).status, 'review-required');
  await rm(f.file('plans'));
  await rename(f.file('plans-original'), f.file('plans'));
  await rename(f.file('usage.json'), f.file('usage-original.json'));
  await symlink(outside, f.file('usage.json'));
  assert.equal((await f.service.maintainRetention()).status, 'review-required');
  assert.equal(await readFile(outside, 'utf8'), outsideBytes);
  await rm(f.file('usage.json'));
  await rename(f.file('usage-original.json'), f.file('usage.json'));
  await writeFile(f.file('operation.lock'), 'existing lock');
  await assert.rejects(f.service.maintainRetention(), /holds the project lock/);
  assert.equal(await readFile(f.file('operation.lock'), 'utf8'), 'existing lock');
});

function scheduler(service, options = {}) {
  let callback,
    cleared = 0;
  const handle = {};
  const loop = createMaintenanceLoop({
    service,
    intervalMs: 30000,
    clock: () => now,
    setIntervalImpl: (fn, ms) => {
      assert.equal(ms, 30000);
      callback = fn;
      return handle;
    },
    clearIntervalImpl: (value) => {
      assert.equal(value, handle);
      cleared++;
    },
    ...options,
  });
  return { loop, timer: () => callback(), cleared: () => cleared };
}
test('three consecutive failed repairs open the circuit; retention continues, healthy cycles do not resume it, and explicit resume restores repair', async () => {
  let retains = 0,
    repairs = 0,
    health = 'drift',
    repairSucceeds = false;
  const service = {
    maintainRetention: async () => {
      retains++;
      return { status: 'no-op' };
    },
    health: async () => ({ status: health }),
    reconcile: async () => {
      repairs++;
      return repairSucceeds
        ? { status: 'verified', health: { status: 'healthy' } }
        : { status: 'review-required', health: { status: 'drift' } };
    },
    plan: () => {
      throw new Error('AI or proposal planning must never run.');
    },
  };
  const { loop } = scheduler(service);
  for (let count = 1; count <= 3; count++) {
    assert.equal((await loop.tick()).status, 'failed');
    assert.equal(loop.status().consecutiveFailures, count);
  }
  assert.equal(loop.status().repairPaused, true);
  assert.equal((await loop.tick()).status, 'paused');
  assert.equal(retains, 4);
  assert.equal(repairs, 3);
  health = 'healthy';
  await loop.tick();
  assert.equal(loop.status().repairPaused, true);
  assert.equal(loop.status().consecutiveFailures, 3);
  const copy = loop.status();
  copy.repairPaused = false;
  assert.equal(loop.status().repairPaused, true);
  loop.resume();
  assert.equal(loop.status().repairPaused, false);
  assert.equal(loop.status().consecutiveFailures, 0);
  health = 'drift';
  repairSucceeds = true;
  assert.equal((await loop.tick()).status, 'completed');
  assert.equal(repairs, 4);
  loop.stop();
});

test('successful cycles reset consecutive failures and retention/health failures prevent repair', async () => {
  let phase = 'retention',
    repairs = 0;
  const service = {
    maintainRetention: async () => ({
      status: phase === 'retention' ? 'review-required' : 'no-op',
    }),
    health: async () => ({ status: phase === 'health' ? 'review-required' : 'drift' }),
    reconcile: async () => {
      repairs++;
      return { status: 'verified', health: { status: 'healthy' } };
    },
  };
  const { loop } = scheduler(service);
  assert.equal((await loop.tick()).failurePhase, 'retention');
  assert.equal(repairs, 0);
  phase = 'health';
  assert.equal((await loop.tick()).failurePhase, 'health');
  assert.equal(repairs, 0);
  assert.equal(loop.status().consecutiveFailures, 2);
  phase = 'success';
  assert.equal((await loop.tick()).status, 'completed');
  assert.equal(loop.status().consecutiveFailures, 0);
  assert.equal(repairs, 1);
  loop.stop();
});

test('a pending cycle never overlaps, resume is explicit while idle, and stop prevents later phases and clears its timer', async () => {
  let release,
    retains = 0,
    healthCalls = 0;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { loop, timer, cleared } = scheduler({
    maintainRetention: async () => {
      retains++;
      await gate;
      return { status: 'no-op' };
    },
    health: async () => {
      healthCalls++;
      return { status: 'healthy' };
    },
    reconcile: async () => {
      throw new Error('No repair expected.');
    },
  });
  const active = loop.tick();
  assert.equal(loop.status().running, true);
  assert.deepEqual(await loop.tick(), { status: 'skipped', reason: 'cycle-running' });
  timer();
  assert.equal(retains, 1);
  assert.throws(() => loop.resume(), /idle/);
  loop.stop();
  release();
  assert.equal((await active).status, 'stopped');
  assert.equal(healthCalls, 0);
  assert.equal(cleared(), 1);
  assert.deepEqual(await loop.tick(), { status: 'stopped' });
  assert.throws(() => loop.resume(), /active/);
});

test('a new explicitly created loop has independent circuit state and malformed scheduler configuration is rejected', async () => {
  const service = {
    maintainRetention: async () => {
      throw new Error('Filesystem failure');
    },
    health: async () => ({ status: 'healthy' }),
    reconcile: async () => ({ status: 'verified', health: { status: 'healthy' } }),
  };
  const first = scheduler(service).loop;
  for (let index = 0; index < 3; index++) await first.tick();
  assert.equal(first.status().repairPaused, true);
  first.stop();
  const restarted = scheduler(service).loop;
  assert.equal(restarted.status().repairPaused, false);
  assert.equal(restarted.status().consecutiveFailures, 0);
  restarted.stop();
  assert.throws(() => createMaintenanceLoop({ service, intervalMs: 0 }), /positive integers/);
  assert.equal(retentionLimits.planMaxCount, 100);
});
