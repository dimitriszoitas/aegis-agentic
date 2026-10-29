import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDensityChanges, assertKeyboardDismissal } from './acceptance/oracles.mjs';
// A finite publication smoke; component acceptance matrices remain separate.
const repo = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(resolve(repo, 'package.json'));
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 15000 });
const built = resolve(process.env.STORYBOOK_BUILD_DIR || resolve(repo, 'storybook-static'));
const prefix = '/aegis-agentic-storybook/';
const sourceCatalogue = JSON.parse(
  await readFile(resolve(repo, 'public/ai/contract-catalogue.json'), 'utf8'),
);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) throw Error('Outside project path');
    const requested = pathname.slice(prefix.length) || 'index.html';
    const file = resolve(built, requested),
      from = relative(built, file);
    if (from.startsWith('..') || isAbsolute(from) || !(await stat(file)).isFile())
      throw Error('Not a published file');
    res
      .writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' })
      .end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
if (!process.env.STORYBOOK_URL)
  await new Promise((yes, no) => {
    server.once('error', no);
    server.listen(0, '127.0.0.1', yes);
  });
const base = process.env.STORYBOOK_URL
  ? process.env.STORYBOOK_URL.replace(/\/+$/, '') + '/'
  : `http://127.0.0.1:${server.address().port}${prefix}`;
