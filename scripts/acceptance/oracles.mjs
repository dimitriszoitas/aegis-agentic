import assert from 'node:assert/strict';
import { expect } from '@playwright/test';

/** Pure decision boundary, shared by browser observations and adversarial fixtures. */
export function checkPushGeometry({ before, after, panel, viewport, documentWidth, narrow }) {
  assert(before && after && panel, 'Push filtering requires measurable results and panel');
  assert(panel.width > 0 && panel.height > 0, 'Filter panel has visible geometry');
  assert(panel.x >= -1 && panel.x + panel.width <= viewport + 1, 'Filter panel fits viewport');
  assert(documentWidth <= viewport + 1, 'Filter panel does not create page overflow');
  if (narrow) {
    assert(panel.y + panel.height <= after.y + 1, 'Narrow filter panel stacks before results');
  } else {
    assert(
      before.width - after.width >= panel.width - 1,
      'Push filtering reduces results width by at least the full panel width',
    );
    const moved = after.x > before.x + 1 || after.x + after.width < before.x + before.width - 1;
    assert(moved, 'Push filtering changes the results boundary');
    assert(
      panel.x + panel.width <= after.x + 1 || after.x + after.width <= panel.x + 1,
      'Filter panel and results do not overlap',
    );
  }
  return { before, after, panel, viewport, documentWidth, adaptation: narrow ? 'stack' : 'push' };
}

/** The caller opens its own pattern. The geometry and usability oracle stays identical. */
export async function assertPushFilterLayout({
  page,
  panel,
  results,
  before,
  interactive,
  breakpoint = 767,
}) {
  await expect(panel).toBeVisible();
  const viewport = await results.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  const observations = checkPushGeometry({
    before,
    after: await results.boundingBox(),
    panel: await panel.boundingBox(),
    viewport: viewport.width,
    documentWidth: viewport.documentWidth,
    narrow: viewport.width <= breakpoint,
  });
  assert(
    await panel.evaluate(
      (node, resultNode) =>
        Boolean(node.compareDocumentPosition(resultNode) & Node.DOCUMENT_POSITION_FOLLOWING),
      await results.elementHandle(),
    ),
    'Filter controls precede results in document order',
  );
  assert(
    await panel.evaluate(
      (node) => node.tagName === 'ASIDE' || node.getAttribute('role') === 'complementary',
    ),
    'In-flow panel exposes complementary semantics',
  );
  assert.equal(await page.getByRole('dialog').count(), 0, 'Push filters are not a modal dialog');
  assert.equal(
    await page.locator('.aegis-modal-overlay, .aegis-sheet-overlay, [data-aegis-overlay]').count(),
    0,
    'Push filters create no modal backdrop',
  );
  assert.equal(
    await results.evaluate((node) => Boolean(node.closest('[inert], [aria-hidden="true"]'))),
    false,
    'Results remain exposed and interactive',
  );
  await expect(results.locator('[inert]')).toHaveCount(0);
  // Focus and a real pointer hit-test catch an overlay intercepting otherwise visible results.
  await results.click({ trial: true });
  await interactive.scrollIntoViewIfNeeded();
  await interactive.click({ trial: true });
  await interactive.focus();
  await expect(interactive).toBeFocused();
  return { ...observations, resultsInteractive: true, modalBackdrop: false };
}

export function checkDensityMeasurements(samples) {
  assert.deepEqual(
    samples.map((sample) => sample.density),
    ['compact', 'default', 'comfortable'],
  );
  for (const sample of samples) {
    assert.equal(sample.selected, true, `${sample.density} selected control acknowledges state`);
    assert(
      Number.isFinite(sample.height) && sample.height > 0,
      `${sample.density} row has measurable height`,
    );
  }
  assert(
    samples[0].height < samples[1].height && samples[1].height < samples[2].height,
    `Density must change rendered row height, observed ${samples.map((sample) => sample.height).join('/')}`,
  );
  return samples;
}

