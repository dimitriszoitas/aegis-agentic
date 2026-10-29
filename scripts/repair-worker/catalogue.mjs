import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { caseCatalog, acceptanceMatrix } from '../acceptance/catalogue.mjs';
import { validateComponentContract } from '../generate-contract-catalogue.mjs';
import { postcss, numericFragments, exceptionReason } from '../check-component-css-tokens.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
export const componentRepairPolicies = Object.freeze({
  'metric-card': 'metric-containment',
  sparkline: 'metric-containment',
  'data-grid': 'data-grid-density',
});

/** Exact authored ownership, never inferred authorization to alter a folder. */
export async function buildRepairCatalogue(repository) {
  const root = await realpath(repository);
  const sources = new Map();
  async function load(path) {
    assert(
      typeof path === 'string' &&
        !isAbsolute(path) &&
        !path.includes('\\') &&
        path.split('/').every((part) => part && part !== '.' && part !== '..'),
      `Unsafe catalogue source path: ${path}`,
    );
    if (sources.has(path)) return sources.get(path);
    const absolute = resolve(root, path);
    let cursor = absolute;
    while (cursor !== root) {
      assert(!relative(root, cursor).startsWith(`..${sep}`), 'Catalogue source leaves checkout.');
      assert(!(await lstat(cursor)).isSymbolicLink(), `Catalogue source symlink refused: ${path}`);
      cursor = dirname(cursor);
    }
    assert((await lstat(absolute)).isFile(), `Catalogue source is not a file: ${path}`);
    const text = await readFile(absolute, 'utf8');
    const source = { path, sha256: hash(text), text };
    sources.set(path, source);
    return source;
  }
  const json = async (path) => JSON.parse((await load(path)).text);
  const bindings = await json('contracts/catalogue-bindings.json');
  const schema = await json('schemas/component-contract.schema.json');
  const categories = await json('tokens/component-categories.json');
  await load('tokens/design-tokens.json');
  const authored = (await readdir(resolve(root, 'contracts/agentic')))
    .filter((name) => name.endsWith('.json'))
    .map((name) => `contracts/agentic/${name}`)
    .sort();
  assert.deepEqual(
    bindings.bindings.map((binding) => binding.path).sort(),
    authored,
    'Every authored UI contract must have exactly one repair inventory binding.',
  );
  assert.equal(
    new Set(bindings.bindings.map((binding) => binding.contractId)).size,
    bindings.bindings.length,
    'Duplicate repair component identity.',
  );
  const entries = [];
  for (const binding of [...bindings.bindings].sort((a, b) =>
    a.contractId.localeCompare(b.contractId),
  )) {
    const contract = await json(binding.path);
    const errors = validateComponentContract(contract, schema);
    assert.equal(errors.length, 0, `${binding.path}: ${errors.join('; ')}`);
    assert.equal(contract.id, binding.contractId, 'Contract identity does not match binding.');
    assert.equal(
      contract.version,
      binding.contractVersion,
      `Stale contract binding: ${binding.contractId}`,
    );
    const implementation = await load(binding.implementation);
    const directory = dirname(binding.implementation);
    const localFiles = (await readdir(resolve(root, directory))).map(
      (name) => `${directory}/${name}`,
    );
    const api = binding.apiFamilyId
      ? await json(`public/ai/components/${binding.apiFamilyId}.json`)
      : null;
    if (api)
      assert(
        api.sourceFiles.includes(binding.implementation) &&
          api.exports.includes(binding.exportName),
        `Stale API binding: ${binding.contractId}`,
      );
    const styles = [
      ...new Set([
        ...(api?.sourceFiles ?? []).filter(
          (path) => path.startsWith(`${directory}/`) && path.endsWith('.css'),
        ),
        ...(contract.requirements ?? [])
          .flatMap((requirement) => requirement.sources)
          .filter((path) => path.startsWith(`${directory}/`) && path.endsWith('.css')),
        ...[...implementation.text.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)]
          .filter((match) => match[1].startsWith('.'))
          .map((match) =>
            relative(root, resolve(directory === '.' ? root : resolve(root, directory), match[1])),
          ),
      ]),
    ].sort();
    const storySources = [
      ...new Set([
        ...(api?.stories ?? []).map((story) => story.sourceFile),
        ...localFiles.filter((path) => /\.stories\.[jt]sx?$/.test(path)),
      ]),
    ].sort();
    const references = [
      ...new Set([
        binding.path,
        binding.implementation,
        ...styles,
        ...storySources,
        ...(contract.requirements ?? []).flatMap((requirement) => requirement.sources),
        ...binding.checks.map((check) => check.path),
        ...localFiles.filter((path) => /\.(?:test|spec)\.[jt]sx?$/.test(path)),
      ]),
    ].sort();
    for (const path of references) await load(path);
    const ownership = Object.entries(categories.categories)
      .flatMap(([group, category]) =>
        category.prefixes
          .filter((prefix) => binding.implementation.startsWith(prefix))
          .map((prefix) => ({ group, prefix })),
      )
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];
    const requirements = (contract.requirements ?? []).map((requirement) => {
      const requirementRef = `${contract.id}#${requirement.id}`;
      const cases = caseCatalog.filter((scenario) =>
        scenario.requirementRefs.includes(requirementRef),
      );
      return {
        requirementRef,
        owner: requirement.kind,
        statement: requirement.statement,
        caseIds: cases.map((scenario) => scenario.id),
        status: cases.length ? 'not-run' : 'unsupported',
        coverage: cases.length ? 'partial-scenario' : 'manual-review',
      };
    });
    const policyId = Object.hasOwn(componentRepairPolicies, contract.id)
      ? componentRepairPolicies[contract.id]
      : null;
    const sourceRecords = references.map((path) => ({ path, sha256: sources.get(path).sha256 }));
    entries.push({
      id: contract.id,
      contractVersion: contract.version,
      purpose: contract.purpose,
      implementation: binding.implementation,
      exportName: binding.exportName,
      styles,
      storySources,
      stories: (api?.stories ?? []).map(({ id, name, sourceFile }) => ({ id, name, sourceFile })),
      tokenGroup: ownership?.group ?? contract.tokenGroup,
      sourceDigest: hash(JSON.stringify(sourceRecords)),
      sources: sourceRecords,
      linkedChecks: binding.checks,
      unitTests: references.filter((path) => /\.(?:test|spec)\.[jt]sx?$/.test(path)),
      requirements,
      acceptanceScenarios: caseCatalog.filter((scenario) =>
        requirements.some((requirement) => requirement.caseIds.includes(scenario.id)),
      ),
      repair: {
        eligible: Boolean(policyId),
        policyId,
        reason: policyId
          ? `Eligible only for the bounded ${policyId} CSS defect policy. Other requirements remain review-required.`
          : !styles.length
            ? 'No owned CSS source is available for the CSS-only repair worker. Behavior and API changes require an authored policy and human review.'
            : 'A trusted repair fixture with content/behavior preservation assertions has not been authored for this component. Linked stories or smoke checks do not authorize CSS repair.',
      },
    });
  }
  const sourceRecords = [...sources.values()]
    .map(({ path, sha256 }) => ({ path, sha256 }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    schemaVersion: 1,
    kind: 'component-repair-catalogue',
    sourceDigest: hash(JSON.stringify(sourceRecords)),
    entries,
    matrix: acceptanceMatrix,
    summary: {
      authored: entries.length,
      boundedRepairEligible: entries.filter((entry) => entry.repair.eligible).length,
      manualReview: entries.filter((entry) => !entry.repair.eligible).length,
      linkedAcceptanceScenarios: entries.filter((entry) => entry.acceptanceScenarios.length).length,
    },
    limitations: [
      'Inventory and linked checks are not executed browser evidence.',
      'Eligibility is defect-specific, not whole-component autonomous repair.',
      'Only exact CSS paths in a trusted repair policy may be proposed; every source repair requires review.',
    ],
  };
}

