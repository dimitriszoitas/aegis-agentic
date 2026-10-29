#!/usr/bin/env node
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { getAudit, getComponentAudit } from './repair-worker/audits.mjs';
import {
  buildRepairCatalogue,
  scanAllRepairComponents,
  scanRepairComponent,
  selectRepairComponent,
} from './repair-worker/catalogue.mjs';
import { createCodexProvider } from './repair-worker/provider.mjs';
import { readReport, runRepair, stateRoot, unlockStoppedWorker } from './repair-worker/worker.mjs';
import { publishRepair } from './repair-worker/publish.mjs';

function usage() {
  console.log(`Aegis source repair worker (source checkout required)

  npm run repair -- catalogue [--component ID] [--repo PATH]
  npm run repair -- scan [--component ID] [--repo PATH]
  npm run repair -- scan --all [--repo PATH]
  npm run repair -- run --component ID --provider codex [--repo PATH]
  npm run repair -- status [--id RUN_ID] [--repo PATH]
  npm run repair -- publish --id RUN_ID [--repo PATH]
  npm run repair -- unlock [--repo PATH]

Catalogue and component source scans cover every authored UI contract. Bounded
repair policies cover MetricCard/Sparkline containment and DataGrid density.
Without --component, scan/run retain the metric-containment default. Component
scan inspects current sources and links finite scenarios; it is not browser
certification. Run may use your Codex account to generate
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
    if (key === '--all') {
      if (options[key] || command !== 'scan')
        throw new Error('--all is supported once, only for scan.');
      options[key] = true;
      continue;
    }
    if (
      !['--repo', '--id', '--provider', '--component'].includes(key) ||
      !args[0] ||
      args[0].startsWith('--') ||
      options[key]
    )
      throw new Error(`Invalid option: ${key}`);
    options[key] = args.shift();
  }
  if (options['--all'] && options['--component'])
    throw new Error('Choose either --all or --component.');
  const repository = resolve(options['--repo'] ?? process.cwd());
  if (command === 'help' || command === '--help') usage();
  else if (command === 'catalogue') {
    const catalogue = await buildRepairCatalogue(repository);
    console.log(
      JSON.stringify(
        options['--component']
          ? selectRepairComponent(catalogue, options['--component'])
          : catalogue,
        null,
        2,
      ),
    );
  } else if (command === 'scan' && (options['--component'] || options['--all'])) {
    const report = options['--all']
      ? await scanAllRepairComponents({ repository })
      : await scanRepairComponent({ repository, componentId: options['--component'] });
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'needs-review') process.exitCode = 1;
  } else if (command === 'status') {
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
    const audit = options['--component']
      ? getComponentAudit(options['--component'])
      : getAudit('metric-containment');
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
