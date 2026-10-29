import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setCollectionFilter } from './forma-filter-browser-helpers.mjs';

const base = process.env.FORMA_URL || 'http://127.0.0.1:4176/?view=product';
const output = 'artifacts/forma-users';
await mkdir(output, { recursive: true });
const report = { base, checks: [], accessibility: [], browserErrors: [], screenshots: [] };
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const passed = (name) => {
  report.checks.push(name);
  console.log(`✓ ${name}`);
};
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('forma-workspace-v1')));
const rows = () => page.getByRole('grid', { name: 'All users', exact: true }).locator('tbody tr');
const search = () => page.getByRole('searchbox', { name: 'Search users', exact: true });
async function select(control, option) {
  await control.click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function axe(label) {
  const result = await new AxeBuilder({ page })
    .exclude('[data-base-ui-focus-guard]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    label,
    violations: result.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  });
}
async function capture(name) {
  const path = `${output}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}
async function noOverflow(label) {
  assert(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector('.forma-main').scrollWidth <=
          document.querySelector('.forma-main').clientWidth + 1,
    ),
    `${label} fits viewport`,
  );
}
try {
  await page.goto(`${base.split('#')[0]}#users`);
  await expect(page.getByRole('heading', { name: 'Users', level: 1, exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const original = await stored();
  assert.equal(original.users.length, 28);
  await expect(rows()).toHaveCount(10);
  await noOverflow('Desktop Users');
  await capture('users-desktop-dark');
  await axe('Desktop dark Users');
  passed('Users opens with a populated, paginated grid');

  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Pagination', exact: true })).toContainText(
    '11–20 of 28 users',
  );
  await expect(page.getByRole('row', { name: 'Ava Thompson', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Page 3', exact: true }).click();
  await expect(rows()).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('25');
  await expect(rows()).toHaveCount(25);
  await expect(page.getByRole('navigation', { name: 'Pagination', exact: true })).toContainText(
    '1–25 of 28 users',
  );
  await page.getByRole('combobox', { name: 'Rows per page', exact: true }).selectOption('10');
  passed('Pagination boundaries and page size work');

  await page.getByRole('button', { name: 'User', exact: true }).click();
  await expect(rows().first()).toHaveAttribute('aria-label', 'Aiden Brown');
  await expect(
    page
      .getByRole('columnheader')
      .filter({ has: page.getByRole('button', { name: 'User', exact: true }) }),
  ).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('button', { name: 'User', exact: true }).click();
  await expect(rows().first()).toHaveAttribute('aria-label', 'Zara Ahmed');
  await page.getByRole('button', { name: 'User', exact: true }).click();
  await expect(rows().first()).toHaveAttribute('aria-label', 'Olivia Rhye');
  passed('User sorting cycles ascending, descending and source order');

  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Location', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Location', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Location', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Location', exact: true })).toHaveCount(0);
  const resize = page.getByRole('separator', { name: 'Resize User column', exact: true });
  const initialWidth = Number(await resize.getAttribute('aria-valuenow'));
  await resize.focus();
  await page.keyboard.press('ArrowRight');
  assert(
    Number(await resize.getAttribute('aria-valuenow')) > initialWidth,
    'Keyboard resizing grows the selected column',
  );
  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Reset column widths', exact: true }).click();
  assert.equal(Number(await resize.getAttribute('aria-valuenow')), initialWidth);
  passed('Column visibility and keyboard resize/reset work');

  await search().fill('PHOENIX.BAKER@EXAMPLE.COM');
  await expect(rows()).toHaveCount(1);
  await expect(rows().first()).toHaveAttribute('aria-label', 'Phoenix Baker');
  await search().fill('Layers');
  await expect(rows()).toHaveCount(
    original.users.filter((user) => user.company === 'Layers').length,
  );
  await setCollectionFilter(page, 'users', 'Role', ['Admin']);
  await expect(rows()).toHaveCount(1);
  await expect(rows().first()).toHaveAttribute('aria-label', 'Olivia Rhye');
  await setCollectionFilter(page, 'users', 'Status', ['Suspended']);
  await expect(
    page.getByRole('heading', { name: 'No users match your filters', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(rows()).toHaveCount(10);
  passed('Case-insensitive email/company search and combined filters with empty recovery');

  await page.getByRole('checkbox', { name: 'Select Olivia Rhye', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select Phoenix Baker', exact: true }).check();
  await expect(
    page.getByRole('region', { name: 'Selected row actions', exact: true }),
  ).toContainText('2 selected');
  const downloadPending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export selected', exact: true }).click();
  const download = await downloadPending;
  const csv = await readFile(await download.path(), 'utf8');
  assert.equal(csv.split('\r\n').length, 3);
  assert(
    csv.includes('Olivia Rhye') && csv.includes('Phoenix Baker') && !csv.includes('Lana Steiner'),
  );
  await page.getByRole('button', { name: 'Suspend', exact: true }).click();
  await expect(page.getByRole('row', { name: 'Olivia Rhye', exact: true })).toContainText(
    'Suspended',
  );
  await expect(page.getByRole('row', { name: 'Phoenix Baker', exact: true })).toContainText(
    'Suspended',
  );
  await expect(page.getByRole('region', { name: 'Selected row actions', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('checkbox', { name: 'Select Olivia Rhye', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Select Phoenix Baker', exact: true }).check();
  await page.getByRole('button', { name: 'Activate', exact: true }).click();
  await expect(page.getByRole('row', { name: 'Olivia Rhye', exact: true })).toContainText('Active');
  await page.getByRole('checkbox', { name: 'Select Olivia Rhye', exact: true }).check();
  await search().fill('Phoenix');
  await expect(page.getByRole('region', { name: 'Selected row actions', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  passed('Bulk status changes, selection-only export and filter selection clearing');

  const oliviaRow = page.getByRole('row', { name: 'Olivia Rhye', exact: true });
  await oliviaRow.focus();
  await page.keyboard.press('Enter');
  let panel = page.getByRole('dialog', { name: 'Olivia Rhye', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Billing history');
  await select(panel.getByRole('combobox', { name: 'User role', exact: true }), 'Viewer');
  await select(panel.getByRole('combobox', { name: 'User status', exact: true }), 'Suspended');
  await select(panel.getByRole('combobox', { name: 'User plan', exact: true }), 'Starter');
  await panel
    .getByRole('textbox', { name: /Internal notes/ })
    .fill('Regression: prefers quarterly account reviews.');
  await capture('user-details-dark');
  await axe('Dark user detail panel');
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  await expect(oliviaRow).toBeFocused();
  let savedOlivia = (await stored()).users.find((user) => user.id === 'usr-1');
  assert.equal(savedOlivia.role, 'Viewer');
  assert.equal(savedOlivia.status, 'Suspended');
  assert.equal(savedOlivia.plan, 'Starter');
  assert(savedOlivia.notes.includes('quarterly'));
  await page.reload();
  await page.getByRole('row', { name: 'Olivia Rhye', exact: true }).click();
  panel = page.getByRole('dialog', { name: 'Olivia Rhye', exact: true });
  await expect(panel.getByRole('textbox', { name: /Internal notes/ })).toHaveValue(
    'Regression: prefers quarterly account reviews.',
  );
  await panel.getByRole('button', { name: 'Done', exact: true }).click();
  passed(
    'Keyboard row opening, autosaved profile edits, Escape/focus return and reload persistence',
  );

  const addButton = page.getByRole('button', { name: 'Add user', exact: true });
  await addButton.click();
  let dialog = page.getByRole('dialog', { name: 'Add user', exact: true });
  await dialog.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(dialog.getByText('Enter the user’s full name.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /Full name/ })).toBeFocused();
  await dialog.getByRole('textbox', { name: /Full name/ }).fill('QA Account');
  await dialog.getByRole('textbox', { name: /Email address/ }).fill('OLIVIA.RHYE@example.com');
  await dialog.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(
    dialog.getByText('A user with this email already exists.', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /Email address/ })).toBeFocused();
  await dialog.getByRole('textbox', { name: /Email address/ }).fill('qa.account@example.com');
  await dialog.getByRole('textbox', { name: /Company/ }).fill('QA Studio');
  await dialog.getByRole('textbox', { name: /Location/ }).fill('Athens, GR');
  await select(dialog.getByRole('combobox', { name: 'Role', exact: true }), 'Admin');
  await select(dialog.getByRole('combobox', { name: 'Plan', exact: true }), 'Business');
  await axe('Add user modal');
  await dialog.getByRole('button', { name: 'Create user', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(addButton).toBeFocused();
  await expect(page.getByRole('row', { name: 'QA Account', exact: true })).toBeVisible();
  assert.equal((await stored()).users.length, 29);
  await page.reload();
  await expect(page.getByRole('row', { name: 'QA Account', exact: true })).toBeVisible();
  await addButton.click();
  dialog = page.getByRole('dialog', { name: 'Add user', exact: true });
  await dialog.getByRole('textbox', { name: /Full name/ }).fill('Unsaved draft');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(addButton).toBeFocused();
  assert.equal((await stored()).users.length, 29);
  passed('Required/duplicate validation, create, refresh persistence and cancellation focus');

  const beforeDelete = await stored();
  const savedInvoices = beforeDelete.invoices.filter((invoice) => invoice.userId === 'usr-1');
  assert(savedInvoices.length > 0, 'Delete test covers a user with existing invoices');
  await page.getByRole('row', { name: 'Olivia Rhye', exact: true }).click();
  panel = page.getByRole('dialog', { name: 'Olivia Rhye', exact: true });
  await panel.getByRole('button', { name: 'Delete user', exact: true }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Olivia Rhye?', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(confirm).not.toBeVisible();
  await expect(panel.getByRole('button', { name: 'Delete user', exact: true })).toBeFocused();
  assert.equal((await stored()).users.length, 29);
  await panel.getByRole('button', { name: 'Delete user', exact: true }).click();
  await confirm.getByRole('button', { name: 'Delete user', exact: true }).click();
  await expect(confirm).not.toBeVisible();
  await expect(panel).not.toBeVisible();
  await expect(search()).toBeFocused();
  const afterDelete = await stored();
  assert(!afterDelete.users.some((user) => user.id === 'usr-1'));
  assert.deepEqual(afterDelete.invoices, beforeDelete.invoices);
  await page.reload();
  assert.equal((await stored()).users.length, 28);
  await expect(page.getByRole('row', { name: 'Olivia Rhye', exact: true })).toHaveCount(0);
  passed('Delete cancel/confirm, focus recovery, persistence and unchanged invoice snapshots');

  await addButton.click();
  dialog = page.getByRole('dialog', { name: 'Add user', exact: true });
  await dialog.getByRole('textbox', { name: /Full name/ }).fill('Theme-safe draft');
  const geometry = [];
  for (const presentation of ['fundamental', 'fundamental-floating']) {
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        ({ presentation, theme }) => {
          document.documentElement.dataset.layoutTheme = presentation;
          document.documentElement.dataset.theme = theme;
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.style.colorScheme = theme;
        },
        { presentation, theme },
      );
      await expect(dialog.getByRole('textbox', { name: /Full name/ })).toHaveValue(
        'Theme-safe draft',
      );
      geometry.push(
        await dialog.getByRole('textbox', { name: /Full name/ }).evaluate((el) => ({
          height: el.getBoundingClientRect().height,
          fontSize: getComputedStyle(el).fontSize,
        })),
      );
      await axe(`${presentation}/${theme} Add user`);
    }
  }
  assert(
    geometry.every((item) => JSON.stringify(item) === JSON.stringify(geometry[0])),
    'Theme geometry is invariant',
  );
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('Mobile Users');
  await capture('users-mobile-dark');
  await axe('Mobile dark Users');
  await page.getByRole('row', { name: 'QA Account', exact: true }).focus();
  await page.keyboard.press('Enter');
  panel = page.getByRole('dialog', { name: 'QA Account', exact: true });
  await expect(panel).toBeVisible();
  assert(
    await panel.evaluate((el) => el.getBoundingClientRect().width <= innerWidth),
    'Mobile sheet fits viewport',
  );
  await capture('user-details-mobile-dark');
  await axe('Mobile dark detail panel');
  await page.keyboard.press('Escape');
  await addButton.click();
  dialog = page.getByRole('dialog', { name: 'Add user', exact: true });
  assert(
    await dialog.evaluate((el) => el.getBoundingClientRect().width <= innerWidth),
    'Mobile modal fits viewport',
  );
  await axe('Mobile add user modal');
  await page.keyboard.press('Escape');
  passed(
    'Four presentation/mode mappings preserve drafts and field geometry; mobile grid and overlays fit',
  );
  assert.deepEqual(report.browserErrors, [], 'No browser runtime errors');
  assert(
    report.accessibility.every(({ violations }) => violations.length === 0),
    'All accessibility checks pass (see report)',
  );
  console.log(
    `Verified ${report.checks.length} user workflow groups and ${report.accessibility.length} accessibility views.`,
  );
} catch (error) {
  report.failure = error.stack;
  await capture('failure').catch(() => {});
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await context.close();
  await browser.close();
}
