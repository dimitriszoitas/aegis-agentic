/** Build one source-backed catalogue. Linking requirements or checks never certifies behavior. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const cataloguePath = 'public/ai/contract-catalogue.json';
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) =>
  JSON.stringify(value, (_key, item) =>
    object(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
const safePath = (path) =>
  nonempty(path) &&
  !isAbsolute(path) &&
  !path.includes('\\') &&
  !path.includes(':') &&
  path.split('/').every((part) => part && part !== '.' && part !== '..');
const exactKeys = (value, keys, context) => {
  assert(object(value), `${context} must be an object`);
  assert(
    Object.keys(value).every((key) => keys.includes(key)),
    `${context} has unknown fields`,
  );
  assert(
    keys.every((key) => Object.hasOwn(value, key)),
    `${context} has missing fields`,
  );
};

/** Evaluates only the closed JSON Schema subset used by the repository-owned contract schema.
 * Unsupported validation keywords fail, rather than silently widening the accepted input. */
export function validateComponentContract(value, schema) {
  const keywords = new Set([
    '$schema',
    '$id',
    '$defs',
    '$ref',
    'description',
    'oneOf',
    'type',
    'const',
    'enum',
    'properties',
    'required',
    'additionalProperties',
    'items',
    'minItems',
    'uniqueItems',
    'minLength',
    'pattern',
    'minimum',
    'maximum',
  ]);
  function check(input, shape, path = '$') {
    if (shape === true) return [];
    if (shape === false) return [`${path} is forbidden`];
    assert(object(shape), 'Invalid contract schema');
    for (const key of Object.keys(shape))
      assert(keywords.has(key), `Unsupported contract schema keyword: ${key}`);
    if (shape.$ref) {
      assert(
        /^#\/\$defs\/[A-Za-z0-9]+$/.test(shape.$ref),
        'Only local named contract definitions are supported',
      );
      const target = schema.$defs?.[shape.$ref.split('/').at(-1)];
      assert(target, `Missing schema definition ${shape.$ref}`);
      return check(input, target, path);
    }
    const issues = [];
    if (shape.oneOf) {
      const branches = shape.oneOf.map((branch) => check(input, branch, path));
      if (branches.filter((branch) => branch.length === 0).length !== 1)
        issues.push(
          `${path} must match exactly one supported contract shape: ${branches.map((branch) => branch.slice(0, 3).join('; ')).join(' | ')}`,
        );
    }
    if (Object.hasOwn(shape, 'const') && stable(input) !== stable(shape.const))
      issues.push(`${path} must equal ${JSON.stringify(shape.const)}`);
    if (shape.enum && !shape.enum.some((item) => stable(input) === stable(item)))
      issues.push(`${path} is not an allowed value`);
    if (shape.type) {
      const correct =
        shape.type === 'object'
          ? object(input)
          : shape.type === 'array'
            ? Array.isArray(input)
            : shape.type === 'integer'
              ? Number.isSafeInteger(input)
              : typeof input === shape.type;
      if (!correct) return [...issues, `${path} must be ${shape.type}`];
    }
    if (typeof input === 'string') {
      if (shape.minLength !== undefined && input.length < shape.minLength)
        issues.push(`${path} is too short`);
      if (shape.pattern && !new RegExp(shape.pattern).test(input))
        issues.push(`${path} has an invalid format`);
    }
    if (typeof input === 'number') {
      if (shape.minimum !== undefined && input < shape.minimum)
        issues.push(`${path} is below minimum`);
      if (shape.maximum !== undefined && input > shape.maximum)
        issues.push(`${path} exceeds maximum`);
    }
    if (Array.isArray(input)) {
      if (shape.minItems !== undefined && input.length < shape.minItems)
        issues.push(`${path} has too few items`);
      if (shape.uniqueItems && new Set(input.map(stable)).size !== input.length)
        issues.push(`${path} has duplicate items`);
      if (shape.items)
        input.forEach((item, index) =>
          issues.push(...check(item, shape.items, `${path}[${index}]`)),
        );
    }
    if (object(input)) {
      for (const key of shape.required ?? [])
        if (!Object.hasOwn(input, key)) issues.push(`${path}.${key} is required`);
      for (const [key, item] of Object.entries(input)) {
        if (shape.properties?.[key] !== undefined)
          issues.push(...check(item, shape.properties[key], `${path}.${key}`));
        else if (shape.additionalProperties === false) issues.push(`${path}.${key} is unknown`);
      }
    }
    return issues;
  }
  return check(value, schema);
}

