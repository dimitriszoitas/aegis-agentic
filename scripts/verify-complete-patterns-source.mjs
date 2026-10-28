import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'artifacts/complete-patterns-source');
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
  screenshots: [],
  limitations: [
    'Focused local Chromium workflows; no remote persistence, universal router interception or assistive-technology certification.',
  ],
};
let browser;
let page;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    reducedMotion: 'reduce',
  });
  page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/scripts/fixtures/complete-patterns/index.html`,
  );
  await page.getByRole('button', { name: 'Validate locally' }).click();
  await expect(page.getByRole('region', { name: 'Check the following fields' })).toBeFocused();
  await page.getByRole('link', { name: 'Enter a valid email.' }).click();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeFocused();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('alex@example.com');
  await page.getByRole('button', { name: 'Validate locally' }).click();
  await expect(page.getByRole('region', { name: 'Check the following fields' })).toHaveCount(0);
  report.checks.push(
    'Form errors focus the summary on failed submit, link to the field, and disappear after host correction.',
  );
  const note = page.getByRole('textbox', { name: 'Retained resource note' });
  await note.fill('Retain this draft');
  await page.getByRole('button', { name: 'Refresh locally' }).click();
  await expect(page.getByRole('region', { name: 'Customer resource' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await page.getByRole('button', { name: 'Simulate resource failure' }).click();
  await expect(note).toHaveValue('Retain this draft');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(note).toHaveValue('Retain this draft');
  report.checks.push('Ready/refresh/stale/retry preserve the same editable resource content.');
  const editor = page.getByRole('region', { name: 'Record example' });
  await editor.getByRole('button', { name: 'Edit', exact: true }).click();
  const name = editor.getByRole('textbox', { name: 'Contact name' });
  await name.fill('Sam');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('Local save failed.');
  await expect(name).toHaveValue('Sam');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(editor.getByText('Sam', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Edit', exact: true }).click();
  await name.fill('Local unsaved');
  await editor.getByRole('button', { name: 'Remote change' }).click();
  await expect(name).toHaveValue('Local unsaved');
  await expect(editor.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await editor.getByRole('button', { name: 'Reload latest version', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Reload latest version' })
    .click();
  await expect(name).toHaveValue('Server revision');
  await name.fill('Discard me');
  await editor.getByRole('button', { name: 'Cancel editing' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(name).toHaveValue('Discard me');
  await editor.getByRole('button', { name: 'Cancel editing' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard draft' }).click();
  await expect(editor.getByText('Server revision', { exact: true })).toBeVisible();
  await editor.getByRole('button', { name: 'Delete record', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete record' }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText(
    'Local delete failed.',
  );
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete record' }).click();
  await expect(editor.getByRole('status')).toHaveText('Record deleted.');
  report.checks.push(
    'Record save failure retains drafts, authoritative save resolves, version conflict blocks overwrite, confirmed reload/discard work, delete failure retries.',
  );
  const guard = page.getByRole('region', { name: 'Navigation example' });
  const unsaved = guard.getByRole('textbox', { name: 'Unsaved note' });
  await unsaved.fill('Keep me');
  await guard.getByRole('button', { name: 'Request overview' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Keep editing' }).click();
  await expect(unsaved).toHaveValue('Keep me');
  await guard.getByRole('button', { name: 'Request overview' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard and leave' }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText(
    'Local route failed.',
  );
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard and leave' }).click();
  await expect(guard.getByRole('status')).toContainText('Local route: Overview');
  await unsaved.fill('Another draft');
  await guard.getByRole('button', { name: 'Request twice' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Discard and leave' }).click();
  await expect(guard.getByRole('status')).toHaveText('Local route: First; second request: false');
  report.checks.push(
    'Navigation cancel retains drafts, failed navigation can retry, and concurrent requests cannot replace the confirmed destination.',
  );
  await page.getByRole('link', { name: 'Skip to content' }).click();
  await expect(page.getByRole('main')).toBeFocused();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Customers' })
    .focus();
  await page.setViewportSize({ width: 390, height: 1000 });
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole('dialog', { name: 'Main navigation' })
    .getByRole('button', { name: 'Customers', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(note).toHaveValue('Retain this draft');
  await trigger.click();
  await page
    .getByRole('dialog', { name: 'Main navigation' })
    .getByRole('button', { name: 'Requests', exact: true })
    .focus();
  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Requests', exact: true }),
  ).toBeFocused();
  report.checks.push(
    'Shell skip link, mobile sheet navigation, breakpoint focus handoff and main draft retention work.',
  );
  await editor.getByRole('button', { name: 'Change record' }).click();
  await editor.getByRole('button', { name: 'Edit', exact: true }).click();
  await editor.getByRole('textbox', { name: 'Contact name' }).fill('Draft for review');
  await page.getByRole('button', { name: 'Simulate resource failure' }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Validate locally' }).click();
  for (const layout of ['fundamental', 'fundamental-floating'])
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        ({ layout, mode }) => {
          document.documentElement.dataset.layoutTheme = layout;
          document.documentElement.dataset.theme = mode;
          document.documentElement.classList.toggle('dark', mode === 'dark');
          document.documentElement.style.colorScheme = mode;
        },
        { layout, mode },
      );
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 1100 });
        await expect(page.locator('.aegis-app-shell')).toHaveAttribute(
          'data-compact',
          width === 390 ? 'true' : 'false',
        );
        await expect(note).toHaveValue('Retain this draft');
        await page.evaluate(() => document.fonts.ready);
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          ),
        );
        const violations = (
          await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
        ).violations;
        assert.equal(violations.length, 0, JSON.stringify(violations));
        const filename = `${layout}-${mode}-${width}.png`;
        await page.screenshot({ path: resolve(output, filename), fullPage: true });
        report.screenshots.push(filename);
      }
    }
  report.checks.push(
    'All four theme/mode combinations at desktop/narrow widths preserve drafts and have no document overflow or focused axe violations.',
  );
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await server.close();
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
