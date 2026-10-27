import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, link, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { inspectKit, createSigningKeyPair, signKit, verifyKit } from './releases.mjs';

const createdAt = '2026-10-27T12:00:00.000Z';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const key = createSigningKeyPair();
const trustedKeys = [{ keyId: key.keyId, publicKeyPem: key.publicKeyPem }];
const metadata = {
  schemaVersion: 1,
  name: '@aegis/test-kit',
  version: '0.1.0-experiment.0',
  compilerVersion: '1',
  registryRevision: 1,
  profiles: [{ id: 'test', name: 'Test' }],
  limits: ['Fixture only.'],
};

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'aegis-release-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const kit = join(directory, 'kit');
  await mkdir(kit);
  const contents = {
    'kit.json': JSON.stringify(metadata, null, 2) + '\n',
    'runtime/core.mjs': 'export const version = 1;\n',
    'README.md': 'Portable test kit.\n',
  };
  for (const [path, text] of Object.entries(contents)) {
    await mkdir(dirname(join(kit, path)), { recursive: true });
    await writeFile(join(kit, path), text);
  }
  const integrity = Object.fromEntries(
    Object.entries(contents).map(([path, text]) => [path, sha256(text)]),
  );
  const writeIntegrity = async (value) =>
    writeFile(join(kit, 'integrity.json'), JSON.stringify(value, null, 2) + '\n');
  await writeIntegrity(integrity);
  const attest = () => signKit(kit, { privateKeyPem: key.privateKeyPem, createdAt });
  return { directory, kit, integrity, writeIntegrity, attest };
}

test('release inspection hashes the complete sorted integrity map and returns metadata from hashed bytes', async (t) => {
  const { kit, integrity, writeIntegrity } = await fixture(t);
  const result = await inspectKit(kit);
  const sorted = Object.fromEntries(
    Object.keys(integrity)
      .sort()
      .map((path) => [path, integrity[path]]),
  );
  assert.equal(result.digest, sha256(JSON.stringify(sorted)));
  assert.deepEqual(result.manifest, metadata);
  assert.deepEqual(result.integrity, sorted);
  assert.deepEqual(result.files, ['README.md', 'kit.json', 'runtime/core.mjs']);
  await writeIntegrity(Object.fromEntries(Object.entries(integrity).reverse()));
  assert.equal((await inspectKit(kit)).digest, result.digest);
});

test('release key generation returns distinct in-memory Ed25519 PEM pairs and SPKI fingerprints', () => {
  const second = createSigningKeyPair();
  assert.notEqual(second.keyId, key.keyId);
  assert.match(key.privateKeyPem, /^-----BEGIN PRIVATE KEY-----/);
  assert.match(key.publicKeyPem, /^-----BEGIN PUBLIC KEY-----/);
  const publicKey = createPublicKey(key.publicKeyPem);
  assert.equal(publicKey.asymmetricKeyType, 'ed25519');
  assert.equal(key.keyId, sha256(publicKey.export({ type: 'spki', format: 'der' })));
});

test('detached signing is deterministic for identical metadata, verifies, and writes no files', async (t) => {
  const { kit, attest } = await fixture(t);
  const before = await readdir(kit);
  const attestation = await attest();
  assert.deepEqual(await attest(), attestation);
  assert.equal(Buffer.from(attestation.signature, 'base64').length, 64);
  assert.deepEqual(await verifyKit(kit, { attestation, trustedKeys }), {
    digest: attestation.digest,
    manifest: metadata,
    keyId: key.keyId,
    verified: true,
  });
  assert.deepEqual(await readdir(kit), before);
  assert.equal(JSON.stringify(attestation).includes('PRIVATE KEY'), false);
});

test('signing default createdAt is canonical UTC and PEM line endings do not change key identity', async (t) => {
  const { kit } = await fixture(t);
  const attestation = await signKit(kit, {
    privateKeyPem: key.privateKeyPem.replaceAll('\n', '\r\n'),
  });
  assert.equal(new Date(attestation.createdAt).toISOString(), attestation.createdAt);
  assert.equal(
    (
      await verifyKit(kit, {
        attestation,
        trustedKeys: [
          { keyId: key.keyId, publicKeyPem: key.publicKeyPem.replaceAll('\n', '\r\n') },
        ],
      })
    ).verified,
    true,
  );
});

test('unsigned kits require explicit development mode and still undergo complete integrity inspection', async (t) => {
  const { kit } = await fixture(t);
  await assert.rejects(verifyKit(kit), /signature is required/);
  await assert.rejects(verifyKit(kit, { trustedKeys }), /signature is required/);
  const result = await verifyKit(kit, { requireSignature: false });
  assert.equal(result.verified, false);
  assert.equal(result.keyId, null);
  await writeFile(join(kit, 'README.md'), 'tampered');
  await assert.rejects(verifyKit(kit, { requireSignature: false }), /SHA256 mismatch/);
});

