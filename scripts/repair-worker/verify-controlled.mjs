import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readlink, realpath, rename, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getAudit } from './audits.mjs';
import { git } from './process.mjs';
import { runRepair, sourceRegressionCommands } from './worker.mjs';

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const seedPath = 'src/components/metric-card/metric-card.css';
const seed = '\n.aegis-metric-main > .aegis-sparkline {\n  min-width: var(--group-data-display-metric-card-size-max-width-extended-canvas-roomy);\n}\n';
const summarizeAudit = (audit) => audit ? ({ status: audit.status, scenarios: audit.checks.length, productScenarios: audit.forma.checks.length, canonicalScenarios: audit.canonical.checks.length, canonicalFailures: audit.canonical.failures.length, reportSha256: audit.evidence.sha256 }) : null;

async function snapshot(repository) {
  const files = {};
  for (const path of (await git(repository, ['ls-files', '-z'], { raw: true })).split('\0').filter(Boolean).sort()) {
    const absolute = join(repository, path);
    const stat = await lstat(absolute);
    files[path] = `${stat.mode & 0o777}:${digest(stat.isSymbolicLink() ? await readlink(absolute) : await readFile(absolute))}`;
  }
  return digest(json(files));
}

async function preserveAudit(audit, target) {
  const bytes = await readFile(audit.evidence.report);
  assert.equal(digest(bytes), audit.evidence.sha256);
  await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
}

