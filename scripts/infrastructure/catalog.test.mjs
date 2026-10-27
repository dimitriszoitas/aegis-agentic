import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, lstat, symlink, rename, writeFile, link } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openCatalog, catalogLimits } from './catalog.mjs';

const start = Date.UTC(2026, 9, 27, 12);
const digest = 'a'.repeat(64);
const profileHash = 'b'.repeat(64);
const code = (expected) => (error) => error.code === expected;
const generation = () => ({
  generationId: randomUUID(),
  kitDigest: digest,
  profileSha256: profileHash,
});

async function fixture(t, { bootstrap = true } = {}) {
  const parent = await mkdtemp(join(tmpdir(), 'aegis-catalog-test-'));
  const directory = join(parent, 'workspace');
  const clock = { now: start };
  const handles = [];
  const open = async (create = false) => {
    const catalog = await openCatalog({ directory, create, clock: () => clock.now });
    handles.push(catalog);
    return catalog;
  };
  t.after(async () => {
    for (const handle of handles) handle.close();
    await rm(parent, { recursive: true, force: true });
  });
  const catalog = await open(true);
  const issued = bootstrap ? catalog.bootstrap() : null;
  const admin = issued ? catalog.authenticate(issued.token) : null;
  const project = (id, name = id) => catalog.createProject({ id, name, ...generation() }, admin);
  const actor = (role, projectIds = ['alpha'], expiresAt = start + 100_000) => {
    const issuedToken = catalog.issueToken(
      { label: `${role} fixture`, role, projectIds, expiresAt },
      admin,
    );
    return { ...issuedToken, actor: catalog.authenticate(issuedToken.token) };
  };
  return { parent, directory, catalog, clock, open, issued, admin, project, actor };
}

test('workspace creation is explicit, exclusive and private; reopen preserves projects and schema', async (t) => {
  const f = await fixture(t);
  const first = f.project('alpha', 'Alpha workspace project');
  assert.equal(first.revision, 1);
  assert.equal(first.activeGeneration.id, first.currentGeneration);
  assert.equal(first.activeGeneration.projectId, 'alpha');
  assert.equal(first.activeGeneration.kitDigest, digest);
  assert.equal((await lstat(f.directory)).mode & 0o777, 0o700);
  assert.equal((await lstat(f.catalog.databasePath)).mode & 0o777, 0o600);
  await assert.rejects(openCatalog({ directory: f.directory, create: true }), code('EEXIST'));
  await assert.rejects(openCatalog({ directory: join(f.parent, 'missing') }), code('ENOENT'));
  f.catalog.close();
  const reopened = await f.open();
  const actor = reopened.authenticate(f.issued.token);
  assert.deepEqual(reopened.project('alpha', actor), first);
  assert.deepEqual(reopened.generations('alpha', actor), [first.activeGeneration]);
  assert.equal(
    reopened.audit(actor).filter((event) => event.action === 'create-project').length,
    1,
  );
  const check = new DatabaseSync(reopened.databasePath, { readOnly: true });
  assert.equal(check.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(check.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  assert.equal(check.prepare('PRAGMA foreign_key_check').all().length, 0);
  check.close();
});

test('raw opaque tokens are returned once, hashed in SQLite, and absent from metadata, audit and database bytes', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const viewer = f.actor('viewer');
  assert.match(f.issued.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(f.issued.token, 'base64url').length, 32);
  assert.equal(f.issued.record.expiresAt, start + catalogLimits.bootstrapLifetimeMs);
  assert.equal(f.catalog.authenticate('invalid'), null);
  assert.equal(f.catalog.authenticate('a'.repeat(43)), null);
  assert.equal(f.catalog.authenticate({ token: viewer.token }), null);
  const metadata = JSON.stringify([f.catalog.tokens(f.admin), f.catalog.audit(f.admin)]);
  for (const secret of [f.issued.token, viewer.token])
    assert.equal(metadata.includes(secret), false);
  const check = new DatabaseSync(f.catalog.databasePath, { readOnly: true });
  const stored = check
    .prepare('SELECT token_hash FROM api_tokens WHERE id = ?')
    .get(viewer.record.id);
  assert.equal(stored.token_hash, createHash('sha256').update(viewer.token).digest('hex'));
  check.close();
  for (const path of [f.catalog.databasePath, `${f.catalog.databasePath}-wal`]) {
    const bytes = await readFile(path);
    for (const secret of [f.issued.token, viewer.token])
      assert.equal(bytes.includes(Buffer.from(secret)), false);
  }
  assert.throws(() => f.catalog.bootstrap(), code('already-bootstrapped'));
});

test('role permissions are explicit and project-scoped, including ingest access to only its active generation', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  f.project('beta');
  const matrix = {
    owner: [
      'read',
      'activate',
      'plan-update',
      'usage-settings',
      'plan',
      'reconcile',
      'retention',
      'audit',
    ],
    operator: ['read', 'usage-settings', 'plan', 'reconcile', 'retention', 'audit'],
    viewer: ['read', 'audit'],
    ingest: ['ingest'],
  };
  const all = [
    'read',
    'activate',
    'plan-update',
    'usage-settings',
    'plan',
    'reconcile',
    'retention',
    'audit',
    'ingest',
    'create-project',
    'tokens',
  ];
  for (const [role, permitted] of Object.entries(matrix)) {
    const scoped = f.actor(role).actor;
    for (const action of all) {
      if (permitted.includes(action))
        assert.equal(f.catalog.authorize(scoped, action, 'alpha'), true);
      else assert.throws(() => f.catalog.authorize(scoped, action, 'alpha'), code('forbidden'));
      assert.throws(() => f.catalog.authorize(scoped, action, 'beta'), code('forbidden'));
    }
    assert.throws(() => f.catalog.tokens(scoped), code('forbidden'));
    assert.throws(
      () =>
        f.catalog.issueToken(
          { label: 'Escalation', role: 'admin', projectIds: [], expiresAt: start + 1000 },
          scoped,
        ),
      code('forbidden'),
    );
    assert.throws(() => f.catalog.revokeToken(f.issued.record.id, scoped), code('forbidden'));
    if (role === 'ingest') {
      assert.throws(() => f.catalog.listProjects(scoped), code('forbidden'));
      assert.throws(() => f.catalog.project('alpha', scoped), code('forbidden'));
      assert.throws(() => f.catalog.generations('alpha', scoped), code('forbidden'));
      assert.equal(
        f.catalog.project('alpha', scoped, 'ingest').activeGeneration.projectId,
        'alpha',
      );
    } else {
      assert.deepEqual(
        f.catalog.listProjects(scoped).map((project) => project.id),
        ['alpha'],
      );
      assert.equal(f.catalog.generations('alpha', scoped).length, 1);
      assert.ok(f.catalog.audit(scoped, { projectId: 'alpha' }).length > 0);
      assert.throws(() => f.catalog.audit(scoped), code('forbidden'));
    }
  }
  assert.equal(f.catalog.listProjects(f.admin).length, 2);
  assert.throws(() => f.catalog.authorize(f.admin, 'invented', 'alpha'), code('forbidden'));
  assert.throws(() => f.catalog.authorize(f.admin, 'activate'), code('invalid-project'));
});

