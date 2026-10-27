import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const hashPattern = /^[a-f0-9]{64}$/;
const domain = 'aegis-agentic-kit-release:v1\n';
const manifestByteLimit = 4 * 1024 * 1024;
const fileLimit = 20_000;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) =>
  value && typeof value === 'object'
    ? `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
        .join(',')}}`
    : JSON.stringify(value);

function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  return Reflect.ownKeys(value).every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return typeof key === 'string' && descriptor.enumerable && Object.hasOwn(descriptor, 'value');
  });
}

function shape(value, required, optional = []) {
  return (
    object(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  );
}

function jsonArray(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
  if (Reflect.ownKeys(value).length !== value.length + 1) return false;
  return Reflect.ownKeys(value).every((key) => {
    if (key === 'length') return true;
    if (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)
      return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor.enumerable && Object.hasOwn(descriptor, 'value');
  });
}

function releaseVersion(version) {
  if (typeof version !== 'string' || version.length > 80) return false;
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(
      version,
    );
  return (
    !!match &&
    (!match[4] ||
      match[4]
        .split('.')
        .every((part) => !/^\d+$/.test(part) || part === '0' || !part.startsWith('0')))
  );
}

function portablePath(path) {
  if (typeof path !== 'string' || !path || path.length > 1024 || path.normalize('NFC') !== path)
    return false;
  if (
    path.includes('\\') ||
    path.includes(':') ||
    [...path].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return false;
  return path
    .split('/')
    .every(
      (part) =>
        part &&
        part !== '.' &&
        part !== '..' &&
        !/[. ]$/.test(part) &&
        !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
    );
}

function alias(path) {
  return path.normalize('NFC').toLowerCase();
}

function parseJson(bytes, label) {
  let text, value;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} must contain valid UTF-8 JSON.`);
  }
  // JSON.parse discards duplicate properties. Scan the already valid JSON's
  // structural tokens as well, rejecting duplicate decoded keys at any depth.
  const stack = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      let end = index + 1;
      while (text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
      const frame = stack.at(-1);
      if (frame?.expectKey) {
        const key = JSON.parse(text.slice(index, end + 1));
        if (frame.keys.has(key)) throw new Error(`${label} contains duplicate JSON keys.`);
        frame.keys.add(key);
        frame.expectKey = false;
      }
      index = end;
    } else if (character === '{') stack.push({ keys: new Set(), expectKey: true });
    else if (character === '[') stack.push({});
    else if (character === '}' || character === ']') stack.pop();
    else if (character === ',' && stack.at(-1)?.keys) stack.at(-1).expectKey = true;
  }
  return value;
}

function parseIntegrity(bytes) {
  if (bytes.length > manifestByteLimit)
    throw new Error('Kit integrity manifest exceeds its size limit.');
  const input = parseJson(bytes, 'Kit integrity manifest');
  if (!object(input) || !Object.keys(input).length || Object.keys(input).length > fileLimit)
    throw new Error('Kit integrity manifest must be a nonempty bounded path-to-SHA256 object.');
  const seen = new Set();
  for (const [path, digest] of Object.entries(input)) {
    if (
      !portablePath(path) ||
      alias(path) === 'integrity.json' ||
      typeof digest !== 'string' ||
      !hashPattern.test(digest)
    )
      throw new Error('Kit integrity manifest contains an invalid path or SHA256 digest.');
    const key = alias(path);
    if (seen.has(key))
      throw new Error('Kit integrity manifest contains duplicate or aliased paths.');
    seen.add(key);
  }
  if (!Object.hasOwn(input, 'kit.json'))
    throw new Error('Kit integrity manifest must include kit.json.');
  return Object.fromEntries(
    Object.keys(input)
      .sort()
      .map((path) => [path, input[path]]),
  );
}

async function readRegular(path, expected, maximum = Infinity) {
  // O_NOFOLLOW rejects a final-component symlink swap; checking inode identity
  // also detects replacement between enumeration and opening a regular file.
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const info = await handle.stat();
    if (
      !info.isFile() ||
      info.nlink !== 1 ||
      info.dev !== expected.dev ||
      info.ino !== expected.ino
    )
      throw new Error('Kit entries must be independent regular files without aliases.');
    if (info.size > maximum) throw new Error('Kit metadata exceeds its size limit.');
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length > maximum ||
      after.size !== info.size ||
      after.mtimeMs !== info.mtimeMs ||
      after.ctimeMs !== info.ctimeMs
    )
      throw new Error('Kit files changed during inspection.');
    return bytes;
  } finally {
    await handle.close();
  }
}

function kitMetadata(bytes) {
  const metadata = parseJson(bytes, 'kit.json');
  // Other kit fields remain signed data owned by the kit's schema. This module
  // interprets only these identity fields and refuses unknown schema versions.
  if (
    !object(metadata) ||
    metadata.schemaVersion !== 1 ||
    typeof metadata.name !== 'string' ||
    !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(metadata.name) ||
    metadata.name.length > 214 ||
    !releaseVersion(metadata.version) ||
    typeof metadata.compilerVersion !== 'string' ||
    !/^[1-9]\d{0,15}$/.test(metadata.compilerVersion) ||
    !Number.isSafeInteger(metadata.registryRevision) ||
    metadata.registryRevision < 1
  )
    throw new Error('Unsupported or invalid kit identity metadata.');
  return metadata;
}

/**
 * Inspect a stable, caller-controlled kit directory without writing anything.
 * Every regular file except integrity.json must be listed exactly once; links,
 * nonportable aliases and unlisted files fail closed. Empty directories carry no
 * release meaning. Concurrent hostile filesystem writers require OS isolation;
 * inspection does not make this directory immutable for later execution.
 *
 * digest = SHA256(canonical JSON of the entire integrity map). manifest is the
 * parsed kit.json from hashed bytes; integrity and files are sorted inventories.
 */
export async function inspectKit(kitDirectory) {
  if (typeof kitDirectory !== 'string' || !kitDirectory || kitDirectory.includes('\0'))
    throw new TypeError('Kit directory must be a filesystem path.');
  const requested = resolve(kitDirectory);
  const initialRoot = await lstat(requested);
  if (!initialRoot.isDirectory() || initialRoot.isSymbolicLink())
    throw new Error('Kit root must be a directory, not a symlink.');
  const root = await realpath(requested);
  const inventory = new Map();
  const aliases = new Set();
  const directories = [];
  async function visit(directory, prefix = '') {
    const before = await lstat(directory);
    if (!before.isDirectory() || before.isSymbolicLink())
      throw new Error('Kit directories must not be symbolic links.');
    directories.push({ path: directory, info: before });
    for (const name of (await readdir(directory)).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name;
      if (!portablePath(relative) || aliases.has(alias(relative)))
        throw new Error('Kit contains invalid or aliased paths.');
      aliases.add(alias(relative));
      const path = join(directory, name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error('Kit symbolic links are not allowed.');
      if (info.isDirectory()) await visit(path, relative);
      else {
        if (!info.isFile() || info.nlink !== 1)
          throw new Error('Kit entries must be independent regular files.');
        inventory.set(relative, { path, info });
        if (inventory.size > fileLimit + 1) throw new Error('Kit contains too many files.');
      }
    }
  }
  await visit(root);
  const entry = inventory.get('integrity.json');
  if (!entry) throw new Error('Kit integrity.json is missing.');
  const integrity = parseIntegrity(await readRegular(entry.path, entry.info, manifestByteLimit));
  const files = [...inventory.keys()].filter((path) => path !== 'integrity.json').sort();
  const listed = Object.keys(integrity);
  if (files.length !== listed.length || files.some((path, index) => path !== listed[index]))
    throw new Error('Kit file inventory differs from integrity.json: missing or unlisted files.');
  let manifest;
  for (const path of files) {
    const entry = inventory.get(path);
    const bytes = await readRegular(
      entry.path,
      entry.info,
      path === 'kit.json' ? manifestByteLimit : Infinity,
    );
    if (sha256(bytes) !== integrity[path]) throw new Error(`Kit file SHA256 mismatch: ${path}`);
    if (path === 'kit.json') manifest = kitMetadata(bytes);
  }
  for (const { path, info } of directories) {
    const after = await lstat(path);
    if (
      !after.isDirectory() ||
      after.isSymbolicLink() ||
      info.dev !== after.dev ||
      info.ino !== after.ino ||
      info.mtimeMs !== after.mtimeMs ||
      info.ctimeMs !== after.ctimeMs
    )
      throw new Error('Kit directories changed during inspection.');
  }
  return { digest: sha256(canonical(integrity)), manifest, integrity, files };
}

function keyFromPem(pem, type) {
  const label = type === 'private' ? 'PRIVATE' : 'PUBLIC';
  const format = new RegExp(
    `^-----BEGIN ${label} KEY-----\\r?\\n[A-Za-z0-9+/=\\r\\n]+-----END ${label} KEY-----\\r?\\n?$`,
  );
  if (typeof pem !== 'string' || pem.length > 4096 || !format.test(pem))
    throw new Error(`Expected an Ed25519 ${type} PEM key.`);
  let key;
  try {
    key = type === 'private' ? createPrivateKey(pem) : createPublicKey(pem);
  } catch {
    throw new Error(`Invalid Ed25519 ${type} PEM key.`);
  }
  if (key.asymmetricKeyType !== 'ed25519' || key.type !== type)
    throw new Error(`Expected an Ed25519 ${type} key.`);
  return key;
}

const keyIdFor = (key) => sha256(key.export({ type: 'spki', format: 'der' }));
const message = (payload) => Buffer.from(domain + canonical(payload), 'utf8');
const validDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

/** Generate an in-memory Ed25519 pair. No key material is logged or persisted. */
export function createSigningKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
    keyId: keyIdFor(publicKey),
  };
}

/**
 * Return a detached version-1 attestation. Store it outside the kit directory.
 * The domain-separated signature binds all metadata, including signer, digest,
 * algorithms and createdAt. The timestamp is a signed claim, not a trusted clock.
 */
export async function signKit(kitDirectory, options) {
  if (!shape(options, ['privateKeyPem'], ['createdAt']))
    throw new TypeError('Unsupported release signing options.');
  const privateKey = keyFromPem(options.privateKeyPem, 'private');
  const createdAt = options.createdAt === undefined ? new Date().toISOString() : options.createdAt;
  if (!validDate(createdAt))
    throw new TypeError('Release createdAt must be a canonical UTC timestamp.');
  const { digest } = await inspectKit(kitDirectory);
  const payload = {
    schemaVersion: 1,
    kind: 'aegis-kit-release',
    algorithm: 'Ed25519',
    digestAlgorithm: 'SHA-256',
    digest,
    keyId: keyIdFor(createPublicKey(privateKey)),
    createdAt,
  };
  return { ...payload, signature: sign(null, message(payload), privateKey).toString('base64') };
}

function trustedKeyMap(trustedKeys) {
  if (!jsonArray(trustedKeys) || trustedKeys.length > 100)
    throw new TypeError('Trusted release keys must be a bounded JSON array.');
  const result = new Map();
  for (const entry of trustedKeys) {
    if (
      !shape(entry, ['keyId', 'publicKeyPem']) ||
      typeof entry.keyId !== 'string' ||
      !hashPattern.test(entry.keyId)
    )
      throw new TypeError('Invalid trusted release key entry.');
    const key = keyFromPem(entry.publicKeyPem, 'public');
    if (keyIdFor(key) !== entry.keyId)
      throw new Error('Trusted key ID does not match its public-key fingerprint.');
    if (result.has(entry.keyId)) throw new Error('Duplicate trusted release key ID.');
    result.set(entry.keyId, key);
  }
  return result;
}

function attestationPayload(attestation) {
  const keys = [
    'schemaVersion',
    'kind',
    'algorithm',
    'digestAlgorithm',
    'digest',
    'keyId',
    'createdAt',
    'signature',
  ];
  if (
    !shape(attestation, keys) ||
    attestation.schemaVersion !== 1 ||
    attestation.kind !== 'aegis-kit-release' ||
    attestation.algorithm !== 'Ed25519' ||
    attestation.digestAlgorithm !== 'SHA-256' ||
    typeof attestation.digest !== 'string' ||
    !hashPattern.test(attestation.digest) ||
    typeof attestation.keyId !== 'string' ||
    !hashPattern.test(attestation.keyId) ||
    !validDate(attestation.createdAt) ||
    typeof attestation.signature !== 'string' ||
    !/^[A-Za-z0-9+/]{86}==$/.test(attestation.signature) ||
    Buffer.from(attestation.signature, 'base64').toString('base64') !== attestation.signature
  )
    throw new TypeError('Unsupported or invalid release attestation.');
  const { signature, ...payload } = attestation;
  return { signature: Buffer.from(signature, 'base64'), payload };
}

/**
 * Verify every file and a detached signature against explicitly pinned public
 * keys. No trust-on-first-use, key downloads, clock/expiry inference or writes.
 * requireSignature=false permits a missing attestation for explicit development
 * use, returning verified:false/keyId:null; a supplied bad signature still fails.
 */
export async function verifyKit(kitDirectory, options = {}) {
  if (!shape(options, [], ['attestation', 'trustedKeys', 'requireSignature']))
    throw new TypeError('Unsupported release verification options.');
  const { attestation, trustedKeys = [], requireSignature = true } = options;
  if (typeof requireSignature !== 'boolean')
    throw new TypeError('requireSignature must be an explicit boolean.');
  const keys = trustedKeyMap(trustedKeys);
  if (attestation === undefined || attestation === null) {
    if (requireSignature) throw new Error('A trusted release signature is required.');
    const { digest, manifest } = await inspectKit(kitDirectory);
    return { digest, manifest, keyId: null, verified: false };
  }
  const { signature, payload } = attestationPayload(attestation);
  const key = keys.get(payload.keyId);
  if (!key) throw new Error('Release signer is not explicitly trusted.');
  if (!verify(null, message(payload), key, signature))
    throw new Error('Release signature is invalid.');
  const { digest, manifest } = await inspectKit(kitDirectory);
  if (digest !== payload.digest)
    throw new Error('Release digest does not match the complete kit manifest.');
  return { digest, manifest, keyId: payload.keyId, verified: true };
}
