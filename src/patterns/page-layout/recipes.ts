/** Pure recipe facts: safe to consume from a dependency-free kit or project validator. */
export type PageArchetype = 'collection' | 'detail' | 'settings' | 'dashboard';
export type ReadingMeasure = 'compact' | 'comfortable' | 'wide';
export type ContentGridColumns = 1 | 2 | 3 | 4;
export type ContentGridMinimum = 'small' | 'regular' | 'large';
export type PageLayoutSlot = 'header' | 'filters' | 'main' | 'aside' | 'footer';

export const readingColumnMeasures = {
  compact: '--group-page-structure-reading-width-compact',
  comfortable: '--group-page-structure-reading-width-comfortable',
  wide: '--group-page-structure-reading-width-large',
} as const satisfies Record<ReadingMeasure, string>;

export const contentGridMinimums = {
  small: '--group-page-structure-content-grid-item-width-small',
  regular: '--group-page-structure-content-grid-item-width-regular',
  large: '--group-page-structure-content-grid-item-width-large',
} as const satisfies Record<ContentGridMinimum, string>;

export const contentGridColumnOptions = [1, 2, 3, 4] as const;

export const pageLayoutRecipes = {
  version: 1,
  ownership: 'page-structure',
  implementation: 'PageLayout',
  headerImplementation: 'PageHeader',
  responsibility:
    'Arrange named page regions, reading measures, and responsive grids without styling nested content or owning application state.',
  status:
    'Initial library choices. A product may propose another recipe through review; these four do not classify every possible page.',
  order: ['header', 'filters', 'main', 'aside', 'footer'],
  readingMeasures: readingColumnMeasures,
  gridMinimums: contentGridMinimums,
  maxColumns: contentGridColumnOptions,
  recipes: {
    collection: {
      requiredSlots: ['header', 'main'],
      optionalSlots: ['filters', 'footer'],
      forbiddenSlots: ['aside'],
      contentWidth: 'available',
      maxRegions: 1,
      responsibility:
        'Browse or act on a dataset; its grid or list owns data overflow and toolbar behavior.',
      constraints: [
        'Never apply a reading measure to the collection.',
        'Filters precede the collection.',
        'Keep the data component toolbar intact.',
      ],
    },
    detail: {
      requiredSlots: ['header', 'main'],
      optionalSlots: ['aside', 'footer'],
      forbiddenSlots: ['filters'],
      contentWidth: 'available',
      maxRegions: 2,
      responsibility:
        'Inspect one record, with an optional secondary region after the main content.',
      constraints: [
        'At most main and aside regions.',
        'Aside has an accessible label.',
        'Narrow containers stack main before aside.',
        'Use ReadingColumn explicitly for prose within the main region.',
      ],
    },
    settings: {
      requiredSlots: ['header', 'main'],
      optionalSlots: ['footer'],
      forbiddenSlots: ['filters', 'aside'],
      contentWidth: 'reading',
      defaultMeasure: 'comfortable',
      maxRegions: 1,
      responsibility: 'Read or edit preferences in one main column.',
      constraints: [
        'One main reading column.',
        'Field and form components own labels, errors, validation, and submission.',
      ],
    },
    dashboard: {
      requiredSlots: ['header', 'main'],
      optionalSlots: ['footer'],
      forbiddenSlots: ['filters', 'aside'],
      contentWidth: 'grid',
      defaultMaxColumns: 4,
      defaultMinItemWidth: 'regular',
      maxRegions: 1,
      responsibility: 'Scan independent summaries or cards in an adaptive grid.',
      constraints: [
        'Direct children are separate grid items.',
        'Maximum columns is a cap, not a fixed count.',
        'Item minimums shrink only when one item cannot fit the container.',
      ],
    },
  },
  limits: [
    'No routing, persistence, fetching, selection, form state, or automatic data classification.',
    'No automatic child styling, surface, page padding, typography changes, sticky regions, or document main landmark.',
    'Reading measures are documented starting points, not universal readability guarantees.',
    'Configuration validation does not verify actual content semantics, keyboard behavior, or visual quality.',
  ],
} as const;

