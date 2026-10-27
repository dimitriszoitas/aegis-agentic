#!/usr/bin/env node
import { createHash, createPublicKey } from 'node:crypto';
import { constants } from 'node:fs';
import { open, mkdir, rm, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import { openWorkspace } from './workspace.mjs';
import { createWorkspaceServer } from './workspace-server.mjs';
import { createMaintenanceLoop } from './retention.mjs';
import { createSigningKeyPair, signKit, verifyKit } from './releases.mjs';

const encode = (value) => JSON.stringify(value, null, 2) + '\n';
const booleanOptions = new Set(['--allow-unsigned-local', '--use-ai']);
const authentication = ['--workspace', '--token-file'];
const commands = {
  init: ['--workspace', '--trusted-keys', '--allow-unsigned-local'],
  'release-keygen': ['--out'],
  'release-sign': ['--kit', '--private-key', '--created-at', '--out'],
  'release-verify': ['--kit', '--attestation', '--trusted-keys', '--allow-unsigned-local'],
  install: [...authentication, '--kit', '--attestation'],
  kits: authentication,
  projects: authentication,
  'create-project': [...authentication, '--id', '--name', '--kit-digest', '--profile'],
  'token-issue': [
    ...authentication,
    '--role',
    '--label',
    '--project-ids',
    '--expires-at',
    '--expires-in-days',
    '--out',
  ],
  'token-revoke': [...authentication, '--id'],
  'token-list': authentication,
  status: [...authentication, '--project'],
  inventory: [...authentication, '--project'],
  plan: [...authentication, '--project', '--use-ai'],
  reconcile: [...authentication, '--project'],
  retention: [...authentication, '--project'],
  generations: [...authentication, '--project'],
  audit: [...authentication, '--project', '--limit', '--before-id'],
  'update-prepare': [
    ...authentication,
    '--project',
    '--kit-digest',
    '--profile',
    '--expected-revision',
  ],
  'rollback-prepare': [...authentication, '--project', '--generation-id', '--expected-revision'],
  activate: [
    ...authentication,
    '--project',
    '--plan-id',
    '--plan-digest',
    '--expected-revision',
    '--reason',
  ],
  serve: [
    ...authentication,
    '--host',
    '--port',
    '--tls-cert',
    '--tls-key',
    '--allowed-hosts',
    '--allowed-origins',
    '--reconcile-interval',
  ],
};

export const workspaceHelp = `Aegis workspace infrastructure

init --workspace <new-directory> --trusted-keys <key-entry-or-array.json>
  Development only: replace --trusted-keys with --allow-unsigned-local.
release-keygen --out <new-directory>
release-sign --kit <directory> --private-key <private.pem> --out <external-attestation.json> [--created-at <UTC ISO timestamp>]
release-verify --kit <directory> --attestation <file> --trusted-keys <file>
  Explicit unsigned inspection: --kit <directory> --allow-unsigned-local.

Workspace commands require --workspace <directory>. --token-file <file> defaults
to <workspace>/bootstrap.token. Credentials must be regular files with mode 0600;
raw tokens and private signing keys are never printed or accepted as flags.

install --kit <directory> [--attestation <file>]
kits
projects
create-project --id <id> --kit-digest <SHA256> --profile <file> [--name <name>]
token-issue --role <admin|owner|operator|viewer|ingest> --label <label> --out <new-file>
  [--project-ids <comma-separated IDs>] [--expires-in-days <1-365> | --expires-at <UTC ISO timestamp>]
token-revoke --id <token UUID>
token-list
status|inventory|reconcile|retention|generations --project <id>
plan --project <id> [--use-ai]
audit [--project <id>] [--limit <1-1000>] [--before-id <positive integer>]
update-prepare --project <id> --kit-digest <SHA256> --profile <file> --expected-revision <integer>
rollback-prepare --project <id> --generation-id <UUID> --expected-revision <integer>
activate --project <id> --plan-id <UUID> --plan-digest <SHA256> --expected-revision <integer> --reason <review reason>
serve [--host 127.0.0.1] [--port 4178] [--reconcile-interval <30-86400 seconds>]
  [--tls-cert <file> --tls-key <0600-file>] [--allowed-hosts <comma-separated host:port values>]
  [--allowed-origins <comma-separated exact origins>]

Nonloopback serving requires TLS, explicit host/origin allowlists and a workspace
that requires signed releases. Serving and background maintenance require admin
credentials. Maintenance is opt-in, never calls AI, and exposes status/resume at
/api/aegis-workspace/maintenance. Stop the process to stop maintenance.
Prepared updates and rollback generations stay inactive until explicit activation.
`;

function parse(argv) {
  const [command = 'help', ...args] = argv;
  if (['help', '--help', '-h'].includes(command)) {
    if (args.length) throw new Error('Help does not accept additional options.');
    return { command: 'help', options: {} };
  }
  if (!Object.hasOwn(commands, command)) throw new Error('Unknown workspace command. Run help.');
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const key = args[index];
    if (!commands[command].includes(key) || Object.hasOwn(options, key))
      throw new Error('Unknown, unsupported or repeated option. Run help.');
    if (booleanOptions.has(key)) options[key] = true;
    else {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing ${key} value.`);
      options[key] = value;
    }
  }
  return { command, options };
}

const required = (options, key) => {
  if (!options[key]) throw new Error(`${key} is required.`);
  return options[key];
};
function integer(value, label, minimum = 1, maximum = Number.MAX_SAFE_INTEGER) {
  if (
    typeof value !== 'string' ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < minimum ||
    Number(value) > maximum
  )
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  return Number(value);
}
function list(value, label, maximum = 128) {
  const values = value.split(',').map((item) => item.trim());
  if (
    !values.length ||
    values.length > maximum ||
    values.some((item) => !item) ||
    new Set(values).size !== values.length
  )
    throw new Error(`${label} requires a bounded list of distinct nonempty values.`);
  return values;
}
function isoTime(value) {
  const time = Date.parse(value);
  if (!Number.isSafeInteger(time) || time < 0 || new Date(time).toISOString() !== value)
    throw new Error('Use a canonical UTC ISO timestamp, including milliseconds.');
  return time;
}

async function readInput(path, { secret = false, json = false, maximum = 4 * 1024 * 1024 } = {}) {
  const handle = await open(
    resolve(path),
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.size > maximum)
      throw new Error('Input must be a bounded regular file without links.');
    if (secret && (info.mode & 0o777) !== 0o600)
      throw new Error('Credential files must have mode 0600.');
    const bytes = await handle.readFile();
    if (bytes.length > maximum) throw new Error('Input exceeds its size limit.');
    if (!json) return bytes.toString('utf8');
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch {
      throw new Error('Input file must contain valid UTF-8 JSON.');
    }
  } finally {
    await handle.close();
  }
}

async function trustFile(path) {
  const parsed = await readInput(path, { json: true });
  const keys = Array.isArray(parsed) ? parsed : [parsed];
  if (!keys.length || keys.length > 32)
    throw new Error('Provide between 1 and 32 trusted public keys.');
  const seen = new Set();
  for (const entry of keys) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      Object.keys(entry).length !== 2 ||
      typeof entry.keyId !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.keyId) ||
      typeof entry.publicKeyPem !== 'string' ||
      !entry.publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----')
    )
      throw new Error('Trusted keys require only keyId and publicKeyPem fields.');
    let key;
    try {
      key = createPublicKey(entry.publicKeyPem);
    } catch {
      throw new Error('Invalid trusted public key.');
    }
    if (
      key.asymmetricKeyType !== 'ed25519' ||
      createHash('sha256')
        .update(key.export({ type: 'spki', format: 'der' }))
        .digest('hex') !== entry.keyId ||
      seen.has(entry.keyId)
    )
      throw new Error('Trusted keys must be distinct Ed25519 keys with matching fingerprints.');
    seen.add(entry.keyId);
  }
  return keys;
}

async function newOutput(path, task) {
  const destination = resolve(path);
  const handle = await open(destination, 'wx', 0o600);
  let complete = false;
  try {
    const result = await task();
    await handle.writeFile(result.content);
    await handle.sync();
    complete = true;
    return { ...result.result, outputFile: destination };
  } finally {
    await handle.close();
    if (!complete) await rm(destination, { force: true });
  }
}

/** One aggregate circuit covers the authenticated workspace. Each cycle discovers
 * current projects, retains data first, then repairs only verified derived drift.
 * Failures pause aggregate repair after three cycles; no plan/AI operation runs. */
export function workspaceMaintenanceService(workspace, actor) {
  let projects = [],
    drift = [],
    stopping = false;
  return {
    stop() {
      stopping = true;
    },
    async maintainRetention() {
      projects = workspace.catalog.listProjects(actor);
      let changed = false,
        failed = false;
      for (const project of projects) {
        if (stopping) break;
        try {
          const result = await workspace.execute(project.id, 'retention', {}, actor);
          changed ||= result.status === 'maintained';
          failed ||= !['maintained', 'no-op'].includes(result.status);
        } catch {
          failed = true;
        }
      }
      return { status: failed ? 'review-required' : changed ? 'maintained' : 'no-op' };
    },
    async health() {
      drift = [];
      let failed = false;
      for (const project of projects) {
        if (stopping) break;
        try {
          const { health } = await workspace.status(project.id, actor);
          if (health.status === 'drift') drift.push(project.id);
          else if (health.status !== 'healthy') failed = true;
        } catch {
          failed = true;
        }
      }
      return { status: failed ? 'review-required' : drift.length ? 'drift' : 'healthy' };
    },
    async reconcile() {
      for (const id of drift) {
        if (stopping) return { status: 'stopped' };
        const result = await workspace.execute(id, 'reconcile', {}, actor);
        if (!['healthy', 'verified'].includes(result.status) || result.health?.status !== 'healthy')
          return { status: 'review-required' };
      }
      return { status: 'verified', health: { status: 'healthy' } };
    },
  };
}

async function serve(workspace, actor, options, context) {
  workspace.catalog.authorize(actor, 'tokens');
  const host = options['--host'] ?? '127.0.0.1';
  if (host !== 'localhost' && !isIP(host))
    throw new Error('--host must be a literal IP address or localhost.');
  const local = ['127.0.0.1', '::1', 'localhost'].includes(host);
  const port = integer(options['--port'] ?? '4178', '--port', 1024, 65535);
  const interval =
    options['--reconcile-interval'] === undefined
      ? null
      : integer(options['--reconcile-interval'], '--reconcile-interval', 30, 86400);
  const explicitHosts =
    options['--allowed-hosts'] && list(options['--allowed-hosts'], '--allowed-hosts');
  const explicitOrigins =
    options['--allowed-origins'] && list(options['--allowed-origins'], '--allowed-origins');
  if (!!options['--tls-cert'] !== !!options['--tls-key'])
    throw new Error('Provide both --tls-cert and --tls-key.');
  if (
    !local &&
    (!options['--tls-cert'] ||
      !explicitHosts ||
      !explicitOrigins ||
      !workspace.policy.requireSignature)
  )
    throw new Error(
      'Nonloopback serving requires TLS, explicit allowed hosts/origins and a signed-release workspace policy.',
    );
  const tls = options['--tls-cert']
    ? {
        cert: await readInput(options['--tls-cert']),
        key: await readInput(options['--tls-key'], { secret: true, maximum: 16384 }),
      }
    : undefined;
  let maintenance = null;
  const maintenanceService = workspaceMaintenanceService(workspace, actor);
  const maintenanceProxy =
    interval === null
      ? null
      : {
          status: () => maintenance?.status() ?? null,
          resume: () => {
            if (!maintenance) throw new Error('Maintenance is not active.');
            return maintenance.resume();
          },
        };
  const server = context.createServer(workspace, {
    ...(explicitHosts
      ? { allowedHosts: explicitHosts }
      : host === '::1'
        ? { allowedHosts: [`[::1]:${port}`, `localhost:${port}`] }
        : {}),
    ...(explicitOrigins ? { allowedOrigins: explicitOrigins } : {}),
    tls,
    maintenance: maintenanceProxy,
  });
  await new Promise((ready, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      ready();
    });
  });
  try {
    if (interval !== null)
      maintenance = context.createMaintenance({
        service: maintenanceService,
        intervalMs: interval * 1000,
      });
    context.stdout(
      encode({
        status: 'listening',
        url: `${tls ? 'https' : 'http'}://${host.includes(':') ? `[${host}]` : host}:${port}`,
        workspace: workspace.location,
        automaticDerivedRepair: interval !== null,
        maintenance: maintenance?.status() ?? null,
      }),
    );
    await new Promise((closed, reject) => {
      const stop = () => {
        maintenanceService.stop();
        maintenance?.stop();
        server.close();
        server.closeIdleConnections?.();
      };
      const cleanup = () => {
        context.signals.off('SIGINT', stop);
        context.signals.off('SIGTERM', stop);
      };
      context.signals.once('SIGINT', stop);
      context.signals.once('SIGTERM', stop);
      server.once('close', () => {
        cleanup();
        closed();
      });
      server.once('error', (error) => {
        cleanup();
        stop();
        reject(error);
      });
    });
  } finally {
    maintenanceService.stop();
    maintenance?.stop();
    if (server.listening) await new Promise((done) => server.close(done));
    // The service must finish its current bounded operation before its SQLite
    // handle closes. stop() prevents a later phase or another scheduled cycle.
    while (maintenance?.status().running) await new Promise((done) => setTimeout(done, 25));
  }
}

