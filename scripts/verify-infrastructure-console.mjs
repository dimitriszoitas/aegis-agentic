import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = process.env.AGENTIC_URL || 'http://127.0.0.1:4175';
const output = 'artifacts/agentic-ui';
await mkdir(output, { recursive: true });
const report = {
  base,
  evidence: 'mocked-api-browser-verification',
  checks: [],
  accessibility: [],
  browserErrors: [],
  screenshots: [],
};
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1512, height: 1100 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
page.on('pageerror', (error) => report.browserErrors.push(error.message));
const requests = [];
let connection = 'disconnected';
let planFailure = false;
const status = {
  schemaVersion: 1,
  project: { id: 'test-project', name: 'Test project · simulated service' },
  release: { version: '0.1.0-test', registryRevision: 1 },
  health: { status: 'healthy', issues: [] },
  usage: {
    telemetryEnabled: false,
    eventCount: 0,
    rejectedEvents: 0,
    byComponent: {},
    retentionDays: 30,
    maximumEvents: 10000,
  },
  capabilities: {
    components: 2,
    configurableDimensions: 4,
    constrainedProps: 3,
    unconstrainedProps: 1,
  },
  ai: { configured: false, provider: 'none', model: null },
  recentRuns: [],
};
const inventory = {
  status: 'ready',
  components: [
    {
      componentId: 'button',
      name: 'Button',
      dimensions: [
        {
          id: 'Button.emphasis',
          name: 'emphasis',
          allowedValues: ['primary', 'secondary'],
          defaultKnown: true,
          defaultValue: 'primary',
        },
      ],
      estimate: { combinations: 2, capped: false, conditionalCombinationsVerified: false },
      coverage: { verifiedConfigurations: 0, status: 'unverified' },
    },
    {
      componentId: 'card',
      name: 'Card',
      dimensions: [
        { id: 'Card.children', name: 'children', allowedValues: null, defaultKnown: false },
      ],
      estimate: { combinations: 1, capped: false, conditionalCombinationsVerified: false },
      coverage: { verifiedConfigurations: 0, status: 'unverified' },
    },
  ],
};
await page.route('**/api/aegis/**', async (route) => {
  const endpoint = new URL(route.request().url()).pathname.replace('/api/aegis', '');
  const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
  if (route.request().method() === 'POST')
    assert.equal(
      route.request().headers()['x-aegis-client'],
      'console',
      'Explicit local console client header',
    );
  requests.push({ endpoint, method: route.request().method(), body });
  const reply = (value, code = 200) =>
    route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(value) });
  if (connection === 'disconnected') return reply({ error: 'Test service is offline.' }, 503);
  if (connection === 'html')
    return route.fulfill({ contentType: 'text/html', body: '<html>Not the API</html>' });
  if (connection === 'malformed') return reply({ schemaVersion: 999 });
  if (endpoint === '/status') return reply(status);
  if (endpoint === '/configurability') return reply(inventory);
  if (endpoint === '/usage/settings') {
    status.usage.telemetryEnabled = body.enabled;
    return reply({ enabled: body.enabled, status: 'updated' });
  }
  if (endpoint === '/reconcile') {
    status.health = { status: 'healthy', issues: [] };
    return reply({
      status: 'repaired',
      summary: 'Test derived drift repaired.',
      health: status.health,
    });
  }
  if (endpoint === '/plan') {
    if (planFailure) return reply({ error: 'Test provider rejected this request.' }, 502);
    const plan = {
      id: `test-plan-${requests.length}`,
      status: 'review-required',
      createdAt: '2026-10-27T12:00:00.000Z',
      source: body.useAI ? 'openai' : 'rules',
      summary: 'Review the missing Button configuration evidence.',
      proposals: [
        {
          id: 'proposal-1',
          kind: 'coverage-gap',
          componentId: 'button',
          rationale: 'The inventory reports no verified configurations.',
          evidenceIds: ['configuration:button'],
          suggestedAction: 'Add focused verification records for the supported Button choices.',
        },
      ],
      deterministic: {
        health: status.health,
        usage: status.usage,
        capabilities: status.capabilities,
      },
      verification: 'proposal-only',
    };
    status.recentRuns.push({
      id: plan.id,
      kind: 'maintenance-plan',
      createdAt: plan.createdAt,
      status: plan.status,
      summary: plan.summary,
    });
    return reply(plan);
  }
  return reply({ error: 'Unexpected test endpoint.' }, 404);
});
// These are synthetic test credentials, never real workspace secrets.
const workspaceToken = 'synthetic-workspace-token-for-browser-checks-0001';
const workspaceRequests = [];
let workspaceRole = 'viewer';
let workspaceError = '';
let mismatchedProject = false;
let delayProjectA = false;
let releaseDelayedA;
const projects = [
  {
    id: 'project-a',
    name: 'Workspace Alpha',
    revision: 2,
    currentGeneration: '00000000-0000-4000-8000-000000000001',
  },
  {
    id: 'project-b',
    name: 'Workspace Beta',
    revision: 1,
    currentGeneration: '00000000-0000-4000-8000-000000000002',
  },
];
const workspaceStatus = (id) => ({
  ...status,
  project: { id, name: projects.find((project) => project.id === id).name },
  health: { status: 'drift', issues: [{ id: 'fixture-drift', kind: 'derived' }] },
  workspace: {
    projectRevision: id === 'project-a' ? 2 : 1,
    generationId: projects.find((project) => project.id === id).currentGeneration,
    kitDigest: 'a'.repeat(64),
    releaseVerified: id === 'project-a',
    signingKeyId: id === 'project-a' ? 'test-signing-key' : null,
  },
});
await page.route('**/api/aegis-workspace/**', async (route) => {
  const req = route.request();
  assert.equal(req.headers().authorization, `Bearer ${workspaceToken}`);
  assert.equal(req.headers()['x-aegis-client'], 'console');
  assert.equal(new URL(req.url()).search, '');
  assert.ok(!req.url().includes(workspaceToken));
  assert.ok(!req.postData()?.includes(workspaceToken));
  const endpoint = new URL(req.url()).pathname.replace('/api/aegis-workspace', '');
  const body = req.method() === 'POST' ? req.postDataJSON() : null;
  workspaceRequests.push({ endpoint, method: req.method(), body });
  const reply = (value, code = 200) =>
    route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(value) });
  if (workspaceError) return reply({ error: workspaceError }, 403);
  if (endpoint === '/projects')
    return reply({
      schemaVersion: 1,
      actor: { label: 'Browser verification', role: workspaceRole },
      projects,
    });
  const [, , id, action] = endpoint.split('/');
  if (!projects.some((project) => project.id === id))
    return reply({ error: 'No project scope.' }, 403);
  if (action === 'status') {
    if (id === 'project-a' && delayProjectA)
      await new Promise((resolve) => {
        releaseDelayedA = resolve;
      });
    return reply(workspaceStatus(mismatchedProject ? 'project-b' : id));
  }
  if (action === 'configurability') return reply(inventory);
  if (action === 'generations')
    return reply({
      schemaVersion: 1,
      generations: [
        {
          id: projects.find((project) => project.id === id).currentGeneration,
          projectId: id,
          kitDigest: 'a'.repeat(64),
          profileSha256: 'b'.repeat(64),
          createdAt: 1793098800000,
        },
      ],
    });
  if (workspaceRole === 'viewer') return reply({ error: 'Viewer cannot mutate.' }, 403);
  if (action === 'plan')
    return reply({
      id: 'workspace-plan',
      status: 'no-action',
      createdAt: '2026-10-27T12:00:00.000Z',
      source: 'rules',
      summary: `Project ${id} rules proposal.`,
      proposals: [],
      deterministic: {},
      verification: 'proposal-only',
    });
  if (action === 'telemetry') status.usage.telemetryEnabled = body.enabled;
  if (['telemetry', 'retention', 'reconcile'].includes(action))
    return reply({ status: 'no-op', summary: `Scoped ${action} result.` });
  return reply({ error: 'Unexpected workspace endpoint.' }, 404);
});
const passed = (name) => {
  report.checks.push(name);
  console.log(`✓ ${name}`);
};
async function capture(name) {
  const path = `${output}/${name}.png`;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path);
}
async function axe(label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    label,
    violations: result.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  });
  assert.deepEqual(
    result.violations.map(({ id }) => id),
    [],
    label,
  );
}
async function refresh() {
  await page.getByRole('button', { name: 'Refresh service', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Refresh service', exact: true })).toBeEnabled();
}
try {
  await page.goto(base);
  await page
    .getByRole('navigation', { name: 'Workbench sections' })
    .getByRole('button', { name: /Infrastructure/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Start the local infrastructure service' }),
  ).toBeVisible();
  await expect(page.getByText('Local service is disconnected', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan maintenance', exact: true })).toHaveCount(0);
  assert.equal(requests.filter(({ method }) => method === 'POST').length, 0);
  await axe('Disconnected service');
  await capture('infrastructure-disconnected');
  connection = 'html';
  await refresh();
  await expect(page.getByRole('alert')).toContainText('No JSON response');
  connection = 'malformed';
  await refresh();
  await expect(page.getByRole('alert')).toContainText('unsupported status response');
  passed(
    'Disconnected, HTML fallback, and malformed API responses show honest unavailable states without invented metrics or mutations.',
  );

  connection = 'connected';
  await refresh();
  await expect(page.getByText(status.project.name, { exact: true })).toBeVisible();
  const ai = page.getByRole('checkbox', { name: 'Include AI analysis', exact: true });
  const telemetry = page.getByRole('checkbox', {
    name: 'Accept permitted usage events',
    exact: true,
  });
  await expect(ai).toBeDisabled();
  await expect(telemetry).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Repair derived drift' })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search configuration inventory' }).fill('button');
  await expect(page.locator('.aip-component')).toHaveCount(1);
  await page.locator('.aip-component summary').click();
  await expect(page.locator('.aip-component')).toContainText('0 verified configurations');
  await expect(page.locator('.aip-component')).toContainText('Estimate only');
  await expect(page.locator('.aip-component')).toContainText('primary · secondary');
  await page.getByRole('textbox', { name: 'Search configuration inventory' }).fill('');
  await expect(page.locator('.aip-component')).toHaveCount(2);
  assert.equal(
    requests.filter(({ method }) => method === 'POST').length,
    0,
    'Inspection does not count usage or invoke maintenance',
  );
  await axe('Connected local service');
  passed(
    'Live-shaped status and searchable inventory distinguish estimated combinations from zero verified configurations; inspection causes no writes.',
  );

  await telemetry.click();
  await expect(telemetry).toBeChecked();
  assert.deepEqual(
    requests.filter(({ endpoint }) => endpoint === '/usage/settings').map(({ body }) => body),
    [{ enabled: true }],
  );
  await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
  await expect(page.getByTestId('infrastructure-plan')).toContainText('Rules-based');
  assert.deepEqual(
    requests.filter(({ endpoint }) => endpoint === '/plan').map(({ body }) => body),
    [{ useAI: false }],
  );
  await expect(page.getByTestId('infrastructure-plan')).toContainText('configuration:button');
  await expect(page.getByTestId('infrastructure-plan')).toContainText('Proposal only');
  passed(
    'Usage collection changes only after explicit opt-in; maintenance defaults to local rules and renders evidence as proposal-only.',
  );

  status.ai = { configured: true, provider: 'openai', model: 'test-model' };
  await refresh();
  await expect(ai).toBeEnabled();
  await expect(ai).not.toBeChecked();
  await ai.check();
  await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
  await expect(page.getByTestId('infrastructure-plan')).toContainText('AI-assisted');
  assert.deepEqual(requests.filter(({ endpoint }) => endpoint === '/plan').at(-1).body, {
    useAI: true,
  });
  planFailure = true;
  await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Test provider rejected');
  await expect(page.getByTestId('infrastructure-plan')).toHaveCount(0);
  planFailure = false;
  status.ai = { configured: false, provider: 'none', model: null };
  status.health = { status: 'drift', issues: [{ id: 'test-derived-drift', kind: 'derived' }] };
  await refresh();
  await expect(ai).not.toBeChecked();
  await expect(ai).toBeDisabled();
  await page.getByRole('button', { name: 'Repair derived drift' }).click();
  await expect(page.getByRole('button', { name: 'Repair derived drift' })).toHaveCount(0);
  assert.equal(requests.filter(({ endpoint }) => endpoint === '/reconcile').length, 1);
  passed(
    'AI runs only after explicit configured opt-in, failures do not display stale plans, and bounded repair appears only for drift.',
  );

  await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
  await expect(page.getByTestId('infrastructure-plan')).toContainText('Rules-based');
  await capture('infrastructure-connected-mocked');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Mobile console does not overflow',
  );
  await axe('Mobile connected local service');
  await capture('infrastructure-mobile-mocked');
  connection = 'disconnected';
  await refresh();
  await expect(
    page.getByText('Connection lost · last snapshot retained', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan maintenance', exact: true })).toBeDisabled();
  await expect(telemetry).toBeDisabled();
  passed(
    'Mobile layout stays within the viewport; connection loss labels the retained snapshot stale and blocks new actions.',
  );
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.getByRole('radio', { name: 'Shared workspace', exact: true }).check();
  const tokenInput = page.getByLabel('Workspace access token', { exact: true });
  await expect(tokenInput).toHaveAttribute('type', 'password');
  assert.equal(
    workspaceRequests.length,
    0,
    'Switching mode does not transmit credentials or connect',
  );
  await tokenInput.fill(workspaceToken);
  assert.equal(workspaceRequests.length, 0, 'Entering a token does not start a request');
  await page.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await expect(page.getByTestId('workspace-role')).toHaveText('viewer');
  await expect(page.getByTestId('workspace-release')).toContainText('Verified release signature');
  await expect(page.getByTestId('workspace-release')).toContainText('test-signing-key');
  await expect(page.getByRole('button', { name: 'Plan maintenance', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Repair derived drift' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Run retention' })).toBeDisabled();
  await expect(telemetry).toBeDisabled();
  await page.getByText('Generation history (1)', { exact: true }).click();
  await expect(page.locator('.aip-history')).toContainText('Active');
  await expect(page.locator('.aip-history')).toContainText('Profile ' + 'b'.repeat(64));
  assert.equal(workspaceRequests.filter((item) => item.method === 'POST').length, 0);
  await axe('Shared workspace viewer');
  await capture('infrastructure-workspace-viewer-mocked');
  passed(
    'Shared workspace connects only after submission, scopes reads to the authorized project, and makes viewer controls read-only.',
  );

  await page.getByRole('combobox', { name: 'Workspace project' }).click();
  await page.getByRole('option', { name: 'Workspace Beta', exact: true }).click();
  await expect(page.getByTestId('workspace-release')).toContainText('Release signature unverified');
  await expect(page.getByTestId('workspace-release')).toContainText(projects[1].currentGeneration);
  await expect(page.getByTestId('infrastructure-plan')).toHaveCount(0);
  await expect(page.getByTestId('workspace-release')).not.toContainText('test-signing-key');
  // A slow previous project's request must never replace the newly selected project.
  delayProjectA = true;
  await page.getByRole('combobox', { name: 'Workspace project' }).click();
  await page.getByRole('option', { name: 'Workspace Alpha', exact: true }).click();
  await expect.poll(() => typeof releaseDelayedA).toBe('function');
  await page.getByRole('combobox', { name: 'Workspace project' }).click();
  await page.getByRole('option', { name: 'Workspace Beta', exact: true }).click();
  await expect(page.getByTestId('workspace-release')).toContainText(projects[1].currentGeneration);
  releaseDelayedA();
  delayProjectA = false;
  await expect(page.getByTestId('workspace-release')).toContainText(projects[1].currentGeneration);
  await page.getByRole('button', { name: 'Disconnect workspace' }).click();
  await expect(tokenInput).toHaveValue('');
  await expect(page.getByTestId('workspace-release')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Workspace project' })).toHaveCount(0);
  passed(
    'Project selection clears prior evidence, preserves signature distinctions, and ignores delayed responses from another project.',
  );

  workspaceRole = 'operator';
  await tokenInput.fill(workspaceToken);
  await page.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await expect(page.getByTestId('workspace-role')).toHaveText('operator');
  await expect(page.getByRole('button', { name: 'Plan maintenance', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Plan maintenance', exact: true }).click();
  await expect(page.getByTestId('infrastructure-plan')).toContainText(
    'Project project-a rules proposal.',
  );
  await telemetry.click();
  await expect(telemetry).not.toBeChecked();
  await page.getByRole('button', { name: 'Run retention' }).click();
  await expect(page.getByRole('button', { name: 'Run retention' })).toBeEnabled();
  const writes = workspaceRequests.filter((item) => item.method === 'POST');
  assert.deepEqual(
    writes.map((item) => item.endpoint),
    ['/projects/project-a/plan', '/projects/project-a/telemetry', '/projects/project-a/retention'],
  );
  assert.deepEqual(writes[0].body, { useAI: false });
  assert.deepEqual(writes[1].body, { enabled: false });
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
    url: location.href,
  }));
  assert.ok(
    !JSON.stringify(storage).includes(workspaceToken),
    'Credential never persists in storage or URL',
  );
  await capture('infrastructure-workspace-operator-mocked');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    'Shared workspace fits mobile viewport',
  );
  await axe('Shared workspace mobile operator');
  await capture('infrastructure-workspace-mobile-mocked');
  workspaceError = 'This credential cannot perform that action.';
  await refresh();
  await expect(page.getByRole('alert')).toContainText(workspaceError);
  await expect(page.getByRole('button', { name: 'Run retention' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Plan maintenance', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Disconnect workspace' }).click();
  await expect(tokenInput).toHaveValue('');
  workspaceError = '';
  mismatchedProject = true;
  await tokenInput.fill(workspaceToken);
  await page.getByRole('button', { name: 'Connect workspace', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'does not match the selected workspace project',
  );
  await expect(page.getByTestId('workspace-release')).toHaveCount(0);
  await page.reload();
  await page
    .getByRole('navigation', { name: 'Workbench sections' })
    .getByRole('button', { name: /Infrastructure/ })
    .click();
  await page.getByRole('radio', { name: 'Shared workspace', exact: true }).check();
  await expect(tokenInput).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Connect workspace', exact: true })).toBeDisabled();
  passed(
    'Operator mutations use project-scoped headers and endpoints; revoked access blocks actions, mismatched identity is rejected, and reload clears credentials.',
  );
  assert.deepEqual(report.browserErrors, []);
} finally {
  await writeFile(`${output}/infrastructure-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  `Infrastructure console verified: ${report.checks.length} checks; ${report.accessibility.length} accessibility scans.`,
);
