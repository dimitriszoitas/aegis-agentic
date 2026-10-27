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
    env: { PATH: process.env.PATH },
  });
  assert.equal(result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return JSON.parse(result.stdout);
}
const fixture = (name) => join(kit, name);
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
const canonical = fixture('registry/canonical.json');
assert.equal(
  run(['registry', 'compare', join(consumer, 'proposal-0.json'), join(consumer, 'proposal-1.json')])
    .duplicate,
  true,
);
assert(
  run(['registry', 'compare', join(consumer, 'proposal-0.json'), join(consumer, 'proposal-1.json')])
    .conflicts.length > 0,
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
