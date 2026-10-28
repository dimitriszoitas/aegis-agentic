import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fork } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, lstat, realpath } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium } from '@playwright/test';

const directory = dirname(fileURLToPath(import.meta.url));
const trustedRoot = resolve(directory, '../..');
const widths = [1600, 1280, 1151, 900, 768, 430, 390];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Only measured containment assertions authorize a proposal. Missing browser,
 * failed compilation, missing anatomy and page errors are infrastructure errors. */
export function classifyOracleResult(message, report, exitCode) {
  if (!message || !['passed', 'failed', 'error'].includes(message.status)) return 'error';
  if (!report || !Array.isArray(report.checks) || !Array.isArray(report.errors)) return 'error';
  if (report.errors.length || message.blocked?.length || message.status === 'error') return 'error';
  if (message.status === 'passed')
    return exitCode === 0 && report.checks.length === 28 ? 'passed' : 'error';
  return exitCode === 1 ? 'failed' : 'error';
}

export function containmentFailures(geometry) {
  const failures = [];
  for (const [name, element] of [
    ['value', geometry.value],
    ['sparkline', geometry.chart],
  ]) {
    if (geometry.visible?.[name] === false) failures.push(`${name} remains visibly rendered`);
    if (!(element.width > 0 && element.height > 0)) failures.push(`${name} remains visible`);
    if (!(element.left >= geometry.contentLeft - 1 && element.right <= geometry.contentRight + 1))
      failures.push(`${name} stays inside card padding`);
    if (!(element.top >= geometry.contentTop - 1 && element.bottom <= geometry.contentBottom + 1))
      failures.push(`${name} stays inside the card vertically`);
  }
  const { value, chart } = geometry;
  if (!(
    value.right <= chart.left + 1 ||
    chart.right <= value.left + 1 ||
    value.bottom <= chart.top + 1 ||
    chart.bottom <= value.top + 1
  ))
    failures.push('Value and sparkline do not overlap');
  if (geometry.overflow) failures.push('Metric has no horizontal overflow');
  if (geometry.hostOverflow) failures.push('Metric stays inside its allocated host');
  if (geometry.documentOverflow) failures.push('Document has no horizontal overflow');
  if (geometry.chartBelowMinimum)
    failures.push('Sparkline preserves its approved minimum dimensions');
  return failures;
}

async function sourceHashes(cwd) {
  const result = {};
  async function visit(path) {
    const info = await lstat(path);
    if (info.isSymbolicLink())
      throw new Error(`Source symlink is not audit input: ${relative(cwd, path)}`);
    if (info.isDirectory()) {
      for (const name of (await readdir(path)).sort()) await visit(resolve(path, name));
    } else if (info.isFile()) result[relative(cwd, path)] = sha256(await readFile(path));
  }
  for (const path of ['src', 'index.html', 'package.json', 'pnpm-lock.yaml'])
    await visit(resolve(cwd, path));
  return result;
}

async function originalOracle(url, evidenceDir) {
  const output = resolve(evidenceDir, 'forma');
  await mkdir(output);
  let message;
  let log = '';
  let timedOut = false;
  const child = fork(resolve(directory, 'metric-oracle.mjs'), [], {
    cwd: output,
    env: { ...process.env, FORMA_URL: `${url}/?view=product` },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    execArgv: [],
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      log = (log + chunk).slice(-32000);
    });
  child.on('message', (value) => {
    message = value;
  });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, 120_000);
  const exitCode = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('exit', accept);
  }).finally(() => clearTimeout(timer));
  await writeFile(resolve(output, 'runner.log'), log, { flag: 'wx' });
  let report;
  try {
    report = JSON.parse(
      await readFile(resolve(output, 'artifacts/forma-metrics/report.json'), 'utf8'),
    );
  } catch {
    /* incomplete execution */
  }
  return {
    status: timedOut ? 'error' : classifyOracleResult(message, report, exitCode),
    diagnostic: timedOut
      ? 'Historical metric oracle timed out.'
      : message?.diagnostic || log.trim(),
    checks: report?.checks || [],
    errors: report?.errors || [],
    blocked: message?.blocked || [],
  };
}

