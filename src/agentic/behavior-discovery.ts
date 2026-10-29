import { contractCatalogue, type ContractEntry } from './contracts';
import { discoverRegistry } from './registry';
import {
  normalizeProjectRecipes,
  resolveProjectRecipe,
  type ProjectRecipes,
  type ResolvedProjectRecipe,
} from './project-recipes';
import type { PageArchetype } from '../patterns/page-layout/recipes';

export type BehaviorIntent =
  | 'push-filtering'
  | 'inline-filtering'
  | 'modal-side-sheet'
  | 'record-details'
  | 'collection-page'
  | 'detail-page'
  | 'settings-page'
  | 'dashboard-page';
export interface BehaviorDiscoveryQuery {
  query: string;
  intent?: BehaviorIntent;
  archetype?: PageArchetype;
  projectRecipes?: ProjectRecipes;
  requestedComponent?: string;
  limit?: number;
}
export interface BehaviorCapability {
  intent: BehaviorIntent;
  purpose: string;
  contractIds: readonly string[];
  aliases: readonly string[];
  excludes: readonly string[];
  obligation: string;
}
export const behaviorCapabilities: readonly BehaviorCapability[] = [
  {
    intent: 'push-filtering',
    purpose:
      'Filter a collection beside live results in an in-flow panel that resizes the results.',
    contractIds: ['filter-panel', 'filter-bar', 'collection-toolbar'],
    aliases: ['filter', 'filtering', 'push', 'beside', 'resize', 'sidebar'],
    excludes: ['SideSheet', 'Sheet', 'Modal'],
    obligation:
      'Host owns the push shell, expanded state, responsive stacking, domain facets and filtering. FilterOptions is reusable; full FilterPanel accepts WorkRecord only.',
  },
  {
    intent: 'inline-filtering',
    purpose: 'Place immediate filter controls in the collection toolbar without a separate panel.',
    contractIds: ['collection-toolbar', 'filter-bar'],
    aliases: ['filter', 'filtering', 'inline', 'toolbar'],
    excludes: ['SideSheet', 'Sheet', 'Modal'],
    obligation:
      'Host owns criteria and result filtering; keep search and criteria bound to the displayed count.',
  },
  {
    intent: 'modal-side-sheet',
    purpose: 'Temporarily isolate a named task in an overlay with dismissal and focus return.',
    contractIds: ['side-sheet'],
    aliases: ['modal', 'overlay', 'sheet', 'panel', 'drawer'],
    excludes: ['FilterPanel'],
    obligation:
      'Use SideSheet with docked=false; host owns open state, content, lifecycle and accessible title. This is not push filtering.',
  },
  {
    intent: 'record-details',
    purpose: 'Inspect one selected record and optionally navigate the current result set.',
    contractIds: ['side-sheet', 'page-layout'],
    aliases: ['record', 'details', 'inspect', 'selected', 'panel', 'drawer'],
    excludes: ['FilterPanel'],
    obligation:
      'Follow the project details decision: SideSheet for transient inspection or a detail route for a full page. Host owns selected identity and data.',
  },
  {
    intent: 'collection-page',
    purpose: 'Browse, search and act on a dataset using shared page and collection patterns.',
    contractIds: ['page-layout', 'page-header', 'collection-toolbar', 'data-grid'],
    aliases: ['collection', 'list', 'table', 'grid', 'browse'],
    excludes: [],
    obligation:
      'Resolve the collection recipe before choosing filters, density, search layout and record details.',
  },
  {
    intent: 'detail-page',
    purpose: 'Present one record with optional supporting content after the main region.',
    contractIds: ['page-layout', 'page-header'],
    aliases: ['detail', 'record', 'page'],
    excludes: [],
    obligation: 'Resolve the detail recipe, accessible aside label, reading measure and route.',
  },
  {
    intent: 'settings-page',
    purpose: 'Edit project preferences with a shared readable form and explicit save policy.',
    contractIds: ['page-layout', 'form-section', 'field'],
    aliases: ['settings', 'preferences', 'configuration'],
    excludes: [],
    obligation:
      'Resolve the settings recipe and provide validation, persistence and unsaved changes handling.',
  },
  {
    intent: 'dashboard-page',
    purpose: 'Scan independent summaries in an adaptive grid with bounded columns.',
    contractIds: ['page-layout', 'metric-card'],
    aliases: ['dashboard', 'metrics', 'overview'],
    excludes: [],
    obligation:
      'Resolve dashboard column caps and minimum item width; keep metrics contained in each grid item.',
  },
];
const normalized = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const contract = (id: string): ContractEntry | undefined =>
  contractCatalogue.entries.find((entry) =>
    [entry.id, entry.apiFamilyId, entry.registryId, entry.contract?.id].includes(id),
  );