/** Execute one command. Dependencies are injectable for command-boundary tests;
 * output contains public results only, never issued tokens or private PEM data. */
export async function runWorkspaceCli(
  argv,
  {
    stdout = (text) => process.stdout.write(text),
    stderr = (text) => process.stderr.write(text),
    environment = process.env,
    clock = () => Date.now(),
    openWorkspaceImpl = openWorkspace,
    createServer = createWorkspaceServer,
    createMaintenance = createMaintenanceLoop,
    signals = process,
  } = {},
) {
  let workspace;
  try {
    const { command, options } = parse(argv);
    if (command === 'help') {
      stdout(workspaceHelp);
      return 0;
    }
    let result;
    if (command === 'release-keygen') {
      const directory = resolve(required(options, '--out'));
      await mkdir(directory, { mode: 0o700 });
      const keys = createSigningKeyPair();
      const privateKeyFile = join(directory, 'private.pem'),
        publicKeyFile = join(directory, 'public-key.json');
      await newOutput(privateKeyFile, async () => ({ content: keys.privateKeyPem, result: {} }));
      await newOutput(publicKeyFile, async () => ({
        content: encode({ keyId: keys.keyId, publicKeyPem: keys.publicKeyPem }),
        result: {},
      }));
      result = { keyId: keys.keyId, privateKeyFile, publicKeyFile };
    } else if (command === 'release-sign') {
      const kit = resolve(required(options, '--kit'));
      const kitRoot = await realpath(kit);
      const output = resolve(required(options, '--out'));
      const destination = join(
        await realpath(dirname(output)),
        output.slice(dirname(output).length + 1),
      );
      const within = relative(kitRoot, destination);
      if (!within || (!within.startsWith('../') && within !== '..'))
        throw new Error('Detached attestations must be written outside the kit directory.');
      const privateKeyPem = await readInput(required(options, '--private-key'), {
        secret: true,
        maximum: 4096,
      });
      result = await newOutput(output, async () => {
        const attestation = await signKit(kit, {
          privateKeyPem,
          ...(options['--created-at'] ? { createdAt: options['--created-at'] } : {}),
        });
        return {
          content: encode(attestation),
          result: {
            digest: attestation.digest,
            keyId: attestation.keyId,
            createdAt: attestation.createdAt,
          },
        };
      });
    } else if (command === 'release-verify') {
      const trustedKeys = options['--trusted-keys']
        ? await trustFile(options['--trusted-keys'])
        : [];
      const attestation = options['--attestation']
        ? await readInput(options['--attestation'], { json: true })
        : undefined;
      result = await verifyKit(required(options, '--kit'), {
        attestation,
        trustedKeys,
        requireSignature: options['--allow-unsigned-local'] !== true,
      });
    } else if (command === 'init') {
      const directory = resolve(required(options, '--workspace'));
      if (!options['--trusted-keys'] && !options['--allow-unsigned-local'])
        throw new Error(
          'Signed workspaces require --trusted-keys; unsigned development requires --allow-unsigned-local.',
        );
      const trustedKeys = options['--trusted-keys']
        ? await trustFile(options['--trusted-keys'])
        : [];
      workspace = await openWorkspaceImpl({
        directory,
        create: true,
        trustedKeys,
        requireSignature: options['--allow-unsigned-local'] !== true,
        environment,
        clock,
      });
      result = await newOutput(join(directory, 'bootstrap.token'), async () => {
        const issued = workspace.catalog.bootstrap();
        return {
          content: issued.token + '\n',
          result: {
            status: 'initialized',
            workspace: workspace.location,
            policy: workspace.policy,
            credential: issued.record,
          },
        };
      });
    } else {
      const directory = resolve(required(options, '--workspace'));
      const token = (
        await readInput(options['--token-file'] ?? join(directory, 'bootstrap.token'), {
          secret: true,
          maximum: 256,
        })
      ).trim();
      workspace = await openWorkspaceImpl({ directory, environment, clock });
      const actor = workspace.catalog.authenticate(token);
      if (!actor) throw new Error('The credential is invalid, expired or revoked.');
      const project = () => required(options, '--project');
      const revision = () =>
        integer(required(options, '--expected-revision'), '--expected-revision');
      switch (command) {
        case 'install':
          result = await workspace.installKit(
            {
              sourceDirectory: required(options, '--kit'),
              attestation: options['--attestation']
                ? await readInput(options['--attestation'], { json: true })
                : null,
            },
            actor,
          );
          break;
        case 'kits':
          result = { kits: await workspace.listKits(actor) };
          break;
        case 'projects':
          result = { projects: workspace.catalog.listProjects(actor) };
          break;
        case 'create-project':
          result = await workspace.createProject(
            {
              id: required(options, '--id'),
              name: options['--name'] ?? required(options, '--id'),
              kitDigest: required(options, '--kit-digest'),
              profile: await readInput(required(options, '--profile'), { json: true }),
            },
            actor,
          );
          break;
        case 'token-issue': {
          required(options, '--out');
          if (options['--expires-at'] && options['--expires-in-days'])
            throw new Error('Choose one explicit token expiry option.');
          const input = {
            label: required(options, '--label'),
            role: required(options, '--role'),
            projectIds: options['--project-ids']
              ? list(options['--project-ids'], '--project-ids')
              : [],
            expiresAt: options['--expires-at']
              ? isoTime(options['--expires-at'])
              : clock() +
                integer(options['--expires-in-days'] ?? '30', '--expires-in-days', 1, 365) *
                  86400000,
          };
          let issued;
          try {
            result = await newOutput(options['--out'], async () => {
              issued = workspace.catalog.issueToken(input, actor);
              return { content: issued.token + '\n', result: { credential: issued.record } };
            });
          } catch (error) {
            if (issued) workspace.catalog.revokeToken(issued.record.id, actor);
            throw error;
          }
          break;
        }
        case 'token-revoke':
          result = { credential: workspace.catalog.revokeToken(required(options, '--id'), actor) };
          break;
        case 'token-list':
          result = { credentials: workspace.catalog.tokens(actor) };
          break;
        case 'status':
          result = await workspace.status(project(), actor);
          break;
        case 'inventory':
          result = await workspace.inventory(project(), actor);
          break;
        case 'plan':
          result = await workspace.execute(
            project(),
            'plan',
            { useAI: options['--use-ai'] === true },
            actor,
          );
          break;
        case 'reconcile':
        case 'retention':
          result = await workspace.execute(project(), command, {}, actor);
          break;
        case 'generations':
          result = { generations: workspace.catalog.generations(project(), actor) };
          break;
        case 'audit':
          result = {
            events: workspace.catalog.audit(actor, {
              ...(options['--project'] ? { projectId: options['--project'] } : {}),
              ...(options['--limit']
                ? { limit: integer(options['--limit'], '--limit', 1, 1000) }
                : {}),
              ...(options['--before-id']
                ? { beforeId: integer(options['--before-id'], '--before-id') }
                : {}),
            }),
          };
          break;
        case 'update-prepare':
          result = await workspace.prepareUpdate(
            project(),
            {
              expectedRevision: revision(),
              kitDigest: required(options, '--kit-digest'),
              profile: await readInput(required(options, '--profile'), { json: true }),
            },
            actor,
          );
          break;
        case 'rollback-prepare':
          result = await workspace.prepareRollback(
            project(),
            { generationId: required(options, '--generation-id'), expectedRevision: revision() },
            actor,
          );
          break;
        case 'activate':
          result = await workspace.activate(
            project(),
            {
              planId: required(options, '--plan-id'),
              planDigest: required(options, '--plan-digest'),
              expectedRevision: revision(),
              reason: required(options, '--reason'),
            },
            actor,
          );
          break;
        case 'serve':
          await serve(workspace, actor, options, {
            stdout,
            signals,
            createServer,
            createMaintenance,
          });
          break;
        default:
          throw new Error('Unsupported command.');
      }
    }
    if (result !== undefined) stdout(encode(result));
    return 0;
  } catch (error) {
    stderr(
      encode({ error: error instanceof Error ? error.message : 'Workspace operation failed.' }),
    );
    return 1;
  } finally {
    workspace?.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await runWorkspaceCli(process.argv.slice(2));
