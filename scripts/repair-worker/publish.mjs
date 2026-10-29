import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { commandEnvironment, git, runCommand } from './process.mjs';
import { atomicJson, cleanSource, digest, lock, readReport, stateRoot } from './worker.mjs';

export function githubRepository(remote) {
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/.exec(
      remote ?? '',
    );
  if (!match) throw new Error('Draft publishing requires an origin on github.com (HTTPS or SSH).');
  return match[1];
}

// Publishing is a separate, explicit operator action. This function cannot merge,
// approve, publish a package, or update consumer pins.
export async function publishRepair({ repository, id, execute = runCommand }) {
  const release = await lock(await stateRoot(repository));
  try {
    const report = await readReport(repository, id);
    if (report.state !== 'proposed' || report.evidenceOrigin !== 'observed-checkout')
      throw new Error(
        'Only verified, observed source proposals may be published. Demonstration fixtures cannot publish.',
      );
    const repo = githubRepository(report.remote);
    if (!report.sourceBranch || !report.branch?.startsWith('codex/repair/'))
      throw new Error('Named base and repair branches are required.');
    await cleanSource(repository, report.baseCommit);
    await cleanSource(report.candidate, report.candidateCommit);
    const currentRemote = await git(repository, ['remote', 'get-url', 'origin']);
    if (currentRemote !== report.remote) throw new Error('Origin changed since verification.');
    const patch = await git(report.candidate, ['diff', '--binary', report.baseCommit, 'HEAD'], {
      raw: true,
    });
    if (digest(patch) !== report.patchSha256)
      throw new Error('Candidate patch no longer matches verified evidence.');
    const savedPatch = await readFile(
      join(await stateRoot(repository), id, 'candidate.patch'),
      'utf8',
    );
    if (savedPatch !== patch) throw new Error('Saved patch no longer matches verified evidence.');
    const env = commandEnvironment();
    for (const key of ['GH_TOKEN', 'GITHUB_TOKEN'])
      if (process.env[key]) env[key] = process.env[key];
    const run = async (command, args) => {
      const result = await execute(command, args, {
        cwd: report.candidate,
        env,
        timeoutMs: 120_000,
      });
      if (result.exitCode !== 0 || result.timedOut || result.outputLimitExceeded)
        throw new Error(
          `${command} publication failed. Check authentication/network and retry the same run; its branch identity is stable.`,
        );
      return result.stdout.trim();
    };
    // The same head/base is reused after an uncertain network response.
    const lookup = async () =>
      JSON.parse(
        await run('gh', [
          'pr',
          'list',
          '--repo',
          repo,
          '--head',
          report.branch,
          '--base',
          report.sourceBranch,
          '--state',
          'all',
          '--json',
          'url,state,isDraft,headRefOid',
        ]),
      );
    const previous = await lookup();
    if (previous.length) {
      if (previous.length !== 1 || previous[0].state !== 'OPEN' || !previous[0].isDraft)
        throw new Error(
          'Existing repair PR has moved beyond draft review. Inspect it instead of publishing again.',
        );
      if (previous[0].headRefOid !== report.candidateCommit)
        throw new Error('Existing repair PR no longer points to the verified candidate.');
      report.pullRequest = previous[0].url;
      await atomicJson(report.reportPath, report);
      return report;
    }
    await run('git', [
      '-c',
      'core.hooksPath=/dev/null',
      'push',
      '--',
      report.remote,
      `HEAD:refs/heads/${report.branch}`,
    ]);
    const last = report.attempts.at(-1);
    const body = [
      `The ${report.auditId} browser audit reproduced a defect at ${report.baseCommit}.`,
      last.summary,
      `Validation: the same browser oracle passed, followed by ${last.regressions.map((entry) => entry.id).join(', ')}.`,
      `Run: ${report.id}\nPolicy: ${report.policySha256}\nVerified candidate: ${report.candidateCommit}\nPatch: ${report.patchSha256}`,
      'This is an isolated repair proposal. Visual and semantic review is still required. Tests, contracts, tokens, dependencies and consumer versions were protected. No automatic merge or release is enabled.',
      'Detailed browser evidence is retained in the operator’s local .aegis-repair run directory; this PR does not upload local screenshots or logs.',
    ].join('\n\n');
    const bodyPath = join(await stateRoot(repository), id, 'pull-request.md');
    await writeFile(bodyPath, `${body}\n`);
    const url = await run('gh', [
      'pr',
      'create',
      '--repo',
      repo,
      '--draft',
      '--base',
      report.sourceBranch,
      '--head',
      report.branch,
      '--title',
      `Repair ${report.auditId}`,
      '--body-file',
      bodyPath,
    ]);
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+$/.test(url))
      throw new Error(
        'Publication response was uncertain. Retry this run to recover its existing PR.',
      );
    report.pullRequest = url;
    await atomicJson(report.reportPath, report);
    return report;
  } finally {
    await release();
  }
}
