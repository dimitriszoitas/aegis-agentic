/** Fail closed when a catalogue family or public UI entry lacks authored ownership. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hash = (text) => createHash('sha256').update(text).digest('hex');
export function evaluateCoverage({ manifest, catalogue, bindings, policy }) {
  const errors = [],
    entries = [];
  for (const family of catalogue.entries.filter((entry) => entry.apiFamilyId)) {
    if (!family.contract || !family.coverage.behaviorAuthored)
      errors.push(`API family lacks authored behavior: ${family.apiFamilyId}`);
  }
  for (const entry of catalogue.entries.filter((item) => item.coverage.behaviorAuthored)) {
    if (entry.contract?.document?.schemaVersion !== 2)
      errors.push(
        `Authored behavior requires schema2 ownership and source requirements: ${entry.id ?? entry.apiFamilyId}`,
      );
  }
  for (const [entry, definition] of Object.entries(manifest.exports)) {
    if (typeof definition === 'string') {
      if (/\.(?:css|json|svg|png|jpe?g|webp|woff2?|ttf|otf)$/.test(definition))
        entries.push({
          entry,
          classification: 'asset-or-manifest',
          contractIds: [],
          reason:
            'Published non-code asset or machine-readable manifest; not a UI behavior family.',
        });
      else if (policy.supportEntries[entry])
        entries.push({
          entry,
          classification: 'support-api',
          contractIds: [],
          reason: policy.supportEntries[entry],
        });
      else
        errors.push(
          `Code export requires typed UI ownership or explicit support classification: ${entry}`,
        );
      continue;
    }
    const match = definition.types?.match(
      /^\.\/lib-dist\/types\/(components|patterns)\/([^/]+)\/index\.d\.ts$/,
    );
    if (match) {
      const implementationDirectory = `src/${match[1]}/${match[2]}/`;
      const direct = bindings.bindings.filter((binding) =>
        binding.implementation.startsWith(implementationDirectory),
      );
      const alias = policy.aliases[entry];
      if (direct.length)
        entries.push({
          entry,
          classification: 'authored-ui-family',
          implementationDirectory,
          contractIds: direct.map((item) => item.contractId).sort(),
        });
      else if (
        alias &&
        alias.source.startsWith(implementationDirectory) &&
        bindings.bindings.some((binding) => binding.contractId === alias.contractId)
      )
        entries.push({
          entry,
          classification: 'explicit-compatibility-adapter',
          implementationDirectory,
          contractIds: [alias.contractId],
          source: alias.source,
          reason: alias.reason,
        });
      else errors.push(`Public UI entry lacks authored ownership: ${entry}`);
    } else if (policy.supportEntries[entry])
      entries.push({
        entry,
        classification: 'support-api',
        contractIds: [],
        reason: policy.supportEntries[entry],
      });
    else errors.push(`Public entry is unclassified: ${entry}`);
  }
  for (const alias of Object.keys(policy.aliases))
    if (!manifest.exports[alias]) errors.push(`Stale compatibility mapping: ${alias}`);
  return { entries, errors };
}
export async function buildCoverage(repository = root) {
  const paths = {
    manifest: 'package.json',
    catalogue: 'public/ai/contract-catalogue.json',
    bindings: 'contracts/catalogue-bindings.json',
    policy: 'registry/public-entry-policy.json',
  };
  const inputs = {},
    sources = [];
  for (const [key, path] of Object.entries(paths)) {
    const text = await readFile(resolve(repository, path), 'utf8');
    inputs[key] = JSON.parse(text);
    sources.push({ path, sha256: hash(text) });
  }
  const result = evaluateCoverage(inputs);
  assert.equal(result.errors.length, 0, result.errors.join('\n'));
  for (const alias of Object.values(inputs.policy.aliases)) {
    const text = await readFile(resolve(repository, alias.source), 'utf8');
    sources.push({ path: alias.source, sha256: hash(text) });
  }
  return {
    schemaVersion: 1,
    package: { name: inputs.manifest.name, version: inputs.manifest.version },
    registryRevision: inputs.catalogue.registryRevision,
    scope: 'authored-catalogue-families-and-public-ui-entry-ownership',
    sources,
    summary: {
      apiFamilies: inputs.catalogue.entries.filter((entry) => entry.apiFamilyId).length,
      apiFamiliesWithoutAuthoredBehavior: 0,
      publicUiEntries: result.entries.filter(
        (entry) => entry.classification === 'authored-ui-family',
      ).length,
      explicitCompatibilityAdapters: result.entries.filter(
        (entry) => entry.classification === 'explicit-compatibility-adapter',
      ).length,
    },
    entries: result.entries,
    limitations: inputs.policy.limitations,
  };
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const document = await buildCoverage();
  const path = resolve(root, 'public/ai/public-entry-coverage.json');
  const text = JSON.stringify(document, null, 2) + '\n';
  if (process.argv.includes('--check'))
    assert.equal(
      await readFile(path, 'utf8'),
      text,
      'Public-entry coverage is stale; run coverage:generate.',
    );
  else await writeFile(path, text);
  console.log(
    `Agentic coverage: ${document.summary.apiFamilies} authored API families, ${document.summary.publicUiEntries} public UI entries and ${document.summary.explicitCompatibilityAdapters} explicit compatibility adapters; no unowned UI entries.`,
  );
}
