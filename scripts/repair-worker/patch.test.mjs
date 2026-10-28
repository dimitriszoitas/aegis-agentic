import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { applyProposal, readRepairSources, sha256, validateProposal } from './patch.mjs';

const execFile = promisify(execFileCallback);
const first = 'src/patterns/metric-card/metric-card.css';
const second = 'src/components/card/card.css';
const original = '.metric { min-width: auto; }\n';
const corrected = '.metric { min-width: 0; }\n';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'aegis-patch-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (args) =>
    execFile('git', ['-c', 'core.fsmonitor=false', '-C', root, ...args], {
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
    });
  const put = async (path, content = original) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  };
  await git(['init', '--quiet']);
  await put(first);
  await put(second);
  await git(['add', '--', first, second]);
  const change = (path = first, content = corrected) => ({
    path,
    beforeSha256: sha256(original),
    content,
  });
  const proposal = (changes = [change()]) => ({
    summary: 'Contain the metric',
    rationale: 'Remove the intrinsic minimum width.',
    changes,
  });
  const options = (value = proposal(), extras = {}) => ({
    root,
    proposal: value,
    allowedPaths: [first, second],
    ...extras,
  });
  return {
    root,
    git,
    put,
    change,
    proposal,
    options,
    read: (path = first) => readFile(join(root, path), 'utf8'),
  };
}

test('validates an entire tracked CSS proposal without editing, then atomically replaces files with hashes', async (t) => {
  const f = await fixture(t);
  const validated = await validateProposal(f.options(f.proposal([f.change(), f.change(second)])));
  assert.equal(await f.read(), original);
  assert.equal(validated.changes[0].afterSha256, sha256(corrected));
  assert.ok(Object.isFrozen(validated));
  assert.ok(Object.isFrozen(validated.changes));
  assert.ok(Object.isFrozen(validated.changes[0]));
  const result = await applyProposal({ root: f.root, validated });
  assert.deepEqual(
    result.map(({ path }) => path),
    [first, second],
  );
  assert.equal(await f.read(), corrected);
  assert.equal(await f.read(second), corrected);
  assert.equal(
    (await readdir(dirname(join(f.root, first)))).some((name) => name.startsWith('.aegis-repair-')),
    false,
  );
});

test('requires exact allowlisting even for otherwise eligible CSS', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal(), { allowedPaths: [second] })),
    /not explicitly allowed/,
  );
  assert.equal(await f.read(), original);
});

test('rejects traversal, absolute paths, hidden paths, separators, Unicode and control characters', async (t) => {
  const f = await fixture(t);
  for (const path of [
    '../src/patterns/x.css',
    '/src/patterns/x.css',
    'src/patterns/../x.css',
    'src/patterns/./x.css',
    'src//patterns/x.css',
    'src/patterns/.hidden.css',
    'src/patterns/x\\y.css',
    'src/patterns/x\ny.css',
    'src/patterns/é.css',
    'src/patterns/%2e%2e/x.css',
    'src/patterns/x.css\0',
  ]) {
    await assert.rejects(
      validateProposal(f.options(f.proposal([f.change(path)]), { allowedPaths: [path] })),
      /canonical relative paths/,
    );
  }
});

test('protects test oracles, contracts, tokens, dependencies, scripts and executable source even if allowlisted', async (t) => {
  const f = await fixture(t);
  for (const path of [
    'src/components/card/card.test.css',
    'src/components/card/card.spec.css',
    'src/components/card/card.stories.css',
    'src/components/card/snapshots/card.css',
    'src/components/card/baseline.css',
    'src/components/card/fixtures/card.css',
    'src/components/card/contracts/card.css',
    'src/components/card/tokens.css',
    'src/components/card/registry.css',
    'src/components/card/scripts/card.css',
    'src/components/card/skills/card.css',
    'src/components/card/config.css',
    'src/components/card/package.css',
    'src/components/card/AGENTS.css',
    'src/components/card/node_modules/library.css',
    'src/components/card/vendor/library.css',
    'src/components/card/dependencies/library.css',
    'src/components/card/generated/theme.css',
    'src/components/card/card.tsx',
    'src/agentic/tokens.css',
    'registry/a.css',
    'public/ai/catalogue.css',
    'skills/a.css',
    'scripts/a.css',
    '.git/config',
  ]) {
    await assert.rejects(
      validateProposal(f.options(f.proposal([f.change(path)]), { allowedPaths: [path] })),
      /Protected source|restricted to|canonical relative paths/,
    );
  }
});

test('rejects duplicate changes and duplicate policy paths', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(), f.change()]))),
    /Duplicate repair path/,
  );
  await assert.rejects(
    validateProposal(f.options(f.proposal(), { allowedPaths: [first, first] })),
    /must not contain duplicates/,
  );
});

