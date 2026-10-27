/** Verify linked anatomy markers and legends, stable geometry, and the documentation hub. */
import { chromium, expect } from '@playwright/test';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { documentationId } from './component-doc-navigation.mjs';

const base = process.env.STORYBOOK_URL || 'http://localhost:6006';
const directory = new URL('../src/stories/component-docs/generated/', import.meta.url);
const filter = process.env.ANATOMY_FILTER ? new RegExp(process.env.ANATOMY_FILTER) : null;
const requireExpansion = process.env.ANATOMY_REQUIRE_EXPANSION !== '0';
const fastAudit = process.env.ANATOMY_FAST === '1';
const allViewports = process.env.ANATOMY_ALL_VIEWPORTS === '1';
const families = (
  await Promise.all(
    (await readdir(directory))
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => JSON.parse(await readFile(new URL(name, directory), 'utf8'))),
  )
).filter((family) => !filter || filter.test(family.id));
if (!families.length) throw new Error('ANATOMY_FILTER did not match any component families');
const response = await fetch(`${base}/index.json`);
if (!response.ok) throw new Error(`Storybook index returned ${response.status}`);
const index = await response.json();
for (const family of families) {
  if (index.entries[documentationId(family)]?.type !== 'docs')
    throw new Error(`Missing canonical documentation hub for ${family.id}`);
}
if (Object.keys(index.entries).some((id) => id.startsWith('components-brand-aws-logos')))
  throw new Error('AWS logo showcase remains in the index');
const representatives = [
  'components-actions-button',
  'components-forms-field',
  'components-overlays-modal',
  'components-overlays-bottomsheet',
  'components-ai-streamingskeleton',
  'components-data-datagrid',
  'patterns-filterpanel',
];
const proofFamilies = new Set(['components-actions-button', 'components-overlays-bottomsheet']);
const jobs = new Map();
function addJob(family, theme, layout, width) {
  const job = { id: family.id, route: documentationId(family), theme, layout, width };
  jobs.set(`${family.id}/${theme}/${layout}/${width}`, job);
}
for (const family of families) {
  addJob(family, 'dark', 'fundamental', 1440);
  if (allViewports) addJob(family, 'light', 'fundamental-floating', 390);
}
for (const family of families.filter(({ id }) => representatives.includes(id))) {
  for (const [theme, layout, width] of [
    ['light', 'fundamental', 1440],
    ['light', 'fundamental-floating', 390],
    ['dark', 'fundamental-floating', 1440],
  ])
    addJob(family, theme, layout, width);
}
const queue = [...jobs.values()];
const total = queue.length;
const viewportCounts = Object.fromEntries(
  [...new Set(queue.map(({ width }) => width))].map((width) => [
    width,
    queue.filter((job) => job.width === width).length,
  ]),
);
console.log(
  `Anatomy audit: ${families.length} families, ${total} unique configurations (${Object.entries(
    viewportCounts,
  )
    .map(([width, count]) => `${count} at ${width}px`)
    .join(', ')}); ${fastAudit ? 'settled hover sweep' : 'full keyboard and hover verification'}.`,
);
const failures = [];
const results = [];
let completed = 0;
await mkdir('test-results/anatomy', { recursive: true });
const browser = await chromium.launch();

