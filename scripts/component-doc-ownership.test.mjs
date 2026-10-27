import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSharedRuleLookup, sharedRuleOwners } from './component-doc-ownership.mjs';

const triggerScope = '(:is(.aegis-button, .aegis-link)) to (:is(.aegis-icon, .aegis-card))';
const iconScope = '(.aegis-icon) to (.aegis-link)';
const row = (scope, selector = '.sr-only', media = '') => ({
  file: 'src/styles/globals.css',
  selector,
  conditions: [`@scope ${scope}`, ...(media ? [`@media ${media}`] : [])],
  property: 'width',
  value: 'var(--group-trigger-accessibility-width)',
});
const link = {
  ownership: { kind: 'owned', component: 'Link', group: 'trigger' },
  classes: new Set(['aegis-link', 'sr-only']),
  nativeElements: new Set(['a', 'span']),
};
const icon = {
  ownership: { kind: 'nested', component: 'Icon', group: 'iconography' },
  classes: new Set(['aegis-icon', 'sr-only']),
  nativeElements: new Set(['svg', 'path']),
};
const lookup = createSharedRuleLookup([
  {
    file: 'src/styles/globals.css',
    rules: [
      { selector: '.sr-only', family: 'layout', context: [] },
      {
        selector: '.sr-only',
        family: 'trigger',
        context: [{ name: 'scope', params: triggerScope }],
      },
      {
        selector: '.sr-only',
        family: 'iconography',
        context: [{ name: 'scope', params: iconScope }],
      },
      {
        selector: '*, *::before',
        family: 'trigger',
        context: [
          { name: 'scope', params: triggerScope },
          { name: 'media', params: '(prefers-reduced-motion: reduce)' },
        ],
      },
    ],
  },
]);

test('matches the complete selector and ordered scope/media ancestry with formatting normalization', () => {
  const r = row(triggerScope, '* , *::before', '(prefers-reduced-motion: reduce)');
  // Formatting whitespace changes are normalized, but selector punctuation remains exact.
  r.selector = '* , *::before'.replace(' *', '\n *').replace('* ,', '*,');
  assert.equal(lookup(r)?.family, 'trigger');
  assert.equal(lookup({ ...r, conditions: [...r.conditions].reverse() }), undefined);
  assert.equal(lookup(row(iconScope))?.family, 'iconography');
});

test('assigns repeated utility classes only to their declared scope category', () => {
  assert.deepEqual(
    sharedRuleOwners(row(triggerScope), '.sr-only', lookup(row(triggerScope)), [link, icon]),
    [link.ownership],
  );
  assert.deepEqual(
    sharedRuleOwners(row(iconScope), '.sr-only', lookup(row(iconScope)), [link, icon]),
    [icon.ownership],
  );
  const fallback = { ...row(triggerScope), conditions: [] };
  assert.deepEqual(sharedRuleOwners(fallback, '.sr-only', lookup(fallback), [link, icon]), []);
});

test('does not treat classes in a scope limit as ownership roots', () => {
  const r = row('(.aegis-button) to (.aegis-link)');
  assert.deepEqual(sharedRuleOwners(r, '.sr-only', { family: 'trigger' }, [link]), []);
});

test('includes scoped defaults and actual native elements without inventing absent elements', () => {
  assert.deepEqual(
    sharedRuleOwners(row(triggerScope, ':scope:scope *'), ':scope:scope *', { family: 'trigger' }, [
      link,
      icon,
    ]),
    [link.ownership],
  );
  assert.deepEqual(
    sharedRuleOwners(row(triggerScope, 'a'), 'a', { family: 'trigger' }, [link, icon]),
    [link.ownership],
  );
  assert.deepEqual(
    sharedRuleOwners(row(triggerScope, 'svg'), 'svg', { family: 'trigger' }, [link, icon]),
    [],
  );
});

test('keeps a real wrong-token binding in its actual source category', () => {
  const wrong = { ...row(triggerScope), value: 'var(--group-surface-wrong-category)' };
  assert.deepEqual(sharedRuleOwners(wrong, '.sr-only', lookup(wrong), [link]), [link.ownership]);
});
