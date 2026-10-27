import canonicalSource from '../../tokens/design-tokens.json';
import compilerSource from '../../tokens/profile-compiler.json';
import aegis from '../../profiles/aegis.json';
import atlas from '../../profiles/atlas.json';
import solstice from '../../profiles/solstice.json';

/** Identity is compiled once. Mode, presentation and interaction state remain independent. */
export interface DesignProfile {
  version: 1;
  id: string;
  name: string;
  brand: string;
  neutral: 'neutral' | 'warm' | 'cool';
  semantic: { success: string; warning: string; danger: string; info: string };
  radius: 'compact' | 'soft' | 'round';
  font: 'figtree' | 'system' | 'serif';
  density: 'compact' | 'comfortable';
}
export interface ProfileIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}
export const configurations = [
  'fundamental.light',
  'fundamental.dark',
  'fundamental-floating.light',
  'fundamental-floating.dark',
] as const;
export type Configuration = (typeof configurations)[number];
export interface TokenDefinition {
  path: string;
  tier: 'primitive' | 'semantic' | 'group';
  type: string;
  value?: string;
  mappings?: Record<Configuration, string>;
  invariant?: boolean;
  family?: string;
  scope?: string;
}
export interface TokenManifest {
  version: number;
  configurations: string[];
  tokens: Record<string, TokenDefinition>;
  compatibility?: Record<string, string>;
  [key: string]: unknown;
}
export interface ContrastResult {
  pair: string;
  mode: Configuration;
  foreground: string;
  background: string;
  ratio: number;
  minimum: number;
  passes: boolean;
}
export interface CompiledProfile {
  profile: DesignProfile;
  css: string;
  manifest: TokenManifest;
  issues: ProfileIssue[];
  /** Stable content fingerprint, not a cryptographic signature or authenticity claim. */
  hash: string;
  stats: { primitive: number; semantic: number; group: number; changed: number; mappings: number };
  contrast: ContrastResult[];
  runtimeDefaults: { density: DesignProfile['density']; numericMetrics: 'unchanged'; font: string };
}
export const designProfiles: DesignProfile[] = [aegis, atlas, solstice] as DesignProfile[];
const canonical = canonicalSource as unknown as TokenManifest;
const baseline = aegis as DesignProfile;
const hexPattern = /^#[\da-f]{6}$/i;
const profileKeys = [
  'version',
  'id',
  'name',
  'brand',
  'neutral',
  'semantic',
  'radius',
  'font',
  'density',
];
const semanticKeys = ['success', 'warning', 'danger', 'info'] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function validateProfile(input: unknown): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const error = (code: string, message: string) =>
    issues.push({ code, message, severity: 'error' });
  if (!isRecord(input))
    return [{ code: 'profile-object', message: 'A profile must be an object.', severity: 'error' }];
  for (const key of Object.keys(input))
    if (!profileKeys.includes(key)) error('unknown-field', `Unknown profile field: ${key}.`);
  for (const key of profileKeys)
    if (!(key in input)) error('missing-field', `Missing profile field: ${key}.`);
  if (input.version !== 1) error('profile-version', 'Only design profile version 1 is supported.');
  if (typeof input.id !== 'string' || !/^[a-z][a-z0-9-]{0,47}$/.test(input.id))
    error(
      'profile-id',
      'Use an id of 1–48 lowercase letters, digits and hyphens, beginning with a letter.',
    );
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80)
    error('profile-name', 'The profile name must contain 1–80 characters.');
  if (typeof input.brand !== 'string' || !hexPattern.test(input.brand))
    error('brand-color', 'Brand must be a six-digit hex color.');
  const choices: Record<string, readonly string[]> = {
    neutral: ['neutral', 'warm', 'cool'],
    radius: ['compact', 'soft', 'round'],
    font: ['figtree', 'system', 'serif'],
    density: ['compact', 'comfortable'],
  };
  for (const [key, values] of Object.entries(choices))
    if (typeof input[key] !== 'string' || !values.includes(input[key] as string))
      error('profile-choice', `${key} must be one of: ${values.join(', ')}.`);
  if (!isRecord(input.semantic)) error('semantic-object', 'Semantic colors must be an object.');
  else {
    for (const key of Object.keys(input.semantic))
      if (!semanticKeys.includes(key as (typeof semanticKeys)[number]))
        error('unknown-semantic', `Unknown semantic role: ${key}.`);
    for (const key of semanticKeys)
      if (
        typeof input.semantic[key] !== 'string' ||
        !hexPattern.test(input.semantic[key] as string)
      )
        error('semantic-color', `${key} must be a six-digit hex color.`);
    if (
      !issues.length &&
      new Set(
        semanticKeys.map((key) => (input.semantic as Record<string, string>)[key].toLowerCase()),
      ).size < 4
    )
      issues.push({
        code: 'semantic-collision',
        message:
          'Some semantic roles share the same seed color. Labels and icons must retain their meaning; inspect role differentiation in context.',
        severity: 'warning',
      });
  }
  return issues;
}

