import { readFile, writeFile } from 'node:fs/promises';
import { validateProposal, registry } from '../../../agent-kit/runtime/core.mjs';
const proposal = JSON.parse(await readFile(new URL('./proposal.json', import.meta.url), 'utf8'));
const validation = validateProposal(proposal, registry);
const stale = validateProposal({ ...proposal, baseRegistryRevision: 0 }, registry);
const missingValidation = validateProposal({ ...proposal, capabilities: ['multi-value-entry', 'free-text-entry'] }, registry);
const output = {
  module: 'agent-kit/runtime/core.mjs',
  registryRevision: registry.revision,
  proposal: proposal.id,
  validation,
  rejectionChecks: {
    staleRevisionRejected: !stale.valid && stale.issues.some(issue => issue.code === 'stale-revision'),
    missingValidationCapabilityRejected: !missingValidation.valid && missingValidation.issues.some(issue => issue.code === 'capability'),
  },
};
await writeFile(new URL('./proposal-validation.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
if (!validation.valid || Object.values(output.rejectionChecks).some(value => !value)) process.exitCode = 1;
