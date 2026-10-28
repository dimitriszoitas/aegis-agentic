import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arguments_ = process.argv.slice(2);
const localDependencies = arguments_.includes('--local-dependencies');
const sourceArgument = arguments_.find((arg) => !arg.startsWith('--'));
assert(
  arguments_.every((arg) => arg === '--local-dependencies' || arg === sourceArgument),
  'Unknown preparation argument',
);
const source = sourceArgument ? resolve(sourceArgument) : join(repository, 'examples/relay');
const directory = await mkdtemp(join(tmpdir(), 'aegis-relay-consumer-'));
const consumer = join(directory, 'relay');
const reportDirectory = join(repository, 'artifacts/relay');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args, cwd) =>
  new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: '1', npm_config_cache: join(directory, '.npm-cache') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (part) => {
      stdout += part;
    });
    child.stderr.on('data', (part) => {
      stderr = (stderr + part).slice(-20000);
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out\n${stderr}`));
    }, 240000);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0)
        reject(new Error(`${command} ${args.join(' ')} failed (${code})\n${stdout}\n${stderr}`));
      else resolveRun(stdout);
    });
  });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

await cp(source, consumer, {
  recursive: true,
  filter: (path) => !['node_modules', 'dist', 'profile'].includes(basename(path)),
});
const manifest = JSON.parse(await readFile(join(repository, 'package.json'), 'utf8'));
const packed = JSON.parse(
  await run(
    npm,
    ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
    repository,
  ),
);
assert.equal(packed.length, 1);
const tarball = join(directory, packed[0].filename);
const packagePath = join(consumer, 'package.json');
const consumerManifest = JSON.parse(await readFile(packagePath, 'utf8'));
consumerManifest.dependencies[manifest.name] = `file:${tarball}`;
await writeFile(packagePath, JSON.stringify(consumerManifest, null, 2) + '\n');
const installedPackage = join(consumer, 'node_modules', manifest.name);
if (localDependencies) {
  console.log(
    'Copying the local dependency snapshot; Aegis is extracted exclusively from its tarball…',
  );
  await cp(join(repository, 'node_modules'), join(consumer, 'node_modules'), {
    recursive: true,
    verbatimSymlinks: true,
    mode: constants.COPYFILE_FICLONE,
  });
  await mkdir(installedPackage, { recursive: true });
  await run('tar', ['-xzf', tarball, '-C', installedPackage, '--strip-components=1'], consumer);
  // pnpm's generated shims may contain checkout paths; consumer scripts use local binaries.
  for (const [name, target] of [
    ['vite', '../vite/bin/vite.js'],
    ['tsc', '../typescript/bin/tsc'],
  ]) {
    const bin = join(consumer, 'node_modules/.bin', name);
    await rm(bin, { force: true });
    await symlink(target, bin);
  }
} else {
  console.log('Installing the exported package into a fresh Relay consumer…');
  await run(
    npm,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'],
    consumer,
  );
}
const kit = join(installedPackage, 'agent-kit');
const cli = join(kit, 'bin/aegis.mjs');
const compile = JSON.parse(
  await run(
    process.execPath,
    [
      cli,
      'profile',
      'compile',
      join(kit, 'profiles/atlas.json'),
      '--out',
      join(consumer, 'profile'),
    ],
    consumer,
  ),
);
const kitManifest = JSON.parse(await readFile(join(kit, 'kit.json'), 'utf8'));
assert.equal(kitManifest.version, manifest.version);
const provenance = {
  schemaVersion: 1,
  consumer: 'relay',
  package: manifest.name,
  version: manifest.version,
  tarballSha256: hash(await readFile(tarball)),
  kitIntegritySha256: hash(await readFile(join(kit, 'integrity.json'))),
  registryRevision: kitManifest.registryRevision,
  dependencySource: localDependencies
    ? 'Copied local dependency snapshot; clean registry installation is not verified.'
    : 'npm installation from registry with local Aegis tarball',
  profileId: compile.profile.id,
  profileHash: compile.hash,
  source: 'Installed npm tarball; public package imports; no repository source aliases.',
};
await writeFile(join(consumer, 'aegis-lock.json'), JSON.stringify(provenance, null, 2) + '\n');
await mkdir(reportDirectory, { recursive: true });
const report = { consumer, tarball, kit, provenance };
await writeFile(join(reportDirectory, 'preparation.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
