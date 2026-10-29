import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumer = await mkdtemp(join(tmpdir(), 'aegis-agentic-consumer-'));
await cp(join(root, 'agent-kit'), join(consumer, 'kit'), { recursive: true });
const kit = join(consumer, 'kit');
const cli = join(kit, 'bin/aegis.mjs');
const checks = [];
function run(args, expected = 0) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: consumer,
    encoding: 'utf8',
    timeout: 30000,
    // contracts list intentionally returns the complete authored catalogue.
    maxBuffer: 8 * 1024 * 1024,
    env: { PATH: process.env.PATH },
  });
  assert.equal(
    result.status,
    expected,
    `${args.join(' ')}\n${result.error ?? ''}\n${result.stdout?.slice(-3000)}\n${result.stderr?.slice(-3000)}`,
  );
  return JSON.parse(result.stdout);
}
const fixture = (name) => join(kit, name);
const kitInfo = run(['status']);
const catalogue = JSON.parse(await readFile(fixture(kitInfo.contractCatalogue.path), 'utf8'));
const contractEntries = run(['contracts', 'list']);
assert.deepEqual(
  contractEntries,
  catalogue.entries,
  'CLI and distributed catalogue must be identical',
);
assert.deepEqual(run(['contracts', 'coverage']), catalogue.coverage);
assert.equal(catalogue.package.version, kitInfo.version);
assert.equal(catalogue.registryRevision, kitInfo.registryRevision);
assert.equal(catalogue.coverage.apiFamilies, 124);
assert.equal(catalogue.coverage.authoredComponentPatternContracts, 127);
assert.equal(catalogue.coverage.apiFamiliesWithAuthoredBehavior, 124);
assert.equal(catalogue.coverage.systemProtocolContracts, 2);
assert.equal(catalogue.coverage.apiFamiliesWithoutAuthoredBehavior, 0);
assert.equal(kitInfo.authoringGuidance.requiredWorkflow, 'library-source-checkout');
for (const skill of Object.keys(kitInfo.authoringGuidance.skills)) {
  assert.equal(
    await readFile(fixture(`skills/${skill}/SKILL.md`), 'utf8'),
    await readFile(join(root, 'skills', skill, 'SKILL.md'), 'utf8'),
  );
}
assert.equal(kitInfo.repositorySystemization.workflow, 'agent-assisted-staged-refactor');
assert.equal(kitInfo.repositorySystemization.automaticMigration, false);
for (const path of [
  kitInfo.repositorySystemization.guidance,
  ...kitInfo.repositorySystemization.references,
]) {
  assert.equal(
    await readFile(fixture(path), 'utf8'),
    await readFile(join(root, path), 'utf8'),
    `Portable systemization guidance must match its canonical source: ${path}`,
  );
}
const entryCoverage = JSON.parse(await readFile(fixture(kitInfo.publicEntryCoverage.path), 'utf8'));
assert.equal(entryCoverage.summary.apiFamiliesWithoutAuthoredBehavior, 0);
assert.equal(entryCoverage.summary.publicUiEntries, 110);

