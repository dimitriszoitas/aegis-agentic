import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sha = (text) => createHash('sha256').update(text).digest('hex');
let workspace, kit, core, manifest, lock, fixtureSequence = 0;
const sessions = new Set();
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
async function snapshot(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = [prefix, entry.name].filter(Boolean).join('/');
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else if (entry.isFile()) result[path] = sha(await readFile(join(root, path)));
  }
  return result;
}
async function project() {
  const root = join(workspace, `project-${++fixtureSequence}`);
  await mkdir(join(root, 'profile'), { recursive: true });
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'profile/profile.json'), await readFile(join(kit, 'profiles/atlas.json')));
  await writeFile(join(root, 'aegis-lock.json'), JSON.stringify(lock));
  await writeFile(join(root, 'pattern-policy.json'), JSON.stringify({ schemaVersion: 2, product: 'mcp-fixture', revision: 1, scope: 'src', pages: [{ id: 'customers', source: 'src/customers.tsx', patterns: ['pageHeader'] }], patterns: { pageHeader: { module: '@dimitriszoitas/aegis-agentic/patterns/page-header', export: 'PageHeader', cardinality: { min: 1, max: 1 }, requiredProps: ['title'] } }, exceptions: [] }));
  await writeFile(join(root, 'src/customers.tsx'), "import { PageHeader } from '@dimitriszoitas/aegis-agentic/patterns/page-header';\nexport const Customers = () => <PageHeader title=\"Customers\" />;\n");
  return root;
}
async function connect(args = [], selectedKit = kit, infer = false) {
  const transport = new StdioClientTransport({ command: process.execPath, args: [join(selectedKit, 'bin/aegis-mcp.mjs'), ...(infer ? [] : ['--kit', selectedKit]), ...args], cwd: workspace, stderr: 'pipe', env: { PATH: process.env.PATH, NODE_PATH: '' } });
  let stderr = '';
  transport.stderr.on('data', (chunk) => { stderr += chunk; });
  const client = new Client({ name: 'aegis-independent-integration-client', version: '1.0.0' }, { supportedProtocolVersions: ['2025-11-25'] });
  try { await client.connect(transport); }
  catch (error) { await transport.close(); throw new Error(`${error.message}\n${stderr}`, { cause: error }); }
  const session = { client, close: async () => { await client.close(); sessions.delete(session); }, stderr: () => stderr };
  sessions.add(session);
  return session;
}
async function call(client, name, args = {}) { const result = await client.callTool({ name, arguments: args }); assert.equal(result.isError, undefined, JSON.stringify(result)); return result.structuredContent ?? JSON.parse(result.content[0].text); }
async function callError(client, name, args = {}) { try { const result = await client.callTool({ name, arguments: args }); assert.equal(result.isError, true, JSON.stringify(result)); return result.content[0].text; } catch (error) { if (typeof error.code === 'number') return error.message; throw error; } }
async function copyKit() { const path = join(workspace, `kit-${++fixtureSequence}`); await cp(kit, path, { recursive: true }); return path; }
async function replaceCovered(path, relativePath, value) { await writeFile(join(path, relativePath), value); const integrity = await json(join(path, 'integrity.json')); integrity[relativePath] = sha(value); await writeFile(join(path, 'integrity.json'), JSON.stringify(integrity)); }

before(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'aegis-mcp-sdk-'));
  kit = join(workspace, 'agent-kit');
  await cp(join(repo, 'agent-kit'), kit, { recursive: true });
  await readFile(join(kit, 'bin/aegis-mcp.mjs')); // No source fallback: exercise the exported bundle.
  assert.ok(!(await readdir(kit)).includes('node_modules'));
  core = await import(pathToFileURL(join(kit, 'runtime/core.mjs')).href);
  manifest = await json(join(kit, 'kit.json'));
  lock = { schemaVersion: 1, consumer: 'mcp-test-fixture', package: manifest.name, version: manifest.version, registryRevision: manifest.registryRevision, kitIntegritySha256: sha(await readFile(join(kit, 'integrity.json'))), profileId: 'atlas', profileHash: core.compileProfile(await json(join(kit, 'profiles/atlas.json'))).hash, tarballSha256: sha('synthetic test provenance, no tarball bytes verified'), dependencySource: 'Synthetic integration fixture; no registry installation claim.' };
});
after(async () => { for (const session of sessions) await session.close(); if (workspace) await rm(workspace, { recursive: true, force: true }); });

