import { compareProfiles, type ProfileChange } from './brand-package';
import {
  compileProfile,
  configurations,
  validateProfile,
  type CompiledProfile,
  type Configuration,
  type DesignProfile,
  type TokenDefinition,
} from './profile';

export type DtcgDocument = Record<string, unknown>;
export interface InterchangeIssue {
  severity: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}
export interface InspectedToken {
  path: string;
  type: string;
  value: unknown;
  resolvedValue?: unknown;
  alias?: string;
}
export interface DtcgInspection {
  valid: boolean;
  document?: DtcgDocument;
  tokens: InspectedToken[];
  issues: InterchangeIssue[];
}
export const dtcgSupportedTypes = [
  'color',
  'dimension',
  'duration',
  'number',
  'fontFamily',
  'fontWeight',
  'cubicBezier',
] as const;
const extensionKey = 'org.aegis.interchange';
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const numeric = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const aliasPattern = /^\{([^{}]+)\}$/;
const pointer = (parts: string[]) =>
  '#/' + parts.map((part) => part.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');

/** Parse to plain JSON without evaluating CSS, fetching URLs, or invoking hooks. */
function cloneJson(input: unknown): DtcgDocument {
  let nodes = 0;
  const ancestors = new Set<object>();
  function visit(value: unknown, depth: number): unknown {
    if (++nodes > 200_000 || depth > 64)
      throw new Error('Token document exceeds the supported size or nesting limit.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || numeric(value))
      return value;
    if (!value || typeof value !== 'object') throw new Error('Only finite JSON data is supported.');
    if (ancestors.has(value))
      throw new Error('The input contains a circular JavaScript object. Use JSON data.');
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error('Only plain JSON objects are supported.');
    ancestors.add(value);
    const result = Array.isArray(value)
      ? value.map((child) => visit(child, depth + 1))
      : Object.fromEntries(
          Object.entries(value).map(([key, child]) => [key, visit(child, depth + 1)]),
        );
    ancestors.delete(value);
    return result;
  }
  const result = visit(input, 0);
  if (!record(result)) throw new Error('A token document must be a JSON object.');
  return result;
}

function validateValue(type: string, value: unknown): string | undefined {
  if (type === 'number') return numeric(value) ? undefined : 'Expected a finite number.';
  if (type === 'dimension' || type === 'duration') {
    const units = type === 'dimension' ? ['px', 'rem'] : ['ms', 's'];
    return record(value) &&
      Object.keys(value).every((key) => ['value', 'unit'].includes(key)) &&
      numeric(value.value) &&
      typeof value.unit === 'string' &&
      units.includes(value.unit) &&
      (type !== 'duration' || value.value >= 0)
      ? undefined
      : `Expected {value: number, unit: ${units.join(' | ')}}${type === 'duration' ? ' with a non-negative duration' : ''}.`;
  }
  if (type === 'color') {
    if (!record(value) || value.colorSpace !== 'srgb')
      return 'This importer supports sRGB color objects only; other color spaces require explicit conversion.';
    return Object.keys(value).every((key) =>
      ['colorSpace', 'components', 'alpha', 'hex'].includes(key),
    ) &&
      Array.isArray(value.components) &&
      value.components.length === 3 &&
      value.components.every((part) => numeric(part) && part >= 0 && part <= 1) &&
      (value.alpha === undefined ||
        (numeric(value.alpha) && value.alpha >= 0 && value.alpha <= 1)) &&
      (value.hex === undefined ||
        (typeof value.hex === 'string' && /^#[\da-f]{6}$/i.test(value.hex)))
      ? undefined
      : 'Expected three sRGB components in [0,1], an optional alpha in [0,1], and an optional six-digit hex fallback.';
  }
  if (type === 'fontFamily')
    return (typeof value === 'string' && !!value.trim()) ||
      (Array.isArray(value) &&
        value.length > 0 &&
        value.every((part) => typeof part === 'string' && !!part.trim()))
      ? undefined
      : 'Expected a font name or a non-empty ordered list of font names.';
  if (type === 'fontWeight') {
    const weights = [
      'thin',
      'hairline',
      'extra-light',
      'ultra-light',
      'light',
      'normal',
      'regular',
      'book',
      'medium',
      'semi-bold',
      'demi-bold',
      'bold',
      'extra-bold',
      'ultra-bold',
      'black',
      'heavy',
      'extra-black',
      'ultra-black',
    ];
    return (numeric(value) && value >= 1 && value <= 1000) ||
      (typeof value === 'string' && weights.includes(value))
      ? undefined
      : 'Expected a weight in [1,1000] or a DTCG font-weight keyword.';
  }
  if (type === 'cubicBezier')
    return Array.isArray(value) &&
      value.length === 4 &&
      value.every(numeric) &&
      value[0] >= 0 &&
      value[0] <= 1 &&
      value[2] >= 0 &&
      value[2] <= 1
      ? undefined
      : 'Expected four finite control points with x values in [0,1].';
  return `Unsupported DTCG type: ${type}.`;
}

/** Supported DTCG 2025.10 subset. The original aliases and unknown extension data are preserved. */
export function inspectDtcg(input: unknown): DtcgInspection {
  const issues: InterchangeIssue[] = [];
  const error = (code: string, path: string, message: string) => {
    if (
      !issues.some(
        (issue) => issue.code === code && issue.path === path && issue.message === message,
      )
    )
      issues.push({ severity: 'error', code, path, message });
  };
  let document: DtcgDocument;
  try {
    document = cloneJson(input);
  } catch (reason) {
    return {
      valid: false,
      tokens: [],
      issues: [
        {
          severity: 'error',
          code: 'dtcg-json',
          path: '',
          message: reason instanceof Error ? reason.message : 'Invalid JSON data.',
        },
      ],
    };
  }
  const found = new Map<
    string,
    { node: Record<string, unknown>; parts: string[]; inherited?: string }
  >();
  function collect(node: Record<string, unknown>, parts: string[], inherited?: string) {
    const path = parts.join('.');
    if (own(node, '$type') && typeof node.$type !== 'string')
      error('dtcg-type', path, '$type must be a string.');
    const type = typeof node.$type === 'string' ? node.$type : inherited;
    const isToken = own(node, '$value') || own(node, '$ref');
    if (own(node, '$extensions') && !record(node.$extensions))
      error('dtcg-extensions', path, '$extensions must be an object.');
    if (own(node, '$description') && typeof node.$description !== 'string')
      error('dtcg-description', path, '$description must be a string.');
    if (
      own(node, '$deprecated') &&
      typeof node.$deprecated !== 'boolean' &&
      typeof node.$deprecated !== 'string'
    )
      error('dtcg-deprecated', path, '$deprecated must be a boolean or a reason string.');
    if (own(node, '$extends'))
      error(
        'dtcg-unsupported-extends',
        path,
        '$extends is not supported by this subset. Expand group inheritance before importing; it will not be silently ignored.',
      );
    const allowed = isToken
      ? ['$value', '$ref', '$type', '$description', '$extensions', '$deprecated']
      : ['$type', '$description', '$extensions', '$deprecated', '$extends', '$root'];
    for (const key of Object.keys(node)) {
      if (key.startsWith('$') && !allowed.includes(key))
        error('dtcg-property', path, `Unsupported property ${key}.`);
      if (isToken && !key.startsWith('$'))
        error('dtcg-token-group', path, 'An object cannot be both a token and a group.');
    }
    if (isToken) {
      if (!parts.length) error('dtcg-root-token', path, 'The document root must be a group.');
      if (own(node, '$value') && own(node, '$ref'))
        error('dtcg-ambiguous-value', path, 'Use either $value or $ref, not both.');
      found.set(path, { node, parts, inherited: type });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') && key !== '$root') continue;
      if (/[.{}]/.test(key) || !key) {
        error(
          'dtcg-name',
          [...parts, key].join('.'),
          'Token and group names cannot be empty or contain dots or braces.',
        );
        continue;
      }
      if (!record(child)) {
        error('dtcg-node', [...parts, key].join('.'), 'A token or group must be an object.');
        continue;
      }
      collect(child, [...parts, key], type);
    }
  }
  collect(document, []);
  const lookup = (parts: string[]): unknown => {
    let value: unknown = document;
    for (const part of parts) {
      if ((!record(value) && !Array.isArray(value)) || !own(value, part))
        throw new Error(`Missing local reference ${pointer(parts)}.`);
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  };
  function parsePointer(value: unknown): string[] {
    if (typeof value !== 'string' || !value.startsWith('#/'))
      throw new Error(
        'Only local #/ JSON Pointer references are supported. Remote references are never fetched.',
      );
    if (/%|~(?![01])/.test(value))
      throw new Error('Use unencoded local JSON Pointers with valid ~0 and ~1 escapes.');
    return value
      .slice(2)
      .split('/')
      .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  }
  const cache = new Map<string, unknown>();
  function resolveNode(parts: string[], stack: string[]): unknown {
    const key = pointer(parts);
    if (stack.includes(key))
      throw new Error(`Circular token reference: ${[...stack, key].join(' → ')}.`);
    if (stack.length > 128) throw new Error('Reference chain exceeds 128 steps.');
    if (cache.has(key)) return cache.get(key);
    const raw = lookup(parts);
    const result = expand(raw, parts, [...stack, key]);
    cache.set(key, result);
    return result;
  }
  function expand(raw: unknown, parts: string[], stack: string[]): unknown {
    if (parts.at(-1) === '$ref') return resolveNode(parsePointer(raw), stack);
    if (typeof raw === 'string') {
      const alias = aliasPattern.exec(raw);
      if (!alias) {
        if (/[{}]/.test(raw))
          throw new Error(
            `Malformed alias at ${pointer(parts)}. References must occupy the complete value.`,
          );
        return raw;
      }
      const target = found.get(alias[1]);
      if (!target) throw new Error(`Missing token alias ${alias[1]}.`);
      return resolveNode([...target.parts, own(target.node, '$value') ? '$value' : '$ref'], stack);
    }
    if (Array.isArray(raw))
      return raw.map((_, index) => resolveNode([...parts, String(index)], stack));
    if (record(raw)) {
      if (own(raw, '$ref')) {
        if (Object.keys(raw).length !== 1)
          throw new Error('A property reference object must contain only $ref.');
        return resolveNode(parsePointer(raw.$ref), stack);
      }
      return Object.fromEntries(
        Object.keys(raw).map((key) => [key, resolveNode([...parts, key], stack)]),
      );
    }
    return raw;
  }
  function targetPath(node: Record<string, unknown>): string | undefined {
    if (typeof node.$value === 'string') return aliasPattern.exec(node.$value)?.[1];
    if (typeof node.$ref === 'string') {
      try {
        const parts = parsePointer(node.$ref);
        return parts.at(-1) === '$value' ? parts.slice(0, -1).join('.') : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
  function tokenType(path: string, stack: string[] = []): string | undefined {
    if (stack.includes(path)) return undefined;
    const entry = found.get(path);
    if (!entry) return undefined;
    if (entry.inherited) return entry.inherited;
    const target = targetPath(entry.node);
    return target ? tokenType(target, [...stack, path]) : undefined;
  }
  const tokens: InspectedToken[] = [];
  for (const [path, entry] of found) {
    const type = tokenType(path);
    const alias = targetPath(entry.node);
    const token: InspectedToken = {
      path,
      type: type ?? '',
      value: own(entry.node, '$value') ? entry.node.$value : { $ref: entry.node.$ref },
      ...(alias ? { alias } : {}),
    };
    tokens.push(token);
    if (!type)
      error('dtcg-missing-type', path, 'A token must declare, inherit, or reference a type.');
    else if (!(dtcgSupportedTypes as readonly string[]).includes(type))
      error('dtcg-unsupported-type', path, `Unsupported DTCG type: ${type}.`);
    if (alias && type && tokenType(alias) && tokenType(alias) !== type)
      error(
        'dtcg-alias-type',
        path,
        `Alias type ${type} differs from ${tokenType(alias)} at ${alias}.`,
      );
    try {
      token.resolvedValue = resolveNode(
        [...entry.parts, own(entry.node, '$value') ? '$value' : '$ref'],
        [],
      );
      const message = type ? validateValue(type, token.resolvedValue) : undefined;
      if (message) error('dtcg-value', path, message);
    } catch (reason) {
      error(
        'dtcg-reference',
        path,
        reason instanceof Error ? reason.message : 'Reference resolution failed.',
      );
    }
  }
  if (!tokens.length) error('dtcg-empty', '', 'No tokens were found.');
  return { valid: !issues.some((issue) => issue.severity === 'error'), document, tokens, issues };
}

/** Canonicalizes object keys only. References and third-party $extensions remain intact. */
export function serializeDtcg(document: DtcgDocument): string {
  const copy = cloneJson(document);
  const sort = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sort)
      : record(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, sort(value[key])]),
          )
        : value;
  return JSON.stringify(sort(copy), null, 2) + '\n';
}

export interface DtcgBundle {
  format: 'aegis-dtcg-bundle';
  version: 1;
  documents: Record<Configuration, DtcgDocument>;
  issues: InterchangeIssue[];
  stats: { total: number; exported: number; omitted: number; aliases: number };
}
const colorObject = (hex: string) => ({
  colorSpace: 'srgb',
  components: [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255),
  hex: hex.toLowerCase(),
});
const fontStack = (value: string) =>
  value.split(',').map((name) => name.trim().replace(/^['"]|['"]$/g, ''));

/** Four separate DTCG documents, one for each explicit theme/mode mapping. No CSS flattening. */
export function exportDtcg(profile: DesignProfile): DtcgBundle {
  const compiled = compileProfile(profile);
  const issues: InterchangeIssue[] = [];
  const entries = Object.entries(compiled.manifest.tokens).sort(([a], [b]) => a.localeCompare(b));
  const names = new Map(
    entries.map(([name, token]) => [name, `${token.tier}.${name.replace(/^--/, '')}`]),
  );
  const stats = {
    total: entries.length * configurations.length,
    exported: 0,
    omitted: 0,
    aliases: 0,
  };
  const documents = {} as Record<Configuration, DtcgDocument>;
  for (const configuration of configurations) {
    const emitted = new Map<
      string,
      { $type: string; $value: unknown; $extensions: Record<string, unknown> }
    >();
    const omitted: { cssName: string; type: string; expression: string }[] = [];
    const visiting = new Set<string>();
    function emit(
      name: string,
    ): { $type: string; $value: unknown; $extensions: Record<string, unknown> } | undefined {
      if (emitted.has(name)) return emitted.get(name);
      if (visiting.has(name) || omitted.some((item) => item.cssName === name)) return undefined;
      visiting.add(name);
      const token: TokenDefinition = compiled.manifest.tokens[name];
      const expression = token.tier === 'semantic' ? token.mappings![configuration] : token.value!;
      const reference = /^var\((--[\w-]+)\)$/.exec(expression);
      let type: string = token.type === 'opacity' ? 'number' : token.type;
      let value: unknown;
      if (reference) {
        const target = emit(reference[1]);
        if (target) {
          type = target.$type;
          value = `{${names.get(reference[1])}}`;
        }
      } else if (type === 'color' && /^#[\da-f]{6}$/i.test(expression))
        value = colorObject(expression);
      else if (type === 'number' && /^-?\d+(?:\.\d+)?$/.test(expression))
        value = Number(expression);
      else if (type === 'dimension' && /^-?(?:\d+\.?\d*|\.\d+)(px|rem)$/.test(expression))
        value = { value: parseFloat(expression), unit: expression.endsWith('rem') ? 'rem' : 'px' };
      else if (type === 'duration' && /^(?:\d+\.?\d*|\.\d+)(ms|s)$/.test(expression))
        value = { value: parseFloat(expression), unit: expression.endsWith('ms') ? 'ms' : 's' };
      else if (
        type === 'string' &&
        /(?:^|,)\s*(?:system-ui|sans-serif|serif|monospace)\s*(?:,|$)/.test(expression)
      ) {
        type = 'fontFamily';
        value = fontStack(expression);
      }
      visiting.delete(name);
      if (value === undefined) {
        omitted.push({ cssName: name, type: token.type, expression });
        issues.push({
          severity: 'warning',
          code: reference ? 'dtcg-export-unsupported-reference' : 'dtcg-export-unsupported-value',
          path: `${configuration}:${name}`,
          message: `Not exported as a DTCG token: ${token.type} ${expression}. Original expression is retained in the document extension.`,
        });
        return undefined;
      }
      const output = {
        $type: type,
        $value: value,
        $extensions: {
          [extensionKey]: {
            cssName: name,
            tier: token.tier,
            sourcePath: token.path,
            sourceType: token.type,
            ...(token.family ? { family: token.family } : {}),
            ...(token.invariant !== undefined ? { invariant: token.invariant } : {}),
            ...(token.scope ? { scope: token.scope } : {}),
          },
        },
      };
      emitted.set(name, output);
      if (reference) stats.aliases++;
      return output;
    }
    for (const [name] of entries) emit(name);
    const groups: DtcgDocument = { primitive: {}, semantic: {}, group: {} };
    for (const [name, token] of [...emitted].sort(([a], [b]) => a.localeCompare(b))) {
      const tier = compiled.manifest.tokens[name].tier;
      (groups[tier] as Record<string, unknown>)[name.replace(/^--/, '')] = token;
    }
    documents[configuration] = {
      $extensions: {
        [extensionKey]: {
          formatVersion: '2025.10',
          configuration,
          profile: compiled.profile,
          omitted: omitted.sort((a, b) => a.cssName.localeCompare(b.cssName)),
        },
      },
      ...groups,
    };
    stats.exported += emitted.size;
    stats.omitted += omitted.length;
  }
  return { format: 'aegis-dtcg-bundle', version: 1, documents, issues, stats };
}

export type DtcgProfileField =
  | 'brand'
  | 'semantic.success'
  | 'semantic.warning'
  | 'semantic.danger'
  | 'semantic.info'
  | 'font'
  | 'radius';
export interface DtcgProfileMapping {
  field: DtcgProfileField;
  tokenPath: string;
}
export interface DtcgImportPreview {
  valid: boolean;
  issues: InterchangeIssue[];
  profile?: DesignProfile;
  compiled?: CompiledProfile;
  changes: ProfileChange[];
}

/** Requires user-selected source-to-profile mappings. Nothing is applied or persisted here. */
export function previewDtcgImport(
  input: unknown,
  currentProfile: DesignProfile,
  mappings: DtcgProfileMapping[],
): DtcgImportPreview {
  const inspection = inspectDtcg(input);
  const issues = [
    ...inspection.issues,
    ...validateProfile(currentProfile).map((issue) => ({ ...issue, path: 'profile' })),
  ];
  const error = (code: string, path: string, message: string) =>
    issues.push({ severity: 'error', code, path, message });
  if (!inspection.valid || issues.some((issue) => issue.severity === 'error'))
    return { valid: false, issues, changes: [] };
  const profile = structuredClone(currentProfile);
  const fields = new Set<string>();
  if (!Array.isArray(mappings) || !mappings.length)
    error('dtcg-mapping-required', '', 'Select at least one explicit token-to-profile mapping.');
  else
    for (const mapping of mappings) {
      if (
        !record(mapping) ||
        typeof mapping.field !== 'string' ||
        typeof mapping.tokenPath !== 'string' ||
        Object.keys(mapping).some((key) => !['field', 'tokenPath'].includes(key))
      ) {
        error('dtcg-mapping', '', 'Mappings require only field and tokenPath strings.');
        continue;
      }
      if (fields.has(mapping.field)) {
        error(
          'dtcg-mapping-duplicate',
          mapping.field,
          'Each profile field can be mapped only once.',
        );
        continue;
      }
      fields.add(mapping.field);
      const token = inspection.tokens.find((candidate) => candidate.path === mapping.tokenPath);
      if (!token) {
        error('dtcg-mapping-token', mapping.tokenPath, 'The selected token does not exist.');
        continue;
      }
      const value = token.resolvedValue;
      if (
        [
          'brand',
          'semantic.success',
          'semantic.warning',
          'semantic.danger',
          'semantic.info',
        ].includes(mapping.field)
      ) {
        if (
          token.type !== 'color' ||
          !record(value) ||
          value.colorSpace !== 'srgb' ||
          (value.alpha !== undefined && value.alpha !== 1)
        ) {
          error(
            'dtcg-profile-color',
            token.path,
            'Profile seed colors require opaque sRGB values.',
          );
          continue;
        }
        const color =
          '#' +
          (value.components as number[])
            .map((component) =>
              Math.round(component * 255)
                .toString(16)
                .padStart(2, '0'),
            )
            .join('');
        if (mapping.field === 'brand') profile.brand = color;
        else
          profile.semantic[mapping.field.split('.')[1] as keyof DesignProfile['semantic']] = color;
      } else if (mapping.field === 'font') {
        const family = Array.isArray(value) ? value[0] : value;
        const choices: Record<string, DesignProfile['font']> = {
          figtree: 'figtree',
          'system-ui': 'system',
          serif: 'serif',
          georgia: 'serif',
        };
        const selected = typeof family === 'string' ? choices[family.toLowerCase()] : undefined;
        if (token.type !== 'fontFamily' || !selected)
          error(
            'dtcg-profile-font',
            token.path,
            'The first font family must map explicitly to Figtree, system-ui, serif, or Georgia. Custom fonts are not installed by this importer.',
          );
        else profile.font = selected;
      } else if (mapping.field === 'radius') {
        const choices: Record<number, DesignProfile['radius']> = {
          3: 'compact',
          6: 'soft',
          12: 'round',
        };
        if (
          token.type !== 'dimension' ||
          !record(value) ||
          value.unit !== 'px' ||
          !numeric(value.value) ||
          !choices[value.value]
        )
          error(
            'dtcg-profile-radius',
            token.path,
            'Radius mapping uses the semantic radius-l anchor: exactly 3px (compact), 6px (soft), or 12px (round). Other values are not approximated.',
          );
        else profile.radius = choices[value.value];
      } else
        error(
          'dtcg-profile-field',
          mapping.field,
          'This profile field is not supported by token import.',
        );
    }
  if (issues.some((issue) => issue.severity === 'error'))
    return { valid: false, issues, changes: [] };
  try {
    const compiled = compileProfile(profile);
    issues.push(...compiled.issues.map((issue) => ({ ...issue, path: 'profile' })));
    return {
      valid: true,
      issues,
      profile: compiled.profile,
      compiled,
      changes: compareProfiles(compileProfile(currentProfile).profile, compiled.profile),
    };
  } catch (reason) {
    error(
      'dtcg-profile-compile',
      'profile',
      reason instanceof Error ? reason.message : 'Profile compilation failed.',
    );
    return { valid: false, issues, changes: [] };
  }
}
