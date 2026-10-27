import type { ComponentMetadata } from './types';
import { expandVariables, type TokenDeclaration, type TokenEntry } from './token-inventory';

export const mappingConfigurations = [
  'fundamental.light',
  'fundamental.dark',
  'fundamental-floating.light',
  'fundamental-floating.dark',
] as const;
export type MappingConfiguration = (typeof mappingConfigurations)[number];
export interface MappingManifest {
  tokens: Record<
    string,
    {
      tier: 'primitive' | 'semantic' | 'group';
      value?: string;
      mappings?: Record<string, string>;
      scope?: string;
      family?: string;
    }
  >;
  compatibility?: Record<string, string>;
  dynamicVariables?: { name: string; reason: string }[];
}
export interface MappingNode {
  name: string;
  tier: 'primitive' | 'semantic' | 'group' | 'runtime';
  expression?: string;
  via: string[];
  note?: string;
}
export interface TokenMapping {
  context: string;
  expression?: string;
  nodes: MappingNode[];
  expanded?: string;
  note?: string;
}

/** Select only the current light-dark() branch, preserving all other expression operands. */
export function selectMappingTheme(value: string, dark: boolean): string {
  const start = value.indexOf('light-dark(');
  if (start < 0) return value;
  const content = start + 'light-dark('.length;
  let depth = 1;
  let comma = -1;
  for (let end = content; end < value.length; end++) {
    if (value[end] === '(') depth++;
    else if (value[end] === ')') depth--;
    else if (value[end] === ',' && depth === 1 && comma < 0) comma = end;
    if (depth === 0 && comma >= 0) {
      const selected = dark ? value.slice(comma + 1, end) : value.slice(content, comma);
      return selectMappingTheme(
        value.slice(0, start) + selected.trim() + value.slice(end + 1),
        dark,
      );
    }
  }
  return value;
}

