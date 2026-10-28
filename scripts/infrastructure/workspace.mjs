import {
  readFile,
  writeFile,
  mkdir,
  cp,
  lstat,
  open,
  unlink,
  readdir,
  rename,
} from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import { openCatalog } from './catalog.mjs';
import { verifyKit } from './releases.mjs';
import { createInfrastructure } from './store.mjs';

const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const uuid = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const knownVersions = ['0.1.0-experiment.0', '0.2.0-experiment.0', '0.3.0-experiment.0'];
async function directory(path) {
  const entry = await lstat(path);
  if (!entry.isDirectory() || entry.isSymbolicLink())
    throw new Error('Workspace directories must not be symbolic links.');
}
async function json(path) {
  const entry = await lstat(path);
  if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1)
    throw new Error('Workspace metadata must be regular files.');
  return JSON.parse(await readFile(path, 'utf8'));
}
async function createJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
async function replaceJson(path, value) {
  await json(path);
  const temporary = `${path}.${randomUUID()}.tmp`;
  await createJson(temporary, value);
  await rename(temporary, path);
}
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

/** One durable local workspace. SQLite commits the active-generation pointer atomically;
 * fully prepared immutable releases and generated projects exist before activation.
 * Incomplete preparations remain inactive, never selected by recovery heuristics. */
