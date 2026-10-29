import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import {
  assertDensityChanges,
  assertKeyboardDismissal,
  assertPushFilterLayout,
} from './oracles.mjs';
import { createEvidenceReport, saveEvidenceReport, sourceSnapshot } from './evidence.mjs';
import { caseCatalog } from './catalogue.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  assert(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${name}`);
  return args[index + 1];
};
const known = new Set(['--storybook', '--forma', '--out', '--case', '--context', '--list']);
for (let index = 0; index < args.length; index++) {
  assert(known.has(args[index]), `Unknown argument ${args[index]}`);
  if (args[index] !== '--list') index++;
}
if (args.includes('--list')) {
  console.log(JSON.stringify(caseCatalog, null, 2));
  process.exit(0);
}
const report = await createEvidenceReport(repository);
const output = resolve(option('--out') || 'artifacts/acceptance/report.json');
const endpoints = {
  storybook: option('--storybook') || process.env.STORYBOOK_URL,
  forma: option('--forma') || process.env.FORMA_URL,
};
const selectedCase = option('--case');
const selectedContext = option('--context');
if (selectedCase)
  assert(
    caseCatalog.some((scenario) => scenario.id === selectedCase),
    `Unknown case ${selectedCase}`,
  );
if (selectedContext)
  assert(
    caseCatalog.some((scenario) =>
      scenario.contexts.some((context) => context.id === selectedContext),
    ),
    `Unknown context ${selectedContext}`,
  );
let browser;
try {
  browser = await chromium.launch();
  for (const record of report.records) {
    if (
      (selectedCase && record.caseId !== selectedCase) ||
      (selectedContext && record.context.id !== selectedContext)
    ) {
      record.reason = 'Outside the explicitly selected run scope.';
      continue;
    }
    const endpoint = endpoints[record.context.surface];
    if (!endpoint) {
      record.reason = `No ${record.context.surface} server supplied.`;
      continue;
    }
    const context = await browser.newContext({
      viewport: { width: record.width, height: 1050 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript(() => {
      window.__acceptanceStoryEvents = [];
      let channel;
      Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
        configurable: true,
        get: () => channel,
        set: (next) => {
          channel = next;
          next?.on('storyFinished', (event) => window.__acceptanceStoryEvents.push(event));
        },
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    record.startedAt = new Date().toISOString();
    try {
      const url = new URL(endpoint);
      assert(
        ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password,
        'Server URL must be HTTP(S) without credentials',
      );
      if (record.context.surface === 'storybook') {
        const base = endpoint.replace(/\/+$/, '') + '/';
        await page.goto(
          `${base}iframe.html?id=${record.context.route}&viewMode=story&globals=theme:${record.theme};layoutTheme:${record.presentation}&aegisTest=1`,
        );
        await page.waitForFunction(
          (id) => window.__acceptanceStoryEvents?.some((event) => event.storyId === id),
          record.context.route,
          { timeout: 45000 },
        );
        assert(
          await page.evaluate(
            (id) =>
              window.__acceptanceStoryEvents
                .filter((event) => event.storyId === id)
                .every((event) => event.status === 'success'),
            record.context.route,
          ),
          'Story completed without a play error',
        );
      } else {
        url.hash = record.context.route;
        if (!url.searchParams.has('view')) url.searchParams.set('view', 'product');
        await page.goto(url.href);
        await expect(
          page.getByRole('heading', {
            name: record.context.route[0].toUpperCase() + record.context.route.slice(1),
            level: 1,
            exact: true,
          }),
        ).toBeVisible();
        await page.evaluate(({ theme, presentation }) => {
          document.documentElement.dataset.layoutTheme = presentation;
          document.documentElement.dataset.theme = theme;
          document.documentElement.classList.toggle('dark', theme === 'dark');
          document.documentElement.style.colorScheme = theme;
        }, record);
      }
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('html')).toHaveAttribute('data-theme', record.theme);
      await expect(page.locator('html')).toHaveAttribute('data-layout-theme', record.presentation);
      record.url = page.url();
      if (record.caseId === 'push-filter-layout') {
        const storybook = record.context.surface === 'storybook';
        const results = page.locator(
          storybook ? '.aegis-filter-sync-results' : '.forma-filter-results',
        );
        const panel = page.getByRole('complementary', {
          name: storybook ? /^Filters/ : `Filter ${record.context.route}`,
        });
        if (await panel.isVisible())
          await page.getByRole('button', { name: 'Hide filter panel', exact: true }).click();
        const before = await results.boundingBox();
        await page
          .getByRole('button', { name: storybook ? 'Show filter panel' : 'Filters', exact: true })
          .click();
        record.observations = await assertPushFilterLayout({
          page,
          panel,
          results,
          before,
          interactive: page.getByRole('searchbox', {
            name: storybook ? 'Search records' : `Search ${record.context.route}`,
            exact: true,
          }),
          breakpoint: storybook ? 640 : 767,
        });
      } else if (record.caseId === 'density-changes-rows') {
        record.observations = await assertDensityChanges({
          grid: page.locator('.aegis-data-grid').first(),
        });
      } else {
        record.observations = await assertKeyboardDismissal({
          trigger: page.getByRole('button', {
            name: record.context.surface === 'storybook' ? 'Assign record' : 'Add user',
            exact: true,
          }),
          popup: page.getByRole('dialog'),
        });
      }
      assert.deepEqual(errors, [], 'No browser exceptions during scenario');
      record.status = 'passed';
      record.reason = 'The linked finite oracle passed in this observed context.';
    } catch (error) {
      record.status = 'failed';
      record.reason = String(error.message || error);
      record.browserErrors = errors;
    } finally {
      record.finishedAt = new Date().toISOString();
      await context.close();
      console.log(
        `${record.status.toUpperCase()} ${record.id}${record.status === 'failed' ? `: ${record.reason.split('\n')[0]}` : ''}`,
      );
    }
  }
} catch (error) {
  report.runFailure = String(error.message || error);
} finally {
  await browser?.close();
  report.sourceStableDuringRun = (await sourceSnapshot(repository)).digest === report.source.digest;
  if (!report.sourceStableDuringRun)
    report.limitations.push(
      'Local inputs changed during this run. Re-run from a stable snapshot before using it for repair acceptance.',
    );
  await saveEvidenceReport(report, repository, output);
  console.log(
    JSON.stringify({
      output,
      summary: report.summary,
      sourceStableDuringRun: report.sourceStableDuringRun,
    }),
  );
  if (report.summary.failed || report.runFailure || !report.sourceStableDuringRun)
    process.exitCode = 1;
  else if (!report.summary.passed) process.exitCode = 2;
}