const contractButton = run(['contracts', 'get', 'button']);
assert.equal(contractButton.apiFamilyId, 'components-actions-button');
assert.equal(contractButton.contract.id, 'button');
assert.equal(contractButton.coverage.behaviorAuthored, true);
assert.equal(run(['contracts', 'get', 'components-people-avatar']).coverage.behaviorAuthored, true);
assert.equal(run(['contracts', 'get', 'patterns-filterbar']).contract.id, 'filter-bar');
assert.equal(run(['contracts', 'get', 'data-grid']).contract.document.schemaVersion, 2);
assert.equal(run(['contracts', 'get', 'dataset-filtering']).apiFamilyId, null);
assert(
  run(['contracts', 'search', 'page layout']).some((entry) => entry.registryId === 'page-layout'),
);
assert(run(['contracts', 'get', 'not-a-contract'], 1).error.includes('Unknown contract'));
assert(run(['contracts', 'search'], 1).error.includes('exactly one'));
assert(run(['contracts', 'coverage', 'extra'], 1).error.includes('no arguments'));
assert.equal(kitInfo.mcp.transport, 'stdio');
assert.equal(kitInfo.mcp.readOnly, true);
assert.equal(kitInfo.mcp.verifiedProtocolVersion, '2025-11-25');
assert((await readFile(fixture(kitInfo.mcp.entry), 'utf8')).includes('aegis-agentic-readonly'));
checks.push(
  'Portable catalogue and CLI agree on API, authored behavior and separate protocol coverage; every shipped API family has authored behavior without implying runtime certification',
);
assert.equal(kitInfo.pageComposition.validationScope, 'recipe-selection-only');
assert.equal(kitInfo.pageComposition.registryId, 'page-layout');
assert.equal(kitInfo.pageComposition.validator, 'validatePageLayoutRecipe');
const pageRecipes = run(['pages', 'recipes']);
assert.equal(pageRecipes.version, kitInfo.pageComposition.recipeVersion);
assert.deepEqual(Object.keys(pageRecipes.recipes), kitInfo.pageComposition.archetypes);
assert.deepEqual(pageRecipes.maxColumns, [1, 2, 3, 4]);
assert.deepEqual(
  JSON.parse(await readFile(fixture(kitInfo.pageComposition.recipes), 'utf8')),
  pageRecipes,
  'Portable recipe snapshot must be generated from the same compiled runtime facts',
);
const pageEntry = run(['registry', 'search', 'page composition']).find(
  (entry) => entry.id === 'page-layout',
);
assert(pageEntry, 'Installed registry must discover page-layout.');
assert.equal(pageEntry.kind, 'pattern');
assert.equal(pageEntry.importPath, kitInfo.pageComposition.importPath);
assert.equal(pageEntry.provenance.origin, 'experimental-composition');
assert.equal(pageEntry.provenance.reviewedBy, null);
const pageContract = JSON.parse(await readFile(fixture(pageEntry.contract), 'utf8'));
assert.equal(pageContract.version, pageEntry.version);
assert.equal(pageContract.portableRecipes, kitInfo.pageComposition.recipes);
assert.equal(pageContract.status, 'experimental');
assert(
  (await readFile(fixture(kitInfo.pageComposition.guidance), 'utf8')).includes(
    'Constructing a page',
  ),
);
const pageSelectionPath = join(consumer, 'page-selection.json');
for (const selection of [
  { archetype: 'collection', slots: ['header', 'filters', 'main', 'footer'] },
  { archetype: 'detail', slots: ['header', 'main', 'aside'], asideLabel: 'Record history' },
  { archetype: 'settings', slots: ['header', 'main'], measure: 'wide' },
  { archetype: 'dashboard', slots: ['header', 'main'], maxColumns: 4, minItemWidth: 'small' },
]) {
  const serialized = JSON.stringify(selection);
  await writeFile(pageSelectionPath, serialized);
  const result = run(['pages', 'validate', pageSelectionPath]);
  assert.equal(result.valid, true, serialized);
  assert.deepEqual(result.issues, []);
  assert.equal(result.scope, 'recipe-selection-only');
  assert.equal(result.recipeVersion, pageRecipes.version);
  assert.equal(result.registryRevision, kitInfo.registryRevision);
  assert.equal(
    await readFile(pageSelectionPath, 'utf8'),
    serialized,
    'Validation must not rewrite the selection',
  );
}
for (const [selection, expectedCode, expectedPath] of [
  [{ archetype: 'collection', measure: 'comfortable' }, 'forbidden-option', 'measure'],
  [{ archetype: 'dashboard', maxColumns: 5 }, 'invalid-value', 'maxColumns'],
  [{ archetype: 'detail', slots: ['header', 'main', 'aside'] }, 'invalid-value', 'asideLabel'],
  [
    { archetype: 'settings', slots: ['header', 'main', 'aside'], asideLabel: 'Notes' },
    'forbidden-slot',
    'slots',
  ],
  [{ archetype: 'collection', slots: ['header'] }, 'missing-slot', 'slots'],
  [{ archetype: 'dashboard', slots: ['header', 'main', 'main'] }, 'duplicate-slot', 'slots'],
  [{ archetype: 'dashboard', invented: true }, 'unknown-property', 'invented'],
  [{ archetype: 'inbox' }, 'invalid-value', 'archetype'],
]) {
  await writeFile(pageSelectionPath, JSON.stringify(selection));
  const result = run(['pages', 'validate', pageSelectionPath], 1);
  assert.equal(result.valid, false);
  assert(
    result.issues.some((issue) => issue.code === expectedCode && issue.path === expectedPath),
    JSON.stringify(result),
  );
}
assert(run(['pages', 'recipes', 'unexpected'], 1).error.includes('no arguments'));
assert(run(['pages', 'validate'], 1).error.includes('exactly one'));
checks.push(
  'Page recipes, contract and discovery agree in an isolated kit; four valid archetypes pass and incompatible widths, grids, slots and unknown choices fail without React or npm modules',
);

