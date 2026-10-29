import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { chromium, expect } from '@playwright/test';
import { assertDensityChanges } from '../acceptance/oracles.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const trustedRoot = resolve(directory, '../..');
const digest = (input) => createHash('sha256').update(input).digest('hex');
const names = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Radia'];
const expectedRows = names.map((name, index) => ({
  label: `record-${index + 1}: ${name}`,
  text: [name, index % 2 ? 'Invited' : 'Active'],
}));
const oracleFiles = [
  'catalogue-density-audit.mjs',
  'catalogue-density-fixture.tsx',
  '../acceptance/oracles.mjs',
  'audits.mjs',
];

async function inputHashes(root) {
  const hashes = {};
  async function visit(path) {
    const stat = await lstat(path);
    assert(!stat.isSymbolicLink(), `Symlink is not a trusted audit input: ${relative(root, path)}`);
    if (stat.isDirectory())
      for (const child of (await readdir(path)).sort()) await visit(resolve(path, child));
    else if (stat.isFile()) hashes[relative(root, path)] = digest(await readFile(path));
  }
  for (const path of ['src', 'tokens', 'package.json', 'pnpm-lock.yaml'])
    await visit(resolve(root, path));
  return hashes;
}

export function assertDensityFixtureFacts(facts, density) {
  assert.equal(facts.rowCount, 6, 'All six trusted records remain rendered.');
  assert.deepEqual(
    facts.rows.map((row) => row.label),
    expectedRows.map((row) => row.label),
    'Row identities and order remain unchanged.',
  );
  assert.deepEqual(facts.headers, ['Name', 'Status'], 'Both trusted columns remain available.');
  assert.equal(facts.selectedControls, 1, 'Exactly one density control is selected.');
  assert.equal(facts.selectedDensity, density, 'The requested density is selected.');
  assert(
    Number.isFinite(facts.expectedHeight) && facts.expectedHeight > 0,
    'The approved density token resolves to a nonzero height.',
  );
  for (const [index, row] of facts.rows.entries()) {
    assert.deepEqual(
      row.cells.map((cell) => cell.text),
      expectedRows[index].text,
      'Cell values cannot be removed or replaced.',
    );
    assert(
      Math.abs(row.height - facts.expectedHeight) <= 1,
      'Every row uses the approved density height.',
    );
    for (const cell of row.cells) {
      assert(cell.visible && cell.painted, 'Every cell remains visibly painted.');
      assert(
        cell.width >= 40 && cell.height >= 16 && cell.fontSize >= 12,
        'Cell content cannot be collapsed to obtain a pass.',
      );
      assert(
        cell.textWidth > 0 &&
          cell.textHeight > 0 &&
          cell.textWidth <= cell.width + 1 &&
          cell.textHeight <= cell.height + 1,
        'Trusted short cell text remains fully contained.',
      );
    }
  }
  assert(!facts.documentOverflow, 'The fixture does not overflow the page horizontally.');
}

