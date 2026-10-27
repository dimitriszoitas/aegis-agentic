import {
  infrastructureObject as object,
  stableInfrastructureJson as stable,
  validateInfrastructurePin,
  type ConfigurabilityInventory,
  type ConfigurabilityDimension,
  type InfrastructureIssue,
  type InfrastructurePin,
  type InfrastructureSupport,
} from './configurability';

type Json = null | string | number | boolean | Json[] | { [key: string]: Json };
export type InfrastructureRegistrySnapshot = {
  schemaVersion: 1;
  revision: number;
  entries: {
    id: string;
    importPath: string;
    version?: number;
    capabilities?: string[];
    behavior?: Json;
    contract?: string;
  }[];
};
export type InfrastructureTokenManifest = {
  version: 1;
  configurations: string[];
  tokens: Record<string, { tier: string; [key: string]: Json }>;
};
export type InfrastructureUpdateSnapshot = {
  schemaVersion: 1;
  pin: InfrastructurePin;
  registry?: InfrastructureRegistrySnapshot;
  tokenManifest?: InfrastructureTokenManifest;
  inventory?: ConfigurabilityInventory;
};
export type UpdateImpact = {
  id: string;
  severity: 'breaking' | 'additive' | 'review';
  kind: string;
  scope: 'component' | 'prop' | 'token' | 'configuration' | 'release';
  path: string;
  componentId: string | null;
  before: Json;
  after: Json;
  migration: string;
  affectedComponentIds: string[];
  affectedUsageCount: number | null;
  usageBasis: 'supplied-component-count' | 'all-supplied-components-potential' | 'not-provided';
};
export type InfrastructureUpdatePlan = {
  schemaVersion: 1;
  status: 'blocked' | 'no-op' | 'review-required';
  from: InfrastructurePin | null;
  to: InfrastructurePin | null;
  execution: 'plan-only';
  applied: false;
  automaticActions: [];
  requiresOwnerReview: boolean;
  issues: InfrastructureIssue[];
  impacts: UpdateImpact[];
  summary: {
    breaking: number;
    additive: number;
    review: number;
    affectedComponents: number;
    affectedUsageCount: number;
    usageComplete: boolean;
  };
  evidence: {
    compatibility: 'static-input-comparison';
    migration: 'planned-not-executed';
    runtimeVerification: 'not-performed';
    coverageInherited: false;
  };
  limitations: string[];
};
const text = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text) && new Set(value).size === value.length;
const json = (value: unknown, ancestors = new Set<unknown>()): value is Json => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return true;
  if (
    (!Array.isArray(value) &&
      (!object(value) || Object.getPrototypeOf(value) !== Object.prototype)) ||
    ancestors.has(value)
  )
    return false;
  const next = new Set(ancestors).add(value);
  return Object.values(value).every((item) => json(item, next));
};
const asJson = (value: unknown): Json =>
  value === undefined ? null : (JSON.parse(JSON.stringify(value)) as Json);
const unique = (values: { id: string }[]) =>
  new Set(values.map((value) => value.id)).size === values.length;

