import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert(
  args.length === 0 || (args.length === 1 && args[0] === '--local-dependencies'),
  'Usage: node scripts/verify-relay-consumer.mjs [--local-dependencies]',
);
const localDependencies = args.includes('--local-dependencies');
const output = join(root, 'artifacts/relay');
await mkdir(output, { recursive: true });
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const report = {
  schemaVersion: 1,
  status: 'running',
  startedAt: new Date().toISOString(),
  dependencyMode: localDependencies ? 'local-snapshot' : 'registry-install',
  phases: [],
  scope:
    'The selected Relay implementation is verified against the final installed experimental package. Original independent-generation candidates and their input kit hashes are separate evidence in experiments/relay/comparison.json.',
};
async function readVerificationInputs() {
  const manifestPath = 'experiments/relay/current-source.json';
  const manifestBytes = await readFile(join(root, manifestPath));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.schemaVersion, 1, 'Unsupported current Relay source manifest.');
  assert.equal(manifest.baseline.path, 'experiments/relay/post-selection.json');
  const baselineBytes = await readFile(join(root, manifest.baseline.path));
  assert.equal(
    sha256(baselineBytes),
    manifest.baseline.sha256,
    'Historical Relay baseline must remain byte-identical.',
  );
  const baseline = JSON.parse(baselineBytes.toString('utf8'));
  assert.equal(manifest.change.kind, 'documentation-only');
  assert.deepEqual(manifest.change.paths, ['README.md']);
  assert.deepEqual(
    Object.keys(manifest.sourceSha256).sort(),
    Object.keys(baseline.sourceSha256).sort(),
  );
  for (const [path, hash] of Object.entries(manifest.sourceSha256)) {
    assert.match(hash, /^[a-f0-9]{64}$/);
    if (path !== 'README.md')
      assert.equal(
        hash,
        baseline.sourceSha256[path],
        `Documentation-only update must preserve historical source: ${path}`,
      );
  }
  return {
    manifest,
    identity: {
      path: manifestPath,
      sha256: sha256(manifestBytes),
      baseline: manifest.baseline,
      change: manifest.change,
    },
  };
}
async function assertDeclaredSources(consumer, sourceSha256) {
  for (const [path, expectedHash] of Object.entries(sourceSha256)) {
    assert.equal(
      sha256(await readFile(join(consumer, path))),
      expectedHash,
      `Final evidence must match the current declared source: ${path}`,
    );
  }
}
async function run(name, command, arguments_, cwd = root) {
  console.log(`Relay consumer: ${name}`);
  const start = Date.now();
  const phase = { name, command, arguments: arguments_, cwd, log: `artifacts/relay/${name}.log` };
  report.phases.push(phase);
  let stdout = '';
  let stderr = '';
  try {
    await new Promise((resolveRun, reject) => {
      const child = spawn(command, arguments_, {
        cwd,
        env: { ...process.env, CI: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', (part) => {
        stdout += part;
        process.stdout.write(part);
      });
      child.stderr.on('data', (part) => {
        stderr += part;
        process.stderr.write(part);
      });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        phase.exitCode = code;
        if (code === 0) resolveRun();
        else reject(new Error(`${name} failed (${signal || code}); see ${phase.log}.`));
      });
    });
    phase.status = 'passed';
    return stdout;
  } catch (error) {
    phase.status = 'failed';
    phase.failure = error.message;
    throw error;
  } finally {
    phase.durationMs = Date.now() - start;
    await writeFile(join(root, phase.log), `${stdout}${stderr ? `\n${stderr}` : ''}`);
  }
}
try {
  const inputs = await readVerificationInputs();
  report.sourceManifest = inputs.identity;
  await run('prepare', process.execPath, [join(root, 'scripts/prepare-relay.mjs'), ...args]);
  const preparation = await readJson(join(output, 'preparation.json'));
  const consumer = resolve(preparation.consumer);
  const kit = resolve(preparation.kit);
  report.consumer = consumer;
  report.preparation = preparation;
  await assertDeclaredSources(consumer, inputs.manifest.sourceSha256);
  // Preserve exact preparation provenance, and independently verify its package/kit hashes.
  report.dependencySource = preparation.provenance.dependencySource;
  assert.equal(sha256(await readFile(preparation.tarball)), preparation.provenance.tarballSha256);
  assert.equal(
    sha256(await readFile(join(kit, 'integrity.json'))),
    preparation.provenance.kitIntegritySha256,
  );
  assert.deepEqual(await readJson(join(consumer, 'aegis-lock.json')), preparation.provenance);
  if (localDependencies)
    assert.match(
      report.dependencySource,
      /local dependency snapshot.*clean registry installation is not verified/i,
    );
  const policy = JSON.parse(
    await run(
      'installed-policy',
      process.execPath,
      [
        join(kit, 'bin/aegis.mjs'),
        'patterns',
        'check',
        'pattern-policy.json',
        '--project',
        consumer,
      ],
      consumer,
    ),
  );
  assert.equal(policy.valid, true, 'Installed kit must accept the final Relay product policy.');
  report.policy = policy;
  await run('production-build', npm, ['run', 'build'], consumer);
  await run('browser', process.execPath, [
    join(root, 'scripts/verify-relay.mjs'),
    consumer,
    'final-consumer',
    '--review-presentation',
  ]);
  const browser = await readJson(join(output, 'final-consumer/report.json'));
  assert.equal(browser.status, 'passed');
  assert.equal(
    resolve(browser.consumer),
    consumer,
    'Browser evidence must belong to this newly prepared consumer.',
  );
  assert.equal(browser.name, 'final-consumer');
  assert.equal(browser.presentationReview, true);
  assert.equal(
    browser.presentationChecks?.length,
    8,
    'Review both pages in both modes and widths.',
  );
  assert.equal(browser.observations?.cancelDraft?.retained, false);
  assert.equal(browser.observations.cancelDraft.reopenedTitle, '');
  assert.deepEqual(browser.errors, []);
  assert.deepEqual(
    browser.lock,
    preparation.provenance,
    'Browser evidence must retain the exact installed-package provenance.',
  );
  assert.equal(browser.sourceSha256, sha256(await readFile(join(consumer, 'src/requests.tsx'))));
  assert.equal(
    browser.harnessSha256,
    sha256(await readFile(join(root, 'scripts/verify-relay.mjs'))),
  );
  await assertDeclaredSources(consumer, inputs.manifest.sourceSha256);
  const finalInputs = await readVerificationInputs();
  assert.deepEqual(
    finalInputs.identity,
    inputs.identity,
    'Verification inputs must not change during the consumer run.',
  );
  report.currentSourceHashes = inputs.manifest.sourceSha256;
  report.browser = browser;
  report.status = 'passed';
  report.completedAt = new Date().toISOString();
  // The current run is saved under artifacts in finally. Historical post-selection
  // evidence, its original final consumer report, and input manifests stay unchanged.
  console.log(`Relay consumer passed: ${report.dependencySource}`);
} catch (error) {
  report.status = 'failed';
  report.failure = error instanceof Error ? error.message : String(error);
  report.completedAt = new Date().toISOString();
  process.exitCode = 1;
  console.error(report.failure);
} finally {
  await writeFile(join(output, 'check-report.json'), JSON.stringify(report, null, 2) + '\n');
}
