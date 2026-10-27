import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Reads a running local service. A rules-only plan is opt-in because it persists a service run.
const base = process.env.AGENTIC_URL || 'http://127.0.0.1:4175';
const requestPlan = process.env.INFRASTRUCTURE_TEST_PLAN === '1';
const output = 'artifacts/agentic-ui';
await mkdir(output, { recursive: true });
const report = {
  base,
  evidence: 'real-local-service-browser-verification',
  checks: [],
  screenshots: [],
  browserErrors: [],
};
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1512, height: 1100 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.on('pageerror', (error) => report.browserErrors.push(error.message));
try {
  await page.goto(base);
  const response = await page.request.get(`${base}/api/aegis/status`);
  assert(response.ok(), `Infrastructure status HTTP ${response.status()}`);
  const status = await response.json();
  report.snapshot = {
    project: status.project,
    health: status.health,
    release: status.release,
    capabilities: status.capabilities,
    usage: status.usage,
    ai: status.ai,
  };
  await page
    .getByRole('navigation', { name: 'Workbench sections' })
    .getByRole('button', { name: /Infrastructure/ })
    .click();
  await expect(page.getByText(status.project.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search configuration inventory' })).toBeVisible();
  await expect(page.locator('.aip-component')).toHaveCount(status.capabilities.components);
  await expect(
    page.getByRole('checkbox', { name: 'Include AI analysis', exact: true }),
  ).not.toBeChecked();
  report.checks.push(
    'Actual service status and configuration inventory render through the same-origin proxy; AI starts unchecked.',
  );
  if (requestPlan) {
    const received = page.waitForResponse(
      (item) => item.url().endsWith('/api/aegis/plan') && item.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
    const planResponse = await received;
    assert(planResponse.ok(), `Plan HTTP ${planResponse.status()}`);
    const plan = await planResponse.json();
    assert.equal(plan.source, 'rules');
    assert.equal(plan.verification, 'proposal-only');
    await expect(page.getByTestId('infrastructure-plan')).toContainText(plan.summary);
    report.plan = {
      id: plan.id,
      status: plan.status,
      source: plan.source,
      proposalCount: plan.proposals.length,
      verification: plan.verification,
    };
    report.checks.push(
      'Explicit rules-only plan is created by the actual service and shown as proposal-only; no AI or telemetry changes requested.',
    );
  }
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  report.accessibilityViolations = scan.violations.map(({ id, nodes }) => ({
    id,
    targets: nodes.map(({ target }) => target),
  }));
  assert.deepEqual(report.accessibilityViolations, []);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/infrastructure-connected-live.png`, fullPage: true });
  report.screenshots.push(`${output}/infrastructure-connected-live.png`);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${output}/infrastructure-mobile-live.png`, fullPage: true });
  report.screenshots.push(`${output}/infrastructure-mobile-live.png`);
  assert.deepEqual(report.browserErrors, []);
  report.checks.push(
    'Actual service console passes accessibility and 390px overflow checks without browser errors.',
  );
} finally {
  await writeFile(`${output}/infrastructure-live-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  `Live infrastructure verified: ${report.checks.length} checks. ${report.plan ? 'One local rules plan persisted.' : 'Read-only inspection.'}`,
);
