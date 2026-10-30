import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { auditComponentUsage } from './component-usage.mjs';
import { discoverUI } from './ui-discovery.mjs';
import { migrationStatus } from './migration-status.mjs';

function fixture() {
  return {
    discovery: { sourceHash: 'source-1', summary: {}, scope: { skipped: [] }, entries: [{ file: 'feature/Inline.tsx' }], findings: [{ id: 'inline-1', kind: 'inline-ui' }], repetitions: [] },
    usage: { sourceHash: 'different-script-fingerprint', discoverySourceHash: 'source-1', summary: {}, unresolvedAppEdges: [] },
    progress: { discoveryHash: 'source-1', stages: ['map','inventory','inline-review','plan','migrate','catalog','verify'].map((id) => ({ id, status: 'in-progress', evidence: [], remaining: [] })), batches: [] },
  };
}

test('partial progress stays open without inventing a completion percentage', () => {
  const report = migrationStatus(fixture());
  assert.equal(report.complete, false);
  assert.equal(report.summary.unreviewedFiles, 1);
  assert.equal(report.summary.unreviewedFindings, 1);
  assert.deepEqual(report.issues, []);
});

test('build evidence cannot close unclassified UI or undecided inline findings', () => {
  const input = fixture();
  input.progress.stages.forEach((stage) => { stage.status = 'complete'; stage.evidence = ['build passed']; });
  const report = migrationStatus(input);
  assert.equal(report.complete, false);
  assert.ok(report.issues.some((issue) => issue.includes('no evidenced disposition')));
  assert.ok(report.issues.some((issue) => issue.includes('no evidenced decision')));
});

test('newly discovered UI reopens claimed completion and stale source snapshots are rejected', () => {
  const input = fixture();
  input.progress.stages.forEach((stage) => { stage.status = 'complete'; stage.evidence = ['review-record.md']; });
  input.progress.review = { files: [{ file: 'feature/Inline.tsx', decision: 'owned host', evidence: ['review.md'] }], findings: [{ id: 'inline-1', decision: 'extract pattern', evidence: ['consumer-diff.md'] }] };
  assert.equal(migrationStatus(input).complete, true);
  input.discovery.sourceHash = 'source-2';
  input.discovery.entries.push({ file: 'new-folder/PreviouslyMissed.tsx' });
  const report = migrationStatus(input);
  assert.equal(report.complete, false);
  assert.equal(report.summary.unreviewedFiles, 1);
  assert.ok(report.issues.some((issue) => issue.includes('different source snapshot')));
});

test('remaining work, duplicate stages and unresolved loading cannot be labelled verified', () => {
  const input = fixture();
  input.progress.stages[6] = { id: 'verify', status: 'complete', evidence: ['test.log'], remaining: ['browser workflow'] };
  input.usage.unresolvedAppEdges = [{ expression: 'import(variable)' }];
  const report = migrationStatus(input);
  assert.ok(report.issues.some((issue) => issue.includes('remaining work')));
  assert.ok(report.issues.some((issue) => issue.includes('unresolved application')));
  input.progress.stages[5].id = 'verify';
  assert.ok(migrationStatus(input).issues.some((issue) => issue.includes('exactly once')));
});

function completeFixture() {
  const input = fixture();
  input.progress.stages.forEach((stage) => { stage.status = 'complete'; stage.evidence = ['review-record.md']; });
  input.progress.review = { files: [{ file: 'feature/Inline.tsx', decision: 'owned host', evidence: ['review.md'] }], findings: [{ id: 'inline-1', decision: 'retain composition', evidence: ['review.md'] }] };
  return input;
}

test('verification cannot close with a stale usage snapshot even after discovery is reconciled', () => {
  const input = completeFixture();
  input.usage.discoverySourceHash = 'previous-source';
  const report = migrationStatus(input);
  assert.equal(report.complete, false);
  assert.equal(report.snapshotCurrent, false);
  assert.equal(report.discoverySnapshotCurrent, true);
  assert.equal(report.usageSnapshotCurrent, false);
  assert.ok(report.issues.some((issue) => issue.includes('usage report linked')));
});

test('missing usage and reports generated before snapshot linkage require regeneration', () => {
  for (const usage of [undefined, { summary: {}, unresolvedAppEdges: [] }, { sourceHash: 'source-1', summary: {}, unresolvedAppEdges: [] }]) {
    const input = completeFixture();
    input.usage = usage;
    const report = migrationStatus(input);
    assert.equal(report.complete, false);
    assert.equal(report.usageSnapshotCurrent, false);
    assert.ok(report.issues.some((issue) => issue.includes('usage report linked')));
  }
});

test('in-progress verification can retain visibly stale usage without an erroneous completion error', () => {
  const input = fixture();
  delete input.usage.discoverySourceHash;
  const report = migrationStatus(input);
  assert.equal(report.complete, false);
  assert.equal(report.usageSnapshotCurrent, false);
  assert.deepEqual(report.issues, []);
});

test('actual usage links its discovery snapshot without equating the different input fingerprints', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-snapshot-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src'));
  const anchor = process.env.COMPONENT_USAGE_TYPESCRIPT_PACKAGE ?? import.meta.url;
  fs.symlinkSync(path.dirname(createRequire(anchor).resolve('typescript/package.json')), path.join(root, 'node_modules/typescript'), 'dir');
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(root, 'src/main.ts'), 'export const app = null;');
  fs.writeFileSync(path.join(root, 'src/theme.css'), ':root { --example: #fff; }');
  const usage = auditComponentUsage({ root, entries: ['src/main.ts'] });
  const discovery = discoverUI({ root });
  assert.equal(usage.discoverySourceHash, discovery.sourceHash);
  assert.notEqual(usage.sourceHash, discovery.sourceHash, 'Usage hashes scripts, while discovery also includes styles.');
  fs.writeFileSync(path.join(root, 'src/theme.css'), ':root { --example: #000; }');
  const changedDiscovery = discoverUI({ root });
  const progress = fixture().progress;
  progress.discoveryHash = changedDiscovery.sourceHash;
  progress.stages.find((stage) => stage.id === 'verify').status = 'complete';
  progress.stages.find((stage) => stage.id === 'verify').evidence = ['review.md'];
  const report = migrationStatus({ discovery: changedDiscovery, usage, progress });
  assert.equal(report.discoverySnapshotCurrent, true);
  assert.equal(report.usageSnapshotCurrent, false);
  assert.ok(report.issues.some((issue) => issue.includes('usage report linked')));
});
