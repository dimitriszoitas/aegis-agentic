import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildRequirementInventory, caseCatalog } from './catalogue.mjs';
import { readContracts, sourceSnapshot, verifiedRecords } from './evidence.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
/** Deterministic baseline inventory. Browser results stay in separately provenance-bound reports. */
export async function buildAcceptanceInventory(root = repository, report) {
  const [source, contracts] = await Promise.all([sourceSnapshot(root), readContracts(root)]);
  const records = report ? verifiedRecords(report, source.digest) : [];
  const requirements = buildRequirementInventory(contracts, records);
  return {
    schemaVersion: 1,
    sourceDigest: source.digest,
    scope: 'authored-requirements-and-finite-executable-scenarios',
    evidenceAccepted: Boolean(report && records.length),
    cases: caseCatalog,
    requirements,
    summary: Object.fromEntries(
      ['passed', 'failed', 'not-run', 'unsupported'].map((status) => [
        status,
        requirements.filter((requirement) => requirement.status === status).length,
      ]),
    ),
    limitations: [
      'Written requirements and registered scenarios are not executed evidence.',
      'Passed status refers only to the finite linked scenarios; every mapping retains partial-scenario coverage.',
      'Reports with stale sources, changed inputs during execution, invalid hashes or unknown execution contexts are not accepted.',
    ],
  };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const evidenceIndex = process.argv.indexOf('--evidence');
  const report =
    evidenceIndex < 0
      ? undefined
      : JSON.parse(await readFile(process.argv[evidenceIndex + 1], 'utf8'));
  const document = await buildAcceptanceInventory(repository, report);
  const path = resolve(repository, 'public/ai/acceptance-inventory.json');
  const text = JSON.stringify(document, null, 2) + '\n';
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(path, 'utf8'),
      text,
      'Acceptance inventory is stale; run node scripts/acceptance/inventory.mjs.',
    );
  else await writeFile(path, text);
  console.log(JSON.stringify(document.summary));
}
