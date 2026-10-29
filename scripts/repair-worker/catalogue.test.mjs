import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRepairCatalogue,
  scanRepairComponent,
  scanAllRepairComponents,
  selectRepairComponent,
} from './catalogue.mjs';
import { getComponentAudit } from './audits.mjs';
import { assertDensityFixtureFacts } from './catalogue-density-audit.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('every authored UI contract has exact source inventory and bounded or manual repair eligibility', async () => {
  const catalogue = await buildRepairCatalogue(repository);
  const bindings = JSON.parse(
    await readFile(join(repository, 'contracts/catalogue-bindings.json'), 'utf8'),
  );
  assert.deepEqual(
    catalogue.entries.map((entry) => entry.id).sort(),
    bindings.bindings.map((binding) => binding.contractId).sort(),
  );
  assert.equal(catalogue.summary.boundedRepairEligible, 3);
  assert.equal(
    catalogue.summary.authored,
    catalogue.summary.boundedRepairEligible + catalogue.summary.manualReview,
  );
  for (const entry of catalogue.entries) {
    assert.match(entry.sourceDigest, /^[a-f\d]{64}$/);
    assert(entry.sources.every((source) => /^[a-f\d]{64}$/.test(source.sha256)));
    assert(entry.repair.reason);
    assert(!entry.requirements.some((requirement) => requirement.status === 'passed'));
    if (entry.repair.eligible) assert.equal(getComponentAudit(entry.id).id, entry.repair.policyId);
  }
  assert(
    selectRepairComponent(catalogue, 'data-grid').acceptanceScenarios.some(
      (scenario) => scenario.id === 'density-changes-rows',
    ),
  );
  assert(
    selectRepairComponent(catalogue, 'button').repair.reason.includes('has not been authored'),
  );
  for (const invalid of ['__proto__', 'constructor', '../button', 'unknown-component'])
    assert.throws(() => selectRepairComponent(catalogue, invalid));
  assert.throws(() => getComponentAudit('button'), /no trusted automatic repair policy/);
});

test('read-only component scan records source checks without claiming runtime health', async () => {
  const scan = await scanRepairComponent({ repository, componentId: 'data-grid' });
  assert.equal(scan.status, 'scanned');
  assert.equal(scan.browserStatus, 'not-run');
  assert.equal(scan.providerRequests, 0);
  assert(scan.checks.every((check) => check.status === 'passed'));
  assert(scan.component.styles.includes('src/components/data-grid/data-grid.css'));
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'aegis-repair-catalogue-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const write = async (path, value) => {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), typeof value === 'string' ? value : JSON.stringify(value));
  };
  const contract = JSON.parse(
    await readFile(join(repository, 'contracts/agentic/button.json'), 'utf8'),
  );
  for (const requirement of contract.requirements)
    requirement.sources = ['src/components/button/button.tsx', 'src/components/button/button.css'];
  await write('contracts/agentic/button.json', contract);
  await write('contracts/catalogue-bindings.json', {
    schemaVersion: 1,
    bindings: [
      {
        contractId: 'button',
        path: 'contracts/agentic/button.json',
        contractVersion: 1,
        implementation: 'src/components/button/button.tsx',
        apiFamilyId: null,
        exportName: 'Button',
        checks: [],
        evidence: [],
      },
    ],
  });
  await write(
    'schemas/component-contract.schema.json',
    await readFile(join(repository, 'schemas/component-contract.schema.json'), 'utf8'),
  );
  await write('tokens/component-categories.json', {
    categories: { trigger: { prefixes: ['src/components/button/'] } },
  });
  await write('tokens/design-tokens.json', { tokens: {} });
  await write(
    'src/components/button/button.tsx',
    "import './button.css'; export const Button = () => null;",
  );
  await write(
    'src/components/button/button.css',
    '.button { height: 24px; color: var(--semantic-color-content-primary); }',
  );
  return { root, write };
}

test('all-component scan uses one source identity and records each authored component', async () => {
  const report = await scanAllRepairComponents({ repository });
  assert.equal(report.summary.components, report.reports.length);
  assert.equal(
    new Set(report.reports.map((entry) => entry.componentId)).size,
    report.reports.length,
  );
  assert(report.summary.uniqueCssFiles > 0);
  assert(report.summary.declarations > 0);
  assert(report.reports.every((entry) => entry.sourceDigest === report.sourceDigest));
  assert.equal(report.summary.browserExecuted, 0);
  assert.equal(report.summary.providerRequests, 0);
});

