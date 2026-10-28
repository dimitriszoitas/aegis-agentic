/** Bounded built-Storybook browser evidence for the four forms/collections additions. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { documentationId } from './component-doc-navigation.mjs';

const built = resolve(process.env.STORYBOOK_BUILD_DIR || 'storybook-static');
const output = resolve('artifacts/forms-collections-storybook');
const filterText = process.env.FORM_COLLECTION_FILTER || null;
const filter = filterText ? new RegExp(filterText) : null;
const layouts = ['fundamental', 'fundamental-floating'];
const themes = ['light', 'dark'];
const widths = [1440, 390];
const families = [
  {
    id: 'components-forms-passwordinput',
    name: 'PasswordInput',
    title: 'Components/Inputs & Selection/PasswordInput',
    root: '.aegis-password-input',
    control: 'label',
    initialLabel: 'Password',
    plays: ['keyboard-and-form', 'read-only-reveal', 'uncontrolled-entry'],
  },
  {
    id: 'components-forms-numberinput',
    name: 'NumberInput',
    title: 'Components/Inputs & Selection/NumberInput',
    root: '.aegis-number-input',
    control: 'label',
    initialLabel: 'Seats',
    plays: [
      'keyboard-and-bounds',
      'locale-and-form',
      'field-and-locked-states',
      'cancelled-change',
    ],
  },
  {
    id: 'patterns-collectiontoolbar',
    name: 'CollectionToolbar',
    title: 'Patterns/Filtering/CollectionToolbar',
    root: '.aegis-collection-toolbar',
    control: 'searchLabel',
    initialLabel: 'Search requests',
    plays: ['local-filtering'],
  },
  {
    id: 'patterns-formsection',
    name: 'FormSection',
    title: 'Patterns/Page Structure/FormSection',
    root: '.aegis-form-section',
    control: 'legend',
    initialLabel: 'Contact details',
    plays: ['native-form', 'native-disabled'],
  },
];
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
    'Chromium with reduced motion, two viewport widths, four explicit presentation combinations. One primary interaction story per family runs throughout the matrix; the other authored play stories run once at desktop Fundamental/light.',
    'Play completion requires observed playing/played phases, a successful storyFinished event, a real play function and no captured play, page or console errors. A rendered canvas alone is not a pass.',
    'Geometry compares the default Playground variant at each viewport across all four presentations, with one CSS pixel tolerance. Colors, radii and shadows may differ by design.',
    'Overview checks exercise label/legend controls, Reset and controlled edited values through the real specimen bridge. Storybook remounts MDX content on global changes; only serialized args are restored. FormSection Playground fields and password reveal state are local, so Overview retention/Reset claims concern configured args, not that local state. The controlled NativeForm story is checked separately for theme-safe draft retention.',
    'Axe supplements the authored interactions and settled screenshots. These checks do not certify every prop, browser, locale, assistive technology, native validation path or visual state.',
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

async function changePresentation(surface, theme, layout) {
  await surface.evaluate(
    ({ theme, layout }) => {
      window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateGlobals', {
        globals: { theme, layoutTheme: layout },
      });
    },
    { theme, layout },
  );
  await presentation(surface, theme, layout);
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

  for (const layout of layouts)
    for (const theme of themes)
      await run(`input-appearance-${layout}-${theme}`, 1440, async (page) => {
        const appearance = (locator) =>
          locator.evaluate((element) => {
            const css = getComputedStyle(element);
            return Object.fromEntries(
              [
                'backgroundColor',
                'borderTopColor',
                'borderTopWidth',
                'borderTopStyle',
                'borderRightColor',
                'borderBottomColor',
                'borderLeftColor',
              ].map((name) => [name, css[name]]),
            );
          });
        const numberId = 'components-forms-numberinput--playground';
        await openStory(page, numberId, theme, layout);
        await finished(page, numberId, false);
        await presentation(page, theme, layout);
        const number = await appearance(page.locator('.aegis-number-input-control'));
        const formId = 'patterns-formsection--playground';
        await openStory(page, formId, theme, layout);
        await finished(page, formId, false);
        await presentation(page, theme, layout);
        const text = await appearance(page.locator('.aegis-input-shell').first());
        report.inputAppearance.push({ layout, theme, number, text });
        assert.deepEqual(
          number,
          text,
          `NumberInput and TextInput default fill/border differ in ${layout}/${theme}`,
        );
      });
  async function openStory(page, id, theme, layout) {
    const params = new URLSearchParams({
      id,
      viewMode: 'story',
      aegisTest: '1',
      globals: `theme:${theme};layoutTheme:${layout}`,
    });
    await page.goto(`${base}/iframe.html?${params}`);
  }

  for (const layout of layouts)
    for (const theme of themes)
      await run(`number-stepper-states-${layout}-${theme}`, 1440, async (page) => {
        const storyId = 'components-forms-numberinput--playground';
        await openStory(page, storyId, theme, layout);
        await finished(page, storyId, false);
        await presentation(page, theme, layout);
        const input = page.getByRole('textbox', { name: 'Seats', exact: true });
        const increase = page.getByRole('button', { name: 'Increase seats', exact: true });
        const decrease = page.getByRole('button', { name: 'Decrease seats', exact: true });
        const style = (button) =>
          button.evaluate((element) => {
            const css = getComputedStyle(element);
            return {
              background: css.backgroundColor,
              shadow: css.boxShadow,
              transform: css.transform,
              opacity: Number(css.opacity),
            };
          });
        const activeOpacity = (await style(increase)).opacity;
        const update = async (args) => {
          await page.evaluate(
            ({ storyId, args }) => {
              window.__STORYBOOK_ADDONS_CHANNEL__.emit('updateStoryArgs', {
                storyId,
                updatedArgs: args,
              });
            },
            { storyId, args },
          );
          await expect(input).toHaveValue(String(args.value));
          await settle(page);
        };
        const unavailable = async (button, state, expected) => {
          assert(
            await button.evaluate(
              (element) => element.disabled || element.getAttribute('aria-disabled') === 'true',
            ),
            `${state}: stepper not disabled`,
          );
          await page.mouse.move(0, 0);
          await settle(page);
          const before = await style(button);
          assert(
            before.opacity < activeOpacity,
            `${state}: unavailable stepper is not visually dimmed`,
          );
          await button.hover();
          await settle(page);
          assert.deepEqual(
            await style(button),
            before,
            `${state}: hover changed unavailable appearance`,
          );
          const bounds = await button.boundingBox();
          assert(bounds);
          await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          await page.mouse.down();
          await settle(page);
          assert.deepEqual(
            await style(button),
            before,
            `${state}: press changed unavailable appearance`,
          );
          await page.mouse.up();
          if (!(await button.evaluate((element) => element.disabled))) {
            await button.focus();
            await button.press('Enter');
            await button.press('Space');
          }
          await expect(input).toHaveValue(String(expected));
          report.disabledSteppers.push({
            layout,
            theme,
            state,
            activeOpacity,
            unavailableStyle: before,
          });
        };
        await update({ value: 100 });
        await unavailable(increase, 'maximum', 100);
        await update({ value: 0 });
        await unavailable(decrease, 'minimum', 0);
        await update({ value: 4, readOnly: true });
        await unavailable(increase, 'read-only increase', 4);
        await unavailable(decrease, 'read-only decrease', 4);
        await update({ value: 4, readOnly: false, disabled: true });
        await unavailable(increase, 'disabled increase', 4);
        await unavailable(decrease, 'disabled decrease', 4);
        await axe(page, `number-stepper-states-${layout}-${theme}`);
      });

  for (const family of families) {
    for (const width of widths)
      for (const layout of layouts)
        for (const theme of themes) {
          const key = `${family.id}-${width}-${layout}-${theme}`;
          await run(`play-${key}`, width, async (page) => {
            const id = `${family.id}--${family.plays[0]}`;
            await openStory(page, id, theme, layout);
            await finished(page, id, true);
            report.plays.at(-1).configuration = { width, theme, layout };
            await presentation(page, theme, layout);
            await noOverflow(page);
            // NativeForm owns controlled draft state. A global theme update must not discard it.
            if (family.name === 'FormSection') {
              const input = page.getByRole('textbox', { name: 'Name (required)', exact: true });
              await input.fill('Theme retained');
              const opposite = theme === 'light' ? 'dark' : 'light';
              await changePresentation(page, opposite, layout);
              await expect(input).toHaveValue('Theme retained');
              await changePresentation(page, theme, layout);
              await expect(input).toHaveValue('Theme retained');
            }
            await axe(page, key);
            await screenshot(page, key);
          });
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
          });
        }
    for (const suffix of family.plays.slice(1)) {
      const id = `${family.id}--${suffix}`;
      await run(`play-${id}`, 1440, async (page) => {
        await openStory(page, id, 'light', 'fundamental');
        await finished(page, id, true);
        report.plays.at(-1).configuration = { width: 1440, theme: 'light', layout: 'fundamental' };
        await presentation(page, 'light', 'fundamental');
        await noOverflow(page);
        await axe(page, id);
      });
    }

    for (const width of widths)
      await run(`overview-${family.id}-${width}`, width, async (page) => {
        const params = new URLSearchParams({
          path: `/docs/${documentationId(family)}`,
          globals: 'theme:light;layoutTheme:fundamental',
        });
        await page.goto(`${base}/?${params}`);
        await expect(page.locator('#storybook-preview-iframe')).toBeVisible();
        const docsHandle = await page.locator('#storybook-preview-iframe').elementHandle();
        const docs = await docsHandle.contentFrame();
        assert(docs, 'Missing manager documentation frame');
        await expect(docs.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
          'aria-selected',
          'true',
        );
        const controls = docs.getByRole('region', { name: 'Playground controls', exact: true });
        const reset = controls.getByRole('button', { name: 'Reset', exact: true });
        await expect(reset).toBeEnabled({ timeout: 45000 });
        const specimen = docs.frameLocator('.component-docs-frame');
        const frame = await docs.locator('.component-docs-frame').elementHandle();
        let surface = await frame.contentFrame();
        assert(surface, 'Missing Overview specimen frame');
        const label = controls.getByLabel(family.control, { exact: true });
        await expect(label).toHaveValue(family.initialLabel);
        if (family.name === 'PasswordInput') {
          await expect(controls.getByRole('group', { name: 'size', exact: true })).toBeVisible();
          await expect(
            controls.getByRole('checkbox', { name: 'invalid', exact: true }),
          ).toBeVisible();
        }
        const editedLabel = `Audit ${family.name}`;
        await label.fill(editedLabel);
        const input = specimen.locator(`${family.root} input:not([aria-hidden="true"])`).first();
        if (family.name === 'FormSection')
          await expect(
            specimen.getByRole('group', { name: editedLabel, exact: true }),
          ).toBeVisible();
        else await expect(input).toHaveAccessibleName(editedLabel);
        const draft = family.name === 'NumberInput' ? '7' : 'Draft retained';
        if (family.name !== 'FormSection') {
          await input.fill(draft);
          await input.press('Tab');
        }
        for (const layout of layouts)
          for (const theme of themes) {
            const themeButton = page.getByRole('button', { name: /^Theme / });
            if (!(await themeButton.isVisible()))
              await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
            const title = layout === 'fundamental' ? 'Fundamental' : 'Fundamental Floating';
            if ((await themeButton.getAttribute('aria-label')) !== `Theme ${title}`) {
              await themeButton.click();
              await page.getByRole('option', { name: title, exact: true }).click();
            }
            const mode = page.getByRole('switch', { name: 'Dark mode', exact: true });
            if ((await mode.getAttribute('aria-checked')) !== String(theme === 'dark'))
              await mode.click();
            if (width < 600)
              await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
            await presentation(docs, theme, layout);
            await expect(reset).toBeEnabled({ timeout: 45000 });
            const currentFrame = await docs.locator('.component-docs-frame').elementHandle();
            surface = await currentFrame.contentFrame();
            assert(surface, 'Missing current Overview specimen frame');
            await presentation(surface, theme, layout);
            if (family.name !== 'FormSection') await expect(input).toHaveValue(draft);
            await expect(label).toHaveValue(editedLabel);
            await noOverflow(page);
            await noOverflow(docs);
            await noOverflow(surface);
          }
        await reset.click();
        await expect(label).toHaveValue(family.initialLabel);
        if (family.name === 'FormSection')
          await expect(
            specimen.getByRole('group', { name: family.initialLabel, exact: true }),
          ).toBeVisible();
        else await expect(input).toHaveAccessibleName(family.initialLabel);
        if (family.name === 'NumberInput') await expect(input).toHaveValue('4');
        else if (family.name !== 'FormSection') await expect(input).toHaveValue('');
        await screenshot(page, `overview-${family.id}-${width}`);
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
      const anatomyFrame = await page.locator('.anatomy-stage iframe').elementHandle();
      const surface = await anatomyFrame.contentFrame();
      await settle(page);
      await settle(surface);
      const parts = await surface.locator('[data-anatomy-definition]').evaluate((element) => {
        const definition = JSON.parse(element.dataset.anatomyDefinition);
        return definition.parts.map((part) => ({
          name: part.name,
          visibleTargets: [...document.querySelectorAll(part.selector)].filter(
            (target) =>
              target.getBoundingClientRect().width > 0 && target.getBoundingClientRect().height > 0,
          ).length,
        }));
      });
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
