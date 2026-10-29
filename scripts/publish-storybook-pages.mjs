/** Publish only a freshly built and browser-checked Storybook to its dedicated public repository. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const destination = 'dimitriszoitas/aegis-agentic-storybook';
const site = 'https://dimitriszoitas.github.io/aegis-agentic-storybook/';
const marker = 'aegis-storybook-deployment.json';
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: 'inherit' });
const output = (command, args, cwd = root) =>
  execFileSync(command, args, { cwd, encoding: 'utf8' }).trim();

assert.equal(
  output('git', ['status', '--porcelain']),
  '',
  'Commit source changes before publishing.',
);
const sourceCommit = output('git', ['rev-parse', 'HEAD']);
const assertSourceUnchanged = () => {
  assert.equal(
    output('git', ['rev-parse', 'HEAD']),
    sourceCommit,
    'Source HEAD changed during publishing.',
  );
  assert.equal(
    output('git', ['status', '--porcelain']),
    '',
    'Source files changed during publishing.',
  );
};
const repository = JSON.parse(
  output('gh', [
    'repo',
    'view',
    destination,
    '--json',
    'nameWithOwner,visibility,defaultBranchRef,isEmpty',
  ]),
);
assert.equal(repository.nameWithOwner, destination);
assert.equal(repository.visibility, 'PUBLIC', 'The dedicated site repository must be public.');
assert(
  repository.isEmpty === true || repository.defaultBranchRef?.name === 'main',
  'Expected the dedicated main publishing branch.',
);

run('npm', ['run', 'build-storybook']);
const localCheckEnvironment = { ...process.env };
delete localCheckEnvironment.STORYBOOK_URL;
delete localCheckEnvironment.STORYBOOK_BUILD_DIR;
execFileSync(process.execPath, ['scripts/verify-storybook-pages.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: localCheckEnvironment,
});
assertSourceUnchanged();
const built = join(root, 'storybook-static');
for (const entry of readdirSync(built, { recursive: true })) {
  const info = lstatSync(join(built, entry));
  assert(!info.isSymbolicLink(), `Cannot publish a symlink: ${entry}`);
  assert(
    !entry.split(/[\\/]/).some((part) => part.startsWith('.')),
    `Unexpected hidden content: ${entry}`,
  );
  assert(!/\.(?:map|log|tgz|zip|pem|key)$/i.test(entry), `Unexpected build artifact: ${entry}`);
}
const indexBytes = readFileSync(join(built, 'index.json'));
const index = JSON.parse(indexBytes);
assert(
  index.entries['aegis-contract-semantics--docs'],
  'Canonical contract documentation is missing.',
);

const temp = mkdtempSync(join(tmpdir(), 'aegis-storybook-publish-'));
const checkout = join(temp, 'site');
try {
  run('gh', ['repo', 'clone', destination, checkout, '--', '--depth=1']);
  const hasHead =
    spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: checkout, stdio: 'ignore' })
      .status === 0;
  if (hasHead) {
    const previous = JSON.parse(readFileSync(join(checkout, marker), 'utf8'));
    assert.equal(previous.destination, destination, 'Refusing to replace an unrelated repository.');
    assert.equal(previous.kind, 'aegis-storybook-static');
  } else {
    run('git', ['checkout', '-B', 'main'], checkout);
  }
  for (const entry of readdirSync(checkout)) {
    if (entry !== '.git') rmSync(join(checkout, entry), { recursive: true, force: true });
  }
  cpSync(built, checkout, { recursive: true });
  cpSync(join(root, 'LICENSE'), join(checkout, 'LICENSE'));
  mkdirSync(join(checkout, 'licenses'));
  for (const family of ['figtree', 'jetbrains-mono']) {
    cpSync(
      join(dirname(require.resolve(`@fontsource/${family}/400.css`)), 'LICENSE'),
      join(checkout, 'licenses', `${family}-OFL.txt`),
    );
  }
  for (const dependency of ['tailwindcss', 'tw-animate-css', 'react-day-picker']) {
    cpSync(
      join(root, 'node_modules', dependency, 'LICENSE'),
      join(checkout, 'licenses', `${dependency}-MIT.txt`),
    );
  }
  cpSync(join(root, 'src/marketing/fonts/Inter-OFL.txt'), join(checkout, 'licenses/Inter-OFL.txt'));
  cpSync(
    join(root, 'src/components/aws-logo/ATTRIBUTION.md'),
    join(checkout, 'licenses/AWS-ATTRIBUTION.md'),
  );
  cpSync(
    join(root, 'src/components/aws-logo/asset-checksums.json'),
    join(checkout, 'licenses/AWS-checksums.json'),
  );
  writeFileSync(
    join(checkout, 'THIRD-PARTY-NOTICES.md'),
    'Storybook bundle dependency licenses are in THIRD-PARTY-LICENSES.md. The Untitled UI icon pack is excluded from this public build. The following notices describe the underlying Aegis library and its examples.\n\n' +
      readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')
        .replaceAll('lib-dist/licenses/', 'licenses/')
        .replaceAll('src/marketing/fonts/Inter-OFL.txt', 'licenses/Inter-OFL.txt'),
  );
  writeFileSync(join(checkout, '.nojekyll'), '');
  writeFileSync(
    join(checkout, marker),
    `${JSON.stringify(
      {
        kind: 'aegis-storybook-static',
        schemaVersion: 1,
        destination,
        sourceCommit,
        indexSha256: createHash('sha256').update(indexBytes).digest('hex'),
        entryCount: Object.keys(index.entries).length,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(checkout, 'README.md'),
    `# Aegis Agentic Storybook\n\n[Open Storybook](${site})\n\nThis repository contains the compiled public documentation and interactive demos. Development source is maintained separately. The site includes conventional components and patterns, contracts, agent skills and MCP setup documentation; it does not host infrastructure services or an MCP server.\n\nPublished source commit: \`${sourceCommit}\`. See \`${marker}\` for build identity. GitHub Pages serves the \`main\` branch from the repository root. Updates are published by the source repository's explicit publishing command after a project-subpath browser check.\n`,
  );
  for (const key of ['user.name', 'user.email']) {
    run('git', ['config', key, output('git', ['config', key])], checkout);
  }
  run('git', ['add', '--all'], checkout);
  if (spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: checkout }).status === 0) {
    console.log('The published site is already up to date.');
  } else {
    run('git', ['commit', '-m', `Publish Storybook from ${sourceCommit.slice(0, 12)}`], checkout);
    assertSourceUnchanged();
    run('git', ['push', 'origin', 'HEAD:main'], checkout);
  }
  console.log(`Static site pushed. Verify GitHub Pages deployment and ${site}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
