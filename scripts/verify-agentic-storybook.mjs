/** Focused smoke of the built public layout and canonical Agentic skill documentation. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, relative, isAbsolute } from 'node:path';
import { chromium, expect } from '@playwright/test';

const built = resolve(process.env.STORYBOOK_BUILD_DIR || 'storybook-static');
const output = resolve('artifacts/storybook-agentic');
const index = JSON.parse(await readFile(resolve(built, 'index.json'), 'utf8'));
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
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
  build: built,
  indexSha256: createHash('sha256').update(JSON.stringify(index)).digest('hex'),
  status: 'running',
  checks: [],
  browserErrors: [],
  screenshots: [],
  limits: [
    'Focused Chromium smoke of the built layout and two skill tabs; not an exhaustive catalogue or accessibility audit.',
  ],
};
let browser;
const passed = (message) => {
  report.checks.push(message);
  console.log(`PASS ${message}`);
};
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1360, height: 1000 },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.browserErrors.push(error.message));
  const screenshot = async (name) => {
    const filename = `${name}.png`;
    await page.screenshot({ path: resolve(output, filename) });
    report.screenshots.push(filename);
  };
  const story = async (name) => {
    const id = `patterns-pagelayout--${name}`;
    assert(index.entries[id], `Built story missing: ${id}`);
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story&globals=theme:dark`);
    await expect(page.locator('.aegis-page-layout')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  };
  await story('overview');
  await expect(
    page.getByRole('heading', { name: 'Workspace settings', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.aegis-reading-column')).toHaveAttribute(
    'data-measure',
    'comfortable',
  );
  const draft = page.getByRole('textbox', { name: 'Workspace name', exact: true });
  await draft.fill('Storybook verification draft');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Changes saved locally.');
  await expect(draft).toHaveValue('Storybook verification draft');
  await screenshot('layout-overview');
  passed(
    'Built settings overview renders the shared heading, comfortable measure and working local edit/save flow.',
  );

  await story('detail');
  await expect(
    page.getByRole('complementary', { name: 'Record context', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const main = await page.locator('[data-page-slot="main"]').boundingBox();
  const aside = await page.locator('[data-page-slot="aside"]').boundingBox();
  assert(
    main && aside && aside.y >= main.y + main.height,
    'Narrow detail must stack main before aside',
  );
  await screenshot('layout-detail-narrow');
  passed(
    'Built detail exposes its named aside and stacks main before aside in a narrow container.',
  );

  await page.setViewportSize({ width: 1360, height: 1000 });
  await story('dashboard');
  const grid = page.locator('.aegis-content-grid');
  await expect(grid).toHaveAttribute('data-max-columns', '4');
  await expect(grid.locator(':scope > .aegis-content-grid-item')).toHaveCount(4);
  await expect(page.getByText('Open requests', { exact: true })).toBeVisible();
  await screenshot('layout-dashboard');
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await grid
    .locator(':scope > .aegis-content-grid-item')
    .evaluateAll((items) =>
      items.map((item) => ({
        x: item.getBoundingClientRect().x,
        y: item.getBoundingClientRect().y,
      })),
    );
  assert(
    bounds.every((item) => Math.abs(item.x - bounds[0].x) < 1),
    'Narrow dashboard must collapse to one column',
  );
  assert(
    bounds.every((item, i) => i === 0 || item.y > bounds[i - 1].y),
    'Grid items retain order',
  );
  passed(
    'Built dashboard renders four independent cards and collapses them in order without a forced four-column layout.',
  );

  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(
    `${base}/?path=/docs/patterns-page-structure-pagelayout-overview--docs&docsTab=guidelines&docsSection=api`,
  );
  const docs = page.frameLocator('#storybook-preview-iframe');
  const hub = docs.locator('.component-docs');
  await expect(hub.getByRole('heading', { name: 'PageLayout', exact: true })).toBeVisible();
  const api = hub.locator('[data-guideline-section="api"]');
  await expect(
    api.getByRole('columnheader', { name: 'Required / default', exact: true }),
  ).toBeVisible();
  const rows = await api.locator('tbody tr').evaluateAll((nodes) =>
    nodes.map((row) => ({
      component: row.querySelector('th small')?.textContent,
      name: row.querySelector('th code')?.textContent,
      requirement: row.querySelectorAll('td')[1]?.textContent,
    })),
  );
  for (const name of ['title', 'archetype', 'children'])
    assert(
      rows.some(
        (row) =>
          row.component === 'PageLayout' &&
          row.name === name &&
          row.requirement.startsWith('Required'),
      ),
      `Missing required PageLayout.${name}`,
    );
  assert(
    rows.some(
      (row) =>
        row.component === 'ReadingColumn' &&
        row.name === 'measure' &&
        row.requirement.includes('comfortable'),
    ),
  );
  assert(
    rows.some(
      (row) =>
        row.component === 'ContentGrid' &&
        row.name === 'maxColumns' &&
        row.requirement.includes('4'),
    ),
  );
  assert(
    !rows.some((row) => row.component === 'Playground' || row.name?.startsWith('show')),
    'Demo controls must not leak into public API',
  );
  await screenshot('layout-public-api');
  passed(
    'Rendered public API includes required title/archetype/children and real subcomponent defaults, with no Playground/show controls.',
  );

  await page.goto(`${base}/?path=/docs/agentic-skills-layout-creation--docs`);
  const skills = docs.locator('.agentic-skill-page');
  const source = async (file) => (await readFile(file, 'utf8')).trim();
  const design = await source('skills/references/design-contract.md');
  const agentic = await source('skills/references/agentic-contract.md');
  const composition = await source('skills/references/page-composition.md');
  const policy = await source('skills/references/pattern-policy.md');
  for (const [id, title, references] of [
    ['create-layout', 'Layout Creation', [design, agentic, composition, policy]],
    ['build-ui', 'Build UI', [agentic, design, composition, policy]],
  ]) {
    await skills.getByRole('tab', { name: title, exact: true }).click();
    await expect(skills.getByRole('tab', { name: title, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const compositionSection = skills.locator('#page-composition');
    const policySection = skills.locator('#project-pattern-policy');
    await expect(
      compositionSection.getByRole('heading', { name: 'Constructing a page', exact: true }),
    ).toBeVisible();
    await expect(
      policySection.getByRole('heading', { name: 'Project pattern policy', exact: true }),
    ).toBeVisible();
    await expect(compositionSection.locator('.agentic-skill-source-path')).toHaveText(
      'Source: skills/references/page-composition.md',
    );
    await expect(policySection.locator('.agentic-skill-source-path')).toHaveText(
      'Source: skills/references/pattern-policy.md',
    );
    await expect(
      compositionSection.getByRole('columnheader', { name: 'Authority', exact: true }),
    ).toBeVisible();
    await expect(
      compositionSection.getByRole('link', { name: 'product policy', exact: true }),
    ).toHaveAttribute('href', '#project-pattern-policy');
    const expected = [await source(`skills/${id}/SKILL.md`), ...references].join('\n\n') + '\n';
    await skills.getByRole('button', { name: `Copy ${title} instructions`, exact: true }).click();
    await expect(skills.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      expected,
      `${title} copies exact canonical skill and references`,
    );
    await screenshot(`skill-${id}`);
    passed(
      `${title} renders canonical composition/policy sources, a real GFM table and local reference link, and copies their exact combined source.`,
    );
  }
  assert.deepEqual(report.browserErrors, [], 'No browser page errors');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack || error);
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise((accept) => server.close(accept));
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
