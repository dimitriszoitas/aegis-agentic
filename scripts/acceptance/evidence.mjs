import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildRequirementInventory, caseCatalog, plannedExecutions } from './catalogue.mjs';

export const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const inputRoots = [
  'src',
  'contracts',
  'schemas',
  'skills',
  'registry',
  'tokens',
  '.storybook',
  'scripts/acceptance',
  'docs/ACCEPTANCE.md',
  'package.json',
  'pnpm-lock.yaml',
];

/** Fingerprint source and oracle inputs, including new, uncommitted files. No secrets or values are stored. */
export async function sourceSnapshot(repository) {
  const files = [
    ...new Set(
      execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...inputRoots],
        { cwd: repository, encoding: 'utf8' },
      )
        .split('\0')
        .filter(Boolean),
    ),
  ].sort();
  const sources = await Promise.all(
    files.map(async (path) => ({
      path,
      sha256: sha256(await readFile(resolve(repository, path))),
    })),
  );
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repository,
      encoding: 'utf8',
    }).trim(),
    dirty: Boolean(
      execFileSync('git', ['status', '--porcelain', '--', ...inputRoots], {
        cwd: repository,
        encoding: 'utf8',
      }).trim(),
    ),
    digest: sha256(JSON.stringify(sources)),
    sources,
    binding: 'local-source-snapshot; supplied-server-build-is-not-attested',
  };
}

export async function readContracts(repository) {
  const directory = resolve(repository, 'contracts/agentic');
  const contracts = await Promise.all(
    (await readdir(directory))
      .filter((path) => path.endsWith('.json'))
      .sort()
      .map(async (path) => JSON.parse(await readFile(resolve(directory, path), 'utf8'))),
  );
  contracts.push(
    JSON.parse(
      await readFile(resolve(repository, 'contracts/composition/project-recipes.json'), 'utf8'),
    ),
  );
  return contracts;
}

export async function createEvidenceReport(repository) {
  const [source, contracts] = await Promise.all([
    sourceSnapshot(repository),
    readContracts(repository),
  ]);
  for (const scenario of caseCatalog)
    for (const ref of scenario.requirementRefs) {
      const [contractId, requirementId] = ref.split('#');
      if (
        !contracts.some(
          (contract) =>
            contract.id === contractId &&
            contract.requirements.some((requirement) => requirement.id === requirementId),
        )
      )
        throw new Error(`Unknown acceptance requirement ${ref}`);
    }
  return {
    schemaVersion: 1,
    kind: 'finite-browser-acceptance',
    createdAt: new Date().toISOString(),
    source,
    cases: caseCatalog,
    records: plannedExecutions().map((plan) => ({
      ...plan,
      sourceDigest: source.digest,
      status: 'not-run',
      reason: 'Scenario has not executed in this report.',
      observations: {},
    })),
    requirements: [],
    limitations: [
      'Chromium and finite local fixture workflows only. A linked passing scenario is not certification of an entire component or authored requirement.',
      'Source and oracle hashes describe the local checkout. An externally supplied server may run a different build; server/source identity is not cryptographically attested.',
      'Unmapped requirements are explicitly unsupported by this runner, not silently passed. Missing servers and unselected scenarios are not-run.',
      'Reports may inform a bounded repair proposal; they never authorize mutation, publication or weakening an oracle.',
    ],
  };
}

export async function saveEvidenceReport(report, repository, output) {
  report.requirements = buildRequirementInventory(await readContracts(repository), report.records);
  report.summary = Object.fromEntries(
    ['passed', 'failed', 'not-run', 'unsupported'].map((status) => [
      status,
      report.records.filter((record) => record.status === status).length,
    ]),
  );
  const withoutDigest = { ...report };
  delete withoutDigest.reportDigest;
  report.reportDigest = sha256(JSON.stringify(withoutDigest));
  await mkdir(resolve(output, '..'), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  return report;
}

/** Ignore stale/tampered reports when joining them to a current inventory. Hashes are integrity, not authorship. */
export function verifiedRecords(report, currentSourceDigest) {
  const copy = { ...report };
  delete copy.reportDigest;
  if (
    report.schemaVersion !== 1 ||
    report.kind !== 'finite-browser-acceptance' ||
    report.sourceStableDuringRun !== true ||
    report.source?.digest !== currentSourceDigest ||
    sha256(JSON.stringify(copy)) !== report.reportDigest
  )
    return [];
  const known = new Map(plannedExecutions().map((plan) => [plan.id, plan]));
  return (report.records ?? []).filter((record) => {
    const plan = known.get(record.id);
    return (
      plan &&
      record.sourceDigest === currentSourceDigest &&
      plan.caseId === record.caseId &&
      plan.context.id === record.context?.id &&
      plan.width === record.width &&
      plan.theme === record.theme &&
      plan.presentation === record.presentation &&
      ['passed', 'failed', 'not-run', 'unsupported'].includes(record.status)
    );
  });
}
