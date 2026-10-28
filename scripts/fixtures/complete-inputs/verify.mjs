import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(root, 'artifacts/complete-inputs');
await mkdir(output, { recursive: true });
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 0 },
  logLevel: 'error',
});
await server.listen();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await context.newPage();
const report = {
  status: 'running',
  checks: [],
  matrix: [],
  errors: [],
  limits: [
    'Source fixture, not a packed consumer or evidence of operating-system autofill UI. Native picker presentation depends on the browser.',
  ],
};
page.on('pageerror', (error) => report.errors.push(error.message));
await page.routeWebSocket('**', (socket) => socket.close());
const passed = (check) => {
  report.checks.push(check);
  console.log(check);
};
const paste = async (input, text) =>
  input.evaluate((node, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', value);
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, text);
try {
  await page.goto(`${server.resolvedUrls.local[0]}scripts/fixtures/complete-inputs/index.html`);
  const combo = page.getByRole('combobox', { name: 'Destination', exact: true });
  await combo.fill('hellas');
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await expect(combo).toHaveValue('Athens');
  await expect(page.locator('input[name="city"]')).toHaveValue('ath');
  await page
    .locator('#destination')
    .locator('..')
    .getByRole('button', { name: 'Clear selection' })
    .click();
  await expect(combo).toHaveValue('');
  await combo.fill('Rome');
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await expect(page.locator('input[name="city"]')).toHaveValue('');
  await combo.press('Escape');
  passed(
    'Single selection: keyword matching, stable form IDs, clear, disabled option and keyboard dismissal.',
  );
  const remote = page.getByRole('combobox', { name: 'Remote destination', exact: true });
  await remote.fill('zz');
  await expect(remote).toHaveAttribute('aria-busy', 'true');
  await remote.press('Escape');
  await page.getByRole('button', { name: 'Deliver results' }).click();
  await remote.click();
  await remote.press('ArrowDown');
  await remote.press('Enter');
  await expect(remote).toHaveValue('Athens');
  const guard = page.getByRole('combobox', { name: 'Guarded city', exact: true });
  await guard.click();
  await guard.fill('');
  await expect(page.getByLabel('Cancelled selection', { exact: true })).toHaveText(
    'null:input-clear:true',
  );
  await expect(guard).toHaveValue('');
  await guard.pressSequentially('Berlin');
  await expect(page.getByRole('option', { name: 'Berlin', exact: true })).toBeVisible();
  await guard.press('ArrowDown');
  await expect(guard).toHaveAttribute('aria-activedescendant', /.+/);
  await guard.press('Enter');
  await expect(page.getByLabel('Cancelled selection', { exact: true })).toHaveText(
    'ber:item-press:true',
  );
  await expect(page.locator('input[name="guarded-city"]')).toHaveValue('ath');
  await expect(guard).toHaveValue('Berlin');
  await expect(guard).toHaveAttribute('aria-expanded', 'true');
  await guard.press('Escape');
  await expect(guard).toHaveValue('Athens');
  await guard.fill('Berlin');
  await page.getByRole('option', { name: 'Berlin', exact: true }).click();
  await expect(page.getByLabel('Cancelled selection', { exact: true })).toHaveText(
    'ber:item-press:true',
  );
  await expect(page.locator('input[name="guarded-city"]')).toHaveValue('ath');
  await guard.press('Tab');
  await expect(guard).toHaveValue('Athens');
  passed(
    'Remote results bypass filtering; keyboard and pointer cancellation preserve the selected form ID, retain the open query and restore the selected label on dismissal.',
  );
  const otp = page.getByRole('textbox', { name: 'Code', exact: true });
  await otp.click();
  await paste(otp, '01 23-45');
  await expect(otp).toHaveValue('012345');
  await expect(page.getByLabel('Completed', { exact: true })).toHaveText('012345');
  await expect(page.getByLabel('Native changes')).toHaveText('1');
  await page.getByRole('button', { name: 'Reset code' }).click();
  await expect(otp).toHaveValue('');
  await otp.pressSequentially('1a2b');
  await expect(otp).toHaveValue('12');
  await otp.press('Backspace');
  await expect(otp).toHaveValue('1');
  const alpha = page.getByRole('textbox', { name: 'Alphanumeric code' });
  await paste(alpha, 'ab-9z');
  await expect(alpha).toHaveValue('AB9Z');
  await expect(page.getByRole('textbox', { name: 'Locked code' })).toHaveAttribute('readonly', '');
  passed(
    'OTP: full-paste normalization, leading zeroes, native callback, host reset, keyboard deletion and alphanumeric candidate.',
  );
  const time = page.getByLabel('Opening time', { exact: true });
  await time.fill('14:45');
  await time.press('ArrowUp');
  assert.notEqual(await time.inputValue(), '14:45');
  await time.fill('07:30');
  assert.equal(await time.evaluate((n) => n.checkValidity()), false);
  await time.fill('14:45');
  const date = page.getByLabel('Appointment', { exact: true });
  await date.fill('2027-11-07T01:30');
  await expect(date).toHaveValue('2027-11-07T01:30');
  await expect(date).toHaveAccessibleDescription('Time zone: Europe/Athens.');
  passed(
    'Native time: keyboard segments and constraints; date/time preserves offset-free value and announces explicit zone.',
  );
  const phone = page.getByRole('textbox', { name: 'Telephone', exact: true });
  await phone.fill('(202) 555-0123');
  await phone.press('Tab');
  await expect(phone).toHaveValue('(202) 555-0123');
  await expect(page.getByLabel('Phone candidate')).toContainText('"e164":"+12025550123"');
  const normalized = page.getByRole('textbox', { name: 'Normalized telephone', exact: true });
  await normalized.click();
  await normalized.press('Tab');
  await expect(normalized).toHaveValue('+1 202 555 0123');
  passed('Phone: raw draft preservation, separate E.164 candidate, opt-in blur normalization.');
  const hex = page.getByRole('textbox', { name: 'Brand color', exact: true });
  await hex.fill('not-a-color');
  await hex.press('Tab');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Committed color')).toHaveText('#1565C0FF');
  await hex.fill('#f008');
  await hex.press('Enter');
  await expect(hex).toHaveValue('#FF000088');
  await page.getByRole('button', { name: 'Blue', exact: true }).click();
  await expect(hex).toHaveValue('#1565C0FF');
  await page.getByRole('textbox', { name: 'Opacity percent', exact: true }).fill('50');
  await page.getByRole('textbox', { name: 'Opacity percent', exact: true }).press('Tab');
  await expect(hex).toHaveValue('#1565C080');
  passed(
    'Color: invalid drafts retained, explicit commit, alpha quantization, named swatch selection.',
  );
  await otp.fill('123456');
  await page.getByRole('button', { name: 'Submit inputs' }).click();
  await expect(page.getByLabel('Form data')).toContainText('["code","123456"]');
  await expect(page.getByLabel('Form data')).toContainText('["phone","(202) 555-0123"]');
  await expect(page.getByLabel('Form data')).toContainText('["color","#1565C080"]');
  await expect(page.getByLabel('Form data')).toContainText('["guarded-city","ath"]');
  passed('Native form combines one value per named input and respects raw/canonical policies.');
  for (const layout of ['fundamental', 'fundamental-floating'])
    for (const mode of ['light', 'dark'])
      for (const width of [1100, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          ({ layout, mode }) => {
            document.documentElement.dataset.layoutTheme = layout;
            document.documentElement.classList.toggle('dark', mode === 'dark');
          },
          { layout, mode },
        );
        await page.evaluate(() => document.fonts.ready);
        await expect(hex).toHaveValue('#1565C080');
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          true,
        );
        await page.evaluate(async () => {
          await Promise.all(
            document
              .getAnimations()
              .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
              .map((a) => a.finished.catch(() => {})),
          );
        });
        const axe = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(axe.violations, []);
        const metrics = await combo.evaluate((node) => ({
          height: node.getBoundingClientRect().height,
          fontSize: getComputedStyle(node).fontSize,
        }));
        report.matrix.push({ layout, mode, width, axeViolations: 0, metrics });
        await page.screenshot({
          path: resolve(output, `${layout}-${mode}-${width}.png`),
          fullPage: true,
        });
      }
  assert.deepEqual(report.errors, []);
  for (const entry of report.matrix) assert.deepEqual(entry.metrics, report.matrix[0].metrics);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await server.close();
}
