import assert from 'node:assert/strict';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Real, read-only service verification. No request routes, mocked API responses,
// trace/HAR capture, persisted browser state, or default administrator credential.
// Supply AEGIS_WORKSPACE_TOKEN_FILE explicitly; only a scoped viewer is accepted.
// Optional AEGIS_WORKSPACE_EXPECTATIONS is a JSON map of project IDs to
// { revision, generations }, enabling exact checks for a prepared workspace.
const base = process.env.AGENTIC_URL || 'http://127.0.0.1:4176';
const tokenPath = process.env.AEGIS_WORKSPACE_TOKEN_FILE;
assert.ok(tokenPath, 'AEGIS_WORKSPACE_TOKEN_FILE must name a scoped viewer credential file.');
const fileInfo = await lstat(tokenPath);
assert.ok(fileInfo.isFile() && !fileInfo.isSymbolicLink(), 'Credential must be a regular file.');
assert.equal(fileInfo.mode & 0o077, 0, 'Credential file must have owner-only permissions.');
let token = (await readFile(tokenPath, 'utf8')).trim();
assert.ok(/^[A-Za-z0-9_-]{32,256}$/.test(token), 'Unsupported credential format.');
const expectations = JSON.parse(process.env.AEGIS_WORKSPACE_EXPECTATIONS || '{}');
const output = 'artifacts/agentic-ui';
await mkdir(output, { recursive: true });
const report = {
  base,
  evidence: 'actual-signed-shared-workspace-browser-verification',
  scope:
    'Scoped viewer; GET-only inspection. No mocked routes, usage ingestion, settings changes, repair, retention, AI, or release activation.',
  checks: [],
  projects: [],
  requests: [],
  accessibility: [],
  screenshots: [],
  browserErrors: [],
};
const redact = (value) => String(value).split(token).join('[redacted credential]');
let browser;
let failed = false;
try {
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1512, height: 1100 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.browserErrors.push(redact(error.message)));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/aegis')) return;
    // Deliberately record neither headers nor request bodies.
    report.requests.push({ method: request.method(), path: url.pathname });
  });
  async function read(path) {
    const response = await context.request.get(`${base}/api/aegis-workspace${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Aegis-Client': 'console',
        Accept: 'application/json',
      },
      maxRedirects: 0,
    });
    assert.ok(response.ok(), `Read-only workspace endpoint returned HTTP ${response.status()}.`);
    return response.json();
  }
  async function scan(label) {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const violations = result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    }));
    report.accessibility.push({ label, violations });
    assert.deepEqual(violations, [], `${label} accessibility`);
  }
  async function capture(name) {
    assert.equal(
      await page.getByLabel('Workspace access token', { exact: true }).count(),
      0,
      'Never capture the credential input.',
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    const path = `${output}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    report.screenshots.push(path);
  }
  const catalog = await read('/projects');
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.actor.role, 'viewer', 'The live check requires a viewer credential.');
  assert.ok(catalog.projects.length > 0, 'Viewer must have visible projects.');
  for (const id of Object.keys(expectations))
    assert.ok(
      catalog.projects.some((project) => project.id === id),
      `Expected project ${id} must be visible.`,
    );
  const before = new Map();
  for (const project of catalog.projects) {
    // An independent service maintenance cycle may be finishing before inspection.
    let status;
    await expect
      .poll(
        async () => {
          status = await read(`/projects/${project.id}/status`);
          return status.health.status;
        },
        { timeout: 90000, intervals: [1000, 5000, 10000] },
      )
      .toBe('healthy');
    const history = await read(`/projects/${project.id}/generations`);
    assert.equal(status.project.id, project.id);
    assert.equal(status.workspace.releaseVerified, true);
    assert.equal(status.usage.eventCount, 0);
    assert.equal(status.usage.telemetryEnabled, false);
    assert.equal(status.ai.configured, false);
    assert.equal(status.workspace.projectRevision, project.revision);
    if (expectations[project.id]) {
      assert.equal(
        status.workspace.projectRevision,
        expectations[project.id].revision,
        `${project.id} revision`,
      );
      assert.equal(
        history.generations.length,
        expectations[project.id].generations,
        `${project.id} retained generation count`,
      );
    }
    assert.ok(history.generations.every((generation) => generation.projectId === project.id));
    before.set(project.id, { status, history });
    report.projects.push({
      id: project.id,
      name: project.name,
      health: status.health.status,
      revision: status.workspace.projectRevision,
      generationId: status.workspace.generationId,
      generationCount: history.generations.length,
      releaseVerified: status.workspace.releaseVerified,
      kitDigest: status.workspace.kitDigest,
      componentCount: status.capabilities.components,
      eventCount: status.usage.eventCount,
      telemetryEnabled: status.usage.telemetryEnabled,
      aiConfigured: status.ai.configured,
    });
  }
  await page.goto(base);
  await page
    .getByRole('navigation', { name: 'Workbench sections' })
    .getByRole('button', { name: /Infrastructure/ })
    .click();
  await page.getByRole('radio', { name: 'Shared workspace', exact: true }).check();
  assert.equal(
    report.requests.filter((request) => request.path.startsWith('/api/aegis-workspace')).length,
    0,
    'Shared connection requires explicit submission.',
  );
  const credentialInput = page.getByLabel('Workspace access token', { exact: true });
  await credentialInput.fill(token);
  await page.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await expect(page.getByTestId('workspace-role')).toHaveText('viewer');
  await expect(page.getByRole('combobox', { name: 'Workspace project' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Workspace project' }).click();
  await expect(page.getByRole('option')).toHaveCount(catalog.projects.length);
  for (const project of catalog.projects)
    await expect(page.getByRole('option', { name: project.name, exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  report.checks.push(
    'A real scoped viewer authenticates through the same-origin proxy and sees exactly the permitted project list.',
  );
  for (let index = 0; index < catalog.projects.length; index++) {
    const project = catalog.projects[index];
    const snapshot = before.get(project.id);
    if (index > 0) {
      await page.getByRole('combobox', { name: 'Workspace project' }).click();
      await page.getByRole('option', { name: project.name, exact: true }).click();
    }
    const release = page.getByTestId('workspace-release');
    await expect(release).toContainText(snapshot.status.workspace.generationId);
    await expect(release).toContainText('Verified release signature');
    await expect(page.locator('.aip-component')).toHaveCount(
      snapshot.status.capabilities.components,
    );
    await expect(
      page.getByRole('button', { name: 'Plan maintenance', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Run retention', exact: true })).toBeDisabled();
    await expect(
      page.getByRole('checkbox', { name: 'Accept permitted usage events', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('checkbox', { name: 'Accept permitted usage events', exact: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: 'Include AI analysis', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('checkbox', { name: 'Include AI analysis', exact: true }),
    ).not.toBeChecked();
    const summary = release.locator('summary');
    await expect(summary).toHaveText(`Generation history (${snapshot.history.generations.length})`);
    if (!(await summary.evaluate((node) => node.parentElement.open))) await summary.click();
    await expect(page.locator('.aip-history li')).toHaveCount(snapshot.history.generations.length);
    for (const generation of snapshot.history.generations)
      await expect(page.locator('.aip-history')).toContainText(generation.id);
    await expect(page.locator('.aip-history')).toContainText('Active');
    await scan(`${project.id} desktop viewer`);
    await capture(`shared-workspace-${project.id}-live`);
  }
  report.checks.push(
    'Project switching renders real verified release identity, exact revisions/generation history, complete component inventory, zero usage, and disabled viewer mutations.',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Mobile console fits the viewport.',
  );
  await scan('Shared workspace mobile viewer');
  await capture('shared-workspace-mobile-live');
  const persisted = await page.evaluate(() =>
    JSON.stringify({ local: localStorage, session: sessionStorage, url: location.href }),
  );
  assert.ok(!persisted.includes(token), 'Credential is absent from browser storage and URLs.');
  await page.getByRole('button', { name: 'Disconnect workspace', exact: true }).click();
  await expect(credentialInput).toHaveValue('');
  await expect(page.getByTestId('workspace-release')).toHaveCount(0);
  assert.ok(
    report.requests.every((request) => request.method === 'GET'),
    'Browser must only issue API GET requests.',
  );
  for (const project of catalog.projects) {
    const after = await read(`/projects/${project.id}/status`);
    const snapshot = before.get(project.id).status;
    assert.deepEqual(
      after.workspace,
      snapshot.workspace,
      `${project.id} release identity unchanged`,
    );
    assert.deepEqual(after.usage, snapshot.usage, `${project.id} usage unchanged`);
    assert.deepEqual(after.ai, snapshot.ai, `${project.id} AI configuration unchanged`);
    assert.deepEqual(after.recentRuns, snapshot.recentRuns, `${project.id} service runs unchanged`);
  }
  assert.deepEqual(report.browserErrors, []);
  report.checks.push(
    'Desktop/mobile accessibility and overflow checks pass; disconnect clears credentials; only GETs occurred and project identity, usage, AI, and service runs stayed unchanged.',
  );
  report.result = 'passed';
} catch (error) {
  failed = true;
  report.result = 'failed';
  // Playwright call logs can contain a filled string. Redact before any output.
  report.error = redact(error instanceof Error ? error.stack : error);
} finally {
  if (browser) await browser.close();
  await writeFile(
    `${output}/shared-workspace-live-report.json`,
    redact(JSON.stringify(report, null, 2)),
  );
  token = '';
}
if (failed) {
  console.error(report.error);
  process.exitCode = 1;
} else
  console.log(
    `Actual shared workspace verified: ${report.projects.length} projects, ${report.checks.length} checks, ${report.accessibility.length} accessibility scans. Read-only viewer inspection.`,
  );
