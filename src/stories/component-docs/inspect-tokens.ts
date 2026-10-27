import type { ComputedBinding } from './types';
export const tokenModes = [
  'Fundamental · Light',
  'Fundamental · Dark',
  'Floating · Light',
  'Floating · Dark',
] as const;
function tokenNames(value: string) {
  return [...new Set([...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]))];
}
function styleRules(document: Document): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];
  function walk(list: CSSRuleList) {
    for (const rule of Array.from(list)) {
      if (rule instanceof document.defaultView!.CSSStyleRule) {
        if (
          [...rule.style].some((property) => rule.style.getPropertyValue(property).includes('var('))
        )
          rules.push(rule);
      } else if ('cssRules' in rule) {
        const nested = rule as CSSGroupingRule;
        if (
          rule instanceof document.defaultView!.CSSMediaRule &&
          !document.defaultView!.matchMedia(rule.conditionText).matches
        )
          continue;
        walk(nested.cssRules);
      }
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      /* Cross-origin framework sheets cannot expose declaration text. */
    }
  }
  return rules;
}
/** Read real rendered elements, then resolve the same specimen in all four CSS presentations. */
export function inspectTokens(document: Document): ComputedBinding[] {
  const root = document.documentElement;
  const specimen = document.querySelector('#storybook-root');
  if (!specimen) return [];
  const elements = Array.from(specimen.querySelectorAll<HTMLElement>('*')).filter(
    (element) =>
      !['SCRIPT', 'STYLE', 'PATH', 'DEFS', 'LINEARGRADIENT', 'STOP'].includes(
        element.tagName.toUpperCase(),
      ),
  );
  // Include portaled controls belonging to this isolated story.
  for (const element of Array.from(
    document.body.querySelectorAll<HTMLElement>(
      '[role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]',
    ),
  )) {
    if (!specimen.contains(element)) {
      elements.push(element, ...Array.from(element.querySelectorAll<HTMLElement>('*')));
    }
  }
  const originalTheme = root.getAttribute('data-theme'),
    originalClass = root.className;
  const layoutRoots = [
    root,
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-layout-theme]')),
  ].filter((element, index, all) => all.indexOf(element) === index);
  const originalLayouts = layoutRoots.map((element) => element.getAttribute('data-layout-theme'));
  const bindings = new Map<string, ComputedBinding>();
  const rules = styleRules(document);
  try {
    for (const [index, mode] of tokenModes.entries()) {
      const dark = index % 2 === 1,
        layout = index < 2 ? 'fundamental' : 'fundamental-floating';
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
      root.setAttribute('data-theme', dark ? 'dark' : 'light');
      for (const element of layoutRoots) element.setAttribute('data-layout-theme', layout);
      for (const element of elements) {
        if (element.closest('[hidden]')) continue;
        const computed = document.defaultView!.getComputedStyle(element);
        if (computed.display === 'none') continue;
        const name =
          element.tagName.toLowerCase() +
          (typeof element.className === 'string' && element.className
            ? `.${element.className.trim().split(/\s+/).slice(0, 2).join('.')}`
            : '');
        const state = Array.from(element.attributes)
          .filter(
            (attribute) =>
              attribute.name.startsWith('data-') ||
              ['aria-expanded', 'aria-checked', 'disabled'].includes(attribute.name),
          )
          .map((attribute) => `[${attribute.name}=${attribute.value}]`)
          .join('');
        for (const rule of [
          ...rules,
          ...(element.style?.length
            ? [{ selectorText: '[inline style]', style: element.style } as CSSStyleRule]
            : []),
        ]) {
          // Pseudo-elements have their own computed style and are inspected separately below.
          const pseudo = rule.selectorText.match(/::(before|after)/)?.[0];
          const selector = rule.selectorText.replace(/::(?:before|after)/g, '');
          let matches = false;
          try {
            matches = selector === '[inline style]' || element.matches(selector);
          } catch {
            /* A browser-specific selector can be unavailable. */
          }
          if (!matches) continue;
          const style = pseudo ? document.defaultView!.getComputedStyle(element, pseudo) : computed;
          for (const property of Array.from(rule.style)) {
            const declaration = rule.style.getPropertyValue(property),
              tokens = tokenNames(declaration);
            if (!tokens.length) continue;
            const id = [name, state, pseudo, rule.selectorText, property, declaration].join('|');
            let binding = bindings.get(id);
            if (!binding) {
              binding = {
                id,
                element: name + state + (pseudo ?? ''),
                selector: rule.selectorText,
                property,
                declaration,
                tokens,
                values: {},
                tokenValues: {},
              };
              bindings.set(id, binding);
            }
            binding.values[mode] = style.getPropertyValue(property).trim() || 'Not set';
            binding.tokenValues[mode] = Object.fromEntries(
              tokens.map((token) => [token, style.getPropertyValue(token).trim() || 'Not set']),
            );
          }
        }
      }
    }
  } finally {
    root.className = originalClass;
    if (originalTheme === null) root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', originalTheme);
    layoutRoots.forEach((element, index) => {
      const value = originalLayouts[index];
      if (value === null) element.removeAttribute('data-layout-theme');
      else element.setAttribute('data-layout-theme', value);
    });
  }
  return [...bindings.values()].sort(
    (a, b) => a.element.localeCompare(b.element) || a.property.localeCompare(b.property),
  );
}
