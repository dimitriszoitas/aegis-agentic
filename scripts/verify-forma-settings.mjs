import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.FORMA_URL || 'http://127.0.0.1:4176/?view=product';
const output = 'artifacts/forma-settings';
await mkdir(output, { recursive: true });
const report = {
  base,
  checks: [],
  accessibility: [],
  overflows: [],
  browserErrors: [],
  screenshots: [],
};
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1512, height: 1100 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const passed = (name) => {
  report.checks.push(name);
  console.log(`✓ ${name}`);
};
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('forma-workspace-v1')));
async function capture(name) {
  const path = `${output}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}
async function navigate(name) {
  const open = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await open.isVisible()) {
    await open.click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(page.getByRole('dialog', { name: 'Your workspace' })).not.toBeVisible();
  } else {
    await page
      .locator('.forma-sidebar')
      .getByRole('button', { name: new RegExp(`^${name}(?:$|\\s)`) })
      .click();
  }
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
}
async function appearance(mode) {
  await page.getByRole('radio', { name: mode === 'dark' ? 'Dark' : 'Light', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
}
async function audit(label) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector('.forma-main');
    return {
      viewport: innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      mainWidth: main.clientWidth,
      mainScroll: main.scrollWidth,
      offenders: [...document.querySelectorAll('.forma-main *')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.right > innerWidth + 1 &&
            getComputedStyle(element).position !== 'absolute'
          );
        })
        .slice(0, 12)
        .map((element) => ({ tag: element.tagName, className: element.className })),
    };
  });
  report.overflows.push({ label, ...overflow });
  const results = await new AxeBuilder({ page })
    .exclude('[data-base-ui-focus-guard]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    label,
    violations: results.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  });
}
try {
  await page.goto(base);
  await navigate('Settings');
  await page.evaluate(() => document.fonts.ready);
  const initial = await stored();
  const workspace = page.getByRole('textbox', { name: /Workspace name/ });
  const email = page.getByRole('textbox', { name: /Contact email/ });
  const save = page.getByRole('button', { name: 'Save changes', exact: true });
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  await expect(workspace).toHaveValue(initial.settings.workspace);
  await expect(save).toBeDisabled();
  await capture('settings-desktop-dark');
  await audit('Desktop dark settings');

  await workspace.fill('Unsaved workspace draft');
  await email.fill('draft@example.com');
  await appearance('light');
  await expect(workspace).toHaveValue('Unsaved workspace draft');
  await expect(email).toHaveValue('draft@example.com');
  await page.getByRole('radio', { name: 'Compact', exact: true }).check();
  await expect(workspace).toHaveValue('Unsaved workspace draft');
  assert.equal((await stored()).settings.workspace, initial.settings.workspace);
  await cancel.click();
  await expect(workspace).toHaveValue(initial.settings.workspace);
  await expect(email).toHaveValue(initial.settings.email);
  await expect(save).toBeDisabled();
  passed(
    'Workspace drafts survive immediate appearance/density changes; Cancel restores saved fields without discarding preferences.',
  );

  await workspace.fill('   ');
  await email.fill('invalid-address');
  await save.click();
  await expect(page.getByText('Enter a workspace name.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter a valid contact email.', { exact: true })).toBeVisible();
  await expect(workspace).toBeFocused();
  assert.equal((await stored()).settings.workspace, initial.settings.workspace);
  await workspace.fill('  Forma Quality Studio  ');
  await save.click();
  await expect(email).toBeFocused();
  await email.fill('  quality@example.com  ');
  await save.click();
  await expect(workspace).toHaveValue('Forma Quality Studio');
  await expect(email).toHaveValue('quality@example.com');
  await expect(save).toBeDisabled();
  await expect(page.locator('.forma-sidebar')).toContainText('Forma Quality Studio');
  await expect(page.locator('.forma-topbar-workspace')).toHaveText('Forma Quality Studio');
  passed(
    'Invalid fields block saving and receive focus; valid trimmed details update navigation and the workspace.',
  );

  await page.getByRole('combobox', { name: 'Display currency', exact: true }).click();
  await page.getByRole('option', { name: 'EUR — Euro', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(workspace).toHaveValue('Forma Quality Studio');
  await expect(email).toHaveValue('quality@example.com');
  await expect(page.getByRole('radio', { name: 'Light', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Compact', exact: true })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Display currency', exact: true })).toContainText(
    'EUR',
  );
  await capture('settings-desktop-light');
  await audit('Desktop light settings');
  await navigate('Users');
  await expect(page.locator('.aegis-data-grid')).toHaveAttribute('data-density', 'compact');
  await navigate('Products');
  await expect(page.locator('.forma-product-card').first()).toContainText('€');
  assert.equal((await stored()).products[0].price, initial.products[0].price);
  await navigate('Settings');
  passed(
    'Workspace details, light appearance, compact density and EUR persist through refresh; user grid and product prices consume those preferences without currency conversion.',
  );

  const expectedExport = await stored();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workspace', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^forma-workspace-\d{4}-\d{2}-\d{2}\.json$/);
  assert.deepEqual(JSON.parse(await readFile(await download.path(), 'utf8')), expectedExport);
  passed('Workspace JSON download contains all current records and settings.');

  for (const mode of ['dark', 'light']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await appearance(mode);
    await workspace.fill(`Mobile ${mode} draft`);
    await page.locator('.forma-main').evaluate((element) => element.scrollTo({ top: 0 }));
    await capture(`settings-mobile-${mode}-top`);
    await audit(`Mobile ${mode} settings`);
    await page
      .getByRole('combobox', { name: 'Display currency', exact: true })
      .scrollIntoViewIfNeeded();
    await capture(`settings-mobile-${mode}-preferences`);
    await expect(workspace).toHaveValue(`Mobile ${mode} draft`);
    await cancel.click();
    const opener = page.getByRole('button', { name: 'Open navigation', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Your workspace', exact: true })).toBeVisible();
    await audit(`Mobile ${mode} navigation dialog`);
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('dialog', { name: 'Your workspace', exact: true }),
    ).not.toBeVisible();
    await expect(opener).toBeFocused();
    for (const name of ['Dashboard', 'Users', 'Products', 'Invoices', 'Settings'])
      await navigate(name);
  }
  passed(
    'At 390px, both appearances retain editable settings and all five mobile navigation destinations work; Escape restores navigation-trigger focus.',
  );

  const reset = page.getByRole('button', { name: 'Reset demo data', exact: true });
  await reset.click();
  let dialog = page.getByRole('alertdialog', { name: 'Reset this demo workspace?', exact: true });
  await expect(dialog.getByRole('button', { name: 'Reset demo data', exact: true })).toBeDisabled();
  await audit('Mobile reset confirmation');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(reset).toBeFocused();
  assert.equal((await stored()).settings.workspace, 'Forma Quality Studio');
  await reset.click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(reset).toBeFocused();
  passed(
    'Reset requires explicit confirmation; Cancel and Escape preserve the workspace and return focus.',
  );

  // Isolated browser fixture: remove one record from each collection to prove reset restores records too.
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('forma-workspace-v1'));
    state.users.pop();
    state.products.pop();
    state.invoices.pop();
    localStorage.setItem('forma-workspace-v1', JSON.stringify(state));
  });
  await page.reload();
  await reset.click();
  dialog = page.getByRole('alertdialog', { name: 'Reset this demo workspace?', exact: true });
  const confirmation = dialog.getByRole('textbox', { name: 'Type RESET to confirm', exact: true });
  await confirmation.fill('reset');
  await expect(dialog.getByRole('button', { name: 'Reset demo data', exact: true })).toBeDisabled();
  await confirmation.fill('RESET');
  await dialog.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(workspace).toHaveValue(initial.settings.workspace);
  await expect(email).toHaveValue(initial.settings.email);
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Comfortable', exact: true })).toBeChecked();
  const restored = await stored();
  assert.deepEqual(restored.settings, initial.settings);
  assert.equal(restored.users.length, initial.users.length);
  assert.equal(restored.products.length, initial.products.length);
  assert.equal(restored.invoices.length, initial.invoices.length);
  await page.reload();
  assert.deepEqual((await stored()).settings, initial.settings);
  passed(
    'Exact RESET confirmation restores original records and preferences; reset persists after refresh.',
  );

  assert.deepEqual(report.browserErrors, [], 'No browser runtime errors');
  const failures = report.overflows.filter(
    (entry) => entry.pageWidth > entry.viewport + 1 || entry.mainScroll > entry.mainWidth + 1,
  );
  assert.deepEqual(failures, [], 'Settings and navigation fit viewport and main scroll region');
  assert.deepEqual(
    report.accessibility.filter((entry) => entry.violations.length),
    [],
    'Accessibility scans have no WCAG A/AA violations',
  );
  passed(
    'No page overflow, browser runtime errors or automated WCAG A/AA accessibility violations in the checked settings/navigation states.',
  );
} catch (error) {
  report.failure = error.stack;
  await capture('failure');
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