test('actors cannot be fabricated, copied, mutated or reused across catalogue handles', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  for (const actor of [
    null,
    { ...f.admin },
    Object.create(f.admin),
    { id: f.admin.id, role: 'admin' },
  ])
    assert.throws(() => f.catalog.project('alpha', actor), code('unauthenticated'));
  assert.throws(() => {
    f.admin.role = 'viewer';
  }, TypeError);
  assert.throws(() => f.admin.projectIds.push('alpha'), TypeError);
  const other = await f.open();
  assert.throws(() => other.project('alpha', f.admin), code('unauthenticated'));
  const authenticated = other.authenticate(f.issued.token);
  assert.equal(other.project('alpha', authenticated).id, 'alpha');
});

test('expiry and revocation are rechecked on every request and remain effective after restart', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const expiring = f.actor('viewer', ['alpha'], start + 1000);
  assert.equal(f.catalog.project('alpha', expiring.actor).id, 'alpha');
  f.clock.now = start + 1000;
  assert.equal(f.catalog.authenticate(expiring.token), null);
  assert.throws(() => f.catalog.project('alpha', expiring.actor), code('unauthenticated'));
  const revoked = f.actor('owner');
  const other = await f.open();
  const stale = other.authenticate(revoked.token);
  f.catalog.revokeToken(revoked.record.id, f.admin);
  assert.throws(() => other.authorize(stale, 'activate', 'alpha'), code('unauthenticated'));
  assert.equal(other.authenticate(revoked.token), null);
  assert.equal(
    f.catalog.tokens(f.admin).find((token) => token.id === revoked.record.id).revokedAt,
    f.clock.now,
  );
  const before = f.catalog.audit(f.admin).length;
  f.catalog.revokeToken(revoked.record.id, f.admin);
  assert.equal(f.catalog.audit(f.admin).length, before);
  other.close();
  const restarted = await f.open();
  assert.equal(restarted.authenticate(revoked.token), null);
});