/** Tests the real worker and browser oracle with a known answer, never an AI service. */
export async function verifyControlled({ repository = sourceRoot, outputDirectory } = {}) {
  repository = await realpath(repository);
  assert.equal(await git(repository, ['status', '--porcelain', '--untracked-files=all']), '', 'Controlled verification requires a clean committed checkout.');
  const baseCommit = await git(repository, ['rev-parse', 'HEAD']);
  const originalHash = await snapshot(repository);
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'aegis-repair-controlled-'));
  const fixture = join(fixtureRoot, 'fixture');
  const outputRoot = resolve(outputDirectory ?? join(repository, 'artifacts/repair-worker-controlled'));
  const output = join(outputRoot, randomUUID());
  await mkdir(output, { recursive: true, mode: 0o700 });
  const proof = {
    schemaVersion: 1, evidenceOrigin: 'seeded-regression', providerKind: 'controlled-test-provider',
    aiExecution: false, externalModelRequests: 0, observedProductionDefect: false,
    state: 'running', startedAt: new Date().toISOString(), originalRepository: repository,
    originalBaseCommit: baseCommit, originalSourceTreeSha256: originalHash, fixtureRepository: fixture,
    limitations: ['The defect and its deterministic repair are supplied by this test.', 'This verifies worker orchestration, the real browser oracle, regressions and isolation; it does not verify AI diagnosis or repair quality.', 'No external model, publication, automatic merge or release is performed.'],
  };
  let failure;
  try {
    await git(repository, ['clone', '--quiet', '--no-hardlinks', '--no-checkout', '--', repository, fixture]);
    await git(fixture, ['checkout', '--quiet', '--detach', baseCommit]);
    await git(fixture, ['remote', 'remove', 'origin']);
    await git(fixture, ['config', 'core.hooksPath', '/dev/null']);
    await symlink(await realpath(join(repository, 'node_modules')), join(fixture, 'node_modules'), 'dir');
    await writeFile(join(fixture, '.git/info/exclude'), 'node_modules\n.aegis-repair\n', { flag: 'a' });
    const audit = getAudit('metric-containment');
    const healthy = await audit.reproduce({ cwd: fixture, evidenceDir: join(fixtureRoot, 'healthy') });
    proof.healthyBaseline = summarizeAudit(healthy);
    await preserveAudit(healthy, join(output, 'healthy.audit.json'));
    assert.equal(healthy.status, 'passed', 'The unmodified fixture must pass.');

    const originalCss = await readFile(join(fixture, seedPath), 'utf8');
    assert.ok(!originalCss.includes(seed.trim()), 'The seed already exists.');
    await writeFile(join(fixture, seedPath), originalCss + seed);
    assert.equal(await git(fixture, ['diff', '--name-only']), seedPath);
    await git(fixture, ['add', '--', seedPath]);
    await git(fixture, ['-c', 'user.name=Aegis Controlled Fixture', '-c', 'user.email=aegis-proof@localhost', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'Seed isolated containment regression for controlled worker verification']);
    proof.seededCommit = await git(fixture, ['rev-parse', 'HEAD']);
    proof.seed = { path: seedPath, beforeSha256: digest(originalCss), afterSha256: digest(originalCss + seed) };
    let calls = 0;
    const provider = async (context) => {
      calls++;
      assert.equal(calls, 1, 'The deterministic known repair must need only one attempt.');
      assert.deepEqual(context.sources.map(({ path }) => path), [...audit.allowedPaths]);
      const preview = json(context);
      await writeFile(join(output, 'live-request-preview.json'), preview, { flag: 'wx', mode: 0o600 });
      await writeFile(join(output, 'live-payload-manifest.json'), json({
        schemaVersion: 1, transmitted: false, modelInvoked: false,
        purpose: 'Local review of the exact context that a future explicitly authorized provider request would receive.',
        contextPreview: 'live-request-preview.json', contextSha256: digest(preview),
        sourceFiles: context.sources.map(({ path, sha256, content }) => ({ path, sha256, bytes: Buffer.byteLength(content) })),
        diagnosticSha256: digest(context.diagnostic), diagnosticBytes: Buffer.byteLength(context.diagnostic),
        diagnosticCategories: ['Audit pass/fail summaries', 'Viewport widths and light/dark presentation modes', 'Measured card/value/chart bounding boxes and visibility', 'Containment assertion failures', 'Page error and blocked-request origins, if any'],
        otherContext: ['auditId', 'baseCommit', 'attempt', 'trusted repair instructions', 'previous attempt summaries'],
        credentialsIncluded: false, userContentIncluded: false, evidenceOrigin: 'seeded-regression',
        note: 'The preview contains repository CSS source and synthetic fixture diagnostics. Approval of live model use is separate from this controlled verification.',
      }), { flag: 'wx', mode: 0o600 });
      const source = context.sources.find(({ path }) => path === seedPath);
      assert.equal(source.content.split(seed).length - 1, 1);
      return {
        proposal: { summary: 'Remove the known fixture minimum-width regression.', rationale: 'Controlled test answer: remove exactly the seeded rule. No model inference was performed.', changes: [{ path: seedPath, beforeSha256: source.sha256, content: source.content.replace(seed, '') }] },
        provenance: { kind: 'controlled-test-provider', modelInvoked: false, fixtureOnly: true, knownAnswer: true },
      };
    };
    const result = await runRepair({ repository: fixture, audit, provider, evidenceOrigin: 'seeded-regression' });
    proof.before = summarizeAudit(result.before);
    proof.worker = { id: result.id, state: result.state, candidate: result.candidate, candidateCommit: result.candidateCommit ?? null, branch: result.branch ?? null, policySha256: result.policySha256, patchSha256: result.patchSha256 ?? null, attempts: result.attempts.map(({ number, state, provider: provenance, regressions }) => ({ number, state, provenance, regressions: regressions ?? [] })) };
    proof.controlledProviderCalls = calls;
    await cp(result.reportPath, join(output, 'worker.report.json'), { errorOnExist: true, force: false });
    await preserveAudit(result.before, join(output, 'seeded-before.audit.json'));
    assert.equal(result.before.status, 'failed', 'The genuine browser audit must detect the seeded defect.');
    assert.equal(result.state, 'proposed', 'The worker must produce a verified isolated proposal.');
    const accepted = result.attempts.find(({ state }) => state === 'passed');
    assert.equal(accepted?.provider.kind, 'controlled-test-provider');
    assert.equal(accepted.audit.status, 'passed');
    assert.deepEqual(accepted.regressions.map(({ id, passed }) => ({ id, passed })), sourceRegressionCommands.map(({ id }) => ({ id, passed: true })));
    assert.equal(result.review?.automaticMerge, false);
    assert.equal(result.remote, null);
    assert.equal(await git(fixture, ['rev-parse', 'HEAD']), proof.seededCommit);
    assert.equal(await git(result.candidate, ['diff', '--name-only', result.baseCommit, result.candidateCommit]), seedPath);
    assert.equal(await readFile(join(result.candidate, seedPath), 'utf8'), originalCss);
    const patch = await git(result.candidate, ['diff', '--binary', result.baseCommit, result.candidateCommit], { raw: true });
    assert.ok(patch.length > 0);
    assert.equal(digest(patch), result.patchSha256);
    await writeFile(join(output, 'candidate.patch'), patch, { flag: 'wx', mode: 0o600 });
    await preserveAudit(accepted.audit, join(output, 'after.audit.json'));
    proof.after = summarizeAudit(accepted.audit);
    proof.protectedSourceUnchanged = true;
    proof.externalPublication = false;
    proof.state = 'passed';
  } catch (error) {
    failure = error; proof.state = 'failed'; proof.failure = error.message;
  } finally {
    try {
      assert.equal(await git(repository, ['rev-parse', 'HEAD']), baseCommit);
      proof.originalSourceTreeAfterSha256 = await snapshot(repository);
      assert.equal(proof.originalSourceTreeAfterSha256, originalHash);
      proof.originalSourceUnchanged = true;
    } catch (error) { failure ??= error; proof.state = 'failed'; proof.originalSourceUnchanged = false; }
    proof.finishedAt = new Date().toISOString();
    proof.evidenceDirectory = output;
    await writeFile(join(output, 'verification.json'), json(proof), { flag: 'wx', mode: 0o600 });
    const temporary = join(outputRoot, `${randomUUID()}.tmp`);
    await writeFile(temporary, json(proof), { flag: 'wx', mode: 0o600 });
    await rename(temporary, join(outputRoot, 'verification.json'));
  }
  if (failure) throw new Error(`Controlled verification failed; see ${join(output, 'verification.json')}`, { cause: failure });
  return proof;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.includes('--help')) console.log('Usage: node scripts/repair-worker/verify-controlled.mjs [--repo <clean-checkout>] [--output <directory>]\nRuns a real local browser/worker proof with a known deterministic answer. No AI service or credentials are used.');
    else {
      const options = {};
      for (let index = 2; index < process.argv.length; index++) {
        const key = { '--repo': 'repository', '--output': 'outputDirectory' }[process.argv[index]];
        if (!key || !process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error('Expected --repo or --output followed by a path.');
        options[key] = process.argv[++index];
      }
      const proof = await verifyControlled(options);
      console.log(json({ state: proof.state, providerKind: proof.providerKind, aiExecution: false, before: proof.before, after: proof.after, evidenceDirectory: proof.evidenceDirectory }));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
