import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const port = 4196;
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  { cwd: root, stdio: 'pipe' },
);
let serverOutput = '';
server.stdout.on('data', (chunk) => {
  serverOutput += chunk;
});
server.stderr.on('data', (chunk) => {
  serverOutput += chunk;
});
let browser;
const results = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      ready = (await fetch(base)).ok;
    } catch {
      /* Wait for our own local test server. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Fixture server did not start: ${serverOutput}`);
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  async function load(query, width, presentation, mode) {
    await page.goto(`${base}/src/patterns/page-layout/browser-fixture.html?${query}`);
    await page.locator('.aegis-page-layout').waitFor();
    await page.evaluate(
      ({ width, presentation, mode }) => {
        const root = document.documentElement;
        root.dataset.layoutTheme = presentation;
        root.dataset.theme = mode;
        root.classList.toggle('dark', mode === 'dark');
        root.style.colorScheme = mode;
        document.getElementById('fixture-container').style.width = `${width}px`;
      },
      { width, presentation, mode },
    );
  }
  const geometries = [];
  for (const presentation of ['fundamental', 'fundamental-floating'])
    for (const mode of ['light', 'dark']) {
      await load('case=settings', 1100, presentation, mode);
      await page
        .getByRole('textbox', { name: 'Persistent draft' })
        .fill('Draft retained through adaptation');
      const geometry = await page.locator('.aegis-reading-column').evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        max: parseFloat(getComputedStyle(node).maxInlineSize),
      }));
      assert.ok(
        Math.abs(geometry.width - geometry.max) < 1,
        'Settings reading column must honor the selected measure.',
      );
      geometries.push(geometry.width);
      await page.evaluate(() => {
        document.getElementById('fixture-container').style.width = '320px';
      });
      assert.equal(
        await page.getByRole('textbox', { name: 'Persistent draft' }).inputValue(),
        'Draft retained through adaptation',
      );
      assert.ok(
        await page
          .getByRole('textbox', { name: 'Persistent draft' })
          .evaluate((node) => document.activeElement === node),
        'Resize must retain the active input.',
      );
      assert.ok(
        (await page.locator('.aegis-reading-column').boundingBox()).width <= 321,
        'Reading column must shrink to available width.',
      );
      await page.evaluate(() => {
        document.documentElement.classList.toggle('dark');
        document.documentElement.style.colorScheme = document.documentElement.classList.contains(
          'dark',
        )
          ? 'dark'
          : 'light';
      });
      assert.equal(
        await page.getByRole('textbox', { name: 'Persistent draft' }).inputValue(),
        'Draft retained through adaptation',
      );
      results.push({
        case: 'settings',
        presentation,
        mode,
        geometry,
        draftAndFocusPreserved: true,
      });

      for (const width of [320, 1200]) {
        await load('case=detail', width, presentation, mode);
        const main = await page.locator('[data-page-slot="main"]').boundingBox();
        const aside = await page.locator('[data-page-slot="aside"]').boundingBox();
        if (width === 320)
          assert.ok(aside.y >= main.y + main.height, 'Narrow detail must stack main before aside.');
        else
          assert.ok(
            Math.abs(aside.y - main.y) < 1,
            'Wide detail must show at most main and aside beside one another.',
          );
        assert.equal(await page.getByRole('complementary', { name: 'Related context' }).count(), 1);
        results.push({ case: 'detail', presentation, mode, width, stacked: width === 320 });
      }
      await load('case=collection', 1100, presentation, mode);
      assert.equal(await page.locator('.aegis-reading-column').count(), 0);
      const collectionWidth = (await page.locator('[data-page-slot="main"]').boundingBox()).width;
      assert.ok(collectionWidth >= 1099, 'Collection must use the available width.');
      await page.evaluate(() => {
        document.getElementById('fixture-container').style.width = '320px';
      });
      const overflow = await page
        .locator('.aegis-page-layout')
        .evaluate((node) => ({ width: node.clientWidth, scroll: node.scrollWidth }));
      assert.ok(
        overflow.scroll <= overflow.width + 1,
        'Grid overflow must not enlarge the collection page.',
      );
      results.push({
        case: 'collection',
        presentation,
        mode,
        fullWidth: true,
        containedOverflow: true,
      });
    }
  assert.ok(
    geometries.every((width) => Math.abs(width - geometries[0]) < 1),
    'Reading geometry must remain invariant across all four configurations.',
  );
  for (const columns of [1, 2, 3, 4])
    for (const width of [320, 800, 1800]) {
      await load(`case=dashboard&columns=${columns}`, width, 'fundamental-floating', 'dark');
      const boxes = await page.locator('.aegis-content-grid-item').evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, right: rect.right, left: rect.left };
        }),
      );
      const firstRow = boxes.filter((box) => Math.abs(box.top - boxes[0].top) < 1).length;
      assert.ok(firstRow <= columns, 'ContentGrid must not exceed its maximum columns.');
      if (width === 320) assert.equal(firstRow, 1, 'Narrow grid must collapse to one column.');
      if (width === 1800)
        assert.equal(
          firstRow,
          columns,
          'Wide grid must reach its requested cap when enough items are supplied.',
        );
      assert.ok(
        boxes.every((box) => box.right <= width + 1),
        'Items must remain inside the container.',
      );
      results.push({ case: 'dashboard', columns, width, actualColumns: firstRow });
    }
  const measures = [];
  for (const measure of ['compact', 'comfortable', 'wide']) {
    await load(`case=settings&measure=${measure}`, 1100, 'fundamental', 'light');
    measures.push((await page.locator('.aegis-reading-column').boundingBox()).width);
  }
  assert.ok(
    measures[0] < measures[1] && measures[1] < measures[2],
    'Reading measure choices must increase in order.',
  );
  assert.deepEqual(errors, [], 'The fixture must not raise browser errors.');
  const report = {
    passed: true,
    scenarios: results.length,
    results,
    limitations: [
      'Layout geometry and local interaction only; no claim of full consumer accessibility.',
    ],
  };
  await writeFile(
    new URL('browser-evidence.json', import.meta.url),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `Page layout browser checks passed: ${results.length} scenarios, four configurations, responsive columns, draft/focus preservation.`,
  );
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
