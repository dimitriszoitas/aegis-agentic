#!/usr/bin/env node
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createInfrastructure } from './store.mjs';
import { createInfrastructureServer } from './server.mjs';

const kitDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [command = 'help', ...args] = process.argv.slice(2);
const help = `Aegis design-system infrastructure (local single-project control plane)

init --project <new-directory> --id <project-id> --profile <profile.json> [--name <name>]
status --project <directory>
inventory --project <directory>
plan --project <directory> [--ai]
reconcile --project <directory>
usage-enable --project <directory>
usage-disable --project <directory>  (also clears retained events)
usage-ingest --project <directory> --file <events.json>
ai-enable --project <directory> --model <explicit-model>
ai-disable --project <directory>
updates --project <directory> --target <release-snapshot.json>
serve --project <directory> [--port 4177] [--reconcile-interval 60]

AI requires OPENAI_API_KEY on the server plus an explicit project opt-in and model.
Only aggregate evidence is sent; AI results are proposals, never executed changes.
The service binds to 127.0.0.1 only. Reconciliation repairs unchanged-input derived
drift; source, behavior, version and release changes require reviewed updates.
`;
function parse() {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!['--project', '--id', '--profile', '--name', '--model', '--file', '--target', '--port', '--ai', '--reconcile-interval'].includes(key) || key in options) throw new Error('Unknown or repeated option. Run help.');
    if (key === '--ai') options[key] = true;
    else { const value = args[++i]; if (!value || value.startsWith('--')) throw new Error(`Missing ${key} value.`); options[key] = value; }
  }
  const commandOptions = {
    init: ['--id', '--profile', '--name'], status: [], inventory: [],
    plan: ['--ai'], reconcile: [], 'usage-enable': [], 'usage-disable': [],
    'usage-ingest': ['--file'], 'ai-enable': ['--model'], 'ai-disable': [],
    updates: ['--target'], serve: ['--port', '--reconcile-interval'],
  };
  if (!Object.hasOwn(commandOptions, command) || Object.keys(options).some(key => key !== '--project' && !commandOptions[command].includes(key))) throw new Error('Unsupported option for this command. Run help.');
  return options;
}
try {
  if (['help', '--help', '-h'].includes(command)) console.log(help);
  else {
    const options = parse();
    if (!options['--project']) throw new Error('--project is required.');
    const core = await import(pathToFileURL(join(kitDirectory, 'runtime/core.mjs')).href);
    const service = createInfrastructure({ kitDirectory, projectDirectory: options['--project'], core });
    let result;
    switch (command) {
      case 'init':
        if (!options['--profile'] || !options['--id']) throw new Error('--id and --profile are required.');
        result = await service.initialize({ id: options['--id'], name: options['--name'], profile: JSON.parse(await readFile(resolve(options['--profile']), 'utf8')) }); break;
      case 'status': result = await service.status(); break;
      case 'inventory': result = await service.inventory(); break;
      case 'plan': result = await service.plan({ useAI: options['--ai'] === true }); break;
      case 'reconcile': result = await service.reconcile(); break;
      case 'usage-enable': result = await service.setTelemetry(true); break;
      case 'usage-disable': result = await service.setTelemetry(false); break;
      case 'usage-ingest':
        if (!options['--file']) throw new Error('--file is required.');
        result = await service.ingest(JSON.parse(await readFile(resolve(options['--file']), 'utf8'))); break;
      case 'ai-enable': result = await service.setAI({ enabled: true, model: options['--model'] }); break;
      case 'ai-disable': result = await service.setAI({ enabled: false }); break;
      case 'updates':
        if (!options['--target']) throw new Error('--target is required.');
        result = await service.updatePlan(JSON.parse(await readFile(resolve(options['--target']), 'utf8'))); break;
      case 'serve': {
        const port = Number(options['--port'] ?? 4177);
        const interval = options['--reconcile-interval'] === undefined ? null : Number(options['--reconcile-interval']);
        if (!Number.isInteger(port) || port < 1024 || port > 65535 || (interval !== null && (!Number.isInteger(interval) || interval < 30 || interval > 86400))) throw new Error('Use a valid unprivileged port and a reconciliation interval of 30–86400 seconds.');
        await service.status();
        const server = createInfrastructureServer(service, { port });
        await new Promise((resolveReady, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolveReady); });
        let busy = false;
        const timer = interval === null ? null : setInterval(async () => {
          if (busy) return;
          busy = true;
          try { const state = await service.health(); if (state.status === 'drift') await service.reconcile(); }
          catch { console.error('Reconciliation check failed; inspect project health.'); }
          finally { busy = false; }
        }, interval * 1000);
        const stop = () => { if (timer) clearInterval(timer); server.close(); };
        process.once('SIGINT', stop); process.once('SIGTERM', stop);
        console.log(JSON.stringify({ status: 'listening', url: `http://127.0.0.1:${port}/api/aegis/status`, project: service.location, automaticDerivedRepair: interval !== null }));
        break;
      }
      default: throw new Error('Unknown command. Run help.');
    }
    if (result !== undefined) console.log(JSON.stringify(result, null, 2));
  }
} catch (error) { console.error(JSON.stringify({ error: error instanceof Error ? error.message : 'Infrastructure operation failed.' })); process.exitCode = 1; }