test('bootstrap remains unavailable after expiry or revoking every existing token', async (t) => {
  const f = await fixture(t);
  f.catalog.revokeToken(f.issued.record.id, f.admin);
  assert.equal(f.catalog.authenticate(f.issued.token), null);
  assert.throws(() => f.catalog.bootstrap(), code('already-bootstrapped'));
  const other = await f.open();
  assert.throws(() => other.bootstrap(), code('already-bootstrapped'));
});

test('activation uses a durable compare-and-swap revision across independent connections', async (t) => {
  const f = await fixture(t);
  const initial = f.project('alpha');
  const second = await f.open();
  const secondActor = second.authenticate(f.issued.token);
  const expectedRevision = second.project('alpha', secondActor).revision;
  const firstUpdate = {
    projectId: 'alpha',
    expectedRevision,
    ...generation(),
    reason: 'Reviewed first candidate.',
  };
  const winner = f.catalog.activate(firstUpdate, f.admin);
  assert.equal(winner.revision, 2);
  assert.equal(winner.currentGeneration, firstUpdate.generationId);
  const staleUpdate = {
    projectId: 'alpha',
    expectedRevision,
    ...generation(),
    reason: 'Stale concurrent candidate.',
  };
  assert.throws(() => second.activate(staleUpdate, secondActor), code('revision-conflict'));
  assert.equal(second.generations('alpha', secondActor).length, 2);
  assert.equal(
    second.generations('alpha', secondActor).some((item) => item.id === staleUpdate.generationId),
    false,
  );
  const next = second.activate({ ...staleUpdate, expectedRevision: 2 }, secondActor);
  assert.equal(next.revision, 3);
  const changes = second
    .audit(secondActor, { projectId: 'alpha' })
    .filter((item) => item.action === 'activate');
  assert.equal(changes.length, 2);
  assert.equal(changes[1].details.previousGeneration, initial.currentGeneration);
  assert.equal(changes[0].details.previousGeneration, winner.currentGeneration);
  assert.equal(changes[0].details.revision, 3);
});

test('audit insertion failure rolls back the generation and project pointer in the same transaction', async (t) => {
  const f = await fixture(t);
  const initial = f.project('alpha');
  const adminDb = new DatabaseSync(f.catalog.databasePath);
  t.after(() => adminDb.close());
  adminDb.exec(
    "CREATE TRIGGER reject_activation_audit BEFORE INSERT ON audit_log WHEN NEW.action = 'activate' BEGIN SELECT RAISE(ABORT, 'injected audit failure'); END;",
  );
  const input = {
    projectId: 'alpha',
    expectedRevision: 1,
    ...generation(),
    reason: 'Reviewed candidate.',
  };
  assert.throws(() => f.catalog.activate(input, f.admin), /injected audit failure/);
  assert.deepEqual(f.catalog.project('alpha', f.admin), initial);
  assert.deepEqual(f.catalog.generations('alpha', f.admin), [initial.activeGeneration]);
  assert.equal(
    f.catalog.audit(f.admin).some((item) => item.action === 'activate'),
    false,
  );
  adminDb.exec('DROP TRIGGER reject_activation_audit');
  assert.equal(f.catalog.activate(input, f.admin).revision, 2);
});

test('foreign/reused generations, path injection and malformed fields cannot alter project state', async (t) => {
  const f = await fixture(t);
  const alpha = f.project('alpha');
  const beta = f.project('beta');
  const input = {
    projectId: 'alpha',
    expectedRevision: 1,
    ...generation(),
    reason: 'Reviewed candidate.',
  };
  for (const generationId of [alpha.currentGeneration, beta.currentGeneration])
    assert.throws(
      () => f.catalog.activate({ ...input, generationId }, f.admin),
      code('generation-exists'),
    );
  for (const malformed of [
    { ...input, generationId: '../../outside' },
    { ...input, kitDigest: '../outside' },
    { ...input, profileSha256: 'abc' },
    { ...input, directory: '/outside' },
    { ...input, expectedRevision: 0 },
    { ...input, reason: '' },
  ])
    assert.throws(() => f.catalog.activate(malformed, f.admin));
  assert.throws(() =>
    f.catalog.createProject(
      { id: "x'); DROP TABLE projects;--", name: 'Bad', ...generation() },
      f.admin,
    ),
  );
  const sqlText = "Widget'); DROP TABLE projects; --";
  const stored = f.project('literal', sqlText);
  assert.equal(stored.name, sqlText);
  f.catalog.activate({ ...input, reason: sqlText }, f.admin);
  assert.equal(f.catalog.audit(f.admin, { projectId: 'alpha' })[0].details.reason, sqlText);
  assert.equal(f.catalog.listProjects(f.admin).length, 3);
  assert.deepEqual(f.catalog.project('beta', f.admin), beta);
});

