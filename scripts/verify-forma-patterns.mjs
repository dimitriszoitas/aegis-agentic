import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const policy = JSON.parse(await readFile('src/product/pattern-policy.json', 'utf8'));
const base = (process.env.FORMA_URL || 'http://127.0.0.1:4176/?view=product').split('#')[0];
const out = 'artifacts/forma-patterns';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
const report = {
  revision: policy.revision,
  comparisons: [],
  checks: [],
  violations: [],
  errors: [],
};
page.on('pageerror', (e) => report.errors.push(e.message));
const near = (a, b, message) => assert(Math.abs(a - b) < 1, `${message}: ${a} vs ${b}`);
try {
  for (const width of [1512, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const mode of policy.mode.supported) {
      await page.goto(`${base}#dashboard`);
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      const theme = await page.locator('html').getAttribute('data-theme');
      if (theme !== mode)
        await page.getByRole('button', { name: `Switch to ${mode} mode`, exact: true }).click();
      let reference, searchReference;
      for (const item of policy.pages) {
        await page.goto(`${base}#${item.id}`);
        await expect(
          page.getByRole('heading', { name: item.title, exact: true, level: 1 }),
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
        const measured = await page.evaluate((searchToken) => {
          const h = document.querySelector('h1');
          const header = document.querySelector('.aegis-page-header');
          const main = document.querySelector('.forma-main');
          const search = document.querySelector('.forma-filter-search');
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          const style = getComputedStyle(h);
          return {
            heading: rect(h),
            header: rect(header),
            search: search && rect(search),
            font: [style.fontSize, style.fontWeight, style.lineHeight, style.letterSpacing],
            available: document.querySelector('.forma-page').getBoundingClientRect().width,
            tokenWidth: parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(searchToken),
            ),
            overflow:
              document.documentElement.scrollWidth > innerWidth ||
              main.scrollWidth > main.clientWidth + 1,
          };
        }, policy.patterns.collectionFilters.desktopSearchWidthToken);
        assert(!measured.overflow, `${item.id} must fit the ${width}px viewport`);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.locator('.aegis-page-header .forma-eyebrow').count(), 0);
        if (!reference) reference = measured;
        near(measured.header.x, reference.header.x, 'Header left edge');
        near(measured.header.y, reference.header.y, 'Header top edge');
        near(measured.header.width, reference.header.width, 'Header content width');
        assert.deepEqual(measured.font, reference.font, 'Page titles share typography');
        if (measured.search) {
          near(
            measured.search.width,
            width > 767 ? measured.tokenWidth : measured.available,
            'Search uses the agreed responsive width',
          );
          if (searchReference)
            near(
              measured.search.width,
              searchReference.width,
              'Search widths match across collections',
            );
          searchReference = measured.search;
        }
        if (item.collection === 'grid') {
          await expect(page.getByRole('button', { name: 'Columns', exact: true })).toBeVisible();
          await expect(page.getByRole('group', { name: 'Row density' })).toBeVisible();
        }
        if (item.id === 'dashboard') {
          const axe = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
          report.violations.push(
            ...axe.violations.map((v) => ({
              id: v.id,
              width,
              mode,
              nodes: v.nodes.map((n) => n.target),
            })),
          );
        }
        report.comparisons.push({ page: item.id, width, mode, ...measured });
        await page.screenshot({ path: `${out}/${item.id}-${width}-${mode}.png` });
      }
      console.log(`✓ Consistent headers and filters across five pages, ${mode}, ${width}px`);
    }
  }
  await page.setViewportSize({ width: 1512, height: 1050 });
  await page.goto(`${base}#dashboard`);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const before = await page.getByLabel('Collected revenue', { exact: true }).innerText();
  await page.getByRole('radio', { name: '12 months', exact: true }).check();
  assert.notEqual(
    await page.getByLabel('Collected revenue', { exact: true }).innerText(),
    before,
    'Period updates the dashboard total',
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report', exact: true }).click();
  const file = await pending;
  const csv = await readFile(await file.path(), 'utf8');
  assert.equal(csv.trim().split('\r\n').length, 13, 'Report contains the selected twelve months');
  await page.getByRole('button', { name: 'Manage your people', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Users', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  report.checks.push('Dashboard period, export, quick action and browser history work');
  assert.deepEqual(report.violations, [], 'Dashboard accessibility');
  assert.deepEqual(report.errors, [], 'No browser runtime errors');
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await context.close();
  await browser.close();
}
console.log('Forma project pattern and dashboard checks passed.');