function validateSnapshot(
  input: unknown,
  support: InfrastructureSupport,
  path: string,
): InfrastructureIssue[] {
  const issues: InfrastructureIssue[] = [];
  const add = (code: string, message: string) => issues.push({ path, code, message });
  if (!object(input) || !json(input)) {
    add('snapshot', 'A JSON-compatible infrastructure snapshot is required.');
    return issues;
  }
  if (input.schemaVersion !== 1)
    add('unsupported-schema', 'Only infrastructure update snapshot schema 1 is supported.');
  issues.push(...validateInfrastructurePin(input.pin, support, `${path}.pin`));
  if (!input.registry && !input.tokenManifest && !input.inventory)
    add(
      'missing-snapshot-data',
      'Supply registry, token manifest or configuration inventory evidence.',
    );
  if (input.registry !== undefined) {
    const registry = input.registry;
    if (
      !object(registry) ||
      registry.schemaVersion !== 1 ||
      !Array.isArray(registry.entries) ||
      !Number.isSafeInteger(registry.revision) ||
      Number(registry.revision) < 1
    )
      add('registry-schema', 'Only a valid registry schema 1 snapshot is supported.');
    else {
      if (object(input.pin) && registry.revision !== input.pin.registryRevision)
        add('registry-pin', 'Registry data does not match its pinned revision.');
      if (
        registry.entries.some(
          (entry) =>
            !object(entry) ||
            !text(entry.id) ||
            !text(entry.importPath) ||
            (entry.version !== undefined &&
              (!Number.isSafeInteger(entry.version) || Number(entry.version) < 1)) ||
            (entry.capabilities !== undefined && !strings(entry.capabilities)),
        ) ||
        !unique(registry.entries as { id: string }[])
      )
        add(
          'registry-entry',
          'Registry entries require unique IDs, import paths and valid declared metadata.',
        );
    }
  }
  if (input.tokenManifest !== undefined) {
    const manifest = input.tokenManifest;
    if (
      !object(manifest) ||
      manifest.version !== 1 ||
      !strings(manifest.configurations) ||
      !manifest.configurations.length ||
      !object(manifest.tokens) ||
      Object.entries(manifest.tokens).some(
        ([name, token]) =>
          !text(name) ||
          !object(token) ||
          !['primitive', 'semantic', 'group'].includes(String(token.tier)),
      )
    )
      add(
        'token-schema',
        'Only token manifest version 1 with named tiered tokens and configurations is supported.',
      );
  }
  if (input.inventory !== undefined) {
    const inventory = input.inventory;
    if (
      !object(inventory) ||
      inventory.schemaVersion !== 1 ||
      inventory.status !== 'ready' ||
      !Array.isArray(inventory.components) ||
      !object(inventory.themeAxes)
    )
      add('inventory-schema', 'Only a ready configuration inventory schema 1 is supported.');
    else {
      if (stable(inventory.pin) !== stable(input.pin))
        add('inventory-pin', 'Inventory identity must match the enclosing release pin exactly.');
      const ids = new Set<string>();
      for (const component of inventory.components) {
        if (
          !object(component) ||
          !text(component.componentId) ||
          ids.has(component.componentId) ||
          !strings(component.importPaths) ||
          !component.importPaths.length ||
          !Array.isArray(component.dimensions)
        ) {
          add(
            'inventory-component',
            'Inventory components need unique identities, import paths and dimensions.',
          );
          continue;
        }
        ids.add(component.componentId);
        const dimensions = new Set<string>();
        for (const dimension of component.dimensions) {
          if (
            !object(dimension) ||
            !text(dimension.id) ||
            dimensions.has(dimension.id) ||
            !(
              dimension.allowedValues === null ||
              (strings(dimension.allowedValues) && dimension.allowedValues.length)
            ) ||
            typeof dimension.required !== 'boolean' ||
            typeof dimension.defaultKnown !== 'boolean' ||
            !(dimension.defaultValue === null || typeof dimension.defaultValue === 'string') ||
            !(dimension.defaultSource === null || typeof dimension.defaultSource === 'string')
          )
            add(
              'inventory-dimension',
              'Dimension domains/defaults must be explicit and uniquely identified.',
            );
          else dimensions.add(dimension.id);
        }
      }
      if (Object.values(inventory.themeAxes).some((value) => !strings(value) || !value.length))
        add('inventory-theme', 'Theme domains must be nonempty unique string arrays.');
    }
  }
  return issues;
}

