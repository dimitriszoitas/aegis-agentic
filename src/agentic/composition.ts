import { registry, type Registry, type Issue, type Validation } from './registry';

export type CompositionSpec = {
  schemaVersion: 1;
  id: string;
  pattern: 'dataset-filtering';
  profileId: string;
  profileRevision: number;
  profileHash?: string;
  registryRevision: number;
  mode: 'light' | 'dark';
  presentation: 'fundamental' | 'fundamental-floating';
  density: 'compact' | 'comfortable';
  filters: {
    application: 'immediate' | 'explicit';
    showApplyButton: boolean;
    controls: {
      id: string;
      kind: 'text' | 'select';
      label: string;
      options?: { value: string; label: string }[];
    }[];
  };
  content: { title: string; emptyMessage: string };
};
export const defaultCompositionSpec: CompositionSpec = {
  schemaVersion: 1,
  id: 'customer-directory',
  pattern: 'dataset-filtering',
  profileId: 'aegis-default',
  profileRevision: 1,
  registryRevision: registry.revision,
  mode: 'light',
  presentation: 'fundamental',
  density: 'comfortable',
  filters: {
    application: 'immediate',
    showApplyButton: false,
    controls: [
      { id: 'query', kind: 'text', label: 'Search customers' },
      {
        id: 'status',
        kind: 'select',
        label: 'Customer status',
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'Active', label: 'Active' },
          { value: 'Trial', label: 'Trial' },
          { value: 'Paused', label: 'Paused' },
        ],
      },
    ],
  },
  content: { title: 'Customer directory', emptyMessage: 'No customers match your filters.' },
};
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function validateCompositionSpec(input: unknown, source: Registry = registry): Validation {
  const issues: Issue[] = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  const keys = (value: Record<string, unknown>, allowed: string[], path: string) => {
    for (const key of Object.keys(value))
      if (!allowed.includes(key))
        add(
          `${path}.${key}`,
          'unknown-property',
          `Unknown property ${key}; styling and behavior must be declared by the contract.`,
        );
  };
  if (!object(input))
    return {
      valid: false,
      issues: [{ path: '$', code: 'type', message: 'Composition must be an object.' }],
    };
  keys(
    input,
    [
      'schemaVersion',
      'id',
      'pattern',
      'profileId',
      'profileRevision',
      'profileHash',
      'registryRevision',
      'mode',
      'presentation',
      'density',
      'filters',
      'content',
    ],
    '$',
  );
  if (input.schemaVersion !== 1)
    add('schemaVersion', 'version', 'Only schema version 1 is supported.');
  for (const key of ['id', 'profileId'])
    if (!nonempty(input[key]) || !/^[a-z][a-z0-9-]*$/.test(String(input[key])))
      add(key, 'identifier', 'Use a lowercase hyphenated identifier.');
  if (!Number.isSafeInteger(input.profileRevision) || Number(input.profileRevision) < 1)
    add('profileRevision', 'revision', 'Profile revision must be a positive integer.');
  if (
    input.profileHash !== undefined &&
    (!nonempty(input.profileHash) || !/^[a-z0-9-]{8,80}$/.test(input.profileHash))
  )
    add('profileHash', 'fingerprint', 'Profile hash must be a valid compiler content fingerprint.');
  if (input.registryRevision !== source.revision)
    add(
      'registryRevision',
      'stale-revision',
      `Expected registry revision ${source.revision}; refresh the spec before resolving.`,
    );
  if (
    input.pattern !== 'dataset-filtering' ||
    !source.entries.some((entry) => entry.id === input.pattern && entry.kind === 'pattern')
  )
    add(
      'pattern',
      'unknown-pattern',
      'Only the registered dataset-filtering pattern is supported.',
    );
  if (!['light', 'dark'].includes(String(input.mode)))
    add('mode', 'enum', 'Mode must be light or dark.');
  if (!['fundamental', 'fundamental-floating'].includes(String(input.presentation)))
    add('presentation', 'enum', 'Presentation must be fundamental or fundamental-floating.');
  if (!['compact', 'comfortable'].includes(String(input.density)))
    add('density', 'enum', 'Density is compact or comfortable, independent of mode.');
  if (!object(input.filters)) add('filters', 'required', 'Filters are required.');
  else {
    keys(input.filters, ['application', 'showApplyButton', 'controls'], 'filters');
    const filters = input.filters;
    if (!['immediate', 'explicit'].includes(String(filters.application)))
      add('filters.application', 'enum', 'Application is immediate or explicit.');
    if (typeof filters.showApplyButton !== 'boolean')
      add('filters.showApplyButton', 'type', 'showApplyButton must be a boolean.');
    else if ((filters.application === 'explicit') !== filters.showApplyButton)
      add(
        'filters.showApplyButton',
        'incompatible-combination',
        'Explicit filtering requires Apply; immediate filtering must not include Apply.',
      );
    if (!Array.isArray(filters.controls) || !filters.controls.length || filters.controls.length > 2)
      add(
        'filters.controls',
        'cardinality',
        'This pattern supports one or two controls: customer query and status.',
      );
    else {
      const ids = new Set<string>();
      filters.controls.forEach((control: unknown, index: number) => {
        const path = `filters.controls.${index}`;
        if (!object(control)) {
          add(path, 'type', 'Each control must be an object.');
          return;
        }
        keys(control, ['id', 'kind', 'label', 'options'], path);
        if (!nonempty(control.id) || !/^[a-z][a-z0-9-]*$/.test(String(control.id)))
          add(`${path}.id`, 'identifier', 'Control ID is required.');
        else {
          if (ids.has(control.id))
            add(`${path}.id`, 'duplicate-id', 'Filter control IDs must be unique.');
          ids.add(control.id);
        }
        if (!nonempty(control.label))
          add(`${path}.label`, 'accessible-name', 'A visible, nonempty label is required.');
        if (!['query', 'status'].includes(String(control.id)))
          add(
            `${path}.id`,
            'unsupported-control',
            'This pattern implements query and status controls only.',
          );
        if (
          (control.id === 'query' && control.kind !== 'text') ||
          (control.id === 'status' && control.kind !== 'select')
        )
          add(`${path}.kind`, 'control-kind', 'Query uses text; status uses select.');
        if (!['text', 'select'].includes(String(control.kind)))
          add(`${path}.kind`, 'enum', 'Only text and select controls are supported.');
        if (control.kind === 'text' && control.options !== undefined)
          add(
            `${path}.options`,
            'incompatible-combination',
            'Text controls cannot declare select options.',
          );
        if (control.kind === 'select') {
          if (!Array.isArray(control.options) || !control.options.length)
            add(`${path}.options`, 'required', 'Select requires nonempty options.');
          else {
            const values = new Set<string>();
            control.options.forEach((option: unknown, optionIndex: number) => {
              const optionPath = `${path}.options.${optionIndex}`;
              if (!object(option)) {
                add(optionPath, 'type', 'Each option must be an object.');
                return;
              }
              keys(option, ['value', 'label'], optionPath);
              if (!nonempty(option.value) || !nonempty(option.label))
                add(optionPath, 'required', 'Option value and label are required.');
              else {
                if (values.has(option.value))
                  add(`${optionPath}.value`, 'duplicate-value', 'Option values must be unique.');
                values.add(option.value);
                if (!['all', 'Active', 'Trial', 'Paused'].includes(option.value))
                  add(
                    `${optionPath}.value`,
                    'unsupported-option',
                    'Supported statuses are all, Active, Trial and Paused.',
                  );
              }
            });
          }
        }
      });
    }
  }
  if (!object(input.content)) add('content', 'required', 'Content is required.');
  else {
    keys(input.content, ['title', 'emptyMessage'], 'content');
    for (const key of ['title', 'emptyMessage'])
      if (!nonempty(input.content[key]))
        add(`content.${key}`, 'required', 'Readable content is required.');
  }
  return { valid: !issues.length, issues };
}

