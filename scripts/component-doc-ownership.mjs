/** Source ownership for shared CSS. Token names never decide which component owns a rule. */
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const contextText = ({ name, params }) => normalize(`@${name} ${params}`);
const ruleKey = (file, selector, conditions) =>
  JSON.stringify([file, normalize(selector), conditions.map(normalize)]);

export function createSharedRuleLookup(consumers) {
  const lookup = new Map();
  for (const consumer of consumers) {
    for (const rule of consumer.rules ?? []) {
      const key = ruleKey(consumer.file, rule.selector, (rule.context ?? []).map(contextText));
      const previous = lookup.get(key);
      if (previous && previous.family !== rule.family)
        throw new Error(`Conflicting CSS ownership: ${consumer.file} ${rule.selector}`);
      lookup.set(key, rule);
    }
  }
  return (row) => lookup.get(ruleKey(row.file, row.selector, row.conditions));
}

const classesIn = (selector) => [...selector.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]);

/** A scope's limit is a boundary, never evidence that the foreign component owns its rule. */
function scopeRoot(condition) {
  const start = condition.indexOf('(');
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < condition.length; i++) {
    if (condition[i] === '(') depth++;
    if (condition[i] === ')' && --depth === 0) return condition.slice(start + 1, i);
  }
  return '';
}

function matchesElement(selector, facts) {
  const classes = classesIn(selector);
  if (classes.length) return classes.some((name) => facts.classes.has(name));
  const elements = [...selector.matchAll(/(?:^|[\s>+~,(])([a-z][\w-]*)(?=[\s.#[:>+~),]|$)/g)].map(
    (match) => match[1],
  );
  if (elements.length) return elements.some((name) => facts.nativeElements.has(name));
  return /:scope|\*|^:{1,2}[\w-]/.test(selector);
}

/** `selector` is one comma branch; `rule` was looked up using the complete selector/context. */
export function sharedRuleOwners(row, selector, rule, facts) {
  const scopes = row.conditions.filter((condition) => /^@scope\b/.test(condition));
  return facts
    .filter((fact) => {
      if (rule && fact.ownership.group !== rule.family) return false;
      if (
        scopes.some((scope) => {
          const roots = classesIn(scopeRoot(scope));
          return roots.length > 0 && !roots.some((name) => fact.classes.has(name));
        })
      )
        return false;
      // Unscoped element selectors are ambient page/reset styles, not owned bindings.
      if (!scopes.length && !classesIn(selector).length) return false;
      return matchesElement(selector, fact);
    })
    .map((fact) => fact.ownership);
}
