/** Source-derived API facts describe possibilities, not executed coverage. No catalogue imports. */
export type InfrastructurePin = {
  projectId: string;
  releaseId: string;
  kitVersion: string;
  registryRevision: number;
};
export type InfrastructureIssue = { path: string; code: string; message: string };
export type ConfigurationValue = string | number | boolean | null;
export type ConfigurationAxis = 'theme' | 'presentation' | 'behavior' | 'unknown';
export type PublicComponentFacts = {
  schemaVersion: number;
  id: string;
  name: string;
  importPaths: string[];
  package?: { name: string; version: string };
  props: {
    component?: string;
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    axis?: ConfigurationAxis;
  }[];
  variants?: { name: string; values: string[]; default?: string; axis?: ConfigurationAxis }[];
};
export type ConfigurationRecord = {
  schemaVersion: 1;
  id: string;
  pin: InfrastructurePin;
  componentId: string;
  status: 'planned' | 'passed' | 'failed';
  configuration: { props: Record<string, ConfigurationValue>; theme: Record<string, string> };
  evidencePath?: string;
  verifiedAt?: string;
  checks?: string[];
};
export type ConfigurabilityInput = {
  schemaVersion: 1;
  pin: InfrastructurePin;
  components: PublicComponentFacts[];
  themeAxes?: Record<string, string[]>;
  verification?: ConfigurationRecord[];
};
export type ConfigurabilityDimension = {
  /** Qualified to distinguish similarly named props on compound component parts. */
  id: string;
  owner: string;
  name: string;
  kind: 'variant' | 'boolean' | 'literal-union' | 'unconstrained';
  axis: ConfigurationAxis;
  axisBasis: 'declared' | 'name-heuristic' | 'unknown';
  /** Source labels, not a complete TypeScript/runtime value validator. */
  allowedValues: string[] | null;
  defaultValue: string | null;
  defaultSource: string | null;
  defaultKnown: boolean;
  required: boolean;
  sourceType: string | null;
};
export type InventoryComponent = {
  componentId: string;
  name: string;
  importPath: string;
  importPaths: string[];
  dimensions: ConfigurabilityDimension[];
  booleanControls: string[];
  unconstrainedProps: string[];
  estimate: {
    combinations: number;
    cap: number;
    capped: boolean;
    kind: 'finite-cartesian-estimate-not-coverage';
    excludesUnconstrainedProps: boolean;
    conditionalCombinationsVerified: false;
  };
  coverage: {
    verifiedConfigurations: number;
    verifiedRecordIds: string[];
    plannedRecordIds: string[];
    failedRecordIds: string[];
    status: 'unverified' | 'explicit-records-only';
  };
};
export type ConfigurabilityInventory = {
  schemaVersion: 1;
  status: 'ready' | 'blocked';
  pin: InfrastructurePin | null;
  themeAxes: Record<string, string[]>;
  components: InventoryComponent[];
  summary: {
    components: number;
    configurableDimensions: number;
    constrainedProps: number;
    unconstrainedProps: number;
    verifiedConfigurations: number;
    plannedRecords: number;
  };
  issues: InfrastructureIssue[];
  rejectedVerification: { id: string; reason: string }[];
  limitations: string[];
};
export type InfrastructureSupport = { supportedKitVersions?: readonly string[] };
const supportedDefault = ['0.1.0-experiment.0', '0.2.0-experiment.0', '0.3.0-experiment.0'];
const axes: ConfigurationAxis[] = ['theme', 'presentation', 'behavior', 'unknown'];
export const infrastructureObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const scalar = (value: unknown): value is ConfigurationValue =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));
export function stableInfrastructureJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableInfrastructureJson).join(',')}]`;
  if (infrastructureObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableInfrastructureJson(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function validateInfrastructurePin(
  value: unknown,
  support: InfrastructureSupport = {},
  path = 'pin',
): InfrastructureIssue[] {
  if (!infrastructureObject(value))
    return [{ path, code: 'pin', message: 'A pinned project/release identity is required.' }];
  const issues: InfrastructureIssue[] = [];
  for (const name of ['projectId', 'releaseId', 'kitVersion'])
    if (!text(value[name]))
      issues.push({
        path: `${path}.${name}`,
        code: 'identity',
        message: 'A nonempty pinned identity is required.',
      });
  if (!Number.isSafeInteger(value.registryRevision) || Number(value.registryRevision) < 1)
    issues.push({
      path: `${path}.registryRevision`,
      code: 'revision',
      message: 'Registry revision must be a positive safe integer.',
    });
  // Recognize an explicit version string, then require exact support. No wildcard/semver optimism.
  if (
    typeof value.kitVersion === 'string' &&
    (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.kitVersion) ||
      !(support.supportedKitVersions ?? supportedDefault).includes(value.kitVersion))
  )
    issues.push({
      path: `${path}.kitVersion`,
      code: 'unsupported-kit',
      message: 'This exact kit version is not supported; review compatibility before planning.',
    });
  for (const key of Object.keys(value))
    if (!['projectId', 'releaseId', 'kitVersion', 'registryRevision'].includes(key))
      issues.push({
        path: `${path}.${key}`,
        code: 'unknown-pin-field',
        message: 'Unknown pin field; no identity data is ignored.',
      });
  return issues;
}
function axisFor(
  name: string,
  declared?: ConfigurationAxis,
): Pick<ConfigurabilityDimension, 'axis' | 'axisBasis'> {
  if (declared) return { axis: declared, axisBasis: 'declared' };
  if (['theme', 'colorMode', 'mode', 'presentation', 'profile'].includes(name))
    return { axis: 'theme', axisBasis: 'name-heuristic' };
  if (
    [
      'size',
      'density',
      'intent',
      'emphasis',
      'variant',
      'orientation',
      'align',
      'fullWidth',
    ].includes(name)
  )
    return { axis: 'presentation', axisBasis: 'name-heuristic' };
  if (
    [
      'disabled',
      'loading',
      'checked',
      'defaultChecked',
      'open',
      'defaultOpen',
      'readOnly',
      'required',
      'invalid',
      'multiple',
      'value',
      'defaultValue',
    ].includes(name) ||
    /^on[A-Z]/.test(name)
  )
    return { axis: 'behavior', axisBasis: 'name-heuristic' };
  return { axis: 'unknown', axisBasis: 'unknown' };
}
function literal(source: string): string | undefined {
  const value = source.trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (/^'[^'\\]*'$/.test(value)) return value.slice(1, -1);
  if (/^(true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?)$/.test(value)) return value;
  return undefined;
}
function finiteType(type: string): { kind: 'boolean' | 'literal-union'; values: string[] } | null {
  const members = type
    .split('|')
    .map((value) => value.trim())
    .filter((value) => value !== 'undefined');
  if (members.length === 1 && members[0] === 'boolean')
    return { kind: 'boolean', values: ['false', 'true'] };
  const values = members.map(literal);
  return members.length && values.every((value) => value !== undefined)
    ? { kind: 'literal-union', values: [...new Set(values as string[])].sort() }
    : null;
}

/** Accepts the actual public/ai component shape; never loads source files or executes type text. */
export function buildConfigurabilityInventory(
  input: unknown,
  options: InfrastructureSupport & { combinationCap?: number } = {},
): ConfigurabilityInventory {
  const issues: InfrastructureIssue[] = [];
  const result: ConfigurabilityInventory = {
    schemaVersion: 1,
    status: 'blocked',
    pin: null,
    themeAxes: {},
    components: [],
    summary: {
      components: 0,
      configurableDimensions: 0,
      constrainedProps: 0,
      unconstrainedProps: 0,
      verifiedConfigurations: 0,
      plannedRecords: 0,
    },
    issues,
    rejectedVerification: [],
    limitations: [
      'Allowed values and defaults are source facts, not behavioral certification.',
      'Combination counts are capped Cartesian estimates; conditional constraints, inherited props and arbitrary data can make combinations invalid or incomplete.',
      'Axis names marked heuristic are classification aids, not proved semantic contracts.',
      'Coverage counts only complete passed configuration records with matching pins and evidence; supplied evidence is not independently executed by this inventory.',
    ],
  };
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (!infrastructureObject(input)) {
    add('$', 'input', 'Inventory input must be an object.');
    return result;
  }
  if (input.schemaVersion !== 1)
    add('schemaVersion', 'unsupported-schema', 'Only inventory input schema 1 is supported.');
  issues.push(...validateInfrastructurePin(input.pin, options));
  const cap = options.combinationCap ?? 1_000_000;
  if (!Number.isSafeInteger(cap) || cap < 1)
    add('combinationCap', 'cap', 'Combination cap must be a positive safe integer.');
  if (!Array.isArray(input.components))
    add('components', 'components', 'Supply component API facts as an array.');
  if (input.themeAxes !== undefined && !infrastructureObject(input.themeAxes))
    add('themeAxes', 'theme-axes', 'Theme axes must map names to nonempty unique values.');
  if (infrastructureObject(input.themeAxes))
    for (const name of Object.keys(input.themeAxes).sort()) {
      const values = input.themeAxes[name];
      if (!text(name) || !strings(values) || !values.length)
        add(`themeAxes.${name}`, 'theme-axes', 'Theme axes need named, nonempty unique values.');
      else
        Object.defineProperty(result.themeAxes, name, {
          value: [...values].sort(),
          enumerable: true,
          writable: true,
          configurable: true,
        });
    }
  if (input.verification !== undefined && !Array.isArray(input.verification))
    add('verification', 'records', 'Verification must be an explicit record array.');
  if (issues.length) return result;
  result.pin = { ...(input.pin as InfrastructurePin) };
  const ids = new Set<string>();
  for (const [index, raw] of (input.components as unknown[]).entries()) {
    const path = `components.${index}`;
    if (!infrastructureObject(raw)) {
      add(path, 'component', 'Each component must be an API facts object.');
      continue;
    }
    if (raw.schemaVersion !== 1)
      add(
        `${path}.schemaVersion`,
        'unsupported-schema',
        'Only public API facts schema 1 is supported.',
      );
    if (!text(raw.id) || ids.has(raw.id))
      add(`${path}.id`, 'identity', 'Component IDs must be nonempty and unique.');
    else ids.add(raw.id);
    if (
      !text(raw.name) ||
      !strings(raw.importPaths) ||
      !raw.importPaths.length ||
      !Array.isArray(raw.props)
    ) {
      add(path, 'component', 'Name, import paths and props are required.');
      continue;
    }
    if (
      raw.package !== undefined &&
      (!infrastructureObject(raw.package) || raw.package.version !== result.pin.kitVersion)
    )
      add(`${path}.package`, 'package-pin', 'API facts package version must match the pinned kit.');
    if (raw.variants !== undefined && !Array.isArray(raw.variants)) {
      add(`${path}.variants`, 'variants', 'Variants must be an array.');
      continue;
    }
    const facts = raw as unknown as PublicComponentFacts;
    const variants = new Map<string, NonNullable<PublicComponentFacts['variants']>[number]>();
    for (const variant of facts.variants ?? []) {
      if (
        !infrastructureObject(variant) ||
        !text(variant.name) ||
        !strings(variant.values) ||
        !variant.values.length ||
        variants.has(variant.name) ||
        (variant.default !== undefined &&
          (!text(variant.default) || !variant.values.includes(variant.default))) ||
        (variant.axis !== undefined && !axes.includes(variant.axis))
      ) {
        add(
          `${path}.variants`,
          'variant',
          'Variant names/values must be unique; defaults must belong to their declared values.',
        );
        continue;
      }
      variants.set(variant.name, variant);
    }
    const dimensions: ConfigurabilityDimension[] = [];
    const propIds = new Set<string>();
    for (const prop of facts.props) {
      if (
        !infrastructureObject(prop) ||
        !text(prop.name) ||
        !text(prop.type) ||
        (prop.component !== undefined && !text(prop.component)) ||
        (prop.defaultValue !== undefined && typeof prop.defaultValue !== 'string') ||
        (prop.required !== undefined && typeof prop.required !== 'boolean') ||
        (prop.axis !== undefined && !axes.includes(prop.axis))
      ) {
        add(`${path}.props`, 'prop', 'Props require names/types and valid source metadata.');
        continue;
      }
      const owner = prop.component ?? facts.name;
      const id = `${owner}.${prop.name}`;
      if (propIds.has(id)) {
        add(`${path}.props`, 'duplicate-prop', 'Qualified prop names must be unique.');
        continue;
      }
      propIds.add(id);
      // Unqualified variant facts are ambiguous if multiple compound parts share this prop.
      const matching = facts.props.filter((other) => other?.name === prop.name).length;
      const variant = matching === 1 ? variants.get(prop.name) : undefined;
      const finite = finiteType(prop.type);
      const values = variant?.values ?? finite?.values ?? null;
      const defaultSource = prop.defaultValue ?? null;
      const defaultValue =
        variant?.default ?? (defaultSource === null ? undefined : literal(defaultSource));
      dimensions.push({
        id,
        owner,
        name: prop.name,
        kind: variant ? 'variant' : (finite?.kind ?? 'unconstrained'),
        ...axisFor(prop.name, prop.axis ?? variant?.axis),
        allowedValues: values ? [...values].sort() : null,
        defaultValue: defaultValue ?? null,
        defaultSource,
        defaultKnown: defaultValue !== undefined,
        required: prop.required ?? false,
        sourceType: prop.type,
      });
    }
    for (const variant of variants.values())
      if (!facts.props.some((prop) => prop.name === variant.name))
        dimensions.push({
          id: `${facts.name}.${variant.name}`,
          owner: facts.name,
          name: variant.name,
          kind: 'variant',
          ...axisFor(variant.name, variant.axis),
          allowedValues: [...variant.values].sort(),
          defaultValue: variant.default ?? null,
          defaultSource: variant.default ?? null,
          defaultKnown: variant.default !== undefined,
          required: false,
          sourceType: null,
        });
    dimensions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    let combinations = 1,
      capped = false;
    for (const length of [
      ...dimensions
        .filter((dimension) => dimension.allowedValues)
        .map((dimension) => dimension.allowedValues!.length),
      ...Object.values(result.themeAxes).map((values) => values.length),
    ]) {
      if (combinations > cap / length) {
        combinations = cap;
        capped = true;
      } else combinations *= length;
    }
    const importPaths = [...facts.importPaths].sort();
    result.components.push({
      componentId: facts.id,
      name: facts.name,
      importPath: importPaths[0],
      importPaths,
      dimensions,
      booleanControls: dimensions
        .filter(
          (dimension) =>
            dimension.kind === 'boolean' ||
            (dimension.allowedValues?.length === 2 &&
              dimension.allowedValues.includes('false') &&
              dimension.allowedValues.includes('true')),
        )
        .map((dimension) => dimension.id),
      unconstrainedProps: dimensions
        .filter((dimension) => !dimension.allowedValues)
        .map((dimension) => dimension.id),
      estimate: {
        combinations,
        cap,
        capped,
        kind: 'finite-cartesian-estimate-not-coverage',
        excludesUnconstrainedProps: dimensions.some((dimension) => !dimension.allowedValues),
        conditionalCombinationsVerified: false,
      },
      coverage: {
        verifiedConfigurations: 0,
        verifiedRecordIds: [],
        plannedRecordIds: [],
        failedRecordIds: [],
        status: 'unverified',
      },
    });
  }
  if (issues.length) {
    result.components = [];
    return result;
  }
  result.components.sort((a, b) =>
    a.componentId < b.componentId ? -1 : a.componentId > b.componentId ? 1 : 0,
  );
  const recordIdCounts = new Map<string, number>();
  for (const raw of (input.verification ?? []) as unknown[])
    if (infrastructureObject(raw) && text(raw.id))
      recordIdCounts.set(raw.id, (recordIdCounts.get(raw.id) ?? 0) + 1);
  const configurationSets = new Map(
    result.components.map((component) => [component.componentId, new Set<string>()]),
  );
  for (const [index, raw] of ((input.verification ?? []) as unknown[]).entries()) {
    const reject = (reason: string) =>
      result.rejectedVerification.push({
        id: infrastructureObject(raw) && text(raw.id) ? raw.id : `record-${index}`,
        reason,
      });
    if (
      !infrastructureObject(raw) ||
      raw.schemaVersion !== 1 ||
      !text(raw.id) ||
      recordIdCounts.get(raw.id) !== 1
    ) {
      reject('Malformed, duplicate, or unsupported verification record.');
      continue;
    }
    if (
      validateInfrastructurePin(raw.pin, options).length ||
      stableInfrastructureJson(raw.pin) !== stableInfrastructureJson(result.pin)
    ) {
      reject('Verification pin does not match this exact project/release.');
      continue;
    }
    const component = result.components.find(
      (candidate) => candidate.componentId === raw.componentId,
    );
    if (
      !component ||
      !['planned', 'passed', 'failed'].includes(String(raw.status)) ||
      !infrastructureObject(raw.configuration) ||
      !infrastructureObject(raw.configuration.props) ||
      !infrastructureObject(raw.configuration.theme)
    ) {
      reject('Unknown component, status or configuration.');
      continue;
    }
    const props = raw.configuration.props,
      theme = raw.configuration.theme;
    let invalid = Object.entries(props).some(
      ([id, value]) =>
        !scalar(value) ||
        !component.dimensions.some(
          (dimension) =>
            dimension.id === id &&
            (!dimension.allowedValues || dimension.allowedValues.includes(String(value))),
        ),
    );
    invalid ||= Object.entries(theme).some(
      ([id, value]) =>
        typeof value !== 'string' ||
        !Object.hasOwn(result.themeAxes, id) ||
        !result.themeAxes[id].includes(value),
    );
    invalid ||= component.dimensions.some(
      (dimension) => dimension.allowedValues && !Object.hasOwn(props, dimension.id),
    );
    invalid ||= Object.keys(result.themeAxes).some((name) => !Object.hasOwn(theme, name));
    if (invalid) {
      reject(
        'Configuration must explicitly specify every finite prop/theme axis using declared values; unknown props are rejected.',
      );
      continue;
    }
    if (raw.status === 'planned') {
      component.coverage.plannedRecordIds.push(raw.id);
      continue;
    }
    if (raw.status === 'failed') {
      component.coverage.failedRecordIds.push(raw.id);
      continue;
    }
    if (
      !text(raw.evidencePath) ||
      !text(raw.verifiedAt) ||
      !Number.isFinite(Date.parse(raw.verifiedAt)) ||
      !strings(raw.checks) ||
      !raw.checks.length
    ) {
      reject('Passed records need an evidence path, timestamp and nonempty explicit checks.');
      continue;
    }
    component.coverage.verifiedRecordIds.push(raw.id);
    configurationSets.get(component.componentId)!.add(stableInfrastructureJson(raw.configuration));
  }
  for (const component of result.components) {
    component.coverage.verifiedRecordIds.sort();
    component.coverage.plannedRecordIds.sort();
    component.coverage.failedRecordIds.sort();
    component.coverage.verifiedConfigurations = configurationSets.get(component.componentId)!.size;
    component.coverage.status = component.coverage.verifiedConfigurations
      ? 'explicit-records-only'
      : 'unverified';
  }
  result.summary = {
    components: result.components.length,
    configurableDimensions: result.components.reduce(
      (sum, component) => sum + component.dimensions.length,
      0,
    ),
    constrainedProps: result.components.reduce(
      (sum, component) =>
        sum + component.dimensions.filter((dimension) => dimension.allowedValues).length,
      0,
    ),
    unconstrainedProps: result.components.reduce(
      (sum, component) => sum + component.unconstrainedProps.length,
      0,
    ),
    verifiedConfigurations: result.components.reduce(
      (sum, component) => sum + component.coverage.verifiedConfigurations,
      0,
    ),
    plannedRecords: result.components.reduce(
      (sum, component) => sum + component.coverage.plannedRecordIds.length,
      0,
    ),
  };
  result.status = 'ready';
  result.rejectedVerification.sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : a.reason < b.reason ? -1 : 1,
  );
  return result;
}