test('rejects missing, unknown and accessor keys without invoking a getter', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options({ ...f.proposal(), command: 'delete files' })),
    /unknown keys/,
  );
  await assert.rejects(validateProposal(f.options({ summary: 'Missing fields' })), /unknown keys/);
  await assert.rejects(
    validateProposal(f.options(f.proposal([{ ...f.change(), command: 'execute' }]))),
    /unknown keys/,
  );
  let invoked = false;
  const proposal = f.proposal();
  Object.defineProperty(proposal, 'summary', {
    get() {
      invoked = true;
      return 'Unsafe';
    },
  });
  await assert.rejects(validateProposal(f.options(proposal)), /accessors/);
  assert.equal(invoked, false);
});

test('rejects empty summaries, rationales, malformed hashes and empty batches', async (t) => {
  const f = await fixture(t);
  for (const patch of [{ summary: '' }, { rationale: ' ' }, { summary: 'x'.repeat(1001) }]) {
    await assert.rejects(
      validateProposal(f.options({ ...f.proposal(), ...patch })),
      /must be non-empty text/,
    );
  }
  await assert.rejects(
    validateProposal(f.options(f.proposal([{ ...f.change(), beforeSha256: 'ABC' }]))),
    /Invalid beforeSha256/,
  );
  await assert.rejects(validateProposal(f.options(f.proposal([]))), /must contain between/);
});

test('rejects no-op proposals and stale source hashes', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(first, original)]))),
    /No-op/,
  );
  await f.put(first, '.concurrent { color: inherit; }\n');
  await assert.rejects(validateProposal(f.options()), /hash is stale/);
});

test('enforces bounded file count and aggregate replacement bytes', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(), f.change(second)]), { maxFiles: 1 })),
    /between 1 and 1/,
  );
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(), f.change(second)]), { maxBytes: 40 })),
    /total byte limit/,
  );
  await assert.rejects(validateProposal(f.options(f.proposal(), { maxFiles: 17 })), /maxFiles/);
  await assert.rejects(
    validateProposal(f.options(f.proposal(), { maxBytes: Infinity })),
    /maxBytes/,
  );
  await assert.rejects(
    validateProposal(f.options(f.proposal(), { allowedPaths: [] })),
    /allowedPaths/,
  );
});

test('rejects oversized original source even when replacement fits the budget', async (t) => {
  const f = await fixture(t);
  const large = 'x'.repeat(100);
  await f.put(first, large);
  await assert.rejects(
    validateProposal(
      f.options(f.proposal([{ ...f.change(), beforeSha256: sha256(large) }]), { maxBytes: 50 }),
    ),
    /Existing source exceeds/,
  );
});

test('rejects binary, invalid UTF-8 and ill-formed replacement strings', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(first, '.a { }\0')]))),
    /NUL bytes/,
  );
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(first, '\ud800')]))),
    /valid UTF-8/,
  );
  for (const bytes of [Buffer.from([0, 1, 2]), Buffer.from([0xff, 0xfe, 0xfd])]) {
    await f.put(first, bytes);
    await assert.rejects(
      validateProposal(f.options(f.proposal([{ ...f.change(), beforeSha256: sha256(bytes) }]))),
      /Invalid source bytes|valid UTF-8/,
    );
  }
});

test('rejects untracked targets instead of creating or adopting files', async (t) => {
  const f = await fixture(t);
  const path = 'src/components/card/extra.css';
  await f.put(path);
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(path)]), { allowedPaths: [path] })),
    /existing tracked/,
  );
});

test('rejects tracked executable files and files made executable after indexing', async (t) => {
  const f = await fixture(t);
  await f.git(['update-index', '--chmod=+x', '--', first]);
  await assert.rejects(validateProposal(f.options()), /tracked non-executable/);
  await f.git(['update-index', '--chmod=-x', '--', first]);
  await chmod(join(f.root, first), 0o755);
  await assert.rejects(validateProposal(f.options()), /unlinked non-executable/);
});

test('rejects target symlinks and preserves the external target', async (t) => {
  const f = await fixture(t);
  const external = join(f.root, 'external.css');
  await writeFile(external, original);
  await rm(join(f.root, first));
  await symlink(external, join(f.root, first));
  await assert.rejects(validateProposal(f.options()), /Symlinks/);
  assert.equal(await readFile(external, 'utf8'), original);
});

test('rejects symlinked ancestors even with a normal Git index entry', async (t) => {
  const f = await fixture(t);
  const directory = dirname(join(f.root, first));
  const moved = join(f.root, 'moved');
  await rename(directory, moved);
  await symlink(moved, directory);
  await assert.rejects(validateProposal(f.options()), /Symlinks/);
  assert.equal(await readFile(join(moved, 'metric-card.css'), 'utf8'), original);
});

test('rejects hardlinked source without altering either name', async (t) => {
  const f = await fixture(t);
  const linked = join(f.root, 'also.css');
  await link(join(f.root, first), linked);
  await assert.rejects(validateProposal(f.options()), /ordinary unlinked/);
  assert.equal(await readFile(linked, 'utf8'), original);
});

