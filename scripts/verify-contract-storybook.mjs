/** Focused built-Storybook contract discovery, evidence labeling and source integrity check. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const built = resolve(process.env.STORYBOOK_BUILD_DIR || 'storybook-static');
const output = resolve('artifacts/storybook-contracts');
const catalogue = JSON.parse(await readFile(resolve(built, 'ai/contract-catalogue.json'), 'utf8'));
const index = JSON.parse(await readFile(resolve(built, 'index.json'), 'utf8'));
for (const id of ['aegis-contract-catalogue--docs', 'aegis-mcp-integration--docs'])
  assert(index.entries[id], `Missing built Storybook route ${id}`);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(built, `.${pathname === '/' ? '/index.html' : pathname}`);
    const fromRoot = relative(built, file);
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot) || !(await stat(file)).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', accept);
});
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 1,
  status: 'running',
  sourceDigest: catalogue.sourceDigest,
  coverage: catalogue.coverage,
  checks: [],
  browserErrors: [],
  accessibility: [],
  presentation: [],
  screenshots: [],
  limits: [
    'Focused Chromium checks of catalogue, one complete schema-2 requirement list, three component Contract tabs, and MCP documentation. Source hashes establish provenance only; evidence labels do not establish current execution or approval.',
  ],
};
const passed = (message) => {
  report.checks.push(message);
  console.log(`PASS ${message}`);
};
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  // Keep clipboard completion asynchronous on fast local browsers too. The native write
  // still executes; this reproduces the slower CI schedule that exposed an eager read.
  await context.addInitScript(() => {
    const writeText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text) => {
      await new Promise((accept) => setTimeout(accept, 150));
      return writeText(text);
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.browserErrors.push(error.message));
  const docs = page.frameLocator('#storybook-preview-iframe');
  const catalogueView = docs.locator('.contract-catalogue');
  const copyAndAssert = async (scope, label, expected) => {
    await scope.getByRole('button', { name: label, exact: true }).click();
    await expect(scope.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  };
  const search = catalogueView.getByRole('searchbox', { name: 'Search contracts', exact: true });
  const openCatalogue = () => page.goto(`${base}/?path=/docs/aegis-contract-catalogue--docs`);
  const choose = async (name, value) => {
    await catalogueView.getByRole('combobox', { name, exact: true }).click();
    await docs.getByRole('option', { name: value, exact: true }).click();
  };
  const screenshot = async (name) => {
    await page.screenshot({ path: resolve(output, `${name}.png`) });
    report.screenshots.push(`${name}.png`);
  };
  const setMode = async (mode) => {
    const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true });
    const checked = String(mode === 'dark');
    if ((await toggle.getAttribute('aria-checked')) !== checked) await toggle.click();
    const root = docs.locator('html');
    const assertMode = async () => {
      await expect(toggle).toHaveAttribute('aria-checked', checked);
      await expect(root).toHaveAttribute('data-theme', mode);
      await expect(root).toHaveAttribute('data-aegis-docs-theme', mode);
      await expect(root).toHaveCSS('color-scheme', mode);
    };
    await assertMode();
    await root.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((accept) => requestAnimationFrame(() => requestAnimationFrame(accept)));
    });
    await assertMode();
    report.presentation.push({
      mode,
      switchChecked: await toggle.getAttribute('aria-checked'),
      ...(await root.evaluate((element) => ({
        theme: element.getAttribute('data-theme'),
        docsTheme: element.getAttribute('data-aegis-docs-theme'),
        colorScheme: getComputedStyle(element).colorScheme,
        bodyBackground: getComputedStyle(document.body).backgroundColor,
      }))),
    });
  };
  const expectedStatus = (count, protocols = false) =>
    `${count} ${protocols ? 'system protocols' : 'component and pattern entries'} match the current filters.`;
  const findEntry = (id) => {
    const entry = catalogue.entries.find((item) => item.id === id);
    assert(entry, `Missing fixture ${id}`);
    return entry;
  };
  const assertCoverageFits = async () => {
    const cell = catalogueView.locator('td[data-column-id="coverage"]');
    await expect(cell).toHaveCount(1);
    await expect(cell.getByText('Authored behavior', { exact: true })).toBeVisible();
    const geometry = await cell.evaluate((element) => {
      const tag = element.querySelector('.tag');
      if (!tag) return null;
      const cellBounds = element.getBoundingClientRect();
      const tagBounds = tag.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        cellLeft: cellBounds.left + parseFloat(style.paddingLeft),
        cellRight: cellBounds.right - parseFloat(style.paddingRight),
        tagLeft: tagBounds.left,
        tagRight: tagBounds.right,
        tagOverflow: tag.scrollWidth - tag.clientWidth,
      };
    });
    assert(
      geometry &&
        geometry.tagLeft >= geometry.cellLeft - 1 &&
        geometry.tagRight <= geometry.cellRight + 1 &&
        geometry.tagOverflow <= 1,
      `The complete coverage Tag must fit its cell: ${JSON.stringify(geometry)}`,
    );
  };

  await openCatalogue();
  await expect(
    catalogueView.getByRole('heading', { name: 'Contract catalogue', exact: true }),
  ).toBeVisible();
  const componentEntries = catalogue.entries.filter((entry) => entry.kind !== 'protocol');
  assert.equal(
    catalogue.entries.filter((entry) => entry.api).length,
    catalogue.coverage.apiFamilies,
  );
  assert(
    catalogue.coverage.apiFamilies >= 103,
    'All existing API families must remain discoverable',
  );
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(
    expectedStatus(componentEntries.length),
  );
  await choose('Contract coverage', 'Authored behavior');
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(
    expectedStatus(catalogue.coverage.authoredComponentPatternContracts),
  );
  await choose('Contract coverage', 'API reference only');
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(
    expectedStatus(catalogue.coverage.apiFamiliesWithoutAuthoredBehavior),
  );
  await search.fill('not-a-contract-zzzz');
  await expect(
    catalogueView.getByRole('heading', { name: 'No contracts found', exact: true }),
  ).toBeVisible();
  await catalogueView.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(
    expectedStatus(componentEntries.length),
  );
  passed(
    'All API families and authored-only entries are discoverable; coverage filters, empty results and reset report exact counts.',
  );

  const avatar = findEntry('components-people-avatar');
  assert.equal(avatar.contract.id, 'avatar', 'Avatar now has authored behavior coverage');
  assert.equal(avatar.coverage.apiDocumented, true);
  assert.equal(avatar.coverage.behaviorAuthored, true);
  await search.fill(avatar.id);
  await catalogueView
    .getByRole('button', { name: `Open ${avatar.name} contract`, exact: true })
    .click();
  let detail = catalogueView.getByRole('region', {
    name: `${avatar.name} contract details`,
    exact: true,
  });
  await expect(
    detail.getByRole('heading', { name: 'Declared requirements', exact: true }),
  ).toBeVisible();
  await expect(detail.getByRole('link', { name: /^Open API reference/ })).toHaveAttribute(
    'href',
    avatar.api.url,
  );
  await detail.getByRole('button', { name: 'Load API JSON to copy', exact: true }).click();
  const expectedApi = await readFile(resolve(built, avatar.api.url.replace(/^\.\//, '')), 'utf8');
  await copyAndAssert(detail, 'Copy API JSON', expectedApi);
  await expect(detail.locator('[data-intent="success"]')).toHaveCount(0);
  passed(
    'A newly covered family displays authored requirements and copies the exact served API JSON without a success/certification badge.',
  );

  const layout = findEntry('patterns-pagelayout');
  await search.fill(layout.id);
  await catalogueView
    .getByRole('button', { name: `Open ${layout.name} contract`, exact: true })
    .click();
  detail = catalogueView.getByRole('region', {
    name: `${layout.name} contract details`,
    exact: true,
  });
  await expect(
    detail.getByRole('heading', { name: 'Declared requirements', exact: true }),
  ).toBeVisible();
  await expect(
    detail.getByText(
      'Use the same shared PageHeader implementation through every PageLayout recipe.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    detail.getByRole('heading', { name: 'Verification and evidence', exact: true }),
  ).toBeVisible();
  const importBoxes = [];
  for (const importPath of layout.importPaths) {
    const path = detail.locator('code').and(detail.getByText(importPath, { exact: true }));
    await expect(path).toBeVisible();
    importBoxes.push(await path.boundingBox());
  }
  for (let i = 1; i < importBoxes.length; i += 1) {
    assert(
      importBoxes[i] &&
        importBoxes[i - 1] &&
        importBoxes[i].y >= importBoxes[i - 1].y + importBoxes[i - 1].height,
      'Public import paths must appear on separate readable lines',
    );
  }
  await copyAndAssert(detail, 'Copy contract JSON', layout.contract.raw);
  const downloadPromise = page.waitForEvent('download');
  await detail.getByRole('link', { name: 'Download contract JSON', exact: true }).click();
  const download = await downloadPromise;
  assert.equal(await readFile(await download.path(), 'utf8'), layout.contract.raw);
  await catalogueView
    .getByRole('button', { name: `Open ${layout.name} contract`, exact: true })
    .click();
  await expect(catalogueView.locator('.contract-selection')).toBeFocused();
  assert.equal(new URL(page.url()).searchParams.get('contract'), layout.id);
  await screenshot('authored-contract');
  passed(
    'Authored requirements remain separate from verification, raw copy/download preserve canonical bytes, and repeated selection restores detail focus.',
  );

  const grid = findEntry('components-data-datagrid');
  const gridContract = grid.contract;
  assert(gridContract, 'DataGrid must have its new authored contract');
  assert.equal(gridContract.document.schemaVersion, 2);
  assert.equal(gridContract.document.verification, 'not-certified-by-this-contract');
  const canonicalGridSource = await readFile(resolve(gridContract.source.path), 'utf8');
  assert.equal(
    gridContract.raw,
    canonicalGridSource,
    'Built raw contract matches canonical source',
  );
  assert.deepEqual(JSON.parse(canonicalGridSource), gridContract.document);
  assert.equal(
    createHash('sha256').update(canonicalGridSource).digest('hex'),
    gridContract.source.sha256,
  );
  const requirements = gridContract.document.requirements;
  assert(Array.isArray(requirements) && requirements.length > 0);
  assert.deepEqual(
    new Set(requirements.map((requirement) => requirement.kind)),
    new Set(['component', 'host', 'design']),
    'The fixture covers each responsibility kind',
  );
  const labels = {
    component: 'Component responsibility',
    host: 'Caller responsibility',
    design: 'Design constraint',
  };
  const expectedIds = requirements.map(
    (requirement) => `requirement-${gridContract.id}-${requirement.id}`,
  );
  assert.equal(new Set(expectedIds).size, requirements.length);
  await search.fill(grid.id);
  await catalogueView
    .getByRole('button', { name: `Open ${grid.name} contract`, exact: true })
    .click();
  detail = catalogueView.getByRole('region', {
    name: `${grid.name} contract details`,
    exact: true,
  });
  const requirementRows = detail.locator('[data-contract-requirements] > ul > li');
  await expect(requirementRows).toHaveCount(requirements.length);
  assert.deepEqual(
    await requirementRows.evaluateAll((nodes) => nodes.map((node) => node.id)),
    expectedIds,
  );
  const checkedSources = new Set();
  for (const requirement of requirements) {
    const row = detail.locator(`#requirement-${gridContract.id}-${requirement.id}`);
    await expect(row.getByText(labels[requirement.kind], { exact: true })).toBeVisible();
    await expect(
      row.locator('code').and(row.getByText(requirement.id, { exact: true })),
    ).toBeVisible();
    await expect(row.getByText(requirement.statement, { exact: true })).toBeVisible();
    const sources = row.locator('details');
    await expect(sources).not.toHaveAttribute('open', '');
    await sources.locator('summary').click();
    await expect(sources).toHaveAttribute('open', '');
    await expect(sources.locator('li')).toHaveCount(requirement.sources.length);
    for (const path of requirement.sources) {
      const reference = gridContract.references.find((item) => item.path === path);
      assert(reference, `Missing generated source hash for ${requirement.id}: ${path}`);
      if (!checkedSources.has(path)) {
        const bytes = await readFile(resolve(path));
        assert.equal(
          createHash('sha256').update(bytes).digest('hex'),
          reference.sha256,
          `Generated requirement source hash must match ${path}`,
        );
        checkedSources.add(path);
      }
      const source = sources.locator('li').filter({ hasText: path });
      await expect(source).toHaveCount(1);
      await expect(source.getByText(path, { exact: true })).toBeVisible();
      await expect(source.locator(`code[title="${reference.sha256}"]`)).toHaveText(
        `${reference.sha256.slice(0, 16)}…`,
      );
    }
  }
  await expect(detail.getByText('not-certified-by-this-contract', { exact: true })).toBeVisible();
  await expect(detail.locator('[data-intent="success"]')).toHaveCount(0);
  await copyAndAssert(detail, 'Copy contract JSON', canonicalGridSource);
  const gridDownloadPromise = page.waitForEvent('download');
  await detail.getByRole('link', { name: 'Download contract JSON', exact: true }).click();
  const gridDownload = await gridDownloadPromise;
  assert.equal(await readFile(await gridDownload.path(), 'utf8'), canonicalGridSource);
  await expect.poll(() => new URL(page.url()).searchParams.get('contract')).toBe(grid.id);
  await page.reload();
  await expect(requirementRows).toHaveCount(requirements.length);
  assert.deepEqual(
    await requirementRows.evaluateAll((nodes) => nodes.map((node) => node.id)),
    expectedIds,
  );
  await requirementRows.first().scrollIntoViewIfNeeded();
  await screenshot('schema-two-requirements');
  passed(
    'DataGrid schema-2 requirements preserve stable IDs, distinguish component/caller/design responsibility, expose matching source paths and hashes, and copy/download canonical source bytes without certification claims.',
  );

  const token = findEntry('token-input');
  await search.fill(token.id);
  await choose('Contract coverage', 'Linked evidence');
  await catalogueView
    .getByRole('button', { name: `Open ${token.name} contract`, exact: true })
    .click();
  detail = catalogueView.getByRole('region', {
    name: `${token.name} contract details`,
    exact: true,
  });
  // Schema-2 requirements may cite the same historical file. Check its reported
  // result specifically in the evidence section, separate from source citations.
  const tokenVerification = detail.getByRole('region', {
    name: 'Verification and evidence',
    exact: true,
  });
  for (const evidence of token.evidence) {
    await expect(
      tokenVerification.getByText(
        `Reported status: ${evidence.reportedStatus ?? 'No status reported'}`,
        {
          exact: true,
        },
      ),
    ).toBeVisible();
    await expect(tokenVerification.getByText(evidence.path, { exact: true })).toBeVisible();
    const label =
      evidence.sourceMatch === 'mismatch'
        ? 'Mismatch — this report does not match the declared current source.'
        : evidence.sourceMatch === 'matches-declared-source-hashes'
          ? 'Matches declared source hashes; checks were not rerun.'
          : 'Not assessed.';
    await expect(
      tokenVerification.getByText(`Source comparison: ${label}`, { exact: true }),
    ).toBeVisible();
  }
  await expect(detail.locator('[data-intent="success"]')).toHaveCount(0);
  passed(
    'Authored-only TokenInput is searchable; reported evidence status and source comparison are both visible and do not become verified badges.',
  );

  await search.fill('');
  await catalogueView.getByRole('tab', { name: 'System protocols', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('contract'), null);
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(
    expectedStatus(catalogue.coverage.systemProtocolContracts, true),
  );
  await expect(
    catalogueView.getByRole('combobox', { name: 'Contract coverage', exact: true }),
  ).toHaveCount(0);
  const protocol = findEntry('infrastructure-api');
  await catalogueView
    .getByRole('button', { name: `Open ${protocol.name} contract`, exact: true })
    .click();
  await expect(
    catalogueView.getByRole('region', { name: `${protocol.name} contract details`, exact: true }),
  ).toBeVisible();
  await catalogueView.getByRole('tab', { name: 'Components and patterns', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('contract'), null);
  await page.reload();
  await expect(catalogueView.locator('.contract-selection')).toHaveCount(0);
  passed(
    'System protocols are separate from component coverage; changing sections clears selection and its URL so refresh cannot resurrect it.',
  );

  await search.fill(layout.id);
  await choose('Contract coverage', 'Authored behavior');
  await choose('Contract kind', 'Patterns');
  await expect(catalogueView.locator('p[role="status"]')).toHaveText(expectedStatus(1));
  await expect(
    catalogueView.getByRole('button', { name: `Open ${layout.name} contract`, exact: true }),
  ).toBeVisible();
  await setMode('light');
  const before = await search.boundingBox();
  await setMode('dark');
  await expect(search).toHaveValue(layout.id);
  await expect(
    catalogueView.getByRole('combobox', { name: 'Contract kind', exact: true }),
  ).toHaveText('Patterns');
  await assertCoverageFits();
  const after = await search.boundingBox();
  assert(
    before &&
      after &&
      Math.abs(before.width - after.width) < 1 &&
      Math.abs(before.height - after.height) < 1,
    'Mode change must preserve filter geometry',
  );
  await screenshot('catalogue-dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(search).toHaveValue(layout.id);
  await expect
    .poll(() =>
      catalogueView.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await assertCoverageFits();
  await screenshot('catalogue-narrow');
  await page.setViewportSize({ width: 1440, height: 1050 });
  await setMode('light');
  await expect(search).toHaveValue(layout.id);
  await expect(
    catalogueView.getByRole('combobox', { name: 'Contract kind', exact: true }),
  ).toHaveText('Patterns');
  await assertCoverageFits();
  await screenshot('catalogue-light');
  const accessibility = await new AxeBuilder({ page })
    .include('#storybook-preview-iframe')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    scope: 'filtered catalogue',
    violations: accessibility.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
  });
  assert.equal(accessibility.violations.length, 0, JSON.stringify(report.accessibility));
  passed(
    'Search/filter state and geometry survive an asserted light/dark/light roundtrip; the coverage Tag fits its cell, the narrow page avoids document overflow, and the populated catalogue passes the focused accessibility scan.',
  );

  for (const [entry, path, missing] of [
    [layout, 'patterns-page-structure-pagelayout-overview--docs', false],
    [grid, 'components-data-display-datagrid-overview--docs', false],
    [avatar, 'components-data-display-avatar-overview--docs', false],
  ]) {
    const docsEntry = Object.values(index.entries).find(
      (item) => item.tags?.includes('aegis-component-hub') && item.title.endsWith(`/${entry.name}`),
    );
    assert(docsEntry, `No component hub for ${entry.name}`);
    await page.goto(`${base}/?path=/docs/${docsEntry.id || path}&docsTab=contract`);
    const hub = docs.locator('.component-docs');
    await expect(hub.getByRole('tab', { name: 'Contract', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const family = hub.getByRole('region', { name: `${entry.name} contract details`, exact: true });
    await expect(
      family.getByRole('heading', {
        name: missing ? 'No authored behavioral contract' : 'Declared requirements',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      hub.getByRole('link', { name: 'Browse the contract catalogue', exact: true }),
    ).toHaveAttribute('href', new RegExp(`contract=${entry.id}$`));
    await page.reload();
    await expect(hub.getByRole('tab', { name: 'Contract', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    if (entry === grid) {
      const rows = family.locator('[data-contract-requirements] > ul > li');
      await expect(rows).toHaveCount(requirements.length);
      assert.deepEqual(
        await rows.evaluateAll((nodes) => nodes.map((node) => node.id)),
        expectedIds,
      );
    }
  }
  passed(
    'Per-family Contract tabs render the same authored coverage and preserve their direct route on refresh.',
  );

  await page.goto(`${base}/?path=/docs/aegis-mcp-integration--docs`);
  const mcp = docs.locator('.contract-mcp');
  await expect(mcp.getByRole('heading', { name: 'MCP integration', exact: true })).toBeVisible();
  await copyAndAssert(mcp, 'Copy MCP documentation', await readFile('docs/MCP.md', 'utf8'));
  await screenshot('mcp-integration');
  passed('MCP integration renders from docs/MCP.md and copies its exact canonical source.');
  assert.deepEqual(report.browserErrors, [], 'No browser page errors');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack || error);
  const failedPage = browser?.contexts()[0]?.pages()[0];
  if (failedPage) {
    await failedPage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
    report.screenshots.push('failure.png');
  }
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((accept) => server.close(accept));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
