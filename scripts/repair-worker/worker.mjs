import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { git, runCommand } from './process.mjs';
import { validateProposal, applyProposal, readRepairSources } from './patch.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const terminalStates = new Set(['healthy', 'proposed', 'needs-review', 'error']);

async function atomicJson(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, json(value), { mode: 0o600, flag: 'wx' });
  await rename(temporary, path);
}

async function ordinaryDirectory(path) {
  const absolute = resolve(path);
  let cursor = absolute;
  while (cursor !== dirname(cursor)) {
    try {
      const stat = await lstat(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error(`Unsafe state directory: ${cursor}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    cursor = dirname(cursor);
  }
  await mkdir(absolute, { recursive: true, mode: 0o700 });
  return realpath(absolute);
}

export async function stateRoot(repository) {
  return ordinaryDirectory(join(await realpath(repository), '.aegis-repair'));
}

async function lock(directory) {
  const path = join(directory, 'worker.lock');
  const owner = {
    pid: process.pid,
    host: hostname(),
    nonce: randomUUID(),
    startedAt: new Date().toISOString(),
  };
  let handle;
  try {
    handle = await open(path, 'wx', 0o600);
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Repair worker is locked. Inspect worker.lock; unlock only after its recorded process has stopped.',
        { cause: error },
      );
    throw error;
  }
  await handle.writeFile(json(owner));
  await handle.close();
  return async () => {
    const actual = JSON.parse(await readFile(path, 'utf8'));
    if (actual.nonce !== owner.nonce) throw new Error('Repair lock ownership changed.');
    await rm(path);
  };
}

export async function unlockStoppedWorker(repository) {
  const directory = await stateRoot(repository);
  const path = join(directory, 'worker.lock');
  const owner = JSON.parse(await readFile(path, 'utf8'));
  if (owner.host !== hostname() || !Number.isInteger(owner.pid) || owner.pid < 1)
    throw new Error('Cannot establish that this lock owner has stopped.');
  try {
    process.kill(owner.pid, 0);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    await rm(path);
    return { unlocked: true, interruptedRunRequiresReview: true };
  }
  throw new Error('Lock owner is still running; refusing to unlock.');
}

async function cleanSource(repository, expectedCommit) {
  const current = await git(repository, ['rev-parse', 'HEAD']);
  if (expectedCommit && current !== expectedCommit)
    throw new Error('Source revision changed during repair; review required.');
  // The worker's private state is excluded even in fixture repositories without .gitignore.
  const dirty = await git(repository, [
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    '.',
    ':!.aegis-repair',
  ]);
  if (dirty)
    throw new Error(
      'Source checkout must be clean; commit or preserve existing changes before running a repair.',
    );
  return current;
}

async function snapshot(cwd) {
  const files = (await git(cwd, ['ls-files', '-z'])).split('\0').filter(Boolean);
  const result = {};
  for (const path of files) {
    const stat = await lstat(join(cwd, path));
    if (stat.isSymbolicLink()) {
      // Hash the link itself without following it into another location.
      result[path] = `link:${digest(await readlink(join(cwd, path)))}`;
    } else result[path] = `${stat.mode & 0o777}:${digest(await readFile(join(cwd, path)))}`;
  }
  return result;
}

function unchangedExcept(before, after, allowed) {
  for (const path of new Set([...Object.keys(before), ...Object.keys(after)]))
    if (before[path] !== after[path] && !allowed.includes(path))
      throw new Error(`Protected source changed: ${path}`);
}

async function checkUntracked(cwd) {
  const extra = await git(cwd, ['ls-files', '--others', '--exclude-standard']);
  if (extra) throw new Error(`Unexpected candidate files: ${extra.slice(0, 500)}`);
}

export const sourceRegressionCommands = [
  { id: 'types', command: 'npm', args: ['run', 'typecheck'], timeoutMs: 120_000 },
  { id: 'tokens', command: 'npm', args: ['run', 'tokens:check'], timeoutMs: 120_000 },
  { id: 'headless', command: 'npm', args: ['run', 'headless:check'], timeoutMs: 60_000 },
  { id: 'unit', command: 'npm', args: ['test', '--', '--reporter=dot'], timeoutMs: 300_000 },
];

export async function runRepair({
  repository,
  audit,
  provider,
  regressionCommands = sourceRegressionCommands,
  evidenceOrigin = 'observed-checkout',
}) {
  repository = await realpath(repository);
  if ((await realpath(await git(repository, ['rev-parse', '--show-toplevel']))) !== repository)
    throw new Error('Repository must be the checkout root.');
  if (
    !audit ||
    !/^[a-z][a-z0-9-]+$/.test(audit.id) ||
    !audit.policyVersion ||
    !Array.isArray(audit.allowedPaths)
  )
    throw new Error('Trusted audit policy is required.');
  if (!Number.isInteger(audit.maxAttempts) || audit.maxAttempts < 1 || audit.maxAttempts > 2)
    throw new Error('Attempt budget must be one or two.');
  const directory = await stateRoot(repository);
  const release = await lock(directory);
  let report, runDirectory;
  try {
    const baseCommit = await cleanSource(repository);
    const policy = {
      id: audit.id,
      version: audit.policyVersion,
      allowedPaths: audit.allowedPaths,
      maxAttempts: audit.maxAttempts,
      maxFiles: audit.maxFiles,
      maxBytes: audit.maxBytes,
      regressionCommands,
    };
    const policySha256 = digest(json(policy));
    const id = digest(`${baseCommit}:${policySha256}`).slice(0, 32);
    runDirectory = join(directory, id);
    const reportPath = join(runDirectory, 'report.json');
    try {
      const existing = JSON.parse(await readFile(reportPath, 'utf8'));
      if (!terminalStates.has(existing.state)) {
        existing.state = 'needs-review';
        existing.reason =
          'Previous run was interrupted. Its attempt budget is preserved; inspect evidence before a new revision.';
        await atomicJson(reportPath, existing);
      }
      return { ...existing, reused: true, reportPath };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(runDirectory, { mode: 0o700 });
    const sourceBranch = await git(repository, ['branch', '--show-current']);
    let remote = null;
    try {
      remote = await git(repository, ['remote', 'get-url', 'origin']);
    } catch {
      /* Local-only repository. */
    }
    report = {
      schemaVersion: 1,
      id,
      state: 'scanning',
      auditId: audit.id,
      policySha256,
      policy,
      baseCommit,
      sourceBranch,
      remote,
      evidenceOrigin,
      createdAt: new Date().toISOString(),
      attempts: [],
      authority: 'isolated-proposal-only',
      repository,
      candidate: join(runDirectory, 'candidate'),
    };
    const save = async () => {
      report.updatedAt = new Date().toISOString();
      await atomicJson(reportPath, report);
    };
    await save();
    await git(repository, [
      'clone',
      '--quiet',
      '--no-hardlinks',
      '--no-checkout',
      '--',
      repository,
      report.candidate,
    ]);
    await git(report.candidate, ['checkout', '--quiet', '--detach', baseCommit]);
    await git(report.candidate, ['config', 'core.hooksPath', '/dev/null']);
    // Dependencies are trusted installed inputs. Only reads are permitted by our audit;
    // its Vite cache and reports live outside this shared directory.
    try {
      const dependencies = await realpath(join(repository, 'node_modules'));
      await symlink(dependencies, join(report.candidate, 'node_modules'), 'dir');
      await git(report.candidate, [
        'config',
        '--local',
        'core.excludesFile',
        join(runDirectory, 'excludes'),
      ]);
      await writeFile(join(runDirectory, 'excludes'), 'node_modules\n');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const baseline = await snapshot(report.candidate);
    const safeSources = () =>
      readRepairSources({
        root: report.candidate,
        allowedPaths: audit.allowedPaths,
        maxFiles: audit.maxFiles,
        maxBytes: audit.maxBytes,
      });
    const originalSources = await safeSources();
    const baselineTree = await git(report.candidate, ['rev-parse', `${baseCommit}^{tree}`]);
    const unchangedGitIdentity = async () => {
      if (
        (await git(report.candidate, ['rev-parse', 'HEAD'])) !== baseCommit ||
        (await git(report.candidate, ['write-tree'])) !== baselineTree
      )
        throw new Error('Candidate HEAD or index changed outside the source proposal.');
    };
    report.sourceTreeSha256 = digest(json(baseline));
    const baselineDirectory = join(runDirectory, 'before');
    await mkdir(baselineDirectory);
    report.before = await audit.reproduce({
      cwd: report.candidate,
      evidenceDir: baselineDirectory,
    });
    unchangedExcept(baseline, await snapshot(report.candidate), []);
    await unchangedGitIdentity();
    await checkUntracked(report.candidate);
    if (report.before.status !== 'failed') {
      report.state = report.before.status === 'passed' ? 'healthy' : 'error';
      report.reason =
        report.before.status === 'passed'
          ? 'Audit passed. No model request or source change.'
          : 'Audit could not establish a reproducible defect.';
      await save();
      return { ...report, reportPath };
    }
    if (typeof provider !== 'function') {
      report.state = 'needs-review';
      report.reason =
        'Audit reproduced a defect. Scan made no AI request; run with an explicit provider to prepare a repair.';
      await save();
      return { ...report, reportPath };
    }
    let diagnostic = report.before.diagnostic;
    for (let attempt = 1; attempt <= audit.maxAttempts; attempt++) {
      await cleanSource(repository, baseCommit);
      // Every attempt starts at the exact baseline. A failed candidate cannot accumulate edits.
      await safeSources();
      for (const file of originalSources)
        await writeFile(join(report.candidate, file.path), file.content);
      unchangedExcept(baseline, await snapshot(report.candidate), []);
      await unchangedGitIdentity();
      const attemptDirectory = join(runDirectory, `attempt-${attempt}`);
      await mkdir(attemptDirectory);
      const record = { number: attempt, state: 'requesting', startedAt: new Date().toISOString() };
      report.attempts.push(record);
      report.state = 'repairing';
      await save(); // Consume the attempt before any model request; crash/restart cannot reset it.
      try {
        const response = await provider({
          auditId: audit.id,
          baseCommit,
          attempt,
          diagnostic,
          sources: originalSources,
          instructions: audit.instructions ?? '',
          previousAttempts: report.attempts
            .slice(0, -1)
            .map(({ number, state, reason }) => ({ number, state, reason })),
        });
        unchangedExcept(baseline, await snapshot(report.candidate), []);
        await unchangedGitIdentity();
        const validated = await validateProposal({
          root: report.candidate,
          proposal: response.proposal,
          allowedPaths: audit.allowedPaths,
          maxFiles: audit.maxFiles,
          maxBytes: audit.maxBytes,
        });
        record.provider = response.provenance;
        await atomicJson(join(attemptDirectory, 'proposal.json'), response.proposal);
        const applied = await applyProposal({ root: report.candidate, validated });
        record.changes = applied;
        record.summary = validated.summary;
        record.state = 'verifying';
        await save();
        record.audit = await audit.verify({ cwd: report.candidate, evidenceDir: attemptDirectory });
        unchangedExcept(
          baseline,
          await snapshot(report.candidate),
          validated.changes.map((entry) => entry.path),
        );
        await checkUntracked(report.candidate);
        if (record.audit.status !== 'passed') {
          record.state = record.audit.status === 'failed' ? 'failed' : 'error';
          record.reason = record.audit.diagnostic;
          diagnostic = record.audit.diagnostic;
          await save();
          if (record.audit.status === 'error') break;
          continue;
        }
        record.regressions = [];
        for (const check of regressionCommands) {
          const result = await runCommand(check.command, check.args, {
            cwd: report.candidate,
            timeoutMs: check.timeoutMs,
          });
          await atomicJson(join(attemptDirectory, `${check.id}.json`), result);
          const passed = result.exitCode === 0 && !result.timedOut && !result.outputLimitExceeded;
          record.regressions.push({ id: check.id, passed, durationMs: result.durationMs });
          if (!passed)
            throw new Error(`Regression ${check.id} failed; review required (see saved log).`);
        }
        unchangedExcept(
          baseline,
          await snapshot(report.candidate),
          validated.changes.map((entry) => entry.path),
        );
        for (const file of validated.changes)
          if (digest(await readFile(join(report.candidate, file.path))) !== file.afterSha256)
            throw new Error(`Proposed source changed during verification: ${file.path}`);
        await checkUntracked(report.candidate);
        await cleanSource(repository, baseCommit);
        await unchangedGitIdentity();
        const branch = `codex/repair/${audit.id}/${id.slice(0, 12)}`;
        await git(report.candidate, ['switch', '--quiet', '-c', branch]);
        await git(report.candidate, ['add', '--', ...validated.changes.map((file) => file.path)]);
        await git(report.candidate, [
          '-c',
          'user.name=Aegis Repair Worker',
          '-c',
          'user.email=aegis-repair@localhost',
          '-c',
          'commit.gpgsign=false',
          'commit',
          '--quiet',
          '-m',
          `Fix ${audit.id} (${id.slice(0, 12)})`,
        ]);
        report.candidateCommit = await git(report.candidate, ['rev-parse', 'HEAD']);
        const committedPaths = (
          await git(report.candidate, ['diff', '--name-only', '-z', baseCommit, 'HEAD'])
        )
          .split('\0')
          .filter(Boolean)
          .sort();
        const intendedPaths = validated.changes.map((entry) => entry.path).sort();
        if (json(committedPaths) !== json(intendedPaths))
          throw new Error('Committed changes differ from the verified proposal.');
        for (const file of validated.changes) {
          const blob = await runCommand('git', ['show', `HEAD:${file.path}`], {
            cwd: report.candidate,
          });
          if (
            blob.exitCode !== 0 ||
            blob.outputLimitExceeded ||
            digest(blob.stdout) !== file.afterSha256
          )
            throw new Error(`Committed bytes differ from verified source: ${file.path}`);
        }
        report.branch = branch;
        const patch = await git(report.candidate, ['diff', '--binary', baseCommit, 'HEAD'], {
          raw: true,
        });
        report.patchSha256 = digest(patch);
        await writeFile(join(runDirectory, 'candidate.patch'), patch);
        record.state = 'passed';
        report.state = 'proposed';
        report.reason =
          'Reproduction and required regressions pass. Isolated source proposal awaits review; no consumer or release was changed.';
        report.review = { required: true, visualJudgment: true, automaticMerge: false };
        await save();
        return { ...report, reportPath };
      } catch (error) {
        record.state = 'error';
        record.reason = error.message;
        await save();
        // Invalid scope, provider failures or regression failures are not licenses to retry.
        break;
      }
    }
    report.state = 'needs-review';
    report.reason =
      'No verified proposal within the repair policy. Evidence and attempt budget are preserved.';
    await save();
    return { ...report, reportPath };
  } catch (error) {
    if (!report) throw error;
    report.state = 'error';
    report.reason = error.message;
    const reportPath = join(runDirectory, 'report.json');
    await atomicJson(reportPath, report);
    return { ...report, reportPath };
  } finally {
    await release();
  }
}

export async function readReport(repository, id) {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid repair run ID.');
  const directory = await stateRoot(repository);
  const path = join(directory, id, 'report.json');
  const resolved = await realpath(path);
  if (isAbsolute(relative(directory, resolved)) || relative(directory, resolved).startsWith('..'))
    throw new Error('Report escapes state directory.');
  return { ...JSON.parse(await readFile(resolved, 'utf8')), reportPath: resolved };
}

export { cleanSource, lock, atomicJson, digest };
