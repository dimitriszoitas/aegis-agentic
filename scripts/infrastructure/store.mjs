import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, rename, unlink, lstat, open, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { requestAdvisory } from './ai.mjs';

const execute = promisify(execFile);
const encode = value => JSON.stringify(value, null, 2) + '\n';
const sha = value => createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

async function regular(path) {
  try { const entry = await lstat(path); if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('Infrastructure state must use regular files.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function readJson(path) { await regular(path); return JSON.parse(await readFile(path, 'utf8')); }
async function atomic(path, value) {
  await regular(path);
  const temp = `${path}.${randomUUID()}.tmp`;
  try { await writeFile(temp, encode(value), { flag: 'wx', mode: 0o600 }); await rename(temp, path); }
  finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
async function directory(path) {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Project state must be a local directory, not a symlink.');
}
export function createInfrastructure({ kitDirectory, projectDirectory, core, environment = process.env, clock = () => Date.now(), aiRequest = requestAdvisory }) {
  const kit = resolve(kitDirectory), project = resolve(projectDirectory);
  const file = name => join(project, name);
  async function lock(task) {
    await directory(project);
    const path = file('operation.lock');
    let handle;
    try { handle = await open(path, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('Another infrastructure operation holds the project lock. Retry when it finishes.', { cause: error }); throw error; }
    try { await handle.writeFile(encode({ pid: process.pid, createdAt: clock() })); return await task(); }
    finally { await handle.close(); await unlink(path); }
  }
  async function kitIdentity() {
    const info = await readJson(join(kit, 'kit.json'));
    const integrity = await readJson(join(kit, 'integrity.json'));
    // Verify the installed kit before allowing source-derived repair. The manifest is
    // an accidental-drift check, not an authenticated signature or trust root.
    for (const [relative, expected] of Object.entries(integrity)) {
      if (relative.startsWith('/') || relative.split('/').includes('..')) throw new Error('Invalid kit integrity path.');
      const content = await readFile(join(kit, relative));
      if (sha(content) !== expected) throw new Error(`Installed kit integrity mismatch: ${relative}`);
    }
    return { info, digest: sha(core.canonicalJson(integrity)) };
  }
  async function snapshot(projectId, identity) {
    const path = join(kit, 'reference-api/ai/components');
    const facts = await Promise.all((await readdir(path)).filter(name => name.endsWith('.json')).sort().map(name => readJson(join(path, name))));
    const pin = { projectId, releaseId: `${identity.info.name}@${identity.info.version}+${identity.digest.slice(0, 12)}`, kitVersion: identity.info.version, registryRevision: core.registry.revision };
    const inventory = core.buildConfigurabilityInventory({ schemaVersion: 1, pin, components: facts }, { supportedKitVersions: [identity.info.version] });
    if (inventory.status !== 'ready') throw new Error('The configuration inventory could not be validated.');
    return { schemaVersion: 1, pin, registry: structuredClone(core.registry), tokenManifest: await readJson(join(kit, 'tokens/design-tokens.json')), inventory };
  }
  function validateConfig(config) {
    if (!object(config) || config.schemaVersion !== 1 || !identifier(config.id) || typeof config.name !== 'string' || config.name.length > 120 || !object(config.pin) || typeof config.kitDigest !== 'string' || typeof config.profileSha256 !== 'string' || typeof config.releaseSha256 !== 'string' || typeof config.telemetryEnabled !== 'boolean' || !object(config.ai) || typeof config.ai.allowRemote !== 'boolean' || !(config.ai.model === null || /^[a-zA-Z0-9._:-]{1,128}$/.test(config.ai.model)) || !Number.isSafeInteger(config.ai.dailyRequestLimit) || config.ai.dailyRequestLimit < 1 || config.ai.dailyRequestLimit > 20) throw new Error('Unknown or invalid project configuration. Automatic migration is not supported.');
    if (config.ai.model !== null && typeof config.ai.model !== 'string') throw new Error('The configured model must be a string or null.');
    const allowed = ['schemaVersion', 'id', 'name', 'createdAt', 'pin', 'kitDigest', 'profileSha256', 'releaseSha256', 'telemetryEnabled', 'ai'];
    if (Object.keys(config).some(key => !allowed.includes(key))) throw new Error('Unknown project configuration fields require a versioned migration.');
    const exactKeys = (value, keys) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
    const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
    if (!exactKeys(config.pin, ['projectId', 'releaseId', 'kitVersion', 'registryRevision']) || !identifier(config.pin.projectId) || typeof config.pin.releaseId !== 'string' || !config.pin.releaseId || config.pin.releaseId.length > 256 || typeof config.pin.kitVersion !== 'string' || !config.pin.kitVersion || config.pin.kitVersion.length > 80 || !Number.isSafeInteger(config.pin.registryRevision) || config.pin.registryRevision < 1 || !exactKeys(config.ai, ['allowRemote', 'model', 'dailyRequestLimit']) || !validDate(config.createdAt) || !config.name.trim() || [config.kitDigest, config.profileSha256, config.releaseSha256].some(value => !/^[a-f0-9]{64}$/.test(value))) throw new Error('Invalid project pin, integrity metadata or settings. Review the versioned configuration.');
    return config;
  }
  async function load() {
    await directory(project);
    const config = validateConfig(await readJson(file('project.json')));
    const release = await readJson(file('release.json'));
    const profile = await readJson(file('profile.json'));
    return { config, release, profile };
  }
  async function runKit(args) {
    try {
      const result = await execute(process.execPath, [join(kit, 'bin/aegis.mjs'), ...args], { maxBuffer: 2000000, timeout: 30000, env: { PATH: environment.PATH ?? process.env.PATH } });
      return JSON.parse(result.stdout);
    } catch (error) {
      if (error.stdout) { try { const result = JSON.parse(error.stdout); if (result.status) return result; } catch { /* Preserve the failure below. */ } }
      throw new Error('The pinned kit operation failed. Inspect the project inputs before retrying.', { cause: error });
    }
  }
  async function appendRun(kind, status, summary, extra = {}) {
    const rows = await readJson(file('runs.json'));
    if (!Array.isArray(rows)) throw new Error('Invalid operation history. Preserve it for review.');
    const run = { id: randomUUID(), kind, createdAt: new Date(clock()).toISOString(), status, summary, ...extra };
    await atomic(file('runs.json'), [...rows, run].slice(-100));
    return run;
  }
  function policyFor(config, release, profile) {
    const components = Object.fromEntries(release.inventory.components.map(component => [component.componentId, { props: {} }]));
    // Prop values are opt-in at the policy boundary. This initial policy records
    // component usage without any property values; teams can explicitly extend it.
    return { version: 1, registries: [config.id], profiles: [profile.id], components };
  }
  async function usageState(state) {
    const policy = await readJson(file('usage-policy.json'));
    const persisted = await readJson(file('usage.json'));
    if (!object(persisted) || persisted.version !== 1 || !Array.isArray(persisted.events) || !Array.isArray(persisted.receipts ?? []) || Object.keys(persisted).some(key => !['version', 'events', 'receipts'].includes(key))) throw new Error('Invalid stored usage envelope. Preserve it for review.');
    const receipts = persisted.receipts ?? [];
    if (receipts.length > 1000 || receipts.some(item => !object(item) || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(item.id) || !/^[a-f0-9]{64}$/.test(item.sha256))) throw new Error('Invalid usage receipts.');
    const result = core.validateStoredUsage({ version: 1, events: persisted.events }, policy, { maxEvents: 10000, maxAgeMs: 30 * 24 * 60 * 60 * 1000, now: clock() });
    return { policy, events: state.config.telemetryEnabled ? result.events : [], validation: result, receipts };
  }
  async function health(state = undefined) {
    const current = state ?? await load();
    const issues = [];
    let identity;
    try { identity = await kitIdentity(); }
    catch { issues.push({ code: 'kit-integrity', message: 'Installed kit integrity failed. Reinstall a reviewed kit before repair.', severity: 'error' }); }
    if (identity && identity.digest !== current.config.kitDigest) issues.push({ code: 'kit-update', message: 'The installed kit differs from the pinned release. Review an update plan.', severity: 'error' });
    if (sha(core.canonicalJson(current.profile)) !== current.config.profileSha256) issues.push({ code: 'profile-source-change', message: 'Approved profile source changed. Automatic repair cannot approve it.', severity: 'error' });
    if (sha(core.canonicalJson(current.release)) !== current.config.releaseSha256) issues.push({ code: 'release-source-change', message: 'Pinned release source changed. Restore it or review a new release.', severity: 'error' });
    if (core.canonicalJson(current.config.pin) !== core.canonicalJson(current.release.pin) || current.config.id !== current.release.pin?.projectId) issues.push({ code: 'pin-mismatch', message: 'Project and release identities disagree. Review the project pin.', severity: 'error' });
    try {
      await directory(file('generated'));
      try { await directory(file('generated/.aegis-maintenance')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const generatedProfile = await readJson(file('generated/profile.json'));
      const generatedLock = await readJson(file('generated/profile-lock.json'));
      if (sha(core.canonicalJson(generatedProfile)) !== current.config.profileSha256 || generatedLock.approvedSourceSha256 !== current.config.profileSha256) issues.push({ code: 'generated-profile-mismatch', message: 'Generated artifacts were compiled for a different profile than this project approved.', severity: 'error' });
    } catch { issues.push({ code: 'generated-profile-missing', message: 'The approved generated profile and lock must be present.', severity: 'error' }); }
    if (issues.length) return { status: 'review-required', issues };
    try {
      const scan = await runKit(['maintain', 'scan', '--out', file('generated')]);
      if (scan.status === 'healthy') return { status: 'healthy', issues: [] };
      if (scan.status === 'local-regeneration-available') return { status: 'drift', issues: [{ code: 'derived-drift', message: `${scan.changed.length} generated profile artifacts differ from approved source.`, severity: 'warning' }], changed: scan.changed };
      return { status: 'review-required', issues: [{ code: 'generated-source-change', message: scan.reason ?? 'Generated source lock changed.', severity: 'error' }] };
    } catch { return { status: 'review-required', issues: [{ code: 'generated-state-invalid', message: 'Generated state is missing or invalid. Preserve it for review.', severity: 'error' }] }; }
  }
  function capabilitySummary(inventory) {
    if (inventory.summary) {
      return Object.fromEntries(['components', 'configurableDimensions', 'constrainedProps', 'unconstrainedProps', 'verifiedConfigurations', 'plannedRecords'].map(key => {
        const count = inventory.summary[key];
        if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid configuration summary.');
        return [key, count];
      }));
    }
    const components = inventory.components ?? [];
    return { components: components.length,
      configurableDimensions: components.reduce((n, component) => n + (component.dimensions?.length ?? 0), 0),
      constrainedProps: components.reduce((n, component) => n + (component.dimensions?.length ?? 0), 0),
      unconstrainedProps: components.reduce((n, component) => n + (component.unconstrainedProps?.length ?? 0), 0),
    };
  }
  async function status() {
    const state = await load();
    const usage = await usageState(state);
    return { schemaVersion: 1, project: { id: state.config.id, name: state.config.name },
      release: { version: state.config.pin.kitVersion, registryRevision: state.config.pin.registryRevision, releaseId: state.config.pin.releaseId },
      health: await health(state), capabilities: capabilitySummary(state.release.inventory),
      usage: { ...core.summarizeUsage(usage.events, usage.policy), telemetryEnabled: state.config.telemetryEnabled, rejectedStoredEvents: usage.validation.rejected, retentionDays: 30, maximumEvents: 10000 },
      ai: { configured: state.config.ai.allowRemote && !!state.config.ai.model && !!environment.OPENAI_API_KEY, provider: state.config.ai.allowRemote && state.config.ai.model && environment.OPENAI_API_KEY ? 'openai' : 'none', model: state.config.ai.model, dailyRequestLimit: state.config.ai.dailyRequestLimit },
      recentRuns: (await readJson(file('runs.json'))).slice(-20).reverse(),
    };
  }
  async function initialize({ id, name = id, profile }) {
    if (!identifier(id) || typeof name !== 'string' || !name.trim() || name.length > 120) throw new Error('Use a stable lowercase project ID and a short display name.');
    const compiled = core.compileProfile(profile);
    if (compiled.issues.some(issue => issue.severity === 'error')) throw new Error('The selected profile is invalid.');
    const identity = await kitIdentity();
    const release = await snapshot(id, identity);
    await mkdir(project, { mode: 0o700 }); // Never overwrite an existing project.
    await mkdir(file('plans'), { mode: 0o700 });
    const config = { schemaVersion: 1, id, name, createdAt: new Date(clock()).toISOString(), pin: release.pin, kitDigest: identity.digest, profileSha256: sha(core.canonicalJson(compiled.profile)), releaseSha256: sha(core.canonicalJson(release)), telemetryEnabled: false, ai: { allowRemote: false, model: null, dailyRequestLimit: 5 } };
    await atomic(file('profile.json'), compiled.profile);
    await atomic(file('release.json'), release);
    await atomic(file('usage-policy.json'), policyFor(config, release, compiled.profile));
    await atomic(file('usage.json'), { version: 1, events: [], receipts: [] });
    await atomic(file('runs.json'), []);
    await atomic(file('ai-budget.json'), { date: new Date(clock()).toISOString().slice(0, 10), used: 0 });
    await runKit(['profile', 'compile', file('profile.json'), '--out', file('generated')]);
    await atomic(file('project.json'), config);
    await appendRun('initialize', 'verified', 'Project initialized with a pinned release and approved profile. Telemetry and external AI are disabled.');
    return status();
  }
  async function setTelemetry(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('Telemetry setting must be boolean.');
    return lock(async () => {
      const { config } = await load(); config.telemetryEnabled = enabled;
      if (!enabled) await atomic(file('usage.json'), { version: 1, events: [], receipts: [] });
      await atomic(file('project.json'), config);
      await appendRun('telemetry-setting', 'updated', enabled ? 'Local aggregate usage collection enabled.' : 'Usage collection disabled and retained events cleared.');
      return { enabled };
    });
  }
  async function ingest(events, batchId = randomUUID()) {
    if (typeof batchId !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(batchId) || !Array.isArray(events) || events.length > 100) throw new Error('Ingest at most 100 events per request with a valid string batch identity.');
    return lock(async () => {
      const state = await load();
      if (!state.config.telemetryEnabled) return { accepted: 0, status: 'disabled' };
      if ((await health(state)).status === 'review-required') throw new Error('Pinned project integrity must pass before accepting usage.');
      const usage = await usageState(state);
      for (const event of events) {
        if (!core.validateUsageEvent(event, usage.policy).valid || event.registryRevision !== state.config.pin.registryRevision || event.timestamp > clock() || event.timestamp < clock() - 30 * 86400000) throw new Error('Usage batch contains unsupported or out-of-window events. No events were stored.');
      }
      const digest = sha(core.canonicalJson(events));
      const previous = usage.receipts.find(item => item.id === batchId);
      if (previous) {
        if (previous.sha256 !== digest) throw new Error('A batch identity cannot be reused with different events.');
        return { accepted: 0, retained: usage.events.length, status: 'duplicate' };
      }
      const retained = [...usage.events, ...events].slice(-10000);
      const receipts = [...usage.receipts, { id: batchId, sha256: digest }].slice(-1000);
      await atomic(file('usage.json'), { version: 1, events: retained, receipts });
      return { accepted: events.length, retained: retained.length, status: 'recorded' };
    });
  }
  async function reconcile() {
    return lock(async () => {
      const before = await health();
      if (before.status !== 'drift') {
        const summary = before.status === 'healthy' ? 'Derived artifacts already match the pinned source.' : 'Source or release review is required; no repair was attempted.';
        await appendRun('reconcile', before.status, summary);
        return { status: before.status, summary, health: before };
      }
      const repair = await runKit(['maintain', 'repair', '--out', file('generated')]);
      const after = await health();
      const verified = repair.status === 'verified' && after.status === 'healthy';
      const summary = verified ? 'Derived artifacts restored from unchanged pinned source and independently rescanned.' : 'The bounded repair did not pass; owner review is required.';
      await appendRun('reconcile', verified ? 'verified' : 'review-required', summary, { evidenceDirectory: repair.evidenceDirectory ?? null });
      return { status: verified ? 'verified' : 'review-required', summary, health: after };
    });
  }
  async function setAI({ enabled, model }) {
    if (typeof enabled !== 'boolean' || (enabled && (typeof model !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(model)))) throw new Error('Enabling remote AI requires an explicit compatible model.');
    return lock(async () => { const { config } = await load(); config.ai.allowRemote = enabled; config.ai.model = enabled ? model : null; await atomic(file('project.json'), config); await appendRun('ai-setting', 'updated', enabled ? 'External AI advisory enabled for aggregate evidence, with a daily request budget.' : 'External AI advisory disabled.'); return { enabled, model: config.ai.model }; });
  }
  async function plan({ useAI = false } = {}) {
    if (typeof useAI !== 'boolean') throw new Error('useAI must be boolean.');
    return lock(async () => {
      await directory(file('plans'));
      const state = await load(); const current = await status();
      const evidenceIds = ['health', 'usage', 'configurability'];
      const components = state.release.inventory.components;
      const componentIds = components.map(item => item.componentId);
      const safeUsage = { eventCount: current.usage.eventCount, byKind: current.usage.byKind, byMode: current.usage.byMode, byPresentation: current.usage.byPresentation, byComponent: current.usage.byComponent };
      const context = { componentIds, evidenceIds, health: current.health, usage: safeUsage, capabilities: current.capabilities };
      const proposals = [];
      if (current.health.status !== 'healthy') proposals.push({ id: 'review-health', kind: 'repair-review', componentId: null, rationale: 'Current infrastructure health has recorded findings.', evidenceIds: ['health'], suggestedAction: current.health.status === 'drift' ? 'Run bounded derived-artifact reconciliation and inspect its evidence.' : 'Review the changed source or release before any repair.' });
      if (current.capabilities.unconstrainedProps > 0) proposals.push({ id: 'review-configuration-boundaries', kind: 'configuration-gap', componentId: null, rationale: 'Some API properties are unbounded or cannot be interpreted as finite configuration. This may be intentional.', evidenceIds: ['configurability'], suggestedAction: 'Prioritize frequently used components and document which flexible properties require product-specific review; do not automatically constrain content or callbacks.' });
      let advice = { summary: proposals.length ? 'Recorded evidence supports reviewable maintenance proposals.' : 'No deterministic maintenance proposal is currently indicated.', proposals };
      if (useAI) {
        if (current.health.status === 'review-required') throw new Error('Pinned source integrity must pass before sending any AI evidence.');
        if (!current.ai.configured) throw new Error('Remote AI is not configured and explicitly enabled for this project.');
        const budget = await readJson(file('ai-budget.json'));
        const date = new Date(clock()).toISOString().slice(0, 10);
        if (!object(budget) || Object.keys(budget).some(key => !['date', 'used'].includes(key)) || typeof budget.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(budget.date) || !Number.isFinite(Date.parse(budget.date)) || new Date(budget.date).toISOString().slice(0, 10) !== budget.date || budget.date > date || !Number.isSafeInteger(budget.used) || budget.used < 0 || budget.used > 20) throw new Error('Invalid AI budget state. Preserve it for review.');
        const used = budget.date === date ? budget.used : 0;
        if (!Number.isSafeInteger(used) || used < 0 || used >= state.config.ai.dailyRequestLimit) throw new Error('The daily AI request budget is exhausted or invalid.');
        await atomic(file('ai-budget.json'), { date, used: used + 1 }); // Failed attempts also consume a slot.
        try { advice = await aiRequest({ apiKey: environment.OPENAI_API_KEY, model: state.config.ai.model, context }); }
        catch (error) { await appendRun('ai-plan', 'failed', 'AI advisory failed. No proposal was applied.'); throw error; }
      }
      const result = { id: randomUUID(), status: advice.proposals.length ? 'review-required' : 'no-action', createdAt: new Date(clock()).toISOString(), source: useAI ? 'openai' : 'rules', summary: advice.summary, proposals: advice.proposals, deterministic: context, verification: 'proposal-only', ...(advice.usage ? { modelUsage: advice.usage } : {}) };
      await directory(file('plans'));
      await atomic(join(file('plans'), `${result.id}.json`), result);
      await appendRun(useAI ? 'ai-plan' : 'maintenance-plan', result.status, result.summary, { planId: result.id });
      return result;
    });
  }
  async function inventory() { return (await load()).release.inventory; }
  async function updatePlan(target) {
    const state = await load();
    if ((await health(state)).status === 'review-required') throw new Error('Pinned project integrity must pass before planning an update.');
    const { config, release } = state;
    const usage = await usageState(state);
    const result = core.planInfrastructureUpdate(release, target, { projectId: config.id, pinnedReleaseId: config.pin.releaseId, usageCounts: core.summarizeUsage(usage.events, usage.policy).byComponent, supportedKitVersions: [config.pin.kitVersion] });
    return result;
  }
  return { initialize, status, health, inventory, setTelemetry, ingest, reconcile, setAI, plan, updatePlan, location: project };
}