/** Measure actual browser boxes, including the specimen iframe's responsive scale. */
async function inspectGeometry(page, partNumber, baseline) {
  return page.evaluate(
    ({ partNumber, baseline }) => {
      const stage = document.querySelector('.anatomy-stage');
      const frame = stage?.querySelector('iframe');
      const doc = frame?.contentDocument;
      const definitionNode = doc?.querySelector('[data-anatomy-definition]');
      if (!stage || !frame || !doc || !definitionNode)
        return { problems: ['Anatomy specimen has not loaded'] };
      const definition = JSON.parse(definitionNode.dataset.anatomyDefinition);
      const frameBox = frame.getBoundingClientRect();
      const scaleX = frameBox.width / frame.offsetWidth;
      const scaleY = frameBox.height / frame.offsetHeight;
      const rect = (box) => ({
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      });
      const visible = (node) => {
        const box = node.getBoundingClientRect();
        const style = doc.defaultView.getComputedStyle(node);
        return (
          box.width > 0 &&
          box.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      };
      const screenRect = (node) => {
        const box = node.getBoundingClientRect();
        return {
          left: frameBox.left + box.left * scaleX,
          top: frameBox.top + box.top * scaleY,
          right: frameBox.left + box.right * scaleX,
          bottom: frameBox.top + box.bottom * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY,
        };
      };
      const tolerance = 0.75;
      const gap = (a, b) =>
        Math.hypot(
          Math.max(a.left - b.right, b.left - a.right, 0),
          Math.max(a.top - b.bottom, b.top - a.bottom, 0),
        );
      // A pill is a horizontal segment swept by a disk, not its rectangular bounding box.
      // This also covers a collapsed circular marker, whose segment has zero length.
      const capsule = (box) => {
        const radius = box.height / 2;
        const y = box.top + radius;
        return {
          segment: {
            left: box.left + radius,
            right: box.right - radius,
            top: y,
            bottom: y,
          },
          radius,
        };
      };
      const capsuleIntersectsRect = (pill, box) => {
        const { segment, radius } = capsule(pill);
        return gap(segment, box) - radius < -tolerance;
      };
      const capsulesIntersect = (a, b) => {
        const first = capsule(a);
        const second = capsule(b);
        return gap(first.segment, second.segment) - first.radius - second.radius < -tolerance;
      };
      const problems = [];
      const parts = definition.parts.map((part, index) => {
        const nodes = [...doc.querySelectorAll(part.selector)].filter(visible);
        if (!nodes.length) problems.push(`No visible target: ${part.name}`);
        const first = nodes[0]?.getBoundingClientRect();
        if (
          first &&
          (first.top < -2 ||
            first.left < -2 ||
            first.bottom > doc.defaultView.innerHeight + 2 ||
            first.right > doc.defaultView.innerWidth + 2)
        )
          problems.push(`Clipped target: ${part.name}`);
        return { ...part, number: index + 1, nodes, bounds: nodes.map(screenRect) };
      });
      const stageBox = rect(stage.getBoundingClientRect());
      const clearance = parseFloat(getComputedStyle(stage).getPropertyValue('--anatomy-clearance'));
      if (!Number.isFinite(clearance) || clearance <= 0)
        problems.push('Missing positive anatomy clearance');
      const diameter = parseFloat(
        getComputedStyle(stage).getPropertyValue('--anatomy-marker-size'),
      );
      if (!Number.isFinite(diameter) || diameter <= 0)
        problems.push('Missing positive marker diameter');
      const markers = [...stage.querySelectorAll('.anatomy-marker')].map((node) => {
        const position = node.closest('.anatomy-marker-position');
        if (!position || position.dataset.part !== node.dataset.part)
          problems.push(`Marker ${node.dataset.part} has no matching position wrapper`);
        const anchor = position?.getBoundingClientRect();
        return {
          number: Number(node.dataset.part),
          box: rect(node.getBoundingClientRect()),
          anchor: anchor ? { x: anchor.left, y: anchor.top } : undefined,
          expanded: node.dataset.expanded === 'true',
          direction: node.dataset.expandDirection,
        };
      });
      for (const marker of markers) {
        const target = parts.find((part) => part.number === marker.number);
        const ownBounds = target?.bounds[0];
        if (!ownBounds || !marker.anchor) continue;
        if (marker.expanded) {
          const button = stage.querySelector(`.anatomy-marker[data-part="${marker.number}"]`);
          const title = button.querySelector('.anatomy-marker-title');
          const number = button.querySelector('.anatomy-marker-number');
          if (!['left', 'right', 'both'].includes(marker.direction))
            problems.push(`Expanded pill ${marker.number} has no valid growth direction`);
          if (
            !title ||
            title.textContent.trim() !== target.name ||
            getComputedStyle(title).display === 'none'
          )
            problems.push(`Expanded pill ${marker.number} does not expose its complete part title`);
          if (!number || getComputedStyle(number).display !== 'none')
            problems.push(`Expanded pill ${marker.number} retains the collapsed number`);
        }
        // The zero-size position wrapper is invariant while its child expands into a pill.
        const center = {
          left: marker.anchor.x,
          right: marker.anchor.x,
          top: marker.anchor.y,
          bottom: marker.anchor.y,
        };
        const distance = gap(center, ownBounds) - diameter / 2;
        const fullStageBackdrop =
          /backdrop/i.test(`${target.name} ${target.selector}`) &&
          ownBounds.left <= stageBox.left + tolerance &&
          ownBounds.top <= stageBox.top + tolerance &&
          ownBounds.right >= stageBox.right - tolerance &&
          ownBounds.bottom >= stageBox.bottom - tolerance;
        if (!fullStageBackdrop && distance + tolerance < clearance)
          problems.push(
            `Marker ${marker.number} (${target.name}) has ${distance.toFixed(2)}px own-part clearance; expected at least ${clearance}px`,
          );
        if (
          marker.box.left < stageBox.left - tolerance ||
          marker.box.right > stageBox.right + tolerance ||
          marker.box.top < stageBox.top - tolerance ||
          marker.box.bottom > stageBox.bottom + tolerance
        )
          problems.push(`Marker ${marker.number} leaves the anatomy stage`);
        if (marker.box.width > diameter + tolerance || fullStageBackdrop) {
          for (const part of parts) {
            part.bounds.forEach((box, index) => {
              const own = part.nodes[index] === target.nodes[0];
              // The target may be nested in a broad blank panel. That ancestor's
              // fill is not an obstruction, but the target itself always remains one.
              const sameBounds =
                box.left === ownBounds.left &&
                box.top === ownBounds.top &&
                box.right === ownBounds.right &&
                box.bottom === ownBounds.bottom;
              const surrounding =
                !own &&
                !sameBounds &&
                !fullStageBackdrop &&
                box.left <= ownBounds.left &&
                box.right >= ownBounds.right &&
                box.top <= ownBounds.top &&
                box.bottom >= ownBounds.bottom;
              if (
                !(own && fullStageBackdrop) &&
                !surrounding &&
                capsuleIntersectsRect(marker.box, box)
              )
                problems.push(`Expanded pill ${marker.number} intersects ${part.name}`);
            });
          }
          for (const sibling of markers) {
            if (sibling.number !== marker.number && capsulesIntersect(marker.box, sibling.box))
              problems.push(`Expanded pill ${marker.number} intersects marker ${sibling.number}`);
          }
        }
      }
      if (document.querySelector('.anatomy-tooltip, .anatomy-documentation [role="tooltip"]'))
        problems.push('Anatomy renders a detached tooltip instead of its persistent legend');
      const layout = Object.fromEntries(
        ['.anatomy-stage', '.anatomy-viewer', '.anatomy-legend', '.anatomy-documentation'].map(
          (selector) => {
            const box = document.querySelector(selector).getBoundingClientRect();
            return [
              selector,
              {
                left: box.left + scrollX,
                top: box.top + scrollY,
                width: box.width,
                height: box.height,
              },
            ];
          },
        ),
      );
      if (baseline) {
        for (const [selector, box] of Object.entries(layout)) {
          for (const key of ['left', 'top', 'width', 'height']) {
            if (Math.abs(box[key] - baseline[selector][key]) > tolerance)
              problems.push(
                `${selector} ${key} changed from ${baseline[selector][key].toFixed(2)} to ${box[key].toFixed(2)} during anatomy interaction`,
              );
          }
        }
      }
      for (const marker of stage.querySelectorAll('.anatomy-marker')) {
        const number = Number(marker.dataset.part);
        const entry = document.querySelectorAll('.anatomy-legend li')[number - 1];
        const ids = (marker.getAttribute('aria-describedby') || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const descriptions = ids.map((id) => document.getElementById(id));
        if (
          !descriptions.length ||
          descriptions.some(
            (node) => !node?.matches('.anatomy-legend-description') || !entry?.contains(node),
          )
        )
          problems.push(
            `Marker ${number} aria-describedby does not point to its legend description`,
          );
        else if (
          descriptions.map((node) => node.textContent.trim()).join(' ') !==
          definition.parts[number - 1].description.trim()
        )
          problems.push(`Marker ${number} description differs from the specimen definition`);
        const control = entry?.querySelector('.anatomy-legend-trigger');
        if (
          Number(control?.dataset.part) !== number ||
          control?.getAttribute('aria-describedby') !== marker.getAttribute('aria-describedby')
        )
          problems.push(
            `Legend control ${number} does not share its marker and description association`,
          );
      }
      if (partNumber !== undefined) {
        const highlights = document.querySelectorAll('.anatomy-highlight');
        const activeMarkers = [...stage.querySelectorAll('.anatomy-marker[data-active="true"]')];
        const activeEntries = [
          ...document.querySelectorAll('.anatomy-legend li[data-active="true"]'),
        ];
        const expectedEntry = document.querySelectorAll('.anatomy-legend li')[partNumber - 1];
        if (
          highlights.length !== 1 ||
          activeMarkers.length !== 1 ||
          Number(activeMarkers[0]?.dataset.part) !== partNumber ||
          activeEntries.length !== 1 ||
          activeEntries[0] !== expectedEntry
        ) {
          problems.push(
            `Part ${partNumber} does not have exactly one matching marker, legend entry, and target highlight`,
          );
        } else {
          const target = parts[partNumber - 1]?.bounds[0];
          const highlight = highlights[0].getBoundingClientRect();
          if (
            !target ||
            highlight.left > target.left + tolerance ||
            highlight.top > target.top + tolerance ||
            highlight.right < target.right - tolerance ||
            highlight.bottom < target.bottom - tolerance
          )
            problems.push(`Part ${partNumber} highlight does not enclose its actual target`);
        }
      }
      return { problems, partNumber, markerCount: markers.length, markers, stageBox, layout };
    },
    { partNumber, baseline },
  );
}

async function assertGeometry(page, partNumber, baseline) {
  let measurement;
  await expect
    .poll(
      async () => {
        measurement = await inspectGeometry(page, partNumber, baseline);
        return measurement.problems;
      },
      { message: `Part ${partNumber ?? 'all'} anatomy geometry`, timeout: 5000 },
    )
    .toEqual([]);
  return measurement;
}

async function assertCleared(page, baseline) {
  await expect(page.locator('.anatomy-highlight')).toHaveCount(0);
  await expect(
    page.locator('.anatomy-marker[data-active="true"], .anatomy-legend li[data-active="true"]'),
  ).toHaveCount(0);
  await expect(page.locator('.anatomy-documentation [aria-pressed="true"]')).toHaveCount(0);
  await assertGeometry(page, undefined, baseline);
}

async function inspectExpansion(marker) {
  return marker.evaluate((node) => {
    const title = node.querySelector('.anatomy-marker-title');
    const style = title ? getComputedStyle(title) : null;
    const padding = style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 0;
    const diameter = parseFloat(
      getComputedStyle(node.closest('.anatomy-stage')).getPropertyValue('--anatomy-marker-size'),
    );
    return {
      part: Number(node.dataset.part),
      name: node.getAttribute('aria-label'),
      expanded: node.dataset.expanded === 'true',
      direction: node.dataset.expandDirection,
      buttonWidth: node.getBoundingClientRect().width,
      diameter,
      visible:
        !!title &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        title.getBoundingClientRect().height > 0,
      titleClientWidth: title?.clientWidth ?? 0,
      titleScrollWidth: title?.scrollWidth ?? 0,
      titleContentWidth: Math.max(0, (title?.clientWidth ?? 0) - padding),
      minimumVisibleText: style
        ? Math.min(parseFloat(style.fontSize), Math.max(0, title.scrollWidth - padding))
        : 0,
      clipped: !!title && title.scrollWidth > title.clientWidth + 1,
    };
  });
}

function expansionProblems(measurement) {
  const problems = [];
  if (!measurement.expanded) problems.push('Marker stayed circular instead of expanding');
  if (!measurement.visible) problems.push('Expanded title is not visible');
  if (measurement.buttonWidth <= measurement.diameter + 1)
    problems.push('Pill did not grow beyond its collapsed diameter');
  if (
    measurement.minimumVisibleText <= 0 ||
    measurement.titleContentWidth + 1 < measurement.minimumVisibleText
  )
    problems.push('Pill has insufficient visible text space');
  if (measurement.clipped) problems.push('Expanded part title is truncated');
  return problems;
}

async function assertEscapeSurvivesPointerLeave(page, control, baseline) {
  await control.click();
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await control.press('Escape');
  await assertCleared(page, baseline);
  await expect(control).toBeFocused();
  await page.mouse.move(0, 0);
  // Observe the delayed hover cleanup, rather than accepting only the first cleared frame.
  const reactivated = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const start = performance.now();
        const check = () => {
          const active = document.querySelector(
            '.anatomy-highlight, .anatomy-marker[data-active="true"], .anatomy-legend li[data-active="true"]',
          );
          if (active) resolve(true);
          else if (performance.now() - start >= 250) resolve(false);
          else requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }),
  );
  expect(reactivated, 'Escape-dismissed focus must not reactivate on pointer leave').toBe(false);
  await assertCleared(page, baseline);
  await control.evaluate((node) => node.blur());
}