test('token scope and expiry validation reject escalation, missing projects and unknown fields atomically', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const input = {
    label: 'Scoped token',
    role: 'viewer',
    projectIds: ['alpha'],
    expiresAt: start + 1000,
  };
  const before = f.catalog.tokens(f.admin);
  const auditBefore = f.catalog.audit(f.admin);
  for (const invalid of [
    { ...input, role: 'superuser' },
    { ...input, projectIds: [] },
    { ...input, role: 'admin' },
    { ...input, projectIds: ['alpha', 'alpha'] },
    { ...input, projectIds: ['missing'] },
    { ...input, projectIds: ['../alpha'] },
    { ...input, expiresAt: start },
    { ...input, expiresAt: Infinity },
    { ...input, expiresAt: start + catalogLimits.maxTokenLifetimeMs + 1 },
    { ...input, label: '' },
    { ...input, grants: ['admin'] },
  ])
    assert.throws(() => f.catalog.issueToken(invalid, f.admin));
  assert.deepEqual(f.catalog.tokens(f.admin), before);
  assert.deepEqual(f.catalog.audit(f.admin), auditBefore);
});

test('manager audit is scoped and accepts only bounded technical fields, with stable cursor pagination', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  f.project('beta');
  const operator = f.actor('operator').actor;
  const viewer = f.actor('viewer').actor;
  const details = { status: 'recorded', count: 4, enabled: true, planId: randomUUID() };
  const row = f.catalog.recordAudit({ action: 'plan', projectId: 'alpha', details }, operator);
  details.count = 999;
  assert.equal(f.catalog.audit(viewer, { projectId: 'alpha' })[0].details.count, 4);
  assert.throws(
    () => f.catalog.recordAudit({ action: 'plan', projectId: 'beta' }, operator),
    code('forbidden'),
  );
  assert.throws(
    () => f.catalog.recordAudit({ action: 'plan', projectId: 'alpha' }, viewer),
    code('forbidden'),
  );
  for (const input of [
    { action: 'bootstrap', projectId: 'alpha' },
    { action: 'plan', projectId: 'alpha', details: { token: f.issued.token } },
    { action: 'plan', projectId: 'alpha', details: { status: f.issued.token } },
    { action: 'plan', projectId: 'alpha', details: { status: 'private user text' } },
    { action: 'plan', projectId: 'alpha', details: { nested: { content: 'private' } } },
    { action: 'plan', projectId: 'alpha', details: { count: -1 } },
  ])
    assert.throws(() => f.catalog.recordAudit(input, f.admin));
  const page = f.catalog.audit(f.admin, { projectId: 'alpha', limit: 1, beforeId: row.id });
  assert.equal(page.length, 1);
  assert.ok(page[0].id < row.id);
  assert.ok(
    f.catalog.audit(viewer, { projectId: 'alpha' }).every((entry) => entry.projectId === 'alpha'),
  );
  assert.throws(() => f.catalog.audit(f.admin, { limit: 1001 }), code('invalid-audit-query'));
  assert.throws(() => f.catalog.audit(f.admin, { unknown: true }), code('invalid-audit-query'));
});

test('retained audit history and returned pages are bounded', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const adminDb = new DatabaseSync(f.catalog.databasePath);
  t.after(() => adminDb.close());
  adminDb
    .prepare(
      `WITH RECURSIVE rows(n) AS (VALUES(1) UNION ALL SELECT n + 1 FROM rows WHERE n < ?)
    INSERT INTO audit_log(timestamp, actor_id, action, project_id, details)
    SELECT ?, ?, 'plan', 'alpha', '{}' FROM rows`,
    )
    .run(catalogLimits.auditRows + 5, start, f.admin.id);
  const newest = f.catalog.recordAudit(
    { action: 'plan', projectId: 'alpha', details: { status: 'review-required' } },
    f.admin,
  );
  assert.equal(
    adminDb.prepare('SELECT COUNT(*) AS count FROM audit_log').get().count,
    catalogLimits.auditRows,
  );
  assert.equal(f.catalog.audit(f.admin).length, catalogLimits.defaultAuditRead);
  assert.equal(f.catalog.audit(f.admin, { limit: 1000 }).length, catalogLimits.maxAuditRead);
  assert.equal(f.catalog.audit(f.admin)[0].id, newest.id);
});

