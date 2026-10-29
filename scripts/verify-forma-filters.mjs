import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { assertPushFilterLayout } from './acceptance/oracles.mjs';

const base = (process.env.FORMA_URL || 'http://127.0.0.1:4180/?view=product').split('#')[0];
const output = 'artifacts/forma-filters';
await mkdir(output, { recursive: true });
const report = {
  status: 'running',
  scenarios: [],
  accessibility: [],
  browserErrors: [],
  limitations: [
    'Finite local Chromium collection filtering workflows; fixture data and browser storage, without a backend or exhaustive component certification.',
  ],
};
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const cases = [
  {
    id: 'users',
    title: 'Users',
    primaryGroup: 'Role',
    primaryField: 'role',
    first: 'Admin',
    second: 'Member',
    secondaryGroup: 'Status',
    secondaryField: 'status',
    secondary: 'Active',
    query: 'Layers',
    queryFields: ['name', 'email', 'company'],
    rowLabel: (item) => item.name,
    empty: 'No users match your filters',
  },
  {
    id: 'products',
    title: 'Products',
    primaryGroup: 'Category',
    primaryField: 'category',
    first: 'Subscription',
    second: 'Add-on',
    secondaryGroup: 'Status',
    secondaryField: 'status',
    secondary: 'Active',
    query: 'FRM',
    queryFields: ['name', 'description', 'sku'],
    rowLabel: (item) => item.name,
    empty: 'No products found',
  },
  {
    id: 'invoices',
    title: 'Invoices',
    primaryGroup: 'Status',
    primaryField: 'status',
    first: 'Paid',
    second: 'Pending',
    query: 'Olivia',
    queryFields: ['number', 'customer', 'email'],
    rowLabel: (item) => `${item.number}, ${item.customer}`,
    empty: 'No invoices found',
  },
];
const trigger = () => page.getByRole('button', { name: 'Filters', exact: true });
const panel = (item) => page.getByRole('complementary', { name: `Filter ${item.id}`, exact: true });
const search = (item) => page.getByRole('searchbox', { name: `Search ${item.id}`, exact: true });
const resultLabel = (item, count) =>
  `Show ${count} ${count === 1 ? item.id.slice(0, -1) : item.id}`;
const choice = (dialog, group, name) =>
  dialog
    .getByRole('group', { name: group, exact: true })
    .getByRole('checkbox', { name, exact: true });

async function assertResults(item, expected) {
  if (item.id === 'products') {
    await expect(page.locator('.forma-product-card')).toHaveCount(expected.length);
    const labels = await page.locator('.forma-product-card .aegis-card-title').allTextContents();
    // Card headings are the user-visible product identity, not incidental SKU text.
    for (const record of expected)
      await expect(
        page
          .locator('.forma-product-card')
          .getByRole('heading', { name: record.name, exact: true }),
      ).toBeVisible();
    if (labels.length) assert.equal(labels.length, expected.length);
  } else {
    const rows = page
      .getByRole('grid', { name: item.id === 'users' ? 'All users' : 'Invoices', exact: true })
      .locator('tbody tr');
    if (expected.length) {
      await expect(rows).toHaveCount(Math.min(10, expected.length));
      const names = await rows.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label')),
      );
      const accepted = new Set(expected.map(item.rowLabel));
      assert(
        names.every((name) => accepted.has(name)),
        `${item.title}: every visible row matches the active criteria`,
      );
      if (expected.length <= 10) assert.deepEqual([...names].sort(), [...accepted].sort());
    }
  }
  if (!expected.length) await expect(page.getByText(item.empty, { exact: true })).toBeVisible();
}

async function open(item) {
  const before = await page.locator('.forma-filter-results').boundingBox();
  await trigger().click();
  const dialog = panel(item);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^(Apply|Cancel)$/ })).toHaveCount(0);
  await assertPushFilterLayout({
    page,
    panel: dialog,
    results: page.locator('.forma-filter-results'),
    before,
    interactive: search(item),
  });
  await dialog.getByRole('button', { name: 'Close filter panel', exact: true }).focus();
  for (const irrelevant of ['Severity', 'Assignee', 'Source'])
    await expect(dialog.getByRole('group', { name: irrelevant, exact: true })).toHaveCount(0);
  return dialog;
}