/** Let finite entrance motion finish, then observe a complete 300ms marker-measurement cycle. */
async function waitForSpecimenStability(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const started = performance.now();
        let unchangedSince = started;
        let previous = '';
        const sample = () => {
          const now = performance.now();
          const stage = document.querySelector('.anatomy-stage');
          const frame = stage?.querySelector('iframe');
          const doc = frame?.contentDocument;
          const markers = [...document.querySelectorAll('.anatomy-marker-position')];
          const finiteMotion = doc?.getAnimations().some((animation) => {
            const timing = animation.effect?.getComputedTiming();
            return (
              (animation.pending || animation.playState === 'running') &&
              Number.isFinite(timing?.endTime)
            );
          });
          const boxes = [stage, frame, ...markers].map((node) => {
            const box = node?.getBoundingClientRect();
            return box
              ? [box.left, box.top, box.width, box.height].map(
                  (value) => Math.round(value * 100) / 100,
                )
              : null;
          });
          const current = JSON.stringify(boxes);
          if (!doc || !markers.length || finiteMotion || current !== previous) {
            unchangedSince = now;
            previous = current;
          } else if (now - unchangedSince >= 350) {
            resolve();
            return;
          }
          if (now - started >= 8000) {
            reject(new Error('Anatomy entrance motion and marker geometry did not settle'));
            return;
          }
          requestAnimationFrame(sample);
        };
        sample();
      }),
  );
}