// Color arithmetic uses sRGB for compositing/contrast and OKLCH for gamut-mapped hue changes.
type RGB = [number, number, number];
const fromHex = (hex: string): RGB =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as RGB;
const toHex = (rgb: RGB) =>
  '#' +
  rgb
    .map((c) =>
      Math.round(Math.max(0, Math.min(1, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encoded = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklch(rgb: RGB): RGB {
  const [r, g, b] = rgb.map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    Math.hypot(a, bb),
    (Math.atan2(bb, a) * 180) / Math.PI,
  ];
}
function rawRgb([lightness, chroma, hue]: RGB): RGB {
  const angle = (hue * Math.PI) / 180,
    a = chroma * Math.cos(angle),
    b = chroma * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encoded(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encoded(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encoded(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
function gamut([l, c, h]: RGB): RGB {
  let low = 0,
    high = c;
  const fits = (value: RGB) => value.every((channel) => channel >= 0 && channel <= 1);
  if (fits(rawRgb([l, c, h]))) return rawRgb([l, c, h]);
  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2;
    if (fits(rawRgb([l, mid, h]))) low = mid;
    else high = mid;
  }
  return rawRgb([l, low, h]);
}
function recolor(value: string, seed: string, neutral = false) {
  const [l, c] = oklch(fromHex(value)),
    [, seedChroma, hue] = oklch(fromHex(seed));
  return toHex(
    gamut([
      l,
      neutral
        ? Math.min(0.018, 0.004 + c)
        : Math.min(0.22, seedChroma) * Math.min(1.35, Math.max(0.15, c / 0.12)),
      hue,
    ]),
  );
}
const luminance = (hex: string) =>
  fromHex(hex)
    .map(linear)
    .reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0);
export function contrastRatio(foreground: string, background: string) {
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function accessibleColor(
  value: string,
  backgrounds: string[],
  mode: 'light' | 'dark',
  minimum = 4.5,
) {
  const passes = (candidate: string) =>
    backgrounds.every((bg) => contrastRatio(candidate, bg) >= minimum);
  if (passes(value)) return value;
  const [l, c, h] = oklch(fromHex(value));
  for (let i = 1; i <= 200; i++) {
    const next = toHex(
      gamut([mode === 'light' ? l * (1 - i / 200) : l + ((1 - l) * i) / 200, c, h]),
    );
    if (passes(next)) return next;
  }
  return canonical.tokens[mode === 'light' ? '--color-black' : '--color-white'].value!;
}
function neutralSeed(profile: DesignProfile) {
  return compilerSource.neutralSeeds[profile.neutral === 'warm' ? 'warm' : 'cool'];
}

/** Resolve references only. It deliberately does not claim to implement every CSS expression. */
export function resolveToken(
  manifest: TokenManifest,
  name: string,
  mode: Configuration,
  seen = new Set<string>(),
): string {
  if (seen.has(name)) throw new Error(`Token cycle: ${name}`);
  const token = manifest.tokens[name];
  if (!token) throw new Error(`Unknown token: ${name}`);
  const expression = token.tier === 'semantic' ? token.mappings?.[mode] : token.value;
  if (!expression) throw new Error(`Missing ${mode} value for ${name}`);
  const path = new Set(seen).add(name);
  return expression.replace(/var\((--[\w-]+)\)/g, (_, reference: string) =>
    resolveToken(manifest, reference, mode, path),
  );
}
function evaluateColor(expression: string): string | undefined {
  if (hexPattern.test(expression)) return expression.toLowerCase();
  const mix = expression.match(
    /^color-mix\(\s*in srgb,\s*(#[\da-f]{6})\s+([\d.]+)%,\s*(#[\da-f]{6})\s*\)$/i,
  );
  if (mix) {
    const amount = Number(mix[2]) / 100,
      a = fromHex(mix[1]),
      b = fromHex(mix[3]);
    return toHex(a.map((channel, i) => channel * amount + b[i] * (1 - amount)) as RGB);
  }
  return undefined;
}

function compileColors(manifest: TokenManifest, profile: DesignProfile) {
  const replacement = new Map<string, string>();
  const paletteSeeds: Record<string, string | undefined> = {
    blue: profile.brand.toLowerCase() === baseline.brand ? undefined : profile.brand,
    green:
      profile.semantic.success.toLowerCase() === baseline.semantic.success
        ? undefined
        : profile.semantic.success,
    red:
      profile.semantic.danger.toLowerCase() === baseline.semantic.danger
        ? undefined
        : profile.semantic.danger,
    amber:
      profile.semantic.warning.toLowerCase() === baseline.semantic.warning
        ? undefined
        : profile.semantic.warning,
    yellow:
      profile.semantic.warning.toLowerCase() === baseline.semantic.warning
        ? undefined
        : profile.semantic.warning,
    cyan:
      profile.semantic.info.toLowerCase() === baseline.semantic.info
        ? undefined
        : profile.semantic.info,
  };
  for (const [name, token] of Object.entries(manifest.tokens)) {
    if (
      token.tier !== 'primitive' ||
      token.type !== 'color' ||
      !token.value ||
      !hexPattern.test(token.value)
    )
      continue;
    const palette = name.match(/^--color-([a-z]+)-\d+$/)?.[1];
    const isNeutral =
      palette === 'neutral' ||
      palette === 'slate' ||
      name === '--color-white' ||
      name === '--color-black';
    if (isNeutral && profile.neutral !== 'neutral')
      replacement.set(token.value, recolor(token.value, neutralSeed(profile), true));
    else if (palette && paletteSeeds[palette])
      replacement.set(token.value, recolor(token.value, paletteSeeds[palette]!));
  }
  // Preserve canonical exact seed shades when a role is unchanged. Changed roles get accessible
  // light/dark anchors; replace their occurrences inside precomputed mixes as well as direct refs.
  const roles = [
    ['action', profile.brand, baseline.brand],
    ['success', profile.semantic.success, baseline.semantic.success],
    ['danger', profile.semantic.danger, baseline.semantic.danger],
    ['caution', profile.semantic.warning, baseline.semantic.warning],
  ];
  for (const [role, seed, previous] of roles) {
    if (seed.toLowerCase() === previous && profile.neutral === 'neutral') continue;
    for (const mode of ['light', 'dark'] as const) {
      const config = `fundamental.${mode}` as Configuration;
      const source = resolveToken(canonical, `--semantic-color-${role}-foreground`, config);
      const surfaces = ['surface-surface', 'surface-canvas'].map((surface) => {
        const old = resolveToken(canonical, `--semantic-color-${surface}`, config);
        return replacement.get(old) ?? old;
      });
      const onIntent = resolveToken(canonical, '--semantic-color-on-intent', config);
      const oldFill = resolveToken(canonical, `--semantic-color-${role}-fill`, config);
      const foreground = accessibleColor(replacement.get(source) ?? source, surfaces, mode, 4.6);
      replacement.set(source, foreground);
      replacement.set(
        oldFill,
        accessibleColor(
          replacement.get(oldFill) ?? oldFill,
          [...surfaces, replacement.get(onIntent) ?? onIntent],
          mode,
          4.6,
        ),
      );
    }
  }
  for (const token of Object.values(manifest.tokens)) {
    if (token.tier !== 'primitive' || token.type !== 'color' || !token.value) continue;
    token.value = token.value.replace(
      /#[\da-f]{6}\b/gi,
      (hex) => replacement.get(hex.toLowerCase()) ?? hex,
    );
  }
  // Info uses a Slate anchor in light mode, shared with neutral text. Give only its semantic
  // roles new primitives so choosing an info hue never recolors all neutral content.
  if (
    profile.semantic.info.toLowerCase() !== baseline.semantic.info ||
    profile.neutral !== 'neutral'
  ) {
    for (const mode of ['light', 'dark'] as const) {
      const config = `fundamental.${mode}` as Configuration;
      const surface = resolveToken(manifest, '--semantic-color-surface-surface', config);
      const original = resolveToken(canonical, '--semantic-color-severity-info-foreground', config);
      const info = accessibleColor(recolor(original, profile.semantic.info), [surface], mode, 4.6);
      for (const [name, token] of Object.entries(manifest.tokens)) {
        if (token.tier !== 'semantic' || !/severity-info/.test(name)) continue;
        const value = name.endsWith('-border')
          ? `color-mix(in srgb, ${info} 45%, ${surface})`
          : info;
        const key = `--primitive-profile-info-${mode}-${name.endsWith('-border') ? 'border' : 'foreground'}`;
        manifest.tokens[key] = {
          path: key.slice(2).replaceAll('-', '.'),
          tier: 'primitive',
          type: 'color',
          value,
        };
        for (const presentation of ['fundamental', 'fundamental-floating'])
          token.mappings![`${presentation}.${mode}` as Configuration] = `var(${key})`;
      }
    }
  }
}

function compileShapeAndType(manifest: TokenManifest, profile: DesignProfile) {
  // Change radius roles, never shared size primitives. Circles, chart geometry and full pills
  // are intentional shapes; category group mappings keep their existing relative relationships.
  if (profile.radius !== 'soft') {
    const factor = compilerSource.radiusFactors[profile.radius];
    for (const [name, token] of Object.entries(manifest.tokens)) {
      if (token.tier !== 'semantic' || !name.includes('radius') || name.includes('measurement'))
        continue;
      for (const config of configurations) {
        const value = resolveToken(canonical, name, config);
        if (!/^\d+(?:\.\d+)?px$/.test(value)) continue;
        const original = parseFloat(value);
        if (!original || original >= 999) continue;
        const radius = Math.round(original * factor * 2) / 2;
        const primitive = `--primitive-profile-radius-${String(radius).replace('.', '-')}`;
        manifest.tokens[primitive] = {
          path: `profile.radius.${String(radius).replace('.', '-')}`,
          tier: 'primitive',
          type: 'dimension',
          value: `${radius}px`,
        };
        token.mappings![config] = `var(${primitive})`;
      }
    }
  }
  if (profile.font !== 'figtree') {
    const value = compilerSource.fontFamilies[profile.font];
    const key = '--primitive-profile-font-ui';
    manifest.tokens[key] = { path: 'profile.font.ui', tier: 'primitive', type: 'string', value };
    for (const config of configurations)
      manifest.tokens['--semantic-font-family-ui'].mappings![config] = `var(${key})`;
  }
}

/** Independent output validation: all references, all four mappings, invariant values and cycles. */
export function validateCompiledManifest(manifest: TokenManifest): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const error = (code: string, message: string) =>
    issues.push({ code, message, severity: 'error' });
  if (
    manifest.configurations.length !== 4 ||
    configurations.some((key) => !manifest.configurations.includes(key))
  )
    error(
      'output-configurations',
      'The output must contain exactly the four supported theme/mode configurations.',
    );
  for (const [name, token] of Object.entries(manifest.tokens)) {
    if (!['primitive', 'semantic', 'group'].includes(token.tier))
      error('output-tier', `Unknown tier for ${name}.`);
    const expressions =
      token.tier === 'semantic' ? Object.values(token.mappings ?? {}) : [token.value];
    if (token.tier === 'semantic') {
      if (
        Object.keys(token.mappings ?? {}).length !== 4 ||
        configurations.some((key) => !token.mappings?.[key])
      )
        error('output-mapping', `${name} does not have four explicit mappings.`);
      if (token.invariant && new Set(expressions).size !== 1)
        error('output-invariant', `${name} changes invariant metrics across modes.`);
    }
    for (const expression of expressions) {
      if (!expression) {
        error('output-value', `${name} has an empty value.`);
        continue;
      }
      for (const [, reference] of expression.matchAll(/var\((--[\w-]+)\)/g)) {
        const target = manifest.tokens[reference];
        if (!target) error('output-reference', `${name} references missing ${reference}.`);
        else if (
          token.tier === 'primitive' ||
          target.tier !== (token.tier === 'semantic' ? 'primitive' : 'semantic')
        )
          error('output-tier', `${name} bypasses the preceding token tier through ${reference}.`);
      }
    }
  }
  // Adjacent-tier-only graphs cannot cycle. The check above therefore proves acyclicity too.
  return issues;
}

function mergeModes(
  light: string,
  dark: string,
  tokens: TokenManifest['tokens'],
): string | undefined {
  if (light === dark) return light;
  const refs = /var\((--[\w-]+)\)/g;
  const a = [...light.matchAll(refs)],
    b = [...dark.matchAll(refs)];
  if (a.length !== b.length || light.replace(refs, 'TOKEN') !== dark.replace(refs, 'TOKEN'))
    return undefined;
  let i = 0;
  let supported = true;
  const merged = light.replace(refs, (value, name: string) => {
    const other = b[i++][1];
    if (name === other) return value;
    if (tokens[name]?.type !== 'color' || tokens[other]?.type !== 'color') {
      supported = false;
      return value;
    }
    return `light-dark(var(${name}), var(${other}))`;
  });
  return supported ? merged : undefined;
}
function compileCss(manifest: TokenManifest, id: string) {
  const scope = `[data-agentic-profile="${id}"]`;
  const entries = Object.entries(manifest.tokens);
  const lines = entries
    .filter(([, t]) => t.tier === 'primitive')
    .map(([name, t]) => `  ${name}: ${t.value};`);
  let css = `/* Aegis profile compiler v1. Generated; edit the profile, not this stylesheet. */\n${scope} {\n${lines.join('\n')}\n}\n`;
  for (const presentation of ['fundamental', 'fundamental-floating'] as const) {
    const modeBoundary = ':is(.dark, .aegis-theme-light, [data-theme])';
    const selectors =
      presentation === 'fundamental'
        ? `${scope}, ${scope} ${modeBoundary}, ${scope}[data-layout-theme="fundamental"], ${scope} [data-layout-theme="fundamental"], ${scope} [data-layout-theme="fundamental"] ${modeBoundary}`
        : `${scope}[data-layout-theme="fundamental-floating"], ${scope}[data-layout-theme="fundamental-floating"] ${modeBoundary}, ${scope} [data-layout-theme="fundamental-floating"], ${scope} [data-layout-theme="fundamental-floating"] ${modeBoundary}`;
    const fallback: [string, TokenDefinition][] = [];
    const semanticLines = entries
      .filter(([, t]) => t.tier === 'semantic')
      .map(([name, t]) => {
        const light = t.mappings![`${presentation}.light`],
          dark = t.mappings![`${presentation}.dark`];
        const value = mergeModes(light, dark, manifest.tokens);
        if (!value) fallback.push([name, t]);
        return `  ${name}: ${value ?? light};`;
      });
    css += `${selectors} {\n${semanticLines.join('\n')}\n}\n`;
    if (fallback.length) {
      const theme = `[data-layout-theme="${presentation}"]`;
      css += `${scope}${theme}:is(.dark, [data-theme="dark"]), ${scope}${theme} :is(.dark, [data-theme="dark"]), ${scope} ${theme}:is(.dark, [data-theme="dark"]) {\n${fallback.map(([name, t]) => `  ${name}: ${t.mappings![`${presentation}.dark`]};`).join('\n')}\n}\n`;
    }
  }
  const inheritedScopes = `${scope}, ${scope} [data-layout-theme], ${scope} .dark, ${scope} .aegis-theme-light, ${scope} [data-theme]`;
  css += `${inheritedScopes} {\n${entries
    .filter(([, t]) => t.tier === 'group' && t.scope !== 'local')
    .map(([name, t]) => `  ${name}: ${t.value};`)
    .join('\n')}\n`;
  // Compatibility aliases are generated from the same graph; they are not new tiers.
  css +=
    Object.entries(manifest.compatibility ?? {})
      .filter(([name]) => !manifest.tokens[name])
      .map(([name, target]) => `  ${name}: var(${target});`)
      .join('\n') + '\n}\n';
  css += `${scope}[data-theme="light"], ${scope}.aegis-theme-light, ${scope} [data-theme="light"], ${scope} .aegis-theme-light { color-scheme: light; }\n`;
  css += `${scope}[data-theme="dark"], ${scope}.dark, ${scope} [data-theme="dark"], ${scope} .dark { color-scheme: dark; }\n`;
  css += `@media (forced-colors: active) { ${inheritedScopes} { --semantic-ring-focus: var(--primitive-color-system-focus); } }\n`;
  return css;
}

function contrastReport(manifest: TokenManifest): ContrastResult[] {
  const pairs: [string, string, string, number][] = [
    ['Primary text / canvas', 'color-content-primary', 'color-surface-canvas', 4.5],
    ['Secondary text / surface', 'color-content-secondary', 'color-surface-surface', 4.5],
    ['Action text / surface', 'color-action-foreground', 'color-surface-surface', 4.5],
    ['Text on action fill', 'color-on-intent', 'color-action-fill', 4.5],
    ['Danger text / surface', 'color-danger-foreground', 'color-surface-surface', 4.5],
    ['Success text / surface', 'color-success-foreground', 'color-surface-surface', 4.5],
    ['Warning text / surface', 'color-caution-foreground', 'color-surface-surface', 4.5],
    ['Info text / surface', 'color-severity-info-foreground', 'color-surface-surface', 4.5],
    ['Focus / surface', 'ring-focus', 'color-surface-surface', 3],
  ];
  return configurations.flatMap((mode) =>
    pairs.map(([pair, fg, bg, minimum]) => {
      const foreground = evaluateColor(resolveToken(manifest, `--semantic-${fg}`, mode));
      const background = evaluateColor(resolveToken(manifest, `--semantic-${bg}`, mode));
      if (!foreground || !background)
        throw new Error(`Unsupported contrast expression: ${pair} / ${mode}`);
      const measured = contrastRatio(foreground, background);
      return {
        pair,
        mode,
        foreground,
        background,
        ratio: Math.round(measured * 100) / 100,
        minimum,
        passes: measured >= minimum,
      };
    }),
  );
}
function fingerprint(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export function compileProfile(input: DesignProfile): CompiledProfile {
  const issues = validateProfile(input);
  if (issues.some((issue) => issue.severity === 'error'))
    throw new Error(issues.map((issue) => issue.message).join(' '));
  const profile: DesignProfile = {
    version: 1,
    id: input.id,
    name: input.name.trim(),
    brand: input.brand.toLowerCase(),
    neutral: input.neutral,
    semantic: Object.fromEntries(
      semanticKeys.map((key) => [key, input.semantic[key].toLowerCase()]),
    ) as DesignProfile['semantic'],
    radius: input.radius,
    font: input.font,
    density: input.density,
  };
  const manifest = structuredClone(canonical);
  compileColors(manifest, profile);
  compileShapeAndType(manifest, profile);
  issues.push(...validateCompiledManifest(manifest));
  if (issues.some((issue) => issue.severity === 'error'))
    throw new Error(
      `Profile compilation produced invalid tokens: ${issues.map((i) => i.message).join(' ')}`,
    );
  const contrast = contrastReport(manifest);
  for (const result of contrast.filter((entry) => !entry.passes))
    issues.push({
      code: 'contrast-pair',
      severity: 'warning',
      message: `${result.pair} in ${result.mode}: ${result.ratio}:1 is below ${result.minimum}:1.`,
    });
  const css = compileCss(manifest, profile.id);
  const stats = { primitive: 0, semantic: 0, group: 0, changed: 0, mappings: 0 };
  for (const [name, token] of Object.entries(manifest.tokens)) {
    stats[token.tier]++;
    if (token.tier === 'semantic') stats.mappings += Object.keys(token.mappings!).length;
    if (JSON.stringify(token) !== JSON.stringify(canonical.tokens[name])) stats.changed++;
  }
  return {
    profile,
    css,
    manifest,
    issues,
    contrast,
    stats,
    hash: fingerprint(JSON.stringify(profile) + JSON.stringify(manifest)),
    runtimeDefaults: {
      density: profile.density,
      numericMetrics: 'unchanged',
      font: resolveToken(manifest, '--semantic-font-family-ui', 'fundamental.light'),
    },
  };
}