const contractSummary = (entry: ContractEntry) => ({
  id: entry.id,
  name: entry.name,
  importPaths: entry.importPaths,
  contract: entry.contract
    ? { id: entry.contract.id, version: entry.contract.version, source: entry.contract.source }
    : null,
  coverage: entry.coverage,
  limitations: entry.limitations,
});
export interface BehaviorDiscoveryResult {
  query: string;
  status: 'resolved' | 'ambiguous' | 'no-match' | 'rejected';
  selectedIntent: BehaviorIntent | null;
  candidates: {
    intent: BehaviorIntent;
    score: number;
    purpose: string;
    obligation: string;
    contracts: ReturnType<typeof contractSummary>[];
  }[];
  relatedCapabilities: {
    id: string;
    name: string;
    capabilities: string[];
    importPath: string;
    contract: string;
  }[];
  rejections: { component: string; reason: string }[];
  projectRecipe: ResolvedProjectRecipe | null;
  clarification: string | null;
  limitations: string[];
}
/** Curated, deterministic retrieval. Ambiguous panel names never silently select an overlay. */
export function discoverByBehavior(
  input: BehaviorDiscoveryQuery,
  context: { patternPolicy?: unknown } = {},
): BehaviorDiscoveryResult {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Behavior discovery requires an object.');
  for (const key of Object.keys(input))
    if (
      !['query', 'intent', 'archetype', 'projectRecipes', 'requestedComponent', 'limit'].includes(
        key,
      )
    )
      throw new Error(`Unknown discovery property: ${key}.`);
  if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 256)
    throw new Error('Query must contain 1–256 characters.');
  if (
    input.intent !== undefined &&
    !behaviorCapabilities.some((item) => item.intent === input.intent)
  )
    throw new Error('Unknown behavior intent.');
  if (
    input.archetype !== undefined &&
    !['collection', 'detail', 'settings', 'dashboard'].includes(input.archetype)
  )
    throw new Error('Unknown page archetype.');
  if (
    input.requestedComponent !== undefined &&
    (typeof input.requestedComponent !== 'string' ||
      !input.requestedComponent.trim() ||
      input.requestedComponent.length > 128)
  )
    throw new Error('Requested component must contain 1–128 characters.');
  if (
    input.limit !== undefined &&
    (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 30)
  )
    throw new Error('Limit must be between 1 and 30.');
  const config =
    input.projectRecipes === undefined ? null : normalizeProjectRecipes(input.projectRecipes);
  const query = normalized(input.query);
  const words = new Set(query.split(' '));
  const filtering = /\b(filter|filters|filtering)\b/.test(query);
  const push = filtering && /\b(push|beside|resize|resizes|in flow)\b/.test(query);
  const inline = filtering && /\b(inline|toolbar)\b/.test(query);
  const recordDetails =
    /\b(record|user|customer|invoice|product)\b/.test(query) &&
    /\b(details?|inspect|inspection)\b/.test(query);
  let explicit = input.intent;
  if (!explicit && push) explicit = 'push-filtering';
  if (!explicit && inline) explicit = 'inline-filtering';
  if (!explicit && recordDetails) explicit = 'record-details';
  if (!explicit && !filtering && /\b(modal|overlay)\b/.test(query)) explicit = 'modal-side-sheet';
  if (!explicit && filtering && config && config.recipes.collection.filters !== 'none')
    explicit = config.recipes.collection.filters === 'push' ? 'push-filtering' : 'inline-filtering';
  const ranked = behaviorCapabilities
    .map((capability) => ({
      capability,
      score:
        (explicit === capability.intent ? 100 : 0) +
        capability.aliases.filter((alias) => words.has(alias)).length * 10,
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.capability.intent.localeCompare(right.capability.intent),
    );
  const unambiguous =
    ranked.length > 0 && (Boolean(explicit) || ranked[0].score > (ranked[1]?.score ?? 0));
  const selected = unambiguous ? ranked[0].capability : null;
  const inferredArchetype =
    input.archetype ??
    (selected?.intent.endsWith('-page')
      ? (selected.intent.replace('-page', '') as PageArchetype)
      : selected &&
          ['push-filtering', 'inline-filtering', 'record-details'].includes(selected.intent)
        ? 'collection'
        : undefined);
  const projectRecipe =
    config && inferredArchetype ? resolveProjectRecipe(config, inferredArchetype, context) : null;
  const rejections: BehaviorDiscoveryResult['rejections'] = [];
  if (selected)
    for (const component of selected.excludes)
      rejections.push({
        component,
        reason: `${component} does not implement ${selected.intent}. ${selected.obligation}`,
      });
  let conflict = false;
  if (config && selected && ['push-filtering', 'inline-filtering'].includes(selected.intent)) {
    const expected = selected.intent === 'push-filtering' ? 'push' : 'inline';
    if (config.recipes.collection.filters !== expected) {
      conflict = true;
      rejections.push({
        component: selected.intent,
        reason: `Project recipe selects ${config.recipes.collection.filters} filtering. A different behavior requires an explicit project recipe revision.`,
      });
    }
  }
  if (
    config &&
    selected?.intent === 'record-details' &&
    config.recipes.collection.details === 'none'
  ) {
    conflict = true;
    rejections.push({
      component: 'record-details',
      reason:
        'This project disables record inspection. Revise the project recipe before adding a detail interaction.',
    });
  }
  if (selected && input.requestedComponent) {
    const permitted: Record<BehaviorIntent, string[]> = {
      'push-filtering': ['FilterPanel', 'FilterOptions'],
      'inline-filtering': ['CollectionToolbar', 'FilterBar'],
      'modal-side-sheet': ['SideSheet'],
      'record-details':
        config?.recipes.collection.details === 'page' ? ['PageLayout'] : ['SideSheet'],
      'collection-page': ['PageLayout', 'CollectionToolbar', 'DataGrid'],
      'detail-page': ['PageLayout', 'ReadingColumn'],
      'settings-page': ['PageLayout', 'ReadingColumn', 'FormSection'],
      'dashboard-page': ['PageLayout', 'ContentGrid'],
    };
    const normalizedRequested = normalized(input.requestedComponent).replace(/ /g, '');
    if (
      !permitted[selected.intent].some(
        (name) => normalized(name).replace(/ /g, '') === normalizedRequested,
      ) &&
      !rejections.some(
        (item) => normalized(item.component).replace(/ /g, '') === normalizedRequested,
      )
    ) {
      conflict = true;
      rejections.push({
        component: input.requestedComponent,
        reason: `This implementation is not an approved choice for ${selected.intent} in the supplied context. Use ${permitted[selected.intent].join(' or ')} and satisfy the returned host obligations.`,
      });
    }
  }
  const requested = input.requestedComponent
    ? normalized(input.requestedComponent).replace(/ /g, '')
    : null;
  if (
    requested &&
    rejections.some((item) => normalized(item.component).replace(/ /g, '') === requested)
  )
    conflict = true;
  const limit = input.limit ?? 10;
  return {
    query: input.query,
    status: conflict
      ? 'rejected'
      : !ranked.length
        ? 'no-match'
        : selected
          ? 'resolved'
          : 'ambiguous',
    selectedIntent: conflict ? null : (selected?.intent ?? null),
    candidates: ranked.slice(0, limit).map(({ capability, score }) => ({
      intent: capability.intent,
      score,
      purpose: capability.purpose,
      obligation: capability.obligation,
      contracts: capability.contractIds
        .map(contract)
        .filter((entry): entry is ContractEntry => Boolean(entry))
        .map(contractSummary),
    })),
    relatedCapabilities: discoverRegistry(input.query)
      .slice(0, limit)
      .map(({ id, name, capabilities, importPath, contract }) => ({
        id,
        name,
        capabilities,
        importPath,
        contract,
      })),
    rejections,
    projectRecipe,
    clarification: conflict
      ? 'Use the project-approved behavior or explicitly revise the project recipe before implementation.'
      : ranked.length && !selected
        ? 'Specify whether this should push live results, show inline filters, isolate a modal task, or inspect a selected record.'
        : null,
    limitations: [
      'Intent ranking is curated lexical retrieval, not language-model inference.',
      'Contracts describe obligations and known coverage; retrieval does not certify runtime behavior.',
      ...(!config
        ? [
            'No project recipe is bound. Resolve the project decisions before implementing a repeated pattern.',
          ]
        : []),
    ],
  };
}
