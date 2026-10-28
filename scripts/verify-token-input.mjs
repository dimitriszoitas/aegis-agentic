import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.AGENTIC_URL || 'http://127.0.0.1:4183';
const output = 'artifacts/token-input-consolidated';
const registry = JSON.parse(
  await readFile(new URL('../registry/canonical.json', import.meta.url), 'utf8'),
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
// Isolate this run from unrelated source edits in the shared development checkout.
await page.routeWebSocket('**', (socket) => socket.close());
const report = {
  schemaVersion: 1,
  contractVersion: 2,
  registryRevision: registry.revision,
  checks: [],
  accessibility: [],
  browserErrors: [],
  screenshots: [],
};
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const passed = (message) => {
  report.checks.push(message);
  console.log(message);
};
const paste = async (locator, text) =>
  locator.evaluate((node, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', value);
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  }, text);
try {
  await page.goto(`${base}/scripts/fixtures/token-input-consolidated.html`);
  const labels = page.getByRole('textbox', { name: 'Project labels', exact: true });
  const root = page.getByTestId('token-input').filter({ has: labels });
  await labels.fill('Marketing, Europe');
  await labels.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Remove Marketing, Europe', exact: true }),
  ).toBeVisible();
  await expect(labels).toHaveValue('');
  await paste(labels, ' valid \ninvalid\tother');
  await expect(labels).toHaveValue(' valid \ninvalid\tother');
  await expect(root.getByRole('alert')).toContainText('Invalid label');
  await expect(page.getByRole('button', { name: 'Remove valid', exact: true })).toHaveCount(0);
  await labels.fill('valid\nother');
  await labels.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove valid', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove other', exact: true })).toBeVisible();
  passed(
    'Literal commas, atomic newline/tab validation, exact multiline draft retention and correction.',
  );
  await labels.fill('draft stays');
  await page.getByRole('button', { name: 'Add suggestion Suggested', exact: true }).click();
  await expect(labels).toHaveValue('draft stays');
  await expect(page.getByRole('button', { name: 'Remove Suggested', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Outside control', exact: true }).click();
  await expect(labels).toHaveValue('draft stays');
  await labels.fill('Cafe\u0301');
  await labels.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove Café', exact: true })).toBeVisible();
  await labels.fill('CAFÉ');
  await labels.press('Enter');
  await expect(root.getByRole('alert')).toContainText('already added');
  await expect(labels).toHaveValue('CAFÉ');
  passed('Suggestion buttons preserve draft; blur is inert; NFC/case duplicate rejection.');
  const ignore = page.getByRole('textbox', { name: 'Ignore duplicates', exact: true });
  await paste(ignore, 'ALPHA\nBeta\nbeta');
  await expect(ignore).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Remove Beta', exact: true })).toBeVisible();
  await expect(
    page.getByTestId('token-input').filter({ has: ignore }).getByRole('status'),
  ).toContainText('2 duplicates skipped');
  passed('Explicit ignore policy announces exact skipped count.');
  await labels.fill('composing');
  await labels.dispatchEvent('compositionstart');
  await labels.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove composing', exact: true })).toHaveCount(0);
  await labels.dispatchEvent('compositionend');
  await labels.fill('composing');
  await labels.evaluate((node) =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }),
    ),
  );
  await expect(page.getByRole('button', { name: 'Remove composing', exact: true })).toHaveCount(0);
  await labels.fill('');
  await labels.press('Backspace');
  await labels.evaluate((node) =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Backspace',
        repeat: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  await expect(page.getByRole('button', { name: 'Remove Café', exact: true })).toBeVisible();
  await labels.press('Escape');
  await labels.press('Backspace');
  await labels.press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove Café', exact: true })).toHaveCount(0);
  passed(
    'Composition-state and 229 guards; repeated key never deletes; two distinct Backspaces remove.',
  );
  const asyncInput = page.getByRole('textbox', { name: 'Async labels', exact: true });
  const asyncRoot = page.getByTestId('token-input').filter({ has: asyncInput });
  await asyncInput.fill('first');
  await asyncInput.press('Enter');
  await asyncInput.press('Enter');
  await expect(page.getByText('Async requests: 1', { exact: true })).toBeVisible();
  await asyncRoot.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await asyncInput.fill('second');
  await asyncInput.press('Enter');
  await page.getByRole('button', { name: 'Accept first stale', exact: true }).click();
  await page.getByRole('button', { name: 'Reject first stale', exact: true }).click();
  await expect(asyncInput).toHaveValue('second');
  await expect(asyncRoot.getByRole('button', { name: 'Keep editing', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Echo without acknowledgment', exact: true }).click();
  await expect(asyncInput).toHaveValue('second');
  await page.getByRole('button', { name: 'Accept latest', exact: true }).click();
  await expect(asyncInput).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Accept latest', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Remove first', exact: true })).toHaveCount(0);
  passed(
    'Request IDs reject stale acceptance/refusal; ordered values alone cannot settle request mode; host honors abort.',
  );
  await asyncInput.fill('third');
  await asyncInput.press('Enter');
  await asyncInput.fill('changed');
  await asyncInput.fill('third');
  await page.getByRole('button', { name: 'Accept latest', exact: true }).click();
  await expect(asyncInput).toHaveValue('third');
  await asyncInput.fill('refused');
  await asyncInput.press('Enter');
  await page.getByRole('button', { name: 'Reject latest', exact: true }).click();
  await expect(asyncInput).toHaveValue('refused');
  await expect(asyncRoot.getByRole('alert')).toContainText('did not accept');
  passed(
    'Delayed acceptance preserves edit-and-restore drafts and outside focus; async rejection retains text.',
  );
  await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
  await expect(labels).toBeDisabled();
  await expect(root.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove Existing', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Add suggestion Suggested', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Toggle disabled', exact: true }).click();
  passed('Disabled input, Add, removal and suggestion actions are inert.');
  for (const width of [1280, 390])
    for (const theme of ['fundamental', 'fundamental-floating'])
      for (const mode of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          ({ theme, mode }) => {
            document.documentElement.dataset.layoutTheme = theme;
            document.documentElement.dataset.theme = mode;
            document.documentElement.classList.toggle('dark', mode === 'dark');
            document.documentElement.style.colorScheme = mode;
          },
          { theme, mode },
        );
        await labels.fill('retained across themes');
        await expect(labels).toHaveValue('retained across themes');
        const result = await new AxeBuilder({ page }).analyze();
        assert.equal(result.violations.length, 0, JSON.stringify(result.violations));
        const overflows = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(overflows, false, `${width}/${theme}/${mode} overflow`);
        report.accessibility.push({ width, theme, mode, violations: 0 });
        const file = `${output}/${width}-${theme}-${mode}.png`;
        await page.screenshot({ path: file, fullPage: true });
        report.screenshots.push(file);
      }
  passed('Eight presentation/mode/viewport scans have no axe violations or document overflow.');
  assert.deepEqual(report.browserErrors, []);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