export async function openWorkspace({
  directory: workspaceDirectory,
  create = false,
  trustedKeys = [],
  requireSignature = true,
  environment = process.env,
  clock = () => Date.now(),
}) {
  const root = resolve(workspaceDirectory);
  const catalog = await openCatalog({ directory: root, create, clock });
  const paths = Object.fromEntries(
    ['kits', 'attestations', 'plans', 'locks', 'generations'].map((name) => [
      name,
      join(root, name),
    ]),
  );
  try {
    if (create) {
      for (const [name, path] of Object.entries(paths))
        if (name !== 'generations') await mkdir(path, { mode: 0o700 });
      if (typeof requireSignature !== 'boolean' || !Array.isArray(trustedKeys))
        throw new Error('Explicit release trust policy required.');
      await createJson(join(root, 'workspace.json'), {
        schemaVersion: 1,
        requireSignature,
        trustedKeys,
      });
    }
    for (const path of Object.values(paths)) await directory(path);
    const policy = await json(join(root, 'workspace.json'));
    if (
      !exact(policy, ['schemaVersion', 'requireSignature', 'trustedKeys']) ||
      policy.schemaVersion !== 1 ||
      typeof policy.requireSignature !== 'boolean' ||
      !Array.isArray(policy.trustedKeys) ||
      policy.trustedKeys.length > 32
    )
      throw new Error('Unsupported workspace release trust policy.');
    async function validatePaths() {
      await directory(root);
      for (const path of Object.values(paths)) await directory(path);
    }
    async function guard(action, projectId, actor, task) {
      catalog.authorize(actor, action, projectId);
      await validatePaths();
      const path = join(paths.locks, projectId ? `${projectId}.lock` : 'workspace.lock');
      let handle;
      try {
        handle = await open(path, 'wx', 0o600);
      } catch (error) {
        if (error.code === 'EEXIST')
          throw new Error('A workspace operation is in progress. Retry after it finishes.', {
            cause: error,
          });
        throw error;
      }
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: clock() }));
        catalog.authorize(actor, action, projectId);
        return await task();
      } finally {
        await handle.close();
        await unlink(path);
      }
    }
    async function installed(kitDigest) {
      await validatePaths();
      if (!digest(kitDigest)) throw new Error('Use an exact installed kit digest.');
      const kitDirectory = join(paths.kits, kitDigest);
      await directory(paths.kits);
      await directory(kitDirectory);
      const attestation = await json(join(paths.attestations, `${kitDigest}.json`));
      const result = await verifyKit(kitDirectory, {
        attestation,
        trustedKeys: policy.trustedKeys,
        requireSignature: policy.requireSignature,
      });
      if (
        result.digest !== kitDigest ||
        result.manifest.name !== '@dimitriszoitas/aegis-agentic' ||
        !knownVersions.includes(result.manifest.version) ||
        result.manifest.compilerVersion !== '1'
      )
        throw new Error('The installed release identity or compiler version is unsupported.');
      // Import only after release verification and compatibility checks.
      const core = await import(pathToFileURL(join(kitDirectory, 'runtime/core.mjs')).href);
      return { ...result, kitDirectory, core };
    }
    async function generation(generationId, kitDigest) {
      if (!uuid(generationId)) throw new Error('Invalid generation identity.');
      await directory(paths.generations);
      const projectDirectory = join(paths.generations, generationId);
      await directory(projectDirectory);
      const kit = await installed(kitDigest);
      return {
        kit,
        service: createInfrastructure({ ...kit, projectDirectory, environment, clock }),
        projectDirectory,
      };
    }
    async function current(projectId, actor, action = 'read') {
      const project = catalog.project(projectId, actor, action);
      const entry = project.activeGeneration;
      if (!entry) throw new Error('The active generation is missing from the catalog.');
      const result = await generation(entry.id, entry.kitDigest);
      const config = await json(join(result.projectDirectory, 'project.json'));
      if (
        config.id !== projectId ||
        config.profileSha256 !== entry.profileSha256 ||
        config.kitDigest !== entry.kitDigest
      )
        throw new Error('Project catalog and generation identities disagree.');
      return { ...result, project, entry };
    }
    async function installKit({ sourceDirectory, attestation = null }, actor) {
      return guard('tokens', undefined, actor, async () => {
        const checked = await verifyKit(sourceDirectory, {
          attestation,
          trustedKeys: policy.trustedKeys,
          requireSignature: policy.requireSignature,
        });
        if (
          checked.manifest.name !== '@dimitriszoitas/aegis-agentic' ||
          !knownVersions.includes(checked.manifest.version) ||
          checked.manifest.compilerVersion !== '1'
        )
          throw new Error('Unsupported kit version or compiler.');
        const target = join(paths.kits, checked.digest);
        try {
          await lstat(target);
          const existing = await installed(checked.digest);
          return {
            digest: existing.digest,
            version: existing.manifest.version,
            verified: existing.verified,
            keyId: existing.keyId,
          };
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
        // No links are followed by the verified source inventory. Copy then verify
        // again to catch a source change between verification and installation.
        await directory(paths.kits);
        await cp(sourceDirectory, target, {
          recursive: true,
          dereference: false,
          errorOnExist: true,
          force: false,
        });
        const copied = await verifyKit(target, {
          attestation,
          trustedKeys: policy.trustedKeys,
          requireSignature: policy.requireSignature,
        });
        if (copied.digest !== checked.digest)
          throw new Error(
            'Release changed during installation. Inactive files retained for review.',
          );
        await directory(paths.attestations);
        await createJson(join(paths.attestations, `${checked.digest}.json`), attestation);
        return {
          digest: checked.digest,
          version: checked.manifest.version,
          verified: checked.verified,
          keyId: checked.keyId,
        };
      });
    }
    async function listKits(actor) {
      catalog.authorize(actor, 'tokens');
      const entries = (await readdir(paths.kits)).sort();
      return Promise.all(
        entries.map(async (id) => {
          const kit = await installed(id);
          return {
            digest: id,
            version: kit.manifest.version,
            verified: kit.verified,
            keyId: kit.keyId,
          };
        }),
      );
    }
    async function prepareGeneration({ projectId, name, kitDigest, profile }) {
      const kit = await installed(kitDigest);
      const id = randomUUID();
      const projectDirectory = join(paths.generations, id);
      const service = createInfrastructure({ ...kit, projectDirectory, environment, clock });
      await service.initialize({ id: projectId, name, profile });
      if ((await service.health()).status !== 'healthy')
        throw new Error('Prepared generation did not pass its health checks.');
      const config = await json(join(projectDirectory, 'project.json'));
      return { id, kitDigest, profileSha256: config.profileSha256, service, projectDirectory, kit };
    }
    async function createProject(input, actor) {
      return guard('create-project', undefined, actor, async () => {
        if (
          !exact(input, ['id', 'name', 'kitDigest', 'profile']) ||
          !/^[a-z][a-z0-9-]{0,63}$/.test(input.id) ||
          typeof input.id !== 'string' ||
          typeof input.name !== 'string' ||
          !input.name.trim() ||
          input.name.length > 120
        )
          throw new Error('Provide a project identity, name, installed release and profile.');
        if (catalog.listProjects(actor).some((project) => project.id === input.id))
          throw new Error('Project already exists.');
        const prepared = await prepareGeneration({
          projectId: input.id,
          name: input.name,
          ...input,
        });
        return catalog.createProject(
          {
            id: input.id,
            name: input.name,
            generationId: prepared.id,
            kitDigest: prepared.kitDigest,
            profileSha256: prepared.profileSha256,
          },
          actor,
        );
      });
    }
    async function status(projectId, actor) {
      const active = await current(projectId, actor);
      return {
        ...(await active.service.status()),
        workspace: {
          projectRevision: active.project.revision,
          generationId: active.entry.id,
          kitDigest: active.entry.kitDigest,
          releaseVerified: active.kit.verified,
          signingKeyId: active.kit.keyId,
        },
      };
    }
    async function inventory(projectId, actor) {
      return (await current(projectId, actor)).service.inventory();
    }
    async function execute(projectId, operation, input, actor) {
      const actions = {
        plan: 'plan',
        reconcile: 'reconcile',
        retention: 'reconcile',
        usage: 'ingest',
        telemetry: 'usage-settings',
      };
      if (!Object.hasOwn(actions, operation)) throw new Error('Unsupported project operation.');
      return guard(actions[operation], projectId, actor, async () => {
        const active = await current(projectId, actor, actions[operation]);
        let result;
        if (operation === 'plan') result = await active.service.plan(input);
        if (operation === 'reconcile') result = await active.service.reconcile();
        if (operation === 'retention') {
          const reports = [];
          for (const entry of catalog.generations(projectId, actor)) {
            const retained =
              entry.id === active.entry.id ? active : await generation(entry.id, entry.kitDigest);
            reports.push({
              generationId: entry.id,
              ...(await retained.service.maintainRetention()),
            });
          }
          result = {
            status: reports.some((report) => report.status === 'review-required')
              ? 'review-required'
              : reports.some((report) => report.status === 'maintained')
                ? 'maintained'
                : 'no-op',
            generations: reports,
          };
        }
        if (operation === 'usage')
          result = await active.service.ingest(input.events, input.batchId);
        if (operation === 'telemetry') {
          result = await active.service.setTelemetry(input.enabled);
          // An explicit opt-out also clears previously active generations. No old
          // release code is executed to erase retained telemetry.
          if (!input.enabled)
            for (const old of catalog.generations(projectId, actor)) {
              if (old.id === active.entry.id) continue;
              const path = join(paths.generations, old.id);
              await directory(path);
              const configPath = join(path, 'project.json');
              const config = await json(configPath);
              if (config.id !== projectId)
                throw new Error('Archived generation identity mismatch.');
              await json(join(path, 'usage.json'));
              config.telemetryEnabled = false;
              await replaceJson(join(path, 'usage.json'), { version: 1, events: [], receipts: [] });
              await replaceJson(configPath, config);
            }
        }
        // Event batches are not copied into the audit log.
        catalog.recordAudit(
          {
            action: operation === 'retention' ? 'retention' : actions[operation],
            projectId,
            details: {
              status: result.status ?? 'updated',
              ...(operation === 'usage' ? { count: result.accepted } : {}),
            },
          },
          actor,
        );
        return result;
      });
    }
    async function prepareUpdate(projectId, input, actor) {
      return guard('plan-update', projectId, actor, async () => {
        if (
          !exact(input, ['expectedRevision', 'kitDigest', 'profile']) ||
          !Number.isSafeInteger(input.expectedRevision)
        )
          throw new Error(
            'Pin the expected project revision, target kit digest and complete profile.',
          );
        const active = await current(projectId, actor, 'plan-update');
        if (active.project.revision !== input.expectedRevision)
          throw new Error('Stale project revision. Refresh before planning an update.');
        if ((await active.service.health()).status !== 'healthy')
          throw new Error('The active project must be healthy before preparing an update.');
        if ((await readdir(paths.plans)).length >= 100)
          throw new Error(
            'Workspace plan limit reached. Archive reviewed plans before preparing more.',
          );
        const prepared = await prepareGeneration({
          projectId,
          name: active.project.name,
          kitDigest: input.kitDigest,
          profile: input.profile,
        });
        const from = await json(join(active.projectDirectory, 'release.json'));
        const to = await json(join(prepared.projectDirectory, 'release.json'));
        const comparison = prepared.kit.core.planInfrastructureUpdate(from, to, {
          projectId,
          pinnedReleaseId: from.pin.releaseId,
          supportedKitVersions: knownVersions,
        });
        if (comparison.status === 'blocked')
          throw new Error(
            'This release comparison requires unsupported migration work. Prepared files remain inactive.',
          );
        const proposal = {
          schemaVersion: 1,
          id: randomUUID(),
          projectId,
          expectedRevision: active.project.revision,
          fromGeneration: active.entry.id,
          targetGeneration: prepared.id,
          kitDigest: prepared.kitDigest,
          profileSha256: prepared.profileSha256,
          createdAt: clock(),
          expiresAt: clock() + 86400000,
          comparison,
          profileChange: {
            from: active.entry.profileSha256,
            to: prepared.profileSha256,
            changed: active.entry.profileSha256 !== prepared.profileSha256,
          },
          effect: 'new-generation-with-empty-usage-and-AI-disabled',
          status: 'prepared-not-active',
        };
        const planDigest = sha(canonical(proposal));
        await directory(paths.plans);
        await createJson(join(paths.plans, `${proposal.id}.json`), { proposal, planDigest });
        catalog.recordAudit(
          {
            action: 'plan-update',
            projectId,
            details: {
              status: 'prepared',
              planId: proposal.id,
              generationId: prepared.id,
              expectedRevision: active.project.revision,
            },
          },
          actor,
        );
        return { ...proposal, planDigest };
      });
    }
    async function activate(projectId, input, actor) {
      return guard('activate', projectId, actor, async () => {
        if (
          !exact(input, ['planId', 'planDigest', 'expectedRevision', 'reason']) ||
          !uuid(input.planId) ||
          !digest(input.planDigest) ||
          typeof input.reason !== 'string' ||
          !input.reason.trim() ||
          input.reason.length > 500
        )
          throw new Error(
            'Activation requires the reviewed plan identity, digest, revision and reason.',
          );
        await directory(paths.plans);
        const stored = await json(join(paths.plans, `${input.planId}.json`));
        if (
          !exact(stored, ['proposal', 'planDigest']) ||
          stored.planDigest !== input.planDigest ||
          sha(canonical(stored.proposal)) !== input.planDigest
        )
          throw new Error('Plan content changed. Prepare and review a new plan.');
        const plan = stored.proposal;
        const active = await current(projectId, actor, 'activate');
        if (
          plan.projectId !== projectId ||
          plan.expectedRevision !== input.expectedRevision ||
          active.project.revision !== input.expectedRevision ||
          active.entry.id !== plan.fromGeneration ||
          plan.expiresAt <= clock()
        )
          throw new Error('Plan is stale, expired or belongs to another project.');
        if ((await active.service.health()).status !== 'healthy')
          throw new Error(
            'Active project changed since preparation; repair or review before activation.',
          );
        const target = await generation(plan.targetGeneration, plan.kitDigest);
        const config = await json(join(target.projectDirectory, 'project.json'));
        if (
          config.id !== projectId ||
          config.profileSha256 !== plan.profileSha256 ||
          config.kitDigest !== plan.kitDigest ||
          (await target.service.health()).status !== 'healthy'
        )
          throw new Error('Prepared generation changed or failed verification.');
        // Activation never silently enables data collection or remote provider calls.
        await target.service.setTelemetry(false);
        await target.service.setAI({ enabled: false });
        return catalog.activate(
          {
            projectId,
            expectedRevision: input.expectedRevision,
            generationId: plan.targetGeneration,
            kitDigest: plan.kitDigest,
            profileSha256: plan.profileSha256,
            reason: input.reason,
          },
          actor,
        );
      });
    }
    async function prepareRollback(projectId, { generationId, expectedRevision }, actor) {
      catalog.authorize(actor, 'plan-update', projectId);
      const historical = catalog
        .generations(projectId, actor)
        .find((item) => item.id === generationId);
      if (!historical)
        throw new Error('Rollback target is not a retained generation of this project.');
      const target = await generation(historical.id, historical.kitDigest);
      if ((await target.service.health()).status !== 'healthy')
        throw new Error('Retained generation requires review before rollback.');
      const profile = await json(join(target.projectDirectory, 'profile.json'));
      return prepareUpdate(
        projectId,
        { expectedRevision, kitDigest: historical.kitDigest, profile },
        actor,
      );
    }
    return {
      catalog,
      location: root,
      policy: {
        requireSignature: policy.requireSignature,
        trustedKeyIds: policy.trustedKeys.map((key) => key.keyId),
      },
      installKit,
      listKits,
      createProject,
      status,
      inventory,
      execute,
      prepareUpdate,
      activate,
      prepareRollback,
      close: () => catalog.close(),
    };
  } catch (error) {
    catalog.close();
    throw error;
  }
}
