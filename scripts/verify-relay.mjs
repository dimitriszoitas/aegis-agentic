import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { preview } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const preparation = JSON.parse(await readFile('artifacts/relay/preparation.json', 'utf8'));
const consumer = resolve(process.argv[2] || preparation.consumer);
const name = process.argv[3] || 'consumer';
assert(/^[a-z0-9-]+$/.test(name));
const reviewPresentation = process.argv[4] === '--review-presentation';
assert(
  process.argv.length <= 4 || (process.argv.length === 5 && reviewPresentation),
  'Unknown verification argument',
);
const out = `artifacts/relay/${name}`;
await mkdir(out, { recursive: true });
const server = await preview({
  configFile: false,
  root: consumer,
  preview: { host: '127.0.0.1', port: 0 },
});
const address = server.httpServer.address();
const base = `http://127.0.0.1:${address.port}/`;
const browser = await chromium.launch();
const context = await browser.newContext({
  reducedMotion: 'reduce',
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const report = {
  consumer,
  name,
  checks: [],
  comparisons: [],
  accessibility: [],
  errors: [],
  observedAt: new Date().toISOString(),
  observations: {},
  presentationReview: reviewPresentation,
  presentationChecks: reviewPresentation ? [] : undefined,
  harnessSha256: createHash('sha256')
    .update(await readFile(new URL(import.meta.url)))
    .digest('hex'),
  sourceSha256: createHash('sha256')
    .update(await readFile(join(consumer, 'src/requests.tsx')))
    .digest('hex'),
  lock: JSON.parse(await readFile(join(consumer, 'aegis-lock.json'), 'utf8')),
  limits: [
    'Shared shell and patterns supplied to both agents; only the Requests page was independently generated.',
    'Screenshots are evidence, not approved visual regression baselines.',
    'Local demo data; no service or telemetry integration.',
  ],
};
page.on('pageerror', (error) => report.errors.push(error.message));
const passed = (check) => {
  report.checks.push(check);
  console.log(`✓ ${name}: ${check}`);
};
async function settleUi() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let pass = 0; pass < 10; pass += 1) {
      // Theme and route changes can start a transition on the next frame.
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const animations = document
        .getAnimations()
        .filter(
          (animation) =>
            (animation.playState === 'running' || animation.pending) &&
            animation.effect?.getTiming().iterations !== Infinity,
        );
      if (!animations.length) return;
      let timeout;
      try {
        await Promise.race([
          Promise.allSettled(animations.map((animation) => animation.finished)),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('UI animations did not settle')), 10000);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error('UI kept starting finite animations during verification');
  });
}
const axe = async (scenario) => {
  await settleUi();
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    scenario,
    violations: violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        failureSummary: n.failureSummary,
        any: n.any,
      })),
    })),
  });
  assert.deepEqual(
    violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    [],
    scenario,
  );
};
async function choose(combobox, option) {
  await combobox.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
try {
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Requests', level: 1 })).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const mode of ['dark', 'light']) {
      if ((await page.locator('html').getAttribute('data-theme')) !== mode)
        await page.getByRole('button', { name: `Switch to ${mode} mode` }).click();
      let reference;
      for (const route of ['requests', 'customers']) {
        await page.goto(`${base}#${route}`);
        await expect(
          page.getByRole('heading', {
            name: route === 'requests' ? 'Requests' : 'Customers',
            level: 1,
          }),
        ).toBeVisible();
        await settleUi();
        const geometry = await page.locator('.relay-page:visible').evaluate((section) => {
          const box = (element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          };
          const h = section.querySelector('h1');
          const style = getComputedStyle(h);
          const main = document.querySelector('.relay-main');
          return {
            header: box(section.querySelector('.aegis-page-header')),
            search: box(section.querySelector('.relay-filter-search')),
            font: [style.fontSize, style.lineHeight, style.fontWeight],
            overflow:
              document.documentElement.scrollWidth > innerWidth + 1 ||
              main.scrollWidth > main.clientWidth + 1,
          };
        });
        assert(!geometry.overflow, `${route} fits ${width}px`);
        if (reference) {
          assert(Math.abs(geometry.header.x - reference.header.x) < 1, 'Shared header alignment');
          assert(
            Math.abs(geometry.header.width - reference.header.width) < 1,
            'Shared header width',
          );
          assert(
            Math.abs(geometry.search.width - reference.search.width) < 1,
            'Shared search width',
          );
          assert.deepEqual(geometry.font, reference.font, 'Shared heading typography');
        }
        reference = geometry;
        report.comparisons.push({ route, mode, width, ...geometry });
        if (reviewPresentation) {
          const metadata = page.locator(
            '.relay-page:visible .relay-collection-count > span[aria-hidden="true"]',
          );
          await expect(metadata).toHaveText(`total ${route}`);
          const presentation = { route, mode, width, countContext: await metadata.innerText() };
          if (route === 'requests') {
            const titleCell = page.locator('.relay-page:visible .relay-cell-truncate').first();
            const truncation = await titleCell.evaluate((element) => {
              const style = getComputedStyle(element);
              return {
                textOverflow: style.textOverflow,
                whiteSpace: style.whiteSpace,
                overflow: style.overflow,
                minWidth: style.minWidth,
                clientWidth: element.clientWidth,
                scrollWidth: element.scrollWidth,
                fullTitle: element.getAttribute('title'),
                text: element.textContent.trim(),
              };
            });
            assert.equal(truncation.textOverflow, 'ellipsis');
            assert.equal(truncation.whiteSpace, 'nowrap');
            assert.equal(truncation.overflow, 'hidden');
            assert.equal(truncation.minWidth, '0px');
            assert(
              truncation.clientWidth > 0 && truncation.scrollWidth > truncation.clientWidth,
              'Long title has a constrained ellipsis box',
            );
            assert.equal(
              truncation.fullTitle,
              truncation.text,
              'Hover title retains full request text',
            );
            presentation.truncation = truncation;
          }
          report.presentationChecks.push(presentation);
        }
        await expect(page.getByRole('group', { name: 'Row density' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Columns', exact: true })).toBeVisible();
        await axe(`${route}/${mode}/${width}`);
        await page.screenshot({ path: `${out}/${route}-${mode}-${width}.png` });
      }
    }
  }
  passed(
    'Headers, search width, display controls and page containment across both pages, two modes and two widths',
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto(`${base}#requests`);
  const search = page.getByRole('searchbox', { name: 'Search requests' });
  const query = (await search.count())
    ? search
    : page.getByRole('textbox', { name: 'Search requests' });
  const grid = page.getByRole('grid', { name: 'Requests', exact: true });
  await query.fill('workspace');
  await choose(page.getByRole('combobox', { name: 'Filter requests by status' }), 'Open');
  const rows = grid.locator('tbody tr[aria-label]');
  assert((await rows.count()) > 0);
  for (const row of await rows.all()) {
    await expect(row).toContainText(/workspace/i);
    await expect(row).toContainText('Open');
  }
  const beforeCount = await rows.count();
  const currentMode = await page.locator('html').getAttribute('data-theme');
  await page
    .getByRole('button', { name: `Switch to ${currentMode === 'dark' ? 'light' : 'dark'} mode` })
    .click();
  await expect(query).toHaveValue('workspace');
  await expect(rows).toHaveCount(beforeCount);
  await query.fill('no-matching-request-93472');
  await expect(rows).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(rows).toHaveCount(10);
  passed(
    'Combined immediate filters, empty results, clear-all, pagination size and theme-preserved state',
  );
  const firstRow = rows.filter({ hasText: 'Unable to connect the production workspace' });
  await firstRow.focus();
  await page.keyboard.press('Enter');
  const details = page.getByRole('dialog');
  await expect(details).toBeVisible();
  await expect(details).toHaveAccessibleName('Unable to connect the production workspace');
  const labels = details.getByRole('textbox', { name: /labels/i });
  await labels.fill('Follow-up');
  await labels.press('Enter');
  await expect(
    details.getByRole('button', { name: 'Remove Follow-up', exact: true }),
  ).toBeVisible();
  await labels.fill('follow-up');
  await labels.press('Enter');
  await expect(details.getByRole('alert')).toContainText(/already added/i);
  await expect(labels).toHaveValue('follow-up');
  await labels.fill('');
  await axe('Editable request details');
  await page.keyboard.press('Escape');
  await expect(details).not.toBeVisible();
  await expect(firstRow).toBeFocused();
  await page.reload();
  await grid
    .locator('tbody tr[aria-label]')
    .filter({ hasText: 'Unable to connect the production workspace' })
    .click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Remove Follow-up', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  passed(
    'Keyboard row details, canonical TokenInput duplicate handling, focus return and persisted labels',
  );
  await page.getByRole('button', { name: 'New request', exact: true }).click();
  const form = page.getByRole('dialog');
  const title = form.getByRole('textbox', { name: /^(request )?title/i });
  const cancelledDraft = 'Cancelled draft observation';
  await title.fill(cancelledDraft);
  await form.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(form).not.toBeVisible();
  await query.fill(cancelledDraft);
  await expect(grid.locator('tbody tr[aria-label]')).toHaveCount(0);
  await query.fill('');
  await page.getByRole('button', { name: 'New request', exact: true }).click();
  const reopenedTitle = await title.inputValue();
  report.observations.cancelDraft = {
    enteredTitle: cancelledDraft,
    reopenedTitle,
    retained: reopenedTitle === cancelledDraft,
    contract: reviewPresentation
      ? 'Final product choice: Cancel closes without adding a record and discards the new-request draft.'
      : 'Original brief: Cancel closes without adding a record; retaining or discarding the draft was not specified.',
  };
  if (reviewPresentation) {
    assert.equal(
      report.observations.cancelDraft.retained,
      false,
      'Final product contract discards cancelled drafts.',
    );
    await expect(title).toHaveValue('');
    passed('Cancel closes without creating a record and final product contract discards the draft');
  } else {
    passed(
      'Cancel closes without creating a record; reopened draft behavior recorded without a pass/fail preference',
    );
  }
  await title.fill('');
  const submit = form.getByRole('button', { name: /^(create|add) request$/i });
  await submit.click();
  await expect(form).toBeVisible();
  // The modal correctly hides the background grid from the accessibility tree.
  await expect(
    page
      .getByRole('grid', { name: 'Requests', exact: true, includeHidden: true })
      .locator('tbody tr[aria-label]'),
  ).toHaveCount(10);
  await expect(title).toBeFocused();
  await expect(form).toContainText(/choose an existing customer/i);
  await title.fill('A consistent independent consumer');
  const customer = form.getByRole('combobox', { name: /customer/i });
  await customer.click();
  await page.getByRole('option').filter({ hasText: 'Maya Chen' }).click();
  await axe('New request form');
  await submit.click();
  await expect(form).not.toBeVisible();
  await query.fill('A consistent independent consumer');
  await expect(grid.locator('tbody tr[aria-label]')).toHaveCount(1);
  await page.reload();
  await query.fill('A consistent independent consumer');
  await expect(grid.locator('tbody tr[aria-label]')).toHaveCount(1);
  passed('Validated creation, existing-customer selection and local persistence');
  assert.deepEqual(report.errors, [], 'No browser errors');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.message;
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  throw error;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise((done) => server.httpServer.close(done));
}
