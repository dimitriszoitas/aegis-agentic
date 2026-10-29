#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { boundedJson, limits, loadContext } from './context.mjs';

export const guidance = Object.freeze({
  'build-ui': 'skills/build-ui/SKILL.md',
  'audit-ui': 'skills/audit-ui/SKILL.md',
  'agentic-contract': 'skills/references/agentic-contract.md',
  'design-contract': 'skills/references/design-contract.md',
  'page-composition': 'skills/references/page-composition.md',
  'pattern-policy': 'skills/references/pattern-policy.md',
  'compose-pattern': 'skills/compose-pattern/SKILL.md',
  'extend-design-language': 'skills/extend-design-language/SKILL.md',
});
function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    if (!['--kit', '--project', '--lock', '--profile', '--policy', '--recipes'].includes(name) || !args[i + 1] || args[i + 1].startsWith('--') || Object.hasOwn(options, name.slice(2))) throw new Error('Use --kit <installed-kit> [--project <root> --lock <relative-lock> --profile <relative-profile> --policy <relative-policy> --recipes <relative-recipes>].');
    options[name.slice(2)] = args[i + 1];
  }
  // Portable bundled entry lives at <kit>/bin/aegis-mcp.mjs.
  options.kit ??= resolve(dirname(fileURLToPath(import.meta.url)), '..');
  return options;
}
function output(value) {
  const text = JSON.stringify(value);
  if (Buffer.byteLength(text) > limits.outputBytes) throw new Error('Result exceeds output limit; narrow the search or read one resource.');
  return { content: [{ type: 'text', text }], structuredContent: value };
}
function entrySummary(entry) {
  return { id: entry.id, apiFamilyId: entry.apiFamilyId, registryId: entry.registryId, name: entry.name, kind: entry.kind, summary: entry.summary, aliases: entry.aliases, importPaths: entry.importPaths, coverage: entry.coverage, contract: entry.contract ? { id: entry.contract.id, version: entry.contract.version, status: entry.contract.status, source: entry.contract.source, references: entry.contract.references ?? [] } : null, resources: { api: entry.api ? `aegis://api/${encodeURIComponent(entry.id)}` : null, contract: entry.contract ? `aegis://contracts/${encodeURIComponent(entry.id)}` : null } };
}
export async function createServer(options) {
  const context = await loadContext(options);
  const server = new McpServer({ name: 'aegis-agentic-readonly', version: '0.1.0-experiment.0' }, { supportedProtocolVersions: ['2025-11-25'], maxToolInputElements: 2000 });
  const resource = (name, uri, description, mimeType, read) => server.registerResource(name, uri, { description, mimeType }, async (url) => {
    await context.assertFresh();
    const text = await read();
    if (Buffer.byteLength(text) > limits.resourceBytes) throw new Error('Resource exceeds output limit.');
    return { contents: [{ uri: url.href, mimeType, text }] };
  });
  resource('project-context', 'aegis://context', 'Explicit installed kit and project binding; unbound is not project approval.', 'application/json', async () => JSON.stringify(context.metadata()));
  if (context.projectRoot) {
    resource('project-profile', 'aegis://project-profile', 'Exact configured profile bound at startup; its hash was checked against the explicit lock.', 'application/json', () => context.projectRead('profile'));
    if (context.binding.recipesPath) resource('project-recipes', 'aegis://project-recipes', 'Exact project recipes selected at startup; changes invalidate this binding.', 'application/json', () => context.projectRead('recipes'));
    resource('project-policy', 'aegis://project-policy', 'Current explicitly configured product pattern decisions. The policy may change; audit reports fingerprint the policy and declared sources.', 'application/json', () => context.projectRead('policy'));
  }
  resource('contract-catalogue', 'aegis://catalogue', 'Coverage and discovery links; authored rules and source API facts are separate, neither implies passing evidence.', 'application/json', async () => JSON.stringify({ coverage: context.core.getContractCoverage(), entries: context.catalogue.entries.map(entrySummary) }));
  for (const entry of context.catalogue.entries) {
    if (entry.contract) resource(`contract-${entry.id}`, `aegis://contracts/${encodeURIComponent(entry.id)}`, `Exact authored contract: ${entry.name}. Linked evidence is historical, not current certification.`, 'application/json', () => context.kitRead(entry.contract.source.path, limits.resourceBytes, entry.contract.source.sha256));
    if (entry.api) {
      if (!entry.api.source.path.startsWith('public/ai/components/')) throw new Error(`Unsupported API source mapping: ${entry.id}`);
      const path = entry.api.source.path.replace(/^public\/ai\//, 'reference-api/ai/');
      resource(`api-${entry.id}`, `aegis://api/${encodeURIComponent(entry.id)}`, `Exact source-derived public API metadata for ${entry.name}; no inferred behavior guarantees.`, 'application/json', () => context.kitRead(path, limits.resourceBytes, entry.api.source.sha256));
    }
  }
  for (const profile of context.kit.profiles) resource(`profile-${profile.id}`, `aegis://profiles/${encodeURIComponent(profile.id)}`, `Installed preset ${profile.name}. A bound project may have a different configured profile.`, 'application/json', () => context.kitRead(`profiles/${profile.id}.json`));
  resource('page-recipes', 'aegis://page-recipes', 'Supported page selections and their explicitly bounded validation scope.', 'application/json', () => context.kitRead(context.kit.pageComposition.recipes));
  for (const [name, path] of Object.entries(guidance)) resource(`guidance-${name}`, `aegis://guidance/${name}`, `Exact installed source guidance: ${path}`, 'text/markdown', () => context.kitRead(path));
  for (const [name, path] of Object.entries(context.kit.authoringGuidance?.skills ?? {})) resource(`guidance-${name}`, `aegis://guidance/${name}`, `Exact library authoring guidance: ${path}. Requires a library source checkout; an installed package does not supply source editing or build workflows.`, 'text/markdown', () => context.kitRead(path));
  if (context.kit.publicEntryCoverage) {
    const coverage = context.kit.publicEntryCoverage;
    resource('public-entry-coverage', 'aegis://public-entry-coverage', 'Exact public UI ownership and export classifications; source coverage is not runtime certification.', 'application/json', () => context.kitRead(coverage.path, limits.resourceBytes, coverage.sha256));
  }
  const tool = (name, description, inputSchema, handler) => server.registerTool(name, { description, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } }, async (input) => {
    try { boundedJson(input); await context.assertFresh(); return output(await handler(input)); }
    catch (error) { return { isError: true, content: [{ type: 'text', text: String(error.message ?? error).slice(0, 4000) }] }; }
  });
  tool('search_contracts', 'Search installed authored contracts and source API capabilities. Coverage is not a certification.', z.object({ query: z.string().max(256), limit: z.number().int().min(1).max(30).default(10) }).strict(), async ({ query, limit }) => {
    const results = context.core.searchContracts(query);
    return { context: context.metadata(), total: results.length, entries: results.slice(0, limit).map(entrySummary) };
  });
  if (typeof context.core.discoverByBehavior === 'function' && typeof context.core.resolveProjectRecipe === 'function') {
    tool('discover_by_behavior', 'Resolve intended behavior before selecting an implementation. Distinguishes in-flow push filters from modal sheets and record inspection; includes project recipe obligations and rejected substitutions.', z.object({ query: z.string().min(1).max(256), intent: z.enum(['push-filtering', 'inline-filtering', 'modal-side-sheet', 'record-details', 'collection-page', 'detail-page', 'settings-page', 'dashboard-page']).optional(), archetype: z.enum(['collection', 'detail', 'settings', 'dashboard']).optional(), projectRecipes: z.unknown().optional(), requestedComponent: z.string().min(1).max(128).optional(), limit: z.number().int().min(1).max(30).default(10) }).strict(), async (input) => {
      const selected = await context.recipeContext(input.projectRecipes);
      return { result: context.core.discoverByBehavior({ ...input, projectRecipes: selected.config }, { patternPolicy: selected.patternPolicy }), recipeBinding: selected.binding, context: context.metadata() };
    });
    tool('resolve_project_recipe', 'Validate and resolve approved project variants into imports, props, required host state and acceptance references. Read-only implementation plan, not rendered certification.', z.object({ archetype: z.enum(['collection', 'detail', 'settings', 'dashboard']), projectRecipes: z.unknown().optional() }).strict(), async ({ archetype, projectRecipes }) => {
      const selected = await context.recipeContext(projectRecipes);
      if (!selected.config) throw new Error('Provide projectRecipes or start with --project and --recipes.');
      return { resolved: context.core.resolveProjectRecipe(selected.config, archetype, { patternPolicy: selected.patternPolicy }), recipeBinding: selected.binding, context: context.metadata() };
    });
  }
  tool('inspect_project_context', 'Inspect the startup-selected project lock and installed kit; reports unbound when no project was selected.', z.object({}).strict(), async () => context.metadata());
  tool('validate_page_recipe', 'Validate recipe selection with the installed core. Does not inspect rendered content, interaction, or visual quality.', z.object({ selection: z.unknown() }).strict(), async ({ selection }) => {
    const issues = context.core.validatePageLayoutRecipe(selection);
    return { valid: !issues.length, issues, scope: 'recipe-selection-only', context: context.metadata() };
  });
  tool('validate_composition', 'Resolve the installed deterministic composition contract; bound mode verifies profile ID/hash. Profile revision is declared, not attested by supported locks.', z.object({ spec: z.unknown() }).strict(), async ({ spec }) => {
    if (context.projectRoot && (spec?.profileId !== context.binding.profileId || spec?.profileHash !== context.binding.profileHash)) throw new Error('Composition profile ID/hash differs from the explicit project pin.');
    const resolved = context.core.resolveComposition(spec, context.core.registry);
    return { valid: true, resolved, profileIdentityAndHashVerified: Boolean(context.projectRoot), profileRevisionAttested: false, scope: 'composition-specification-only', context: context.metadata() };
  });
  tool('audit_product_patterns', 'Audit only declared sources in the startup-bound product policy using the installed static policy engine. No source writes or rendered acceptance.', z.object({}).strict(), async () => ({ report: await context.audit(), context: context.metadata() }));
  for (const [name, skill] of [['build_page', 'build-ui'], ['audit_page', 'audit-ui']]) server.registerPrompt(name, { description: `Prepare ${name === 'build_page' ? 'page construction' : 'page audit'} using exact installed guidance and explicit project context. This adapter remains read-only.`, argsSchema: z.object({ task: z.string().min(1).max(4000) }) }, async ({ task }) => {
    await context.assertFresh();
    const paths = [guidance[skill], guidance['agentic-contract'], guidance['page-composition'], guidance['design-contract'], guidance['pattern-policy']];
    const source = [];
    for (const path of paths) source.push(`Source: ${path}\n${await context.kitRead(path, 64 * 1024)}`);
    const text = `Task: ${task}\n\nInstalled context:\n${JSON.stringify(context.metadata())}\n\nThe following are exact installed guidance files. Discovery facts and historical evidence do not certify a newly built page. The MCP adapter exposes read-only discovery and validation; any changes require the host agent's existing authority.\n\n${source.join('\n\n')}`;
    if (Buffer.byteLength(text) > limits.outputBytes) throw new Error('Prompt exceeds output limit.');
    return { messages: [{ role: 'user', content: { type: 'text', text } }] };
  });
  return server;
}
try {
  const server = await createServer(parseOptions(process.argv.slice(2)));
  await server.connect(new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 128 * 1024 }));
} catch (error) {
  process.stderr.write(`Aegis MCP startup failed: ${String(error.message ?? error).slice(0, 4000)}\n`);
  process.exitCode = 1;
}
