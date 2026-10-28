import { createHash, randomUUID } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, realpath, rename, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const decodedUtf8 = new TextDecoder('utf-8', { fatal: true });
const validatedRecords = new WeakMap();
const protectedName =
  /(?:^|[._-])(?:tests?|specs?|stories|story|snapshots?|baselines?|fixtures?|contracts?|tokens?|registry|scripts?|skills?|config(?:uration)?|package|lock|agents|node_modules|vendor|dependencies|deps|public|dist|build|generated)(?:[._-]|$)/i;

export class RepairProposalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RepairProposalError';
    this.code = 'INVALID_REPAIR_PROPOSAL';
  }
}

const reject = (message) => {
  throw new RepairProposalError(message);
};

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function record(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reject(`${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    reject(`${label} must be a plain object`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || keys.some((key) => !ownKeys.includes(key))) {
    reject(`${label} has missing or unknown keys`);
  }
  for (const key of ownKeys) {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) {
      reject(`${label} must not contain accessors`);
    }
  }
}

function prose(value, label, maxLength) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maxLength ||
    value.includes('\0')
  ) {
    reject(`${label} must be non-empty text of at most ${maxLength} characters`);
  }
}

/** Initial source-repair scope is CSS only; executable source needs a separate reviewed policy. */
function repairPath(value) {
  if (
    typeof value !== 'string' ||
    value.length > 240 ||
    isAbsolute(value) ||
    !/^[a-zA-Z0-9_./-]+$/.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..' || part.startsWith('.'))
  ) {
    reject('Repair paths must be canonical relative paths without traversal or control characters');
  }
  if (!/^src\/(?:components|patterns)\/.+\.css$/.test(value)) {
    reject(`Source repair is restricted to component/pattern CSS: ${value}`);
  }
  if (value.split('/').some((part) => protectedName.test(part))) {
    reject(`Protected source cannot be repaired: ${value}`);
  }
  return value;
}

function limits(maxFiles, maxBytes) {
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 1 || maxFiles > 16) {
    reject('maxFiles must be an integer between 1 and 16');
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1048576) {
    reject('maxBytes must be an integer between 1 and 1048576');
  }
}

function allowedScope(allowedPaths) {
  if (!Array.isArray(allowedPaths) || allowedPaths.length === 0 || allowedPaths.length > 64) {
    reject('allowedPaths must be a non-empty array of at most 64 exact paths');
  }
  const allowed = new Set(allowedPaths.map(repairPath));
  if (allowed.size !== allowedPaths.length) reject('allowedPaths must not contain duplicates');
  return allowed;
}

async function repository(root, paths) {
  if (typeof root !== 'string' || !isAbsolute(root))
    reject('root must be an absolute checkout path');
  const canonical = await realpath(root);
  if (!(await lstat(canonical)).isDirectory()) reject('root must be a directory');
  // No shell, hooks or repository-configured fsmonitor is involved in these read-only queries.
  const git = async (args) =>
    execFile('git', ['-c', 'core.fsmonitor=false', '-C', canonical, ...args], {
      encoding: 'utf8',
      maxBuffer: 1048576,
      timeout: 10000,
    });
  const top = (await git(['rev-parse', '--show-toplevel'])).stdout.trimEnd();
  if ((await realpath(top)) !== canonical) reject('root must be the Git checkout root');
  const index = (await git(['ls-files', '--stage', '-z', '--', ...paths])).stdout;
  const entries = index
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d{6}) ([a-f0-9]{40,64}) ([0-3])\t(.+)$/.exec(entry);
      if (!match) reject('Unrecognized Git index entry');
      return { mode: match[1], stage: match[3], path: match[4] };
    });
  for (const path of paths) {
    const found = entries.filter((entry) => entry.path === path);
    if (found.length !== 1 || found[0].stage !== '0' || found[0].mode !== '100644') {
      reject(`Repair target must be an existing tracked non-executable regular file: ${path}`);
    }
  }
  return canonical;
}

async function ordinaryPath(root, path) {
  const parts = path.split('/');
  let cursor = root;
  for (let index = 0; index < parts.length; index += 1) {
    cursor = join(cursor, parts[index]);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) reject(`Symlinks cannot be repair targets or ancestors: ${path}`);
    if (index < parts.length - 1) {
      if (!stat.isDirectory()) reject(`Repair ancestor must be a directory: ${path}`);
    } else if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o111) !== 0) {
      reject(`Repair target must be an ordinary unlinked non-executable file: ${path}`);
    }
  }
  return cursor;
}

const sameFile = (a, b) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mode === b.mode &&
  a.nlink === b.nlink &&
  a.mtimeMs === b.mtimeMs &&
  a.ctimeMs === b.ctimeMs;

async function source(root, path, maxBytes) {
  const absolute = await ordinaryPath(root, path);
  const before = await lstat(absolute);
  if (before.size > maxBytes) reject(`Existing source exceeds the byte limit: ${path}`);
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat();
    if (!sameFile(before, opened)) reject(`Source changed while opening: ${path}`);
    const bytes = await handle.readFile();
    if (!sameFile(opened, await handle.stat()) || !sameFile(opened, await lstat(absolute))) {
      reject(`Source changed while reading: ${path}`);
    }
    if (bytes.length > maxBytes || bytes.includes(0)) reject(`Invalid source bytes: ${path}`);
    try {
      decodedUtf8.decode(bytes);
    } catch {
      reject(`Source must contain valid UTF-8: ${path}`);
    }
    return { sha256: sha256(bytes), mode: opened.mode & 0o777, bytes };
  } finally {
    await handle.close();
  }
}

/**
 * Read a bounded, immutable source context before any worker reset. The allowlist
 * may be larger than the maxFiles change budget; its combined bytes are bounded.
 * Re-run this check before resetting a failed candidate so links or invalid files
 * introduced by a verifier cannot become write destinations.
 */
export async function readRepairSources({ root, allowedPaths, maxFiles = 4, maxBytes = 131072 }) {
  limits(maxFiles, maxBytes);
  const paths = [...allowedScope(allowedPaths)];
  const canonical = await repository(root, paths);
  const result = [];
  let byteCount = 0;
  for (const path of paths) {
    const current = await source(canonical, path, maxBytes);
    byteCount += current.bytes.length;
    if (byteCount > maxBytes) reject('Source snapshots exceed the total byte limit');
    result.push(
      Object.freeze({ path, sha256: current.sha256, content: current.bytes.toString('utf8') }),
    );
  }
  return Object.freeze(result);
}

/** Validate the entire batch without changing any checkout file. */
export async function validateProposal({
  root,
  proposal,
  allowedPaths,
  maxFiles = 4,
  maxBytes = 131072,
}) {
  limits(maxFiles, maxBytes);
  const allowed = allowedScope(allowedPaths);
  record(proposal, ['summary', 'rationale', 'changes'], 'Proposal');
  prose(proposal.summary, 'summary', 1000);
  prose(proposal.rationale, 'rationale', 6000);
  const summary = proposal.summary;
  const rationale = proposal.rationale;
  if (
    !Array.isArray(proposal.changes) ||
    proposal.changes.length < 1 ||
    proposal.changes.length > maxFiles
  ) {
    reject(`Proposal must contain between 1 and ${maxFiles} changes`);
  }
  const seen = new Set();
  const requested = [];
  let byteCount = 0;
  for (const change of proposal.changes) {
    record(change, ['path', 'beforeSha256', 'content'], 'Change');
    repairPath(change.path);
    if (!allowed.has(change.path)) reject(`Path is not explicitly allowed: ${change.path}`);
    if (seen.has(change.path)) reject(`Duplicate repair path: ${change.path}`);
    seen.add(change.path);
    if (typeof change.beforeSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(change.beforeSha256)) {
      reject(`Invalid beforeSha256: ${change.path}`);
    }
    if (typeof change.content !== 'string' || change.content.includes('\0')) {
      reject(`Repair content must be UTF-8 text without NUL bytes: ${change.path}`);
    }
    if (change.content.length > maxBytes) reject('Proposal exceeds the total byte limit');
    const bytes = Buffer.from(change.content, 'utf8');
    if (bytes.toString('utf8') !== change.content)
      reject(`Repair content must be valid UTF-8: ${change.path}`);
    byteCount += bytes.length;
    if (byteCount > maxBytes) reject('Proposal exceeds the total byte limit');
    requested.push({
      path: change.path,
      beforeSha256: change.beforeSha256,
      content: change.content,
    });
  }
  const canonical = await repository(root, [...seen]);
  const changes = [];
  for (const change of requested) {
    const current = await source(canonical, change.path, maxBytes);
    if (current.sha256 !== change.beforeSha256) reject(`Source hash is stale: ${change.path}`);
    const afterSha256 = sha256(change.content);
    if (current.sha256 === afterSha256) reject(`No-op repair is not allowed: ${change.path}`);
    changes.push(Object.freeze({ ...change, afterSha256 }));
  }
  const validated = Object.freeze({
    summary,
    rationale,
    changes: Object.freeze(changes),
  });
  validatedRecords.set(validated, {
    root: canonical,
    allowedPaths: [...allowed],
    maxFiles,
    maxBytes,
  });
  return validated;
}

/**
 * Apply only this process's validated proposal to its worker-owned isolated checkout.
 * All targets are revalidated before staging and before the first rename. Individual
 * replacements are atomic, but a batch is not a filesystem transaction: discard the
 * candidate checkout on any failure. Concurrent untrusted writers are unsupported.
 */
export async function applyProposal({ root, validated }) {
  const authority = validatedRecords.get(validated);
  if (!authority) reject('applyProposal requires the original result of validateProposal');
  if ((await realpath(resolve(root))) !== authority.root)
    reject('Validated proposal belongs to another checkout');
  const proposal = {
    summary: validated.summary,
    rationale: validated.rationale,
    changes: validated.changes.map(({ path, beforeSha256, content }) => ({
      path,
      beforeSha256,
      content,
    })),
  };
  await validateProposal({ ...authority, proposal });
  const staged = [];
  try {
    for (const change of validated.changes) {
      const current = await source(authority.root, change.path, authority.maxBytes);
      if (current.sha256 !== change.beforeSha256) reject(`Source hash is stale: ${change.path}`);
      const target = await ordinaryPath(authority.root, change.path);
      const temporary = join(dirname(target), `.aegis-repair-${randomUUID()}.tmp`);
      const handle = await open(
        temporary,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
        current.mode,
      );
      staged.push({ temporary, target, change });
      try {
        await handle.chmod(current.mode);
        await handle.writeFile(change.content, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
    await validateProposal({ ...authority, proposal });
    for (const item of staged) await rename(item.temporary, item.target);
    return validated.changes.map(({ path, beforeSha256, afterSha256 }) => ({
      path,
      beforeSha256,
      afterSha256,
    }));
  } finally {
    await Promise.all(
      staged.map(({ temporary }) =>
        unlink(temporary).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        }),
      ),
    );
  }
}
