import recipeContract from '../../contracts/composition/project-recipes.json';
import {
  pageLayoutRecipes,
  validatePageLayoutRecipe,
  type PageArchetype,
  type PageLayoutRecipeSelection,
  type ReadingMeasure,
  type ContentGridColumns,
  type ContentGridMinimum,
} from '../patterns/page-layout/recipes';
import { canonicalJson, stableFingerprint } from './composition';
import type { Issue, Validation } from './registry';

export type ProjectHeader = 'standard' | 'breadcrumbs';
export type ProjectDensity = 'compact' | 'default' | 'comfortable';
export interface CollectionProjectRecipe {
  header?: ProjectHeader;
  filters?: 'push' | 'inline' | 'none';
  searchMeasure?: 'regular' | 'wide';
  density?: ProjectDensity;
  details?: 'side-sheet' | 'page' | 'none';
  narrow?: 'stack';
}
export interface DetailProjectRecipe {
  header?: ProjectHeader;
  supportingRegion?: 'none' | 'aside';
  measure?: ReadingMeasure;
  narrow?: 'stack';
}
export interface SettingsProjectRecipe {
  header?: ProjectHeader;
  measure?: ReadingMeasure;
  save?: 'explicit' | 'immediate';
  narrow?: 'stack';
}
export interface DashboardProjectRecipe {
  header?: ProjectHeader;
  maxColumns?: ContentGridColumns;
  minItemWidth?: ContentGridMinimum;
  narrow?: 'stack';
}
/** Store once per product. Missing variants resolve to the published defaults, not agent choice. */
export interface ProjectRecipes {
  schemaVersion: 1;
  project: string;
  revision: number;
  recipes: {
    collection?: CollectionProjectRecipe;
    detail?: DetailProjectRecipe;
    settings?: SettingsProjectRecipe;
    dashboard?: DashboardProjectRecipe;
  };
}
export type ResolvedProjectVariants = {
  collection: Required<CollectionProjectRecipe>;
  detail: Required<DetailProjectRecipe>;
  settings: Required<SettingsProjectRecipe>;
  dashboard: Required<DashboardProjectRecipe>;
};
export const projectRecipeDefaults = {
  collection: {
    header: 'standard',
    filters: 'push',
    searchMeasure: 'regular',
    density: 'default',
    details: 'side-sheet',
    narrow: 'stack',
  },
  detail: { header: 'standard', supportingRegion: 'none', measure: 'comfortable', narrow: 'stack' },
  settings: { header: 'standard', measure: 'comfortable', save: 'explicit', narrow: 'stack' },
  dashboard: {
    header: 'standard',
    maxColumns: pageLayoutRecipes.recipes.dashboard.defaultMaxColumns,
    minItemWidth: pageLayoutRecipes.recipes.dashboard.defaultMinItemWidth,
    narrow: 'stack',
  },
} as const satisfies ResolvedProjectVariants;
const options = {
  collection: {
    header: ['standard', 'breadcrumbs'],
    filters: ['push', 'inline', 'none'],
    searchMeasure: ['regular', 'wide'],
    density: ['compact', 'default', 'comfortable'],
    details: ['side-sheet', 'page', 'none'],
    narrow: ['stack'],
  },
  detail: {
    header: ['standard', 'breadcrumbs'],
    supportingRegion: ['none', 'aside'],
    measure: ['compact', 'comfortable', 'wide'],
    narrow: ['stack'],
  },
  settings: {
    header: ['standard', 'breadcrumbs'],
    measure: ['compact', 'comfortable', 'wide'],
    save: ['explicit', 'immediate'],
    narrow: ['stack'],
  },
  dashboard: {
    header: ['standard', 'breadcrumbs'],
    maxColumns: pageLayoutRecipes.maxColumns,
    minItemWidth: Object.keys(pageLayoutRecipes.gridMinimums),
    narrow: ['stack'],
  },
} as const;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
export function validateProjectRecipes(input: unknown): Validation {
  const issues: Issue[] = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (!object(input))
    return {
      valid: false,
      issues: [{ path: '$', code: 'type', message: 'Project recipes must be an object.' }],
    };
  for (const key of Object.keys(input))
    if (!['schemaVersion', 'project', 'revision', 'recipes'].includes(key))
      add(key, 'unknown-property', 'Unsupported project recipe property.');
  if (input.schemaVersion !== 1)
    add('schemaVersion', 'version', 'Only project recipe schema 1 is supported.');
  if (typeof input.project !== 'string' || !/^[a-z][a-z0-9-]{0,79}$/.test(input.project))
    add('project', 'identifier', 'Use a lowercase project identifier of at most 80 characters.');
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 1)
    add('revision', 'revision', 'Use a positive integer revision.');
  if (!object(input.recipes))
    add('recipes', 'type', 'Recipes must be an object containing supported archetypes.');
  else
    for (const [archetype, recipe] of Object.entries(input.recipes)) {
      if (!Object.hasOwn(options, archetype)) {
        add(
          `recipes.${archetype}`,
          'unknown-archetype',
          'Choose collection, detail, settings or dashboard.',
        );
        continue;
      }
      if (!object(recipe)) {
        add(`recipes.${archetype}`, 'type', 'Recipe variants must be an object.');
        continue;
      }
      const allowed = options[archetype as PageArchetype] as Record<string, readonly unknown[]>;
      for (const [key, value] of Object.entries(recipe)) {
        if (!Object.hasOwn(allowed, key))
          add(
            `recipes.${archetype}.${key}`,
            'unknown-property',
            'Only approved variants are configurable.',
          );
        else if (!allowed[key].includes(value))
          add(
            `recipes.${archetype}.${key}`,
            'unsupported-variant',
            `Use one of: ${allowed[key].join(', ')}.`,
          );
      }
    }
  return { valid: !issues.length, issues };
}
export function normalizeProjectRecipes(
  input: unknown,
): ProjectRecipes & { recipes: ResolvedProjectVariants } {
  const validation = validateProjectRecipes(input);
  if (!validation.valid)
    throw new Error(validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' '));
  const value = input as ProjectRecipes;
  return {
    schemaVersion: 1,
    project: value.project,
    revision: value.revision,
    recipes: {
      collection: { ...projectRecipeDefaults.collection, ...value.recipes.collection },
      detail: { ...projectRecipeDefaults.detail, ...value.recipes.detail },
      settings: { ...projectRecipeDefaults.settings, ...value.recipes.settings },
      dashboard: { ...projectRecipeDefaults.dashboard, ...value.recipes.dashboard },
    },
  };
}
export const serializeProjectRecipes = (input: unknown): string =>
  canonicalJson(normalizeProjectRecipes(input));