/** Stable sorted JSON; arrays retain their semantic order. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (object(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
/** Portable FNV-1a fingerprint for comparison, not a cryptographic integrity signature. */
export function stableFingerprint(value: unknown): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(canonicalJson(value)))
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  return `fnv1a32-${hash.toString(16).padStart(8, '0')}`;
}
export type ResolvedComposition = {
  spec: CompositionSpec;
  stableHash: string;
  recipe: { slot: string; componentId: string; props: Record<string, unknown> }[];
  assumptions: string[];
};
export function resolveComposition(
  input: unknown,
  source: Registry = registry,
  profile?: { id: string; revision: number; fingerprint?: string },
): ResolvedComposition {
  const validation = validateCompositionSpec(input, source);
  if (!validation.valid)
    throw new Error(validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
  const spec = JSON.parse(canonicalJson(input)) as CompositionSpec;
  if (profile && (profile.id !== spec.profileId || profile.revision !== spec.profileRevision))
    throw new Error(
      'Profile identity or revision differs from the composition. Re-resolve with the active profile.',
    );
  if (profile?.fingerprint && spec.profileHash !== profile.fingerprint)
    throw new Error(
      'Profile fingerprint differs or is unpinned. Stamp the active compiled hash before resolving.',
    );
  const required = [
    'field',
    'dataset-filtering',
    ...(spec.filters.showApplyButton ? ['button'] : []),
  ];
  for (const id of required)
    if (!source.entries.some((entry) => entry.id === id))
      throw new Error(`Missing canonical dependency ${id}.`);
  const recipe = [
    {
      slot: 'root',
      componentId: 'dataset-filtering',
      props: { application: spec.filters.application, density: spec.density },
    },
    ...spec.filters.controls.map((control) => ({
      slot: `filter:${control.id}`,
      componentId: 'field',
      props: { ...control },
    })),
    ...(spec.filters.showApplyButton
      ? [
          {
            slot: 'apply',
            componentId: 'button',
            props: { label: 'Apply filters', type: 'button', intent: 'function' },
          },
        ]
      : []),
  ];
  const identity = {
    spec,
    dependencies: required.map((id) => ({
      id,
      version: source.entries.find((entry) => entry.id === id)!.version,
    })),
    ...(profile?.fingerprint ? { profileFingerprint: profile.fingerprint } : {}),
  };
  return {
    spec,
    stableHash: stableFingerprint(identity),
    recipe,
    assumptions: [
      'The host owns records, draft filters and applied filters.',
      'This resolver guarantees a deterministic recipe for a valid spec; it does not certify a rendered UI.',
      ...(profile
        ? []
        : ['Profile identity is declared but not checked against a supplied profile.']),
      ...(spec.profileHash
        ? []
        : [
            'Profile content is unpinned. Bind a compiled profile hash before sharing or applying this recipe.',
          ]),
    ],
  };
}