async function canonicalOracle(origin, evidenceDir) {
  const report = { status: 'passed', checks: [], failures: [], errors: [], blocked: [] };
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol))
        return route.continue();
      report.blocked.push(url.origin);
      return route.abort('blockedbyclient');
    });
    page.on('pageerror', (error) => report.errors.push(error.message));
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1050 });
      for (const mode of ['light', 'dark'])
        for (const layout of ['fundamental', 'fundamental-floating']) {
          for (const content of ['seed', 'long-currency']) {
            const response = await page.goto(
              `${origin}/__aegis-repair-metric.html?${new URLSearchParams({ mode, layout, content })}`,
            );
            if (!response?.ok()) throw new Error('Metric fixture did not load.');
            await page.locator('.aegis-metric-card').waitFor({ state: 'visible', timeout: 15_000 });
            await page.evaluate(() => document.fonts.ready);
            await page.evaluate(
              () =>
                new Promise((accept) => requestAnimationFrame(() => requestAnimationFrame(accept))),
            );
            const geometry = await page.locator('.aegis-metric-card').evaluate((card) => {
              const rect = (element) => {
                if (!element) throw new Error('Metric fixture anatomy missing.');
                const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
                return { left, right, top, bottom, width, height };
              };
              const style = getComputedStyle(card);
              const outer = rect(card);
              const host = rect(card.parentElement);
              const value = card.querySelector('.aegis-metric-value');
              const chart = card.querySelector('.aegis-sparkline');
              const visible = (element) => {
                if (
                  !element ||
                  !element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
                )
                  return false;
                let opacity = 1;
                for (let current = element; current; current = current.parentElement) {
                  const currentStyle = getComputedStyle(current);
                  opacity *= Number(currentStyle.opacity);
                  if (currentStyle.visibility !== 'visible' || currentStyle.display === 'none')
                    return false;
                  if (currentStyle.clipPath !== 'none' || currentStyle.clip !== 'auto')
                    return false;
                }
                return opacity >= 0.5;
              };
              const paintedLine = [...chart.querySelectorAll('path,circle,rect')].some((mark) => {
                const paint = getComputedStyle(mark);
                return (
                  paint.visibility === 'visible' &&
                  paint.display !== 'none' &&
                  Number(paint.opacity) >= 0.5 &&
                  ((paint.stroke !== 'none' &&
                    paint.stroke !== 'rgba(0, 0, 0, 0)' &&
                    Number(paint.strokeOpacity) >= 0.5 &&
                    parseFloat(paint.strokeWidth) > 0) ||
                    (paint.fill !== 'none' &&
                      paint.fill !== 'rgba(0, 0, 0, 0)' &&
                      Number(paint.fillOpacity) >= 0.5))
                );
              });
              return {
                contentLeft: outer.left + parseFloat(style.paddingLeft),
                contentRight: outer.right - parseFloat(style.paddingRight),
                contentTop: outer.top + parseFloat(style.paddingTop),
                contentBottom: outer.bottom - parseFloat(style.paddingBottom),
                value: rect(card.querySelector('.aegis-metric-value')),
                chart: rect(card.querySelector('.aegis-sparkline')),
                visible: { value: visible(value), sparkline: visible(chart) && paintedLine },
                overflow: card.scrollWidth > card.clientWidth + 1,
                hostOverflow: outer.left < host.left - 1 || outer.right > host.right + 1,
                documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
                chartBelowMinimum: rect(chart).width < 24 || rect(chart).height < 12,
                mode: document.documentElement.dataset.theme,
                layout: document.documentElement.dataset.layoutTheme,
                colorScheme: getComputedStyle(document.documentElement).colorScheme,
              };
            });
            if (
              geometry.mode !== mode ||
              geometry.layout !== layout ||
              geometry.colorScheme !== mode
            )
              throw new Error('Requested presentation was not applied by the trusted fixture.');
            const failures = containmentFailures(geometry);
            const check = { width, mode, layout, content, geometry, failures };
            report.checks.push(check);
            if (failures.length) report.failures.push(check);
            if (
              (width === 390 && content === 'long-currency') ||
              (failures.length && report.failures.length === 1)
            )
              await page.screenshot({
                path: resolve(evidenceDir, `metric-${width}-${mode}-${layout}-${content}.png`),
              });
          }
        }
    }
    report.status =
      report.errors.length || report.blocked.length
        ? 'error'
        : report.failures.length
          ? 'failed'
          : 'passed';
  } catch (error) {
    report.status = 'error';
    report.errors.push(String(error?.stack || error));
  } finally {
    await browser?.close();
  }
  return report;
}

