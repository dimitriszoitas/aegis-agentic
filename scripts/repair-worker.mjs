#!/usr/bin/env node
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { getAudit } from './repair-worker/audits.mjs';
import { createCodexProvider } from './repair-worker/provider.mjs';
import { readReport, runRepair, stateRoot, unlockStoppedWorker } from './repair-worker/worker.mjs';
import { publishRepair } from './repair-worker/publish.mjs';

function usage() {
  console.log(`Aegis source repair worker (source checkout required)

  npm run repair -- scan [--repo PATH]
  npm run repair -- run --provider codex [--repo PATH]
  npm run repair -- status [--id RUN_ID] [--repo PATH]
  npm run repair -- publish --id RUN_ID [--repo PATH]
  npm run repair -- unlock [--repo PATH]

The initial policy covers MetricCard/Sparkline CSS containment. Scan runs the
browser oracle without an AI request. Run may use your Codex account to generate
up to two proposals and verifies each in an isolated clone. Publish is an
explicit draft-PR action. No merge, release, or consumer update is automatic.
`);
}

const args = process.argv.slice(2);
const command = args.shift() ?? 'help';
try {
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (
      !['--repo', '--id', '--provider'].includes(key) ||
      !args[0] ||
      args[0].startsWith('--') ||
      options[key]
    )
      throw new Error(`Invalid option: ${key}`);
    options[key] = args.shift();
  }
  const repository = resolve(options['--repo'] ?? process.cwd());
  if (command === 'help' || command === '--help') usage();
  else if (command === 'status') {
    const ids = options['--id']
      ? [options['--id']]
      : (await readdir(await stateRoot(repository))).filter((name) => /^[a-f0-9]{32}$/.test(name));
    for (const id of ids) {
      const report = await readReport(repository, id);
      console.log(
        JSON.stringify(
          {
            id,
            state: report.state,
            reason: report.reason,
            attempts: report.attempts.length,
            reportPath: report.reportPath,
            pullRequest: report.pullRequest,
          },
          null,
          2,
        ),
      );
    }
    if (!ids.length) console.log('No source repair runs recorded.');
  } else if (command === 'unlock')
    console.log(JSON.stringify(await unlockStoppedWorker(repository), null, 2));
  else if (command === 'publish')
    console.log(JSON.stringify(await publishRepair({ repository, id: options['--id'] }), null, 2));
  else if (command === 'run' || command === 'scan') {
    if (command === 'run' && options['--provider'] !== 'codex')
      throw new Error('Run requires --provider codex to explicitly enable an AI proposal request.');
    const audit = getAudit('metric-containment');
    // Scan uses a separate policy identity and never consumes an AI repair budget.
    const policy =
      command === 'scan'
        ? { ...audit, policyVersion: `${audit.policyVersion}-scan`, maxAttempts: 1 }
        : audit;
    const provider = command === 'run' ? createCodexProvider() : undefined;
    const report = await runRepair({ repository, audit: policy, provider });
    console.log(
      JSON.stringify(
        {
          id: report.id,
          state: report.state,
          reason: report.reason,
          attempts: report.attempts.length,
          reportPath: report.reportPath,
          candidate: report.state === 'proposed' ? report.candidate : undefined,
          reused: report.reused ?? false,
        },
        null,
        2,
      ),
    );
    if (!['healthy', 'proposed'].includes(report.state)) process.exitCode = 1;
  } else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