test('isolated exported bundle negotiates protocol, discovers read-only tools/resources/prompts and preserves kit', async () => {
  const before = await snapshot(kit);
  const { client, close, stderr } = await connect([], kit, true);
  assert.equal(client.getServerVersion().name, 'aegis-agentic-readonly');
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools.map((item) => item.name).sort(), ['audit_product_patterns', 'inspect_project_context', 'search_contracts', 'validate_composition', 'validate_page_recipe']);
  assert.ok(tools.every((item) => item.annotations.readOnlyHint && !item.annotations.destructiveHint && !item.annotations.openWorldHint));
  const resources = (await client.listResources()).resources;
  assert.ok(resources.some((item) => item.uri === 'aegis://catalogue'));
  const catalogue = JSON.parse((await client.readResource({ uri: 'aegis://catalogue' })).contents[0].text);
  assert.deepEqual(catalogue.coverage, core.getContractCoverage());
  assert.equal(catalogue.entries.length, core.contractCatalogue.entries.length);
  for (const entry of core.contractCatalogue.entries) {
    if (entry.contract) assert.equal((await client.readResource({ uri: `aegis://contracts/${entry.id}` })).contents[0].text, await readFile(join(kit, entry.contract.source.path), 'utf8'));
  }
  const apiEntry = core.contractCatalogue.entries.find((entry) => entry.api);
  assert.equal((await client.readResource({ uri: `aegis://api/${apiEntry.id}` })).contents[0].text, await readFile(join(kit, apiEntry.api.source.path.replace(/^public\/ai\//, 'reference-api/ai/')), 'utf8'));
  assert.equal((await client.readResource({ uri: 'aegis://profiles/atlas' })).contents[0].text, await readFile(join(kit, 'profiles/atlas.json'), 'utf8'));
  assert.deepEqual(JSON.parse((await client.readResource({ uri: 'aegis://page-recipes' })).contents[0].text), core.pageLayoutRecipes);
  const context = await call(client, 'inspect_project_context');
  assert.equal(context.binding.status, 'unbound');
  assert.deepEqual(context.supportedProtocolVersions, ['2025-11-25']);
  const results = await call(client, 'search_contracts', { query: 'dialog', limit: 2 });
  assert.deepEqual(results.entries.map((item) => item.id), core.searchContracts('dialog').slice(0, 2).map((item) => item.id));
  assert.equal(results.total, core.searchContracts('dialog').length);
  assert.match(await callError(client, 'audit_product_patterns'), /requires startup --project/);
  assert.deepEqual((await client.listPrompts()).prompts.map((item) => item.name).sort(), ['audit_page', 'build_page']);
  for (const name of ['build_page', 'audit_page']) {
    const prompt = await client.getPrompt({ name, arguments: { task: 'Review customer detail' } });
    const text = prompt.messages[0].content.text;
    assert.ok(text.includes(await readFile(join(kit, `skills/${name === 'build_page' ? 'build-ui' : 'audit-ui'}/SKILL.md`), 'utf8')));
    assert.ok(text.includes(await readFile(join(kit, 'skills/references/page-composition.md'), 'utf8')));
    assert.ok(text.includes(await readFile(join(kit, 'skills/references/design-contract.md'), 'utf8')));
    assert.ok(text.includes(await readFile(join(kit, 'skills/references/pattern-policy.md'), 'utf8')));
    assert.match(text, /"status":"unbound"/);
  }
  assert.equal(stderr(), '');
  await close();
  assert.deepEqual(await snapshot(kit), before);
});

test('bound package lock uses shared validators and source audit without changing source', async () => {
  const root = await project(); const before = await snapshot(root);
  const { client, close } = await connect(['--project', root]);
  const context = await call(client, 'inspect_project_context');
  assert.equal(context.binding.profileId, 'atlas');
  assert.equal((await client.readResource({ uri: 'aegis://project-profile' })).contents[0].text, await readFile(join(root, 'profile/profile.json'), 'utf8'));
  assert.equal((await client.readResource({ uri: 'aegis://project-policy' })).contents[0].text, await readFile(join(root, 'pattern-policy.json'), 'utf8'));
  assert.equal(context.binding.status, 'bound');
  assert.equal(context.binding.tarballBytesVerified, false);
  assert.equal(context.binding.dependencySource, lock.dependencySource);
  const selection = { archetype: 'detail', slots: ['header', 'main', 'aside'], asideLabel: 'Customer summary' };
  assert.deepEqual((await call(client, 'validate_page_recipe', { selection })).issues, core.validatePageLayoutRecipe(selection));
  const invalid = { archetype: 'collection', slots: ['header', 'main', 'aside'], measure: 'wide' };
  const report = await call(client, 'validate_page_recipe', { selection: invalid });
  assert.equal(report.valid, false); assert.deepEqual(report.issues, core.validatePageLayoutRecipe(invalid));
  const spec = { ...await json(join(kit, 'examples/composition.json')), profileId: lock.profileId, profileHash: lock.profileHash };
  const resolved = await call(client, 'validate_composition', { spec });
  assert.deepEqual(resolved.resolved, core.resolveComposition(spec, core.registry));
  assert.equal(resolved.profileIdentityAndHashVerified, true); assert.equal(resolved.profileRevisionAttested, false);
  assert.match(await callError(client, 'validate_composition', { spec: { ...spec, profileId: 'wrong' } }), /profile ID\/hash/);
  assert.match(await callError(client, 'validate_composition', { spec: { ...spec, registryRevision: 99 } }), /registry/i);
  const audit = (await call(client, 'audit_product_patterns')).report;
  const engine = await import(pathToFileURL(join(kit, 'runtime/pattern-policy.mjs')).href);
  assert.deepEqual(audit, engine.auditPatternSources(await json(join(root, 'pattern-policy.json')), { 'src/customers.tsx': await readFile(join(root, 'src/customers.tsx'), 'utf8') }));
  assert.equal(audit.valid, true);
  await close(); assert.deepEqual(await snapshot(root), before);
});

test('compiled-profile lock verifies runtime and canonical source pin', async () => {
  const root = await project();
  const compiled = core.compileProfile(await json(join(root, 'profile/profile.json')));
  const profileLock = { schemaVersion: 1, profileHash: compiled.hash, approvedSourceSha256: sha(core.canonicalJson(compiled.profile)), runtimeSha256: sha(await readFile(join(kit, 'runtime/core.mjs'))), registryRevision: manifest.registryRevision, kitVersion: manifest.version };
  await writeFile(join(root, 'profile/profile-lock.json'), JSON.stringify(profileLock));
  const { client, close } = await connect(['--project', root, '--lock', 'profile/profile-lock.json']);
  assert.equal((await call(client, 'inspect_project_context')).binding.lockKind, 'compiled-profile-lock'); await close();
  await writeFile(join(root, 'profile/profile-lock.json'), JSON.stringify({ ...profileLock, runtimeSha256: '0'.repeat(64) }));
  await assert.rejects(connect(['--project', root, '--lock', 'profile/profile-lock.json']), /does not match installed/);
});

test('rejects unknown or mismatched project pins and traversal startup paths', async () => {
  const root = await project();
  for (const changed of [{ ...lock, schemaVersion: 2 }, { ...lock, version: '99.0.0' }, { ...lock, registryRevision: 99 }, { ...lock, kitIntegritySha256: '0'.repeat(64) }, { ...lock, profileHash: 'v1-unknown' }, { schemaVersion: 1, registryRevision: lock.registryRevision, profileHash: lock.profileHash }]) {
    await writeFile(join(root, 'aegis-lock.json'), JSON.stringify(changed));
    await assert.rejects(connect(['--project', root]), /pin|lock/i);
  }
  await writeFile(join(root, 'aegis-lock.json'), JSON.stringify(lock));
  for (const path of ['../secret.json', '/tmp/secret.json', 'profile/../../secret.json', 'profile\\secret.json']) await assert.rejects(connect(['--project', root, '--lock', path]), /normalized relative path/);
  await assert.rejects(connect(['--lock', 'aegis-lock.json']), /require --project/);
});

test('rejects arbitrary resource paths, invalid tool arguments and bounded input', async () => {
  const { client, close } = await connect();
  for (const uri of ['file:///etc/passwd', 'aegis://api/../../etc/passwd', 'aegis://contracts/%2e%2e%2fsecret', 'aegis://guidance/unknown']) await assert.rejects(client.readResource({ uri }));
  await callError(client, 'inspect_project_context', { project: '/etc' });
  await callError(client, 'search_contracts', { query: 'x'.repeat(257), limit: 10 });
  await callError(client, 'search_contracts', { query: '', limit: 31 });
  assert.match(await callError(client, 'validate_page_recipe', { selection: { notes: 'x'.repeat(33000) } }), /32 KiB/);
  let deep = {}; for (let i = 0; i < 20; i++) deep = { next: deep };
  assert.match(await callError(client, 'validate_page_recipe', { selection: deep }), /depth/);
  await close();
});

test('rejects symlink escape for lock, profile and declared source/policy scope', async () => {
  const root = await project(); const outside = join(workspace, 'outside.json'); await writeFile(outside, JSON.stringify(lock));
  await symlink(outside, join(root, 'escaped-lock.json'));
  await assert.rejects(connect(['--project', root, '--lock', 'escaped-lock.json']), /escapes configured root/);
  await symlink(join(kit, 'profiles/atlas.json'), join(root, 'escaped-profile.json'));
  await assert.rejects(connect(['--project', root, '--profile', 'escaped-profile.json']), /escapes configured root/);
  await rm(join(root, 'src/customers.tsx')); await symlink(outside, join(root, 'src/customers.tsx'));
  const { client, close } = await connect(['--project', root]);
  assert.match(await callError(client, 'audit_product_patterns'), /escapes the policy scope/); await close();
  await rm(join(root, 'src'), { recursive: true }); await symlink(workspace, join(root, 'src'));
  const next = await connect(['--project', root]);
  assert.match(await callError(next.client, 'audit_product_patterns'), /Policy scope escapes/); await next.close();
});

test('fails closed if bound profile/lock or loaded runtime changes after startup', async () => {
  const root = await project(); const { client, close } = await connect(['--project', root]);
  await writeFile(join(root, 'aegis-lock.json'), JSON.stringify({ ...lock, version: 'new' }));
  assert.match(await callError(client, 'inspect_project_context'), /pin\/profile changed/); await close();
  await writeFile(join(root, 'aegis-lock.json'), JSON.stringify(lock));
  const second = await connect(['--project', root]);
  await writeFile(join(root, 'profile/profile.json'), '{}');
  assert.match(await callError(second.client, 'validate_page_recipe', { selection: { archetype: 'settings' } }), /pin\/profile changed/); await second.close();
  const changedKit = await copyKit(); const third = await connect([], changedKit);
  await writeFile(join(changedKit, 'runtime/core.mjs'), '// changed after load');
  assert.match(await callError(third.client, 'validate_page_recipe', { selection: { archetype: 'settings' } }), /integrity mismatch/); await third.close();
});

test('rejects unsupported kit/compiler and inconsistent catalogue identities even with recomputed file hash', async () => {
  const changedKit = await copyKit();
  for (const change of [{ version: '0.5.0-unknown' }, { compilerVersion: '99' }, { version: '0.4.0-experiment.0', registryRevision: 3 }, { version: '0.5.0-experiment.0', registryRevision: 2 }]) {
    await replaceCovered(changedKit, 'kit.json', JSON.stringify({ ...manifest, ...change }));
    await assert.rejects(connect([], changedKit), /Unsupported kit identity/);
  }
  await replaceCovered(changedKit, 'kit.json', JSON.stringify(manifest));
  const runtime = await readFile(join(kit, 'runtime/core.mjs'), 'utf8');
  // A valid JS runtime with intentionally mismatched catalogue metadata, tested at the protocol boundary.
  await replaceCovered(changedKit, 'runtime/core.mjs', `${runtime}\n`);
  const sourceCatalogue = await json(join(kit, 'reference-api/ai/contract-catalogue.json'));
  // The bundled data contains this exact sourceDigest; altering registry identity via a wrapper avoids textual bundle assumptions.
  await writeFile(join(changedKit, 'runtime/original-core.mjs'), runtime);
  assert.ok(sourceCatalogue.entries.length > 0);
  for (const patch of ['schemaVersion:99', 'registryRevision:99', "package:{name:'unknown',version:'0.4.0-experiment.0'}", "package:{name:'@dimitriszoitas/aegis-agentic',version:'0.5.0-unknown'}"]) {
    const wrapper = `import * as source from './original-core.mjs';\nexport * from './original-core.mjs';\nexport const contractCatalogue = {...source.contractCatalogue, ${patch}};\n`;
    await replaceCovered(changedKit, 'runtime/core.mjs', wrapper);
    await assert.rejects(connect([], changedKit), /catalogue\/registry does not match/);
  }
});

test('rejects uncovered/tampered exact documents and excessive declared source reads', async () => {
  const changedKit = await copyKit(); const { client, close } = await connect([], changedKit);
  const contract = core.contractCatalogue.entries.find((entry) => entry.contract).contract;
  await writeFile(join(changedKit, contract.source.path), '{}');
  await assert.rejects(client.readResource({ uri: `aegis://contracts/${core.contractCatalogue.entries.find((entry) => entry.contract).id}` }), /integrity mismatch/); await close();
  const root = await project(); const second = await connect(['--project', root]);
  await writeFile(join(root, 'src/customers.tsx'), 'x'.repeat(256 * 1024 + 1));
  assert.match(await callError(second.client, 'audit_product_patterns'), /allowed size/); await second.close();
});


test('audit file-count/total-byte bounds and nonregular startup files fail without blocking', async () => {
  const root = await project();
  const policy = await json(join(root, 'pattern-policy.json'));
  const session = await connect(['--project', root]);
  await writeFile(join(root, 'pattern-policy.json'), JSON.stringify({ ...policy, pages: Array.from({ length: 101 }, (_, index) => ({ id: `page-${index}`, source: `src/page-${index}.tsx`, patterns: ['pageHeader'] })) }));
  assert.match(await callError(session.client, 'audit_product_patterns'), /100 source file limit/);
  await writeFile(join(root, 'pattern-policy.json'), JSON.stringify({ ...policy, pages: Array.from({ length: 9 }, (_, index) => ({ id: `page-${index}`, source: `src/page-${index}.tsx`, patterns: ['pageHeader'] })) }));
  for (let index = 0; index < 9; index++) await writeFile(join(root, `src/page-${index}.tsx`), ' '.repeat(256 * 1024));
  assert.match(await callError(session.client, 'audit_product_patterns'), /2 MiB source total limit/);
  await session.close();
  if (process.platform !== 'win32') {
    execFileSync('mkfifo', [join(root, 'fifo-lock')]);
    await assert.rejects(connect(['--project', root, '--lock', 'fifo-lock']), /not regular/);
  }
});


test('schema2 authored contracts retain requirements and source references through read-only MCP discovery', async () => {
  assert.equal(manifest.version, '0.5.0-experiment.0', 'Build the new contract-bearing kit before this suite.');
  assert.equal(manifest.registryRevision, 3);
  const { client, close } = await connect();
  const catalogue = JSON.parse((await client.readResource({ uri: 'aegis://catalogue' })).contents[0].text);
  const required = ['data-grid', 'filter-bar', 'page-header', 'side-nav', 'tabs', 'pagination', 'metric-card', 'sparkline', 'description-list', 'empty-state', 'text-input', 'textarea', 'search-input', 'select', 'checkbox', 'switch', 'segmented-control', 'side-sheet', 'popover', 'dropdown-menu'];
  for (const id of required) {
    const entry = core.getContractEntry(id);
    assert.ok(entry?.contract, `Missing authored contract ${id}`);
    const summary = catalogue.entries.find((item) => item.id === entry.id);
    const raw = (await client.readResource({ uri: summary.resources.contract })).contents[0].text;
    assert.equal(raw, entry.contract.raw);
    const contract = JSON.parse(raw);
    assert.equal(contract.schemaVersion, 2);
    assert.equal(contract.verification, 'not-certified-by-this-contract');
    assert.ok(contract.requirements.length > 0);
    assert.deepEqual(summary.contract.source, entry.contract.source);
    assert.deepEqual(summary.contract.references, entry.contract.references);
    for (const requirement of contract.requirements) {
      assert.ok(requirement.sources.length > 0);
      for (const path of requirement.sources) {
        const reference = summary.contract.references.find((item) => item.path === path);
        assert.ok(reference, `${id}/${requirement.id}: missing requirement source ${path}`);
        assert.match(reference.sha256, /^[a-f0-9]{64}$/);
      }
    }
    const search = await call(client, 'search_contracts', { query: id, limit: 30 });
    const found = search.entries.find((item) => item.id === entry.id);
    assert.deepEqual(found?.contract, summary.contract);
  }
  const legacy = core.contractCatalogue.entries.find((entry) => entry.contract?.document.schemaVersion === 1);
  assert.ok(legacy, 'Legacy authored entries remain discoverable');
  assert.deepEqual(catalogue.entries.find((entry) => entry.id === legacy.id).contract.references, legacy.contract.references ?? []);
  await close();
});
