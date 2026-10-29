import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { git, runCommand } from './process.mjs';
import { runRepair, readReport, stateRoot, unlockStoppedWorker } from './worker.mjs';
import { githubRepository, publishRepair } from './publish.mjs';

const sourcePath = 'src/components/sparkline/sparkline.css';
const source = '.sparkline { width: 900px; }\n';
const fixed = '.sparkline { max-width: 100%; }\n';

async function fixture(t, healthy = false) {
  const root = await mkdtemp(join(tmpdir(), 'aegis-worker-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/components/sparkline'), { recursive: true });
  await mkdir(join(root, 'tests'));
  await writeFile(join(root, sourcePath), healthy ? fixed : source);
  await writeFile(join(root, 'tests/oracle.txt'), 'preserve the oracle\n');
  await git(root, ['init', '--quiet', '-b', 'codex/fixture']);
  await git(root, ['add', '.']);
  await git(root, [
    '-c',
    'user.name=Test',
    '-c',
    'user.email=test@localhost',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  ]);
  return root;
}

function policy(overrides = {}) {
  const check = async ({ cwd, evidenceDir }) => {
    const content = await readFile(join(cwd, sourcePath), 'utf8');
    const result = {
      status: content === fixed ? 'passed' : 'failed',
      diagnostic: content === fixed ? 'Contained' : 'Sparkline exceeds parent width',
      checks: 1,
    };
    await writeFile(join(evidenceDir, 'audit.json'), JSON.stringify(result));
    return result;
  };
  return {
    id: 'fixture-containment',
    policyVersion: '1',
    allowedPaths: [sourcePath],
    maxAttempts: 2,
    maxFiles: 1,
    maxBytes: 1000,
    reproduce: check,
    verify: check,
    ...overrides,
  };
}

const validProvider = async (context) => ({
  proposal: {
    summary: 'Constrain sparkline width',
    rationale: 'Parent containment',
    changes: [{ path: sourcePath, beforeSha256: context.sources[0].sha256, content: fixed }],
  },
  provenance: { kind: 'controlled-test-provider' },
});
const regression = {
  id: 'oracle',
  command: process.execPath,
  args: [
    '-e',
    "if(require('fs').readFileSync('tests/oracle.txt','utf8')!=='preserve the oracle\\n')process.exit(1)",
  ],
  timeoutMs: 5000,
};
const run = (repository, extras = {}) =>
  runRepair({
    repository,
    audit: policy(),
    provider: validProvider,
    regressionCommands: [regression],
    ...extras,
  });

test('successful repair preserves source, records before/after, and creates only an isolated committed proposal', async (t) => {
  const root = await fixture(t);
  const original = await git(root, ['rev-parse', 'HEAD']);
  const report = await run(root);
  assert.equal(report.state, 'proposed', report.reason);
  assert.equal(report.before.status, 'failed');
  assert.equal(report.attempts[0].audit.status, 'passed');
  assert.equal(report.attempts[0].regressions[0].passed, true);
  assert.equal(await readFile(join(root, sourcePath), 'utf8'), source);
  assert.equal(await git(root, ['rev-parse', 'HEAD']), original);
  assert.equal(await readFile(join(report.candidate, sourcePath), 'utf8'), fixed);
  assert.match(
    await readFile(join(root, '.aegis-repair', report.id, 'candidate.patch'), 'utf8'),
    /max-width/,
  );
  assert.equal((await readReport(root, report.id)).candidateCommit, report.candidateCommit);
  assert.equal(report.review.automaticMerge, false);
});

test('healthy baseline never calls provider and repeated run reuses durable result', async (t) => {
  const root = await fixture(t, true);
  let calls = 0;
  const report = await run(root, {
    provider: async () => {
      calls++;
    },
  });
  assert.equal(report.state, 'healthy');
  const again = await run(root, {
    provider: async () => {
      calls++;
    },
  });
  assert.equal(again.reused, true);
  assert.equal(again.id, report.id);
  assert.equal(calls, 0);
});

