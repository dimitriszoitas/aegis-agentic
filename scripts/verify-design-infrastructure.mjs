import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const consumer = await mkdtemp(join(tmpdir(), 'aegis-design-infrastructure-'));
const checks = [];
try {
  const kit = join(consumer, 'kit');
  await cp(join(root, 'agent-kit'), kit, { recursive: true });
  const core = await import(pathToFileURL(join(kit, 'runtime/core.mjs')).href);
  const cli = join(kit, 'bin/aegis.mjs');
  const run = (args, expected = 0) => {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd: consumer,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 64 * 1024 * 1024,
      env: { PATH: process.env.PATH, NODE_PATH: '' },
    });
    assert.equal(
      result.status,
      expected,
      `${args.join(' ')}\n${result.error ?? ''}\n${result.stderr ?? ''}\n${result.stdout?.slice(-2000)}`,
    );
    return JSON.parse(result.stdout);
  };
  const fixture = async (name, value) => {
    const path = join(consumer, name);
    await writeFile(path, JSON.stringify(value));
    return path;
  };
  const project = {
    schemaVersion: 1,
    project: 'consumer-proof',
    revision: 1,
    recipes: {
      collection: { filters: 'push', density: 'compact' },
      settings: { measure: 'compact' },
      dashboard: { maxColumns: 2 },
    },
  };
  const projectFile = await fixture('project-recipes.json', project);
  assert.equal(run(['project-recipes', 'validate', projectFile]).valid, true);
  for (const archetype of ['collection', 'detail', 'settings', 'dashboard']) {
    const expected = core.resolveProjectRecipe(project, archetype);
    assert.deepEqual(
      run(['project-recipes', 'resolve', projectFile, '--archetype', archetype]),
      expected,
    );
    assert.equal(
      expected.stableHash,
      core.resolveProjectRecipe(core.normalizeProjectRecipes(project), archetype).stableHash,
    );
  }
  const invalid = await fixture('invalid-recipes.json', {
    ...project,
    recipes: { collection: { filters: 'modal' } },
  });
  assert.equal(run(['project-recipes', 'validate', invalid], 1).valid, false);
  assert.match(
    run(['project-recipes', 'resolve', invalid, '--archetype', 'collection'], 1).error,
    /filters/,
  );
  const discovery = run([
    'discover',
    'behavior',
    'filters beside a table',
    '--recipes',
    projectFile,
  ]);
  assert.equal(discovery.selectedIntent, 'push-filtering');
  assert.equal(discovery.projectRecipe.variants.density, 'compact');
  assert.ok(discovery.rejections.some((item) => item.component === 'SideSheet'));
  assert.equal(run(['discover', 'behavior', 'side panel']).status, 'ambiguous');
  assert.equal(
    core.discoverByBehavior({
      query: 'filters beside a table',
      projectRecipes: project,
      requestedComponent: 'SideSheet',
    }).status,
    'rejected',
  );
  assert.equal(await readFile(projectFile, 'utf8'), JSON.stringify(project));
  checks.push(
    'Four project archetypes resolve identically through the isolated core and CLI; unsupported variants fail and push/modal ambiguity remains explicit.',
  );

  const profileFile = join(kit, 'profiles/atlas.json');
  const profileText = await readFile(profileFile, 'utf8');
  const profile = JSON.parse(profileText);
  const brand = run(['brand', 'export', profileFile, '--version', '1.0.0-beta.1']);
  const brandFile = await fixture('brand.json', brand);
  assert.deepEqual(brand, core.createBrandPackage(profile, { packageVersion: '1.0.0-beta.1' }));
  assert.equal(run(['brand', 'validate', brandFile]).valid, true);
  assert.equal(
    core.serializeBrandPackage(JSON.parse(core.serializeBrandPackage(brand))),
    core.serializeBrandPackage(brand),
  );
  const preview = run(['brand', 'preview', brandFile, '--profile', profileFile]);
  assert.equal(preview.valid, true);
  assert.equal(preview.changes.length, 0);
  const modified = await fixture(
    'changed-brand.json',
    core.createBrandPackage({ ...profile, brand: '#663399' }),
  );
  assert.ok(
    run(['brand', 'preview', modified, '--profile', profileFile]).changes.some(
      (change) => change.field === 'brand',
    ),
  );
  const unsafe = await fixture('invalid-brand.json', { ...brand, install: 'run arbitrary code' });
  assert.equal(run(['brand', 'validate', unsafe], 1).valid, false);
  assert.equal(core.previewBrandPackage(brand, profile).compiled.manifest.configurations.length, 4);
  assert.equal(await readFile(profileFile, 'utf8'), profileText);
  checks.push(
    'Brand packages round-trip deterministically, preview configuration changes across four modes, preserve the existing profile and reject executable hooks.',
  );

  const tokens = {
    palette: {
      $type: 'color',
      source: { $value: { colorSpace: 'srgb', components: [0.4, 0.2, 0.6] } },
      brand: { $value: '{palette.source}' },
    },
    corners: { $type: 'dimension', radius: { $value: { value: 12, unit: 'px' } } },
    $extensions: { 'consumer.example': { preserve: 'opaque data' } },
  };
  const tokensFile = await fixture('tokens.json', tokens);
  const mapping = [
    { field: 'brand', tokenPath: 'palette.brand' },
    { field: 'radius', tokenPath: 'corners.radius' },
  ];
  const mappingFile = await fixture('mapping.json', mapping);
  const inspected = run(['tokens', 'inspect', tokensFile]);
  assert.equal(inspected.valid, true);
  assert.deepEqual(inspected.document, tokens);
  const mapped = run([
    'tokens',
    'preview',
    tokensFile,
    '--profile',
    profileFile,
    '--mapping',
    mappingFile,
  ]);
  assert.equal(mapped.valid, true);
  assert.equal(mapped.profile.brand, '#663399');
  assert.equal(mapped.profile.radius, 'round');
  const emptyMapping = await fixture('missing-mapping.json', []);
  assert.equal(
    run(['tokens', 'preview', tokensFile, '--profile', profileFile, '--mapping', emptyMapping], 1)
      .valid,
    false,
  );
  const cyclicFile = await fixture('cyclic-tokens.json', {
    a: { $type: 'number', $value: '{b}' },
    b: { $type: 'number', $value: '{a}' },
  });
  assert.equal(run(['tokens', 'inspect', cyclicFile], 1).valid, false);
  const exported = run(['tokens', 'export', profileFile]);
  assert.deepEqual(Object.keys(exported.documents), [...core.configurations]);
  assert.equal(exported.stats.exported + exported.stats.omitted, exported.stats.total);
  for (const document of Object.values(exported.documents)) {
    const parsed = core.inspectDtcg(document);
    assert.equal(parsed.valid, true);
    for (const token of parsed.tokens.filter((item) => item.alias)) {
      if (token.path.startsWith('group.')) assert.ok(token.alias.startsWith('semantic.'));
      if (token.path.startsWith('semantic.')) assert.ok(token.alias.startsWith('primitive.'));
    }
  }
  assert.equal(await readFile(profileFile, 'utf8'), profileText);
  assert.equal(await readFile(tokensFile, 'utf8'), JSON.stringify(tokens));
  checks.push(
    'DTCG imports require explicit mappings, preserve aliases/extensions and source inputs, reject cycles, and export four tier-preserving documents with omission diagnostics.',
  );
  process.stdout.write(
    JSON.stringify(
      {
        valid: true,
        scope: 'Isolated generated kit core and CLI; no rendered or accessibility certification.',
        checks,
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