test('catalogue scan identifies exact CSS defects but never automatically widens repair authority', async (t) => {
  const { root } = await fixture(t);
  const scan = await scanRepairComponent({ repository: root, componentId: 'button' });
  assert.equal(scan.status, 'needs-review');
  assert.equal(scan.component.repair.eligible, false);
  assert.deepEqual(
    scan.checks[1].failures.map((failure) => failure.code),
    ['fixed-value', 'token-tier-bypass'],
  );
});

test('declared canonical group roles may reference semantics while consumers cannot bypass them', async (t) => {
  const { root, write } = await fixture(t);
  await write('tokens/design-tokens.json', {
    tokens: { '--group-trigger-local': { tier: 'group' } },
  });
  await write(
    'src/components/button/button.css',
    '.button { --group-trigger-local: var(--semantic-color-content-primary); color: var(--group-trigger-local); }',
  );
  assert.equal(
    (await scanRepairComponent({ repository: root, componentId: 'button' })).status,
    'scanned',
  );
  await write(
    'src/components/button/button.css',
    '.button { --group-trigger-invented: var(--semantic-color-content-primary); }',
  );
  assert.equal(
    (await scanRepairComponent({ repository: root, componentId: 'button' })).status,
    'needs-review',
  );
});

test('catalogue rejects stale versions, missing authored bindings and symlinked source', async (t) => {
  const { root, write } = await fixture(t);
  const path = 'contracts/agentic/button.json';
  const contract = JSON.parse(await readFile(join(root, path), 'utf8'));
  await write(path, { ...contract, version: 2 });
  await assert.rejects(buildRepairCatalogue(root), /Stale contract binding/);
  await write(path, contract);
  await write('contracts/agentic/orphan.json', { ...contract, id: 'orphan' });
  await assert.rejects(buildRepairCatalogue(root), /Every authored UI contract/);
  await rm(join(root, 'contracts/agentic/orphan.json'));
  await rm(join(root, 'src/components/button/button.css'));
  await symlink(
    join(repository, 'src/components/button/button.css'),
    join(root, 'src/components/button/button.css'),
  );
  await assert.rejects(buildRepairCatalogue(root), /symlink refused/);
});

function densityFacts() {
  return {
    rowCount: 6,
    headers: ['Name', 'Status'],
    selectedControls: 1,
    selectedDensity: 'default',
    expectedHeight: 48,
    documentOverflow: false,
    rows: ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Radia'].map((name, index) => ({
      label: `record-${index + 1}: ${name}`,
      height: 48,
      cells: [name, index % 2 ? 'Invited' : 'Active'].map((text) => ({
        text,
        visible: true,
        painted: true,
        width: 160,
        height: 20,
        fontSize: 14,
        textWidth: 60,
        textHeight: 16,
      })),
    })),
  };
}

test('trusted density facts reject hiding, blanking, shrinking, wrong tokens and changed data', () => {
  assert.doesNotThrow(() => assertDensityFixtureFacts(densityFacts(), 'default'));
  for (const mutate of [
    (facts) => {
      facts.rows[0].cells[0].painted = false;
    },
    (facts) => {
      facts.rows[0].cells[0].text = '';
    },
    (facts) => {
      facts.rows[0].cells[0].fontSize = 0;
    },
    (facts) => {
      facts.rows[0].height = 1;
    },
    (facts) => {
      facts.expectedHeight = NaN;
    },
    (facts) => {
      facts.rowCount = 0;
    },
    (facts) => {
      facts.rows[0].label = 'replacement';
    },
    (facts) => {
      facts.selectedControls = 0;
    },
    (facts) => {
      facts.documentOverflow = true;
    },
  ]) {
    const facts = densityFacts();
    mutate(facts);
    assert.throws(() => assertDensityFixtureFacts(facts, 'default'));
  }
  const audit = getComponentAudit('data-grid');
  assert.deepEqual(audit.allowedPaths, ['src/components/data-grid/data-grid.css']);
  assert.equal(audit.maxFiles, 1);
  assert.equal(audit.maxAttempts, 2);
  assert.equal(audit.reproduce, audit.verify);
});