export function mappingDeclarationApplies(
  row: TokenDeclaration,
  configuration: MappingConfiguration,
): boolean {
  const [layout, theme] = configuration.split('.');
  const layouts = [...row.selector.matchAll(/data-layout-theme\s*=\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
  if (layouts.length && !layouts.includes(layout)) return false;
  // A :is() selector may deliberately include both themes; preserve that shared rule.
  const hasDark = /\.dark\b|data-theme\s*=\s*['"]dark['"]/.test(row.selector);
  const hasLight = /\.aegis-theme-light\b|data-theme\s*=\s*['"]light['"]/.test(row.selector);
  if (hasDark && !hasLight && theme !== 'dark') return false;
  if (hasLight && !hasDark && theme !== 'light') return false;
  return true;
}

export function mappingContext(row: TokenDeclaration): string {
  return [row.selector, ...row.conditions].join(' · ');
}

/** Build a source graph, not a flattened fiction: every var() operand keeps its tier and parent. */
export function buildTokenMappings(
  entry: TokenEntry,
  meta: ComponentMetadata,
  manifest: MappingManifest,
  configuration: MappingConfiguration,
): TokenMapping[] {
  const dark = configuration.endsWith('.dark');
  const definitions = meta.css.filter(
    (row) =>
      row.property.startsWith('--') &&
      mappingDeclarationApplies(row, configuration) &&
      !['inherited', 'definition'].includes(row.ownership?.kind ?? '') &&
      (!row.ownership?.component || row.ownership.component === entry.component),
  );
  const tokenValue = (name: string) => {
    const token = manifest.tokens[name];
    if (token?.scope === 'local') return undefined;
    const expression = token?.mappings?.[configuration] ?? token?.value;
    if (expression !== undefined) return selectMappingTheme(expression, dark);
    const alias = manifest.compatibility?.[name];
    return alias?.startsWith('--') ? `var(${alias})` : alias;
  };
  const roots = definitions.filter((row) => row.property === entry.token);
  const rootVariants: {
    context: string;
    expression?: string;
    source?: TokenDeclaration;
    note?: string;
  }[] = roots.length
    ? roots.map((source) => ({ context: mappingContext(source), expression: source.value, source }))
    : [
        {
          context: 'Theme default',
          expression: tokenValue(entry.token),
          note:
            manifest.tokens[entry.token]?.scope === 'local'
              ? 'Local alias: no matching component declaration was extracted for this theme. Its manifest entry is not a runtime default.'
              : undefined,
        },
      ];
  if (!roots.length && !rootVariants[0].expression) {
    // Preserve the exact authored fallback, including nested color/calc functions.
    for (const usage of entry.usages.filter((row) =>
      mappingDeclarationApplies(row, configuration),
    )) {
      const callStart = usage.value.match(new RegExp(`var\\(\\s*${entry.token}\\s*,`));
      if (!callStart || callStart.index === undefined) continue;
      const start = callStart.index;
      let depth = 0;
      let end = start;
      for (; end < usage.value.length; end++) {
        if (usage.value[end] === '(') depth++;
        else if (usage.value[end] === ')' && --depth === 0) break;
      }
      const call = usage.value.slice(start, end + 1);
      const expression = call.slice(call.indexOf(',') + 1, -1).trim();
      rootVariants.push({
        context: `${mappingContext(usage)} · Default fallback`,
        expression,
        source: usage,
        note: 'Fallback only; component data or a parent can override this value.',
      });
    }
    if (rootVariants.length > 1) rootVariants.shift();
  }
  return rootVariants
    .map((variant) => {
      const nodes = new Map<string, MappingNode>();
      const lookup = (name: string): string | undefined => {
        if (name === entry.token) return variant.expression;
        const candidates = definitions.filter((row) => row.property === name);
        const exact =
          variant.source &&
          candidates.filter((row) => mappingContext(row) === mappingContext(variant.source!));
        if (exact?.length) return exact.at(-1)!.value;
        const base =
          variant.source &&
          candidates.filter(
            (row) =>
              /^\.[\w-]+$/.test(row.selector) && variant.source!.selector.includes(row.selector),
          );
        if (base?.length) return base.at(-1)!.value;
        return tokenValue(name);
      };
      const visit = (name: string, via: string, path: string[]) => {
        const previous = nodes.get(name);
        if (previous) {
          if (!previous.via.includes(via)) previous.via.push(via);
          return;
        }
        const token = manifest.tokens[name];
        const raw = lookup(name);
        const expression = raw === undefined ? undefined : selectMappingTheme(raw, dark);
        const node: MappingNode = {
          name,
          tier: token?.tier ?? 'runtime',
          expression,
          via: [via],
          note: path.includes(name)
            ? 'Cyclic reference in source.'
            : expression === undefined
              ? (manifest.dynamicVariables?.find((item) => item.name === name)?.reason ??
                'No static mapping in the canonical manifest or this component.')
              : undefined,
        };
        nodes.set(name, node);
        if (path.includes(name) || expression === undefined) return;
        for (const match of expression.matchAll(/var\(\s*(--[\w-]+)/g))
          visit(match[1], name, [...path, name]);
      };
      const expression =
        variant.expression === undefined ? undefined : selectMappingTheme(variant.expression, dark);
      for (const match of expression?.matchAll(/var\(\s*(--[\w-]+)/g) ?? [])
        visit(match[1], entry.token, [entry.token]);
      return {
        context: variant.context,
        expression,
        nodes: [...nodes.values()],
        note: variant.note,
        expanded:
          expression === undefined
            ? undefined
            : expandVariables(expression, (name) => {
                const raw = lookup(name);
                return raw === undefined ? undefined : selectMappingTheme(raw, dark);
              }),
      };
    })
    .filter(
      (mapping, index, all) =>
        all.findIndex(
          (item) => item.context === mapping.context && item.expression === mapping.expression,
        ) === index,
    );
}
