import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { git } from './process.mjs';
import { publishRepair } from './publish.mjs';
import { runRepair } from './worker.mjs';

const sourcePath = 'src/components/sparkline/sparkline.css';
const original = '.sparkline { width: 900px; }\n';
const corrected = '.sparkline { max-width: 100%; }\n';
const oraclePath = 'tests/oracle.txt';
const oracle = 'preserve the original oracle\n';

async function fixture(t, { trackedLink = false } = {}) {
  const parent = await mkdtemp(join(tmpdir(), 'aegis-worker-security-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, 'repository');
  await mkdir(join(root, 'src/components/sparkline'), { recursive: true });
  await mkdir(join(root, 'tests'));
  await writeFile(join(root, sourcePath), original);
  await writeFile(join(root, oraclePath), oracle);
  await writeFile(join(root, 'tests/alternate.txt'), 'weakened alternative oracle\n');
  if (trackedLink) await symlink('oracle.txt', join(root, 'tests/current.txt'));
  await git(root, ['init', '--quiet', '-b', 'codex/security-fixture']);
  await git(root, ['add', '.']);
  await git(root, [
    '-c',
    'user.name=Security Fixture',
    '-c',
    'user.email=security@localhost',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'security fixture',
  ]);
  return { root, parent, baseCommit: await git(root, ['rev-parse', 'HEAD']) };
}

function policy(verify) {
  return {
    id: 'security-containment',
    policyVersion: '1',
    maxAttempts: 1,
    maxFiles: 1,
    maxBytes: 1000,
    allowedPaths: [sourcePath],
    reproduce: async () => ({ status: 'failed', diagnostic: 'Sparkline exceeds its parent.' }),
    verify:
      verify ??
      (async ({ cwd }) => ({
        status: (await readFile(join(cwd, sourcePath), 'utf8')) === corrected ? 'passed' : 'failed',
        diagnostic: 'Verify containment using the original oracle.',
      })),
  };
}

const provider = async ({ sources }) => ({
  proposal: {
    summary: 'Constrain sparkline width',
    rationale: 'Keep the sparkline within its parent.',
    changes: [{ path: sourcePath, beforeSha256: sources[0].sha256, content: corrected }],
  },
  provenance: { kind: 'controlled-security-test-provider' },
});

const run = (repository, verify) =>
  runRepair({
    repository,
    audit: policy(verify),
    provider,
    // These adversarial fixtures exercise source boundaries, not product acceptance.
    regressionCommands: [],
  });

test('an injected staged oracle blob cannot be committed even when working-tree bytes are untouched', async (t) => {
  const f = await fixture(t);
  const malicious = join(f.parent, 'injected-oracle.txt');
  await writeFile(malicious, 'weakened staged oracle\n');
  const report = await run(f.root, async ({ cwd }) => {
    const hash = await git(cwd, ['hash-object', '-w', malicious]);
    await git(cwd, ['update-index', '--cacheinfo', `100644,${hash},${oraclePath}`]);
    assert.equal(await readFile(join(cwd, oraclePath), 'utf8'), oracle);
    assert.equal(
      await git(cwd, ['show', `:${oraclePath}`], { raw: true }),
      'weakened staged oracle\n',
    );
    return { status: 'passed', diagnostic: 'Verifier claims success.' };
  });
  assert.equal(report.state, 'needs-review');
  assert.match(report.attempts[0].reason, /HEAD or index changed/);
  assert.equal(report.candidateCommit, undefined);
  assert.equal(await git(report.candidate, ['rev-parse', 'HEAD']), f.baseCommit);
  assert.equal(await readFile(join(f.root, oraclePath), 'utf8'), oracle);
});

test('retargeting a tracked symlink is detected from disk despite an unchanged Git index', async (t) => {
  const f = await fixture(t, { trackedLink: true });
  const report = await run(f.root, async ({ cwd }) => {
    const indexBefore = await git(cwd, ['ls-files', '-s', '--', 'tests/current.txt']);
    await rm(join(cwd, 'tests/current.txt'));
    await symlink('alternate.txt', join(cwd, 'tests/current.txt'));
    assert.equal(await git(cwd, ['ls-files', '-s', '--', 'tests/current.txt']), indexBefore);
    return { status: 'passed', diagnostic: 'Verifier used a substituted link.' };
  });
  assert.equal(report.state, 'needs-review');
  assert.match(report.attempts[0].reason, /Protected source changed: tests\/current.txt/);
  assert.equal(report.candidateCommit, undefined);
  assert.equal(await readlink(join(f.root, 'tests/current.txt')), 'oracle.txt');
});

test('Git clean-filter transformations cannot promote a commit whose bytes differ from the verified fix', async (t) => {
  const f = await fixture(t);
  const report = await run(f.root, async ({ cwd }) => {
    // Metadata intentionally escapes the working-tree snapshot. The committed-blob
    // check must catch this post-verification transformation independently.
    await git(cwd, [
      'config',
      '--local',
      'filter.security-drift.clean',
      'sed s/max-width/min-width/',
    ]);
    await git(cwd, ['config', '--local', 'filter.security-drift.required', 'true']);
    await writeFile(join(cwd, '.git/info/attributes'), `${sourcePath} filter=security-drift\n`);
    assert.equal(await readFile(join(cwd, sourcePath), 'utf8'), corrected);
    return { status: 'passed', diagnostic: 'The working source passed containment.' };
  });
  assert.equal(report.state, 'needs-review');
  assert.match(report.attempts[0].reason, /Committed bytes differ from verified source/);
  assert.equal(report.branch, undefined);
  assert.equal(report.patchSha256, undefined);
  assert.equal(
    await git(report.candidate, ['show', `HEAD:${sourcePath}`], { raw: true }),
    '.sparkline { min-width: 100%; }\n',
  );
  assert.equal(await readFile(join(f.root, sourcePath), 'utf8'), original);
});

test('an existing draft with a different head commit cannot inherit the verified repair evidence', async (t) => {
  const f = await fixture(t);
  await git(f.root, ['remote', 'add', 'origin', 'https://github.com/owner/repository.git']);
  const report = await run(f.root);
  assert.equal(report.state, 'proposed', report.reason);
  const calls = [];
  await assert.rejects(
    publishRepair({
      repository: f.root,
      id: report.id,
      execute: async (command, args) => {
        calls.push({ command, args });
        return {
          exitCode: 0,
          stdout: JSON.stringify([
            {
              url: 'https://github.com/owner/repository/pull/9',
              state: 'OPEN',
              isDraft: true,
              headRefOid: f.baseCommit,
            },
          ]),
        };
      },
    }),
    /no longer points to the verified candidate/,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'gh');
  assert.ok(calls[0].args.includes('list'));
  assert.ok(calls[0].args.includes('url,state,isDraft,headRefOid'));
  assert.equal(JSON.parse(await readFile(report.reportPath, 'utf8')).pullRequest, undefined);
});
