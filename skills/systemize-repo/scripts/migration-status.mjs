#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const stageIds = ['map', 'inventory', 'inline-review', 'plan', 'migrate', 'catalog', 'verify'];
const statuses = new Set(['not-started', 'in-progress', 'blocked', 'complete']);

export function migrationStatus({ discovery, usage, progress }) {
  const issues = [];
  const stages = progress.stages ?? [];
  if (stages.length !== stageIds.length || new Set(stages.map((stage) => stage.id)).size !== stageIds.length || stageIds.some((id) => !stages.some((stage) => stage.id === id))) issues.push('The progress record must contain each of the seven stages exactly once.');
  for (const stage of stages) {
    if (!statuses.has(stage.status)) issues.push(`Unknown status for ${stage.id}.`);
    if (stage.status === 'complete' && (!stage.evidence?.length || stage.remaining?.length)) issues.push(`${stage.id} cannot be complete without evidence or while remaining work is recorded.`);
  }
  const classified = new Set((progress.review?.files ?? []).filter((row) => row.decision && row.evidence?.length).map((row) => row.file));
  const decided = new Set((progress.review?.findings ?? []).filter((row) => row.decision && row.evidence?.length).map((row) => row.id));
  const fileNames = new Set(discovery.entries.map((row) => row.file));
  const findingIds = new Set(discovery.findings.map((row) => row.id));
  const openFiles = [...fileNames].filter((file) => !classified.has(file));
  const openFindings = [...findingIds].filter((id) => !decided.has(id));
  const staleDecisions = [...classified].filter((file) => !fileNames.has(file)).length + [...decided].filter((id) => !findingIds.has(id)).length;
  const isComplete = (id) => stages.find((stage) => stage.id === id)?.status === 'complete';
  if (isComplete('inventory') && openFiles.length) issues.push(`Inventory is marked complete but ${openFiles.length} discovered UI sources have no evidenced disposition.`);
  if (isComplete('inline-review') && openFindings.length) issues.push(`Inline review is marked complete but ${openFindings.length} discovery candidates have no evidenced decision.`);
  const discoverySnapshotCurrent = progress.discoveryHash === discovery.sourceHash;
  // Usage hashes only script inputs; discovery also hashes styles/templates.
  // Compare the explicit snapshot captured by the usage analyzer, not those different hashes.
  const usageSnapshotCurrent = typeof usage?.discoverySourceHash === 'string' && usage.discoverySourceHash === discovery.sourceHash;
  const snapshotCurrent = discoverySnapshotCurrent && usageSnapshotCurrent;
  if (!discoverySnapshotCurrent && ['map', 'inventory', 'inline-review', 'verify'].some(isComplete)) issues.push('Completed discovery/review stages refer to a different source snapshot. Reconcile the changed scope.');
  if (isComplete('verify') && !usageSnapshotCurrent) issues.push('Verification requires a usage report linked to the current discovery snapshot. Regenerate application usage after source changes or when the snapshot link is missing.');
  if (isComplete('verify') && usage?.unresolvedAppEdges?.length) issues.push('Verification is marked complete with unresolved application loading edges.');
  const batches = progress.batches ?? [];
  const complete = stages.length === 7 && stages.every((stage) => stage.status === 'complete') && !issues.length && !openFiles.length && !openFindings.length && !batches.some((batch) => batch.status !== 'complete');
  const byKind = discovery.findings.reduce((counts, row) => { counts[row.kind] = (counts[row.kind] ?? 0) + 1; return counts; }, {});
  const areas = new Map();
  for (const row of discovery.entries) {
    const area = row.file.split('/').slice(0, 3).join('/');
    areas.set(area, (areas.get(area) ?? 0) + 1);
  }
  return {
    schemaVersion: 1, complete, issues, snapshotCurrent, discoverySnapshotCurrent, usageSnapshotCurrent,
    scope: progress.scope, currentBatch: progress.currentBatch, stages, batches,
    summary: { ...discovery.summary, classifiedFiles: fileNames.size - openFiles.length, unreviewedFiles: openFiles.length, decidedFindings: findingIds.size - openFindings.length, unreviewedFindings: openFindings.length, staleDecisions },
    usageSummary: usage?.summary ?? {}, candidateKinds: byKind,
    areas: [...areas].map(([area, files]) => ({ area, files })).sort((a, b) => a.area.localeCompare(b.area)),
    skipped: discovery.scope.skipped,
    repetitions: discovery.repetitions,
    nextAction: progress.nextAction,
    limitation: 'This is an evidence ledger consistency check. It does not itself prove design quality, behavior or coverage. Source, family, consumer and rendered evidence remain distinct.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const get = (name) => process.argv.slice(2).find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const root = path.resolve(get('root') ?? process.cwd());
  const read = (name) => JSON.parse(fs.readFileSync(path.resolve(root, name), 'utf8'));
  const report = migrationStatus({ discovery: read(get('discovery') ?? 'docs/systemization/ui-discovery.json'), usage: read(get('usage') ?? 'docs/systemization/component-usage.json'), progress: read(get('progress') ?? 'docs/systemization/progress.json') });
  const out = path.resolve(root, get('out') ?? 'docs/systemization/migration-status.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ output: out, complete: report.complete, issues: report.issues, snapshotCurrent: report.snapshotCurrent, discoverySnapshotCurrent: report.discoverySnapshotCurrent, usageSnapshotCurrent: report.usageSnapshotCurrent, summary: report.summary }));
  if (report.issues.length) process.exitCode = 1;
}