test('audit setup errors do not authorize AI repair', async (t) => {
  const root = await fixture(t);
  let called = false;
  const report = await run(root, {
    audit: policy({ reproduce: async () => ({ status: 'error', diagnostic: 'Browser missing' }) }),
    provider: async () => {
      called = true;
    },
  });
  assert.equal(report.state, 'error');
  assert.equal(called, false);
});

test('two failed candidates exhaust budget and restart cannot reset it', async (t) => {
  const root = await fixture(t);
  let count = 0;
  const provider = async (context) => {
    count++;
    const result = await validProvider(context);
    result.proposal.changes[0].content = '.sparkline { width: 800px; }\n';
    return result;
  };
  const report = await run(root, { provider });
  assert.equal(report.state, 'needs-review');
  assert.equal(report.attempts.length, 2);
  const again = await run(root, { provider });
  assert.equal(again.reused, true);
  assert.equal(count, 2);
});

test('an invalid proposal stops immediately and cannot write protected tests', async (t) => {
  const root = await fixture(t);
  const report = await run(root, {
    provider: async (context) => {
      const result = await validProvider(context);
      result.proposal.changes[0].path = 'tests/oracle.txt';
      return result;
    },
  });
  assert.equal(report.state, 'needs-review');
  assert.equal(report.attempts.length, 1);
  assert.equal(
    await readFile(join(report.candidate, 'tests/oracle.txt'), 'utf8'),
    'preserve the oracle\n',
  );
});

test('a verifier changing an oracle cannot certify a passing candidate', async (t) => {
  const root = await fixture(t);
  const report = await run(root, {
    audit: policy({
      verify: async ({ cwd }) => {
        await writeFile(join(cwd, 'tests/oracle.txt'), 'weakened');
        return { status: 'passed', diagnostic: 'claims success' };
      },
    }),
  });
  assert.equal(report.state, 'needs-review');
  assert.match(report.attempts[0].reason, /Protected source changed/);
  assert.equal(report.candidateCommit, undefined);
});

test('a failing required regression prevents proposal despite browser success', async (t) => {
  const root = await fixture(t);
  const report = await run(root, {
    regressionCommands: [
      {
        id: 'regression',
        command: process.execPath,
        args: ['-e', 'process.exit(1)'],
        timeoutMs: 5000,
      },
    ],
  });
  assert.equal(report.state, 'needs-review');
  assert.equal(report.attempts[0].audit.status, 'passed');
  assert.match(report.attempts[0].reason, /Regression regression failed/);
});

test('a source edit during inference makes the result stale and preserves that edit', async (t) => {
  const root = await fixture(t);
  const report = await run(root, {
    provider: async (context) => {
      await writeFile(join(root, sourcePath), 'human change');
      return validProvider(context);
    },
  });
  assert.equal(report.state, 'needs-review');
  assert.equal(report.candidateCommit, undefined);
  assert.equal(await readFile(join(root, sourcePath), 'utf8'), 'human change');
});

test('concurrent workers cannot spend the same incident budget', async (t) => {
  const root = await fixture(t);
  let release, started;
  const waiting = new Promise((resolve) => {
    started = resolve;
  });
  const first = run(root, {
    provider: async (context) => {
      started();
      await new Promise((resolve) => {
        release = resolve;
      });
      return validProvider(context);
    },
  });
  await waiting;
  await assert.rejects(run(root), /locked/);
  await assert.rejects(unlockStoppedWorker(root), /still running/);
  release();
  assert.equal((await first).state, 'proposed');
});

test('interrupted report is escalated without spending again', async (t) => {
  const root = await fixture(t);
  const report = await run(root);
  report.state = 'repairing';
  await writeFile(report.reportPath, JSON.stringify(report));
  const result = await run(root, {
    provider: async () => {
      throw new Error('must not run');
    },
  });
  assert.equal(result.state, 'needs-review');
  assert.equal(result.reused, true);
  assert.match(result.reason, /interrupted/);
});