export const projectRecipeRequirements = recipeContract.requirements;
export interface RecipeImport {
  role: string;
  module: string;
  exports: string[];
  source: 'canonical' | 'project-policy';
}
export interface RecipeBinding {
  role: string;
  component: string | null;
  props: Record<string, string | number | boolean>;
  hostBindings: Record<string, string>;
}
export interface RecipeRequirementRef {
  contractId: string;
  requirementId: string;
}
export interface ResolvedProjectRecipe {
  schemaVersion: 1;
  project: string;
  revision: number;
  archetype: PageArchetype;
  variants: ResolvedProjectVariants[PageArchetype];
  layout: PageLayoutRecipeSelection;
  imports: RecipeImport[];
  bindings: RecipeBinding[];
  hostState: { id: string; initial: unknown; responsibility: string }[];
  requirements: RecipeRequirementRef[];
  projectRequirements: string[];
  prohibited: string[];
  patternPolicy: { product: string; revision: number; fingerprint: string } | null;
  stableHash: string;
  limitations: string[];
}
const pkg = '@dimitriszoitas/aegis-agentic';
/** Optional policy selects existing product wrappers; it never converts prose into behavioural guarantees. */
export function resolveProjectRecipe(
  input: unknown,
  archetype: PageArchetype,
  context: { patternPolicy?: unknown } = {},
): ResolvedProjectRecipe {
  const config = normalizeProjectRecipes(input);
  if (!Object.hasOwn(pageLayoutRecipes.recipes, archetype))
    throw new Error('Unsupported page archetype.');
  const variants = config.recipes[archetype];
  const imports: RecipeImport[] = [
    {
      role: 'layout',
      module: `${pkg}/patterns/page-layout`,
      exports: ['PageLayout'],
      source: 'canonical',
    },
    {
      role: 'header',
      module: `${pkg}/patterns/page-header`,
      exports: ['PageHeader'],
      source: 'canonical',
    },
  ];
  const bindings: RecipeBinding[] = [
    {
      role: 'header',
      component: 'PageHeader',
      props: { headingLevel: 1 },
      hostBindings: {
        title: 'page.title',
        description: 'page.description',
        actions: 'page.actions',
        ...(variants.header === 'breadcrumbs' ? { breadcrumbs: 'page.breadcrumbs' } : {}),
      },
    },
  ];
  const hostState: ResolvedProjectRecipe['hostState'] = [];
  const requirements: RecipeRequirementRef[] = [
    { contractId: 'page-layout', requirementId: `${archetype}-recipe` },
    { contractId: 'page-layout', requirementId: 'host-shell' },
    { contractId: 'page-header', requirementId: 'heading-hierarchy' },
  ];
  const projectRequirements = ['header-consistency', 'host-state-preservation'];
  const prohibited = ['Undocumented local header or unsupported variant overrides.'];
  const layout: PageLayoutRecipeSelection = { archetype, slots: ['header', 'main'] };
  const addImport = (role: string, path: string, exports: string[]) =>
    imports.push({ role, module: `${pkg}/${path}`, exports, source: 'canonical' });
  if (archetype === 'collection') {
    const variant = config.recipes.collection;
    layout.slots = ['header', 'filters', 'main'];
    addImport('toolbar', 'patterns/collection-toolbar', ['CollectionToolbar']);
    addImport('results', 'data-grid', ['DataGrid']);
    bindings.push(
      {
        role: 'toolbar',
        component: 'CollectionToolbar',
        props: {},
        hostBindings: {
          query: 'query',
          onQueryChange: 'setQuery',
          resultCount: 'filteredRecords.length',
          resultsId: 'resultsId',
          label: 'page.filtersLabel',
          searchLabel: 'page.searchLabel',
        },
      },
      {
        role: 'results',
        component: 'DataGrid',
        props: { pagination: true },
        hostBindings: {
          data: 'filteredRecords',
          columns: 'columns',
          density: 'density',
          onDensityChange: 'setDensity',
          getRowId: 'getRowId',
        },
      },
      {
        role: 'search-layout',
        component: null,
        props: { measure: variant.searchMeasure, narrow: 'available-content-width' },
        hostBindings: {
          css: 'Shared product wrapper owns its category group token binding for the selected search measure.',
        },
      },
    );
    hostState.push(
      {
        id: 'query',
        initial: '',
        responsibility: 'Filter records before passing them to the results component.',
      },
      {
        id: 'density',
        initial: variant.density,
        responsibility: 'Bind density and onDensityChange to the same source of truth.',
      },
    );
    requirements.push(
      { contractId: 'collection-toolbar', requirementId: 'host-results' },
      { contractId: 'data-grid', requirementId: 'stable-row-identity' },
      { contractId: 'data-grid', requirementId: 'source-state-ownership' },
    );
    projectRequirements.push('density-updates-controlled-state', 'shared-search-measure');
    if (variant.filters !== 'none') {
      addImport('facets', 'patterns/filter-panel', ['FilterOptions']);
      addImport('filter-summary', 'patterns/filter-bar', ['AppliedFilterGroups']);
      addImport('facet-input', 'checkbox', ['Checkbox']);
      hostState.push({
        id: 'facets',
        initial: {},
        responsibility:
          'Apply OR within a facet, AND across facets and query, and derive count/summaries from the same criteria.',
      });
      bindings.push({
        role: 'facets',
        component: 'FilterOptions',
        props: {},
        hostBindings: {
          groupLabel: 'facet.label',
          children: 'Checkbox controls bound to facet values and setters',
        },
      });
      if (variant.filters === 'push') {
        hostState.push({
          id: 'filterPanelOpen',
          initial: false,
          responsibility:
            'Own expanded state, in-flow shell, close/Escape and trigger focus return.',
        });
        bindings.push({
          role: 'filter-shell',
          component: null,
          props: { inFlow: true, backdrop: false, narrow: 'stack-before-results' },
          hostBindings: {
            open: 'filterPanelOpen',
            onOpenChange: 'setFilterPanelOpen',
            trigger: 'named button with aria-expanded and aria-controls',
            panel: 'labelled aside sharing a grid/flex parent with results',
          },
        });
        projectRequirements.push(
          'push-resizes-results',
          'push-keeps-results-interactive',
          'narrow-panel-order',
        );
        prohibited.push(
          'SideSheet, Sheet or Modal as the filtering shell, including visually similar modal overlays.',
        );
        requirements.push({ contractId: 'filter-panel', requirementId: 'panel-lifecycle' });
      }
    }
    if (variant.details === 'side-sheet') {
      addImport('record-details', 'side-sheet', ['SideSheet']);
      bindings.push({
        role: 'record-details',
        component: 'SideSheet',
        props: { docked: false },
        hostBindings: {
          open: 'selectedRecordId !== null',
          onOpenChange: 'clear selectedRecordId when closed',
          title: 'selectedRecord.title',
          children: 'record details content',
          trigger: 'originating record action',
        },
      });
      hostState.push({
        id: 'selectedRecordId',
        initial: null,
        responsibility:
          'Resolve selected record, reconcile removal, restore focus, and preserve any drafts explicitly.',
      });
      requirements.push(
        { contractId: 'side-sheet', requirementId: 'data-and-lifecycle-host' },
        { contractId: 'side-sheet', requirementId: 'overlay-focus-lifecycle' },
      );
    } else if (variant.details === 'page')
      bindings.push({
        role: 'record-details',
        component: null,
        props: {},
        hostBindings: { onRowClick: 'navigate to the record detail route' },
      });
  } else if (archetype === 'detail') {
    const variant = config.recipes.detail;
    addImport('reading-content', 'patterns/page-layout', ['ReadingColumn']);
    bindings.push({
      role: 'reading-content',
      component: 'ReadingColumn',
      props: { measure: variant.measure },
      hostBindings: { children: 'record prose only; tables/editors retain their own overflow' },
    });
    if (variant.supportingRegion === 'aside') {
      layout.slots = ['header', 'main', 'aside'];
      layout.asideLabel = 'Supporting information';
      bindings.push({
        role: 'aside',
        component: null,
        props: {},
        hostBindings: { aside: 'supporting content', asideLabel: 'page.asideLabel' },
      });
    }
    hostState.push({
      id: 'record',
      initial: null,
      responsibility:
        'Load one identified record and supply loading, unavailable and recovery content.',
    });
  } else if (archetype === 'settings') {
    const variant = config.recipes.settings;
    layout.measure = variant.measure;
    addImport('form-section', 'patterns/form-section', ['FormSection']);
    addImport('field', 'field', ['Field']);
    hostState.push({
      id: 'draft',
      initial: {},
      responsibility:
        variant.save === 'explicit'
          ? 'Own draft, validation, dirty state, Save/Cancel and unsaved navigation.'
          : 'Own validation, pending saves, failures/retry and per-field confirmation.',
    });
    bindings.push({
      role: 'form',
      component: null,
      props: { save: variant.save },
      hostBindings: {
        onSubmit:
          variant.save === 'explicit'
            ? 'validate then persist draft'
            : 'prevent accidental native submit; persist valid field changes',
        errors: 'host validation errors',
      },
    });
    requirements.push(
      { contractId: 'form-section', requirementId: 'draft-and-form-ownership' },
      { contractId: 'field', requirementId: 'host-validation' },
    );
  } else {
    layout.maxColumns = config.recipes.dashboard.maxColumns;
    layout.minItemWidth = config.recipes.dashboard.minItemWidth;
  }
  const issues = validatePageLayoutRecipe(layout);
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(' '));
  let patternPolicy: ResolvedProjectRecipe['patternPolicy'] = null;
  if (context.patternPolicy !== undefined) {
    const policy = context.patternPolicy;
    if (
      !object(policy) ||
      policy.schemaVersion !== 2 ||
      policy.product !== config.project ||
      !Number.isSafeInteger(policy.revision) ||
      Number(policy.revision) < 1 ||
      !object(policy.patterns)
    )
      throw new Error(
        'Pattern policy must be schema 2 for the same project with a valid revision and patterns.',
      );
    const roles: Record<string, string> = {
      pageHeader: 'header',
      collectionFilters: 'toolbar',
      dataGrid: 'results',
    };
    for (const [key, role] of Object.entries(roles)) {
      const index = imports.findIndex((item) => item.role === role);
      if (index < 0 || !Object.hasOwn(policy.patterns, key)) continue;
      const pattern = policy.patterns[key];
      if (
        !object(pattern) ||
        typeof pattern.module !== 'string' ||
        !pattern.module.trim() ||
        typeof pattern.export !== 'string' ||
        !/^[A-Za-z_$][\w$]*$/.test(pattern.export)
      )
        throw new Error(`Invalid project pattern binding: ${key}.`);
      imports[index] = {
        role,
        module: pattern.module,
        exports: [pattern.export],
        source: 'project-policy',
      };
      const binding = bindings.find((item) => item.role === role);
      if (binding) {
        binding.component = pattern.export;
        const canonicalBindings = binding.hostBindings;
        const productBindings: Record<string, string> = {
          query: 'query',
          onClearQuery: 'clearQuery',
          facets: 'domainFacets',
          resultCount: 'filteredRecords.length',
          noun: 'page.recordNoun',
          onClearAll: 'clearQueryAndFacets',
        };
        if (key === 'collectionFilters') {
          binding.props = {};
          binding.hostBindings = Object.fromEntries(
            (Array.isArray(pattern.requiredProps) ? pattern.requiredProps : []).map((prop) => {
              if (typeof prop !== 'string')
                throw new Error('Project requiredProps must contain strings.');
              return [prop, productBindings[prop] ?? canonicalBindings[prop] ?? `host.${prop}`];
            }),
          );
        }
        binding.hostBindings = {
          ...binding.hostBindings,
          policyContract: `Read ${key}.requiredProps and its implementation; project wrapper props must be bound explicitly.`,
        };
      }
    }
    patternPolicy = {
      product: policy.product,
      revision: Number(policy.revision),
      fingerprint: stableFingerprint(policy),
    };
  }
  const result = {
    schemaVersion: 1 as const,
    project: config.project,
    revision: config.revision,
    archetype,
    variants,
    layout,
    imports,
    bindings,
    hostState,
    requirements,
    projectRequirements,
    prohibited,
    patternPolicy,
    limitations: [
      'A resolved recipe is a deterministic implementation plan, not a rendered or accessibility certification.',
      'Host bindings are explicit obligations, not automatically generated business logic.',
      'PageLayout renders PageHeader internally. Pass header bindings to PageLayout, or use the product-owned shell and shared header; never render two page titles.',
      'FilterOptions supports domain-specific facets; the full FilterPanel is WorkRecord-specific and is not substituted for arbitrary records.',
      'Search measure is a product wrapper decision; consume its owning category group tokens instead of arbitrary widths.',
    ],
  };
  return { ...result, stableHash: stableFingerprint(result) };
}
