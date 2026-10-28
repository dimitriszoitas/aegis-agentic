import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const repo = '/private/tmp/aegis-agentic-experiment';
const require = createRequire(join(repo, 'mcp/package.json'));
const { Client } = await import(pathToFileURL(require.resolve('@modelcontextprotocol/client')).href);
const { StdioClientTransport } = await import(pathToFileURL(require.resolve('@modelcontextprotocol/client/stdio')).href);
const sha = value => createHash('sha256').update(value).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
async function snapshot(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = [prefix, entry.name].filter(Boolean).join('/');
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else if (entry.isFile()) result[path] = sha(await readFile(join(root, path)));
  }
  return result;
}
const workspace = await mkdtemp('/private/tmp/aegis-mcp-v06-compat-');
const adapter = join(repo, 'agent-kit/bin/aegis-mcp.mjs');
const current = await json(join(repo, 'agent-kit/kit.json'));
assert.equal(current.version, '0.6.0-experiment.0');
assert.equal(current.registryRevision, 4);
const report = { status:'running', adapterSha256:sha(await readFile(adapter)), adapterVersion:current.version, workspace, runs:[] };
const call = async (client, name, args={}) => { const result=await client.callTool({name,arguments:args}); assert.equal(result.isError, undefined, JSON.stringify(result)); return result.structuredContent ?? JSON.parse(result.content[0].text); };
try {
  for (const [kit, version, revision] of [
    ['/private/tmp/aegis-mcp-prior-kit-BN7x7g','0.4.0-experiment.0',2],
    ['/private/tmp/aegis-mcp-prior-v05-kit','0.5.0-experiment.0',3],
  ]) {
    const before=await snapshot(kit);
    const manifest=await json(join(kit,'kit.json'));
    assert.equal(manifest.version,version); assert.equal(manifest.registryRevision,revision);
    const core=await import(pathToFileURL(join(kit,'runtime/core.mjs')).href);
    const project=join(workspace,version);
    await mkdir(join(project,'profile'),{recursive:true});
    const profile=await json(join(kit,'profiles/atlas.json'));
    await writeFile(join(project,'profile/profile.json'),JSON.stringify(profile));
    const lock={schemaVersion:1,package:manifest.name,version,registryRevision:revision,kitIntegritySha256:sha(await readFile(join(kit,'integrity.json'))),profileId:profile.id,profileHash:core.compileProfile(profile).hash,tarballSha256:sha('compatibility fixture only'),dependencySource:'Synthetic compatibility lock; no registry installation claim.'};
    await writeFile(join(project,'aegis-lock.json'),JSON.stringify(lock));
    const transport=new StdioClientTransport({command:process.execPath,args:[adapter,'--kit',kit,'--project',project],cwd:workspace,stderr:'pipe',env:{PATH:process.env.PATH,NODE_PATH:''}});
    let stderr=''; transport.stderr.on('data',chunk=>stderr+=chunk);
    const client=new Client({name:'aegis-v06-prior-kit-client',version:'1.0.0'},{supportedProtocolVersions:['2025-11-25']});
    try {
      await client.connect(transport);
      const context=await call(client,'inspect_project_context');
      assert.equal(context.kit.version,version);assert.equal(context.kit.registryRevision,revision);assert.equal(context.binding.status,'bound');
      assert.equal((await client.listTools()).tools.length,5);
      const resource=await client.readResource({uri:'aegis://catalogue'});
      const catalogue=JSON.parse(resource.contents[0].text);
      assert.equal(catalogue.entries.length,core.contractCatalogue.entries.length);
      assert.deepEqual(catalogue.coverage,core.getContractCoverage());
      const dialog=core.getContractEntry('dialog');
      assert.equal((await client.readResource({uri:`aegis://contracts/${dialog.id}`})).contents[0].text,dialog.contract.raw);
      if (revision===3) {
        const entry=core.getContractEntry('data-grid');
        const summary=catalogue.entries.find(item=>item.id===entry.id);
        assert.equal(JSON.parse((await client.readResource({uri:summary.resources.contract})).contents[0].text).schemaVersion,2);
        assert.deepEqual(summary.contract.references,entry.contract.references);
      }
      const search=await call(client,'search_contracts',{query:'dialog',limit:30});
      assert.deepEqual(search.entries.map(item=>item.id),core.searchContracts('dialog').slice(0,30).map(item=>item.id));
      const selection={archetype:'settings',slots:['header','main'],measure:'comfortable'};
      assert.deepEqual((await call(client,'validate_page_recipe',{selection})).issues,core.validatePageLayoutRecipe(selection));
      const spec={...await json(join(kit,'examples/composition.json')),profileId:lock.profileId,profileHash:lock.profileHash};
      assert.deepEqual((await call(client,'validate_composition',{spec})).resolved,core.resolveComposition(spec,core.registry));
      const resourceBytes=Buffer.byteLength(JSON.stringify(resource));
      assert(resourceBytes<256*1024);
      report.runs.push({kit,version,registryRevision:revision,status:'passed',catalogueEntries:catalogue.entries.length,resourceEnvelopeBytes:resourceBytes,kitIntegritySha256:lock.kitIntegritySha256,sourceSnapshotSha256:sha(JSON.stringify(before)),checks:['SDK connection and five tools','actual old bound project lock','exact legacy contract','catalogue metadata and source references','search parity','page recipe validator parity','composition validator parity','unchanged kit bytes']});
      assert.equal(stderr,'');
    } finally { await client.close(); }
    assert.deepEqual(await snapshot(kit),before);
  }
  report.status='passed';
} catch(error) { report.status='failed';report.error=error.stack;process.exitCode=1; }
await writeFile(join(workspace,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