async function gridContentSnapshot(grid) {
  return grid.evaluate((element) => {
    const normalize = (value) => value.replace(/\s+/g, ' ').trim();
    const paintIssues = [];
    const rows = [...element.querySelectorAll('.aegis-grid-row')].map((row) => {
      const label = row.getAttribute('aria-label');
      if (!row.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
        paintIssues.push(`${label ?? 'row'} is not painted`);
      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode())) {
        const parent = text.parentElement;
        if (!normalize(text.textContent) || parent.closest('.sr-only, [aria-hidden="true"]'))
          continue;
        const style = getComputedStyle(parent);
        const range = document.createRange();
        range.selectNodeContents(text);
        const bounds = range.getBoundingClientRect();
        let concealed = false;
        for (let ancestor = parent; ancestor; ancestor = ancestor.parentElement) {
          const computed = getComputedStyle(ancestor);
          if (
            Number(computed.opacity) <= 0 ||
            computed.visibility !== 'visible' ||
            computed.clipPath !== 'none' ||
            (computed.clip !== 'auto' && computed.clip !== '') ||
            /opacity\(0(?:%|(?:\.0+))?\)/.test(computed.filter)
          )
            concealed = true;
        }
        const transparent = /(?:rgba\([^)]*,\s*0\s*\)|\/\s*0\s*\))$/.test(style.color);
        if (
          concealed ||
          transparent ||
          Number.parseFloat(style.fontSize) <= 0 ||
          bounds.width <= 0 ||
          bounds.height <= 0
        )
          paintIssues.push(`${label ?? 'row'} contains concealed text`);
      }
      const value = normalize(row.innerText);
      if (!value) paintIssues.push(`${label ?? 'row'} has no visible text`);
      return { label, selected: row.getAttribute('aria-selected'), text: value };
    });
    return {
      rows,
      headers: [...element.querySelectorAll('[role="columnheader"]')].map((header) =>
        normalize(header.innerText),
      ),
      paintIssues,
    };
  });
}

export async function assertDensityChanges({ grid, expectedRows }) {
  const original = await grid.getAttribute('data-density');
  const baseline = await gridContentSnapshot(grid);
  assert(baseline.rows.length, 'Density acceptance requires populated rows');
  assert.deepEqual(baseline.paintIssues, [], 'Baseline grid content remains visibly painted');
  if (expectedRows) {
    assert.deepEqual(
      baseline.rows.map((row) => row.label),
      expectedRows.map((row) => row.label),
      'Fixture row identities match immutable expected data',
    );
    for (const [index, expected] of expectedRows.entries())
      for (const text of expected.text)
        assert(
          baseline.rows[index].text.includes(text),
          `Fixture row ${expected.label} visibly contains ${text}`,
        );
  }
  const samples = [];
  try {
    for (const density of ['compact', 'default', 'comfortable']) {
      const control = grid.getByRole('button', { name: density, exact: true });
      await control.click();
      await expect(grid).toHaveAttribute('data-density', density);
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      const row = grid.locator('.aegis-grid-row').first();
      await expect(row).toBeVisible();
      const current = await gridContentSnapshot(grid);
      assert.deepEqual(current.paintIssues, [], `${density} content remains visibly painted`);
      assert.deepEqual(
        current.rows,
        baseline.rows,
        `${density} preserves row count, identity, selection and visible content`,
      );
      assert.deepEqual(current.headers, baseline.headers, `${density} preserves column headers`);
      samples.push({
        density,
        selected: true,
        height: await row.evaluate((node) => node.getBoundingClientRect().height),
      });
    }
    return {
      samples: checkDensityMeasurements(samples),
      preserved: {
        rowCount: baseline.rows.length,
        columnCount: baseline.headers.length,
        rowIdentity: true,
        selection: true,
        visibleContent: true,
      },
    };
  } finally {
    if (original && ['compact', 'default', 'comfortable'].includes(original))
      await grid.getByRole('button', { name: original, exact: true }).click();
  }
}

/** Works with a Playwright Page or frame; portaled popup must be located in the same document. */
export async function assertKeyboardDismissal({ trigger, popup }) {
  await trigger.focus();
  await trigger.press('Enter');
  await expect(popup).toBeVisible();
  // Base UI schedules initial focus after mount. Observe the required eventual
  // focus state instead of racing the first visible animation frame.
  await expect
    .poll(() => popup.evaluate((node) => node.contains(node.ownerDocument.activeElement)), {
      message: 'Opening moves focus inside the modal task',
      timeout: 3000,
    })
    .toBe(true);
  await popup.press('Escape');
  await expect(popup).not.toBeVisible();
  await expect(trigger).toBeFocused();
  return {
    openedBy: 'Enter',
    dismissedBy: 'Escape',
    initialFocusInside: true,
    focusReturned: true,
  };
}