for (const id of ['aegis', 'atlas', 'solstice']) {
  const out = join(consumer, id, 'agentic-dist');
  const result = run(['profile', 'compile', fixture(`profiles/${id}.json`), '--out', out]);
  assert.equal(result.profile.id, id);
  assert.equal(run(['maintain', 'scan', '--out', out]).status, 'healthy');
  checks.push(`${id}: standalone compilation and clean scan`);
}
const invalid = JSON.parse(await readFile(fixture('profiles/aegis.json'), 'utf8'));
invalid.brand = 'red; } body { display:none';
await writeFile(join(consumer, 'invalid.json'), JSON.stringify(invalid));
assert.equal(run(['profile', 'validate', join(consumer, 'invalid.json')], 1).valid, false);
checks.push('Invalid profile rejected');
const custom = JSON.parse(await readFile(fixture('profiles/atlas.json'), 'utf8'));
Object.assign(custom, {
  id: 'custom-team',
  name: 'Custom team',
  brand: '#7253c9',
  radius: 'round',
  font: 'serif',
  density: 'comfortable',
});
const customPath = join(consumer, 'custom-profile.json');
await writeFile(customPath, JSON.stringify(custom));
const customOut = join(consumer, 'custom/agentic-dist');
const customResult = run(['profile', 'compile', customPath, '--out', customOut]);
assert.equal(customResult.profile.id, custom.id);
assert.equal(customResult.profile.brand, custom.brand);
assert.equal(customResult.runtimeDefaults.density, custom.density);
assert(
  (await readFile(join(customOut, 'profile-tokens.css'), 'utf8')).includes(
    'data-agentic-profile="custom-team"',
  ),
);
assert.equal(run(['maintain', 'scan', '--out', customOut]).status, 'healthy');
checks.push(
  'Custom team profile compiles with its own identity, brand, radius, typography and density',
);
const specFile = fixture('examples/composition.json');
const spec = JSON.parse(await readFile(specFile, 'utf8'));
const first = run([
  'composition',
  'validate',
  specFile,
  '--profile',
  fixture('profiles/aegis.json'),
]);
assert.equal(
  first.stableHash,
  run(['composition', 'validate', specFile, '--profile', fixture('profiles/aegis.json')])
    .stableHash,
);
await writeFile(
  join(consumer, 'invalid-spec.json'),
  JSON.stringify({
    ...spec,
    filters: { ...spec.filters, application: 'explicit', showApplyButton: false },
  }),
);
assert(
  run(['composition', 'validate', join(consumer, 'invalid-spec.json')], 1).error.includes('Apply'),
);
const unpinned = { ...spec, profileHash: 'wrong' };
await writeFile(join(consumer, 'unpinned.json'), JSON.stringify(unpinned));
assert(
  run(
    [
      'composition',
      'validate',
      join(consumer, 'unpinned.json'),
      '--profile',
      fixture('profiles/aegis.json'),
    ],
    1,
  ).error,
);
checks.push('Deterministic composition, invalid variants and mismatched profile pin');
assert(run(['registry', 'search', 'dialog']).some((entry) => entry.id === 'dialog'));
const proposals = JSON.parse(await readFile(fixture('registry/proposals.json'), 'utf8'));
for (let i = 0; i < proposals.length; i++)
  await writeFile(join(consumer, `proposal-${i}.json`), JSON.stringify(proposals[i]));
