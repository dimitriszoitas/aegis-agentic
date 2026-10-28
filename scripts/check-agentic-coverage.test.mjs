import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCoverage } from './check-agentic-coverage.mjs';
const fixture = () => ({
  manifest: { exports: { './button': { types: './lib-dist/types/components/button/index.d.ts' } } },
  catalogue: {
    entries: [
      {
        apiFamilyId: 'button',
        contract: { document: { schemaVersion: 2 } },
        coverage: { behaviorAuthored: true },
      },
    ],
  },
  bindings: {
    bindings: [{ contractId: 'button', implementation: 'src/components/button/button.tsx' }],
  },
  policy: { aliases: {}, supportEntries: {} },
});
test('new API families cannot silently fall back to API-only coverage', () => {
  const input = fixture();
  input.catalogue.entries.push({
    apiFamilyId: 'new-control',
    contract: null,
    coverage: { behaviorAuthored: false },
  });
  assert.match(evaluateCoverage(input).errors.join('\n'), /new-control/);
});
test('a published UI entry cannot be hidden as support or covered by a similarly named folder', () => {
  const input = fixture();
  input.manifest.exports['./button-extra'] = {
    types: './lib-dist/types/components/button-extra/index.d.ts',
  };
  input.policy.supportEntries['./button-extra'] = 'Pretend this is support';
  assert.match(evaluateCoverage(input).errors.join('\n'), /button-extra/);
});
test('compatibility entries require an explicit source path and existing contract', () => {
  const input = fixture();
  input.manifest.exports['./alias'] = { types: './lib-dist/types/components/alias/index.d.ts' };
  input.policy.aliases['./alias'] = {
    contractId: 'button',
    source: 'src/components/alias/alias.tsx',
    reason: 'Delegates.',
  };
  assert.deepEqual(evaluateCoverage(input).errors, []);
  input.policy.aliases['./alias'].contractId = 'missing';
  assert.match(evaluateCoverage(input).errors.join('\n'), /alias/);
});
test('unknown public support entries require deliberate classification', () => {
  const input = fixture();
  input.manifest.exports['./service'] = { types: './lib-dist/types/package/service.d.ts' };
  assert.match(evaluateCoverage(input).errors.join('\n'), /unclassified/);
});

test('string JavaScript exports cannot bypass authored ownership as assets', () => {
  const input = fixture();
  input.manifest.exports['./new-ui'] = './lib-dist/components/new-ui.js';
  assert.match(evaluateCoverage(input).errors.join('\n'), /Code export requires.*new-ui/);
});

test('authored API and authored-only contracts cannot regress to a shallow legacy shape', () => {
  const input = fixture();
  input.catalogue.entries[0].contract.document.schemaVersion = 1;
  input.catalogue.entries.push({
    id: 'authored-only',
    contract: { document: { schemaVersion: 1 } },
    coverage: { behaviorAuthored: true },
  });
  assert.equal(
    evaluateCoverage(input).errors.filter((error) => error.includes('schema2 ownership')).length,
    2,
  );
});