test('unknown signers, wrong key fingerprints and duplicate trust entries are rejected', async (t) => {
  const { kit, attest } = await fixture(t);
  const attestation = await attest();
  const other = createSigningKeyPair();
  await assert.rejects(verifyKit(kit, { attestation, trustedKeys: [] }), /not explicitly trusted/);
  await assert.rejects(
    verifyKit(kit, {
      attestation,
      trustedKeys: [{ keyId: other.keyId, publicKeyPem: other.publicKeyPem }],
    }),
    /not explicitly trusted/,
  );
  await assert.rejects(
    verifyKit(kit, {
      attestation,
      trustedKeys: [{ keyId: key.keyId, publicKeyPem: other.publicKeyPem }],
    }),
    /fingerprint/,
  );
  await assert.rejects(
    verifyKit(kit, { attestation, trustedKeys: [...trustedKeys, ...trustedKeys] }),
    /Duplicate/,
  );
});

test('a different trusted key cannot claim another key signature', async (t) => {
  const { kit, attest } = await fixture(t);
  const other = createSigningKeyPair();
  const attestation = { ...(await attest()), keyId: other.keyId };
  await assert.rejects(
    verifyKit(kit, {
      attestation,
      trustedKeys: [{ keyId: other.keyId, publicKeyPem: other.publicKeyPem }],
    }),
    /signature is invalid/,
  );
});

test('tampering signed metadata or signatures fails even when unsigned mode is enabled', async (t) => {
  const { kit, attest } = await fixture(t);
  const original = await attest();
  const changes = [
    { createdAt: '2026-10-28T12:00:00.000Z' },
    { digest: '0'.repeat(64) },
    { signature: Buffer.alloc(64).toString('base64') },
  ];
  for (const change of changes)
    await assert.rejects(
      verifyKit(kit, {
        attestation: { ...original, ...change },
        trustedKeys,
        requireSignature: false,
      }),
      /signature is invalid/,
    );
});

