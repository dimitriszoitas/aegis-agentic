/**
 * Local workspace catalogue. Requires Node's built-in node:sqlite DatabaseSync
 * (tested on Node 24.1; that release prints an ExperimentalWarning).
 * No network, cloud identity, caller-selected generation paths, or raw token storage.
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, open, realpath } from 'node:fs/promises';
import { lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const catalogLimits = Object.freeze({
  projects: 1000,
  generations: 10000,
  generationsPerProject: 1000,
  tokens: 1000,
  tokenProjects: 128,
  auditRows: 10000,
  defaultAuditRead: 200,
  maxAuditRead: 1000,
  bootstrapLifetimeMs: 30 * 24 * 60 * 60 * 1000,
  maxTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
});

const applicationId = 0x41454753; // AEGS; distinguish this catalogue from unrelated SQLite files.
const roles = ['admin', 'owner', 'operator', 'viewer', 'ingest'];
const projectActions = [
  'read',
  'activate',
  'plan-update',
  'usage-settings',
  'plan',
  'reconcile',
  'ingest',
  'retention',
  'audit',
];
const actions = [...projectActions, 'create-project', 'tokens'];
const roleActions = {
  admin: actions,
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
const managerAuditActions = [
  'plan',
  'plan-update',
  'usage-settings',
  'reconcile',
  'ingest',
  'retention',
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const projectPattern = /^[a-z][a-z0-9-]{0,63}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const identifier = (value) =>
  typeof value === 'string' &&
  projectPattern.test(value) &&
  !['constructor', 'prototype'].includes(value);
const uuid = (value) => typeof value === 'string' && uuidPattern.test(value);
const hash = (value) => typeof value === 'string' && digestPattern.test(value);
const timestamp = (value) => Number.isSafeInteger(value) && value >= 0;
const text = (value, maximum) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= maximum &&
  [...value].every((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
const object = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
  Reflect.ownKeys(value).every(
    (key) =>
      typeof key === 'string' &&
      Object.getOwnPropertyDescriptor(value, key).enumerable &&
      'value' in Object.getOwnPropertyDescriptor(value, key),
  );
const exact = (value, required, optional = []) =>
  object(value) &&
  required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => required.includes(key) || optional.includes(key));

export class CatalogError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CatalogError';
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new CatalogError(code, message);
};

function directory(path) {
  const info = lstatSync(path);
  if (!info.isDirectory() || info.isSymbolicLink())
    fail('unsafe-path', 'Workspace directories must be real local directories.');
  return info;
}

function regular(path, optional = false) {
  try {
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
      fail('unsafe-path', 'Catalogue files must be regular files without symbolic or hard links.');
    return info;
  } catch (error) {
    if (optional && error.code === 'ENOENT') return null;
    throw error;
  }
}

function validateGeneration(value) {
  if (!uuid(value.generationId) || !hash(value.kitDigest) || !hash(value.profileSha256))
    fail('invalid-generation', 'A canonical generation UUID and two SHA-256 digests are required.');
}

function technicalDetails(input) {
  const allowed = [
    'status',
    'code',
    'planId',
    'generationId',
    'expectedRevision',
    'revision',
    'count',
    'attempt',
    'enabled',
    'source',
  ];
  if (!exact(input, [], allowed))
    fail('invalid-audit-details', 'Audit details require only supported technical fields.');
  for (const [key, value] of Object.entries(input)) {
    if (['planId', 'generationId'].includes(key) && uuid(value)) continue;
    if (
      ['expectedRevision', 'revision', 'count', 'attempt'].includes(key) &&
      Number.isSafeInteger(value) &&
      value >= 0
    )
      continue;
    if (key === 'enabled' && typeof value === 'boolean') continue;
    if (
      ['status', 'code', 'source'].includes(key) &&
      typeof value === 'string' &&
      /^[a-z][a-z0-9-]{0,39}$/.test(value)
    )
      continue;
    fail(
      'invalid-audit-details',
      'Audit detail values must be bounded technical codes, UUIDs, counts, or booleans.',
    );
  }
  return { ...input };
}

const schema = `
CREATE TABLE projects (
  id TEXT PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 64),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 120),
  current_generation TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision >= 1),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  updated_at INTEGER NOT NULL CHECK(updated_at >= 0),
  FOREIGN KEY (id, current_generation) REFERENCES generations(project_id, id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE TABLE generations (
  id TEXT PRIMARY KEY CHECK(length(id) = 36),
  project_id TEXT NOT NULL REFERENCES projects(id) DEFERRABLE INITIALLY DEFERRED,
  kit_digest TEXT NOT NULL CHECK(length(kit_digest) = 64),
  profile_sha256 TEXT NOT NULL CHECK(length(profile_sha256) = 64),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  UNIQUE(project_id, id)
) STRICT;
CREATE INDEX generations_by_project ON generations(project_id, created_at DESC);
CREATE TABLE api_tokens (
  id TEXT PRIMARY KEY CHECK(length(id) = 36),
  token_hash TEXT NOT NULL UNIQUE CHECK(length(token_hash) = 64),
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 80),
  role TEXT NOT NULL CHECK(role IN ('admin','owner','operator','viewer','ingest')),
  project_ids TEXT NOT NULL CHECK(json_valid(project_ids) AND json_type(project_ids) = 'array'),
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  expires_at INTEGER NOT NULL CHECK(expires_at > created_at),
  revoked_at INTEGER CHECK(revoked_at IS NULL OR revoked_at >= 0)
) STRICT;
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL CHECK(timestamp >= 0),
  actor_id TEXT NOT NULL REFERENCES api_tokens(id),
  action TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id),
  details TEXT NOT NULL CHECK(json_valid(details) AND json_type(details) = 'object')
) STRICT;
CREATE INDEX audit_by_project ON audit_log(project_id, id DESC);
`;

const projectQuery = `SELECT p.*, g.kit_digest, g.profile_sha256, g.created_at AS generation_created_at
  FROM projects p JOIN generations g ON g.id = p.current_generation AND g.project_id = p.id`;

function projectRecord(row) {
  return {
    id: row.id,
    name: row.name,
    currentGeneration: row.current_generation,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activeGeneration: {
      id: row.current_generation,
      projectId: row.id,
      kitDigest: row.kit_digest,
      profileSha256: row.profile_sha256,
      createdAt: row.generation_created_at,
    },
  };
}

function generationRecord(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    kitDigest: row.kit_digest,
    profileSha256: row.profile_sha256,
    createdAt: row.created_at,
  };
}

function tokenRecord(row) {
  const projectIds = JSON.parse(row.project_ids);
  if (
    !roles.includes(row.role) ||
    !Array.isArray(projectIds) ||
    projectIds.length > catalogLimits.tokenProjects ||
    !projectIds.every(identifier) ||
    new Set(projectIds).size !== projectIds.length ||
    (row.role === 'admin' ? projectIds.length !== 0 : projectIds.length === 0) ||
    !uuid(row.id) ||
    !timestamp(row.created_at) ||
    !timestamp(row.expires_at) ||
    row.expires_at <= row.created_at ||
    !(row.revoked_at === null || timestamp(row.revoked_at))
  )
    fail(
      'invalid-token-state',
      'Stored token permissions are invalid; preserve the catalogue for review.',
    );
  return {
    id: row.id,
    label: row.label,
    role: row.role,
    projectIds,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * create:true exclusively creates a new directory; open never creates a missing DB.
 * SQLite uses WAL, FULL synchronous commits and a 5000ms busy timeout. Application
 * writes and their audit rows commit together. Generation payloads remain manager-owned.
 * Authorization is local to this handle and rechecks token state on every operation.
 */
