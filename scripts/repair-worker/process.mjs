import { spawn } from 'node:child_process';

// Trusted commands only. No shell interpolation and no credential inheritance.
export function commandEnvironment() {
  const result = { CI: '1', NO_COLOR: '1' };
  for (const key of [
    'PATH',
    'HOME',
    'TMPDIR',
    'TEMP',
    'TMP',
    'LANG',
    'LC_ALL',
    'SYSTEMROOT',
    'PLAYWRIGHT_BROWSERS_PATH',
  ])
    if (process.env[key]) result[key] = process.env[key];
  return result;
}

export function runCommand(
  command,
  args,
  { cwd, timeoutMs = 60_000, maxBytes = 2_000_000, env = commandEnvironment() } = {},
) {
  return new Promise((resolve) => {
    const started = Date.now();
    let stdout = '',
      stderr = '',
      bytes = 0,
      timedOut = false,
      outputLimitExceeded = false;
    let termination,
      settled = false;
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const kill = (signal) => {
      if (!child.pid) return;
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* Already exited. */
      }
    };
    const stop = () => {
      kill('SIGTERM');
      termination ??= setTimeout(() => kill('SIGKILL'), 500);
    };
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, timeoutMs);
    const finish = (exitCode, signal, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(termination);
      // A command must not leave a detached server behind.
      kill('SIGKILL');
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
        outputLimitExceeded,
        error: error?.message ?? null,
        durationMs: Date.now() - started,
      });
    };
    for (const [stream, kind] of [
      [child.stdout, 'stdout'],
      [child.stderr, 'stderr'],
    ])
      stream.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          outputLimitExceeded = true;
          stop();
          return;
        }
        if (kind === 'stdout') stdout += chunk.toString();
        else stderr += chunk.toString();
      });
    child.on('error', (error) => finish(null, null, error));
    child.on('close', (code, signal) => finish(code, signal));
  });
}

export async function git(cwd, args, { raw = false } = {}) {
  const result = await runCommand(
    'git',
    ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args],
    { cwd },
  );
  if (result.exitCode !== 0 || result.timedOut || result.outputLimitExceeded)
    throw new Error(`Git ${args[0]} failed: ${result.error || result.stderr.slice(-1000)}`);
  return raw ? result.stdout : result.stdout.trim();
}
