#!/usr/bin/env node
import * as core from '../runtime/core.mjs';
import { createHash, randomUUID } from 'node:crypto';
import {
  readFile,
  writeFile,
  mkdir,
  lstat,
  open,
  rename,
  unlink,
  copyFile,
  readdir,
} from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const print = (value) => console.log(json(value).trimEnd());
const sha = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const runtimeHash = sha(await readFile(join(kit, 'runtime/core.mjs')));
const kitInfo = await readJson(join(kit, 'kit.json'));
function options(values, allowed) {
  const result = {};
  for (let i = 0; i < values.length; i += 2) {
    const flag = values[i];
    if (
      !allowed.includes(flag) ||
      !values[i + 1] ||
      values[i + 1].startsWith('--') ||
      flag in result
    )
      throw new Error(`Invalid or repeated option ${flag}. Run help.`);
    result[flag] = values[i + 1];
  }
  return result;
}
async function safeFile(path) {
  try {
    const item = await lstat(path);
    if (item.isSymbolicLink() || !item.isFile())
      throw new Error(`Refusing non-regular file: ${path}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
async function safeDirectory(path) {
  const item = await lstat(path);
  if (!item.isDirectory() || item.isSymbolicLink())
    throw new Error(`Refusing non-local directory: ${path}`);
}
async function atomicWrite(path, content) {
  await safeFile(path);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
async function locked(path, task) {
  await mkdir(dirname(path), { recursive: true });
  let handle;
  try {
    handle = await open(path, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        `Another operation holds ${path}. Retry after it completes; do not overwrite it.`,
        { cause: error },
      );
    throw error;
  }
  try {
    return await task();
  } finally {
    await handle.close();
    await unlink(path);
  }
}
async function loadRegistry(path) {
  const value = path ? await readJson(path) : structuredClone(core.registry);
  if (core.validateRegistry) {
    const validation = core.validateRegistry(value);
    if (!validation.valid) throw new Error(json(validation.issues));
  } else if (!Number.isSafeInteger(value.revision) || !Array.isArray(value.entries))
    throw new Error('Invalid registry.');
  return value;
}
function compiledOutput(compiled) {
  return { 'profile-tokens.css': compiled.css, 'profile-tokens.json': json(compiled.manifest) };
}
async function compileTo(profile, out) {
  const compiled = core.compileProfile(profile);
  if (compiled.issues.some((issue) => issue.severity === 'error'))
    throw new Error(json(compiled.issues));
  await mkdir(out, { recursive: true });
  await safeDirectory(out);
  return locked(join(out, '.aegis-operation.lock'), async () => {
    for (const [name, value] of Object.entries(compiledOutput(compiled)))
      await atomicWrite(join(out, name), value);
    await atomicWrite(join(out, 'profile.json'), json(compiled.profile));
    await atomicWrite(
      join(out, 'profile-lock.json'),
      json({
        schemaVersion: 1,
        profileHash: compiled.hash,
        approvedSourceSha256: sha(core.canonicalJson(compiled.profile)),
        runtimeSha256: runtimeHash,
        registryRevision: core.registry.revision,
        kitVersion: kitInfo.version,
      }),
    );
    const report = {
      profile: compiled.profile,
      hash: compiled.hash,
      stats: compiled.stats,
      contrast: compiled.contrast,
      issues: compiled.issues,
      runtimeDefaults: compiled.runtimeDefaults,
      limits: [
        'Measured selected static semantic color pairs only; rendered behavior and full accessibility require review.',
      ],
    };
    await atomicWrite(join(out, 'profile-report.json'), json(report));
    return { output: out, ...report };
  });
}
async function scan(out) {
  for (const name of [
    'profile.json',
    'profile-lock.json',
    'profile-tokens.css',
    'profile-tokens.json',
  ])
    await safeFile(join(out, name));
  const profile = await readJson(join(out, 'profile.json'));
  const lock = await readJson(join(out, 'profile-lock.json'));
  const compiled = core.compileProfile(profile);
  if (
    lock.schemaVersion !== 1 ||
    lock.approvedSourceSha256 !== sha(core.canonicalJson(compiled.profile)) ||
    lock.profileHash !== compiled.hash ||
    lock.runtimeSha256 !== runtimeHash ||
    lock.registryRevision !== core.registry.revision ||
    lock.kitVersion !== kitInfo.version
  ) {
    return {
      status: 'owner-review-required',
      reason:
        'Approved profile, kit, compiler or registry identity changed. Review it and explicitly compile a new version; automatic repair cannot approve source changes.',
      changed: [],
      compiled,
    };
  }
  if (compiled.issues.some((issue) => issue.severity === 'error'))
    return {
      status: 'owner-review-required',
      reason: 'The current source fails validation.',
      changed: [],
      compiled,
    };
  const changed = [];
  for (const [name, expected] of Object.entries(compiledOutput(compiled))) {
    let actual = null;
    try {
      actual = await readFile(join(out, name), 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (actual !== expected)
      changed.push({
        path: name,
        beforeSha256: actual === null ? null : sha(actual),
        afterSha256: sha(expected),
      });
  }
  return { status: changed.length ? 'local-regeneration-available' : 'healthy', changed, compiled };
}
async function maintenance(action, out) {
  await safeDirectory(out);
  if (action === 'scan') {
    const { compiled: _compiled, ...report } = await scan(out);
    return report;
  }
  return locked(join(out, '.aegis-operation.lock'), async () => {
    const before = await scan(out);
    if (before.status !== 'local-regeneration-available') {
      const { compiled: _compiled, ...report } = before;
      return report;
    }
    const plan = core.planMaintenance(
      [
        {
          id: 'observed-profile-drift',
          kind: 'derived-drift',
          origin: 'local-check',
          summary: 'Compiled profile artifacts differ from unchanged approved source.',
          artifact: 'profile-tokens',
          sourceRevision: core.registry.revision,
          observedRevision: core.registry.revision,
        },
      ],
      { expectedRegistryRevision: core.registry.revision, maxAttempts: 1 },
    );
    const evidenceRoot = join(out, '.aegis-maintenance');
    try {
      await mkdir(evidenceRoot);
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    await safeDirectory(evidenceRoot);
    const evidenceDirectory = join(evidenceRoot, randomUUID());
    await mkdir(evidenceDirectory);
    for (const item of before.changed) {
      if (item.beforeSha256)
        await copyFile(join(out, item.path), join(evidenceDirectory, item.path + '.before'));
      await atomicWrite(join(out, item.path), compiledOutput(before.compiled)[item.path]);
    }
    const after = await scan(out);
    const assessment = core.assessRepair(plan, {
      registryRevision: core.registry.revision,
      attempt: 1,
      changedFiles: before.changed.map((item) => `agentic-dist/${item.path}`),
      artifactPaths: before.changed.map((item) => `agentic-dist/${item.path}`),
      sourceChanged: after.status === 'owner-review-required',
      testsChanged: false,
      oracleChanged: false,
      checksPassed: after.status === 'healthy',
      driftRemaining: after.changed.length > 0,
    });
    const report = {
      ...assessment,
      attempt: 1,
      changed: before.changed,
      evidenceDirectory,
      plan,
      after: after.status,
      protectedInputsUnchanged: after.status !== 'owner-review-required',
    };
    await writeFile(join(evidenceDirectory, 'report.json'), json(report));
    return report;
  });
}

const help = `Aegis Agentic ${kitInfo.version}

profile validate <profile.json>
profile compile <profile.json> --out <project/agentic-dist>
composition validate <spec.json> [--profile <profile.json>] [--registry <canonical.json>]
patterns check <policy.json> --project <project-root>
pages recipes
pages validate <selection.json>
registry search <query> [--registry <canonical.json>]
contracts list
contracts search <query>
contracts get <entry-or-family-id>
contracts coverage
registry compare <proposal-a.json> <proposal-b.json> [--registry <canonical.json>]
registry submit <proposal.json> --registry <canonical.json> --expected-revision <number>
registry consolidate <proposal-a.json> <proposal-b.json> [--registry <canonical.json>]
registry promote <plan.json> --approval <owner-approval.json> --registry <canonical.json>
maintain scan --out <project/agentic-dist>
maintain repair --out <project/agentic-dist>
maintain plan <evidence.json> [--registry <canonical.json>]
status

The CLI runs locally. It never commits, publishes, sends data or invokes an LLM.
Submit stores proposals beside the shared registry; promotion needs an explicit owner
decision and evidence. Repair only regenerates known outputs from unchanged locked inputs.
`;

try {
  const [group, action, ...rest] = args;
  if (!group || ['help', '--help', '-h'].includes(group)) console.log(help);
  else if (group === 'status') print(kitInfo);
  else if (group === 'contracts') {
    if (action === 'list' || action === 'coverage') {
      if (rest.length) throw new Error(`contracts ${action} takes no arguments.`);
      print(action === 'list' ? core.searchContracts('') : core.getContractCoverage());
    } else if (action === 'search' || action === 'get') {
      if (rest.length !== 1 || !rest[0].trim())
        throw new Error(`contracts ${action} requires exactly one non-empty query or ID.`);
      if (action === 'search') print(core.searchContracts(rest[0]));
      else {
        const entry = core.getContractEntry(rest[0]);
        if (!entry) throw new Error(`Unknown contract entry: ${rest[0]}`);
        print(entry);
      }
    } else throw new Error('Unknown contracts command. Use list, search, get or coverage.');
  } else if (group === 'pages') {
    if (action === 'recipes') {
      if (rest.length) throw new Error('pages recipes takes no arguments.');
      print(core.pageLayoutRecipes);
    } else if (action === 'validate') {
      if (rest.length !== 1) throw new Error('Supply exactly one page recipe selection JSON file.');
      const issues = core.validatePageLayoutRecipe(await readJson(rest[0]));
      print({
        valid: issues.length === 0,
        issues,
        recipeVersion: core.pageLayoutRecipes.version,
        registryRevision: core.registry.revision,
        scope: 'recipe-selection-only',
      });
      if (issues.length) process.exitCode = 1;
    } else
      throw new Error(
        'Unknown pages command. Use pages recipes or pages validate <selection.json>.',
      );
  } else if (group === 'patterns' && action === 'check') {
    const [file, ...flags] = rest;
    const opts = options(flags, ['--project']);
    if (!file || !opts['--project']) throw new Error('Supply a policy file and --project root.');
    const { auditProductPatterns } = await import('../runtime/pattern-policy.mjs');
    const result = await auditProductPatterns({
      root: resolve(opts['--project']),
      policyPath: file,
    });
    print(result);
    if (!result.valid) process.exitCode = 1;
  } else if (group === 'profile') {
    const [file, ...flags] = rest;
    if (!file) throw new Error('Supply a profile JSON file.');
    const profile = await readJson(file);
    if (action === 'validate') {
      if (flags.length) throw new Error('Unexpected profile validate options.');
      const issues = core.validateProfile(profile);
      print({ valid: !issues.some((issue) => issue.severity === 'error'), issues });
      if (issues.some((issue) => issue.severity === 'error')) process.exitCode = 1;
    } else if (action === 'compile') {
      const opts = options(flags, ['--out']);
      if (!opts['--out']) throw new Error('--out is required.');
      print(await compileTo(profile, resolve(opts['--out'])));
    } else throw new Error('Unknown profile command.');
  } else if (group === 'composition' && action === 'validate') {
    const [file, ...flags] = rest;
    const opts = options(flags, ['--profile', '--registry']);
    const source = await loadRegistry(opts['--registry']);
    const spec = await readJson(file);
    const compiled = opts['--profile']
      ? core.compileProfile(await readJson(opts['--profile']))
      : undefined;
    print(
      core.resolveComposition(
        spec,
        source,
        compiled
          ? { id: compiled.profile.id, revision: spec.profileRevision, fingerprint: compiled.hash }
          : undefined,
      ),
    );
  } else if (group === 'registry') {
    if (action === 'search') {
      const [query = '', ...flags] = rest;
      const opts = options(flags, ['--registry']);
      print(core.discoverRegistry(query, await loadRegistry(opts['--registry'])));
    } else if (['compare', 'consolidate'].includes(action)) {
      const [a, b, ...flags] = rest;
      const opts = options(flags, ['--registry']);
      const source = await loadRegistry(opts['--registry']);
      const proposals = [await readJson(a), await readJson(b)];
      print(
        action === 'compare'
          ? core.compareProposals(...proposals, source)
          : core.planConsolidation(
              proposals.map((proposal) => proposal.id),
              { expectedRevision: source.revision },
              source,
              proposals,
            ),
      );
    } else if (action === 'submit') {
      const [file, ...flags] = rest;
      const opts = options(flags, ['--registry', '--expected-revision']);
      if (!opts['--registry'] || !opts['--expected-revision'])
        throw new Error('--registry and --expected-revision are required.');
      const path = resolve(opts['--registry']);
      print(
        await locked(path + '.lock', async () => {
          const source = await loadRegistry(path);
          if (source.revision !== Number(opts['--expected-revision']))
            throw new Error('Stale registry revision. Refresh and reconcile before submitting.');
          const proposal = await readJson(file);
          const validation = core.validateProposal(proposal, source);
          if (!validation.valid) throw new Error(json(validation.issues));
          const directory = join(dirname(path), 'submissions');
          await mkdir(directory, { recursive: true });
          const destination = join(directory, proposal.id + '.json');
          await writeFile(destination, json(proposal), { flag: 'wx' });
          return {
            status: 'proposed',
            path: destination,
            registryRevision: source.revision,
            requiresOwnerReview: true,
            note: 'This reserves a proposal ID, not a globally exclusive capability. Review overlapping proposals before promotion.',
          };
        }),
      );
    } else if (action === 'promote') {
      const [file, ...flags] = rest;
      const opts = options(flags, ['--approval', '--registry']);
      if (!opts['--registry'] || !opts['--approval'])
        throw new Error('--registry and --approval are required.');
      const path = resolve(opts['--registry']);
      print(
        await locked(path + '.lock', async () => {
          const source = await loadRegistry(path);
          const plan = await readJson(file);
          const approval = await readJson(opts['--approval']);
          if (approval.verification?.evidencePath)
            await readFile(
              resolve(dirname(resolve(opts['--approval'])), approval.verification.evidencePath),
            );
          let candidates = core.proposals;
          try {
            const directory = join(dirname(path), 'submissions');
            candidates = await Promise.all(
              (await readdir(directory))
                .filter((name) => name.endsWith('.json'))
                .map((name) => readJson(join(directory, name))),
            );
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
          }
          const next = core.applyConsolidation(source, plan, approval, candidates);
          await copyFile(path, `${path}.revision-${source.revision}.backup`);
          await atomicWrite(path, json(next));
          return {
            status: 'promoted',
            revision: next.revision,
            target: plan.targetId,
            reviewedBy: approval.reviewedBy,
            note: 'The supplied owner record is an explicit decision, not an authenticated identity. Git review and protected release controls remain authoritative.',
          };
        }),
      );
    } else throw new Error('Unknown registry command.');
  } else if (group === 'maintain') {
    if (['scan', 'repair'].includes(action)) {
      const opts = options(rest, ['--out']);
      if (!opts['--out']) throw new Error('--out is required.');
      const result = await maintenance(action, resolve(opts['--out']));
      print(result);
      if (
        result.status === 'owner-review-required' ||
        (action === 'scan' && result.status !== 'healthy')
      )
        process.exitCode = 1;
    } else if (action === 'plan') {
      const [file, ...flags] = rest;
      const opts = options(flags, ['--registry']);
      const source = await loadRegistry(opts['--registry']);
      print(
        core.planMaintenance(
          await readJson(file),
          { expectedRegistryRevision: source.revision, maxAttempts: 1 },
          source,
        ),
      );
    } else throw new Error('Unknown maintenance command.');
  } else throw new Error('Unknown command. Run help.');
} catch (error) {
  print({ error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
}
