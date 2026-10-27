/** Browser regression for the component hub and its public documentation links. */
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { documentationId } from './component-doc-navigation.mjs';

const base = process.env.STORYBOOK_URL || 'http://localhost:6006';
const output = 'test-results/documentation-navigation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];
const names = ['Overview', 'Component Guidelines', 'Tokens Used', 'Examples'];
const families = await Promise.all(
  [
    'components-actions-button',
    'patterns-filterpanel',
    'components-charts-ganttchart',
    'foundations-icons',
  ].map(async (id) =>
    JSON.parse(await readFile(`src/stories/component-docs/generated/${id}.json`, 'utf8')),
  ),
);
async function run(name, work) {
  try {
    await work();
    results.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error: String(error) });
    console.error(`FAIL ${name}: ${error}`);
  }
}
for (const theme of ['dark', 'light']) {
  const context = await browser.newContext({
    viewport: { width: 1500, height: 1050 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const button = families[0];
  const route = `${base}/?path=/docs/${documentationId(button)}&globals=theme:${theme}`;
  await page.goto(route);
  const docs = page.frameLocator('#storybook-preview-iframe');
  const hub = docs.locator('.component-docs');
  await run(`${theme}: one component entry and full-width hub`, async () => {
    await expect(hub.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Button', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Button', exact: true })).toHaveCount(0);
    await expect(hub.getByRole('tab')).toHaveText(names);
    const width = await hub.evaluate((node) => ({
      width: node.clientWidth,
      viewport: window.innerWidth,
    }));
    expect(width.viewport - width.width).toBeLessThanOrEqual(96);
  });
  await run(`${theme}: keyboard tabs and example selection persist`, async () => {
    await hub.getByRole('tab', { name: 'Overview', exact: true }).press('End');
    await hub.getByRole('tab', { name: 'Examples', exact: true }).press('Enter');
    await expect(hub.getByRole('tab', { name: 'Examples', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const story = button.stories.at(-1);
    await hub.getByRole('combobox', { name: 'Component example' }).selectOption(story.id);
    await expect(hub.locator('iframe.component-docs-frame')).toHaveAttribute(
      'src',
      new RegExp(`id=${story.id}`),
    );
    expect(new URL(page.url()).searchParams.get('docsExample')).toBe(story.id);
    await page.reload();
    await expect(hub.getByRole('tab', { name: 'Examples', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(hub.getByRole('combobox', { name: 'Component example' })).toHaveValue(story.id);
  });
  await run(`${theme}: all guidelines share one page and anchors move focus`, async () => {
    await hub.getByRole('tab', { name: 'Component Guidelines' }).click();
    await expect(hub.locator('[data-guideline-section]')).toHaveCount(10);
    const nav = hub.getByRole('navigation', { name: 'Component guideline sections' });
    await expect(nav.getByRole('link')).toHaveCount(10);
    await nav.getByRole('link', { name: 'Accessibility', exact: true }).click();
    await expect(hub.locator('#guideline-heading-accessibility')).toBeFocused();
    expect(new URL(page.url()).searchParams.get('docsSection')).toBe('accessibility');
    await nav.getByRole('link', { name: 'Anatomy', exact: true }).click();
    await expect(hub.locator('#guideline-heading-anatomy')).toBeFocused();
    await expect(hub.locator('.anatomy-marker').first()).toBeVisible();
    await page.screenshot({ path: `${output}/${theme}-guidelines.png` });
  });
  await run(`${theme}: tokens stay canvas-free`, async () => {
    await hub.getByRole('tab', { name: 'Tokens Used' }).click();
    await expect(hub.locator('.component-docs-token-group').first()).toBeVisible();
    await expect(hub.locator('iframe:visible')).toHaveCount(0);
    await page.screenshot({ path: `${output}/${theme}-tokens.png` });
  });
  await run(`${theme}: accessibility of the hub controls`, async () => {
    await hub.getByRole('tab', { name: 'Component Guidelines' }).click();
    const analysis = await new AxeBuilder({ page })
      .include('#storybook-preview-iframe')
      .exclude('.component-docs-guideline-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      analysis.violations.map((violation) => ({
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  });
  for (const family of families.slice(1)) {
    await run(`${theme}: ${family.name} opens its legacy section in the hub`, async () => {
      await page.goto(
        `${base}/?path=/docs/${documentationId(family, 'Tokens Used')}&globals=theme:${theme}`,
      );
      await expect(hub.getByRole('heading', { name: family.name, exact: true })).toBeVisible();
      await expect(hub.getByRole('tab', { name: 'Tokens Used' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await hub.getByRole('tab', { name: 'Component Guidelines' }).click();
      await expect(hub.locator('[data-guideline-section]')).toHaveCount(10);
    });
  }
  await context.close();
}
await run('mobile: the hub fits and section navigation remains reachable', async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(`${base}/?path=/docs/${documentationId(families[0])}&globals=theme:dark`);
  const docs = page.frameLocator('#storybook-preview-iframe');
  const hub = docs.locator('.component-docs');
  await expect(hub.getByRole('heading', { name: 'Button', exact: true })).toBeVisible();
  await hub.getByRole('tab', { name: 'Component Guidelines' }).click();
  await expect(hub.getByRole('navigation', { name: 'Component guideline sections' })).toBeVisible();
  const size = await hub.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
  await page.screenshot({ path: `${output}/mobile.png` });
  await context.close();
});
await browser.close();
await writeFile(
  `${output}/report.json`,
  JSON.stringify({ passed: results.length, results, failures }, null, 2),
);
if (failures.length) process.exitCode = 1;