async function fixtureFacts(grid) {
  return grid.evaluate((element) => {
    const painted = (node) => {
      let opacity = 1;
      for (let current = node; current; current = current.parentElement) {
        const css = getComputedStyle(current);
        opacity *= Number(css.opacity);
        if (
          css.display === 'none' ||
          css.visibility !== 'visible' ||
          css.clipPath !== 'none' ||
          css.clip !== 'auto' ||
          css.transform !== 'none'
        )
          return false;
      }
      const color = getComputedStyle(node).color;
      return opacity >= 0.8 && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)';
    };
    const rows = [...element.querySelectorAll('.aegis-grid-row')].map((row) => ({
      label: row.getAttribute('aria-label'),
      height: row.getBoundingClientRect().height,
      cells: [...row.querySelectorAll('td .aegis-grid-cell-content')].map((cell) => {
        const box = cell.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        return {
          text: cell.textContent.trim(),
          visible: cell.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
          painted: painted(cell),
          width: box.width,
          height: box.height,
          fontSize: parseFloat(getComputedStyle(cell).fontSize),
          textWidth: text.width,
          textHeight: text.height,
        };
      }),
    }));
    const selected = [
      ...element.querySelectorAll('.aegis-grid-density button[aria-pressed="true"]'),
    ];
    const density = element.getAttribute('data-density');
    return {
      rows,
      rowCount: rows.length,
      headers: [...element.querySelectorAll('.aegis-grid-header-label')].map((node) =>
        node.textContent.trim(),
      ),
      selectedControls: selected.length,
      selectedDensity: selected[0]?.textContent.trim(),
      expectedHeight: parseFloat(
        getComputedStyle(element).getPropertyValue(
          `--group-data-display-measurement-grid-row-${density}`,
        ),
      ),
      documentOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

/** Trusted fixture imports candidate components; candidate configs, stories and oracles are not executed. */
export async function auditDataGridDensity({ cwd, evidenceDir }) {
  const candidate = await realpath(cwd);
  const output = resolve(evidenceDir);
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, 'audit-start.json'),
    JSON.stringify({ audit: 'data-grid-density', startedAt: new Date().toISOString() }) + '\n',
    { flag: 'wx' },
  );
  const report = {
    audit: 'data-grid-density',
    status: 'error',
    checks: [],
    failures: [],
    errors: [],
    blocked: [],
    sourceHashes: {},
    oracleHashes: {},
    limitations: [
      'Finite Chromium density policy: six fixed records, two columns, controlled and uncontrolled hosts, two widths and four mode/presentation combinations.',
      'Does not certify sorting, pagination, virtualization, all keyboard behavior, visual design or unrelated DataGrid requirements.',
    ],
  };
  let server, browser;
  try {
    report.sourceHashes = await inputHashes(candidate);
    for (const path of oracleFiles)
      report.oracleHashes[path] = digest(await readFile(resolve(directory, path)));
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
          name: 'trusted-density-acceptance',
          resolveId(id) {
            if (id === '/__aegis-repair-density.tsx')
              return resolve(directory, 'catalogue-density-fixture.tsx');
          },
          configureServer(vite) {
            vite.middlewares.use(async (req, res, next) => {
              if (req.url?.split('?')[0] !== '/__aegis-repair-density.html') return next();
              try {
                const html = await vite.transformIndexHtml(
                  req.url,
                  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Trusted density acceptance</title></head><body><div id="root"></div><script type="module" src="/__aegis-repair-density.tsx"></script></body></html>',
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
      server: { host: '127.0.0.1', port: 0, fs: { allow: [candidate, trustedRoot] } },
    });
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch();
    for (const width of [1440, 390])
      for (const mode of ['light', 'dark'])
        for (const layout of ['fundamental', 'fundamental-floating'])
          for (const host of ['controlled', 'uncontrolled']) {
            const context = await browser.newContext({
              viewport: { width, height: 1050 },
              reducedMotion: 'reduce',
              serviceWorkers: 'block',
            });
            const page = await context.newPage();
            await context.route('**/*', (route) => {
              const url = new URL(route.request().url());
              if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol))
                return route.continue();
              report.blocked.push(url.origin);
              return route.abort('blockedbyclient');
            });
            page.on('pageerror', (error) => report.errors.push(error.message));
            page.on('console', (message) => {
              if (message.type() === 'error') report.errors.push(message.text());
            });
            const check = { width, mode, layout, host, status: 'error', measurements: [] };
            try {
              const response = await page.goto(
                `${origin}/__aegis-repair-density.html?${new URLSearchParams({ mode, layout, host })}`,
              );
              if (!response?.ok()) throw new Error('Trusted density fixture did not load.');
              const grid = page.locator('.aegis-data-grid');
              await grid.waitFor({ state: 'attached', timeout: 15000 });
              await page.evaluate(() => document.fonts.ready);
              const applied = await page.evaluate(() => ({
                mode: document.documentElement.dataset.theme,
                layout: document.documentElement.dataset.layoutTheme,
                colorScheme: getComputedStyle(document.documentElement).colorScheme,
              }));
              if (
                applied.mode !== mode ||
                applied.layout !== layout ||
                applied.colorScheme !== mode
              )
                throw new Error('Trusted fixture did not apply the requested presentation.');
              check.sharedDensityOracle = await assertDensityChanges({ grid, expectedRows });
              for (const density of ['compact', 'default', 'comfortable']) {
                await grid.getByRole('button', { name: density, exact: true }).click();
                const facts = await fixtureFacts(grid);
                assertDensityFixtureFacts(facts, density);
                check.measurements.push({ density, facts });
                await grid.getByRole('row', { name: 'record-1: Ada', exact: true }).click();
                await expect(page.getByRole('status', { name: 'Opened record' })).toHaveText(
                  'record-1',
                );
                await grid.getByRole('row', { name: 'record-2: Grace', exact: true }).focus();
                await page.keyboard.press('Enter');
                await expect(page.getByRole('status', { name: 'Opened record' })).toHaveText(
                  'record-2',
                );
              }
              check.status = 'passed';
            } catch (error) {
              check.status =
                error.code === 'ERR_ASSERTION' || error.matcherResult ? 'failed' : 'error';
              check.diagnostic = String(error.stack || error);
              if (check.status === 'failed') report.failures.push(check);
              else report.errors.push(check.diagnostic);
            }
            if (width === 390 || check.status !== 'passed')
              await page
                .screenshot({
                  path: resolve(output, `density-${width}-${mode}-${layout}-${host}.png`),
                })
                .catch(() => {});
            report.checks.push(check);
            await context.close();
          }
    assert.deepEqual(
      await inputHashes(candidate),
      report.sourceHashes,
      'Candidate inputs changed during the trusted density audit.',
    );
    for (const [path, expected] of Object.entries(report.oracleHashes))
      assert.equal(
        digest(await readFile(resolve(directory, path))),
        expected,
        `Trusted oracle changed: ${path}`,
      );
    report.status =
      report.errors.length || report.blocked.length || report.checks.length !== 16
        ? 'error'
        : report.failures.length
          ? 'failed'
          : 'passed';
  } catch (error) {
    report.errors.push(String(error.stack || error));
    report.status = 'error';
  } finally {
    await browser?.close();
    await server?.close();
  }
  report.diagnostic =
    report.status === 'passed'
      ? 'DataGrid density passed all 16 trusted host/theme/width scenarios, including content preservation, selected state, approved heights and pointer/keyboard row activation.'
      : JSON.stringify({
          failures: report.failures.slice(0, 2),
          errors: report.errors.slice(0, 2),
          blocked: report.blocked,
        });
  report.finishedAt = new Date().toISOString();
  const bytes = JSON.stringify(report, null, 2) + '\n';
  await writeFile(resolve(output, 'audit.json'), bytes, { flag: 'wx' });
  await writeFile(resolve(output, 'audit.sha256'), digest(bytes) + '\n', { flag: 'wx' });
  return { ...report, evidence: { report: resolve(output, 'audit.json'), sha256: digest(bytes) } };
}
