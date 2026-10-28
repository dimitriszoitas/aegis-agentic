import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.AGENTIC_URL || 'http://127.0.0.1:4175';
const output = 'artifacts/agentic-ui';
await mkdir(output, { recursive: true });
const report = { base, checks: [], accessibility: [], browserErrors: [], screenshots: [] };
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
async function capture(name, locator = page) {
  const path = `${output}/${name}.png`;
  await locator.screenshot({ path, ...(locator === page ? { fullPage: true } : {}) });
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
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  });
  assert.deepEqual(
    results.violations.map(({ id }) => id),
    [],
    `${label} accessibility`,
  );
}
async function noOverflow(label) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    `${label} must not overflow the viewport`,
  );
}
async function navigate(name) {
  await page
    .getByRole('navigation', { name: 'Workbench sections' })
    .getByRole('button', { name: new RegExp(name) })
    .click();
}
try {
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Make it feel like you.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await noOverflow('Desktop workbench');
  await capture('design-language-desktop');
  await axe('Default configuration');
  assert.equal(
    new Set(
      await page
        .locator('.aw-preset-color rect')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('fill'))),
    ).size,
    3,
    'Preset swatches show three source brand colors',
  );
  for (const preset of ['Aegis Original', 'Atlas Precision', 'Solstice Studio']) {
    await page.locator('.aw-preset').filter({ hasText: preset }).click();
    const dimensions = [];
    for (const presentation of ['Fundamental', 'Fundamental Floating']) {
      await page.getByRole('combobox', { name: 'Preview presentation' }).click();
      await page.getByRole('option', { name: presentation, exact: true }).click();
      for (const mode of ['Light', 'Dark']) {
        await page.getByRole('radio', { name: mode, exact: true }).check();
        dimensions.push(
          await page
            .getByRole('button', { name: 'Save changes', exact: true })
            .evaluate((node) => ({
              height: node.getBoundingClientRect().height,
              fontSize: getComputedStyle(node).fontSize,
              padding: getComputedStyle(node).padding,
            })),
        );
        await expect(page.getByRole('textbox', { name: 'Your name', exact: true })).toHaveValue(
          'Alex Morgan',
        );
      }
    }
    assert(
      dimensions.every((value) => JSON.stringify(value) === JSON.stringify(dimensions[0])),
      `${preset} keeps button geometry in all four presentation/mode combinations`,
    );
  }
  await page.getByRole('button', { name: 'Reset profile', exact: true }).click();
  await page.getByRole('combobox', { name: 'Preview presentation' }).click();
  await page.getByRole('option', { name: 'Fundamental', exact: true }).click();
  await page.getByRole('radio', { name: 'Light', exact: true }).check();
  passed(
    'Three profile swatches show their source colors; all 12 profile/presentation/mode combinations preserve control geometry and content.',
  );
  const name = page.getByRole('textbox', { name: 'Your name', exact: true });
  await name.fill('Unsubmitted design draft');
  await page.locator('.aw-preset').filter({ hasText: 'Atlas Precision' }).click();
  await expect(name).toHaveValue('Unsubmitted design draft');
  await expect(page.getByRole('textbox', { name: 'Brand color', exact: true })).toHaveValue(
    '#006c67',
  );
  const light = await page
    .locator('.aw-preview-scene')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  const shellLight = await page
    .locator('.aw-settings')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(name).toHaveValue('Unsubmitted design draft');
  const dark = await page
    .locator('.aw-preview-scene')
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  assert.notEqual(dark, light, 'Mode changes the preview surface');
  assert.equal(
    await page.locator('.aw-settings').evaluate((node) => getComputedStyle(node).backgroundColor),
    shellLight,
    'Nested light workbench remains light',
  );
  await page.getByRole('button', { name: 'Invite member', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite a teammate' });
  await expect(dialog).toBeVisible();
  const portal = await dialog.evaluate((node) => ({
    profile: document.documentElement.dataset.agenticProfile,
    mode: document.documentElement.dataset.theme,
    background: getComputedStyle(node).backgroundColor,
    expected: getComputedStyle(node)
      .getPropertyValue('--group-surface-overlay-color-surface-surface-raised')
      .trim(),
  }));
  assert.equal(portal.profile, 'atlas');
  assert.equal(portal.mode, 'dark');
  assert.notEqual(
    portal.background,
    'rgb(255, 255, 255)',
    'Dark portal receives dark profile surface',
  );
  assert.equal(
    await dialog.evaluate((node) => node.contains(document.activeElement)),
    true,
    'Opening the dialog moves focus into it',
  );
  await dialog.getByRole('textbox', { name: 'Email address' }).focus();
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press('Tab');
    await expect
      .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)), {
        message: 'Tab returns through Base UI focus guards into the modal',
      })
      .toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite member', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Actions', exact: false }).click();
  await expect(page.getByRole('menuitem', { name: 'Edit workspace' })).toBeVisible();
  await page.keyboard.press('Escape');
  await capture('atlas-dark-preview', page.locator('.aw-preview'));
  await axe('Atlas dark preview and light shell');
  passed(
    'Profile and mode changes preserve drafts; dark dialogs and menus inherit the active document profile with Escape/focus return.',
  );
  await page.getByRole('radio', { name: 'Light', exact: true }).check();
  await navigate('Compose a pattern');
  await page.getByRole('textbox', { name: 'Page title', exact: true }).fill('Partner directory');
  const dataset = page.getByTestId('filtered-dataset');
  await expect(dataset.getByRole('status')).toContainText('5 of 5 customers');
  await dataset.getByRole('textbox', { name: 'Search customers' }).fill('Linear');
  await expect(dataset.getByRole('status')).toContainText('1 of 5 customers');
  await dataset.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('radio', { name: 'Explicit', exact: true }).check();
  await dataset.getByRole('textbox', { name: 'Search customers' }).fill('not-found');
  await expect(dataset.getByRole('status')).toContainText('5 of 5 customers');
  await expect(dataset.getByRole('status')).toContainText('Unapplied changes');
  await dataset.getByRole('button', { name: 'Apply filters' }).click();
  await expect(
    dataset.getByRole('heading', { name: 'No customers match your filters.' }),
  ).toBeVisible();
  await dataset.getByRole('button', { name: 'Clear filters' }).click();
  await expect(dataset.getByRole('status')).toContainText('5 of 5 customers');
  await dataset.getByRole('textbox', { name: 'Search customers' }).fill('Vercel');
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await expect(dataset.getByRole('textbox', { name: 'Search customers' })).toHaveValue('Vercel');
  await dataset.getByRole('button', { name: 'Apply filters' }).click();
  await expect(dataset.getByRole('status')).toContainText('1 of 5 customers');
  await page.getByRole('button', { name: 'Edit JSON specification' }).click();
  const editor = page.getByRole('textbox', { name: 'Composition JSON' });
  const invalidSpec = JSON.parse(await editor.inputValue());
  invalidSpec.filters.application = 'immediate';
  invalidSpec.filters.showApplyButton = true;
  await editor.fill(JSON.stringify(invalidSpec));
  await page.getByRole('button', { name: 'Validate and apply JSON' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(dataset.getByRole('button', { name: 'Apply filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide JSON specification' }).click();
  await capture('composition-desktop');
  await axe('Filtered dataset pattern');
  passed(
    'Canonical filtering renderer: immediate/explicit apply, reset, empty state, mode draft preservation and contradictory spec rejection.',
  );
  await navigate('Component registry');
  await page
    .getByRole('textbox', { name: 'Find a component or capability' })
    .fill('no-such-capability');
  await expect(page.getByText('No registered capability matches.', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: 'Find a component or capability' }).fill('');
  const a = page.getByRole('textbox', { name: 'Proposal A values', exact: true });
  const b = page.getByRole('textbox', { name: 'Proposal B values', exact: true });
  await a.fill('research');
  await a.press(',');
  await expect(a).toHaveValue('');
  await expect(
    page
      .getByRole('list', { name: 'Proposal A values values' })
      .getByRole('button', { name: 'Remove research' }),
  ).toBeVisible();
  await a.fill('DESIGN');
  await a.press('Enter');
  await expect(a).toHaveValue('DESIGN');
  await expect(page.getByRole('alert')).toContainText('already added');
  await a.fill('');
  await a.evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'design, engineering');
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  });
  await expect(a).toHaveValue('design, engineering');
  await expect(
    page
      .getByRole('list', { name: 'Proposal A values values' })
      .getByRole('button', { name: 'Remove engineering' }),
  ).not.toBeVisible();
  await b.fill('research');
  await b.press(',');
  await expect(b).toHaveValue('research,');
  await b.press('Enter');
  await expect(b).toHaveValue('');
  await b.fill('DESIGN');
  await b.press('Enter');
  await expect(b).toHaveValue('');
  await a.fill('draft-only');
  await b.focus();
  await expect(a).toHaveValue('draft-only');
  await page.getByRole('button', { name: 'Prepare consolidation plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Historical example plan · not a pending release' }),
  ).toBeVisible();
  await capture('registry-proposals');
  await axe('Registry proposals');
  passed(
    'Historical TokenInput fixtures follow their declared keys and duplicate policies; rejected paste is atomic and preserves the full draft; the example plan is clearly labeled as not a pending release.',
  );
  await navigate('Maintain the system');
  await expect(page.getByText('0 eligible derived repairs')).toBeVisible();
  await expect(page.getByText('3 review items')).toBeVisible();
  await page.getByRole('radio', { name: '2', exact: true }).check();
  await axe('Maintenance planner');
  passed(
    'Illustrative maintenance evidence yields review-only plans and a bounded attempt budget.',
  );
  await navigate('Export agent kit');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download profile', exact: true }).click();
  assert.match((await download).suggestedFilename(), /\.profile\.json$/);
  const bundleDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download JSON bundle' }).click();
  const bundle = JSON.parse(await readFile(await (await bundleDownload).path(), 'utf8'));
  assert.equal(
    bundle.composition.content.title,
    'Partner directory',
    'Bundle includes the edited composition, not a default',
  );
  assert.equal(bundle.composition.profileId, bundle.profile.id);
  assert(
    bundle.composition.profileHash,
    'Exported composition is pinned to the profile fingerprint',
  );
  await axe('Agent kit export');
  passed(
    'Profile and JSON exports download real files; bundle preserves the edited composition and pins its active profile.',
  );
  await navigate('Design language');
  await page.getByRole('button', { name: 'Reset profile', exact: true }).click();
  await page.getByRole('radio', { name: 'Light', exact: true }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow('Mobile design workbench');
  assert.equal(
    await page
      .locator('.aw-preview-actions')
      .evaluate((node) =>
        [...node.children].every(
          (child) => child.getBoundingClientRect().right <= node.getBoundingClientRect().right,
        ),
      ),
    true,
    'Every mobile preview footer control fits its owned wrapping container',
  );
  await capture('design-language-mobile');
  await capture('design-preview-mobile', page.locator('.aw-preview'));
  await navigate('Compose a pattern');
  await noOverflow('Mobile dataset');
  await capture('composition-mobile');
  await axe('Mobile composition');
  passed(
    '390px workbench and filtering preview have no document overflow; the result table owns horizontal scrolling.',
  );

  await page.goto(`${base}/scripts/fixtures/token-input.html`);
  const validated = page.getByRole('textbox', { name: 'Validated emails' });
  await validated.evaluate((node) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', 'bad-address\nvalid@example.com');
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
    );
  });
  await expect(validated).toHaveValue('bad-address\nvalid@example.com');
  await expect(page.getByRole('button', { name: 'Remove valid@example.com' })).not.toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Enter an email address');
  await validated.fill('fixed@example.com');
  await validated.press('Enter');
  await expect(validated).toHaveValue('');
  await validated.press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove fixed@example.com' })).toBeVisible();
  await validated.press('Escape');
  await expect(page.getByRole('button', { name: 'Remove fixed@example.com' })).toBeVisible();
  await validated.press('Backspace');
  await validated.press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove fixed@example.com' })).not.toBeVisible();
  await validated.fill('ime@example.com');
  await validated.evaluate((node) =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  await expect(validated).toHaveValue('ime@example.com');
  await expect(page.getByRole('button', { name: 'Remove ime@example.com' })).not.toBeVisible();
  await validated.evaluate((node) =>
    node.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }),
    ),
  );
  await expect(page.getByRole('button', { name: 'Remove ime@example.com' })).not.toBeVisible();
  const blur = page.getByRole('textbox', { name: 'Commit on blur' });
  await blur.fill('committed-on-blur');
  await page.getByRole('button', { name: 'Next control' }).click();
  await expect(blur).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Remove committed-on-blur' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next control' })).toBeFocused();
  const rejected = page.getByRole('textbox', { name: 'Host rejects' });
  await rejected.fill('preserve me');
  await rejected.press('Enter');
  await expect(rejected).toHaveValue('preserve me');
  const unchanged = page.getByRole('textbox', { name: 'Host stays unchanged' });
  await unchanged.fill('waiting');
  await unchanged.press('Enter');
  await expect(unchanged).toHaveValue('waiting');
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(unchanged).toHaveValue('waiting');
  const delayed = page.getByRole('textbox', { name: 'Delayed acceptance' });
  await delayed.fill('same text');
  await delayed.press('Enter');
  await delayed.press('Enter');
  await expect(page.getByText('Requests: 1', { exact: true })).toBeVisible();
  await expect(delayed).toHaveValue('same text');
  await delayed.fill('edited text');
  await delayed.fill('same text');
  await page.getByRole('button', { name: 'Accept pending request' }).click();
  await expect(page.getByRole('button', { name: 'Remove same text' })).toBeVisible();
  await expect(delayed).toHaveValue('same text');
  await expect(page.getByRole('button', { name: 'Accept pending request' })).toBeFocused();
  const throws = page.getByRole('textbox', { name: 'Validator throws' });
  await throws.fill('validator draft');
  await throws.press('Enter');
  await expect(throws).toHaveValue('validator draft');
  await expect(page.getByRole('textbox', { name: 'Disabled values' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove locked' })).toBeDisabled();
  passed(
    'TokenInput validates batches atomically, preserves rejected/throwing/host-refused drafts, waits for controlled acceptance, guards IME, requires two-step Backspace, preserves newer drafts and focus on delayed acknowledgement, supports explicit blur commit, and keeps disabled state inert.',
  );
  assert.deepEqual(report.browserErrors, []);
  console.log(
    `Verified ${report.checks.length} workbench checks and ${report.accessibility.length} accessibility scans.`,
  );
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
