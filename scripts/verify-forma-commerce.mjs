import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setCollectionFilter } from './forma-filter-browser-helpers.mjs';

const base = process.env.FORMA_URL || 'http://127.0.0.1:4176/?view=product';
const output = 'artifacts/forma-commerce';
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
async function navigate(name) {
  if (await page.getByRole('button', { name: 'Open navigation', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name, exact: true })
      .click();
  } else await page.locator('.forma-sidebar').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
}
async function select(control, option) {
  await control.click();
  await page
    .getByRole('option', {
      name: new RegExp(`^${option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`),
    })
    .click();
}
async function download(button, expected) {
  const pending = page.waitForEvent('download');
  await button.click();
  const file = await pending;
  const text = await readFile(await file.path(), 'utf8');
  assert(text.includes(expected), `Downloaded ${file.suggestedFilename()} contains ${expected}`);
  return text;
}
async function noOverflow(label) {
  assert(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.querySelector('.forma-main').scrollWidth <=
          document.querySelector('.forma-main').clientWidth + 1,
    ),
    `${label} fits viewport and main scroll region`,
  );
}
async function capture(name) {
  const path = `${output}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}
async function axe(label) {
  const results = await new AxeBuilder({ page })
    .exclude('[data-base-ui-focus-guard]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    label,
    violations: results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  });
  assert.deepEqual(
    results.violations.map(({ id }) => id),
    [],
    label,
  );
}
try {
  await page.goto(base);
  await navigate('Products');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.forma-product-card')).toHaveCount(8);
  await noOverflow('Desktop catalog');
  await capture('products-desktop');
  await axe('Dark product catalog');
  await page.getByRole('button', { name: 'Add product', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Add product', exact: true });
  await dialog.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(dialog.getByText('Enter a product name.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Enter a SKU.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: /Product name/ })).toBeFocused();
  await dialog.getByRole('textbox', { name: /Product name/ }).fill('Regression analytics');
  await dialog.getByRole('textbox', { name: /SKU/ }).fill('FRM-PRO');
  await dialog.getByRole('spinbutton', { name: /Price/ }).fill('-1');
  await dialog.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(dialog.getByText('This SKU is already used by another product.')).toBeVisible();
  await expect(dialog.getByText('Enter a price between 0 and 1,000,000.')).toBeVisible();
  await dialog.getByRole('textbox', { name: /SKU/ }).fill('QA-ANALYTICS');
  await dialog.getByRole('spinbutton', { name: /Price/ }).fill('25.50');
  await dialog
    .getByRole('textbox', { name: /Description/ })
    .fill('A locally saved product for regression verification.');
  await select(dialog.getByRole('combobox', { name: /Category/ }), 'Add-on');
  await dialog.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  let product = page
    .locator('.forma-product-card')
    .filter({ has: page.getByRole('heading', { name: 'Regression analytics', exact: true }) });
  await expect(product).toContainText('$25.50');
  await page.getByRole('searchbox', { name: 'Search products' }).fill('QA-ANALYTICS');
  await expect(page.locator('.forma-product-card')).toHaveCount(1);
  await download(page.getByRole('button', { name: 'Export', exact: true }), 'QA-ANALYTICS');
  await product.getByRole('button', { name: 'Edit Regression analytics', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Edit product', exact: true });
  await dialog.getByRole('spinbutton', { name: /Price/ }).fill('27.50');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(product).toContainText('$27.50');
  await product.getByRole('button', { name: 'Archive Regression analytics', exact: true }).click();
  await setCollectionFilter(page, 'products', 'Status', ['Active']);
  await expect(page.getByRole('heading', { name: 'No products found', exact: true })).toBeVisible();
  await setCollectionFilter(page, 'products', 'Status', ['Archived']);
  await expect(product).toContainText('Archived');
  await product
    .getByRole('button', { name: 'Reactivate Regression analytics', exact: true })
    .click();
  await setCollectionFilter(page, 'products', 'Status', ['Active']);
  await expect(product).toContainText('Active');
  await setCollectionFilter(page, 'products', 'Category', ['Service']);
  await expect(page.getByRole('heading', { name: 'No products found', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.locator('.forma-product-card')).toHaveCount(9);
  passed(
    'Product required fields, duplicate SKU and price validation; create, edit, archive/reactivate, search/category/status filters and CSV export.',
  );

  await navigate('Invoices');
  await noOverflow('Desktop invoices');
  await capture('invoices-desktop');
  await axe('Dark invoice grid');
  await page.getByRole('button', { name: 'Create invoice', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Create invoice', exact: true });
  await dialog.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await expect(dialog.getByText('Choose a customer.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Choose an active product.', { exact: true })).toBeVisible();
  await select(dialog.getByRole('combobox', { name: /Customer/ }), 'Olivia Rhye');
  await select(dialog.getByRole('combobox', { name: /Product/ }), 'Regression analytics');
  const dueInput = dialog.getByLabel(/Due date/);
  const originalDue = await dueInput.inputValue();
  await dueInput.fill('2000-01-01');
  await dialog.getByRole('spinbutton', { name: /Quantity/ }).fill('0');
  await dialog.getByRole('button', { name: 'Create invoice', exact: true }).click();
  await expect(dialog.getByText('Enter a whole quantity from 1 to 10,000.')).toBeVisible();
  await expect(dialog.getByText('Choose today or a future due date.')).toBeVisible();
  await dueInput.fill(originalDue);
  await dialog.getByRole('spinbutton', { name: /Quantity/ }).fill('3');
  await expect(dialog.locator('.forma-invoice-total')).toContainText('$82.50');
  await axe('Create invoice dialog');
  await dialog.getByRole('button', { name: 'Create invoice', exact: true }).click();
  const invoiceNumber = await page.evaluate(
    () => JSON.parse(localStorage.getItem('forma-workspace-v1')).invoices[0].number,
  );
  let sheet = page.getByRole('dialog', { name: invoiceNumber, exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.forma-invoice-total')).toContainText('$82.50');
  await expect(sheet.getByRole('table')).toContainText('Regression analytics');
  await capture('invoice-detail');
  await axe('Invoice detail sheet');
  await download(sheet.getByRole('button', { name: 'Export invoice', exact: true }), invoiceNumber);
  await sheet.getByRole('button', { name: 'Mark as paid', exact: true }).click();
  await expect(sheet.getByText('Paid', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Mark as paid', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet).not.toBeVisible();
  await page.getByRole('searchbox', { name: 'Search invoices' }).fill(invoiceNumber);
  await setCollectionFilter(page, 'invoices', 'Status', ['Paid']);
  await expect(
    page.getByRole('row', { name: `${invoiceNumber}, Olivia Rhye`, exact: true }),
  ).toBeVisible();
  const invoiceCsv = await download(
    page.getByRole('button', { name: 'Export', exact: true }),
    invoiceNumber,
  );
  assert(invoiceCsv.includes('82.5'));
  const selectedInvoice = page.getByRole('checkbox', {
    name: `Select ${invoiceNumber}, Olivia Rhye`,
    exact: true,
  });
  await selectedInvoice.check();
  await download(page.getByRole('button', { name: 'Export selected', exact: true }), invoiceNumber);
  await expect(
    page.getByRole('button', { name: 'Mark selected paid', exact: true }),
  ).toBeDisabled();
  await selectedInvoice.uncheck();
  await setCollectionFilter(page, 'invoices', 'Status', ['Pending']);
  await expect(page.getByText('No invoices found', { exact: true })).toBeVisible();
  passed(
    'Invoice missing-field and quantity validation, creation with saved customer/product, calculated total, detail sheet, paid status, filters and CSV downloads.',
  );

  await navigate('Products');
  product = page
    .locator('.forma-product-card')
    .filter({ has: page.getByRole('heading', { name: 'Regression analytics', exact: true }) });
  await product.getByRole('button', { name: 'Edit Regression analytics', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Edit product', exact: true });
  await dialog.getByRole('textbox', { name: /Product name/ }).fill('Regression analytics revised');
  await dialog.getByRole('spinbutton', { name: /Price/ }).fill('99');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.reload();
  await expect(
    page.locator('.forma-product-card').filter({
      has: page.getByRole('heading', { name: 'Regression analytics revised', exact: true }),
    }),
  ).toContainText('$99.00');
  await navigate('Invoices');
  await page.getByRole('searchbox', { name: 'Search invoices' }).fill(invoiceNumber);
  await page.getByRole('row', { name: `${invoiceNumber}, Olivia Rhye`, exact: true }).click();
  sheet = page.getByRole('dialog', { name: invoiceNumber, exact: true });
  await expect(sheet.getByRole('table')).toContainText('Regression analytics');
  await expect(sheet.getByRole('table')).not.toContainText('revised');
  await expect(sheet.locator('.forma-invoice-total')).toContainText('$82.50');
  await expect(sheet.getByText('Paid', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  passed(
    'Refresh preserves records; later product name/price changes leave the invoice snapshot and paid status intact.',
  );

  for (const mode of ['dark', 'light']) {
    if (mode === 'light')
      await page.getByRole('button', { name: 'Switch to light mode', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate('Products');
    await noOverflow(`${mode} mobile products`);
    await capture(`products-mobile-${mode}`);
    await axe(`${mode} mobile products`);
    await page.getByRole('button', { name: 'Add product', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Add product', exact: true });
    await expect(dialog).toBeVisible();
    assert(
      await dialog.evaluate((element) => element.getBoundingClientRect().right <= innerWidth),
      'Product dialog fits mobile viewport',
    );
    await page.keyboard.press('Escape');
    await navigate('Invoices');
    await noOverflow(`${mode} mobile invoices`);
    await capture(`invoices-mobile-${mode}`);
    await axe(`${mode} mobile invoices`);
    await page.getByRole('searchbox', { name: 'Search invoices' }).fill(invoiceNumber);
    await page.getByRole('row', { name: `${invoiceNumber}, Olivia Rhye`, exact: true }).click();
    sheet = page.getByRole('dialog', { name: invoiceNumber, exact: true });
    await expect(sheet).toBeVisible();
    assert(
      await sheet.evaluate((element) => element.getBoundingClientRect().right <= innerWidth),
      'Invoice side sheet fits mobile viewport',
    );
    await capture(`invoice-detail-mobile-${mode}`);
    await page.keyboard.press('Escape');
  }
  passed(
    'Dark/light mobile catalog, invoice grid, product modal and invoice side sheet fit 390px without page overflow.',
  );
  assert.deepEqual(report.browserErrors, []);
  passed('No browser runtime errors during commerce workflows.');
} catch (error) {
  report.failure = error.stack;
  await capture('failure');
  throw error;
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