const origin = new URL(base).origin;
let browser;
const report = {
  status: 'running',
  base,
  checks: [],
  plays: [],
  pageErrors: [],
  consoleErrors: [],
  failedRequests: [],
  limits: [
    'Finite Chromium publication smoke. Confirms selected interactions, documentation and subpath assets; not an exhaustive component, visual or accessibility audit.',
  ],
};
const pass = (message) => {
  report.checks.push(message);
  console.log(`PASS ${message}`);
};
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    reducedMotion: 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await context.addInitScript(() => {
    window.__aegisPagesEvents = [];
    let channel;
    const subscribed = new WeakSet();
    Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
      configurable: true,
      get: () => channel,
      set: (next) => {
        channel = next;
        if (!next || subscribed.has(next)) return;
        subscribed.add(next);
        for (const type of [
          'storyRenderPhaseChanged',
          'storyFinished',
          'playFunctionThrewException',
          'unhandledErrorsWhilePlaying',
          'storyThrewException',
          'storyErrored',
        ])
          next.on(type, (value) =>
            window.__aegisPagesEvents.push({
              type,
              storyId: value?.storyId,
              phase: value?.newPhase,
              status: value?.status,
              reports: value?.reporters?.map(({ type, status, result }) => ({
                type,
                status,
                violations: result?.violations?.map(({ id, nodes }) => ({
                  id,
                  nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
                })),
                error: result?.error?.message,
              })),
              error: !['storyRenderPhaseChanged', 'storyFinished'].includes(type),
            }),
          );
      },
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (e) => report.pageErrors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      report.consoleErrors.push(message.text());
      console.error('BROWSER', message.text());
    }
  });
  page.on('response', (r) => {
    if (r.url().startsWith(origin) && r.status() >= 400)
      report.failedRequests.push({ url: r.url(), status: r.status() });
  });
  const docs = page.frameLocator('#storybook-preview-iframe');
  const indexResponse = await context.request.get(`${base}index.json`);
  assert.equal(indexResponse.status(), 200);
  const entries = (await indexResponse.json()).entries;
  for (const id of [
    'aegis-contract-semantics--docs',
    'aegis-contract-catalogue--docs',
    'aegis-mcp-integration--docs',
    'components-forms-combobox--keyboard-and-form',
    'components-forms-richtexteditor--formatting-and-form',
    'patterns-appshell--navigation-and-skip',
    'patterns-pagelayout--dashboard',
    'components-charts-metric-card--console-metrics',
  ])
    assert(entries[id], `Missing public route ${id}`);
  await page.goto(`${base}?path=/docs/foundations-welcome--docs`);
  await expect(
    docs.getByRole('heading', { name: 'A clear system for complex applications.', exact: true }),
  ).toBeVisible();
  const brand = page.locator('.aegis-storybook-brand img');
  await expect(brand).toBeVisible();
  assert(await brand.evaluate((img) => img.complete && img.naturalWidth > 0));
  pass(
    'Published index includes current library/docs; Welcome, manager and brand assets load below the project path.',
  );
  await expect(page.locator('.aegis-storybook-beta')).toHaveText('BETA');
  await page.goto(`${base}?path=/docs/foundations-component-directory--docs`);
  const purpose = docs.getByRole('combobox', { name: 'Purpose group', exact: true });
  await purpose.click();
  await expect(docs.getByRole('listbox', { name: 'Purpose group', exact: true })).toBeVisible();
  await docs.getByRole('option', { name: 'Triggers', exact: true }).click();
  await expect(purpose).toContainText('Triggers');
  await expect(docs.locator('.component-directory-results')).toContainText('in Triggers');
  const chevron = await purpose.evaluate((element) => {
    const control = element.getBoundingClientRect();
    const icon = element.querySelector('.aegis-select-chevron').getBoundingClientRect();
    return {
      inset: control.right - icon.right,
      center: Math.abs((control.top + control.bottom - icon.top - icon.bottom) / 2),
    };
  });
  assert(
    chevron.inset >= 8 && chevron.center <= 1,
    'Purpose select chevron is inset and vertically centered',
  );
  await purpose.press('ArrowDown');
  await expect(docs.getByRole('listbox', { name: 'Purpose group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(purpose).toBeFocused();
  pass('Directory uses the styled Select with aligned chevron, filtering and keyboard dismissal.');
  await page.goto(`${base}?path=/docs/agentic-skills-component-creation--docs`);
  const skills = docs.locator('.agentic-skill-page');
  await expect(
    skills.getByRole('heading', { name: 'Component Creation', exact: true }),
  ).toBeVisible();
  const refs = [
    'skills/create-component/SKILL.md',
    'skills/references/design-contract.md',
    'skills/references/agentic-contract.md',
    'skills/references/pattern-policy.md',
  ];
  const expected =
    (
      await Promise.all(refs.map(async (f) => (await readFile(resolve(repo, f), 'utf8')).trim()))
    ).join('\n\n') + '\n';
  await skills
    .getByRole('button', { name: 'Copy Component Creation instructions', exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected);
  pass('Component Creation copies exact canonical skill and all required shared references.');
  await expect(
    skills.getByRole('link', { name: 'authored contract coverage', exact: true }),
  ).toHaveAttribute('href', '#shared-agentic-contract-new-components');
  for (const title of [
    'Component Creation',
    'Token Creation',
    'Layout Creation',
    'Build UI',
    'Systemize Repo',
    'Compose Pattern',
    'Extend Design Language',
    'Audit UI',
  ]) {
    await skills.getByRole('tab', { name: title, exact: true }).click();
    await expect(skills.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const missing = await skills.evaluate((node) =>
      [...node.querySelectorAll('a[href^="#"]')]
        .filter((a) => !node.querySelector(`[id="${a.getAttribute('href').slice(1)}"]`))
        .map((a) => a.getAttribute('href')),
    );
    assert.deepEqual(missing, [], `${title} has no dead shared-reference anchors`);
  }
  pass('All eight skill tabs resolve every shared-reference anchor, including section fragments.');
  await skills.getByRole('tab', { name: 'Systemize Repo', exact: true }).click();
  await skills.getByRole('link', { name: 'create-component', exact: true }).first().click();
  await expect(page).toHaveURL(
    `${base}?path=/docs/agentic-skills-component-creation--docs&agenticSkill=component`,
  );
  await expect(
    skills.getByRole('heading', { name: 'Component Creation', exact: true }),
  ).toBeVisible();
  pass(
    'Systemize Repo links reach the corresponding skill tab without leaving the canonical docs route.',
  );
  await skills.getByRole('tab', { name: 'Audit UI', exact: true }).click();
  await skills.getByRole('link', { name: 'the coverage model', exact: true }).click();
  await expect(page).toHaveURL(`${base}?path=/docs/aegis-contract-semantics--docs`);
  const semantics = docs.locator('.contract-semantics');
  await expect(
    semantics.getByRole('heading', { name: 'What a contract means', exact: true }),
  ).toBeVisible();
  pass('Skill coverage link reaches canonical Contract Semantics through the project subpath.');
  const json = semantics.getByRole('link', {
    name: 'public/ai/contract-catalogue.json',
    exact: true,
  });
  const jsonUrl = await json.evaluate((a) => a.href);
  assert.equal(jsonUrl, `${base}ai/contract-catalogue.json`);
  const response = await context.request.get(jsonUrl);
  assert.equal(response.status(), 200);
  assert.equal((await response.json()).entries.length, sourceCatalogue.entries.length);
  await semantics
    .getByRole('button', { name: 'Copy contract semantics documentation', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(await readFile(resolve(repo, 'docs/CONTRACTS.md'), 'utf8'));
  assert.equal(await semantics.locator('a[href*="../"]').count(), 0);
  pass(
    'Canonical semantics copy is byte-exact; public catalogue JSON loads and absent repository paths are not broken links.',
  );
  await page.goto(`${base}?path=/docs/aegis-mcp-integration--docs`);
  await docs.getByRole('link', { name: 'contract semantics and coverage', exact: true }).click();
  await expect(page).toHaveURL(`${base}?path=/docs/aegis-contract-semantics--docs`);
  await expect(
    semantics.getByRole('heading', { name: 'What a contract means', exact: true }),
  ).toBeVisible();
  pass('MCP coverage link reaches the same canonical semantics page.');
  await page.goto(`${base}?path=/docs/aegis-contract-catalogue--docs&contract=combobox`);
  await expect(docs.locator('.contract-catalogue')).toBeVisible();
  const apiResponse = await context.request.get(
    `${base}ai/components/components-forms-combobox.json`,
  );
  assert.equal(apiResponse.status(), 200);
  assert((await apiResponse.json()).id === 'components-forms-combobox');
  pass('Contract Catalogue and the current Combobox API JSON are published.');
  const catalogueGrid = docs.locator('.contract-catalogue .aegis-data-grid').first();
  await assertDensityChanges({ grid: catalogueGrid });
  pass('Contract Catalogue density buttons change both selected state and rendered row heights.');
  const story = async (
    id,
    { width = 1440, theme = 'light', layout = 'fundamental', play = false } = {},
  ) => {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto(
      `${base}iframe.html?id=${id}&viewMode=story&globals=theme:${theme};layoutTheme:${layout}&aegisTest=1`,
    );
    await page.waitForFunction(
      (id) =>
        window.__aegisPagesEvents?.some((e) => e.type === 'storyFinished' && e.storyId === id),
      id,
      { timeout: 45000 },
    );
    const events = await page.evaluate(() => window.__aegisPagesEvents);
    assert(!events.some((e) => e.error), `${id} raised a story error`);
    assert(
      events
        .filter((e) => e.type === 'storyFinished' && e.storyId === id)
        .every((e) => e.status === 'success'),
      `${id} did not finish successfully: ${JSON.stringify(events)}`,
    );
    if (play) {
      assert(
        events.some((e) => e.storyId === id && e.phase === 'playing') &&
          events.some((e) => e.storyId === id && e.phase === 'played'),
        `${id} play was not observed`,
      );
      report.plays.push(id);
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('html')).toHaveAttribute('data-layout-theme', layout);
    await page.evaluate(() => document.fonts.ready);
  };
  await story('components-overlays-modal--default');
  await assertKeyboardDismissal({
    trigger: page.getByRole('button', { name: 'Assign record', exact: true }),
    popup: page.getByRole('dialog'),
  });
  pass('Modal Enter/Escape dismissal and focus return passed the shared acceptance oracle.');
  await story('components-forms-combobox--keyboard-and-form', { play: true });
  await expect(page.getByLabel('Submitted ID', { exact: true })).toHaveText('ath');
  pass('Combobox keyboard selection, form value and clearing play passed.');
  await story('components-forms-richtexteditor--formatting-and-form', { play: true });
  await expect(page.getByLabel('Submitted document', { exact: true })).toContainText('bulletList');
  pass('RichTextEditor formatting and document submission play passed.');
  await story('patterns-appshell--navigation-and-skip', {
    width: 390,
    theme: 'dark',
    layout: 'fundamental-floating',
    play: true,
  });
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Retained note', exact: true })).toHaveValue(
    'Draft preserved',
  );
  pass('Narrow dark AppShell navigation, focus and retained draft play passed.');
  await story('patterns-pagelayout--dashboard');
  await expect(page.getByRole('heading', { name: 'Support overview', exact: true })).toBeVisible();
  pass('Dashboard page recipe renders its shared heading and layout.');
  await story('components-charts-metric-card--console-metrics', { width: 390, theme: 'dark' });
  await expect(page.locator('.aegis-metric-card')).toHaveCount(4);
  await expect(page.locator('.aegis-metric-card svg[role="img"]')).toHaveCount(4);
  const escaped = await page.locator('.aegis-metric-card').evaluateAll((cards) =>
    cards.flatMap((card) => {
      const bounds = card.getBoundingClientRect();
      return [...card.querySelectorAll('svg[role="img"]')]
        .filter((chart) => {
          const b = chart.getBoundingClientRect();
          return (
            b.left < bounds.left - 1 ||
            b.right > bounds.right + 1 ||
            b.top < bounds.top - 1 ||
            b.bottom > bounds.bottom + 1
          );
        })
        .map(() => card.getAttribute('aria-label'));
    }),
  );
  assert.deepEqual(escaped, []);
  pass('Four MetricCards keep their sparklines contained at narrow dark presentation.');
  await story('foundations-icons--library-switching', { play: true });
  await expect(page.getByRole('combobox', { name: 'Icon library', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('img', { name: 'Activity01Icon icon preview', exact: true }),
  ).toBeVisible();
  pass('Public icon search/selection play passed and restricted pack selector is absent.');
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.failedRequests, []);
  pass('No page errors or failed same-origin asset requests.');
  report.status = 'passed';
} catch (e) {
  report.status = 'failed';
  report.failure = String(e.stack || e);
  throw e;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise((r) => server.close(r));
  const output = resolve(repo, 'artifacts/storybook-pages');
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