export async function openCatalog({
  directory: requestedDirectory,
  create = false,
  clock = () => Date.now(),
} = {}) {
  if (
    typeof requestedDirectory !== 'string' ||
    !requestedDirectory ||
    typeof create !== 'boolean' ||
    typeof clock !== 'function'
  )
    fail(
      'invalid-options',
      'A workspace directory, explicit create flag, and valid clock are required.',
    );
  const requested = resolve(requestedDirectory);
  if (create) await mkdir(requested, { mode: 0o700 });
  directory(requested); // Do not allow a symlink at the requested workspace itself.
  const location = await realpath(requested);
  const generationRoot = join(location, 'generations');
  const databasePath = join(location, 'catalog.sqlite');
  if (create) {
    await mkdir(generationRoot, { mode: 0o700 });
    const handle = await open(databasePath, 'wx', 0o600);
    await handle.close();
  }
  const rootIdentity = directory(location);
  const generationIdentity = directory(generationRoot);
  const databaseIdentity = regular(databasePath);
  const sidecars = ['-wal', '-shm', '-journal'].map((suffix) => databasePath + suffix);
  for (const path of sidecars) regular(path, true);
  const db = new DatabaseSync(databasePath, {
    enableForeignKeyConstraints: true,
    enableDoubleQuotedStringLiterals: false,
  });
  try {
    if (
      !create &&
      (db.prepare('PRAGMA application_id').get().application_id !== applicationId ||
        db.prepare('PRAGMA user_version').get().user_version !== 1)
    )
      fail(
        'unsupported-schema',
        'This file is not a supported Aegis workspace catalogue. No automatic migration was attempted.',
      );
    db.exec(
      'PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;',
    );
    if (create) {
      db.exec('BEGIN IMMEDIATE');
      try {
        db.exec(schema);
        db.exec(`PRAGMA application_id=${applicationId}; PRAGMA user_version=1;`);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    if (db.prepare('PRAGMA quick_check').get().quick_check !== 'ok')
      fail('catalog-integrity', 'Catalogue integrity failed. Preserve it for review.');
  } catch (error) {
    db.close();
    throw error;
  }

  const actors = new WeakMap();
  let closed = false;
  const statements = new Map();
  const statement = (sql) => {
    if (!statements.has(sql)) statements.set(sql, db.prepare(sql));
    return statements.get(sql);
  };
  function checkFiles() {
    if (closed) fail('closed', 'The workspace catalogue is closed.');
    for (const [path, original, check] of [
      [location, rootIdentity, directory],
      [generationRoot, generationIdentity, directory],
      [databasePath, databaseIdentity, regular],
    ]) {
      const current = check(path);
      if (current.dev !== original.dev || current.ino !== original.ino)
        fail(
          'replaced-path',
          'An open catalogue path was replaced. Close and review the workspace before reopening.',
        );
    }
    for (const path of sidecars) regular(path, true);
  }
  function time() {
    const value = clock();
    if (!timestamp(value))
      fail('invalid-clock', 'Catalogue clock must return nonnegative integer epoch milliseconds.');
    return value;
  }
  function transact(work) {
    checkFiles();
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function principal(actor, now = time()) {
    checkFiles();
    if (!actor || typeof actor !== 'object' || !actors.has(actor))
      fail('unauthenticated', 'Authenticate with an active workspace token.');
    const row = statement('SELECT * FROM api_tokens WHERE id = ?').get(actors.get(actor));
    if (!row || row.revoked_at !== null || row.expires_at <= now)
      fail('unauthenticated', 'The workspace token is expired or revoked.');
    return tokenRecord(row);
  }
  function permission(actor, action, projectId, now = time()) {
    const current = principal(actor, now);
    if (!actions.includes(action)) fail('forbidden', 'Unknown catalogue action.');
    if (projectId !== undefined && !identifier(projectId))
      fail('invalid-project', 'A valid project identifier is required.');
    if (!roleActions[current.role].includes(action))
      fail('forbidden', 'This token does not permit that action.');
    if (current.role !== 'admin') {
      if (!projectId || !current.projectIds.includes(projectId))
        fail('forbidden', 'This token does not permit that project.');
    }
    if (
      projectActions.includes(action) &&
      !projectId &&
      !(action === 'audit' && current.role === 'admin')
    )
      fail('invalid-project', 'This action requires a project identifier.');
    return current;
  }
  function findProject(id) {
    const row = statement(`${projectQuery} WHERE p.id = ?`).get(id);
    if (!row) fail('not-found', 'The project does not exist.');
    return projectRecord(row);
  }
  function appendAudit(actorId, action, projectId, details, now) {
    const result = statement(
      'INSERT INTO audit_log(timestamp, actor_id, action, project_id, details) VALUES(?,?,?,?,?)',
    ).run(now, actorId, action, projectId ?? null, JSON.stringify(details));
    // Retention is a deliberate bounded local history, not an immutable external log.
    statement(
      'DELETE FROM audit_log WHERE id <= (SELECT id FROM audit_log ORDER BY id DESC LIMIT 1 OFFSET ?)',
    ).run(catalogLimits.auditRows);
    return {
      id: Number(result.lastInsertRowid),
      timestamp: now,
      actorId,
      action,
      projectId: projectId ?? null,
      details: structuredClone(details),
    };
  }
  function capacity(table, maximum, where = '', value = undefined) {
    const count =
      value === undefined
        ? statement(`SELECT COUNT(*) AS count FROM ${table}${where}`).get().count
        : statement(`SELECT COUNT(*) AS count FROM ${table}${where}`).get(value).count;
    if (count >= maximum)
      fail(
        'capacity',
        'The bounded catalogue capacity has been reached. Review retention or migrate explicitly.',
      );
  }
  function insertGeneration(input, projectId, now) {
    capacity('generations', catalogLimits.generations);
    capacity(
      'generations',
      catalogLimits.generationsPerProject,
      ' WHERE project_id = ?',
      projectId,
    );
    if (statement('SELECT id FROM generations WHERE id = ?').get(input.generationId))
      fail(
        'generation-exists',
        'Every activation requires a fresh generation UUID; existing or foreign generations cannot be reused.',
      );
    statement(
      'INSERT INTO generations(id, project_id, kit_digest, profile_sha256, created_at) VALUES(?,?,?,?,?)',
    ).run(input.generationId, projectId, input.kitDigest, input.profileSha256, now);
  }
  function insertToken(input, now) {
    capacity('api_tokens', catalogLimits.tokens);
    const token = randomBytes(32).toString('base64url');
    const id = randomUUID();
    statement(
      'INSERT INTO api_tokens(id, token_hash, label, role, project_ids, created_at, expires_at, revoked_at) VALUES(?,?,?,?,?,?,?,NULL)',
    ).run(
      id,
      sha(token),
      input.label,
      input.role,
      JSON.stringify(input.projectIds),
      now,
      input.expiresAt,
    );
    return {
      token,
      record: {
        id,
        label: input.label,
        role: input.role,
        projectIds: [...input.projectIds],
        createdAt: now,
        expiresAt: input.expiresAt,
        revokedAt: null,
      },
    };
  }

  return {
    location,
    generationRoot,
    databasePath,
    close() {
      if (!closed) {
        db.close();
        closed = true;
        statements.clear();
      }
    },
    bootstrap() {
      return transact(() => {
        if (statement('SELECT COUNT(*) AS count FROM api_tokens').get().count !== 0)
          fail(
            'already-bootstrapped',
            'Bootstrap is available only before any token has ever been issued.',
          );
        const now = time();
        if (!timestamp(now + catalogLimits.bootstrapLifetimeMs))
          fail('invalid-clock', 'Catalogue clock leaves no safe bootstrap expiry.');
        const result = insertToken(
          {
            label: 'Initial workspace administrator',
            role: 'admin',
            projectIds: [],
            expiresAt: now + catalogLimits.bootstrapLifetimeMs,
          },
          now,
        );
        appendAudit(
          result.record.id,
          'bootstrap',
          null,
          { role: 'admin', expiresAt: result.record.expiresAt },
          now,
        );
        return result;
      });
    },
    authenticate(rawToken) {
      checkFiles();
      if (
        typeof rawToken !== 'string' ||
        !tokenPattern.test(rawToken) ||
        Buffer.from(rawToken, 'base64url').toString('base64url') !== rawToken
      )
        return null;
      const now = time();
      const row = statement('SELECT * FROM api_tokens WHERE token_hash = ?').get(sha(rawToken));
      if (!row || row.revoked_at !== null || row.expires_at <= now) return null;
      const record = tokenRecord(row);
      const actor = Object.freeze({
        id: record.id,
        label: record.label,
        role: record.role,
        projectIds: Object.freeze(record.projectIds),
        expiresAt: record.expiresAt,
      });
      actors.set(actor, row.id);
      return actor;
    },
    authorize(actor, action, projectId) {
      permission(actor, action, projectId);
      return true;
    },
    createProject(input, actor) {
      if (
        !exact(input, ['id', 'name', 'generationId', 'kitDigest', 'profileSha256']) ||
        !identifier(input.id) ||
        !text(input.name, 120)
      )
        fail(
          'invalid-project',
          'A valid project identity, display name, and generation are required.',
        );
      validateGeneration(input);
      return transact(() => {
        const now = time();
        const current = permission(actor, 'create-project', undefined, now);
        capacity('projects', catalogLimits.projects);
        if (statement('SELECT id FROM projects WHERE id = ?').get(input.id))
          fail('project-exists', 'A project with that identifier already exists.');
        insertGeneration(input, input.id, now);
        statement(
          'INSERT INTO projects(id, name, current_generation, revision, created_at, updated_at) VALUES(?,?,?,1,?,?)',
        ).run(input.id, input.name, input.generationId, now, now);
        appendAudit(
          current.id,
          'create-project',
          input.id,
          { generationId: input.generationId, revision: 1 },
          now,
        );
        return findProject(input.id);
      });
    },
    listProjects(actor) {
      const current = principal(actor);
      if (!roleActions[current.role].includes('read'))
        fail('forbidden', 'This token does not permit project discovery.');
      return statement(`${projectQuery} ORDER BY p.created_at, p.id LIMIT ?`)
        .all(catalogLimits.projects)
        .filter((row) => current.role === 'admin' || current.projectIds.includes(row.id))
        .map(projectRecord);
    },
    project(id, actor, action = 'read') {
      permission(actor, action, id);
      return findProject(id);
    },
    activate(input, actor) {
      if (
        !exact(input, [
          'projectId',
          'expectedRevision',
          'generationId',
          'kitDigest',
          'profileSha256',
          'reason',
        ]) ||
        !identifier(input.projectId) ||
        !Number.isSafeInteger(input.expectedRevision) ||
        input.expectedRevision < 1 ||
        !text(input.reason, 500)
      )
        fail(
          'invalid-activation',
          'Activation needs a project, expected revision, generation, and short review reason.',
        );
      validateGeneration(input);
      return transact(() => {
        const now = time();
        const current = permission(actor, 'activate', input.projectId, now);
        const previous = findProject(input.projectId);
        if (previous.revision !== input.expectedRevision)
          fail(
            'revision-conflict',
            'Project revision changed. Refresh and review the activation again.',
          );
        if (previous.revision === Number.MAX_SAFE_INTEGER)
          fail('capacity', 'Project revision capacity has been reached.');
        insertGeneration(input, input.projectId, now);
        const changed = statement(
          'UPDATE projects SET current_generation = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?',
        ).run(input.generationId, now, input.projectId, input.expectedRevision);
        if (changed.changes !== 1)
          fail(
            'revision-conflict',
            'Project revision changed. Refresh and review the activation again.',
          );
        appendAudit(
          current.id,
          'activate',
          input.projectId,
          {
            previousGeneration: previous.currentGeneration,
            generationId: input.generationId,
            previousRevision: previous.revision,
            revision: previous.revision + 1,
            reason: input.reason,
          },
          now,
        );
        return findProject(input.projectId);
      });
    },
    generations(projectId, actor) {
      permission(actor, 'read', projectId);
      findProject(projectId);
      return statement(
        'SELECT * FROM generations WHERE project_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
      )
        .all(projectId, catalogLimits.generationsPerProject)
        .map(generationRecord);
    },
    issueToken(input, actor) {
      if (
        !exact(input, ['label', 'role', 'projectIds', 'expiresAt']) ||
        !text(input.label, 80) ||
        !roles.includes(input.role) ||
        !Array.isArray(input.projectIds) ||
        input.projectIds.length > catalogLimits.tokenProjects ||
        !input.projectIds.every(identifier) ||
        new Set(input.projectIds).size !== input.projectIds.length ||
        (input.role === 'admin' ? input.projectIds.length !== 0 : input.projectIds.length === 0) ||
        !timestamp(input.expiresAt)
      )
        fail(
          'invalid-token',
          'Tokens require a label, supported role, explicit project scope, and expiry.',
        );
      return transact(() => {
        const now = time();
        const current = permission(actor, 'tokens', undefined, now);
        if (input.expiresAt <= now || input.expiresAt - now > catalogLimits.maxTokenLifetimeMs)
          fail('invalid-expiry', 'Token expiry must be in the future and within 365 days.');
        for (const id of input.projectIds) findProject(id);
        const result = insertToken({ ...input, projectIds: [...input.projectIds].sort() }, now);
        appendAudit(
          current.id,
          'issue-token',
          null,
          {
            tokenId: result.record.id,
            role: input.role,
            projectIds: result.record.projectIds,
            expiresAt: input.expiresAt,
          },
          now,
        );
        return result;
      });
    },
    revokeToken(id, actor) {
      if (!uuid(id)) fail('invalid-token', 'A canonical token UUID is required.');
      return transact(() => {
        const now = time();
        const current = permission(actor, 'tokens', undefined, now);
        const row = statement('SELECT * FROM api_tokens WHERE id = ?').get(id);
        if (!row) fail('not-found', 'The token does not exist.');
        if (row.revoked_at === null) {
          statement('UPDATE api_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(
            now,
            id,
          );
          appendAudit(current.id, 'revoke-token', null, { tokenId: id }, now);
        }
        return tokenRecord(statement('SELECT * FROM api_tokens WHERE id = ?').get(id));
      });
    },
    tokens(actor) {
      permission(actor, 'tokens');
      return statement('SELECT * FROM api_tokens ORDER BY created_at, id LIMIT ?')
        .all(catalogLimits.tokens)
        .map(tokenRecord);
    },
    recordAudit(input, actor) {
      if (
        !exact(input, ['action', 'projectId'], ['details']) ||
        !managerAuditActions.includes(input.action) ||
        !identifier(input.projectId)
      )
        fail('invalid-audit', 'A supported manager action and project identifier are required.');
      const details = technicalDetails(input.details ?? {});
      return transact(() => {
        const now = time();
        const current = permission(actor, input.action, input.projectId, now);
        findProject(input.projectId);
        return appendAudit(current.id, input.action, input.projectId, details, now);
      });
    },
    audit(actor, options = {}) {
      if (!exact(options, [], ['projectId', 'limit', 'beforeId']))
        fail('invalid-audit-query', 'Unsupported audit query fields.');
      const limit = options.limit ?? catalogLimits.defaultAuditRead;
      if (
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > catalogLimits.maxAuditRead ||
        (options.beforeId !== undefined &&
          (!Number.isSafeInteger(options.beforeId) || options.beforeId < 1))
      )
        fail(
          'invalid-audit-query',
          'Audit queries require a bounded limit and optional positive cursor.',
        );
      permission(actor, 'audit', options.projectId);
      if (options.projectId !== undefined) findProject(options.projectId);
      const rows = statement(
        'SELECT * FROM audit_log WHERE (? IS NULL OR project_id = ?) AND (? IS NULL OR id < ?) ORDER BY id DESC LIMIT ?',
      ).all(
        options.projectId ?? null,
        options.projectId ?? null,
        options.beforeId ?? null,
        options.beforeId ?? null,
        limit,
      );
      return rows.map((row) => ({
        id: row.id,
        timestamp: row.timestamp,
        actorId: row.actor_id,
        action: row.action,
        projectId: row.project_id,
        details: JSON.parse(row.details),
      }));
    },
  };
}
