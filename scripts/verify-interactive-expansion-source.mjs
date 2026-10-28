import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'artifacts/interactive-expansion');
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
  axe: [],
  geometry: [],
  screenshots: [],
  limitations: [
    'Focused Chromium source fixture; not all browser/editor/drag/accessibility combinations, assistive technology or host persistence.',
  ],
};
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:${server.httpServer.address().port}/scripts/fixtures/interactive-expansion/index.html`,
  );
  const inline = page.getByRole('region', { name: 'Inline editing' });
  await inline.getByRole('button', { name: 'Edit Project' }).click();
  const draft = inline.getByRole('textbox', { name: 'Project' });
  await expect(draft).toBeFocused();
  await draft.fill('No');
  await draft.press('Enter');
  await expect(inline.getByText('Use three characters.')).toBeVisible();
  await draft.press('Escape');
  await expect(inline.getByText('Atlas')).toBeVisible();
  await expect(inline.getByRole('button', { name: 'Edit Project' })).toBeFocused();
  await inline.getByRole('button', { name: 'Edit Project' }).click();
  await draft.fill('Orion');
  await draft.press('Enter');
  await expect(inline.getByText('Could not save. Try again.')).toBeVisible();
  await expect(draft).toHaveValue('Orion');
  await inline.getByRole('button', { name: 'Allow save' }).click();
  await inline.getByRole('button', { name: 'External value' }).click();
  await inline.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(inline.getByText(/This value changed/)).toBeVisible();
  await inline.getByRole('button', { name: 'Cancel' }).click();
  await inline.getByRole('button', { name: 'Edit Project' }).click();
  await draft.fill('Orion');
  await draft.press('Enter');
  await expect(inline.getByText('Orion')).toBeVisible();
  report.checks.push(
    'InlineEdit focus, validation, cancel, rejected asynchronous save preserving draft, external conflict and accepted save.',
  );
  const text = page.getByRole('region', { name: 'Rich text', exact: true });
  const editor = text.getByRole('textbox', { name: 'Message' });
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await text.getByRole('button', { name: 'Bold', exact: true }).click();
  await editor.pressSequentially('Important');
  await expect(editor.locator('strong')).toHaveText('Important');
  await text.getByRole('button', { name: 'Bold', exact: true }).click();
  await text.getByRole('button', { name: 'Bullet list' }).click();
  await expect(editor.locator('ul li')).toHaveCount(1);
  await text.getByRole('button', { name: 'Submit document' }).click();
  await expect(text.getByLabel('Submitted document')).toContainText('bulletList');
  await expect(text.getByLabel('Submitted document')).toContainText('bold');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await text.getByRole('button', { name: 'Link', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit link' });
  await dialog.getByRole('textbox', { name: 'Link URL' }).fill('javascript:alert(1)');
  await dialog.getByRole('button', { name: 'Apply link' }).click();
  await expect(dialog.getByText('Use an HTTP(S), mailto or relative URL.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Link URL' }).fill('https://example.com');
  await dialog.getByRole('button', { name: 'Apply link' }).click();
  await expect(editor.locator('a')).toHaveAttribute('href', 'https://example.com');
  await text.getByRole('button', { name: 'Toggle read only' }).click();
  await expect(editor).toHaveAttribute('contenteditable', 'false');
  await expect(text.getByRole('button', { name: 'Bold', exact: true })).toBeDisabled();
  await text.getByRole('button', { name: 'Replace document' }).click();
  await expect(editor).toHaveText('External document');
  await text.getByRole('button', { name: 'Toggle read only' }).click();
  report.checks.push(
    'Tiptap controlled editing, selection formatting, list schema, JSON FormData, link validation/application, read-only and external replacement.',
  );
  const list = page.getByRole('list', { name: 'Steps' });
  const handle = page.getByRole('button', { name: 'Reorder One' });
  await handle.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await handle.focus();
  await page.keyboard.press('Space');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('over position 2');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.keyboard.press('Space');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await expect(list.locator('li').nth(0)).toHaveAttribute('data-item-id', 'two');
  await expect(handle).toBeFocused();
  await page.keyboard.press('Space');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('[id^="DndLiveRegion"]')).toContainText('over position');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await page.keyboard.press('Escape');
  await expect(list.locator('li').nth(1)).toHaveAttribute('data-item-id', 'one');
  await page.getByRole('button', { name: 'Move One up' }).click();
  await expect(list.locator('li').nth(0)).toHaveAttribute('data-item-id', 'one');
  const from = await handle.boundingBox();
  const to = await page.getByRole('button', { name: 'Reorder Three' }).boundingBox();
  assert(from && to);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(list.locator('li').nth(2)).toHaveAttribute('data-item-id', 'one');
  report.checks.push(
    'Real dnd-kit keyboard drop/cancel and focus retention, explicit move boundary, actual pointer drag reorder.',
  );
  // dnd-kit deliberately suppresses click events for 50ms after a pointer drag.
  await page.waitForTimeout(60);
  const preview = page.getByRole('region', { name: 'Image file' });
  await expect(preview.getByRole('img')).toBeVisible();
  await preview.getByRole('button', { name: 'Open image preview' }).click();
  await expect(page.getByRole('dialog', { name: 'Sample.png' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview.getByRole('button', { name: 'Open image preview' })).toBeFocused();
  await expect(
    page.getByRole('region', { name: 'Document file' }).getByRole('status'),
  ).toBeVisible();
  await expect(page.locator('iframe,object,embed')).toHaveCount(0);
  report.checks.push(
    'Raster lightbox open/Escape/focus return; PDF fallback without executable document embedding.',
  );
  for (const theme of ['fundamental', 'fundamental-floating'])
    for (const mode of ['light', 'dark'])
      for (const width of [1280, 360]) {
        await page.setViewportSize({ width, height: 1100 });
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.layoutTheme = theme;
            document.documentElement.dataset.theme = mode;
            document.documentElement.classList.toggle('dark', mode === 'dark');
            document.documentElement.style.colorScheme = mode;
          },
          { theme, mode },
        );
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            document
              .getAnimations()
              .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          );
        });
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          'document overflow',
        );
        await expect(editor).toHaveText('External document');
        const geometry = await editor.evaluate((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
          background: getComputedStyle(node).backgroundColor,
        }));
        report.geometry.push({ theme, mode, viewportWidth: width, ...geometry });
        const axe = await new AxeBuilder({ page }).analyze();
        report.axe.push({
          theme,
          mode,
          width,
          violations: axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(axe.violations.length, 0, JSON.stringify(report.axe.at(-1)));
        const name = `${theme}-${mode}-${width}.png`;
        await page.screenshot({ path: resolve(output, name), fullPage: true });
        report.screenshots.push(name);
      }
  for (const theme of ['fundamental', 'fundamental-floating'])
    for (const width of [1280, 360]) {
      const variants = report.geometry.filter(
        (item) => item.theme === theme && item.viewportWidth === width,
      );
      assert.equal(variants[0].width, variants[1].width);
      assert.equal(variants[0].height, variants[1].height);
      assert.notEqual(variants[0].background, variants[1].background);
    }
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error);
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser?.close();
  await server.close();
}
console.log(JSON.stringify(report, null, 2));
