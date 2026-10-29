/** Verify already-built artifacts. Never reuse a caller's external preview server or rebuild source. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, readdir, realpath, stat, mkdir, writeFile, rm } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { plannedExecutions } from './catalogue.mjs';
import { sha256, sourceSnapshot, verifiedRecords } from './evidence.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
assert.equal(process.argv.length, 2, 'Usage: node scripts/acceptance/verify-builds.mjs');
const output = resolve(repository, 'artifacts/acceptance-builds');
const acceptancePath = resolve(output, 'acceptance.json');
const uiDirectory = resolve(output, 'ui');
const uiScript = resolve(repository, 'scripts/verify-design-infrastructure-browser.mjs');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
};
const servers = [];
let child;
let interrupted = false;
const onSignal = () => {
  interrupted = true;
  child?.kill('SIGTERM');
};
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

async function fingerprintBuild(directory) {
  const files = [];
  async function visit(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const file = resolve(path, entry.name);
      assert(!entry.isSymbolicLink(), `Build contains a symlink: ${relative(directory, file)}`);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile())
        files.push({ path: relative(directory, file), sha256: sha256(await readFile(file)) });
      else throw new Error(`Unsupported build entry: ${relative(directory, file)}`);
    }
  }
  await visit(directory);
  assert(
    files.some((file) => file.path === 'index.html'),
    `Build is missing index.html: ${directory}`,
  );
  return {
    directory: relative(repository, directory),
    fileCount: files.length,
    digest: sha256(JSON.stringify(files)),
  };
}

async function serveBuild(directory, prefix) {
  const root = await realpath(directory);
  const server = createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { allow: 'GET, HEAD' }).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(prefix)) throw new Error('Outside published path');
      const requested = pathname.slice(prefix.length) || 'index.html';
      if (
        requested.includes('\\') ||
        requested.includes('\0') ||
        requested.split('/').some((part) => part.startsWith('.'))
      )
        throw new Error('Unsafe path');
      const file = await realpath(resolve(root, requested));
      const fromRoot = relative(root, file);
      if (fromRoot.startsWith('..') || isAbsolute(fromRoot) || !(await stat(file)).isFile())
        throw new Error('Outside build');
      response.writeHead(200, {
        'content-type': mime[extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      });
      if (request.method === 'HEAD') response.end();
      else response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  servers.push(server);
  await new Promise((yes, no) => {
    server.once('error', no);
    server.listen(0, '127.0.0.1', yes);
  });
  return `http://127.0.0.1:${server.address().port}${prefix}`;
}

async function run(script, args, env) {
  assert(!interrupted, 'Verification was interrupted');
  await new Promise((yes, no) => {
    let timedOut = false;
    let escalation;
    child = spawn(process.execPath, [script, ...args], {
      cwd: repository,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    const timeout = setTimeout(
      () => {
        timedOut = true;
        child?.kill('SIGTERM');
        escalation = setTimeout(() => child?.kill('SIGKILL'), 5000);
      },
      10 * 60 * 1000,
    );
    child.once('error', (error) => {
      clearTimeout(timeout);
      clearTimeout(escalation);
      child = undefined;
      no(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timeout);
      clearTimeout(escalation);
      child = undefined;
      if (timedOut || interrupted || code !== 0)
        no(
          new Error(
            `${relative(repository, script)} failed (${timedOut ? 'timeout' : (signal ?? code)}).`,
          ),
        );
      else yes();
    });
  });
}

const report = {
  schemaVersion: 1,
  kind: 'production-build-acceptance',
  status: 'running',
  startedAt: new Date().toISOString(),
  acceptance: { status: 'not-run', report: 'acceptance.json' },
  ui: { status: 'not-run', report: 'ui/report.json' },
  limitations: [
    'Runs the finite browser matrix against these exact existing build bytes; does not build or attest that the build was produced from the current checkout.',
    'Requires unchanged local source and artifact bytes throughout verification. Source hashes describe the local checkout, not a signed release.',
  ],
};
await mkdir(output, { recursive: true });
try {
  const source = await sourceSnapshot(repository);
  report.sourceDigest = source.digest;
  report.sourceCommit = source.commit;
  const storybookDirectory = resolve(repository, 'storybook-static');
  const productDirectory = resolve(repository, 'dist');
  report.builds = {
    storybook: await fingerprintBuild(storybookDirectory),
    product: await fingerprintBuild(productDirectory),
  };
  const storybookUrl = await serveBuild(storybookDirectory, '/aegis-agentic-storybook/');
  const productUrl = `${await serveBuild(productDirectory, '/')}?view=product`;
  report.servers = { storybook: storybookUrl, product: productUrl };
  await rm(acceptancePath, { force: true });
  await run(
    resolve(repository, 'scripts/acceptance/run.mjs'),
    ['--storybook', storybookUrl, '--forma', productUrl, '--out', acceptancePath],
    { STORYBOOK_URL: storybookUrl, FORMA_URL: productUrl },
  );
  const acceptance = JSON.parse(await readFile(acceptancePath, 'utf8'));
  const plans = plannedExecutions();
  const records = verifiedRecords(acceptance, source.digest);
  assert.equal(
    acceptance.sourceStableDuringRun,
    true,
    'Acceptance source changed during execution',
  );
  assert.equal(
    records.length,
    plans.length,
    'All planned scenarios require valid source-bound observations',
  );
  assert.deepEqual(
    records.map((record) => record.id).sort(),
    plans.map((plan) => plan.id).sort(),
    'Every planned scenario must execute exactly once',
  );
  assert(
    records.every((record) => record.status === 'passed'),
    'Every planned scenario must pass',
  );
  assert.deepEqual(acceptance.summary, {
    passed: plans.length,
    failed: 0,
    'not-run': 0,
    unsupported: 0,
  });
  report.acceptance = {
    status: 'passed',
    report: 'acceptance.json',
    executed: records.length,
    digest: acceptance.reportDigest,
  };
  let uiExists;
  try {
    uiExists = (await stat(uiScript)).isFile();
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    uiExists = false;
  }
  if (uiExists) {
    const scriptDigest = sha256(await readFile(uiScript));
    await mkdir(uiDirectory, { recursive: true });
    await rm(resolve(uiDirectory, 'report.json'), { force: true });
    await run(uiScript, [], {
      STORYBOOK_URL: storybookUrl,
      FORMA_URL: productUrl,
      DESIGN_INFRASTRUCTURE_REPORT_DIR: uiDirectory,
    });
    const ui = JSON.parse(await readFile(resolve(uiDirectory, 'report.json'), 'utf8'));
    assert.equal(ui.status, 'passed', 'Design infrastructure UI checks must pass');
    assert(ui.checks?.length > 0, 'UI verifier must execute checks');
    assert.equal(
      sha256(await readFile(uiScript)),
      scriptDigest,
      'UI verifier changed during execution',
    );
    report.ui = {
      status: 'passed',
      report: 'ui/report.json',
      checks: ui.checks.length,
      verifierSha256: scriptDigest,
    };
  } else
    report.ui.reason =
      'Optional design infrastructure UI verifier is not present in this checkout.';
  assert.equal(
    (await sourceSnapshot(repository)).digest,
    source.digest,
    'Source changed during build verification',
  );
  assert.deepEqual(
    await fingerprintBuild(storybookDirectory),
    report.builds.storybook,
    'Storybook build changed during verification',
  );
  assert.deepEqual(
    await fingerprintBuild(productDirectory),
    report.builds.product,
    'Product build changed during verification',
  );
  assert(!interrupted, 'Verification was interrupted');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  child?.kill('SIGTERM');
  await Promise.all(
    servers.map(
      (server) =>
        new Promise((done) => {
          server.closeAllConnections();
          if (server.listening) server.close(done);
          else done();
        }),
    ),
  );
  process.off('SIGINT', onSignal);
  process.off('SIGTERM', onSignal);
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        status: report.status,
        acceptance: report.acceptance,
        ui: report.ui,
        output,
        failure: report.failure,
      },
      null,
      2,
    ),
  );
}