/** Static review plan only. No install, write, release acceptance or test execution occurs. */
export function planInfrastructureUpdate(
  fromInput: unknown,
  toInput: unknown,
  options: InfrastructureSupport & {
    projectId: string;
    pinnedReleaseId: string;
    usageCounts?: Record<string, number>;
  } = { projectId: '', pinnedReleaseId: '' },
): InfrastructureUpdatePlan {
  const issues: InfrastructureIssue[] = [];
  const plan: InfrastructureUpdatePlan = {
    schemaVersion: 1,
    status: 'blocked',
    from: null,
    to: null,
    execution: 'plan-only',
    applied: false,
    automaticActions: [],
    requiresOwnerReview: true,
    issues,
    impacts: [],
    summary: {
      breaking: 0,
      additive: 0,
      review: 0,
      affectedComponents: 0,
      affectedUsageCount: 0,
      usageComplete: false,
    },
    evidence: {
      compatibility: 'static-input-comparison',
      migration: 'planned-not-executed',
      runtimeVerification: 'not-performed',
      coverageInherited: false,
    },
    limitations: [
      'Static API/token comparison cannot establish runtime compatibility.',
      'Usage counts are supplied observations, not a complete scan or live telemetry.',
      'Global token/release impacts list all supplied component usage as potentially affected; dependency attribution is not inferred.',
      'Every nonempty change plan requires review; migration suggestions are not executed.',
      'Existing verification records never become verification of the target release automatically.',
    ],
  };
  issues.push(
    ...validateSnapshot(fromInput, options, 'from'),
    ...validateSnapshot(toInput, options, 'to'),
  );
  if (!text(options.projectId) || !text(options.pinnedReleaseId))
    issues.push({
      path: 'options',
      code: 'project-pin',
      message: 'Specify the project and its currently pinned release explicitly.',
    });
  if (
    options.usageCounts !== undefined &&
    (!object(options.usageCounts) ||
      Object.entries(options.usageCounts).some(
        ([id, count]) => !text(id) || !Number.isSafeInteger(count) || count < 0,
      ))
  )
    issues.push({
      path: 'usageCounts',
      code: 'usage',
      message: 'Usage counts must be nonnegative safe integers keyed by component ID.',
    });
  if (issues.length) return plan;
  const from = fromInput as InfrastructureUpdateSnapshot,
    to = toInput as InfrastructureUpdateSnapshot;
  plan.from = { ...from.pin };
  plan.to = { ...to.pin };
  if (
    from.pin.projectId !== options.projectId ||
    to.pin.projectId !== options.projectId ||
    from.pin.releaseId !== options.pinnedReleaseId
  )
    issues.push({
      path: 'pin',
      code: 'project-pin-mismatch',
      message:
        'Both snapshots must belong to the selected project and the source must equal its currently pinned release.',
    });
  if (to.pin.registryRevision < from.pin.registryRevision)
    issues.push({
      path: 'to.pin.registryRevision',
      code: 'revision-rollback',
      message: 'A registry rollback requires a separate explicit rollback workflow.',
    });
  for (const key of ['registry', 'tokenManifest', 'inventory'] as const)
    if (Boolean(from[key]) !== Boolean(to[key]))
      issues.push({
        path: key,
        code: 'incomplete-comparison',
        message: `Supply ${key} on both releases; missing evidence is not interpreted as a removal.`,
      });
  if (issues.length) return plan;
  const counts = options.usageCounts;
  const add = (
    kind: string,
    severity: UpdateImpact['severity'],
    scope: UpdateImpact['scope'],
    path: string,
    componentId: string | null,
    before: unknown,
    after: unknown,
    migration: string,
  ) => {
    const affectedComponentIds = componentId ? [componentId] : Object.keys(counts ?? {}).sort();
    const known =
      counts !== undefined && (componentId === null || Object.hasOwn(counts, componentId));
    plan.impacts.push({
      id: `${kind}:${path}`,
      kind,
      severity,
      scope,
      path,
      componentId,
      before: asJson(before),
      after: asJson(after),
      migration,
      affectedComponentIds,
      affectedUsageCount: known
        ? affectedComponentIds.reduce((total, id) => total + counts![id], 0)
        : null,
      usageBasis: !known
        ? 'not-provided'
        : componentId
          ? 'supplied-component-count'
          : 'all-supplied-components-potential',
    });
  };
  const domains = (
    before: readonly string[],
    after: readonly string[],
    path: string,
    componentId: string | null,
    scope: UpdateImpact['scope'],
    label: string,
  ) => {
    for (const value of [...before].sort())
      if (!after.includes(value))
        add(
          `${label}-removed`,
          'breaking',
          scope,
          `${path}.${value}`,
          componentId,
          value,
          null,
          `Replace or remove uses of ${value}; verify callers before adopting this release.`,
        );
    for (const value of [...after].sort())
      if (!before.includes(value))
        add(
          `${label}-added`,
          'additive',
          scope,
          `${path}.${value}`,
          componentId,
          null,
          value,
          `Review the new ${label} option and add explicit coverage before use.`,
        );
  };
  if (from.registry && to.registry) {
    const old = new Map(from.registry.entries.map((entry) => [entry.id, entry]));
    const next = new Map(to.registry.entries.map((entry) => [entry.id, entry]));
    for (const [id, entry] of old) {
      const updated = next.get(id);
      if (!updated) {
        add(
          'component-removed',
          'breaking',
          'component',
          `registry.${id}`,
          id,
          entry,
          null,
          'Migrate every recorded consumer to a reviewed replacement before upgrading.',
        );
        continue;
      }
      if (entry.importPath !== updated.importPath)
        add(
          'import-changed',
          'breaking',
          'component',
          `registry.${id}.importPath`,
          id,
          entry.importPath,
          updated.importPath,
          'Update imports explicitly and run consumer type/build/runtime checks.',
        );
      domains(
        entry.capabilities ?? [],
        updated.capabilities ?? [],
        `registry.${id}.capabilities`,
        id,
        'component',
        'capability',
      );
      for (const field of ['behavior', 'contract', 'version'] as const)
        if (stable(entry[field]) !== stable(updated[field]))
          add(
            `${field}-changed`,
            'review',
            'component',
            `registry.${id}.${field}`,
            id,
            entry[field],
            updated[field],
            `Review the changed ${field} and verify the affected interactions; metadata is not compatibility proof.`,
          );
    }
    for (const [id, entry] of next)
      if (!old.has(id))
        add(
          'component-added',
          'additive',
          'component',
          `registry.${id}`,
          id,
          null,
          entry,
          'Review the new component contract, ownership and evidence before adopting it.',
        );
  }
  if (from.inventory && to.inventory) {
    const old = new Map(
      from.inventory.components.map((component) => [component.componentId, component]),
    );
    const next = new Map(
      to.inventory.components.map((component) => [component.componentId, component]),
    );
    for (const [id, component] of old) {
      const updated = next.get(id);
      if (!updated) {
        add(
          'inventory-component-removed',
          'breaking',
          'component',
          `inventory.${id}`,
          id,
          component.importPaths,
          null,
          'Migrate or remove component usage; confirm its replacement contract.',
        );
        continue;
      }
      domains(
        component.importPaths,
        updated.importPaths,
        `inventory.${id}.imports`,
        id,
        'component',
        'import',
      );
      const props = new Map(component.dimensions.map((dimension) => [dimension.id, dimension]));
      const newProps = new Map(updated.dimensions.map((dimension) => [dimension.id, dimension]));
      for (const [propId, prop] of props) {
        const nextProp = newProps.get(propId);
        const path = `inventory.${id}.props.${propId}`;
        if (!nextProp) {
          add(
            'prop-removed',
            'breaking',
            'prop',
            path,
            id,
            prop,
            null,
            'Remove or migrate this prop and verify all consumers.',
          );
          continue;
        }
        if (prop.allowedValues && nextProp.allowedValues)
          domains(
            prop.allowedValues,
            nextProp.allowedValues,
            `${path}.allowedValues`,
            id,
            'prop',
            'enum-value',
          );
        else if (stable(prop.allowedValues) !== stable(nextProp.allowedValues))
          add(
            'prop-domain-changed',
            nextProp.allowedValues ? 'breaking' : 'review',
            'prop',
            `${path}.allowedValues`,
            id,
            prop.allowedValues,
            nextProp.allowedValues,
            'Review the constrained/unconstrained boundary using published declarations and actual consumer values.',
          );
        if (prop.required !== nextProp.required)
          add(
            'prop-required-changed',
            nextProp.required ? 'breaking' : 'additive',
            'prop',
            `${path}.required`,
            id,
            prop.required,
            nextProp.required,
            nextProp.required
              ? 'Supply the newly required prop for every consumer.'
              : 'Review callers and the behavior when this prop is omitted.',
          );
        const defaults = (value: ConfigurabilityDimension) => ({
          known: value.defaultKnown,
          value: value.defaultValue,
          source: value.defaultKnown ? null : value.defaultSource,
        });
        if (stable(defaults(prop)) !== stable(defaults(nextProp)))
          add(
            'default-changed',
            'review',
            'prop',
            `${path}.default`,
            id,
            defaults(prop),
            defaults(nextProp),
            'Set an explicit value to retain previous behavior or deliberately adopt and test the new default.',
          );
        if (prop.sourceType !== nextProp.sourceType)
          add(
            'prop-type-changed',
            'review',
            'prop',
            `${path}.type`,
            id,
            prop.sourceType,
            nextProp.sourceType,
            'Check published types and conditional requirements; source type text alone cannot prove compatibility.',
          );
        if (prop.axis !== nextProp.axis)
          add(
            'axis-changed',
            'review',
            'prop',
            `${path}.axis`,
            id,
            prop.axis,
            nextProp.axis,
            'Review configuration ownership and verify that presentation and behavior remain independent.',
          );
      }
      for (const [propId, prop] of newProps)
        if (!props.has(propId))
          add(
            'prop-added',
            prop.required ? 'breaking' : 'additive',
            'prop',
            `inventory.${id}.props.${propId}`,
            id,
            null,
            prop,
            prop.required
              ? 'Provide this new required prop before upgrading.'
              : 'Review the optional prop and its default before adopting it.',
          );
    }
    for (const [id, component] of next)
      if (!old.has(id))
        add(
          'inventory-component-added',
          'additive',
          'component',
          `inventory.${id}`,
          id,
          null,
          component.importPaths,
          'Review the new API and require its own configuration evidence.',
        );
    const beforeAxes = from.inventory.themeAxes,
      afterAxes = to.inventory.themeAxes;
    for (const name of Object.keys(beforeAxes)) {
      if (!Object.hasOwn(afterAxes, name))
        add(
          'theme-axis-removed',
          'breaking',
          'configuration',
          `themeAxes.${name}`,
          null,
          beforeAxes[name],
          null,
          'Migrate theme settings and verify all affected presentations.',
        );
      else
        domains(
          beforeAxes[name],
          afterAxes[name],
          `themeAxes.${name}`,
          null,
          'configuration',
          'theme-value',
        );
    }
    for (const name of Object.keys(afterAxes))
      if (!Object.hasOwn(beforeAxes, name))
        add(
          'theme-axis-added',
          'additive',
          'configuration',
          `themeAxes.${name}`,
          null,
          null,
          afterAxes[name],
          'Review the new theme axis and its explicit defaults; existing coverage does not cover it.',
        );
  }
  if (from.tokenManifest && to.tokenManifest) {
    domains(
      from.tokenManifest.configurations,
      to.tokenManifest.configurations,
      'tokenManifest.configurations',
      null,
      'configuration',
      'configuration',
    );
    const old = from.tokenManifest.tokens,
      next = to.tokenManifest.tokens;
    for (const name of Object.keys(old)) {
      if (!Object.hasOwn(next, name))
        add(
          'token-removed',
          'breaking',
          'token',
          `tokens.${name}`,
          null,
          old[name],
          null,
          'Find dependent semantic/group tokens and consumers; migrate references before upgrading.',
        );
      else if (stable(old[name]) !== stable(next[name]))
        add(
          old[name].tier !== next[name].tier ? 'token-tier-changed' : 'token-definition-changed',
          old[name].tier !== next[name].tier ? 'breaking' : 'review',
          'token',
          `tokens.${name}`,
          null,
          old[name],
          next[name],
          'Verify the Primitive → Semantic → Group graph and affected configurations visually; no rewrite is performed.',
        );
    }
    for (const name of Object.keys(next))
      if (!Object.hasOwn(old, name))
        add(
          'token-added',
          'additive',
          'token',
          `tokens.${name}`,
          null,
          null,
          next[name],
          'Review token naming, owning tier and all applicable mappings before use.',
        );
  }
  if (from.pin.kitVersion !== to.pin.kitVersion)
    add(
      'kit-version-changed',
      'review',
      'release',
      'pin.kitVersion',
      null,
      from.pin.kitVersion,
      to.pin.kitVersion,
      'Review the supported release, pin adoption explicitly and run consumer verification; no dependency installation occurs.',
    );
  if (from.pin.registryRevision !== to.pin.registryRevision)
    add(
      'registry-revision-changed',
      'review',
      'release',
      'pin.registryRevision',
      null,
      from.pin.registryRevision,
      to.pin.registryRevision,
      'Refresh pinned specifications and review the complete registry change before adoption.',
    );
  if (from.pin.releaseId === to.pin.releaseId && plan.impacts.length) {
    issues.push({
      path: 'pin.releaseId',
      code: 'immutable-release-changed',
      message:
        'The same release identity has incompatible content. Create a new immutable release identity before planning an update.',
    });
    plan.impacts = [];
    return plan;
  }
  plan.impacts.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const affected = new Set(plan.impacts.flatMap((impact) => impact.affectedComponentIds));
  plan.summary = {
    breaking: plan.impacts.filter((impact) => impact.severity === 'breaking').length,
    additive: plan.impacts.filter((impact) => impact.severity === 'additive').length,
    review: plan.impacts.filter((impact) => impact.severity === 'review').length,
    affectedComponents: affected.size,
    affectedUsageCount: [...affected].reduce(
      (sum, id) => sum + (counts && Object.hasOwn(counts, id) ? counts[id] : 0),
      0,
    ),
    usageComplete:
      !plan.impacts.length ||
      (counts !== undefined &&
        plan.impacts.every(
          (impact) => impact.componentId !== null && Object.hasOwn(counts, impact.componentId),
        )),
  };
  plan.status = plan.impacts.length ? 'review-required' : 'no-op';
  plan.requiresOwnerReview = plan.impacts.length > 0;
  return plan;
}