async function close(item, method, expectedCount) {
  const dialog = panel(item);
  if (method === 'escape') await page.keyboard.press('Escape');
  else if (method === 'results')
    await dialog
      .getByRole('button', { name: resultLabel(item, expectedCount), exact: true })
      .click();
  else await dialog.getByRole('button', { name: 'Close filter panel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger()).toBeFocused();
}

try {
  for (const width of [1440, 390])
    for (const presentation of ['fundamental', 'fundamental-floating'])
      for (const mode of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 1000 });
        for (const item of cases) {
          await page.goto(`${base}#${item.id}`);
          await page.reload();
          await expect(
            page.getByRole('heading', { name: item.title, level: 1, exact: true }),
          ).toBeVisible();
          const state = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('forma-workspace-v1')),
          );
          const records = state[item.id];
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
          await assertResults(item, records);
          await expect(trigger()).toHaveCount(1);
          let dialog = await open(item);
          await choice(dialog, item.primaryGroup, item.first).check();
          const single = records.filter((record) => record[item.primaryField] === item.first);
          await expect(
            dialog.getByRole('button', { name: resultLabel(item, single.length), exact: true }),
          ).toBeVisible();
          await close(item, 'results', single.length);
          await assertResults(item, single);

          dialog = await open(item);
          await expect(choice(dialog, item.primaryGroup, item.first)).toBeChecked();
          await choice(dialog, item.primaryGroup, item.second).check();
          let combined = records.filter((record) =>
            [item.first, item.second].includes(record[item.primaryField]),
          );
          if (item.secondary) {
            await choice(dialog, item.secondaryGroup, item.secondary).check();
            combined = combined.filter((record) => record[item.secondaryField] === item.secondary);
          }
          await expect(
            dialog.getByRole('button', { name: resultLabel(item, combined.length), exact: true }),
          ).toBeVisible();
          await close(item, 'escape');
          await assertResults(item, combined);
          dialog = await open(item);
          await expect(choice(dialog, item.primaryGroup, item.first)).toBeChecked();
          await expect(choice(dialog, item.primaryGroup, item.second)).toBeChecked();
          if (item.secondary)
            await expect(choice(dialog, item.secondaryGroup, item.secondary)).toBeChecked();
          await close(item, 'button');

          await search(item).fill(item.query);
          const searched = combined.filter((record) =>
            item.queryFields
              .map((field) => record[field])
              .join(' ')
              .toLowerCase()
              .includes(item.query.toLowerCase()),
          );
          await assertResults(item, searched);
          dialog = await open(item);
          await expect(
            dialog.getByRole('button', { name: resultLabel(item, searched.length), exact: true }),
          ).toBeVisible();
          await dialog.getByRole('button', { name: 'Clear all', exact: true }).click();
          for (const checkbox of await dialog.getByRole('checkbox').all())
            await expect(checkbox).not.toBeChecked();
          await expect(
            dialog.getByRole('button', { name: resultLabel(item, records.length), exact: true }),
          ).toBeVisible();
          if (presentation === 'fundamental-floating') {
            const result = await new AxeBuilder({ page })
              .exclude('[data-base-ui-focus-guard]')
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
              .analyze();
            const violations = result.violations.map(({ id, nodes }) => ({
              id,
              targets: nodes.map(({ target }) => target),
            }));
            report.accessibility.push({ page: item.id, width, mode, presentation, violations });
            assert.deepEqual(violations, [], `${item.title} filter panel accessibility`);
          }
          if (width === 390 && mode === 'dark' && presentation === 'fundamental-floating')
            await page.screenshot({ path: `${output}/${item.id}-panel-mobile-dark.png` });
          await close(item, 'results', records.length);
          await expect(search(item)).toHaveValue('');
          await assertResults(item, records);
          await search(item).fill('no-matching-record-acceptance');
          await assertResults(item, []);
          await page.getByRole('button', { name: 'Clear all', exact: true }).click();
          await assertResults(item, records);
          report.scenarios.push({
            page: item.id,
            width,
            mode,
            presentation,
            baselineCount: records.length,
            singleCount: single.length,
            combinedCount: combined.length,
            searchedCount: searched.length,
          });
          console.log(
            `PASS ${item.title} immediate filters, focus, counts and recovery: ${width}px ${presentation}/${mode}`,
          );
        }
      }
  assert.deepEqual(report.browserErrors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack || error);
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await context.close();
  await browser.close();
}