test('signatures use the release domain and cannot be substituted with signatures over raw payload JSON', async (t) => {
  const { kit, attest } = await fixture(t);
  const attestation = await attest();
  const payload = Object.fromEntries(
    Object.entries(attestation)
      .filter(([name]) => name !== 'signature')
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  const signature = sign(null, Buffer.from(JSON.stringify(payload)), key.privateKeyPem).toString(
    'base64',
  );
  await assert.rejects(
    verifyKit(kit, { attestation: { ...attestation, signature }, trustedKeys }),
    /signature is invalid/,
  );
});

test('changing a file is rejected before it can become a verified release', async (t) => {
  const { kit, attest } = await fixture(t);
  const attestation = await attest();
  await writeFile(join(kit, 'runtime/core.mjs'), 'tampered runtime');
  await assert.rejects(inspectKit(kit), /SHA256 mismatch/);
  await assert.rejects(signKit(kit, { privateKeyPem: key.privateKeyPem }), /SHA256 mismatch/);
  await assert.rejects(verifyKit(kit, { attestation, trustedKeys }), /SHA256 mismatch/);
});

test('editing both a file and its integrity hash still cannot pass an existing signature', async (t) => {
  const { kit, integrity, writeIntegrity, attest } = await fixture(t);
  const attestation = await attest();
  await writeFile(join(kit, 'README.md'), 'changed release');
  await writeIntegrity({ ...integrity, 'README.md': sha256('changed release') });
  assert.notEqual((await inspectKit(kit)).digest, attestation.digest);
  await assert.rejects(verifyKit(kit, { attestation, trustedKeys }), /digest does not match/);
});

test('reformatted integrity JSON preserves release identity but changed kit metadata does not', async (t) => {
  const { kit, integrity, writeIntegrity, attest } = await fixture(t);
  const attestation = await attest();
  await writeFile(join(kit, 'integrity.json'), JSON.stringify(integrity));
  assert.equal((await verifyKit(kit, { attestation, trustedKeys })).verified, true);
  const updated = JSON.stringify({ ...metadata, version: '0.2.0' });
  await writeFile(join(kit, 'kit.json'), updated);
  await writeIntegrity({ ...integrity, 'kit.json': sha256(updated) });
  await assert.rejects(verifyKit(kit, { attestation, trustedKeys }), /digest does not match/);
});

test('extra files, including an in-kit attestation, are never silently ignored', async (t) => {
  const { kit, attest } = await fixture(t);
  const attestation = await attest();
  for (const name of ['extra.mjs', '.DS_Store', 'release-attestation.json']) {
    await writeFile(join(kit, name), JSON.stringify(attestation));
    await assert.rejects(inspectKit(kit), /missing or unlisted files/);
    await rm(join(kit, name));
  }
});

test('missing files and missing integrity manifests fail closed', async (t) => {
  const { kit } = await fixture(t);
  await rm(join(kit, 'README.md'));
  await assert.rejects(inspectKit(kit), /missing or unlisted files/);
  await rm(join(kit, 'integrity.json'));
  await assert.rejects(inspectKit(kit), /integrity.json is missing/);
});

test('integrity map schema rejects arrays, nested hashes, missing identity and invalid hash encodings', async (t) => {
  const { kit, integrity, writeIntegrity } = await fixture(t);
  for (const value of [
    null,
    [],
    {},
    true,
    { ...integrity, 'README.md': {} },
    { ...integrity, 'README.md': 'A'.repeat(64) },
    { ...integrity, 'README.md': 'abc' },
    { 'README.md': integrity['README.md'] },
  ]) {
    await writeIntegrity(value);
    await assert.rejects(inspectKit(kit), /manifest/);
  }
});

test('integrity paths reject traversal, absolute paths, separators and cross-platform aliases', async (t) => {
  const { kit, integrity, writeIntegrity } = await fixture(t);
  for (const path of [
    '../escape',
    '/absolute',
    'runtime/../README.md',
    'runtime/./core.mjs',
    'runtime//core.mjs',
    'runtime\\core.mjs',
    'C:/escape',
    'README.md ',
    'README.md.',
    'NUL',
    'runtime/CON.txt',
    'bad\0file',
    'bad\nfile',
    'integrity.json',
    'INTEGRITY.JSON',
  ]) {
    await writeIntegrity({ ...integrity, [path]: '0'.repeat(64) });
    await assert.rejects(inspectKit(kit), /invalid path/, path);
  }
  await writeIntegrity({ ...integrity, 'readme.md': integrity['README.md'] });
  await assert.rejects(inspectKit(kit), /aliased paths/);
});

test('duplicate manifest JSON keys and escaped duplicate spellings are rejected', async (t) => {
  const { kit, integrity } = await fixture(t);
  for (const duplicate of ['kit.json', 'kit\\u002ejson']) {
    const text =
      JSON.stringify(integrity).slice(0, -1) + `,"${duplicate}":"${integrity['kit.json']}"}`;
    await writeFile(join(kit, 'integrity.json'), text);
    await assert.rejects(inspectKit(kit), /duplicate JSON keys/);
  }
});

test('malformed, invalid UTF-8 and oversized integrity JSON is rejected', async (t) => {
  const { kit } = await fixture(t);
  for (const body of [
    '{',
    Buffer.from([123, 34, 255, 34, 58, 49, 125]),
    ' '.repeat(4 * 1024 * 1024 + 1),
  ]) {
    await writeFile(join(kit, 'integrity.json'), body);
    await assert.rejects(inspectKit(kit), /JSON|size limit/);
  }
});

test('kit identity metadata rejects unsupported versions, malformed identities and duplicate keys', async (t) => {
  const { kit, integrity, writeIntegrity } = await fixture(t);
  const invalid = [
    { ...metadata, schemaVersion: 2 },
    { ...metadata, name: '../wrong' },
    { ...metadata, version: 'unknown' },
    { ...metadata, version: '1.0.0-01' },
    { ...metadata, compilerVersion: 1 },
    { ...metadata, registryRevision: 0 },
    [],
    null,
  ].map((value) => JSON.stringify(value));
  invalid.push(JSON.stringify(metadata).slice(0, -1) + ',"schemaVersion":1}');
  invalid.push(
    JSON.stringify({ ...metadata, nested: { field: 'safe' } }).replace(
      '"field":"safe"',
      '"field":"safe","field":"duplicate"',
    ),
  );
  for (const body of invalid) {
    await writeFile(join(kit, 'kit.json'), body);
    await writeIntegrity({ ...integrity, 'kit.json': sha256(body) });
    await assert.rejects(inspectKit(kit), /metadata|duplicate JSON keys/);
  }
});

test('file, directory, manifest and root symlink escapes are refused', async (t) => {
  const { kit, directory } = await fixture(t);
  await writeFile(join(directory, 'outside'), 'Portable test kit.\n');
  await rm(join(kit, 'README.md'));
  await symlink(join(directory, 'outside'), join(kit, 'README.md'));
  await assert.rejects(inspectKit(kit), /symbolic links/);
  await rm(join(kit, 'README.md'));
  await writeFile(join(kit, 'README.md'), 'Portable test kit.\n');
  await symlink(directory, join(kit, 'escape'));
  await assert.rejects(inspectKit(kit), /symbolic links/);
  await rm(join(kit, 'escape'));
  await symlink(kit, join(directory, 'kit-link'));
  await assert.rejects(inspectKit(join(directory, 'kit-link')), /symlink/);
  const content = await readFile(join(kit, 'integrity.json'));
  await writeFile(join(directory, 'outside-integrity.json'), content);
  await rm(join(kit, 'integrity.json'));
  await symlink(join(directory, 'outside-integrity.json'), join(kit, 'integrity.json'));
  await assert.rejects(inspectKit(kit), /symbolic links/);
});

test('hard links cannot alias outside files into a signed kit', async (t) => {
  const { kit, directory } = await fixture(t);
  await writeFile(join(directory, 'outside'), 'Portable test kit.\n');
  await rm(join(kit, 'README.md'));
  await link(join(directory, 'outside'), join(kit, 'README.md'));
  await assert.rejects(inspectKit(kit), /independent regular files/);
});

test('release attestation schemas reject unknown fields, versions, algorithms and malformed signatures', async (t) => {
  const { kit, attest } = await fixture(t);
  const original = await attest();
  const changes = [
    { schemaVersion: 2 },
    { kind: 'other' },
    { algorithm: 'RSA' },
    { digestAlgorithm: 'SHA-1' },
    { digest: 'A'.repeat(64) },
    { keyId: 'unknown' },
    { createdAt: '2026-10-27' },
    { createdAt: '2026-02-30T12:00:00.000Z' },
    { signature: 'invalid' },
    { signature: original.signature + '\n' },
    { extra: true },
  ];
  for (const change of changes)
    await assert.rejects(
      verifyKit(kit, { attestation: { ...original, ...change }, trustedKeys }),
      /invalid release attestation/,
    );
  for (const value of [[], false, {}, { ...original, signature: undefined }])
    await assert.rejects(
      verifyKit(kit, { attestation: value, trustedKeys }),
      /invalid release attestation/,
    );
});

test('release options and trust entries reject unsupported fields and accessor properties without reading them', async (t) => {
  const { kit, attest } = await fixture(t);
  let accessed = 0;
  const getter = {
    get: () => {
      accessed++;
      return key.privateKeyPem;
    },
    enumerable: true,
  };
  await assert.rejects(
    signKit(kit, Object.defineProperty({}, 'privateKeyPem', getter)),
    /signing options/,
  );
  const attestation = await attest();
  await assert.rejects(
    verifyKit(kit, {
      attestation: Object.defineProperty({ ...attestation }, 'signature', getter),
      trustedKeys,
    }),
    /attestation/,
  );
  await assert.rejects(
    verifyKit(kit, {
      attestation,
      trustedKeys: [{ ...trustedKeys[0], privateKeyPem: key.privateKeyPem }],
    }),
    /key entry/,
  );
  const arrayGetter = Object.defineProperty([trustedKeys[0]], '0', getter);
  const sparse = Array(1);
  const extended = Object.assign([...trustedKeys], { extra: true });
  for (const keys of [arrayGetter, sparse, extended])
    await assert.rejects(verifyKit(kit, { attestation, trustedKeys: keys }), /bounded JSON array/);
  for (const options of [
    null,
    [],
    { requireSignature: 'false' },
    { requireSignature: false, extra: true },
    { requireSignature: false, trustedKeys: {} },
  ])
    await assert.rejects(verifyKit(kit, options));
  await assert.rejects(
    signKit(kit, { privateKeyPem: key.privateKeyPem, extra: true }),
    /signing options/,
  );
  for (const date of [null, 0, 'today', '2026-10-27T12:00:00Z'])
    await assert.rejects(
      signKit(kit, { privateKeyPem: key.privateKeyPem, createdAt: date }),
      /timestamp/,
    );
  assert.equal(accessed, 0);
});

test('non-Ed25519 keys, private keys in trust entries and malformed PEM cannot sign or establish trust', async (t) => {
  const { kit, attest } = await fixture(t);
  const ec = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const ecPrivate = ec.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const ecPublic = ec.publicKey.export({ type: 'spki', format: 'pem' });
  for (const privateKeyPem of [
    ecPrivate,
    key.publicKeyPem,
    'invalid',
    key.privateKeyPem + key.privateKeyPem,
  ])
    await assert.rejects(signKit(kit, { privateKeyPem }), /Ed25519/);
  const attestation = await attest();
  for (const publicKeyPem of [ecPublic, key.privateKeyPem, 'invalid'])
    await assert.rejects(
      verifyKit(kit, { attestation, trustedKeys: [{ keyId: key.keyId, publicKeyPem }] }),
      /Ed25519/,
    );
});