test('state symlinks and initially dirty source are rejected', async (t) => {
  const root = await fixture(t);
  await symlink(join(root, 'tests'), join(root, '.aegis-repair'));
  await assert.rejects(stateRoot(root), /Unsafe state directory/);
  await rm(join(root, '.aegis-repair'));
  await writeFile(join(root, sourcePath), 'dirty');
  await assert.rejects(run(root), /must be clean/);
});

test('provider failure is recorded without retry or raw credential logs', async (t) => {
  const root = await fixture(t);
  const report = await run(root, {
    provider: async () => {
      throw new Error('Provider unavailable');
    },
  });
  assert.equal(report.state, 'needs-review');
  assert.equal(report.attempts.length, 1);
  assert.equal(report.attempts[0].reason, 'Provider unavailable');
});

test('publisher validates remote, refuses demonstrations and altered candidates, and reuses a draft', async (t) => {
  assert.equal(githubRepository('git@github.com:owner/repo.git'), 'owner/repo');
  assert.equal(githubRepository('https://github.com/owner/repo'), 'owner/repo');
  assert.throws(() => githubRepository('ext::bad'), /requires/);
  const root = await fixture(t);
  await git(root, ['remote', 'add', 'origin', 'https://github.com/owner/repo.git']);
  const report = await run(root);
  const calls = [];
  const execute = async (command, args) => {
    calls.push([command, args]);
    return {
      exitCode: 0,
      stdout: JSON.stringify([
        {
          url: 'https://github.com/owner/repo/pull/1',
          state: 'OPEN',
          isDraft: true,
          headRefOid: report.candidateCommit,
        },
      ]),
    };
  };
  const result = await publishRepair({ repository: root, id: report.id, execute });
  assert.equal(result.pullRequest, 'https://github.com/owner/repo/pull/1');
  assert.equal(calls.length, 1);
  await writeFile(join(report.candidate, sourcePath), 'altered');
  await assert.rejects(publishRepair({ repository: root, id: report.id, execute }), /clean/);
  await writeFile(join(report.candidate, sourcePath), fixed);
  report.evidenceOrigin = 'seeded-regression';
  await writeFile(report.reportPath, JSON.stringify(report));
  await assert.rejects(
    publishRepair({ repository: root, id: report.id, execute }),
    /Demonstration/,
  );
});

test('publisher uses additive push and draft-only creation with literal body file', async (t) => {
  const root = await fixture(t);
  await git(root, ['remote', 'add', 'origin', 'https://github.com/owner/repo.git']);
  const report = await run(root);
  const calls = [];
  const result = await publishRepair({
    repository: root,
    id: report.id,
    execute: async (command, args) => {
      calls.push([command, args]);
      return {
        exitCode: 0,
        stdout: args.includes('list')
          ? '[]'
          : command === 'git'
            ? ''
            : 'https://github.com/owner/repo/pull/2\n',
      };
    },
  });
  assert.equal(result.pullRequest, 'https://github.com/owner/repo/pull/2');
  assert.equal(calls.length, 3);
  assert(calls[1][1].includes('push'));
  assert(!calls[1][1].includes('--force'));
  assert(calls[2][1].includes('--draft'));
  assert(calls[2][1].includes('--body-file'));
});

test('command runner bounds hangs/output and reports missing executables', async () => {
  const timed = await runCommand(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    timeoutMs: 50,
  });
  assert.equal(timed.timedOut, true);
  const big = await runCommand(process.execPath, ['-e', 'console.log("x".repeat(50000))'], {
    maxBytes: 100,
  });
  assert.equal(big.outputLimitExceeded, true);
  const absent = await runCommand('/no-such-command', []);
  assert.match(absent.error, /ENOENT/);
});
