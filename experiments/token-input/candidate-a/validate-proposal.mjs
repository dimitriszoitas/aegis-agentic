import { readFile } from 'node:fs/promises';
import { validateProposal, compileProfile } from '/private/tmp/aegis-agentic-experiment/agent-kit/runtime/core.mjs';
const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const proposal = await read('./proposal.json');
const registry = await read('/private/tmp/aegis-agentic-experiment/agent-kit/registry/canonical.json');
const profile = await read('/private/tmp/aegis-agentic-experiment/agent-kit/profiles/aegis.json');
const validation = validateProposal(proposal, registry);
const compiled = compileProfile(profile);
const negativeChecks = [
  ['stale revision', { ...proposal, baseRegistryRevision: 999 }],
  ['unknown behavior', { ...proposal, behavior: { ...proposal.behavior, silentlyDiscardDraft: true } }],
  ['wrong ownership', { ...proposal, tokenGroup: 'button' }]
].map(([name, input]) => ({ name, rejected: !validateProposal(input, registry).valid }));
console.log(JSON.stringify({ validator: 'portable runtime validateProposal', proposalId: proposal.id, registryRevision: registry.revision, ...validation, profile: { id: profile.id, version: profile.version, compiledHash: compiled.hash }, negativeChecks }, null, 2));
if (!validation.valid || negativeChecks.some(check => !check.rejected)) process.exitCode = 1;