export async function loadCatalogueInputs(root = repository) {
  const base = await realpath(root);
  const files = {};
  async function load(path) {
    assert(safePath(path), `Unsafe source path: ${path}`);
    if (Object.hasOwn(files, path)) return;
    const actual = await realpath(resolve(base, path));
    const fromRoot = relative(base, actual);
    assert(
      fromRoot && !isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`),
      `Source escapes repository: ${path}`,
    );
    files[path] = await readFile(actual, 'utf8');
  }
  for (const path of [
    'contracts/catalogue-bindings.json',
    'registry/canonical.json',
    'public/ai/index.json',
    'schemas/component-contract.schema.json',
    'tokens/component-categories.json',
  ])
    await load(path);
  const bindings = JSON.parse(files['contracts/catalogue-bindings.json']);
  const index = JSON.parse(files['public/ai/index.json']);
  const authoredPaths = (await readdir(resolve(base, 'contracts/agentic')))
    .filter((path) => path.endsWith('.json'))
    .sort()
    .map((path) => `contracts/agentic/${path}`);
  const protocolPaths = (await readdir(resolve(base, 'contracts')))
    .filter((path) => path.endsWith('.json') && path !== 'catalogue-bindings.json')
    .sort()
    .map((path) => `contracts/${path}`);
  for (const path of [...authoredPaths, ...protocolPaths]) await load(path);
  for (const path of authoredPaths) {
    const document = JSON.parse(files[path]);
    if (document.schemaVersion !== 2) continue;
    assert(Array.isArray(document.requirements), `${path} requires explicit requirements`);
    for (const requirement of document.requirements) {
      assert(Array.isArray(requirement.sources), `${path} requires source references`);
      for (const reference of requirement.sources) await load(reference);
    }
  }
  for (const api of index.components) await load(`public/ai/components/${api.id}.json`);
  for (const binding of [...bindings.bindings, ...bindings.protocols]) {
    if (binding.implementation) await load(binding.implementation);
    for (const reference of [...binding.checks, ...binding.evidence]) await load(reference.path);
    for (const reference of binding.evidence) {
      const evidence = JSON.parse(files[reference.path]);
      for (const path of Object.keys(evidence.sourceHashes ?? {})) await load(path);
    }
  }
  return { files, authoredPaths, protocolPaths };
}

export function buildContractCatalogue({ files, authoredPaths, protocolPaths }) {
  const read = (path) => {
    assert(safePath(path), `Unsafe source path: ${path}`);
    assert(typeof files[path] === 'string', `Missing source: ${path}`);
    return files[path];
  };
  const json = (path) => JSON.parse(read(path));
  const source = (path) => ({ path, sha256: sha(read(path)) });
  const bindings = json('contracts/catalogue-bindings.json');
  exactKeys(
    bindings,
    ['schemaVersion', 'bindings', 'protocols', 'limitations'],
    'Catalogue bindings',
  );
  assert.equal(bindings.schemaVersion, 1);
  assert(Array.isArray(bindings.bindings) && Array.isArray(bindings.protocols));
  assert(Array.isArray(bindings.limitations) && bindings.limitations.every(nonempty));
  const registry = json('registry/canonical.json');
  const index = json('public/ai/index.json');
  const schema = json('schemas/component-contract.schema.json');
  const categories = json('tokens/component-categories.json').categories;
  assert(Array.isArray(index.components));
  const unique = (values, context) =>
    assert.equal(new Set(values).size, values.length, `Duplicate ${context}`);
  unique(
    index.components.map((api) => api.id),
    'API family',
  );
  unique(
    registry.entries.map((entry) => entry.id),
    'registry ID',
  );
  unique(
    bindings.bindings.map((binding) => binding.contractId),
    'binding contract ID',
  );
  unique(
    bindings.bindings.map((binding) => binding.path),
    'binding source',
  );
  unique(
    bindings.bindings
      .filter((binding) => binding.apiFamilyId !== null)
      .map((binding) => binding.apiFamilyId),
    'binding API family',
  );
  assert.deepEqual(
    bindings.bindings.map((binding) => binding.path).sort(),
    [...authoredPaths].sort(),
    'Bindings must cover exactly the authored contract files',
  );
  assert.deepEqual(
    bindings.protocols.map((binding) => binding.path).sort(),
    [...protocolPaths].sort(),
    'Protocols must be classified separately and completely',
  );
  assert.deepEqual(
    bindings.bindings.map((binding) => binding.contractId).sort(),
    registry.entries.map((entry) => entry.id).sort(),
    'Bindings must match current registry identities',
  );
  const references = (refs, evidence = false) => {
    assert(Array.isArray(refs), 'References must be arrays');
    unique(
      refs.map((ref) => ref.path),
      'reference path',
    );
    return refs
      .map((ref) => {
        exactKeys(ref, ['path', 'label', 'scope'], 'Reference');
        assert(
          nonempty(ref.label) && nonempty(ref.scope),
          'References require a label and bounded scope',
        );
        const result = { ...source(ref.path), label: ref.label, scope: ref.scope };
        if (evidence) {
          assert(ref.path.endsWith('.json'), 'Evidence must reference a JSON record');
          const record = json(ref.path);
          assert(object(record), 'Evidence record must be an object');
          const hashes = record.sourceHashes;
          let sourceMatch = 'not-assessed';
          if (hashes !== undefined) {
            assert(
              object(hashes) && Object.keys(hashes).length,
              'Evidence sourceHashes must be nonempty',
            );
            sourceMatch = 'matches-declared-source-hashes';
            for (const [path, expected] of Object.entries(hashes)) {
              assert(
                typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected),
                'Invalid evidence source hash',
              );
              if (source(path).sha256 !== expected) sourceMatch = 'mismatch';
            }
          }
          return {
            ...result,
            reportedStatus: typeof record.status === 'string' ? record.status : null,
            sourceMatch,
          };
        }
        return result;
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  };
  const entries = index.components.map((api) => {
    assert(nonempty(api.id) && /^[a-z][a-z0-9-]*$/.test(api.id), 'Invalid API family ID');
    const path = `public/ai/components/${api.id}.json`;
    const document = json(path);
    assert.equal(document.id, api.id, 'API index/document identity mismatch');
    assert.equal(document.name, api.name, 'API index/document name mismatch');
    return {
      id: api.id,
      name: api.name,
      kind:
        api.kind === 'pattern'
          ? 'pattern'
          : api.id.startsWith('foundations-')
            ? 'foundation'
            : 'component',
      apiFamilyId: api.id,
      registryId: null,
      summary: api.purpose,
      aliases: api.aliases ?? [],
      importPaths: api.importPaths ?? [],
      api: { source: source(path), url: `./ai/components/${api.id}.json` },
      contract: null,
      checks: [],
      evidence: [],
      limitations: [],
    };
  });
  for (const binding of bindings.bindings) {
    exactKeys(
      binding,
      [
        'contractId',
        'path',
        'contractVersion',
        'apiFamilyId',
        'implementation',
        'exportName',
        'checks',
        'evidence',
      ],
      'Component binding',
    );
    const document = json(binding.path);
    const errors = validateComponentContract(document, schema);
    assert.equal(errors.length, 0, `${binding.path}: ${errors.join('\n')}`);
    assert.equal(document.id, binding.contractId, 'Contract ID mismatch');
    assert.equal(document.version, binding.contractVersion, 'Stale binding contract version');
    const registered = registry.entries.find((entry) => entry.id === binding.contractId);
    assert.equal(registered.contract, binding.path, 'Registry contract path mismatch');
    assert.equal(registered.version, document.version, 'Stale registry contract version');
    assert(
      registered.provenance.source.split(/;\s*/).includes(binding.implementation),
      'Binding implementation must match registry provenance',
    );
    read(binding.implementation);
    assert(nonempty(binding.exportName), 'Export name required');
    const requirementReferences = [];
    if (document.schemaVersion === 2) {
      unique(
        document.requirements.map((requirement) => requirement.id),
        'requirement ID',
      );
      const ownership = Object.entries(categories)
        .flatMap(([group, category]) =>
          category.prefixes
            .filter((prefix) => binding.implementation.startsWith(prefix))
            .map((prefix) => ({ group, prefix })),
        )
        .sort((a, b) => b.prefix.length - a.prefix.length);
      assert(ownership.length, 'Requirement implementation must have a token owner');
      assert.equal(
        document.tokenGroup,
        ownership[0].group,
        'Contract token group differs from implementation owner',
      );
      const familySources =
        binding.apiFamilyId === null
          ? [binding.implementation]
          : json(`public/ai/components/${binding.apiFamilyId}.json`).sourceFiles.filter(
              (path) =>
                path.startsWith(`${dirname(binding.implementation)}/`) &&
                /\.(?:[cm]?[jt]sx?|css)$/.test(path),
            );
      for (const responsibility of Object.values(document.ownership))
        assert(responsibility.every(nonempty), 'Ownership must state nonempty responsibilities');
      for (const requirement of document.requirements) {
        assert(nonempty(requirement.statement), 'Requirement statement must be nonempty');
        if (requirement.kind === 'component')
          assert(
            requirement.sources.some((path) => familySources.includes(path)),
            'Component requirement must cite a family implementation source',
          );
        for (const path of requirement.sources) {
          const reference = source(path);
          if (!requirementReferences.some((existing) => existing.path === path))
            requirementReferences.push(reference);
        }
      }
      requirementReferences.sort((a, b) => a.path.localeCompare(b.path));
    }
    let entry;
    if (binding.apiFamilyId !== null) {
      entry = entries.find((item) => item.apiFamilyId === binding.apiFamilyId);
      assert(entry, `Unknown API family: ${binding.apiFamilyId}`);
      const api = json(entry.api.source.path);
      assert(
        api.sourceFiles.includes(binding.implementation),
        'API family does not contain the declared implementation',
      );
      assert(
        api.exports.includes(binding.exportName),
        'API family does not export the declared component',
      );
    } else {
      assert(
        !index.components.some((api) => {
          const doc = json(`public/ai/components/${api.id}.json`);
          return (
            doc.sourceFiles.includes(binding.implementation) &&
            doc.exports.includes(binding.exportName)
          );
        }),
        'Stale authored-only binding: a matching API family now exists',
      );
      entry = {
        id: registered.id,
        name: registered.name,
        kind: registered.kind,
        apiFamilyId: null,
        registryId: null,
        summary: document.purpose,
        aliases: [],
        importPaths: [],
        api: null,
        contract: null,
        checks: [],
        evidence: [],
        limitations: [],
      };
      entries.push(entry);
    }
    entry.registryId = registered.id;
    entry.aliases = [
      ...new Set([...entry.aliases, ...registered.aliases, ...registered.capabilities]),
    ].sort();
    entry.importPaths = [...new Set([...entry.importPaths, registered.importPath])].sort();
    entry.contract = {
      id: document.id,
      version: document.version,
      status: document.status,
      source: source(binding.path),
      references: requirementReferences,
      document,
      raw: read(binding.path),
    };
    entry.checks = references(binding.checks);
    entry.evidence = references(binding.evidence, true);
  }
  for (const binding of bindings.protocols) {
    exactKeys(binding, ['id', 'path', 'schemaVersion', 'checks', 'evidence'], 'Protocol binding');
    assert(/^[a-z][a-z0-9-]*$/.test(binding.id), 'Invalid protocol identity');
    const document = json(binding.path);
    assert.equal(document.schemaVersion, binding.schemaVersion, 'Stale protocol schema version');
    assert(
      nonempty(document.name) && nonempty(document.basePath) && Array.isArray(document.endpoints),
      'Invalid protocol source',
    );
    entries.push({
      id: binding.id,
      name: document.name,
      kind: 'protocol',
      apiFamilyId: null,
      registryId: null,
      summary: `${document.deployment} protocol at ${document.basePath}`,
      aliases: [],
      importPaths: [],
      api: null,
      contract: {
        id: binding.id,
        version: null,
        status: 'protocol-specification',
        source: source(binding.path),
        references: [],
        document,
        raw: read(binding.path),
      },
      checks: references(binding.checks),
      evidence: references(binding.evidence, true),
      limitations: [
        'System protocol specification; excluded from component/pattern behavioral coverage.',
      ],
    });
  }
  unique(
    entries.map((entry) => entry.id),
    'catalogue identity',
  );
  for (const entry of entries) {
    entry.coverage = {
      apiDocumented: entry.api !== null,
      behaviorAuthored: entry.contract !== null && entry.kind !== 'protocol',
      systemContractAuthored: entry.kind === 'protocol',
      checksLinked: entry.checks.length > 0,
      evidenceLinked: entry.evidence.length > 0,
      evidenceReported: entry.evidence.some((evidence) => evidence.reportedStatus !== null),
    };
    if (!entry.contract)
      entry.limitations.push(
        'API metadata and usage guidance only; no authored behavioral contract is mapped.',
      );
    if (entry.checks.length)
      entry.limitations.push(
        'Linked checks describe available verification code, not a current passing result or complete invariant coverage.',
      );
    if (entry.evidence.length)
      entry.limitations.push(
        'Reported evidence is historical and bounded. Matching declared source hashes does not rerun checks or establish owner approval.',
      );
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  const count = (predicate) => entries.filter(predicate).length;
  const coverage = {
    apiFamilies: count((entry) => entry.coverage.apiDocumented),
    apiFamiliesWithAuthoredBehavior: count(
      (entry) => entry.coverage.apiDocumented && entry.coverage.behaviorAuthored,
    ),
    apiFamiliesWithoutAuthoredBehavior: count(
      (entry) => entry.coverage.apiDocumented && !entry.coverage.behaviorAuthored,
    ),
    authoredComponentPatternContracts: count((entry) => entry.coverage.behaviorAuthored),
    authoredOnlyEntries: count(
      (entry) => !entry.coverage.apiDocumented && entry.coverage.behaviorAuthored,
    ),
    systemProtocolContracts: count((entry) => entry.kind === 'protocol'),
    entriesWithLinkedChecks: count((entry) => entry.coverage.checksLinked),
    entriesWithLinkedEvidence: count((entry) => entry.coverage.evidenceLinked),
    entriesWithReportedEvidence: count((entry) => entry.coverage.evidenceReported),
  };
  const sources = Object.keys(files).sort().map(source);
  return {
    schemaVersion: 1,
    package: index.package,
    registryRevision: registry.revision,
    sourceDigest: sha(stable(sources)),
    sources,
    entries,
    coverage,
    limitations: [
      ...bindings.limitations,
      'Coverage counts distinguish API documentation, authored requirements, linked checks and reported evidence; none is a certification or owner approval.',
      'Source/API identity mappings are curated. Contract invariants are requirements, not automatically complete executable tests.',
      'The catalogue contains source paths, not promises that every source file is served by Storybook or shipped in an installed kit.',
    ],
  };
}

export async function generateContractCatalogue({ root = repository, check = false } = {}) {
  const catalogue = buildContractCatalogue(await loadCatalogueInputs(root));
  const output = JSON.stringify(catalogue, null, 2) + '\n';
  if (check)
    assert.equal(
      await readFile(resolve(root, cataloguePath), 'utf8'),
      output,
      'Contract catalogue is stale; run contracts:generate',
    );
  else await writeFile(resolve(root, cataloguePath), output);
  return catalogue;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert(
    args.length === 0 || (args.length === 1 && args[0] === '--check'),
    'Usage: generate-contract-catalogue.mjs [--check]',
  );
  const result = await generateContractCatalogue({ check: args.includes('--check') });
  console.log(
    `Contract catalogue ${args.includes('--check') ? 'checked' : 'generated'}: ${result.coverage.apiFamilies} API families, ${result.coverage.authoredComponentPatternContracts} authored requirements, ${result.coverage.systemProtocolContracts} protocols.`,
  );
}