test('generation and token row capacities refuse writes without consuming revisions or audit entries', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const adminDb = new DatabaseSync(f.catalog.databasePath);
  t.after(() => adminDb.close());
  const insertGeneration = adminDb.prepare(
    'INSERT INTO generations(id, project_id, kit_digest, profile_sha256, created_at) VALUES(?,?,?,?,?)',
  );
  const insertToken = adminDb.prepare(
    'INSERT INTO api_tokens(id, token_hash, label, role, project_ids, created_at, expires_at, revoked_at) VALUES(?,?,?,?,?,?,?,NULL)',
  );
  adminDb.exec('BEGIN IMMEDIATE');
  for (let i = 1; i < catalogLimits.generationsPerProject; i++)
    insertGeneration.run(randomUUID(), 'alpha', digest, profileHash, start);
  for (let i = 1; i < catalogLimits.tokens; i++)
    insertToken.run(
      randomUUID(),
      i.toString(16).padStart(64, '0'),
      'Bounded fixture',
      'viewer',
      '["alpha"]',
      start,
      start + 1000,
    );
  adminDb.exec('COMMIT');
  const auditBefore = f.catalog.audit(f.admin);
  assert.throws(
    () =>
      f.catalog.activate(
        { projectId: 'alpha', expectedRevision: 1, ...generation(), reason: 'Reviewed candidate.' },
        f.admin,
      ),
    code('capacity'),
  );
  assert.throws(() => f.actor('viewer'), code('capacity'));
  assert.equal(f.catalog.project('alpha', f.admin).revision, 1);
  assert.equal(f.catalog.generations('alpha', f.admin).length, catalogLimits.generationsPerProject);
  assert.deepEqual(f.catalog.audit(f.admin), auditBefore);
});

test('workspace, database, WAL and generation-root symlinks or hardlinks fail closed', async (t) => {
  for (const kind of ['workspace', 'database', 'wal', 'hardlink', 'generation-root']) {
    await t.test(kind, async (subtest) => {
      const f = await fixture(subtest);
      const databasePath = f.catalog.databasePath;
      f.catalog.close();
      const target = join(f.parent, 'outside');
      if (kind === 'workspace') {
        await symlink(f.directory, target);
        await assert.rejects(openCatalog({ directory: target }), code('unsafe-path'));
      } else if (kind === 'database') {
        await rename(databasePath, target);
        await symlink(target, databasePath);
        await assert.rejects(f.open(), code('unsafe-path'));
      } else if (kind === 'wal') {
        await writeFile(target, 'external bytes');
        await symlink(target, databasePath + '-wal');
        await assert.rejects(f.open(), code('unsafe-path'));
        assert.equal(await readFile(target, 'utf8'), 'external bytes');
      } else if (kind === 'hardlink') {
        await link(databasePath, target);
        await assert.rejects(f.open(), code('unsafe-path'));
      } else {
        await rename(join(f.directory, 'generations'), target);
        await symlink(target, join(f.directory, 'generations'));
        await assert.rejects(f.open(), code('unsafe-path'));
      }
    });
  }
});

test('replacing an open workspace path and unknown database versions require explicit review', async (t) => {
  const f = await fixture(t);
  f.project('alpha');
  const old = join(f.parent, 'old-generations');
  await rename(f.catalog.generationRoot, old);
  await symlink(old, f.catalog.generationRoot);
  assert.throws(() => f.catalog.listProjects(f.admin), code('unsafe-path'));
  await rm(f.catalog.generationRoot);
  await rename(old, f.catalog.generationRoot);
  f.catalog.close();
  const adminDb = new DatabaseSync(f.catalog.databasePath);
  adminDb.exec('PRAGMA user_version=999');
  adminDb.close();
  const before = await readFile(f.catalog.databasePath);
  await assert.rejects(f.open(), code('unsupported-schema'));
  assert.deepEqual(await readFile(f.catalog.databasePath), before);
});

test('invalid clocks roll back bootstrap and cannot create an unusable credential', async (t) => {
  const f = await fixture(t, { bootstrap: false });
  for (const invalid of [NaN, -1, 1.1, Number.MAX_SAFE_INTEGER]) {
    f.clock.now = invalid;
    assert.throws(() => f.catalog.bootstrap(), code('invalid-clock'));
  }
  f.clock.now = start;
  const initial = f.catalog.bootstrap();
  assert.equal(f.catalog.authenticate(initial.token).role, 'admin');
  const another = await f.open();
  assert.throws(() => another.bootstrap(), code('already-bootstrapped'));
  another.close();
  assert.throws(() => another.authenticate(initial.token), code('closed'));
});
