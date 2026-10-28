import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  realpath,
  rename,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getAudit } from './audits.mjs';
import { createCodexProvider } from './provider.mjs';
import { git } from './process.mjs';
import { runRepair, sourceRegressionCommands } from './worker.mjs';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const seededPath = 'src/components/metric-card/metric-card.css';
// This is a real containment defect using an existing owning-group token. It is
// introduced only in a disposable repository and is never an expected repair.
const seed =
  '\n.aegis-metric-main > .aegis-sparkline {\n  min-width: var(--group-data-display-metric-card-size-max-width-extended-canvas-roomy);\n}\n';

async function trackedSnapshot(repository) {
  const hashes = {};
  for (const path of (await git(repository, ['ls-files', '-z']))
    .split('\0')
    .filter(Boolean)
    .sort()) {
    const absolute = join(repository, path);
    const stat = await lstat(absolute);
    const bytes = stat.isSymbolicLink() ? await readlink(absolute) : await readFile(absolute);
    hashes[path] = `${stat.mode & 0o777}:${digest(bytes)}`;
  }
  return { treeSha256: digest(json(hashes)), hashes };
}

function auditSummary(audit) {
  if (!audit) return null;
  return {
    status: audit.status,
    scenarios: audit.checks?.length ?? 0,
    productScenarios: audit.forma?.checks?.length ?? 0,
    canonicalScenarios: audit.canonical?.checks?.length ?? 0,
    canonicalFailures: audit.canonical?.failures?.length ?? 0,
    reportSha256: audit.evidence?.sha256 ?? null,
  };
}

async function preserveAudit(audit, destination) {
  if (!audit?.evidence?.report) return;
  const bytes = await readFile(audit.evidence.report);
  assert.equal(digest(bytes), audit.evidence.sha256, 'Audit evidence changed before preservation.');
  await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
}

