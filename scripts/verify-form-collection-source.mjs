import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'artifacts/pattern-expansion');
await mkdir(output, { recursive: true });
const server = await createServer({
  root,
  configFile: resolve(root, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
});
const report = {
  status: 'running',
  checks: [],
  errors: [],
  geometry: [],
  screenshots: [],
  limitations: [
    'Focused Chromium fixture, not certification of arbitrary host filters, form controls or remote requests.',
  ],
};
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1050 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/scripts/fixtures/form-collection/index.html`,
  );
  const toolbar = page.getByRole('region', { name: 'Request controls', exact: true });
  const search = toolbar.getByRole('searchbox', { name: 'Search requests' });
  await search.fill('invoice');
  await expect(toolbar.getByRole('status')).toHaveText('2 results');
  await toolbar.getByRole('combobox', { name: 'Request status' }).click();
  await page.getByRole('option', { name: 'Open', exact: true }).click();
  await expect(toolbar.getByRole('status')).toHaveText('1 result');
  await toolbar.getByRole('button', { name: 'Clear criteria' }).click();
  await expect(search).toHaveValue('');
  await expect(toolbar.getByRole('status')).toHaveText('3 results');
  await search.fill('none-matches');
  await expect(toolbar.getByRole('status')).toHaveText('0 results');
  await search.fill('invoice');
  await toolbar.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toBeFocused();
  await expect(toolbar.getByRole('status')).toHaveText('3 results');
  report.checks.push(
    'Host filtering, exact zero/singular/plural counts, clearing and query focus.',
  );

  const group = page.getByRole('group', { name: 'Contact details', exact: true });
  const name = group.getByRole('textbox', { name: /^Name/ });
  await name.fill('Sam Rivera');
  await group.getByRole('button', { name: 'Save contact' }).click();
  await expect(page.getByRole('status', { name: 'Save result' })).toHaveText(
    'Saved locally: Sam Rivera · alex@example.com',
  );
  await expect(page.locator('form')).toHaveCount(1);
  const description = await group.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${description}"]`)).toHaveText(
    'These are local editable fields, with no remote save.',
  );
  report.checks.push(
    'Native fieldset name/description and one host form serialize named values through its own submit handler.',
  );

  await search.fill('invoice');
  await page.getByRole('switch', { name: 'Results busy' }).check();
  await expect(toolbar).toHaveAttribute('aria-busy', 'true');
  await expect(toolbar.getByRole('status')).toHaveText('Updating results…');
  await expect(search).toBeEnabled();
  await page.getByRole('switch', { name: 'Disable controls' }).check();
  await expect(search).toBeDisabled();
  await expect(toolbar.getByRole('combobox', { name: 'Request status' })).toBeDisabled();
  await expect(name).toBeDisabled();
  await expect(group.getByRole('button', { name: 'Save contact' })).toBeDisabled();
  assert.deepEqual(
    await page
      .getByRole('form', { name: 'Contact form' })
      .evaluate((form) => [...new FormData(form).entries()]),
    [],
  );
  await page.getByRole('switch', { name: 'Disable controls' }).uncheck();
  await page.getByRole('switch', { name: 'Results busy' }).uncheck();
  await expect(search).toHaveValue('invoice');
  await expect(name).toHaveValue('Sam Rivera');
  report.checks.push(
    'Busy preserves editable drafts; explicit slot disabling and native fieldset exclusion are verified without assuming portaled inheritance.',
  );

  for (const presentation of ['fundamental', 'fundamental-floating']) {
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 1280, height: 1050 });
      await name.focus();
      await page.evaluate(
        ({ presentation, mode }) => {
          document.documentElement.dataset.layoutTheme = presentation;
          document.documentElement.dataset.theme = mode;
          document.documentElement.classList.toggle('dark', mode === 'dark');
          document.documentElement.style.colorScheme = mode;
        },
        { presentation, mode },
      );
      await page.evaluate(() => document.fonts.ready);
      await expect(name).toBeFocused();
      await expect(name).toHaveValue('Sam Rivera');
      await expect(search).toHaveValue('invoice');
      const geometry = await page.evaluate(() => ({
        searchWidth: document
          .querySelector('.aegis-collection-toolbar-search')
          .getBoundingClientRect().width,
        searchHeight: document
          .querySelector('.aegis-collection-toolbar-search')
          .getBoundingClientRect().height,
        columns: getComputedStyle(
          document.querySelector('[data-form-section-slot="fields"]'),
        ).gridTemplateColumns.split(' ').length,
      }));
      assert.equal(geometry.columns, 2);
      report.geometry.push({ presentation, mode, ...geometry });
      await page.screenshot({ path: resolve(output, `${presentation}-${mode}.png`) });
      report.screenshots.push(`${presentation}-${mode}.png`);
      await page.setViewportSize({ width: 360, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      );
      assert.equal(
        await page
          .locator('[data-form-section-slot="fields"]')
          .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length),
        1,
      );
      await expect(name).toHaveValue('Sam Rivera');
    }
  }
  for (const item of report.geometry) {
    assert(Math.abs(item.searchWidth - report.geometry[0].searchWidth) < 1);
    assert(Math.abs(item.searchHeight - report.geometry[0].searchHeight) < 1);
  }
  await page.screenshot({ path: resolve(output, 'narrow.png') });
  report.screenshots.push('narrow.png');
  report.checks.push(
    'All four presentations preserve search geometry, drafts and focus; narrow containers wrap controls and collapse the two-column field grid.',
  );
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.equal(axe.violations.length, 0, JSON.stringify(axe.violations));
  assert.deepEqual(report.errors, []);
  report.checks.push('Focused fixture has no page errors or automated accessibility violations.');
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await browser?.close();
  await server.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
