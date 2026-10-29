import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 15000 });
const base = (process.env.STORYBOOK_URL || 'http://127.0.0.1:6010').replace(/\/+$/, '') + '/';
const output = resolve(
  process.env.DESIGN_INFRASTRUCTURE_REPORT_DIR ||
    join(root, 'artifacts/design-infrastructure-browser'),
);
await mkdir(output, { recursive: true });
const report = {
  status: 'running',
  base,
  checks: [],
  pageErrors: [],
  limits: [
    'Finite Chromium UI workflows. Confirms preview/apply boundaries, invalid input handling, explicit mapping and recipe editing; not full visual/accessibility certification.',
  ],
};
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  const open = async (story, mode = 'dark', layoutTheme = 'fundamental') => {
    const url = new URL('iframe.html', base);
    url.searchParams.set('id', `agentic-tools-design-infrastructure--${story}`);
    url.searchParams.set('viewMode', 'story');
    url.searchParams.set('globals', `theme:${mode};layoutTheme:${layoutTheme}`);
    await page.goto(url.href);
  };
  const choose = async (label, option) => {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  for (const mode of ['dark', 'light']) {
    await open('brand-packages', mode);
    const input = page.getByRole('textbox', { name: 'Import JSON', exact: true });
    await expect(input).toBeVisible();
    const applied = page.getByRole('region', { name: 'Applied brand preview' });
    const priorText = await applied.innerText();
    const brand = JSON.parse(await input.inputValue());
    const nextColor = '#663399';
    brand.profile.brand = nextColor;
    await input.fill(JSON.stringify(brand));
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Import preview' });
    await expect(preview).toContainText('Ready to apply');
    assert.equal(await applied.innerText(), priorText, 'Preview must not apply a profile.');
    await page.getByRole('button', { name: 'Apply reviewed changes', exact: true }).click();
    await expect(applied).toContainText(nextColor);
    const appliedText = await applied.innerText();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download brand package', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), `${brand.profile.id}.brand.json`);
    assert.equal(
      JSON.parse(await readFile(await download.path(), 'utf8')).profile.brand,
      nextColor,
    );
    report.checks.push(
      `${mode}: brand preview preserves applied state until Apply; download contains the applied profile.`,
    );

    await input.fill('{invalid json');
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Apply reviewed changes', exact: true }),
    ).toHaveCount(0);
    assert.equal(await applied.innerText(), appliedText);
    await input.fill(JSON.stringify({ ...brand, install: 'execute()' }));
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(preview).toContainText('Needs attention');
    await expect(
      page.getByRole('button', { name: 'Apply reviewed changes', exact: true }),
    ).toBeDisabled();
    assert.equal(await applied.innerText(), appliedText);
    report.checks.push(
      `${mode}: malformed JSON and unsupported import hooks cannot change the applied profile.`,
    );

    brand.profile.brand = '#336699';
    await input.fill(JSON.stringify(brand));
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Apply reviewed changes', exact: true }),
    ).toBeEnabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'too-large.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(8_000_001, ' '),
    });
    await expect(page.getByRole('alert')).toContainText('smaller than 8 MB');
    await expect(
      page.getByRole('button', { name: 'Apply reviewed changes', exact: true }),
    ).toHaveCount(0);
    assert.equal(await applied.innerText(), appliedText);
    report.checks.push(
      `${mode}: rejected file input invalidates an earlier ready-to-apply preview.`,
    );

    await choose('Import format', 'DTCG design tokens');
    await page.getByRole('button', { name: 'Preview import', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Apply reviewed changes', exact: true }),
    ).toBeDisabled();
    await choose('brand', 'palette.brand (color)');
    await expect(preview).toContainText('Ready to apply');
    assert.equal(
      await applied.innerText(),
      appliedText,
      'Choosing a mapping must still be preview-only.',
    );
    await page.getByRole('button', { name: 'Apply reviewed changes', exact: true }).click();
    await expect(applied).toContainText('#5c40cc');
    const tokenDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download DTCG tokens', exact: true }).click();
    const tokenDownload = await tokenDownloadPromise;
    assert.equal(
      tokenDownload.suggestedFilename(),
      `${brand.profile.id}.fundamental.light.tokens.json`,
    );
    const tokenDocument = JSON.parse(await readFile(await tokenDownload.path(), 'utf8'));
    assert.ok(tokenDocument.primitive && tokenDocument.semantic && tokenDocument.group);
    report.checks.push(
      `${mode}: DTCG changes require an explicit token mapping and Apply; export contains all three token tiers.`,
    );
  }
  await open('brand-packages', 'dark', 'fundamental');
  const fundamentalScope = page.getByRole('region', { name: 'Applied brand preview' });
  await expect(fundamentalScope).toHaveAttribute('data-layout-theme', 'fundamental');
  const fundamentalRadius = await fundamentalScope.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--semantic-chrome-radius').trim(),
  );
  await open('brand-packages', 'dark', 'fundamental-floating');
  const floatingScope = page.getByRole('region', { name: 'Applied brand preview' });
  await expect(floatingScope).toHaveAttribute('data-layout-theme', 'fundamental-floating');
  const floatingRadius = await floatingScope.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--semantic-chrome-radius').trim(),
  );
  assert.notEqual(
    floatingRadius,
    fundamentalRadius,
    'The applied profile must resolve Floating tokens inside its own scope.',
  );
  report.checks.push(
    'Storybook presentation globals reach the profile scope and change computed Fundamental/Floating chrome tokens.',
  );
  await open('project-recipes');
  const recipes = page.getByRole('textbox', { name: 'Project recipe JSON', exact: true });
  const query = page.getByRole('textbox', { name: 'What should the interface do?', exact: true });
  const resolved = page.getByRole('region', { name: 'Resolved project recipe' });
  await expect(resolved).toBeVisible();
  const config = JSON.parse(await recipes.inputValue());
  await query.fill('x'.repeat(300));
  assert.equal(
    (await query.inputValue()).length,
    256,
    'Pasted queries must respect the supported maximum.',
  );
  await expect(resolved).toBeVisible();
  await query.evaluate((element) => element.removeAttribute('maxlength'));
  await query.fill('x'.repeat(257));
  await expect(page.getByRole('alert')).toContainText('1–256');
  await expect(resolved).toBeVisible();
  await query.evaluate((element) => element.setAttribute('maxlength', '256'));
  await query.fill('');
  await expect(resolved).toBeVisible();
  await query.fill('side panel');
  await expect(page.getByText('ambiguous', { exact: true })).toBeVisible();
  await query.fill('push filters beside a table');
  await expect(page.getByText('resolved', { exact: true })).toBeVisible();
  config.recipes.collection.filters = 'inline';
  await recipes.fill(JSON.stringify(config));
  await expect(page.getByText('rejected', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Project recipe selects inline filtering.', { exact: false }),
  ).toBeVisible();
  await query.fill('inline filters');
  await expect(page.getByText('resolved', { exact: true })).toBeVisible();
  await recipes.fill(JSON.stringify({ ...config, recipes: { collection: { filters: 'modal' } } }));
  await expect(page.getByRole('alert')).toContainText('filters');
  await expect(resolved).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Download project recipes', exact: true }),
  ).toBeDisabled();
  await recipes.fill('{');
  await expect(page.getByRole('alert')).toBeVisible();
  await recipes.fill(JSON.stringify(config));
  await choose('Page purpose', 'dashboard');
  await expect(resolved).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(query).toBeVisible();
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    'Recipe UI must not overflow the narrow viewport.',
  );
  report.checks.push(
    'Recipe editor survives long/empty query and invalid JSON, rejects conflicting behavior, recovers to a valid archetype, and contains narrow-width content.',
  );
  assert.deepEqual(report.pageErrors, []);
  report.status = 'passed';
  await page.screenshot({ path: join(output, 'recipes-mobile.png'), fullPage: true });
} catch (error) {
  report.status = 'failed';
  report.failure = String(error.stack ?? error);
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
