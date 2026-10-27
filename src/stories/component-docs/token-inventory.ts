import type { ComponentMetadata } from './types';

export type TokenDeclaration = ComponentMetadata['css'][number];
export const tokenCategories = [
  'Color / fill',
  'Border color',
  'Text color',
  'Icon',
  'Sizing',
  'Spacing',
  'Border radius',
  'Font family',
  'Font size',
  'Font weight',
  'Line height',
  'Letter spacing',
  'Border width',
  'Border style',
  'Elevation',
  'Opacity',
  'Motion',
  'Layering',
  'Position & layout',
  'Other',
] as const;
export type TokenCategory = (typeof tokenCategories)[number];
export interface TokenEntry {
  id: string;
  token: string;
  category: TokenCategory;
  property: string;
  usages: TokenDeclaration[];
  scope: 'owned' | 'nested';
  component: string;
  group?: string;
  ownershipMismatch: boolean;
}

export function classifyToken(row: TokenDeclaration, token: string): TokenCategory {
  const property = row.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const name = `${property} ${token}`;
  if (/animation|transition|duration|easing|delay/.test(name)) return 'Motion';
  if (
    /icon|stroke-width|strokeWidth/.test(name) ||
    (/\b(fill|stroke)\b/.test(property) && /svg|icon/.test(row.selector))
  )
    return 'Icon';
  if (/radius/.test(name)) return 'Border radius';
  if (/line-height/.test(name)) return 'Line height';
  if (/letter-spacing/.test(name)) return 'Letter spacing';
  if (/font-weight|weight-/.test(name)) return 'Font weight';
  if (/font-family|--font-(ui|mono|code)/.test(name)) return 'Font family';
  if (/font-size|--text-|title-.*size|metric-.*size/.test(name)) return 'Font size';
  if (/shadow|elevation/.test(name) || /^(?:backdrop-)?filter$/.test(property)) return 'Elevation';
  if (/opacity/.test(name)) return 'Opacity';
  if (/z-index|layer-/.test(name)) return 'Layering';
  if (/border|outline/.test(property)) {
    if (/color|gradient|ring/.test(token) || /color/.test(property)) return 'Border color';
    if (/style/.test(name)) return 'Border style';
    if (/offset/.test(property)) return 'Spacing';
    return 'Border width';
  }
  if (property === 'color' || /text.*color|color.*text/.test(name)) return 'Text color';
  if (/background|fill|stroke|color|gradient|mix-/.test(name)) return 'Color / fill';
  if (/padding|margin|gap|space-|offset|inset/.test(name)) return 'Spacing';
  if (/width|height|size|basis|aspect|dimension|column|row-height/.test(name)) return 'Sizing';
  if (/transform|translate|rotate|scale|position|grid|flex|top|bottom|left|right/.test(name))
    return 'Position & layout';
  return 'Other';
}

export function buildTokenInventory(meta: ComponentMetadata): TokenEntry[] {
  const entries = new Map<string, TokenEntry>();
  for (const row of meta.css) {
    if (
      row.property.startsWith('--') ||
      ['inherited', 'definition'].includes(row.ownership?.kind ?? '')
    )
      continue;
    const layouts = [...row.selector.matchAll(/data-layout-theme=['"]([^'"]+)/g)].map(
      (match) => match[1],
    );
    if (
      layouts.length &&
      !layouts.some((layout) => ['fundamental', 'fundamental-floating'].includes(layout))
    )
      continue;
    for (const token of row.tokens) {
      const category = classifyToken(row, token);
      const scope = row.ownership?.kind === 'nested' ? 'nested' : 'owned';
      const component = row.ownership?.component ?? meta.name;
      const group = row.ownership?.group ?? (scope === 'owned' ? meta.tokenGroup : undefined);
      const id = `${scope}:${component}:${category}:${row.property}:${token}`;
      const entry = entries.get(id) ?? {
        id,
        token,
        category,
        property: row.property,
        usages: [],
        scope,
        component,
        group,
        ownershipMismatch: Boolean(
          group &&
          /^(?:--group-|--semantic-|--primitive-|--component-)/.test(token) &&
          !token.startsWith(`--group-${group}-`),
        ),
      };
      entry.usages.push(row);
      entries.set(id, entry);
    }
  }
  return [...entries.values()];
}

/** Split only the comma belonging to var(), not nested fallbacks or color functions. */
export function expandVariables(
  value: string,
  lookup: (name: string) => string | undefined,
  seen: string[] = [],
): string {
  const start = value.indexOf('var(');
  if (start < 0 || seen.length > 32) return value;
  let depth = 1,
    end = start + 4,
    comma = -1;
  for (; end < value.length; end++) {
    if (value[end] === '(') depth++;
    else if (value[end] === ')') depth--;
    else if (value[end] === ',' && depth === 1 && comma === -1) comma = end;
    if (depth === 0) break;
  }
  if (depth) return value;
  const name = value.slice(start + 4, comma === -1 ? end : comma).trim();
  const fallback = comma === -1 ? undefined : value.slice(comma + 1, end).trim();
  const replacement = !seen.includes(name) ? lookup(name) : undefined;
  const resolved = replacement || fallback;
  if (resolved === undefined) {
    return value.slice(0, end + 1) + expandVariables(value.slice(end + 1), lookup, seen);
  }
  return (
    value.slice(0, start) +
    expandVariables(resolved, lookup, [...seen, name]) +
    expandVariables(value.slice(end + 1), lookup, seen)
  );
}