test('a mixed valid and stale batch never edits its valid first file', async (t) => {
  const f = await fixture(t);
  await f.put(second, '.newer { }\n');
  await assert.rejects(
    validateProposal(f.options(f.proposal([f.change(), f.change(second)]))),
    /hash is stale/,
  );
  assert.equal(await f.read(), original);
});

test('rechecks every source before applying so a late stale second file cannot cause partial writes', async (t) => {
  const f = await fixture(t);
  const validated = await validateProposal(f.options(f.proposal([f.change(), f.change(second)])));
  await f.put(second, '.newer { }\n');
  await assert.rejects(applyProposal({ root: f.root, validated }), /hash is stale/);
  assert.equal(await f.read(), original);
  assert.equal(await f.read(second), '.newer { }\n');
});

test('rechecks symlinks and tracked state between validation and application', async (t) => {
  const f = await fixture(t);
  const validated = await validateProposal(f.options());
  await f.git(['rm', '--cached', '--', first]);
  await assert.rejects(applyProposal({ root: f.root, validated }), /existing tracked/);
  await f.git(['add', '--', first]);
  const external = join(f.root, 'external.css');
  await writeFile(external, original);
  await rm(join(f.root, first));
  await symlink(external, join(f.root, first));
  await assert.rejects(applyProposal({ root: f.root, validated }), /Symlinks/);
  assert.equal(await readFile(external, 'utf8'), original);
});

test('rejects forged or serialized validation results and cross-checkout reuse', async (t) => {
  const f = await fixture(t);
  const other = await fixture(t);
  const validated = await validateProposal(f.options());
  await assert.rejects(
    applyProposal({ root: f.root, validated: JSON.parse(JSON.stringify(validated)) }),
    /original result/,
  );
  await assert.rejects(applyProposal({ root: other.root, validated }), /another checkout/);
  assert.equal(await f.read(), original);
  assert.equal(await other.read(), original);
});

test('snapshots validated input before asynchronous Git and filesystem checks', async (t) => {
  const f = await fixture(t);
  const proposal = f.proposal();
  const pending = validateProposal(f.options(proposal));
  proposal.summary = 'Changed after validation began';
  proposal.changes[0].path = 'src/components/card/card.test.css';
  proposal.changes[0].content = 'Injected after validation began';
  const validated = await pending;
  assert.equal(validated.summary, 'Contain the metric');
  assert.equal(validated.changes[0].path, first);
  assert.equal(validated.changes[0].content, corrected);
  await applyProposal({ root: f.root, validated });
  assert.equal(await f.read(), corrected);
});

test('refuses nested-directory roots to avoid ambiguous relative policy paths', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    validateProposal(f.options(f.proposal(), { root: join(f.root, 'src') })),
    /checkout root/,
  );
});

test('source snapshots retain exact UTF-8 bytes and are immutable before a worker reset', async (t) => {
  const f = await fixture(t);
  const content = '\ufeff.metric::before { content: "κόσμος"; }\n';
  await f.put(first, content);
  const sources = await readRepairSources({
    root: f.root,
    allowedPaths: [first, second],
    maxFiles: 1,
  });
  assert.equal(sources.length, 2, 'Source context can exceed the number of changed files.');
  assert.equal(sources[0].content, content);
  assert.equal(sources[0].sha256, sha256(content));
  assert.ok(Object.isFrozen(sources));
  assert.ok(Object.isFrozen(sources[0]));
  assert.equal(await f.read(), content);
});

test('source snapshots reject unsafe policy paths, links and untracked files before any reset', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    readRepairSources({ root: f.root, allowedPaths: ['src/components/card/card.test.css'] }),
    /Protected source/,
  );
  await assert.rejects(
    readRepairSources({ root: f.root, allowedPaths: ['../external.css'] }),
    /canonical relative paths/,
  );
  const untracked = 'src/components/card/untracked.css';
  await f.put(untracked);
  await assert.rejects(
    readRepairSources({ root: f.root, allowedPaths: [untracked] }),
    /existing tracked/,
  );
  const external = join(f.root, 'external.css');
  await writeFile(external, original);
  await rm(join(f.root, first));
  await symlink(external, join(f.root, first));
  await assert.rejects(readRepairSources({ root: f.root, allowedPaths: [first] }), /Symlinks/);
  assert.equal(await readFile(external, 'utf8'), original);
});

test('source snapshots reject hardlinks and impose an aggregate input byte limit', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    readRepairSources({ root: f.root, allowedPaths: [first, second], maxBytes: 40 }),
    /Source snapshots exceed/,
  );
  await link(join(f.root, first), join(f.root, 'external.css'));
  await assert.rejects(
    readRepairSources({ root: f.root, allowedPaths: [first] }),
    /ordinary unlinked/,
  );
});
