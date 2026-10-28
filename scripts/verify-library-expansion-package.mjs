/** Verify the library-completion scope through an actual tarball, with no source aliases. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'artifacts/library-completion-package');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const scopePath = 'experiments/library-completion/scope.json';
const scopeText = await readFile(join(root, scopePath), 'utf8');
const { families } = JSON.parse(scopeText);
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const consumer = await mkdtemp(join(tmpdir(), 'aegis-library-expansion-consumer-'));
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 1,
  status: 'running',
  package: { name: manifest.name, version: manifest.version },
  scope: { path: scopePath, sha256: hash(scopeText), families: families.length },
  dependencySource: 'local-third-party-node_modules-snapshot',
  consumer,
  checks: [],
  limits: [
    'The Aegis package is unpacked from its actual npm tarball into an isolated consumer. Third-party dependencies and build tools are reused from the local checkout; this is not a clean registry installation.',
    'Public declarations, export identity, server markup, production bundling and shipped agent discovery are checked. Browser interaction, accessibility and visual behavior require the separate browser audits.',
    'Contract coverage establishes packaged ownership and exact authored bytes, not behavioral certification. Server rendering does not exercise client-only editing or navigation behavior.',
  ],
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: consumer,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

const typeSamples = `
const combobox: ComboboxProps = { label: 'Owner', name: 'owner', options: [{value:'ada',label:'Ada'}], defaultValue:'ada', filterOptions:false, loading:false, onValueChange:(value,details)=>{ const selected:string|null=value; if(selected==='blocked') details.cancel(); }, onInputValueChange:(query,details)=>{ query.toUpperCase(); String(details.reason); } };
const otp: OtpInputProps = { label:'Verification code', name:'otp', defaultValue:'001234', length:6, onComplete:(code)=>{ code.toUpperCase(); } };
const time: TimePickerProps = { label:'Start time', name:'start', defaultValue:'09:30', min:'08:00', max:'18:00', step:60, onValueChange:(value)=>{ value.toUpperCase(); } };
const dateTime: DateTimePickerProps = { label:'Appointment', name:'appointment', defaultValue:'2027-04-12T09:30', timeZone:'Europe/Athens' };
const phone: PhoneInputProps = { label:'Phone', name:'phone', defaultCountry:'US', countries:['US','GB'], defaultValue:'2025550123', onCountryChange:(country)=>{ country.toUpperCase(); }, onValueCommit:(result)=>{ const candidate:string|null=result.e164; const valid:boolean=result.valid; void candidate; void valid; } };
const color: ColorPickerProps = { label:'Label color', name:'color', defaultValue:'#33669980', alpha:true, swatches:[{value:'#336699FF',label:'Blue'}], onValueChange:(hex)=>{ hex.toUpperCase(); }, onDraftChange:(draft)=>{ draft.toUpperCase(); } };
const inline: InlineEditProps = { label:'Project name', value:'Relay', validate:(draft)=>draft.trim()?null:'Required', onSave:async(draft,context)=>{ const previous:string=context.previousValue; void draft; void previous; } };
const document: RichTextDocument = {type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Project notes',marks:[{type:'bold'}]}]}]};
const richText: RichTextEditorProps = { label:'Notes', name:'notes', defaultValue:document, onValueChange:(next)=>{ const type:string|undefined=next.type; void type; } };
const richTextRef = createRef<RichTextEditorHandle>();
const sortable: SortableListProps = { label:'Priority order', items:[{id:'one',label:'First'},{id:'two',label:'Second'}], onReorder:(ids,details)=>{ const source:'drag'|'move-button'=details.source; ids.map(String); void source; } };
const file: FilePreviewProps = { file:{name:'brief.pdf',url:'/brief.pdf',mimeType:'application/pdf',size:2048,modifiedLabel:'12 April 2027'}, preview:false };
const summary: FormErrorSummaryProps = { errors:[{id:'owner-required',fieldId:'owner-field',message:'Choose an owner'}], focusField:(error)=>{ error.fieldId.toUpperCase(); } };
const resource: ResourceStateProps = { label:'Records', status:'ready', children:<p>Loaded records</p> };
type RecordData = { title:string };
const record: RecordEditorProps<RecordData> = { recordId:'project-1', record:{title:'Relay'}, version:1, title:'Project record', createDraft:(current)=>({...current}), isEqual:(a,b)=>a.title===b.title, renderView:(current)=><p>{current.title}</p>, renderFields:({draft,onDraftChange,disabled})=><input aria-label="Project title" value={draft.title} disabled={disabled} onChange={(event)=>onDraftChange({title:event.target.value})}/>, onSave:async(draft,operation)=>{ const signal:AbortSignal=operation.signal; const expected:string|number=operation.expectedVersion; void signal; void expected; return {record:draft,version:2}; } };
const shell: AppShellProps = { brand:'Relay', navigation:({compact,closeNavigation})=><a href="#content" onClick={()=>{ if(compact) closeNavigation(); }}>Overview</a>, mainId:'content', children:<p>Workspace content</p> };
const guard: UnsavedNavigationGuardProps = { dirty:true, beforeUnload:false, onDiscard:async()=>{}, children:({requestNavigation,pending})=><button disabled={pending} onClick={()=>{ void requestNavigation(async()=>{}); }}>Leave editor</button> };
const indicator: IndicatorProps = { label:'12 unread notifications', count:12, children:<button>Notifications</button> };
const presence: PresenceIndicatorProps = { status:'online', label:'Ada is online', showLabel:false };
// @ts-expect-error Date/time consumers must declare an interpretation policy.
const missingZone: DateTimePickerProps = {label:'Appointment'};
// @ts-expect-error Terminal error state cannot silently retain children.
const invalidResource: ResourceStateProps = {label:'Records',status:'error',children:<p>Old records</p>};
void missingZone; void invalidResource;
export const examples = <>
  <Combobox {...combobox}/><OtpInput {...otp}/><TimePicker {...time}/><DateTimePicker {...dateTime}/>
  <PhoneInput {...phone}/><ColorPicker {...color}/><InlineEdit {...inline}/><RichTextEditor {...richText} ref={richTextRef}/>
  <SortableList {...sortable}/><FilePreview {...file}/><FormErrorSummary {...summary}/><ResourceState {...resource}/>
  <RecordEditor {...record}/><AppShell {...shell}/><UnsavedNavigationGuard {...guard}/><Indicator {...indicator}/><PresenceIndicator {...presence}/>
</>;
`;

const ssrSamples = String.raw`
const samples = {
  Combobox: {label:'Owner',name:'owner',defaultValue:'ada',options:[{value:'ada',label:'Ada'}]},
  OtpInput: {label:'Code',name:'otp',defaultValue:'001234',length:6},
  TimePicker: {label:'Start',name:'start',defaultValue:'09:30'},
  DateTimePicker: {label:'Appointment',name:'appointment',defaultValue:'2027-04-12T09:30',timeZone:'Europe/Athens'},
  PhoneInput: {label:'Phone',name:'phone',defaultCountry:'US',countries:['US','GB'],defaultValue:'2025550123'},
  ColorPicker: {label:'Color',name:'color',defaultValue:'#33669980',alpha:true},
  InlineEdit: {label:'Project name',value:'Relay',onSave:async()=>{}},
  RichTextEditor: {label:'Notes',name:'notes',defaultValue:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Project notes'}]}]}},
  SortableList: {label:'Priority order',items:[{id:'one',label:'First'},{id:'two',label:'Second'}],onReorder:()=>{}},
  FilePreview: {file:{name:'brief.pdf',url:'/brief.pdf',mimeType:'application/pdf',size:2048},preview:false},
  FormErrorSummary: {errors:[{id:'owner-required',fieldId:'owner-field',message:'Choose an owner'}]},
  ResourceState: {label:'Records',status:'ready',children:h('p',null,'Loaded records')},
  RecordEditor: {recordId:'project-1',record:{title:'Relay'},version:1,title:'Project record',createDraft:(value)=>({...value}),isEqual:(a,b)=>a.title===b.title,renderView:(value)=>h('p',null,value.title),renderFields:()=>h('input',{'aria-label':'Project title'}),onSave:async(record)=>({record,version:2})},
  AppShell: {brand:'Relay',navigation:()=>h('a',{href:'#content'},'Overview'),mainId:'content',children:h('p',null,'Workspace content')},
  UnsavedNavigationGuard: {dirty:false,beforeUnload:false,children:({pending})=>h('button',{disabled:pending},'Leave editor')},
  Indicator: {label:'12 unread notifications',count:12,children:h('button',null,'Notifications')},
  PresenceIndicator: {status:'online',label:'Ada is online',showLabel:false},
};
assert.deepEqual(Object.keys(samples).sort(), families.map((family)=>family.name).sort(), 'Every scoped family needs a server-rendered sample');
const markup = {};
for (const family of families) {
  const direct = await import(packageName + family.importPath.slice(1));
  assert.equal(typeof direct[family.name] === 'function' || typeof direct[family.name] === 'object',true,family.name+' has no renderable direct export');
  assert.equal(direct[family.name],root[family.name],family.name+' root/direct identity differs');
  if(family.importPath.startsWith('./patterns/')) assert.equal(direct[family.name],patterns[family.name],family.name+' pattern/direct identity differs');
  markup[family.name] = render(h(direct[family.name], samples[family.name]));
  assert(markup[family.name].includes(family.root.slice(1)),family.name+' server markup is missing its root');
}
assert.match(markup.Combobox,/role="combobox"/); assert.match(markup.Combobox,/name="owner"/); assert.match(markup.Combobox,/value="ada"/);
assert.match(markup.OtpInput,/autoComplete="one-time-code"/i); assert.match(markup.OtpInput,/value="001234"/); assert.match(markup.OtpInput,/name="otp"/);
assert.match(markup.TimePicker,/type="time"/); assert.match(markup.TimePicker,/value="09:30"/);
assert.match(markup.DateTimePicker,/type="datetime-local"/); assert.match(markup.DateTimePicker,/Europe\/Athens/); assert.match(markup.DateTimePicker,/value="2027-04-12T09:30"/);
assert.match(markup.PhoneInput,/type="tel"/); assert.match(markup.PhoneInput,/value="2025550123"/);
assert.match(markup.ColorPicker,/name="color"/); assert.match(markup.ColorPicker,/value="#33669980"/); assert.match(markup.ColorPicker,/type="color"/);
assert.match(markup.InlineEdit,/Relay/); assert.doesNotMatch(markup.InlineEdit,/<input[ >]/);
assert.match(markup.RichTextEditor,/type="hidden"/); assert.match(markup.RichTextEditor,/name="notes"/); assert.match(markup.RichTextEditor,/Project notes/);
assert.match(markup.SortableList,/First/); assert.match(markup.SortableList,/Second/); assert.match(markup.SortableList,/<ul[ >]/);
assert.match(markup.FilePreview,/href="\/brief.pdf"/); assert.doesNotMatch(markup.FilePreview,/<(?:iframe|object|embed)[ >]/);
assert.match(markup.FormErrorSummary,/href="#owner-field"/); assert.match(markup.FormErrorSummary,/Choose an owner/);
assert.match(markup.ResourceState,/data-resource-state="ready"/); assert.match(markup.ResourceState,/Loaded records/);
assert.match(markup.RecordEditor,/Project record/); assert.match(markup.RecordEditor,/Relay/);
assert.match(markup.AppShell,/<main[^>]*id="content"/); assert.match(markup.AppShell,/href="#content"/);
assert.match(markup.UnsavedNavigationGuard,/Leave editor/); assert.doesNotMatch(markup.UnsavedNavigationGuard,/role="(?:alert)?dialog"/);
assert.match(markup.Indicator,/aria-label="12 unread notifications"/); assert.match(markup.PresenceIndicator,/aria-label="Ada is online"/);
await writeFile('ssr-result.json', JSON.stringify({families:families.map((family)=>({name:family.name,bytes:Buffer.byteLength(markup[family.name])})),rootIdentities:families.length,patternIdentities:families.filter((family)=>family.importPath.startsWith('./patterns/')).length},null,2)+String.fromCharCode(10));
`;

try {
  assert.equal(
    families.length,
    17,
    'This verifier covers the agreed seventeen-family addition scope',
  );
  assert.equal(new Set(families.map((family) => family.name)).size, families.length);
  const packed = JSON.parse(
    run('npm', [
      'pack',
      root,
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      consumer,
      '--cache',
      join(consumer, '.npm-cache'),
    ]),
  );
  assert.equal(packed.length, 1);
  const tarball = join(consumer, packed[0].filename);
  report.tarball = { path: tarball, sha256: hash(await readFile(tarball)) };
  const installed = join(consumer, 'node_modules', manifest.name);
  await mkdir(installed, { recursive: true });
  run('tar', ['-xzf', tarball, '-C', installed, '--strip-components=1']);
  const packedManifestText = await readFile(join(installed, 'package.json'), 'utf8');
  const packedManifest = JSON.parse(packedManifestText);
  assert.equal(packedManifest.name, manifest.name);
  assert.equal(packedManifest.version, manifest.version);
  report.package.manifestSha256 = hash(packedManifestText);
  report.dependencyLock = {
    path: 'pnpm-lock.yaml',
    sha256: hash(await readFile(join(root, 'pnpm-lock.yaml'))),
  };
  const ownScope = manifest.name.startsWith('@') ? manifest.name.split('/')[0] : manifest.name;
  const reused = [];
  for (const entry of await readdir(join(root, 'node_modules'), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === ownScope) continue;
    await symlink(
      join(root, 'node_modules', entry.name),
      join(consumer, 'node_modules', entry.name),
    );
    reused.push(entry.name);
  }
  report.reusedDependencyEntries = reused.sort();
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await writeFile(
    join(consumer, 'index.html'),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Library expansion consumer</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  );
  for (const family of families) {
    const entry = packedManifest.exports[family.importPath];
    assert(entry?.types && entry.import, `Missing packed public export: ${family.importPath}`);
    await readFile(join(installed, entry.types));
    await readFile(join(installed, entry.import));
  }
  report.checks.push(
    'The tarball contains all seventeen declared public module entries and declaration files.',
  );
  const imports = families
    .map(
      (family) =>
        `import { ${family.name}, type ${family.name}Props } from '${manifest.name + family.importPath.slice(1)}';`,
    )
    .join('\n');
  const identities = families
    .map(
      (family) =>
        `if (${family.name} !== Root.${family.name}${family.importPath.startsWith('./patterns/') ? ` || ${family.name} !== Patterns.${family.name}` : ''}) throw new Error('${family.name} export identity differs');`,
    )
    .join('\n');
  const main = `import { createRef } from 'react';\nimport { createRoot } from 'react-dom/client';\n${imports}\nimport * as Root from '${manifest.name}';\nimport * as Patterns from '${manifest.name}/patterns';\nimport type { RichTextDocument, RichTextEditorHandle } from '${manifest.name}/rich-text-editor';\nimport '${manifest.name}/styles.css';\n${identities}\n${typeSamples}\ncreateRoot(globalThis.document.getElementById('root')!).render(examples);\n`;
  await writeFile(join(consumer, 'main.tsx'), main);
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: false,
        noEmit: true,
      },
      include: ['main.tsx'],
    }),
  );
  run(process.execPath, [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    join(consumer, 'tsconfig.json'),
  ]);
  report.checks.push(
    'All seventeen installed prop types, callback details, editor ref and generic record type compile strictly; omitted date/time zone and invalid resource children are rejected.',
  );
  const ssr = `import assert from 'node:assert/strict';\nimport { writeFile } from 'node:fs/promises';\nimport { createElement as h } from 'react';\nimport { renderToStaticMarkup as render } from 'react-dom/server';\nimport * as root from '${manifest.name}';\nimport * as patterns from '${manifest.name}/patterns';\nconst packageName=${JSON.stringify(manifest.name)};\nconst families=${JSON.stringify(families)};\n${ssrSamples}`;
  await writeFile(join(consumer, 'verify.mjs'), ssr);
  run(process.execPath, [join(consumer, 'verify.mjs')]);
  report.ssr = JSON.parse(await readFile(join(consumer, 'ssr-result.json'), 'utf8'));
  report.checks.push(
    'All seventeen components render from installed modules; root/direct identity and all five pattern-barrel identities match, with native values and representative markup preserved.',
  );
  await build({
    configFile: false,
    root: consumer,
    logLevel: 'warn',
    build: { outDir: 'dist', emptyOutDir: true },
    resolve: { dedupe: ['react', 'react-dom'] },
  });
  const assets = join(consumer, 'dist/assets');
  const assetNames = await readdir(assets);
  const css = (
    await Promise.all(
      assetNames
        .filter((name) => name.endsWith('.css'))
        .map((name) => readFile(join(assets, name), 'utf8')),
    )
  ).join('\n');
  for (const family of families)
    assert(css.includes(family.root.slice(1)), `Missing packed styles for ${family.name}`);
  assert(
    assetNames.some((name) => name.endsWith('.js')),
    'Production build produced no JavaScript',
  );
  report.productionAssets = await Promise.all(
    assetNames.map(async (name) => {
      const bytes = await readFile(join(assets, name));
      return { name, bytes: bytes.length, sha256: hash(bytes) };
    }),
  );
  report.checks.push(
    'A real Vite production build imports all seventeen examples without source aliases and includes each family’s packaged CSS.',
  );
  const kitRoot = join(installed, 'agent-kit');
  const kitText = await readFile(join(kitRoot, 'kit.json'), 'utf8');
  const kit = JSON.parse(kitText);
  assert.equal(kit.name, manifest.name);
  assert.equal(kit.version, manifest.version);
  const catalogueText = await readFile(join(kitRoot, kit.contractCatalogue.path), 'utf8');
  const catalogue = JSON.parse(catalogueText);
  const coverageText = await readFile(join(kitRoot, kit.publicEntryCoverage.path), 'utf8');
  const coverage = JSON.parse(coverageText);
  for (const document of [catalogue, coverage]) {
    assert.deepEqual(document.package, { name: manifest.name, version: manifest.version });
    assert.equal(document.registryRevision, kit.registryRevision);
  }
  report.kit = {
    version: kit.version,
    registryRevision: kit.registryRevision,
    manifestSha256: hash(kitText),
    catalogueSha256: hash(catalogueText),
    publicEntryCoverageSha256: hash(coverageText),
  };
  report.families = [];
  for (const family of families) {
    const entry = catalogue.entries.find((entry) => entry.apiFamilyId === family.id);
    assert(
      entry?.api && entry.contract?.document.schemaVersion === 2,
      `Missing installed API/schema-2 contract: ${family.id}`,
    );
    assert.equal(entry.registryId, family.contractId);
    assert.equal(entry.contract.document.id, family.contractId);
    assert.equal(entry.coverage.behaviorAuthored, true);
    assert(
      entry.importPaths.includes(manifest.name + family.importPath.slice(1)),
      `Catalogue omits public import for ${family.name}`,
    );
    const authored = await readFile(join(kitRoot, entry.contract.source.path), 'utf8');
    assert.equal(authored, entry.contract.raw);
    assert.equal(hash(authored), entry.contract.source.sha256);
    assert.deepEqual(JSON.parse(authored), entry.contract.document);
    assert.equal(
      hash(
        await readFile(join(kitRoot, entry.api.source.path.replace(/^public\//, 'reference-api/'))),
      ),
      entry.api.source.sha256,
    );
    const publicEntry = coverage.entries.find((item) => item.entry === family.importPath);
    assert.equal(
      publicEntry?.classification,
      'authored-ui-family',
      `Unowned public entry ${family.importPath}`,
    );
    assert(publicEntry.contractIds.includes(family.contractId));
    report.families.push({
      id: family.id,
      name: family.name,
      importPath: family.importPath,
      contractId: family.contractId,
      contractSha256: entry.contract.source.sha256,
      apiSha256: entry.api.source.sha256,
      publicEntryClassification: publicEntry.classification,
    });
  }
  report.checks.push(
    'The packed kit maps all seventeen public entries to their exact hashed schema-2 contracts and API documents; package and registry identities agree.',
  );
  report.consumerInputs = await Promise.all(
    ['main.tsx', 'verify.mjs', 'tsconfig.json', 'index.html'].map(async (path) => ({
      path,
      sha256: hash(await readFile(join(consumer, path))),
    })),
  );
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
