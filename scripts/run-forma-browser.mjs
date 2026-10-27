import { spawn } from 'node:child_process';
import { once } from 'node:events';

const supplied = process.env.FORMA_URL;
const url = supplied || 'http://127.0.0.1:4180/?view=product';
let server;
let output = '';
try {
  if (!supplied) {
    server = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4180', '--strictPort'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    for (const stream of [server.stdout, server.stderr])
      stream.on('data', (chunk) => {
        output = (output + chunk).slice(-8000);
      });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Forma test server exited: ${output}`);
      try {
        ready = (await fetch(url)).ok;
      } catch {
        /* Server is starting. */
      }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error(`Forma test server did not start: ${output}`);
  }
  for (const name of ['patterns', 'users', 'commerce', 'settings']) {
    const child = spawn(process.execPath, [`scripts/verify-forma-${name}.mjs`], {
      stdio: 'inherit',
      env: { ...process.env, FORMA_URL: url },
    });
    const [code] = await once(child, 'exit');
    if (code !== 0) {
      process.exitCode = code ?? 1;
      break;
    }
  }
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}
