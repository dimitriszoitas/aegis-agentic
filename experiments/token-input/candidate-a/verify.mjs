import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('.', import.meta.url));
const kit = '/private/tmp/aegis-agentic-experiment/agent-kit';
const load = async path => JSON.parse(await readFile(path, 'utf8'));
const manifest = await load(`${kit}/kit.json`);
const commands = [
  { args: ['--version'], output: 'node-version.txt' },
  { args: ['--test', '--test-reporter=tap', 'model.test.mjs'], output: 'model-tests.tap' },
  { args: ['validate-proposal.mjs'], output: 'proposal-validation.json' },
  { args: [`${kit}/bin/aegis.mjs`, 'profile', 'validate', `${kit}/profiles/aegis.json`], output: 'profile-validation.json' },
  { args: [`${kit}/bin/aegis.mjs`, 'registry', 'search', 'token'], output: 'registry-search.json' }
];
const records = [];
for (const command of commands) {
  const result = spawnSync(process.execPath, command.args, { cwd, encoding: 'utf8' });
  await writeFile(new URL(command.output, import.meta.url), result.stdout || '');
  records.push({ command: [process.execPath, ...command.args], cwd, exitCode: result.status, signal: result.signal, stdoutFile: command.output, stderr: result.stderr || '', spawnError: result.error?.message ?? null });
}
const tap = await readFile(new URL('model-tests.tap', import.meta.url), 'utf8');
const count = key => {
  const match = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
  if (!match) throw new Error(`Missing TAP summary count: ${key}`);
  return Number(match[1]);
};
const validation = await load(new URL('proposal-validation.json', import.meta.url));
const hashes = {};
for (const path of ['kit.json', 'runtime/core.mjs', 'schemas/proposal.schema.json', 'registry/canonical.json', 'profiles/aegis.json']) hashes[path] = createHash('sha256').update(await readFile(`${kit}/${path}`)).digest('hex');
const outputs = {};
for (const path of ['proposal.json', 'acceptance.md', 'model.mjs', 'model.test.mjs', 'validate-proposal.mjs', 'verify.mjs']) outputs[path] = createHash('sha256').update(await readFile(new URL(path, import.meta.url))).digest('hex');
const evidence = {
  schemaVersion: 1,
  candidateId: 'candidate-a-token-input',
  evidence: 'independent-agent-proposal',
  author: 'Independent agent A',
  status: 'experimental-candidate-not-approved',
  recordedAt: new Date().toISOString(),
  isolation: { inputRoot: kit, outputRoot: cwd, originalRepositoryInspected: false, otherCandidatesInspected: false, sharedRegistryMutated: false },
  kit: { name: manifest.name, version: manifest.version, baseline: manifest.baseline, registryRevision: manifest.registryRevision, compilerVersion: manifest.compilerVersion },
  profile: { ...validation.profile, manifestHash: manifest.profiles.find(profile => profile.id === 'aegis').hash },
  inputSha256: hashes,
  outputSha256: outputs,
  commands: records,
  automated: { tests: count('tests'), passed: count('pass'), failed: count('fail'), skipped: count('skipped'), proposalValid: validation.valid, proposalIssues: validation.issues, invalidProposalControlsRejected: validation.negativeChecks.every(check => check.rejected) },
  executionNotes: ['Initial node --test run exited 0 with 40 passing tests, 0 failing; its default spec reporter was not recognized by the first summary parser. Raw output is retained in initial-model-tests.txt. The recorder was corrected to explicitly request TAP and fail on missing counts; model code and acceptance tests were unchanged.'],
  manualReview: { behaviorAndDocumentationSelfReviewed: true, independentHumanReview: false },
  visualVerification: { performed: false, reason: 'Pure JavaScript behavior model; no rendered component or browser was created.' },
  unverified: ['Production React adapter', 'DOM and screen-reader accessibility', 'Real clipboard and IME events', 'Native focus and keyboard integration', 'Responsive layout and long-label rendering', 'Light/dark and fundamental/floating visual states', 'Density and profile-switch preservation', 'Owner acceptance'],
  scope: 'Candidate evidence only. Runtime validation checks proposal shape and registry compatibility, not implementation correctness or accessibility certification.'
};
await writeFile(new URL('evidence.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ tests: evidence.automated, commands: records.map(record => ({ command: record.command, exitCode: record.exitCode })), visualVerification: false }, null, 2));
if (records.some(record => record.exitCode !== 0) || evidence.automated.failed || !evidence.automated.proposalValid) process.exitCode = 1;
