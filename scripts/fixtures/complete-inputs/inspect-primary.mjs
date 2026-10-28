import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const results = [];
try {
  await page.goto(
    `${server.resolvedUrls.local[0]}scripts/fixtures/complete-inputs/primary-button.html`,
  );
  await page.getByRole('button', { name: 'Primary action' }).waitFor();
  for (const mode of ['light', 'dark']) {
    await page.evaluate(
      (mode) => document.documentElement.classList.toggle('dark', mode === 'dark'),
      mode,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
          .map((a) => a.finished.catch(() => {})),
      );
    });
    const styles = await page.getByRole('button', { name: 'Primary action' }).evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        background: style.background,
        color: style.color,
        opacity: style.opacity,
        action: style.getPropertyValue('--semantic-color-action-fill'),
        blue: style.getPropertyValue('--color-blue-600'),
        intent: style.getPropertyValue('--group-trigger-button-intent-bg'),
        ancestors: [
          ...(function* (n) {
            while (n) {
              yield n;
              n = n.parentElement;
            }
          })(node),
        ].map((ancestor) => ({
          tag: ancestor.tagName,
          className: ancestor.className,
          opacity: getComputedStyle(ancestor).opacity,
        })),
      };
    });
    const axe = await new AxeBuilder({ page }).analyze();
    results.push({ mode, styles, violations: axe.violations });
  }
  await writeFile(
    new URL('../../../artifacts/complete-inputs/primary-button-current.json', import.meta.url),
    JSON.stringify(results, null, 2) + '\n',
  );
  console.log(
    JSON.stringify(
      results.map(({ mode, styles, violations }) => ({
        mode,
        styles,
        rules: violations.map((v) => v.id),
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