/** Explicit, paid/account-usage verification; never called by the ordinary test suite. */
export async function verifyLive({
  live = false,
  repository = sourceRoot,
  executable = 'codex',
  outputDirectory,
} = {}) {
  if (live !== true)
    throw new Error(
      'Live Codex verification requires the explicit --live flag. It uses the current Codex account.',
    );
  repository = await realpath(repository);
  const audit = getAudit('metric-containment');
  const baseCommit = await git(repository, ['rev-parse', 'HEAD']);
  const sourceStatus = await git(repository, ['status', '--porcelain', '--untracked-files=all']);
  assert.equal(
    sourceStatus,
    '',
    'Commit or preserve source changes before starting live verification.',
  );
  const original = await trackedSnapshot(repository);
  const dependencies = await realpath(join(repository, 'node_modules'));
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'aegis-repair-live-proof-'));
  const fixtureRepository = join(fixtureRoot, 'fixture');
  const outputRoot = resolve(outputDirectory ?? join(repository, 'artifacts/repair-worker-live'));
  const runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`;
  const output = join(outputRoot, runId);
  await mkdir(output, { recursive: true, mode: 0o700 });
  const proof = {
    schemaVersion: 1,
    id: runId,
    experiment: 'source-repair-worker-live',
    evidenceOrigin: 'seeded-regression',
    defectOrigin: 'intentionally introduced into a disposable fixture repository',
    providerExecution: 'live-codex-cli',
    observedProductionDefect: false,
    originalRepository: repository,
    originalBaseCommit: baseCommit,
    originalSourceTreeSha256: original.treeSha256,
    fixtureRepository,
    auditId: audit.id,
    startedAt: new Date().toISOString(),
    state: 'running',
    providerCalls: [],
    limitations: [
      'The defect is deliberately seeded. This is not evidence of a detected production incident.',
      'A successful run proves one bounded live proposal against the recorded Chromium scenarios and regressions.',
      'It does not establish repair reliability across arbitrary components, semantic correctness, automatic merge or release authority.',
    ],
  };
  let failure;
  try {
    await git(repository, [
      'clone',
      '--quiet',
      '--no-hardlinks',
      '--no-checkout',
      '--',
      repository,
      fixtureRepository,
    ]);
    await git(fixtureRepository, ['checkout', '--quiet', '--detach', baseCommit]);
    await git(fixtureRepository, ['config', 'core.hooksPath', '/dev/null']);
    await git(fixtureRepository, ['remote', 'remove', 'origin']);
    await symlink(dependencies, join(fixtureRepository, 'node_modules'), 'dir');
    await writeFile(join(fixtureRepository, '.git/info/exclude'), 'node_modules\n.aegis-repair\n', {
      flag: 'a',
    });

    const healthy = await audit.reproduce({
      cwd: fixtureRepository,
      evidenceDir: join(fixtureRoot, 'healthy-before-seeding'),
    });
    proof.healthyBaseline = auditSummary(healthy);
    await preserveAudit(healthy, join(output, 'healthy-baseline.audit.json'));
    assert.equal(
      healthy.status,
      'passed',
      'The pristine fixture must pass before introducing a regression.',
    );

    const cssPath = join(fixtureRepository, seededPath);
    const beforeSeed = await readFile(cssPath, 'utf8');
    assert.ok(
      !beforeSeed.includes(seed.trim()),
      'The fixture already contains the seed; refusing a misleading replay.',
    );
    await writeFile(cssPath, `${beforeSeed}${seed}`);
    assert.equal(await git(fixtureRepository, ['diff', '--name-only']), seededPath);
    await git(fixtureRepository, ['add', '--', seededPath]);
    await git(fixtureRepository, [
      '-c',
      'user.name=Aegis Verification Fixture',
      '-c',
      'user.email=aegis-proof@localhost',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'Seed metric containment regression for isolated live worker verification',
    ]);
    proof.seededBaseCommit = await git(fixtureRepository, ['rev-parse', 'HEAD']);
    proof.seed = {
      path: seededPath,
      beforeSha256: digest(beforeSeed),
      afterSha256: digest(`${beforeSeed}${seed}`),
      patchSha256: digest(
        await git(fixtureRepository, ['diff', '--binary', baseCommit, proof.seededBaseCommit], {
          raw: true,
        }),
      ),
      description: 'A sparkline receives an excessive minimum width from an existing group token.',
    };

    const liveProvider = createCodexProvider({ executable });
    const provider = async (context) => {
      // No original source, expected repair, seed description or reference patch
      // enters the model request. The worker supplies the failing source/evidence.
      const response = await liveProvider(context);
      assert.equal(response.provenance.kind, 'codex-cli');
      proof.providerCalls.push({ attempt: context.attempt, provenance: response.provenance });
      return response;
    };
    const result = await runRepair({
      repository: fixtureRepository,
      audit,
      provider,
      evidenceOrigin: 'seeded-regression',
      // Do not override the worker's required regression commands.
    });
    proof.worker = {
      id: result.id,
      state: result.state,
      baseCommit: result.baseCommit,
      candidateCommit: result.candidateCommit ?? null,
      candidateRepository: result.candidate,
      reportPath: result.reportPath,
      policySha256: result.policySha256,
      patchSha256: result.patchSha256 ?? null,
      authority: result.authority,
      attempts: result.attempts.map((attempt) => ({
        number: attempt.number,
        state: attempt.state,
        audit: auditSummary(attempt.audit),
        regressions: attempt.regressions ?? [],
        provider: attempt.provider ?? null,
        changes: attempt.changes ?? [],
      })),
    };
    proof.before = auditSummary(result.before);
    await preserveAudit(result.before, join(output, 'seeded-before.audit.json'));
    for (const attempt of result.attempts) {
      await preserveAudit(attempt.audit, join(output, `attempt-${attempt.number}.audit.json`));
    }
    assert.equal(result.evidenceOrigin, 'seeded-regression');
    assert.equal(
      result.before?.status,
      'failed',
      'The seeded regression must actually fail the authoritative browser audit.',
    );
    assert.equal(
      result.state,
      'proposed',
      'The live worker did not produce a verified source proposal.',
    );
    assert.ok(
      proof.providerCalls.length > 0,
      'A successful proof requires actual Codex execution.',
    );
    const accepted = result.attempts.find((attempt) => attempt.state === 'passed');
    assert.ok(accepted, 'No accepted attempt was recorded.');
    assert.equal(accepted.provider?.kind, 'codex-cli');
    assert.match(accepted.provider?.responseSha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(accepted.audit?.status, 'passed');
    assert.deepEqual(
      accepted.regressions.map(({ id, passed }) => ({ id, passed })),
      sourceRegressionCommands.map(({ id }) => ({ id, passed: true })),
    );
    assert.equal(result.review?.automaticMerge, false);
    proof.after = auditSummary(accepted.audit);
    const patch = await git(
      result.candidate,
      ['diff', '--binary', result.baseCommit, result.candidateCommit],
      { raw: true },
    );
    assert.ok(patch.length > 0, 'The accepted proposal must contain an actual change.');
    assert.equal(digest(patch), result.patchSha256);
    await writeFile(join(output, 'candidate.patch'), patch, { flag: 'wx', mode: 0o600 });
    proof.candidateSourceTreeSha256 = (await trackedSnapshot(result.candidate)).treeSha256;
    proof.sourceHashes = {};
    for (const path of audit.allowedPaths) {
      proof.sourceHashes[path] = {
        original: digest(await readFile(join(repository, path))),
        seeded: digest(await readFile(join(fixtureRepository, path))),
        proposed: digest(await readFile(join(result.candidate, path))),
      };
    }
    await cp(result.reportPath, join(output, 'worker.report.json'), {
      errorOnExist: true,
      force: false,
    });
    proof.state = 'passed';
  } catch (error) {
    failure = error;
    proof.state = 'failed';
    // Provider errors are intentionally sanitized by the adapter; do not copy
    // process output, prompts, authentication data or full model responses here.
    proof.failure = { code: error.code ?? 'LIVE_PROOF_FAILED', message: error.message };
  } finally {
    try {
      assert.equal(
        await git(repository, ['rev-parse', 'HEAD']),
        baseCommit,
        'Original repository HEAD changed during proof.',
      );
      const after = await trackedSnapshot(repository);
      proof.originalSourceTreeAfterSha256 = after.treeSha256;
      proof.originalSourceUnchanged = after.treeSha256 === original.treeSha256;
      assert.ok(proof.originalSourceUnchanged, 'Original source files changed during proof.');
    } catch (error) {
      failure ??= error;
      proof.state = 'failed';
      proof.originalSourceUnchanged = false;
      proof.failure = { code: 'SOURCE_PRESERVATION_FAILED', message: error.message };
    }
    proof.finishedAt = new Date().toISOString();
    await writeFile(join(output, 'verification.json'), json(proof), { flag: 'wx', mode: 0o600 });
    // Keep every run and update only the small latest-result index atomically.
    const latest = join(outputRoot, `verification.${randomUUID()}.tmp`);
    await writeFile(latest, json({ ...proof, evidenceDirectory: output }), {
      flag: 'wx',
      mode: 0o600,
    });
    await rename(latest, join(outputRoot, 'verification.json'));
  }
  if (failure)
    throw Object.assign(
      new Error(
        `Live seeded-regression verification failed. Evidence: ${join(output, 'verification.json')}`,
      ),
      { cause: failure },
    );
  return { ...proof, evidenceDirectory: output };
}

function argumentsFor(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--live') options.live = true;
    else if (['--repo', '--codex', '--output'].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
      options[
        { '--repo': 'repository', '--codex': 'executable', '--output': 'outputDirectory' }[arg]
      ] = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.includes('--help')) {
    console.log(
      'Usage: node scripts/repair-worker/verify-live.mjs --live [--repo <clean-checkout>] [--codex <executable>] [--output <directory>]\nRuns a real Codex account request against a deliberately seeded fixture defect. Leaves the original source unchanged and retains isolated evidence.',
    );
  } else {
    try {
      const proof = await verifyLive(argumentsFor(process.argv.slice(2)));
      console.log(
        json({
          state: proof.state,
          evidenceOrigin: proof.evidenceOrigin,
          providerCalls: proof.providerCalls.length,
          evidenceDirectory: proof.evidenceDirectory,
        }),
      );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
