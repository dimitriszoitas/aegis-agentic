import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.STORYBOOK_URL || 'http://127.0.0.1:6006';
const index = await (await fetch(`${base}/index.json`)).json();
const stories = Object.values(index.entries).filter(
  (s) =>
    s.type === 'story' &&
    s.tags?.includes('test') &&
    (!process.env.STORY_FILTER || new RegExp(process.env.STORY_FILTER).test(s.id)),
);
const browser = await chromium.launch();
const failures = [];
const queue = stories.flatMap((story) => ['light', 'dark'].map((theme) => ({ story, theme })));
let completed = 0;
await mkdir('test-results', { recursive: true });
async function worker() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  });
  for (let job = queue.shift(); job; job = queue.shift()) {
    const page = await context.newPage();
    const { story, theme } = job;
    const errors = [];
    const onError = (error) => errors.push(error.message);
    page.on('pageerror', onError);
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    try {
      await page.goto(
        `${base}/iframe.html?id=${story.id}&viewMode=story&aegisTest=1&globals=theme:${theme}`,
      );
      // Overlay-only stories render through portals outside the story root.
      await page.waitForFunction(
        () => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === 'finished',
        {},
        { timeout: 30000 },
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, theme);
      const result = await new AxeBuilder({ page })
        // Base UI's hidden focus sentinels redirect Tab through its
        // focus manager. Native keyboard checks cover the boundaries separately.
        // Keep aria-hidden-focus enabled for every authored component element.
        .exclude('[data-base-ui-focus-guard]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const violations = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      }));
      if (violations.length || errors.length)
        failures.push({ story: story.id, theme, violations, errors });
      if (process.env.CAPTURE_STORIES === '1')
        await page.screenshot({ path: `test-results/${story.id}-${theme}.png`, fullPage: true });
    } catch (error) {
      failures.push({ story: story.id, theme, error: String(error) });
    }
    page.off('pageerror', onError);
    await page.close();
    completed++;
    console.log(`${completed}/${stories.length * 2} ${story.id} ${theme}`);
  }
  await context.close();
}
await Promise.all([worker(), worker()]);
await browser.close();
await writeFile(
  'test-results/accessibility.json',
  JSON.stringify({ checked: completed, failures }, null, 2),
);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else console.log(`All ${completed} story/theme checks passed.`);
