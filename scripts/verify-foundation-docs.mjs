/** Rendered MDX regression: tables must remain semantic tables in every theme. */
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.STORYBOOK_URL || 'http://localhost:6006';
const output = 'test-results/foundation-docs';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const layout of ['fundamental', 'fundamental-floating']) {
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
      await page.goto(
        `${base}/?path=/docs/foundations-theme--docs&globals=theme:${mode};layoutTheme:${layout}`,
      );
      const docs = page.frameLocator('#storybook-preview-iframe');
      const content = docs.locator('.sbdocs-content');
      await expect(content.getByRole('heading', { name: /Themes & Modes$/, level: 1 })).toBeVisible(
        { timeout: 30_000 },
      );
      const tables = content.getByRole('table');
      await expect(tables).toHaveCount(2);
      await expect(tables.nth(0).getByRole('columnheader')).toHaveText([
        'Theme',
        'Light',
        'Dark',
        'Presentation',
      ]);
      await expect(tables.nth(0).getByRole('row')).toHaveCount(3);
      await expect(tables.nth(0).getByRole('cell', { name: 'Supported', exact: true })).toHaveCount(
        4,
      );
      await expect(tables.nth(1).getByRole('columnheader')).toHaveText(['Layer', 'Token', 'Value']);
      await expect(tables.nth(1).getByRole('row')).toHaveCount(8);
      await expect(tables.nth(1).locator('code')).toHaveText([
        '--z-sticky',
        '--z-dropdown',
        '--z-sheet',
        '--z-modal',
        '--z-popover',
        '--z-toast',
        '--z-tooltip',
      ]);
      await expect(content.locator('p').filter({ hasText: /\|\s*(Theme|Layer)\s*\|/ })).toHaveCount(
        0,
      );
      await expect(docs.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(docs.locator('html')).toHaveAttribute('data-layout-theme', layout);
      await page.screenshot({ path: `${output}/${layout}-${mode}.png` });

      // Tables may scroll locally, but must never widen the whole document.
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          content.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      console.log(`PASS ${layout}/${mode}: semantic tables, inline code, and narrow layout`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
