import baseSource from '../../styles/tokens.css?raw';
import primitiveColorSource from '../../styles/primitive-color-tokens.css?raw';
import elevationSource from '../../styles/elevation-tokens.css?raw';
import fundamentalSource from '../../styles/fundamental-tokens.css?raw';
import componentSource from '../../styles/component-tokens.css?raw';
import runtimeSource from '../../styles/component-runtime-tokens.css?raw';
import canonicalSource from '../../styles/design-tokens.css?raw';
import canonicalManifest from '../../../tokens/design-tokens.json';

export type TokenTheme = 'light' | 'dark';
export type TokenValues = Record<string, string>;
export const tokenConfigurations = [
  'fundamental.light',
  'fundamental.dark',
  'fundamental-floating.light',
  'fundamental-floating.dark',
] as const;
export type TokenConfiguration = (typeof tokenConfigurations)[number];
interface CanonicalTokenSource {
  tokens: Record<string, { value?: string; mappings?: Record<string, string>; scope?: string }>;
  compatibility?: Record<string, string>;
}

function topLevelRules(source: string) {
  const rules: { selector: string; body: string }[] = [];
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  let start = 0;
  let bodyStart = 0;
  let depth = 0;
  let selector = '';
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '{') {
      if (depth === 0) {
        selector = text.slice(start, index).trim();
        bodyStart = index + 1;
      }
      depth++;
    } else if (text[index] === '}') {
      depth--;
      if (depth === 0) {
        rules.push({ selector, body: text.slice(bodyStart, index) });
        start = index + 1;
      }
    }
  }
  return rules;
}

/** Select a light-dark branch without splitting commas inside nested CSS functions. */
function themeValue(value: string, theme: TokenTheme): string {
  const start = value.indexOf('light-dark(');
  if (start === -1) return value.trim();
  const contentStart = start + 'light-dark('.length;
  let depth = 1;
  let comma = -1;
  for (let index = contentStart; index < value.length; index++) {
    if (value[index] === '(') depth++;
    else if (value[index] === ')') depth--;
    else if (value[index] === ',' && depth === 1 && comma === -1) comma = index;
    if (depth === 0 && comma !== -1) {
      const selected =
        theme === 'light' ? value.slice(contentStart, comma) : value.slice(comma + 1, index);
      return themeValue(value.slice(0, start) + selected.trim() + value.slice(index + 1), theme);
    }
  }
  return value.trim();
}

/** Read desktop/default declarations; responsive and reduced-motion rules remain runtime CSS. */
export function parseTokenSources(
  base: string,
  fundamental: string,
  canonical = '',
): Record<TokenTheme, TokenValues> {
  const light: TokenValues = {};
  const dark: TokenValues = {};
  for (const { selector, body } of topLevelRules(base)) {
    if (selector.startsWith('@')) continue;
    const isDark = /\.dark\b|\[data-theme\s*=\s*["']?dark/.test(selector);
    if (!isDark && !selector.includes(':root')) continue;
    const destinations = selector.includes(':root') ? (isDark ? [light, dark] : [light]) : [dark];
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      for (const destination of destinations) destination[name] = value.trim();
    }
  }
  const values = { light, dark: { ...light, ...dark } };
  for (const { selector, body } of topLevelRules(fundamental)) {
    if (selector.startsWith('@') || !selector.includes('data-layout-theme')) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      values.light[name] = themeValue(value, 'light');
      values.dark[name] = themeValue(value, 'dark');
    }
  }
  return {
    light: applyConfigurationStyles(values.light, canonical, 'fundamental.light'),
    dark: applyConfigurationStyles(values.dark, canonical, 'fundamental.dark'),
  };
}

function applyConfigurationStyles(
  inherited: TokenValues,
  source: string,
  configuration: TokenConfiguration,
): TokenValues {
  const values = { ...inherited };
  const [layout, theme] = configuration.split('.') as [string, TokenTheme];
  for (const { selector, body } of topLevelRules(source)) {
    if (selector.startsWith('@')) continue;
    const layouts = [...selector.matchAll(/data-layout-theme\s*=\s*['"]([^'"]+)['"]/g)].map(
      (match) => match[1],
    );
    const root = selector.includes(':root');
    const dark = /\.dark\b/.test(selector);
    const light = /\.aegis-theme-light\b/.test(selector);
    if (layouts.length && !root && !layouts.includes(layout)) continue;
    if (dark && !light && theme !== 'dark') continue;
    if (light && !dark && theme !== 'light') continue;
    if (!root && !layouts.length && !dark && !light) continue;
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
      values[name] = themeValue(value, theme);
  }
  return values;
}

/** Manifest mappings are authoritative; legacy names remain usable by existing specimens. */
export function applyCanonicalTokenMappings(
  legacy: Record<TokenTheme, TokenValues>,
  manifest: CanonicalTokenSource,
  canonical = '',
): Record<TokenConfiguration, TokenValues> {
  return Object.fromEntries(
    tokenConfigurations.map((configuration) => {
      const theme = configuration.endsWith('.dark') ? 'dark' : 'light';
      const values = applyConfigurationStyles(legacy[theme], canonical, configuration);
      for (const [name, target] of Object.entries(manifest.compatibility ?? {}))
        values[name] = target.startsWith('--') ? `var(${target})` : target;
      for (const [name, token] of Object.entries(manifest.tokens)) {
        if (token.scope === 'local') {
          delete values[name];
          continue;
        }
        const expression = token.mappings?.[configuration] ?? token.value;
        if (expression !== undefined) values[name] = themeValue(expression, theme);
      }
      return [configuration, values];
    }),
  ) as Record<TokenConfiguration, TokenValues>;
}

const legacyTokenValues = parseTokenSources(
  [baseSource, primitiveColorSource, componentSource, runtimeSource, elevationSource].join('\n'),
  fundamentalSource,
  canonicalSource,
);
export const tokenValuesByConfiguration = applyCanonicalTokenMappings(
  legacyTokenValues,
  canonicalManifest,
  canonicalSource,
);
export const tokenValues: Record<TokenTheme, TokenValues> = {
  light: tokenValuesByConfiguration['fundamental.light'],
  dark: tokenValuesByConfiguration['fundamental.dark'],
};
export function tokenNames(
  prefix: string,
  configuration: TokenConfiguration = 'fundamental.light',
): string[] {
  return Object.keys(tokenValuesByConfiguration[configuration]).filter((name) =>
    name.startsWith(prefix),
  );
}
