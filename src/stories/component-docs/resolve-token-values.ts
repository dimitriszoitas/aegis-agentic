import type { ComponentMetadata } from './types';
import { expandVariables, type TokenDeclaration } from './token-inventory';

export interface ResolvedTokenValue {
  value: string;
  context: string;
}
export type ResolvedTokenValues = Record<string, ResolvedTokenValue[]>;

/** Resolve declarations without mounting a component or opening its portals. */
export function resolveTokenValues(
  meta: ComponentMetadata,
  mode: number,
  document: Document,
): ResolvedTokenValues {
  const probe = document.createElement('div');
  const dark = mode % 2 === 1;
  const layout = mode < 2 ? 'fundamental' : 'fundamental-floating';
  probe.className = dark ? 'dark' : 'aegis-theme-light';
  probe.setAttribute('data-layout-theme', layout);
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;color-scheme:${dark ? 'dark' : 'light'};`;
  const sample = document.createElement('span');
  probe.append(sample);
  document.body.append(probe);
  const view = document.defaultView!;
  const computed = view.getComputedStyle(probe);
  const globalValues = new Map<string, string>();
  const globalValue = (name: string) => {
    if (!globalValues.has(name)) globalValues.set(name, computed.getPropertyValue(name).trim());
    return globalValues.get(name) || undefined;
  };
  const applicable = (row: TokenDeclaration) => {
    const layouts = [...row.selector.matchAll(/data-layout-theme=['"]([^'"]+)/g)].map(
      (match) => match[1],
    );
    if (layouts.length && !layouts.includes(layout)) return false;
    return true;
  };
  const definitions = meta.css.filter((row) => row.property.startsWith('--') && applicable(row));
  const local = (row: TokenDeclaration) =>
    /\.(?:aegis-[\w-]+|side-nav|nav-item|surface)\b/.test(row.selector) &&
    !/\.aegis-theme-light/.test(row.selector);
  const localDefinitions = definitions.filter(local);
  const lookup = (name: string, context?: TokenDeclaration): string | undefined => {
    const candidates = localDefinitions.filter((row) => row.property === name);
    if (context) {
      const same = candidates.filter(
        (row) =>
          row.selector === context.selector && row.conditions.join() === context.conditions.join(),
      );
      if (same.length) return same.at(-1)!.value;
      const base = candidates.filter(
        (row) => /^\.[\w-]+$/.test(row.selector) && context.selector.includes(row.selector),
      );
      if (base.length) return base.at(-1)!.value;
    }
    return globalValue(name);
  };
  const normalize = (name: string, value: string) => {
    const compact = value.replace(/\s+/g, ' ').trim();
    if (/var\(|\$\{/.test(compact)) return compact;
    // Resolve theme functions and color mixes in the browser's actual color space.
    const property = /gradient\(/.test(compact)
      ? 'background-image'
      : view.CSS.supports('color', compact) ||
          /color|(?:^|-)fg$|(?:^|-)bg$|ring|intent-(?:on|border|soft)/.test(name)
        ? 'color'
        : /shadow/.test(name)
          ? 'box-shadow'
          : undefined;
    if (!property || /currentcolor/i.test(compact)) return compact;
    sample.style.removeProperty(property);
    sample.style.setProperty(property, compact, 'important');
    if (!sample.style.getPropertyValue(property)) return compact;
    return view.getComputedStyle(sample).getPropertyValue(property).trim() || compact;
  };
  const result: ResolvedTokenValues = {};
  try {
    for (const name of new Set(meta.css.flatMap((row) => row.tokens))) {
      const values: ResolvedTokenValue[] = [];
      const inherited = globalValue(name);
      if (inherited) values.push({ value: normalize(name, inherited), context: 'Theme default' });
      for (const definition of localDefinitions.filter((row) => row.property === name)) {
        const value = expandVariables(definition.value, (token) => lookup(token, definition));
        values.push({
          value: normalize(name, value),
          context: [definition.selector, ...definition.conditions].join(' · '),
        });
      }
      // Runtime custom properties can have an authored fallback at their point of use.
      if (!values.length) {
        for (const row of meta.css.filter(
          (item) => item.tokens.includes(name) && !item.property.startsWith('--'),
        )) {
          const call = row.value.match(new RegExp(`var\\(\\s*${name}\\s*,`));
          if (!call) continue;
          const remaining = row.value.slice(call.index);
          let depth = 0,
            end = 0;
          for (; end < remaining.length; end++) {
            if (remaining[end] === '(') depth++;
            if (remaining[end] === ')' && --depth === 0) break;
          }
          const expanded = expandVariables(remaining.slice(0, end + 1), (token) =>
            lookup(token, row),
          );
          if (!expanded.startsWith(`var(${name}`))
            values.push({
              value: normalize(name, expanded),
              context: 'Default fallback; overridden by component data or props',
            });
        }
      }
      result[name] = [
        ...new Map(values.map((value) => [`${value.value}:${value.context}`, value])).values(),
      ];
      if (!result[name].length) {
        const runtimeDefinition = meta.css.some(
          (row) =>
            /\.[cm]?[jt]sx?$/.test(row.file) &&
            (row.property === name || (row.tokens.includes(name) && /\$\{/.test(row.value))),
        );
        result[name] = [
          {
            value: runtimeDefinition ? 'Runtime or inherited value' : 'No static default',
            context: runtimeDefinition
              ? 'The source contains a dynamic binding; its value depends on the rendered context.'
              : 'No value is available in this theme scope or the authored defaults. This may be provided by a parent, a library, or component props.',
          },
        ];
      }
    }
  } finally {
    probe.remove();
  }
  return result;
}
