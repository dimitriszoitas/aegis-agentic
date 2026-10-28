/** Bounded built-Storybook browser evidence for the complete library expansion. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { documentationId } from './component-doc-navigation.mjs';

const built = resolve(process.env.STORYBOOK_BUILD_DIR || 'storybook-static');
const output = resolve('artifacts/library-completion-storybook');
const filterText = process.env.LIBRARY_COMPLETION_FILTER || null;
const filter = filterText ? new RegExp(filterText) : null;
const layouts = ['fundamental', 'fundamental-floating'];
const themes = ['light', 'dark'];
const widths = [1440, 390];
const { families } = JSON.parse(
  await readFile(resolve('experiments/library-completion/scope.json'), 'utf8'),
);
const indexText = await readFile(resolve(built, 'index.json'), 'utf8');
const index = JSON.parse(indexText);
for (const family of families) {
  for (const suffix of ['playground', ...family.plays])
    assert.equal(
      index.entries[`${family.id}--${suffix}`]?.type,
      'story',
      `Missing ${family.id}--${suffix}`,
    );
  assert.equal(index.entries[documentationId(family)]?.type, 'docs');
}
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') return void response.writeHead(204).end();
    const file = resolve(built, `.${pathname === '/' ? '/index.html' : pathname}`);
    const local = relative(built, file);
    if (local.startsWith('..') || isAbsolute(local) || !(await stat(file)).isFile())
      return void response.writeHead(404).end();
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((accept, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', accept);
});
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(output, { recursive: true });
const report = {
  schemaVersion: 1,
  status: 'running',
  builtIndexSha256: createHash('sha256').update(indexText).digest('hex'),
  auditSha256: createHash('sha256')
    .update(await readFile(new URL(import.meta.url)))
    .digest('hex'),
  matrix: { layouts, themes, widths },
  filter: filterText,
  checks: [],
  plays: [],
  geometry: [],
  disabledSteppers: [],
  inputAppearance: [],
  accessibility: [],
  screenshots: [],
  failures: [],
  limits: [
    'Chromium with reduced motion; every family is measured in four explicit presentation combinations at two viewport widths. Each authored play runs at desktop Fundamental/light; the first play also runs at narrow Floating/dark.',
    'Play completion requires observed playing/played phases, successful storyFinished and no captured play/page/console errors. A rendered canvas alone is not a pass.',
    'Geometry compares each default Playground across all four themes at a given width, within one CSS pixel. Colors, radii and shadows can differ by design.',
    'Overview checks verify the live specimen, controls and Reset are usable; detailed control ownership, async workflows and draft retention are covered by the separate source fixtures.',
    'Axe and screenshots supplement interaction checks. This is bounded evidence, not certification of every prop, browser, locale, assistive technology or host integration.',
  ],
};
let browser;
const geometryByFamily = new Map();

async function settle(surface) {
  await surface.evaluate(async () => {
    await document.fonts.ready;
    for (let pass = 0; pass < 4; pass++) {
      const finite = document.getAnimations().filter((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return animation.playState !== 'finished' && Number.isFinite(timing?.endTime);
      });
      if (!finite.length) break;
      await Promise.all(finite.map((animation) => animation.finished.catch(() => {})));
    }
    await new Promise((accept) => requestAnimationFrame(() => requestAnimationFrame(accept)));
  });
}

async function presentation(surface, theme, layout) {
  await expect(surface.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(surface.locator('html')).toHaveAttribute('data-layout-theme', layout);
  await expect(surface.locator('html')).toHaveCSS('color-scheme', theme);
  await settle(surface);
}

async function noOverflow(surface) {
  const result = await surface.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  assert(
    result.document <= result.width + 1 && result.body <= result.width + 1,
    `Document overflow: ${JSON.stringify(result)}`,
  );
  return result;
}

async function finished(page, storyId, requirePlay) {
  await page.waitForFunction(
    (id) =>
      window.__aegisAuditEvents?.some(
        (event) => event.type === 'storyFinished' && event.storyId === id,
      ),
    storyId,
    { timeout: 45000 },
  );
  const result = await page.evaluate((id) => {
    const render = window.__STORYBOOK_PREVIEW__?.currentRender;
    const events = window.__aegisAuditEvents;
    return {
      storyId: render?.id,
      hasPlay: typeof render?.story?.playFunction === 'function',
      phases: events
        .filter((event) => event.type === 'storyRenderPhaseChanged' && event.storyId === id)
        .map((event) => event.phase),
      finishes: events.filter((event) => event.type === 'storyFinished' && event.storyId === id),
      errors: events.filter((event) => event.error),
    };
  }, storyId);
  assert.equal(result.storyId, storyId);
  assert(
    result.finishes.length && result.finishes.every((event) => event.status === 'success'),
    JSON.stringify(result),
  );
  assert.equal(result.errors.length, 0, JSON.stringify(result.errors));
  if (requirePlay) {
    assert(
      result.hasPlay && result.phases.includes('playing') && result.phases.includes('played'),
      `Play was not observed completing: ${JSON.stringify(result)}`,
    );
    report.plays.push({ storyId, phases: result.phases, finishes: result.finishes });
  }
  await settle(page);
}

async function axe(page, key) {
  const result = await new AxeBuilder({ page })
    // Base UI owns only these hidden focus sentinels; keep authored content and all rules.
    .exclude('[data-base-ui-focus-guard]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const violations = result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
  }));
  report.accessibility.push({
    key,
    violations,
    incompleteRules: result.incomplete.map(({ id }) => id),
  });
  assert.equal(violations.length, 0, JSON.stringify(violations));
}

async function screenshot(page, key) {
  const file = `${key}.png`;
  await page.screenshot({ path: resolve(output, file), fullPage: true });
  report.screenshots.push(file);
}

async function measuredGeometry(page, family) {
  return page
    .locator(family.root)
    .first()
    .evaluate((root) => {
      const elements = [root, ...root.querySelectorAll('*')].filter((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== 'hidden'
        );
      });
      const origin = root.getBoundingClientRect();
      return elements.map((element) => {
        const bounds = element.getBoundingClientRect();
        const css = getComputedStyle(element);
        return {
          tag: element.tagName,
          className: element.getAttribute('class') || '',
          x: bounds.left - origin.left,
          y: bounds.top - origin.top,
          width: bounds.width,
          height: bounds.height,
          metrics: Object.fromEntries(
            [
              'fontFamily',
              'fontSize',
              'fontWeight',
              'lineHeight',
              'letterSpacing',
              'paddingTop',
              'paddingRight',
              'paddingBottom',
              'paddingLeft',
              'marginTop',
              'marginRight',
              'marginBottom',
              'marginLeft',
              'rowGap',
              'columnGap',
            ].map((name) => [name, css[name]]),
          ),
        };
      });
    });
}

function compareGeometry(reference, actual, key) {
  assert.equal(actual.length, reference.length, `${key}: different visible anatomy`);
  for (let index = 0; index < reference.length; index++) {
    const before = reference[index];
    const after = actual[index];
    assert.equal(after.tag, before.tag, `${key}: element ${index}`);
    assert.deepEqual(
      after.metrics,
      before.metrics,
      `${key}: font/spacing changed on element ${index}`,
    );
    for (const dimension of ['x', 'y', 'width', 'height'])
      assert(
        Math.abs(after[dimension] - before[dimension]) <= 1,
        `${key}: element ${index} ${dimension} changed ${before[dimension]} → ${after[dimension]}`,
      );
  }
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  // Subscribe before Storybook creates its channel. In this installed runtime, failed plays
  // can still reach phase="finished"; the events below distinguish completion from success.
  await context.addInitScript(() => {
    window.__aegisAuditEvents = [];
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
          next.on(type, (value) => {
            window.__aegisAuditEvents.push({
              type,
              storyId: value?.storyId,
              phase: value?.newPhase,
              status: value?.status,
              error: !['storyRenderPhaseChanged', 'storyFinished'].includes(type),
              message:
                value?.message ||
                (Array.isArray(value) ? value.map((item) => item.message).join('; ') : undefined),
            });
          });
      },
    });
  });
  const run = async (key, width, check) => {
    if (filter && !filter.test(key)) return;
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      await check(page);
      assert.equal(errors.length, 0, JSON.stringify(errors));
      for (const frame of page.frames()) {
        const storyErrors = await frame.evaluate(() =>
          (window.__aegisAuditEvents || []).filter(
            (event) =>
              event.error || (event.type === 'storyFinished' && event.status !== 'success'),
          ),
        );
        assert.equal(storyErrors.length, 0, JSON.stringify(storyErrors));
      }
      report.checks.push(key);
      console.log(`PASS ${key}`);
    } catch (error) {
      const frameState = await Promise.all(
        page.frames().map(async (frame) => ({
          url: frame.url(),
          state: await frame
            .evaluate(() => ({
              theme: document.documentElement.dataset.theme,
              layout: document.documentElement.dataset.layoutTheme,
              docsTheme: document.documentElement.dataset.aegisDocsTheme,
              text: document.body.textContent.slice(0, 300),
              frames: [...document.querySelectorAll('iframe')].map((element) => ({
                src: element.getAttribute('src'),
                title: element.title,
              })),
            }))
            .catch(() => null),
        })),
      );
      report.failures.push({ key, error: String(error), browserErrors: errors, frameState });
      await screenshot(page, `${key}-failure`).catch(() => {});
      console.error(`FAIL ${key}: ${error}`);
    } finally {
      await page.close();
      await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    }
  };

  async function openStory(page, id, theme, layout) {
    const params = new URLSearchParams({
      id,
      viewMode: 'story',
      aegisTest: '1',
      globals: `theme:${theme};layoutTheme:${layout}`,
    });
    await page.goto(`${base}/iframe.html?${params}`);
  }
  for (const family of families) {
    assert(family.plays.length, `${family.name} needs a real interaction assertion`);
    for (const width of widths)
      for (const layout of layouts)
        for (const theme of themes) {
          const key = `${family.id}-${width}-${layout}-${theme}`;
          await run(`geometry-${key}`, width, async (page) => {
            const id = `${family.id}--playground`;
            await openStory(page, id, theme, layout);
            await finished(page, id, false);
            await presentation(page, theme, layout);
            await expect(page.locator(family.root).first()).toBeVisible();
            const overflow = await noOverflow(page);
            const geometry = await measuredGeometry(page, family);
            const referenceKey = `${family.id}-${width}`;
            if (geometryByFamily.has(referenceKey))
              compareGeometry(geometryByFamily.get(referenceKey), geometry, key);
            else geometryByFamily.set(referenceKey, geometry);
            report.geometry.push({ key, overflow, elements: geometry });
            await axe(page, key);
            if (width === 390 && theme === 'dark') await screenshot(page, key);
          });
        }
    for (const suffix of family.plays)
      await run(`play-${family.id}-${suffix}`, 1440, async (page) => {
        const id = `${family.id}--${suffix}`;
        await openStory(page, id, 'light', 'fundamental');
        await finished(page, id, true);
        await presentation(page, 'light', 'fundamental');
        await noOverflow(page);
        await axe(page, id);
      });
    await run(`play-narrow-${family.id}`, 390, async (page) => {
      const id = `${family.id}--${family.plays[0]}`;
      await openStory(page, id, 'dark', 'fundamental-floating');
      await finished(page, id, true);
      await presentation(page, 'dark', 'fundamental-floating');
      await noOverflow(page);
      await axe(page, id + '-narrow');
    });
    await run(`overview-${family.id}`, 1440, async (page) => {
      const params = new URLSearchParams({
        id: documentationId(family),
        viewMode: 'docs',
        aegisTest: '1',
        globals: 'theme:light;layoutTheme:fundamental',
      });
      await page.goto(`${base}/iframe.html?${params}`);
      const controls = page.getByRole('region', { name: 'Playground controls', exact: true });
      const reset = controls.getByRole('button', { name: 'Reset', exact: true });
      await expect(reset).toBeEnabled({ timeout: 45000 });
      await reset.click();
      const handle = await page.locator('.component-docs-frame').elementHandle();
      const frame = await handle.contentFrame();
      assert(frame);
      await expect(frame.locator(family.root).first()).toBeVisible();
      await settle(frame);
      await noOverflow(frame);
    });
    await run(`anatomy-${family.id}`, 390, async (page) => {
      const params = new URLSearchParams({
        id: documentationId(family),
        viewMode: 'docs',
        aegisTest: '1',
        docsTab: 'guidelines',
        docsSection: 'anatomy',
        globals: 'theme:dark;layoutTheme:fundamental-floating',
      });
      await page.goto(`${base}/iframe.html?${params}`);
      const markers = page.locator('.anatomy-marker');
      await expect(markers.first()).toBeVisible({ timeout: 45000 });
      await expect
        .poll(
          async () =>
            (await markers.count()) === (await page.locator('.anatomy-legend li').count()),
        )
        .toBe(true);
      const handle = await page.locator('.anatomy-stage iframe').elementHandle();
      const frame = await handle.contentFrame();
      assert(frame);
      await settle(frame);
      const parts = await frame
        .locator('[data-anatomy-definition]')
        .evaluate((element) =>
          JSON.parse(element.dataset.anatomyDefinition).parts.map((part) => ({
            name: part.name,
            visibleTargets: [...document.querySelectorAll(part.selector)].filter(
              (target) =>
                target.getBoundingClientRect().width > 0 &&
                target.getBoundingClientRect().height > 0,
            ).length,
          })),
        );
      assert(parts.length && parts.every((part) => part.visibleTargets > 0), JSON.stringify(parts));
      assert.equal(await markers.count(), parts.length);
      await markers.first().focus();
      await expect(markers.first()).toHaveAttribute('data-active', 'true');
      await noOverflow(page);
      await screenshot(page, `anatomy-${family.id}`);
    });
  }
  assert(report.checks.length + report.failures.length > 0, 'The filter did not select any checks');
  report.status = report.failures.length ? 'failed' : 'passed';
} catch (error) {
  report.status = 'failed';
  report.failures.push({ key: 'audit-setup', error: String(error) });
} finally {
  await browser?.close();
  await new Promise((accept) => server.close(accept));
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}
console.log(
  `${report.checks.length} checks; ${report.plays.length} completed plays; ${report.accessibility.length} axe scans; ${report.failures.length} failures.`,
);
if (report.status !== 'passed') process.exitCode = 1;
