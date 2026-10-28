import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = (process.env.FORMA_URL || 'http://127.0.0.1:4180/?view=product').split('#')[0];
const out = 'artifacts/forma-metrics';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
const report = { checks: [], errors: [] };
page.on('pageerror', (error) => report.errors.push(error.message));
try {
  for (const width of [1600, 1280, 1151, 900, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const mode of ['dark', 'light']) {
      await page.goto(`${base}#dashboard`);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
      if ((await page.locator('html').getAttribute('data-theme')) !== mode)
        await page.getByRole('button', { name: `Switch to ${mode} mode`, exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      for (const content of ['seed', 'long-currency']) {
        if (content === 'long-currency') {
          // A layout stress case, not a claim that the app generated this business total.
          await page
            .locator('.forma-metric-value')
            .first()
            .evaluate((element) => {
              element.textContent = 'CHF 123,456,789.00';
            });
        }
        const geometry = await page
          .locator('.forma-metric')
          .first()
          .evaluate((card) => {
            const rect = (element) => {
              const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
              return { left, right, top, bottom, width, height };
            };
            const style = getComputedStyle(card);
            const outer = rect(card);
            return {
              contentLeft: outer.left + parseFloat(style.paddingLeft),
              contentRight: outer.right - parseFloat(style.paddingRight),
              contentTop: outer.top + parseFloat(style.paddingTop),
              contentBottom: outer.bottom - parseFloat(style.paddingBottom),
              value: rect(card.querySelector('.forma-metric-value')),
              chart: rect(card.querySelector('.aegis-sparkline')),
              overflow: card.scrollWidth > card.clientWidth + 1,
            };
          });
        const scenario = `${content}, ${mode}, ${width}px`;
        for (const [name, element] of [
          ['value', geometry.value],
          ['sparkline', geometry.chart],
        ]) {
          assert(element.width > 0 && element.height > 0, `${name} remains visible: ${scenario}`);
          assert(
            element.left >= geometry.contentLeft - 1 && element.right <= geometry.contentRight + 1,
            `${name} stays inside card padding: ${scenario}: ${JSON.stringify(geometry)}`,
          );
          assert(
            element.top >= geometry.contentTop - 1 && element.bottom <= geometry.contentBottom + 1,
            `${name} stays inside the card vertically: ${scenario}`,
          );
        }
        const { value, chart } = geometry;
        assert(
          value.right <= chart.left + 1 ||
            chart.right <= value.left + 1 ||
            value.bottom <= chart.top + 1 ||
            chart.bottom <= value.top + 1,
          `Value and sparkline do not overlap: ${scenario}`,
        );
        assert(!geometry.overflow, `Metric has no horizontal overflow: ${scenario}`);
        report.checks.push({ width, mode, content, ...geometry });
        if (width === 1280 || width === 390)
          await page
            .locator('.forma-metrics')
            .screenshot({ path: `${out}/${width}-${mode}-${content}.png` });
      }
    }
  }
  assert.deepEqual(report.errors, [], 'No browser errors');
  console.log(`Metric containment: ${report.checks.length} scenarios passed.`);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