async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const { id, route, theme, layout, width } = job;
    const page = await browser.newPage({
      viewport: { width, height: 1100 },
      reducedMotion: 'reduce',
    });
    const errors = [];
    const measurements = [];
    const expansions = [];
    const markerFailures = [];
    let initialGeometryIssues = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const proof = `test-results/anatomy/${id}-${theme}-${layout}-${width}`;
    try {
      const params = new URLSearchParams({
        id: route,
        viewMode: 'docs',
        docsTab: 'guidelines',
        docsSection: 'anatomy',
        globals: `theme:${theme};layoutTheme:${layout}`,
      });
      await page.goto(`${base}/iframe.html?${params}`);
      const tabs = page.locator('.component-docs-tabs');
      for (const label of ['Overview', 'Component Guidelines', 'Tokens Used', 'Examples'])
        await expect(tabs.getByRole('tab', { name: label, exact: true })).toBeVisible({
          timeout: 45000,
        });
      await expect(
        tabs.getByRole('tab', { name: 'Component Guidelines', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      const markers = page.locator('.anatomy-marker');
      await markers.first().waitFor({ timeout: 45000 });
      await expect
        .poll(
          async () => {
            const count = await markers.count();
            return count > 0 && count === (await page.locator('.anatomy-legend li').count());
          },
          { timeout: 10000 },
        )
        .toBe(true);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await document.querySelector('.anatomy-stage iframe').contentDocument.fonts.ready;
      });
      await page.locator('.anatomy-viewer').scrollIntoViewIfNeeded();
      await waitForSpecimenStability(page);
      const initialGeometry = fastAudit ? await inspectGeometry(page) : await assertGeometry(page);
      const baseline = initialGeometry.layout;
      initialGeometryIssues = initialGeometry.problems;
      if (proofFamilies.has(id))
        await page.locator('.anatomy-documentation').screenshot({ path: `${proof}-before.png` });
      const count = await markers.count();
      for (let part = 0; part < count; part++) {
        const marker = markers.nth(part);
        const entry = page.locator('.anatomy-legend li').nth(part);
        const legendControl = entry.getByRole('button');
        let expansion;
        try {
          await expect(legendControl).toHaveCount(1);
          if (fastAudit) {
            await marker.hover();
            await expect(marker).toHaveAttribute('data-active', 'true');
            // Reduced motion is enabled. Two paint frames allow the hover and its
            // measured expansion to settle without retrying a genuinely collapsed label.
            await page.evaluate(
              () =>
                new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                ),
            );
            expansion = await inspectExpansion(marker);
            const geometry = await inspectGeometry(page, part + 1, baseline);
            measurements.push(geometry);
            const problems = [
              ...(requireExpansion ? expansionProblems(expansion) : []),
              ...geometry.problems,
            ];
            if (problems.length)
              markerFailures.push({
                part: part + 1,
                error: problems.join('; '),
                expansion,
                geometry,
              });
            if (
              proofFamilies.has(id) &&
              part === (id === 'components-overlays-bottomsheet' && count > 1 ? 1 : 0)
            )
              await page
                .locator('.anatomy-documentation')
                .screenshot({ path: `${proof}-active.png` });
            continue;
          }
          await marker.focus();
          if (requireExpansion) {
            await expect
              .poll(
                async () => {
                  expansion = await inspectExpansion(marker);
                  return expansionProblems(expansion);
                },
                { message: `${id} part ${part + 1} must visibly expand`, timeout: 3000 },
              )
              .toEqual([]);
          } else expansion = await inspectExpansion(marker);
          measurements.push(await assertGeometry(page, part + 1, baseline));
          if (
            proofFamilies.has(id) &&
            part === (id === 'components-overlays-bottomsheet' && count > 1 ? 1 : 0)
          ) {
            await page
              .locator('.anatomy-documentation')
              .screenshot({ path: `${proof}-active.png` });
            await assertGeometry(page, part + 1, baseline);
          }
          await marker.press('Enter');
          await expect(marker).toHaveAttribute('aria-pressed', 'true');
          await expect(legendControl).toHaveAttribute('aria-pressed', 'true');
          await marker.evaluate((node) => node.blur());
          await page.mouse.move(0, 0);
          await assertGeometry(page, part + 1, baseline);
          await marker.press('Escape');
          await assertCleared(page, baseline);

          // The persistent legend supports the same keyboard pinning and counterpart highlight.
          await legendControl.focus();
          await assertGeometry(page, part + 1, baseline);
          await legendControl.press('Enter');
          await expect(legendControl).toHaveAttribute('aria-pressed', 'true');
          await expect(marker).toHaveAttribute('aria-pressed', 'true');
          await legendControl.evaluate((node) => node.blur());
          await assertGeometry(page, part + 1, baseline);
          await legendControl.press('Escape');
          await assertCleared(page, baseline);
          await legendControl.evaluate((node) => node.blur());

          // Hovering either surface highlights its counterpart without adding any new content.
          await marker.hover();
          await assertGeometry(page, part + 1, baseline);
          await legendControl.hover();
          await assertGeometry(page, part + 1, baseline);
          await page.mouse.move(0, 0);
          await assertCleared(page, baseline);
        } catch (error) {
          if (!fastAudit) throw error;
          markerFailures.push({
            part: part + 1,
            error: String(error),
            expansion: expansion ?? (await inspectExpansion(marker).catch(() => null)),
            geometry: await inspectGeometry(page, part + 1, baseline).catch(() => null),
          });
        } finally {
          expansions.push(
            expansion ??
              (await inspectExpansion(marker).catch(() => ({ part: part + 1, unavailable: true }))),
          );
        }
      }
      if (fastAudit) {
        await page.mouse.move(0, 0);
        if (initialGeometryIssues.length || markerFailures.length)
          throw new Error(
            `Fast audit found ${markerFailures.length} marker failures and ${initialGeometryIssues.length} initial geometry issues`,
          );
        await assertCleared(page, baseline);
      } else {
        await assertEscapeSurvivesPointerLeave(page, markers.first(), baseline);
        await assertEscapeSurvivesPointerLeave(
          page,
          page.locator('.anatomy-legend li').first().getByRole('button'),
          baseline,
        );
      }
      if (width === 390) {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        );
        if (overflow) throw new Error('Mobile documentation overflows horizontally');
      }
      if (errors.length) throw new Error(errors.join('; '));
      if (representatives.includes(id) && !proofFamilies.has(id))
        await page.locator('.anatomy-viewer').screenshot({ path: `${proof}.png` });
      results.push({ ...job, markers: count, expansions, measurements });
    } catch (error) {
      failures.push({
        ...job,
        error: String(error),
        expansions,
        markerFailures,
        initialGeometryIssues,
        geometry: await inspectGeometry(page).catch(() => null),
        pageErrors: errors,
      });
      await page.screenshot({ path: `${proof}-failure.png` }).catch(() => undefined);
    } finally {
      await page.close();
      console.log(`${++completed}/${total} ${id} ${theme} ${layout} ${width}`);
    }
  }
}
await Promise.all([worker(), worker()]);
await browser.close();
const markersChecked = [...results, ...failures].reduce(
  (sum, result) => sum + result.expansions.length,
  0,
);
const failedMarkers = failures.reduce((sum, failure) => sum + failure.markerFailures.length, 0);
const coverage = {
  families: families.length,
  configurations: total,
  completed,
  passed: results.length,
  failed: failures.length,
  viewportCounts,
  markersChecked,
  failedMarkers,
};
await writeFile(
  'test-results/anatomy/report.json',
  JSON.stringify(
    { checked: completed, coverage, requireExpansion, fastAudit, allViewports, results, failures },
    null,
    2,
  ),
);
console.log(
  `Checked ${families.length} families in ${completed}/${total} configurations and ${markersChecked} marker interactions: ${results.length} configurations passed, ${failures.length} failed${fastAudit ? ` (${failedMarkers} marker failures)` : ''}.`,
);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `All ${completed} anatomy checks passed, including ${requireExpansion ? 'required expansion, ' : ''}linked descriptions, stable geometry, ${fastAudit ? 'hover audit' : 'keyboard/hover behavior'}, and hub navigation.`,
  );
}
