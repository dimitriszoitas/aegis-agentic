import { createHash } from 'node:crypto';
import { open, realpath, stat as fileStat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const limits = Object.freeze({ resourceBytes: 256 * 1024, inputBytes: 32 * 1024, inputDepth: 16, policyBytes: 64 * 1024, sourceFiles: 100, sourceBytes: 256 * 1024, totalSourceBytes: 2 * 1024 * 1024, runtimeBytes: 32 * 1024 * 1024, outputBytes: 256 * 1024 });
export const supportedKitRevisions = Object.freeze({
  '0.4.0-experiment.0': 2,
  '0.5.0-experiment.0': 3,
  '0.6.0-experiment.0': 4,
  '0.7.0-experiment.0': 5,
});
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const within = (root, file) => { const part = relative(root, file); return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`)); };
export function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || value.includes('\\') || value.includes(':') || value.includes('\0') || value.split('/').some((part) => !part || part === '.' || part === '..') || isAbsolute(value)) throw new Error('Expected a normalized relative path within the configured root.');
  return value;
}
export async function readBound(root, path, maxBytes = limits.resourceBytes) {
  safeRelative(path);
  const actual = await realpath(resolve(root, path));
  if (!within(root, actual)) throw new Error(`Path escapes configured root: ${path}`);
  const handle = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await handle.stat();
    const current = await realpath(resolve(root, path));
    const currentStat = await fileStat(current);
    if (!within(root, current) || current !== actual || currentStat.dev !== stat.dev || currentStat.ino !== stat.ino) throw new Error(`Path changed while opening: ${path}`);
    if (!stat.isFile() || stat.size > maxBytes) throw new Error(`File exceeds allowed size or is not regular: ${path}`);
    // Read at most limit + 1, even if another process grows the file after stat.
    const buffer = Buffer.alloc(maxBytes + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await handle.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size > maxBytes) throw new Error(`File exceeds allowed size: ${path}`);
    return buffer.subarray(0, size).toString('utf8');
  } finally { await handle.close(); }
}
export function boundedJson(value) {
  if (Buffer.byteLength(JSON.stringify(value) ?? '') > limits.inputBytes) throw new Error('Input exceeds the 32 KiB JSON limit.');
  const visit = (item, depth) => { if (depth > limits.inputDepth) throw new Error('Input exceeds the JSON depth limit.'); if (item && typeof item === 'object') for (const child of Object.values(item)) visit(child, depth + 1); };
  visit(value, 0);
  return value;
}
const parse = (text, label) => { try { return JSON.parse(text); } catch { throw new Error(`Invalid JSON: ${label}`); } };
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export async function loadContext(options) {
  const kitRoot = await realpath(resolve(options.kit));
  const integrityText = await readBound(kitRoot, 'integrity.json', 2 * 1024 * 1024);
  const integrity = parse(integrityText, 'integrity.json');
  const kitIntegritySha256 = sha256(integrityText);
  const kitRead = async (path, maxBytes = limits.resourceBytes, expectedHash) => {
    if (!Object.hasOwn(integrity, path) || !digest(integrity[path])) throw new Error(`Kit file is not covered by integrity manifest: ${path}`);
    const text = await readBound(kitRoot, path, maxBytes);
    const hash = sha256(text);
    if (hash !== integrity[path] || (expectedHash !== undefined && hash !== expectedHash)) throw new Error(`Kit file integrity mismatch: ${path}`);
    return text;
  };
  const kit = parse(await kitRead('kit.json'), 'kit.json');
  if (kit.name !== '@dimitriszoitas/aegis-agentic' || kit.schemaVersion !== 1 || !Object.hasOwn(supportedKitRevisions, kit.version) || kit.compilerVersion !== '1' || kit.registryRevision !== supportedKitRevisions[kit.version]) throw new Error('Unsupported kit identity/schema.');
  if (kit.authoringGuidance !== undefined) {
    const authoring = kit.authoringGuidance;
    if (!object(authoring) || authoring.requiredWorkflow !== 'library-source-checkout' || !object(authoring.skills) || Object.keys(authoring.skills).some((name) => !['create-component', 'create-token', 'create-layout'].includes(name))) throw new Error('Unsupported authoring guidance metadata.');
    for (const path of Object.values(authoring.skills)) safeRelative(path);
  }
  if (kit.publicEntryCoverage !== undefined) {
    const coverage = kit.publicEntryCoverage;
    if (!object(coverage) || (coverage.sha256 !== undefined && !digest(coverage.sha256))) throw new Error('Invalid public entry coverage metadata.');
    safeRelative(coverage.path);
  }
  if (kit.repositorySystemization !== undefined) {
    const systemization = kit.repositorySystemization;
    if (!object(systemization) || systemization.workflow !== 'agent-assisted-staged-refactor' || systemization.defaultDesignTreatment !== 'preserve-existing' || systemization.automaticMigration !== false || !Array.isArray(systemization.references) || systemization.references.length > 8) throw new Error('Unsupported repository systemization metadata.');
    for (const path of [systemization.guidance, ...systemization.references]) safeRelative(path);
  }
  const runtimePath = safeRelative(kit.runtime);
  const runtimeText = await kitRead(runtimePath, limits.runtimeBytes);
  // Dynamic file imports intentionally resolve the supplied installed kit; no repository fallback.
  const core = await import(pathToFileURL(resolve(kitRoot, runtimePath)).href);
  for (const name of ['compileProfile', 'searchContracts', 'getContractEntry', 'getContractCoverage', 'validatePageLayoutRecipe', 'resolveComposition']) if (typeof core[name] !== 'function') throw new Error(`Installed kit is missing required export: ${name}`);
  if (!Array.isArray(core.contractCatalogue?.entries) || core.contractCatalogue.schemaVersion !== 1 || core.contractCatalogue.package?.name !== kit.name || core.contractCatalogue.package?.version !== kit.version || core.contractCatalogue.registryRevision !== kit.registryRevision || core.registry?.revision !== kit.registryRevision) throw new Error('Installed catalogue/registry does not match kit.');
  const catalogue = core.contractCatalogue;
  const projectRoot = options.project ? await realpath(resolve(options.project)) : null;
  if (!projectRoot && (options.lock || options.profile || options.policy || options.recipes)) throw new Error('Project options require --project.');
  const lockPath = safeRelative(options.lock ?? 'aegis-lock.json');
  const profilePath = safeRelative(options.profile ?? 'profile/profile.json');
  const policyPath = safeRelative(options.policy ?? 'pattern-policy.json');
  const recipesPath = options.recipes ? safeRelative(options.recipes) : null;
  let lockText, profileText, recipesText, projectRecipes, binding;
  if (projectRoot) {
    lockText = await readBound(projectRoot, lockPath, limits.policyBytes);
    const lock = parse(lockText, lockPath);
    profileText = await readBound(projectRoot, profilePath, limits.policyBytes);
    const compiled = core.compileProfile(parse(profileText, profilePath));
    if (lock.schemaVersion !== 1 || lock.registryRevision !== kit.registryRevision || lock.profileHash !== compiled.hash) throw new Error('Project pin does not match the installed registry/profile.');
    let lockKind;
    if (lock.package !== undefined) {
      lockKind = 'consumer-package-lock';
      if (lock.package !== kit.name || lock.version !== kit.version || lock.kitIntegritySha256 !== kitIntegritySha256 || lock.profileId !== compiled.profile.id || !digest(lock.tarballSha256)) throw new Error('Consumer package/kit/profile pin mismatch.');
    } else if (lock.kitVersion !== undefined) {
      lockKind = 'compiled-profile-lock';
      if (lock.kitVersion !== kit.version || lock.runtimeSha256 !== sha256(runtimeText) || lock.approvedSourceSha256 !== sha256(core.canonicalJson(compiled.profile))) throw new Error('Compiled profile lock does not match installed kit/runtime/source.');
    } else throw new Error('Unsupported project lock format; explicit consumer or compiled-profile lock required.');
    binding = { status: 'bound', projectRoot, lockPath, lockKind, lockSha256: sha256(lockText), profilePath, profileId: compiled.profile.id, profileHash: compiled.hash, profileSourceSha256: sha256(profileText), profileRevisionAttested: false, policyPath, dependencySource: lock.dependencySource ?? null, declaredTarballSha256: lock.tarballSha256 ?? null, tarballBytesVerified: false };
  } else binding = { status: 'unbound', projectRoot: null, profileRevisionAttested: false, note: 'Discovery uses only this installed kit. No project/profile pin or product policy is attested.' };
  if (recipesPath) {
    if (typeof core.validateProjectRecipes !== 'function') throw new Error('Installed kit does not support project recipes.');
    recipesText = await readBound(projectRoot, recipesPath, limits.policyBytes);
    projectRecipes = parse(recipesText, recipesPath);
    const validation = core.validateProjectRecipes(projectRecipes);
    if (!validation.valid) throw new Error(`Invalid project recipes: ${JSON.stringify(validation.issues)}`);
    binding = { ...binding, recipesPath, recipesSha256: sha256(recipesText), recipesProject: projectRecipes.project, recipesRevision: projectRecipes.revision };
  }
  const metadata = () => ({ kit: { name: kit.name, version: kit.version, registryRevision: kit.registryRevision, compilerVersion: kit.compilerVersion, integritySha256: kitIntegritySha256, ...(kit.authoringGuidance ? { authoringGuidance: kit.authoringGuidance } : {}), ...(kit.publicEntryCoverage ? { publicEntryCoverage: kit.publicEntryCoverage } : {}), ...(kit.repositorySystemization ? { repositorySystemization: kit.repositorySystemization } : {}) }, binding, readOnly: true, supportedProtocolVersions: ['2025-11-25'], limits });
  const assertFresh = async () => {
    if (sha256(await readBound(kitRoot, 'integrity.json', 2 * 1024 * 1024)) !== kitIntegritySha256) throw new Error('Kit snapshot changed; restart against explicit pins.');
    await kitRead('kit.json');
    await kitRead(runtimePath, limits.runtimeBytes);
    if (recipesPath && await readBound(projectRoot, recipesPath, limits.policyBytes) !== recipesText) throw new Error('Project recipes changed; restart to validate the new binding.');
    if (projectRoot && (await readBound(projectRoot, lockPath, limits.policyBytes) !== lockText || await readBound(projectRoot, profilePath, limits.policyBytes) !== profileText)) throw new Error('Project pin/profile changed; restart to validate the new binding.');
  };
  let policyEngine;
  const audit = async () => {
    if (!projectRoot) throw new Error('Product audit requires startup --project and a matching explicit lock.');
    const policy = parse(await readBound(projectRoot, policyPath, limits.policyBytes), policyPath);
    boundedJson(policy);
    const enginePath = safeRelative(kit.patternPolicy?.runtime);
    await kitRead(enginePath, limits.runtimeBytes);
    if (!policyEngine) {
      policyEngine = await import(pathToFileURL(resolve(kitRoot, enginePath)).href);
    }
    const validation = policyEngine.validatePatternPolicy(policy);
    if (!validation.valid) return policyEngine.auditPatternSources(policy, {});
    const scopeRoot = policy.scope === '.' ? projectRoot : await realpath(resolve(projectRoot, safeRelative(policy.scope)));
    if (!within(projectRoot, scopeRoot)) throw new Error('Policy scope escapes the project root.');
    const paths = [...new Set([...policy.pages.map((page) => page.source), ...Object.values(policy.patterns).map((pattern) => pattern.source).filter(Boolean), ...(policy.routeInventory ? [policy.routeInventory.source] : [])])];
    if (paths.length > limits.sourceFiles) throw new Error('Policy exceeds the 100 source file limit.');
    const sources = Object.create(null);
    let total = 0;
    for (const path of paths) {
      const actual = await realpath(resolve(projectRoot, safeRelative(path)));
      if (!within(scopeRoot, actual)) throw new Error(`Declared source escapes the policy scope: ${path}`);
      const text = await readBound(projectRoot, path, limits.sourceBytes);
      total += Buffer.byteLength(text);
      if (total > limits.totalSourceBytes) throw new Error('Policy exceeds the 2 MiB source total limit.');
      sources[path] = text;
    }
    return policyEngine.auditPatternSources(policy, sources);
  };
  const recipeContext = async (inlineConfig) => {
    if (inlineConfig !== undefined && projectRecipes && core.serializeProjectRecipes(inlineConfig) !== core.serializeProjectRecipes(projectRecipes)) throw new Error('Inline project recipes differ from the explicit startup binding.');
    const config = projectRecipes ?? inlineConfig;
    if (config !== undefined) { const check = core.validateProjectRecipes(config); if (!check.valid) throw new Error(`Invalid project recipes: ${JSON.stringify(check.issues)}`); }
    let patternPolicy;
    if (projectRoot && config !== undefined) {
      patternPolicy = parse(await readBound(projectRoot, policyPath, limits.policyBytes), policyPath);
      const enginePath = safeRelative(kit.patternPolicy?.runtime);
      await kitRead(enginePath, limits.runtimeBytes);
      policyEngine ??= await import(pathToFileURL(resolve(kitRoot, enginePath)).href);
      const validation = policyEngine.validatePatternPolicy(patternPolicy);
      if (!validation.valid) throw new Error('Project pattern policy is invalid.');
      if (patternPolicy.product !== config.project) throw new Error('Project recipes and pattern policy identify different products.');
    }
    return { config, patternPolicy, binding: projectRecipes ? 'startup-bound' : config ? 'inline-proposal' : 'unbound' };
  };
  const projectRead = async (kind) => {
    if (!projectRoot || !['profile', 'policy', ...(recipesPath ? ['recipes'] : [])].includes(kind)) throw new Error('Only explicitly bound project inputs can be read.');
    return readBound(projectRoot, kind === 'profile' ? profilePath : kind === 'recipes' ? recipesPath : policyPath, limits.policyBytes);
  };
  if (projectRecipes) await recipeContext(undefined);
  return { kitRoot, kit, core, catalogue, kitRead, projectRoot, binding, metadata, assertFresh, audit, projectRead, recipeContext };
}