export function selectRepairComponent(catalogue, id) {
  assert(typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id), 'Invalid component ID.');
  const entry = catalogue.entries.find((candidate) => candidate.id === id);
  assert(entry, `Unknown authored component: ${id}. Run repair catalogue for valid IDs.`);
  return entry;
}

/** Read-only diagnostics for every authored component. No shallow check grants repair authority. */
export async function scanRepairComponent({ repository, componentId }) {
  const catalogue = await buildRepairCatalogue(repository);
  const component = selectRepairComponent(catalogue, componentId);
  const manifest = JSON.parse(
    await readFile(resolve(repository, 'tokens/design-tokens.json'), 'utf8'),
  );
  const report = await scanComponentSources(repository, catalogue, component, new Map(), manifest);
  const after = await buildRepairCatalogue(repository);
  assert.equal(after.sourceDigest, catalogue.sourceDigest, 'Catalogue inputs changed during scan.');
  return report;
}

async function scanComponentSources(repository, catalogue, component, cache, manifest) {
  const componentId = component.id;
  const checks = [
    {
      id: 'contract-and-source-integrity',
      status: 'passed',
      scope: 'Validated contract, binding identity and exact current source hashes.',
    },
  ];
  const failures = [];
  let declarations = 0;
  for (const path of component.styles) {
    if (cache.has(path)) {
      const previous = cache.get(path);
      declarations += previous.declarations;
      failures.push(...previous.failures);
      continue;
    }
    const previousCount = declarations;
    const previousFailures = failures.length;
    const css = await readFile(resolve(repository, path), 'utf8');
    assert.equal(
      hash(css),
      component.sources.find((source) => source.path === path)?.sha256,
      `Source changed during scan: ${path}`,
    );
    const parsed = postcss.parse(css, { from: path });
    parsed.walkDecls((declaration) => {
      declarations++;
      for (const fragment of numericFragments(declaration.value))
        if (!exceptionReason(declaration, fragment))
          failures.push({
            code: 'fixed-value',
            path,
            line: declaration.source.start.line,
            property: declaration.prop,
            value: fragment.raw,
          });
      for (const [, reference] of declaration.value.matchAll(
        /var\((--(?:primitive|semantic)-[\w-]+)/g,
      )) {
        // A declared local group role referencing semantics is the required tier,
        // not a consumer bypass. Its identity must exist in the canonical graph.
        const localGroup =
          declaration.prop.startsWith(`--group-${component.tokenGroup}-`) &&
          manifest.tokens[declaration.prop]?.tier === 'group';
        if (localGroup && reference.startsWith('--semantic-')) continue;
        failures.push({
          code: 'token-tier-bypass',
          path,
          line: declaration.source.start.line,
          property: declaration.prop,
          value: reference,
        });
      }
    });
    cache.set(path, {
      declarations: declarations - previousCount,
      failures: failures.slice(previousFailures),
    });
  }
  checks.push({
    id: 'owned-css-token-declarations',
    status: failures.length ? 'failed' : component.styles.length ? 'passed' : 'unsupported',
    files: component.styles.length,
    declarations,
    failures,
    scope:
      'Numeric declaration tokenization and direct tier bypass only; not visual correctness or complete group ownership.',
  });
  return {
    schemaVersion: 1,
    kind: 'component-repair-scan',
    componentId,
    sourceDigest: catalogue.sourceDigest,
    status: failures.length ? 'needs-review' : 'scanned',
    checks,
    component,
    browserStatus: 'not-run',
    providerRequests: 0,
    nextAction: component.repair.eligible
      ? `Run repair run --component ${componentId} --provider codex to reproduce the bounded defect in a trusted fixture before any AI request.`
      : component.repair.reason,
    limitations: [
      'A successful source scan is not a healthy-component or accessibility certification.',
      'Finite acceptance scenarios and stories are linked for review; this source scan does not execute them.',
      'No model request, source edit, release or merge occurs.',
    ],
  };
}

/** A single shared source snapshot and CSS cache cover the full authored catalogue. */
export async function scanAllRepairComponents({ repository }) {
  const catalogue = await buildRepairCatalogue(repository);
  const manifest = JSON.parse(
    await readFile(resolve(repository, 'tokens/design-tokens.json'), 'utf8'),
  );
  const cache = new Map();
  const reports = [];
  for (const component of catalogue.entries)
    reports.push(await scanComponentSources(repository, catalogue, component, cache, manifest));
  const after = await buildRepairCatalogue(repository);
  assert.equal(after.sourceDigest, catalogue.sourceDigest, 'Catalogue inputs changed during scan.');
  return {
    schemaVersion: 1,
    kind: 'catalogue-repair-scan',
    sourceDigest: catalogue.sourceDigest,
    status: reports.some((report) => report.status === 'needs-review') ? 'needs-review' : 'scanned',
    summary: {
      components: reports.length,
      scanned: reports.filter((report) => report.status === 'scanned').length,
      needsReview: reports.filter((report) => report.status === 'needs-review').length,
      uniqueCssFiles: cache.size,
      declarations: [...cache.values()].reduce((sum, report) => sum + report.declarations, 0),
      browserExecuted: 0,
      providerRequests: 0,
    },
    reports: reports.map(({ component, ...report }) => ({ ...report, repair: component.repair })),
    limitations: [
      'All authored components were source-inspected. No runtime, visual or whole-component repair certification is inferred.',
      'Per-family linked acceptance scenarios remain finite and separate from these source checks.',
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const catalogue = await buildRepairCatalogue(root);
  const text = JSON.stringify(catalogue, null, 2) + '\n';
  const output = resolve(root, 'public/ai/repair-catalogue.json');
  if (process.argv.includes('--write')) await writeFile(output, text);
  else if (process.argv.includes('--check'))
    assert.equal(
      await readFile(output, 'utf8'),
      text,
      'Repair catalogue is stale; regenerate it from source.',
    );
  else console.log(text);
  if (process.argv.includes('--write') || process.argv.includes('--check'))
    console.log(JSON.stringify(catalogue.summary));
}