const canonical = fixture('registry/proposal-example-registry.json');
assert.equal(
  run([
    'registry',
    'compare',
    join(consumer, 'proposal-0.json'),
    join(consumer, 'proposal-1.json'),
    '--registry',
    canonical,
  ]).duplicate,
  true,
);
assert(
  run([
    'registry',
    'compare',
    join(consumer, 'proposal-0.json'),
    join(consumer, 'proposal-1.json'),
    '--registry',
    canonical,
  ]).conflicts.length > 0,
);
run([
  'registry',
  'submit',
  join(consumer, 'proposal-0.json'),
  '--registry',
  canonical,
  '--expected-revision',
  '1',
]);
assert(
  run(
    [
      'registry',
      'submit',
      join(consumer, 'proposal-0.json'),
      '--registry',
      canonical,
      '--expected-revision',
      '1',
    ],
    1,
  ).error.includes('exist'),
);
assert(
  run(
    [
      'registry',
      'submit',
      join(consumer, 'proposal-1.json'),
      '--registry',
      canonical,
      '--expected-revision',
      '2',
    ],
    1,
  ).error.includes('Stale'),
);
checks.push('Discovery, duplicate conflict detection, proposal reservation, stale write refusal');
const out = join(consumer, 'atlas/agentic-dist');
const css = join(out, 'profile-tokens.css');
const originalCss = await readFile(css, 'utf8');
await writeFile(css, originalCss + '\n/* accidental drift */');
assert.equal(run(['maintain', 'scan', '--out', out], 1).status, 'local-regeneration-available');
const repair = run(['maintain', 'repair', '--out', out]);
assert.equal(repair.status, 'verified');
assert.equal(await readFile(css, 'utf8'), originalCss);
assert(
  (await readFile(join(repair.evidenceDirectory, 'profile-tokens.css.before'), 'utf8')).includes(
    'accidental drift',
  ),
);
assert.equal(run(['maintain', 'scan', '--out', out]).status, 'healthy');
checks.push('Real drift detected, repaired, backed up and independently rescanned');
const source = JSON.parse(await readFile(join(out, 'profile.json'), 'utf8'));
source.brand = '#112233';
await writeFile(join(out, 'profile.json'), JSON.stringify(source));
assert.equal(run(['maintain', 'repair', '--out', out], 1).status, 'owner-review-required');
assert.equal(await readFile(css, 'utf8'), originalCss);
checks.push('Changed approved source blocks automatic repair');
const unsafe = join(consumer, 'unsafe');
await mkdir(unsafe);
await symlink(css, join(unsafe, 'profile-tokens.css'));
assert(
  run(['profile', 'compile', fixture('profiles/aegis.json'), '--out', unsafe], 1).error.includes(
    'non-regular',
  ),
);
checks.push('Output symlink refused');
const product = join(consumer, 'independent-product');
await mkdir(join(product, 'src'), { recursive: true });
const patternPolicy = {
  schemaVersion: 2,
  product: 'independent-product',
  revision: 1,
  scope: 'src',
  pages: [{ id: 'records', source: 'src/records.tsx', patterns: ['header'] }],
  patterns: {
    header: {
      module: '@company/design-system/page-header',
      export: 'PageHeader',
      cardinality: { min: 1, max: 1 },
      requiredProps: ['title'],
      forbiddenProps: ['eyebrow'],
      forbiddenLocalTags: ['h1'],
    },
  },
  exceptions: [],
};
await writeFile(join(product, 'pattern-policy.json'), JSON.stringify(patternPolicy));
const productSource = join(product, 'src/records.tsx');
const agreedSource = `import { PageHeader as Header } from '@company/design-system/page-header';
export const Records = () => <Header title="Records"/>;`;
await writeFile(productSource, agreedSource);
const patternArgs = ['patterns', 'check', 'pattern-policy.json', '--project', product];
const patternPass = run(patternArgs);
assert.equal(patternPass.valid, true);
assert.equal(patternPass.checkedPatterns, 1);
assert.equal(patternPass.policy.product, 'independent-product');
assert.deepEqual(run(patternArgs), patternPass, 'Unchanged inputs produce the same evidence');
await writeFile(productSource, agreedSource.replace('title="Records"', 'eyebrow="Workspace"'));
const propDrift = run(patternArgs, 1);
assert.equal(propDrift.valid, false);
assert(propDrift.issues.some((entry) => entry.rule === 'required-prop:title'));
assert(propDrift.issues.some((entry) => entry.rule === 'forbidden-prop:eyebrow'));
await writeFile(
  productSource,
  agreedSource.replace('@company/design-system/page-header', './one-off-header'),
);
assert(run(patternArgs, 1).issues.some((entry) => entry.rule === 'missing-import'));
await writeFile(productSource, agreedSource);
assert.equal(run(patternArgs).valid, true);
checks.push(
  'Portable product policy accepts aliased public patterns and rejects prop/import drift without npm modules',
);
const report = {
  status: 'passed',
  consumer,
  checks,
  scope:
    'Standalone exported kit in a fresh directory with no source checkout or npm modules. Owner promotion is not performed by this test.',
};
await mkdir(join(root, 'artifacts'), { recursive: true });
await writeFile(
  join(root, 'artifacts/agent-kit-consumer.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