async function auditMetrics({ cwd, evidenceDir }) {
  const candidate = await realpath(cwd);
  const output = resolve(evidenceDir);
  // Existing evidence is never overwritten, including after an interrupted run.
  await mkdir(output, { recursive: true });
  const marker = resolve(output, 'audit-start.json');
  await writeFile(
    marker,
    JSON.stringify({ audit: 'metric-containment', startedAt: new Date().toISOString() }) + '\n',
    { flag: 'wx' },
  );
  const report = {
    audit: 'metric-containment',
    status: 'error',
    diagnostic: '',
    checks: [],
    sourceHashes: {},
    oracleHashes: {},
    limitations: [
      'Finite Chromium containment checks; no visual acceptance, cross-browser certification, or automatic release authorization.',
    ],
  };
  let server;
  try {
    report.sourceHashes = await sourceHashes(candidate);
    for (const name of [
      'audits.mjs',
      'metric-fixture.tsx',
      'metric-oracle.mjs',
      '../verify-forma-metrics.mjs',
    ])
      report.oracleHashes[name] = sha256(await readFile(resolve(directory, name)));
    server = await createServer({
      root: candidate,
      configFile: false,
      envFile: false,
      cacheDir: resolve(output, 'vite-cache'),
      logLevel: 'error',
      plugins: [
        react(),
        tailwindcss(),
        {
          name: 'trusted-metric-acceptance',
          resolveId(id) {
            if (id === '/__aegis-repair-metric.tsx')
              return resolve(directory, 'metric-fixture.tsx');
          },
          configureServer(vite) {
            vite.middlewares.use(async (req, res, next) => {
              if (req.url?.split('?')[0] !== '/__aegis-repair-metric.html') return next();
              try {
                const html = await vite.transformIndexHtml(
                  req.url,
                  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Trusted metric acceptance</title></head><body><div id="root"></div><script type="module" src="/__aegis-repair-metric.tsx"></script></body></html>',
                );
                res.setHeader('Content-Type', 'text/html');
                res.end(html);
              } catch (error) {
                next(error);
              }
            });
          },
        },
      ],
      resolve: { alias: { '@': resolve(candidate, 'src') } },
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
        fs: { allow: [candidate, trustedRoot] },
      },
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    report.forma = await originalOracle(origin, output);
    report.canonical = await canonicalOracle(origin, output);
    report.checks = [...report.forma.checks, ...report.canonical.checks];
    report.status = [report.forma.status, report.canonical.status].includes('error')
      ? 'error'
      : [report.forma.status, report.canonical.status].includes('failed')
        ? 'failed'
        : 'passed';
    report.diagnostic =
      report.status === 'passed'
        ? `Metric containment passed ${report.forma.checks.length} existing product and ${report.canonical.checks.length} canonical component scenarios.`
        : JSON.stringify({
            forma: report.forma.diagnostic,
            canonicalFailureCount: report.canonical.failures.length,
            canonicalFailures: report.canonical.failures.slice(0, 3),
            canonicalErrors: report.canonical.errors,
            blocked: [...report.forma.blocked, ...report.canonical.blocked],
          });
    const after = await sourceHashes(candidate);
    assert.deepEqual(after, report.sourceHashes, 'Source changed during the trusted audit.');
    for (const [name, hash] of Object.entries(report.oracleHashes))
      assert.equal(
        sha256(await readFile(resolve(directory, name))),
        hash,
        `Trusted oracle changed during audit: ${name}`,
      );
  } catch (error) {
    report.status = 'error';
    report.diagnostic = String(error?.stack || error);
  } finally {
    await server?.close();
  }
  report.finishedAt = new Date().toISOString();
  const bytes = JSON.stringify(report, null, 2) + '\n';
  await writeFile(resolve(output, 'audit.json'), bytes, { flag: 'wx' });
  await writeFile(resolve(output, 'audit.sha256'), sha256(bytes) + '\n', { flag: 'wx' });
  return { ...report, evidence: { report: resolve(output, 'audit.json'), sha256: sha256(bytes) } };
}

export const audits = Object.freeze({
  'metric-containment': Object.freeze({
    id: 'metric-containment',
    policyVersion: '1',
    instructions:
      'Repair the measured MetricCard/Sparkline containment defect only in the exact allowed CSS files. Preserve the metric value and visibly painted sparkline; do not hide, clip, fade, overlap, collapse, remove, or replace either element to obtain a pass. Keep normal and long values readable, preserve the chart aspect ratio and existing states in both light/dark modes and fundamental/fundamental-floating presentations. Component styling must consume its existing owning group tokens; preserve the Primitive → Semantic → Group hierarchy. Do not introduce raw dimensional/color constants, new token roles, cross-group mappings, changed selectors that affect unrelated components, altered contracts, test thresholds or new baselines. Prefer a minimal correction to the faulty layout rule. This is a source repair proposal requiring review, not authority to change the design language or release it.',
    allowedPaths: Object.freeze([
      'src/components/metric-card/metric-card.css',
      'src/components/sparkline/sparkline.css',
    ]),
    maxAttempts: 2,
    maxFiles: 2,
    maxBytes: 20_000,
    reproduce: auditMetrics,
    verify: auditMetrics,
  }),
});

export function getAudit(id) {
  const audit = Object.hasOwn(audits, id) ? audits[id] : undefined;
  if (!audit) throw new Error(`Unknown trusted repair audit: ${id}`);
  return audit;
}