export interface PageLayoutRecipeSelection {
  archetype: PageArchetype;
  slots?: readonly PageLayoutSlot[];
  measure?: ReadingMeasure;
  maxColumns?: ContentGridColumns;
  minItemWidth?: ContentGridMinimum;
  asideLabel?: string;
}

export interface PageLayoutRecipeIssue {
  code:
    | 'invalid-configuration'
    | 'unknown-property'
    | 'invalid-value'
    | 'forbidden-option'
    | 'forbidden-slot'
    | 'missing-slot'
    | 'duplicate-slot';
  path: string;
  message: string;
}

/** Validate only recipe selection, not DOM props or content. Unknown selection keys are errors. */
export function validatePageLayoutRecipe(input: unknown): PageLayoutRecipeIssue[] {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return [
      { code: 'invalid-configuration', path: '', message: 'Recipe selection must be an object.' },
    ];
  const value = input as Record<string, unknown>;
  const issues: PageLayoutRecipeIssue[] = [];
  const issue = (code: PageLayoutRecipeIssue['code'], path: string, message: string) =>
    issues.push({ code, path, message });
  const keys = ['archetype', 'slots', 'measure', 'maxColumns', 'minItemWidth', 'asideLabel'];
  for (const key of Object.keys(value))
    if (!keys.includes(key)) issue('unknown-property', key, `Unknown recipe property: ${key}.`);
  if (
    typeof value.archetype !== 'string' ||
    !Object.hasOwn(pageLayoutRecipes.recipes, value.archetype)
  ) {
    issue('invalid-value', 'archetype', 'Choose collection, detail, settings, or dashboard.');
    return issues;
  }
  const archetype = value.archetype as PageArchetype;
  const recipe = pageLayoutRecipes.recipes[archetype];
  for (const [key, options] of Object.entries({
    measure: Object.keys(readingColumnMeasures),
    maxColumns: contentGridColumnOptions,
    minItemWidth: Object.keys(contentGridMinimums),
  })) {
    if (value[key] !== undefined && !(options as readonly unknown[]).includes(value[key]))
      issue('invalid-value', key, `Unsupported ${key}; use a documented recipe option.`);
    if (
      value[key] !== undefined &&
      (key === 'measure' ? archetype !== 'settings' : archetype !== 'dashboard')
    )
      issue('forbidden-option', key, `${key} is not available for ${archetype}.`);
  }
  if (
    value.asideLabel !== undefined &&
    (archetype !== 'detail' || typeof value.asideLabel !== 'string' || !value.asideLabel.trim())
  )
    issue(
      'forbidden-option',
      'asideLabel',
      'A nonempty asideLabel is available only for detail pages.',
    );
  if (value.slots !== undefined) {
    if (!Array.isArray(value.slots))
      issue('invalid-value', 'slots', 'Slots must be an array of known slot names.');
    else {
      const allowed = [...recipe.requiredSlots, ...recipe.optionalSlots] as readonly string[];
      const seen = new Set<unknown>();
      for (const slot of value.slots) {
        if (typeof slot !== 'string' || !allowed.includes(slot))
          issue('forbidden-slot', 'slots', `${String(slot)} is not available for ${archetype}.`);
        if (seen.has(slot))
          issue('duplicate-slot', 'slots', `Slot ${String(slot)} occurs more than once.`);
        seen.add(slot);
      }
      for (const slot of recipe.requiredSlots)
        if (!seen.has(slot)) issue('missing-slot', 'slots', `The ${slot} slot is required.`);
      if (seen.has('aside') && (typeof value.asideLabel !== 'string' || !value.asideLabel.trim()))
        issue(
          'invalid-value',
          'asideLabel',
          'A detail aside requires a nonempty accessible label.',
        );
    }
  }
  return issues;
}
